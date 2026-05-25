import { redirect } from "next/navigation";
import { getUserProfile } from "@/server/actions/auth";
import { getGoals } from "@/server/actions/goals";
import { listMemories } from "@/server/actions/memories";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const [profileRes, goalsRes, memoriesRes] = await Promise.all([
    getUserProfile(),
    getGoals(),
    listMemories(),
  ]);
  // Proxy ensures an authed user always reaches here with a profile; if it's
  // somehow null, send them through onboarding rather than the login loop.
  if (!profileRes.data) redirect("/onboarding");
  return (
    <SettingsClient
      profile={profileRes.data}
      goals={goalsRes.data}
      memories={memoriesRes.data}
    />
  );
}
