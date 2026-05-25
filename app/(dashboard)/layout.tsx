import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/nav/sidebar";
import { BottomTabs } from "@/components/nav/bottom-tabs";
import { AppHeader } from "@/components/nav/app-header";
import { AccentProvider } from "@/components/accent-provider";
import { ThemeSync } from "@/components/theme-sync";
import { SplashGate } from "@/components/splash/splash-gate";
import { PageTransitions } from "@/components/page-transitions";
import { ALL_FEATURES, type Accent, type ThemeMode, type FeatureId } from "@/types/database";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("accent,theme,enabled_features")
    .eq("id", user.id)
    .maybeSingle();

  const accent: Accent = (profile?.accent ?? "neutral") as Accent;
  const theme: ThemeMode = (profile?.theme ?? "system") as ThemeMode;
  const enabledFeatures: FeatureId[] = (profile?.enabled_features ?? ALL_FEATURES) as FeatureId[];

  return (
    <AccentProvider accent={accent}>
      <ThemeSync theme={theme} />
      <SplashGate>
        <div className="flex min-h-screen">
          <Sidebar enabledFeatures={enabledFeatures} />
          <div className="flex flex-1 flex-col">
            <AppHeader />
            <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">
              <PageTransitions>{children}</PageTransitions>
            </main>
          </div>
          <BottomTabs enabledFeatures={enabledFeatures} />
        </div>
      </SplashGate>
    </AccentProvider>
  );
}
