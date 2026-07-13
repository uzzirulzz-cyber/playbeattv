"use client";

import { useQuery } from "@tanstack/react-query";
import { Menu, Search, Sun, Moon, Wifi, WifiOff, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useAppStore } from "@/lib/store";
import { api } from "@/hooks/use-iptv";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

interface AuthInfo {
  user_info?: {
    status?: string;
    auth?: number;
    exp_date?: string | null;
    active_cons?: string;
    max_connections?: string;
    username?: string;
  };
  server_info?: {
    url?: string;
    port?: string;
    timezone?: string;
  };
}

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const search = useAppStore((s) => s.search);
  const setSearch = useAppStore((s) => s.setSearch);

  const { data, isLoading } = useQuery<AuthInfo>({
    queryKey: ["xtream-auth"],
    queryFn: () => api<AuthInfo>("/api/xtream?action=auth"),
    retry: 0,
  });

  const online =
    data?.user_info?.status === "Active" || data?.user_info?.auth === 1;
  const exp = data?.user_info?.exp_date
    ? new Date(Number(data.user_info.exp_date) * 1000)
    : null;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open menu"
        className="md:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search */}
      <div className="relative max-w-xl flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search channels, movies, series…"
          className="pl-9 pr-9"
        />
        {search ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Connection status */}
        {isLoading ? (
          <Skeleton className="h-8 w-28 rounded-full" />
        ) : (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  className={
                    online
                      ? "gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "gap-1.5 border-red-500/30 bg-red-500/10 text-red-400"
                  }
                >
                  {online ? (
                    <Wifi className="h-3.5 w-3.5" />
                  ) : (
                    <WifiOff className="h-3.5 w-3.5" />
                  )}
                  {online ? "Connected" : "Offline"}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                {online ? (
                  <div className="space-y-0.5 text-xs">
                    <div className="font-semibold">
                      {data?.user_info?.username ?? "Account active"}
                    </div>
                    {exp ? (
                      <div>Expires: {exp.toLocaleDateString()}</div>
                    ) : null}
                    {data?.user_info?.active_cons &&
                    data?.user_info?.max_connections ? (
                      <div>
                        Connections: {data.user_info.active_cons}/
                        {data.user_info.max_connections}
                      </div>
                    ) : null}
                    {data?.server_info?.timezone ? (
                      <div>TZ: {data.server_info.timezone}</div>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-xs">
                    Could not reach the playlist server.
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>
    </header>
  );
}
