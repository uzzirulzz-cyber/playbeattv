"use client";

import {
  Tv,
  Film,
  Clapperboard,
  Heart,
  History,
  ChevronRight,
  Play,
  Crown,
  Sparkles,
  Zap,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";
import { useHistory } from "@/hooks/use-iptv";
import { ContentCard } from "@/components/iptv/content-card";
import { AdBanner } from "@/components/iptv/ads";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { MediaItem } from "@/lib/types";

export function HomeView() {
  const setView = useAppStore((s) => s.setView);
  const openAuth = useAppStore((s) => s.openAuth);
  const { user, isAuthenticated, plan, planExpires } = useAuth();
  const { data: history } = useHistory();

  const recentHistory = (history ?? []).slice(0, 12).map<MediaItem>((h) => ({
    id: h.streamId,
    name: h.name,
    type: h.type,
    logo: h.logo ?? undefined,
    streamUrl: h.streamUrl,
  }));

  const hasActivePlan =
    plan && plan !== "free" && (!planExpires || new Date(planExpires).getTime() > Date.now());

  const quickLinks = [
    {
      id: "live" as const,
      label: "Live TV",
      desc: "10,000+ live channels",
      icon: Tv,
      gradient: "from-rose-500/20 to-rose-500/5",
      iconColor: "text-rose-400",
    },
    {
      id: "movies" as const,
      label: "Movies",
      desc: "On-demand blockbusters",
      icon: Film,
      gradient: "from-amber-500/20 to-amber-500/5",
      iconColor: "text-amber-400",
    },
    {
      id: "series" as const,
      label: "Series",
      desc: "Binge-worthy shows",
      icon: Clapperboard,
      gradient: "from-fuchsia-500/20 to-fuchsia-500/5",
      iconColor: "text-fuchsia-400",
    },
  ];

  const features = [
    { icon: Globe, title: "10,000+ Channels", desc: "Live TV from around the globe" },
    { icon: Zap, title: "4K Ultra HD", desc: "Crystal-clear streaming quality" },
    { icon: ShieldCheck, title: "Secure & Private", desc: "Encrypted, ad-light playback" },
    { icon: Sparkles, title: "Updated Daily", desc: "Fresh movies & series added" },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/20 via-card to-card p-6 sm:p-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Welcome to PlayBeat TV
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Endless entertainment.{" "}
            <span className="brand-text">One platform.</span>
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground sm:text-lg">
            Stream Live TV, Movies and Series in stunning quality — anywhere,
            anytime. {isAuthenticated ? "Pick up where you left off below." : "Sign up free to start watching."}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {!isAuthenticated ? (
              <>
                <Button
                  className="gap-1.5 brand-gradient text-white"
                  onClick={() => openAuth("signup")}
                >
                  <Play className="h-4 w-4 fill-current" />
                  Start Watching
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setView("storefront")}
                  className="gap-1.5"
                >
                  <Crown className="h-4 w-4" />
                  View Plans
                </Button>
              </>
            ) : !hasActivePlan ? (
              <Button
                className="gap-1.5 brand-gradient text-white"
                onClick={() => setView("storefront")}
              >
                <Crown className="h-4 w-4" />
                Subscribe Now
              </Button>
            ) : (
              <Button
                className="gap-1.5 brand-gradient text-white"
                onClick={() => setView("live")}
              >
                <Play className="h-4 w-4 fill-current" />
                Browse Live TV
              </Button>
            )}
          </div>

          {/* Feature strip — NO account/server details */}
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-card/60 p-3 backdrop-blur"
                >
                  <Icon className="h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{f.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {f.desc}
                    </p>
                  </div>
                </div>
              );
            })}
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

      {/* Continue watching (only for signed-in) */}
      {isAuthenticated ? (
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
                <ContentCard key={`h-${item.type}-${item.id}`} item={item} />
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
      ) : null}

      {/* Subscription CTA */}
      {!hasActivePlan ? (
        <section className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 to-fuchsia-500/10 p-6 sm:p-8">
          <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <Crown className="h-5 w-5 text-amber-400" />
                Unlock everything
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a plan that fits you. Cancel anytime — no hidden fees.
              </p>
            </div>
            <Button
              className="gap-1.5 brand-gradient text-white"
              onClick={() => setView("storefront")}
            >
              <Crown className="h-4 w-4" />
              View Plans
            </Button>
          </div>
        </section>
      ) : null}

      {/* Quick actions */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Heart className="h-5 w-5 text-rose-400" />
            Quick Actions
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAction icon={Heart} label="Favorites" onClick={() => setView("favorites")} />
          <QuickAction icon={History} label="History" onClick={() => setView("history")} />
          <QuickAction icon={Tv} label="Live TV" onClick={() => setView("live")} />
          <QuickAction icon={Crown} label="Subscribe" onClick={() => setView("storefront")} />
        </div>
      </section>

      {/* Footer note for authenticated users */}
      {isAuthenticated ? (
        <p className="text-center text-xs text-muted-foreground">
          Signed in as {user?.email}
        </p>
      ) : null}
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
