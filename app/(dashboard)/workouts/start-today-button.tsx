"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startSession } from "@/server/actions/workouts";

export function StartTodayButton({ programId, dayId }: { programId: string; dayId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const onClick = () =>
    start(async () => {
      const res = await startSession({ program_id: programId, day_id: dayId });
      if ("error" in res && res.error) toast.error(res.error);
      else if ("data" in res && res.data) router.push(`/workouts/sessions/${res.data.id}`);
    });

  return (
    <Button onClick={onClick} disabled={pending} className="w-full">
      <Play className="mr-1.5 h-4 w-4" /> Start session
    </Button>
  );
}
