"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AIMemory } from "@/types/database";

export async function listMemories(): Promise<{ data: AIMemory[]; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };
  const { data, error } = await supabase
    .from("ai_memories")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as AIMemory[], error: null };
}

export async function addMemory(content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const text = content.trim();
  if (!text) return { error: "Empty memory" };
  const { error } = await supabase.from("ai_memories").insert({ user_id: user.id, content: text });
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { data: { content: text } };
}

export async function updateMemory(id: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase
    .from("ai_memories")
    .update({ content: content.trim() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { data: null };
}

export async function deleteMemory(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase.from("ai_memories").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { data: null };
}

export async function clearMemories() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase.from("ai_memories").delete().eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { data: null };
}
