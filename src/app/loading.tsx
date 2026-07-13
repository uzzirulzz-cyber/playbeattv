import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl brand-gradient text-white">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
      <p className="text-sm text-muted-foreground">Loading PlayBeat TV…</p>
    </div>
  );
}
