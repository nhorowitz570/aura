import Link from "next/link";
import { Link2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { sourcesProviding, type Feature } from "@/lib/data-sources";

export function ConnectSourcePrompt({ feature }: { feature: Feature }) {
  const sources = sourcesProviding(feature);
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
          <Link2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-base font-semibold">No data source connected</h2>
          <p className="text-sm text-muted-foreground capitalize">Wearable integrations for {feature} are coming soon.</p>
        </div>
      </div>
      <ul className="mt-5 space-y-2">
        {sources.map((s) => (
          <li key={s.id} className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.description}</p>
            </div>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              Coming soon
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Want to log by hand for now?</p>
        <Button asChild variant="outline" size="sm"><Link href="/settings#sources">Switch to manual mode</Link></Button>
      </div>
    </Card>
  );
}
