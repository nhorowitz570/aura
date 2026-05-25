"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deleteThread(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Delete messages first (cascade should handle it but be explicit).
  await supabase.from("ai_messages").delete().eq("thread_id", id).eq("user_id", user.id);
  const { error } = await supabase.from("ai_threads").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/assistant");
  return { data: null };
}

export async function renameThread(id: string, title: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const clean = title.trim().slice(0, 120);
  if (!clean) return { error: "Title cannot be empty" };

  const { error } = await supabase
    .from("ai_threads")
    .update({ title: clean })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/assistant");
  return { data: null };
}
