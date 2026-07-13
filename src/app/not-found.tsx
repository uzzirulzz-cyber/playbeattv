import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
      <div className="text-center">
        <h1 className="text-6xl font-extrabold brand-text">404</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Page not found
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
      <Link href="/">
        <Button className="brand-gradient text-white">
          Back to PlayBeat TV
        </Button>
      </Link>
    </div>
  );
}
