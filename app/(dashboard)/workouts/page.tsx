import Link from "next/link";
import { Plus, History as HistoryIcon, Dumbbell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { listPrograms, getTodayProgramDay } from "@/server/actions/workouts";
import { StartTodayButton } from "./start-today-button";

export default async function WorkoutsPage() {
  const [today, programs] = await Promise.all([getTodayProgramDay(), listPrograms()]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workouts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Run today&apos;s session or manage your programs.</p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/workouts/history"><HistoryIcon className="mr-1 h-4 w-4" /> History</Link>
        </Button>
      </div>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4 space-y-4">
          {!today.program && (
            <Card className="p-6 text-center">
              <Dumbbell className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-sm">No active program.</p>
              <p className="text-xs text-muted-foreground">Create a program and mark it active to see today&apos;s session.</p>
              <Button asChild className="mt-4"><Link href="/workouts/programs">Manage programs</Link></Button>
            </Card>
          )}
          {today.program && !today.day && (
            <Card className="p-6">
              <p className="text-sm font-medium">{today.program.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">Rest day — no scheduled session for today.</p>
            </Card>
          )}
          {today.program && today.day && (
            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{today.program.name}</p>
                  <h2 className="mt-1 text-xl font-semibold">{today.day.label}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{today.day.exercises.length} exercises planned</p>
                </div>
                <Badge variant="secondary">{today.program.schedule_kind}</Badge>
              </div>
              <ul className="mt-4 divide-y">
                {today.day.exercises.map((dx) => (
                  <li key={dx.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm">{dx.exercise.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {dx.exercise.type === "cardio"
                          ? dx.target_duration_s ? `${Math.round(dx.target_duration_s / 60)} min` : "—"
                          : `${dx.target_sets ?? "?"} × ${dx.target_reps ?? "?"}${dx.target_weight_kg ? ` @ ${dx.target_weight_kg}kg` : ""}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                <StartTodayButton programId={today.program.id} dayId={today.day.id} />
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="programs" className="mt-4 space-y-3">
          {programs.length === 0 && (
            <Card className="p-6 text-center">
              <p className="text-sm">No programs yet.</p>
              <Button asChild className="mt-3"><Link href="/workouts/programs"><Plus className="mr-1 h-4 w-4" /> Create one</Link></Button>
            </Card>
          )}
          {programs.length > 0 && (
            <>
              <ul className="space-y-2">
                {programs.map((p) => (
                  <li key={p.id}>
                    <Link href={`/workouts/programs/${p.id}`}>
                      <Card className="flex items-center justify-between p-4 hover:bg-secondary/40">
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{p.schedule_kind}</p>
                        </div>
                        {p.is_active && <Badge>Active</Badge>}
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="w-full">
                <Link href="/workouts/programs"><Plus className="mr-1 h-4 w-4" /> Manage programs</Link>
              </Button>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
