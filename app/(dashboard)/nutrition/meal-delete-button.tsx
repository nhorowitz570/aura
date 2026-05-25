"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteMeal } from "@/server/actions/meals";

export function MealDeleteButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size="icon"
      variant="ghost"
      disabled={pending}
      onClick={() => start(async () => {
        const res = await deleteMeal(id);
        if ("error" in res && res.error) toast.error(res.error);
        else router.refresh();
      })}
      aria-label="Delete meal"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
