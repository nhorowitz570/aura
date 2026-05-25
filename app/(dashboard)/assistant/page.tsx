import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AssistantClient } from "./assistant-client";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: threads } = await supabase
    .from("ai_threads")
    .select("id,title,last_message_at")
    .eq("user_id", user.id)
    .order("last_message_at", { ascending: false })
    .limit(100);
  return <AssistantClient threads={threads ?? []} />;
}
