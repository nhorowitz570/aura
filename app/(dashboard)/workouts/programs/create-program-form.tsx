"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createProgram } from "@/server/actions/workouts";

export function CreateProgramForm() {
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"weekly" | "rotating">("weekly");
  const router = useRouter();

  const submit = () =>
    start(async () => {
      const res = await createProgram({ name, schedule_kind: kind });
      if ("error" in res && res.error) toast.error(res.error);
      else if ("data" in res && res.data) {
        setName("");
        router.push(`/workouts/programs/${res.data.id}`);
      }
    });

  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PPL — Hypertrophy" />
      <div className="inline-flex rounded-md border p-0.5">
        {(["weekly", "rotating"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={"px-3 py-1.5 text-sm rounded-[6px] capitalize " + (kind === k ? "bg-secondary" : "text-muted-foreground")}
          >
            {k}
          </button>
        ))}
      </div>
      <Button onClick={submit} disabled={pending || !name.trim()}>
        <Plus className="mr-1 h-4 w-4" /> Create
      </Button>
    </div>
  );
}
