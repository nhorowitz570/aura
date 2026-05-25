"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { NAV_ITEMS } from "@/lib/nav";
import { isHrefEnabled } from "@/lib/features";
import { cn } from "@/lib/utils";
import type { FeatureId } from "@/types/database";
import logo from "@/assets/auralogo.png";

export function Sidebar({ enabledFeatures }: { enabledFeatures?: FeatureId[] }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => isHrefEnabled(i.href, enabledFeatures));
  return (
    <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:self-start md:border-r md:bg-card/30">
      <div className="flex h-14 items-center gap-2 border-b px-5">
        <Link href="/" className="flex items-center gap-2">
          <Image src={logo} alt="" width={22} height={22} className="rounded" priority />
          <span className="text-base font-semibold tracking-tight font-sans">Aura</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="sidebar-active-pill"
                      className="absolute inset-0 -z-10 rounded-md bg-secondary"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
