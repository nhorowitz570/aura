import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/server/actions/auth";
import { getGoals } from "@/server/actions/goals";
import { getMealsToday } from "@/server/actions/meals";
import { getWaterToday } from "@/server/actions/water";
import { getSleepToday } from "@/server/actions/sleep";
import { hasWorkoutToday } from "@/server/actions/workouts";
import { listMemories } from "@/server/actions/memories";
import { getAdherence } from "@/server/actions/trends";
import { buildSystemPrompt } from "@/lib/ai/prompts/assistant.system";
import { streamChat, type OpenRouterMessage } from "@/lib/ai/client";
import { TOOLS, dispatchTool } from "@/lib/ai/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatBody = {
  threadId?: string;
  content: string;
  attachment?: { name: string; data: string };
};

function diffMinutes(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}

function prettyToolName(name: string): string {
  return name.replace(/_/g, " ");
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json()) as ChatBody;
  const userText = (body.content ?? "").trim();
  if (!userText && !body.attachment) return new Response("Empty message", { status: 400 });

  // Resolve thread.
  let threadId = body.threadId;
  if (!threadId) {
    const { data: thread } = await supabase
      .from("ai_threads")
      .insert({ user_id: user.id, title: userText.slice(0, 60) || "New chat" })
      .select("id")
      .single();
    threadId = thread?.id as string | undefined;
    if (!threadId) return new Response("Could not create thread", { status: 500 });
  }

  // Load prior messages and append the new user message.
  const { data: existing } = await supabase
    .from("ai_messages")
    .select("role,content,tool_calls")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(40);

  await supabase.from("ai_messages").insert({
    thread_id: threadId,
    user_id: user.id,
    role: "user",
    content: userText,
  });

  // Gather context for the system prompt.
  const [profileRes, goalsRes, mealsRes, waterRes, sleepToday, workedOut, memRes, adherence7] = await Promise.all([
    getUserProfile(),
    getGoals(),
    getMealsToday(),
    getWaterToday(),
    getSleepToday(),
    hasWorkoutToday(),
    listMemories(),
    getAdherence(7),
  ]);

  const sleepMin = sleepToday ? diffMinutes(sleepToday.start_at, sleepToday.end_at) : 0;
  const sum = adherence7.reduce(
    (a, r) => ({
      cal: a.cal + r.calories,
      pro: a.pro + r.protein_g,
      wat: a.wat + r.water_ml,
      sle: a.sle + r.sleep_min,
    }),
    { cal: 0, pro: 0, wat: 0, sle: 0 },
  );
  const n = Math.max(1, adherence7.length);

  // Count workouts the past 7 days via daily_logs.
  const supa = await createClient();
  const { data: dl } = await supa
    .from("daily_logs")
    .select("date,has_workout")
    .eq("user_id", user.id)
    .gte("date", adherence7[0]?.date ?? new Date().toISOString().slice(0, 10));
  const workoutDays7 = (dl ?? []).filter((d) => d.has_workout).length;

  const system = buildSystemPrompt({
    profile: profileRes.data,
    goals: goalsRes.data,
    memories: memRes.data,
    today: {
      calories: mealsRes.totals.calories,
      protein_g: mealsRes.totals.protein_g,
      water_ml: waterRes.total_ml,
      sleep_min: sleepMin,
      has_workout: workedOut,
    },
    trends7: {
      avg_calories: sum.cal / n,
      avg_protein_g: sum.pro / n,
      avg_water_ml: sum.wat / n,
      avg_sleep_min: sum.sle / n,
      workout_days: workoutDays7,
    },
  });

  const history: OpenRouterMessage[] = [{ role: "system", content: system }];
  for (const m of existing ?? []) {
    const role = (m.role as "user" | "assistant" | "tool");
    if (role === "tool") continue; // skip raw tool rows; tools resolve inline this turn
    history.push({ role, content: String(m.content ?? "") });
  }

  // Append the new user turn (with optional image).
  const userContent: OpenRouterMessage["content"] = body.attachment?.data?.startsWith("data:image/")
    ? [
      { type: "text", text: userText || "Please look at this image." },
      { type: "image_url", image_url: { url: body.attachment.data } },
    ]
    : userText;
  history.push({ role: "user", content: userContent });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sse = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      sse({ type: "thread", threadId });

      let finalText = "";
      let iter = 0;
      const toolsCalled: { name: string; ok: boolean }[] = [];
      while (iter++ < 4) {
        let toolCalled = false;
        try {
          for await (const evt of streamChat({ messages: history, tools: TOOLS })) {
            if (evt.type === "delta") {
              finalText += evt.text;
              sse({ type: "delta", text: evt.text });
            } else if (evt.type === "tool_call") {
              toolCalled = true;
              let args: Record<string, unknown> = {};
              try { args = JSON.parse(evt.arguments); } catch {/* */}
              sse({ type: "tool", name: evt.name });
              const out = await dispatchTool(evt.name, args);
              const okFlag = !(out.result && typeof out.result === "object" && "error" in (out.result as object));
              toolsCalled.push({ name: evt.name, ok: okFlag });
              history.push({
                role: "assistant",
                content: "",
                tool_calls: [{ id: evt.id, type: "function", function: { name: evt.name, arguments: evt.arguments } }],
              });
              history.push({
                role: "tool",
                tool_call_id: evt.id,
                name: evt.name,
                content: JSON.stringify(out.result).slice(0, 2000),
              });
            }
          }
        } catch (e) {
          sse({ type: "error", message: e instanceof Error ? e.message : "Stream failed" });
          break;
        }
        if (!toolCalled) break;
      }

      // Fallback: if the model called tools but never produced a text reply,
      // synthesize a short confirmation so the user doesn't see an empty bubble.
      if (!finalText.trim() && toolsCalled.length > 0) {
        const ok = toolsCalled.filter((t) => t.ok).map((t) => prettyToolName(t.name));
        const failed = toolsCalled.filter((t) => !t.ok).map((t) => prettyToolName(t.name));
        const parts: string[] = [];
        if (ok.length) parts.push(`Done — ${ok.join(", ")}.`);
        if (failed.length) parts.push(`Failed: ${failed.join(", ")}.`);
        finalText = parts.join(" ") || "Done.";
        sse({ type: "delta", text: finalText });
      } else if (!finalText.trim()) {
        // No tools called and no text — surface as an error so the client can show the proper message.
        sse({ type: "error", message: "The model returned an empty response. Try again." });
      }

      // Persist final assistant message.
      const { data: saved } = await supabase
        .from("ai_messages")
        .insert({ thread_id: threadId, user_id: user.id, role: "assistant", content: finalText })
        .select("id")
        .single();
      await supabase.from("ai_threads").update({ last_message_at: new Date().toISOString() }).eq("id", threadId);

      sse({ type: "done", id: saved?.id });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      "connection": "keep-alive",
    },
  });
}
