import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listPrograms } from "@/server/actions/workouts";
import { CreateProgramForm } from "./create-program-form";
import { ProgramListItem } from "./program-list-item";

export default async function ProgramsPage() {
  const programs = await listPrograms();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/workouts" className="text-xs text-muted-foreground hover:underline">← Workouts</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Programs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create a program, add days, and set one active.</p>
      </div>

      <Card className="p-5">
        <p className="text-sm font-medium">New program</p>
        <CreateProgramForm />
      </Card>

      <ul className="space-y-2">
        {programs.map((p) => <ProgramListItem key={p.id} program={p} />)}
        {programs.length === 0 && (
          <li className="rounded-md border p-6 text-center text-sm text-muted-foreground">No programs yet.</li>
        )}
      </ul>
    </div>
  );
}
