"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { motion } from "motion/react";
import { NAV_ITEMS } from "@/lib/nav";
import { isHrefEnabled, CORE_HREFS, HREF_TO_FEATURE } from "@/lib/features";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { FeatureId } from "@/types/database";

// Assistant sits in the middle slot of the mobile nav. Goals lives in More.
const PRIMARY_DEFAULT = ["/home", "/workouts", "/assistant", "/nutrition"];

export function BottomTabs({ enabledFeatures }: { enabledFeatures?: FeatureId[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const allItems = useMemo(
    () => NAV_ITEMS.filter((i) => isHrefEnabled(i.href, enabledFeatures)),
    [enabledFeatures],
  );

  // Pick up to 4 primary items, preferring the default set but skipping ones disabled by features.
  const primary = useMemo(() => {
    const preferred = PRIMARY_DEFAULT.filter((href) => allItems.some((i) => i.href === href));
    const rest = allItems.map((i) => i.href).filter((h) => !preferred.includes(h));
    const order = [...preferred, ...rest].slice(0, 4);
    return order.map((href) => allItems.find((i) => i.href === href)!).filter(Boolean);
  }, [allItems]);

  const secondary = allItems.filter((i) => !primary.find((p) => p.href === i.href));

  const isActive = (href: string) => pathname === href || (href !== "/home" && pathname.startsWith(href));
  const moreActive = secondary.some((i) => isActive(i.href));

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur pb-safe">
      <ul className="grid grid-cols-5">
        {primary.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "relative flex h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="bottom-tab-pill"
                    className="absolute inset-x-3 top-1.5 h-7 rounded-full bg-secondary"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative flex flex-col items-center gap-1">
                  <Icon className="h-5 w-5" />
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
        <li>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className={cn(
                "flex h-14 w-full flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                moreActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              More
            </SheetTrigger>
            <SheetContent side="left" className="pb-safe">
              <SheetHeader>
                <SheetTitle>More</SheetTitle>
                <SheetDescription className="sr-only">Secondary navigation</SheetDescription>
              </SheetHeader>
              <ul className="mt-6 space-y-1">
                {secondary.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors",
                          active ? "bg-secondary text-foreground" : "hover:bg-secondary/60"
                        )}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}

// Kept for backwards-compat where someone may still import this.
export { HREF_TO_FEATURE, CORE_HREFS };
