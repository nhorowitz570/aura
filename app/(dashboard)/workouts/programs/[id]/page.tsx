import Link from "next/link";
import { notFound } from "next/navigation";
import { getProgramDeep } from "@/server/actions/workouts";
import { ProgramEditor } from "./program-editor";

export default async function ProgramEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const program = await getProgramDeep(id);
  if (!program) notFound();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/workouts/programs" className="text-xs text-muted-foreground hover:underline">← Programs</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{program.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground capitalize">{program.schedule_kind} schedule</p>
      </div>
      <ProgramEditor program={program} />
    </div>
  );
}
