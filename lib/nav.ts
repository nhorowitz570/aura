import { Home, Dumbbell, Apple, Droplet, Moon, Activity, Trophy, Settings, Sparkles } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: typeof Home;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Workouts", href: "/workouts", icon: Dumbbell },
  { label: "Nutrition", href: "/nutrition", icon: Apple },
  { label: "Hydration", href: "/hydration", icon: Droplet },
  { label: "Sleep", href: "/sleep", icon: Moon },
  { label: "Vitals", href: "/vitals", icon: Activity },
  { label: "Goals", href: "/goals", icon: Trophy },
  { label: "Assistant", href: "/assistant", icon: Sparkles },
  { label: "Settings", href: "/settings", icon: Settings },
];

export const PRIMARY_MOBILE: NavItem[] = NAV_ITEMS.filter((i) =>
  ["/", "/workouts", "/nutrition", "/goals"].includes(i.href),
);

export const SECONDARY_MOBILE: NavItem[] = NAV_ITEMS.filter(
  (i) => !["/", "/workouts", "/nutrition", "/goals"].includes(i.href),
);
