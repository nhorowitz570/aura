import { redirect } from "next/navigation";
import { getUserProfile } from "@/server/actions/auth";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  const { data: profile } = await getUserProfile();
  if (!profile) redirect("/login");
  if (profile.onboarded_at) redirect("/");
  return (
    <div className="mx-auto max-w-xl">
      <OnboardingWizard profile={profile} />
    </div>
  );
}
