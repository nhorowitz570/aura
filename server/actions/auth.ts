"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export async function getUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getUserOrThrow() {
  const user = await getUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

/**
 * Always returns a profile row for an authed user. If one is missing
 * (auth user predates the `handle_new_user` trigger), we upsert a fresh
 * default row so downstream code can rely on its existence.
 */
export async function getUserProfile(): Promise<{ data: Profile | null; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  if (data) return { data: data as Profile, error: null };

  // Profile missing — create one with defaults and onboarded_at=null so the
  // proxy redirects them to /onboarding on the next request.
  const { data: created, error: insErr } = await supabase
    .from("profiles")
    .insert({ id: user.id })
    .select("*")
    .single();
  if (insErr) {
    // RLS or unique-violation: try selecting again in case it landed via trigger.
    const { data: again } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (again) return { data: again as Profile, error: null };
    return { data: null, error: insErr.message };
  }
  return { data: created as Profile, error: null };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

type AuthState = { error: string } | null;

export async function signInWithEmail(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect("/");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!email || !password) return { error: "Email and password are required" };
  if (password.length < 8) return { error: "Password must be at least 8 characters" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || null },
      emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
        : undefined,
    },
  });
  if (error) return { error: error.message };

  // If email confirmations are off, the user is now logged in. Push to onboarding.
  if (data.session) {
    if (displayName && data.user) {
      await supabase.from("profiles").upsert({ id: data.user.id, display_name: displayName });
    }
    redirect("/onboarding");
  }
  // Otherwise instruct them to check email.
  return { error: "Check your email to confirm your account." };
}

export async function deleteAccount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await supabase.from("profiles").update({ display_name: "(deleted)" }).eq("id", user!.id);
  await supabase.auth.signOut();
  redirect("/login");
}
