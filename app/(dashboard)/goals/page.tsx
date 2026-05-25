import { Flame, Plus, Award, Droplet, Dumbbell, Moon, Apple, Trophy, Target, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getUserProfile } from "@/server/actions/auth";
import { getGoals } from "@/server/actions/goals";
import { getAdherence } from "@/server/actions/trends";
import { pctHit } from "@/lib/trends";
import { getRecentBodyMetrics } from "@/server/actions/weight";
import { getStreaks } from "@/server/actions/streaks";
import { WeightChart } from "@/components/features/weight-chart";
import { WeightLogSheet } from "@/components/features/weight-log-sheet";

export default async function GoalsPage() {
  const [profileRes, goalsRes, last7, last30, body, streaks] = await Promise.all([
    getUserProfile(),
    getGoals(),
    getAdherence(7),
    getAdherence(30),
    getRecentBodyMetrics(90),
    getStreaks(),
  ]);
  const units = profileRes.data?.units ?? "imperial";
  const g = goalsRes.data;

  const cal7 = g ? pctHit(last7, "calories", g.calories) : 0;
  const prot7 = g ? pctHit(last7, "protein_g", g.protein_g) : 0;
  const water7 = g ? pctHit(last7, "water_ml", g.water_ml) : 0;
  const sleep7 = g ? pctHit(last7, "sleep_min", g.sleep_min) : 0;

  const cal30 = g ? pctHit(last30, "calories", g.calories) : 0;
  const prot30 = g ? pctHit(last30, "protein_g", g.protein_g) : 0;
  const water30 = g ? pctHit(last30, "water_ml", g.water_ml) : 0;
  const sleep30 = g ? pctHit(last30, "sleep_min", g.sleep_min) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
        <p className="mt-1 text-sm text-muted-foreground">Trends and body metrics.</p>
      </div>

      <section>
        <h2 className="text-sm font-medium">Adherence</h2>
        <p className="text-xs text-muted-foreground">% of days you hit each goal.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Adherence label="Calories" w7={cal7} w30={cal30} />
          <Adherence label="Protein" w7={prot7} w30={prot30} />
          <Adherence label="Water" w7={water7} w30={water30} />
          <Adherence label="Sleep" w7={sleep7} w30={sleep30} />
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-sm font-medium">Weight + body fat</h2>
            <p className="text-xs text-muted-foreground">Last 90 days.</p>
          </div>
          <WeightLogSheet
            units={units}
            trigger={<Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" /> Log weight</Button>}
          />
        </div>
        <Card className="mt-3 p-5">
          <WeightChart rows={body} units={units} />
        </Card>
      </section>

      <section>
        <h2 className="text-sm font-medium">Streaks</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <StreakCard label="Daily log" value={streaks.log} />
          <StreakCard label="Workouts" value={streaks.workout} />
          <StreakCard label="Hydration" value={streaks.water} />
        </div>
      </section>

      <AchievementsSection
        streaks={streaks}
        cal7={cal7} prot7={prot7} water7={water7} sleep7={sleep7}
        cal30={cal30} prot30={prot30} water30={water30} sleep30={sleep30}
      />
    </div>
  );
}

type AchievementProps = {
  streaks: { log: number; workout: number; water: number };
  cal7: number; prot7: number; water7: number; sleep7: number;
  cal30: number; prot30: number; water30: number; sleep30: number;
};

function AchievementsSection(p: AchievementProps) {
  const items = [
    { id: "first-log", icon: Target, title: "First step", desc: "Log anything for 1 day", unlocked: p.streaks.log >= 1 },
    { id: "log-3", icon: Flame, title: "Getting consistent", desc: "3-day log streak", unlocked: p.streaks.log >= 3 },
    { id: "log-7", icon: Flame, title: "Week strong", desc: "7-day log streak", unlocked: p.streaks.log >= 7 },
    { id: "log-30", icon: Trophy, title: "Habit formed", desc: "30-day log streak", unlocked: p.streaks.log >= 30 },
    { id: "workout-1", icon: Dumbbell, title: "First lift", desc: "Complete a workout", unlocked: p.streaks.workout >= 1 },
    { id: "workout-7", icon: Dumbbell, title: "Iron week", desc: "7 workouts in a row", unlocked: p.streaks.workout >= 7 },
    { id: "water-7", icon: Droplet, title: "Hydrated", desc: "Hit water 7 days in a row", unlocked: p.streaks.water >= 7 },
    { id: "water-30", icon: Droplet, title: "Hydration master", desc: "30 days of hydration", unlocked: p.streaks.water >= 30 },
    { id: "protein-7", icon: Apple, title: "Protein week", desc: "Hit protein goal 5+ of last 7 days", unlocked: p.prot7 >= Math.round((5 / 7) * 100) },
    { id: "sleep-7", icon: Moon, title: "Well rested", desc: "Hit sleep goal 5+ of last 7 days", unlocked: p.sleep7 >= Math.round((5 / 7) * 100) },
    { id: "cal-30", icon: Award, title: "On target", desc: "80% calorie adherence over 30d", unlocked: p.cal30 >= 80 },
    { id: "all-7", icon: Trophy, title: "Quadfecta", desc: "All four daily goals last week", unlocked: p.cal7 >= 70 && p.prot7 >= 70 && p.water7 >= 70 && p.sleep7 >= 70 },
  ];

  const unlocked = items.filter((i) => i.unlocked).length;

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">Achievements</h2>
        <p className="text-xs tabular-nums text-muted-foreground">{unlocked} / {items.length}</p>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {items.map((a) => {
          const Icon = a.unlocked ? a.icon : Lock;
          return (
            <Card key={a.id} className={"flex items-center gap-3 p-4 " + (a.unlocked ? "" : "opacity-55")}>
              <div className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-full " + (a.unlocked ? "bg-secondary text-foreground" : "bg-muted text-muted-foreground")}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{a.title}</p>
                <p className="truncate text-xs text-muted-foreground">{a.desc}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function Adherence({ label, w7, w30 }: { label: string; w7: number; w30: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="text-2xl font-semibold tabular-nums">{w7}%</span>
        <span className="text-xs text-muted-foreground">7d</span>
      </div>
      <Progress value={w7} className="mt-2" />
      <p className="mt-2 text-xs text-muted-foreground tabular-nums">{w30}% over 30d</p>
    </Card>
  );
}

function StreakCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <Flame className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{value === 1 ? "day" : "days"}</p>
    </Card>
  );
}
