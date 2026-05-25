import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import logo from "@/assets/auralogo.png";

export async function AppHeader({ title }: { title?: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | null = null;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
    displayName = profile?.display_name ?? null;
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:px-6">
      {/* Mobile: logo + wordmark. Desktop: leave room for sidebar logo and show an optional title. */}
      <div className="flex items-center gap-2 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <Image src={logo} alt="" width={22} height={22} className="rounded" priority />
          <span className="text-base font-semibold tracking-tight font-sans">Aura</span>
        </Link>
      </div>
      <h1 className="hidden text-sm font-medium tracking-tight md:block md:text-base">{title ?? ""}</h1>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        {user && <UserMenu displayName={displayName} email={user.email ?? ""} />}
      </div>
    </header>
  );
}
