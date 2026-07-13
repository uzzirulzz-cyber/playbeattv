"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Crown,
  Loader2,
  Sparkles,
  Tv,
  Film,
  Clapperboard,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { PLAN_LIST, PLANS, type PlanId } from "@/lib/plans";
import { api } from "@/hooks/use-iptv";
import { useAuth } from "@/hooks/use-auth";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function StorefrontView() {
  const { user, plan, planExpires, isAuthenticated, update } = useAuth();
  const openAuth = useAppStore((s) => s.openAuth);
  const qc = useQueryClient();

  const activePlan = plan && plan !== "free" ? plan : null;
  const expired =
    planExpires && new Date(planExpires).getTime() < Date.now();

  const subscribe = useMutation({
    mutationFn: (planId: PlanId) =>
      api<{ ok: boolean }>("/api/subscription", {
        method: "POST",
        body: JSON.stringify({ plan: planId }),
      }),
    onSuccess: async (_data, planId) => {
      toast.success(`You're subscribed to ${PLANS[planId].name}! 🎉`);
      await update({ plan: planId });
      qc.invalidateQueries({ queryKey: ["history"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubscribe = (planId: PlanId) => {
    if (!isAuthenticated) {
      openAuth("signup");
      return;
    }
    subscribe.mutate(planId);
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/20 via-card to-card p-6 text-center sm:p-10">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            PlayBeat TV Premium
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Choose your plan
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
            Unlock 10,000+ live channels, thousands of movies & series in HD
            and 4K. Cancel anytime.
          </p>
          {activePlan && !expired ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-sm text-amber-400">
              <Crown className="h-4 w-4" />
              You&apos;re on the {PLANS[activePlan as PlanId]?.name ?? activePlan} plan
              {planExpires
                ? ` · renews ${new Date(planExpires).toLocaleDateString()}`
                : ""}
            </div>
          ) : null}
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {PLAN_LIST.map((p) => {
          const isCurrent = activePlan === p.id && !expired;
          const featured = p.id === "quarterly";
          return (
            <Card
              key={p.id}
              className={cn(
                "relative flex flex-col overflow-hidden",
                featured
                  ? "border-primary shadow-lg ring-1 ring-primary/30"
                  : ""
              )}
            >
              {featured ? (
                <div className="brand-gradient px-4 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-white">
                  Most Popular
                </div>
              ) : null}
              <CardContent className="flex flex-1 flex-col p-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">{p.name}</h3>
                  {isCurrent ? (
                    <Badge className="bg-emerald-500/15 text-emerald-500">
                      Current
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">
                    ${p.price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    /{p.durationDays >= 365 ? "year" : p.durationDays >= 90 ? "quarter" : "month"}
                  </span>
                </div>

                <ul className="mt-5 flex-1 space-y-2.5">
                  {p.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={cn(
                    "mt-6 w-full gap-1.5",
                    featured || !isCurrent
                      ? "brand-gradient text-white"
                      : ""
                  )}
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent || subscribe.isPending}
                  onClick={() => handleSubscribe(p.id)}
                >
                  {subscribe.isPending && subscribe.variables === p.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCurrent ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Crown className="h-4 w-4" />
                  )}
                  {isCurrent
                    ? "Active Plan"
                    : !isAuthenticated
                    ? "Sign up to subscribe"
                    : `Get ${p.name}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Why PlayBeat */}
      <div>
        <h2 className="mb-4 text-center text-xl font-bold">
          Why choose PlayBeat TV?
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { icon: Tv, title: "10,000+ Channels", desc: "Global live TV" },
            { icon: Film, title: "Huge VOD Library", desc: "Movies on demand" },
            { icon: Clapperboard, title: "Full Series", desc: "All seasons & episodes" },
            { icon: Zap, title: "4K Ultra HD", desc: "Where available" },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="text-center">
                <CardContent className="flex flex-col items-center p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Trust */}
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card/50 p-6 text-center">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <p className="text-sm text-muted-foreground">
          Secure checkout · Cancel anytime · No hidden fees
        </p>
        {isAuthenticated ? (
          <p className="text-xs text-muted-foreground">
            Signed in as {user?.email}
          </p>
        ) : null}
      </div>
    </div>
  );
}
