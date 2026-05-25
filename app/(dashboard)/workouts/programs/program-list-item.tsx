"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { setActiveProgram, deleteProgram } from "@/server/actions/workouts";
import type { WorkoutProgram } from "@/types/database";

export function ProgramListItem({ program }: { program: WorkoutProgram }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const activate = () =>
    start(async () => {
      const res = await setActiveProgram(program.id);
      if ("error" in res && res.error) toast.error(res.error);
      else { toast.success("Active program updated"); router.refresh(); }
    });

  const remove = () => {
    if (!confirm(`Delete "${program.name}"? Sessions linked to it will remain.`)) return;
    start(async () => {
      const res = await deleteProgram(program.id);
      if ("error" in res && res.error) toast.error(res.error);
      else { toast.success("Deleted"); router.refresh(); }
    });
  };

  return (
    <li>
      <Card className="flex items-center justify-between p-4">
        <Link href={`/workouts/programs/${program.id}`} className="min-w-0 flex-1">
          <p className="text-sm font-medium">{program.name}</p>
          <p className="text-xs text-muted-foreground capitalize">{program.schedule_kind}</p>
        </Link>
        <div className="flex items-center gap-1">
          {program.is_active ? (
            <Badge>Active</Badge>
          ) : (
            <Button size="sm" variant="outline" disabled={pending} onClick={activate}>
              <Star className="mr-1 h-3 w-3" /> Set active
            </Button>
          )}
          <Button size="icon" variant="ghost" disabled={pending} onClick={remove} aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </li>
  );
}
