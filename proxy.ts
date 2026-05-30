import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname.startsWith("/auth/callback")
  ) {
    return supabaseResponse;
  }

  const { data: { user } } = await supabase.auth.getUser();
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isOnboarding = pathname.startsWith("/onboarding");

  // Allow the landing page at / for unauthenticated visitors
  if (!user && pathname === "/") {
    return supabaseResponse;
  }

  if (!user && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // Redirect authenticated users from / (landing) to /home (dashboard)
  if (user && pathname === "/") {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (user && !isOnboarding) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", user.id)
      .maybeSingle();
    // Treat "no profile row yet" as not onboarded — the wizard will upsert one.
    if (!profile || !profile.onboarded_at) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  if (user && isOnboarding) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.onboarded_at) {
      return NextResponse.redirect(new URL("/home", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
