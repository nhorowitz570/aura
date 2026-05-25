import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return new Response("Missing id", { status: 400 });

  const { data: thread } = await supabase.from("ai_threads").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!thread) return new Response("Not found", { status: 404 });
  const { data: messages } = await supabase
    .from("ai_messages")
    .select("id,role,content,created_at")
    .eq("thread_id", id)
    .order("created_at", { ascending: true });

  return Response.json({
    thread,
    messages: (messages ?? []).filter((m) => m.role !== "tool"),
  });
}
