"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Tv,
  Film,
  Clapperboard,
  Heart,
  History,
  ChevronRight,
  CalendarClock,
  Users,
  Server,
  Play,
  Radio,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api, useActivePlaylist, useHistory } from "@/hooks/use-iptv";
import { ContentCard } from "@/components/iptv/content-card";
import { AdBanner } from "@/components/iptv/ads";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { MediaItem } from "@/lib/types";

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

export function HomeView() {
  const setView = useAppStore((s) => s.setView);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const { data: playlistData } = useActivePlaylist();
  const { data: history } = useHistory();
  const active = playlistData?.active;

  const { data: auth } = useQuery<AuthInfo>({
    queryKey: ["xtream-auth"],
    queryFn: () => api<AuthInfo>("/api/xtream?action=auth"),
    retry: 0,
  });

  const online =
    auth?.user_info?.status === "Active" || auth?.user_info?.auth === 1;
  const exp = auth?.user_info?.exp_date
    ? new Date(Number(auth.user_info.exp_date) * 1000)
    : null;

  const recentHistory = (history ?? []).slice(0, 12).map<MediaItem>((h) => ({
    id: h.streamId,
    name: h.name,
    type: h.type,
    logo: h.logo ?? undefined,
    streamUrl: h.streamUrl,
  }));

  const quickLinks = [
    {
      id: "live" as const,
      label: "Live TV",
      desc: "Channels & live streams",
      icon: Tv,
      gradient: "from-red-500/20 to-red-500/5",
      iconColor: "text-red-400",
    },
    {
      id: "movies" as const,
      label: "Movies",
      desc: "On-demand films",
      icon: Film,
      gradient: "from-amber-500/20 to-amber-500/5",
      iconColor: "text-amber-400",
    },
    {
      id: "series" as const,
      label: "Series",
      desc: "TV shows & episodes",
      icon: Clapperboard,
      gradient: "from-primary/25 to-primary/5",
      iconColor: "text-primary",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-6 sm:p-8">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 items-center justify-center">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  online ? "bg-emerald-500" : "bg-red-500"
                }`}
              >
                {online ? (
                  <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-emerald-500/60" />
                ) : null}
              </span>
            </span>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {online ? "Account Active" : "Account Offline"}
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Welcome to HypoTV
          </h1>
          <p className="mt-1 max-w-xl text-muted-foreground">
            {active
              ? `Streaming from “${active.name}”. Browse live TV, movies and series below.`
              : "No playlist configured yet. Add your Xtream credentials to start watching."}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={() => setView("live")} className="gap-1.5">
              <Play className="h-4 w-4 fill-current" />
              Start Watching
            </Button>
            <Button
              variant="outline"
              onClick={() => setSettingsOpen(true)}
              className="gap-1.5"
            >
              <Server className="h-4 w-4" />
              Manage Playlist
            </Button>
          </div>

          {/* account meta */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <AccountStat
              icon={CalendarClock}
              label="Expires"
              value={
                exp ? exp.toLocaleDateString() : online ? "—" : "N/A"
              }
            />
            <AccountStat
              icon={Users}
              label="Connections"
              value={
                auth?.user_info?.active_cons &&
                auth?.user_info?.max_connections
                  ? `${auth.user_info.active_cons}/${auth.user_info.max_connections}`
                  : "—"
              }
            />
            <AccountStat
              icon={Server}
              label="Server"
              value={auth?.server_info?.url ?? "—"}
            />
            <AccountStat
              icon={Radio}
              label="Timezone"
              value={
                auth?.server_info?.timezone
                  ? auth.server_info.timezone.split("/").pop() ?? "—"
                  : "—"
              }
            />
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Browse</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickLinks.map((q) => {
            const Icon = q.icon;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setView(q.id)}
                className={`group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br ${q.gradient} p-5 text-left transition-all hover:border-primary/50 hover:ring-2 hover:ring-primary/20`}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-lg bg-card/80 ${q.iconColor}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{q.label}</h3>
                <p className="text-sm text-muted-foreground">{q.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ad banner */}
      <AdBanner />

      {/* Continue watching */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <History className="h-5 w-5 text-primary" />
            Continue Watching
          </h2>
          {history && history.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground"
              onClick={() => setView("history")}
            >
              See all
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        {history && history.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {recentHistory.map((item) => (
              <ContentCard
                key={`h-${item.type}-${item.id}`}
                item={item}
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <History className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Your watch history will appear here.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Quick favorites teaser handled by favorites view */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Heart className="h-5 w-5 text-red-400" />
            Quick Actions
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAction
            icon={Heart}
            label="Favorites"
            onClick={() => setView("favorites")}
          />
          <QuickAction
            icon={History}
            label="History"
            onClick={() => setView("history")}
          />
          <QuickAction
            icon={Tv}
            label="Live TV"
            onClick={() => setView("live")}
          />
          <QuickAction
            icon={Clapperboard}
            label="Series"
            onClick={() => setView("series")}
          />
        </div>
      </section>
    </div>
  );
}

function AccountStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card/60 p-3 backdrop-blur">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-sm font-medium">{label}</span>
      <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
    </button>
  );
}
