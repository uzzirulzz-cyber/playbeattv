"use client";

import {
  PlayCircle,
  Tv,
  Film,
  Clapperboard,
  Zap,
  Globe,
  ShieldCheck,
  Sparkles,
  Crown,
  Check,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PLAN_LIST } from "@/lib/plans";

export function LandingView() {
  const openAuth = useAppStore((s) => s.openAuth);
  const setView = useAppStore((s) => s.setView);

  // Allow opening the storefront even before auth (plans are public)
  const goStorefront = () => setView("storefront");

  const features = [
    { icon: Globe, title: "10,000+ Live Channels", desc: "Sports, news, entertainment from around the world" },
    { icon: Film, title: "Massive Movie Library", desc: "Blockbusters & classics, updated daily" },
    { icon: Clapperboard, title: "Complete Series", desc: "Every season and episode, ready to binge" },
    { icon: Zap, title: "4K Ultra HD", desc: "Stunning quality wherever available" },
    { icon: ShieldCheck, title: "Private & Secure", desc: "Encrypted streams, no tracking" },
    { icon: Sparkles, title: "Cross-Device", desc: "Watch on any browser, anywhere" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg brand-gradient text-white">
            <PlayCircle className="h-5 w-5" />
          </div>
          <span className="text-lg font-extrabold tracking-tight">
            PlayBeat <span className="brand-text">TV</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openAuth("signin")}
          >
            Sign in
          </Button>
          <Button
            size="sm"
            className="brand-gradient text-white"
            onClick={() => openAuth("signup")}
          >
            Sign up free
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/15 via-transparent to-transparent" />
        <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -left-24 top-40 h-72 w-72 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            The future of streaming
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            All your entertainment.{" "}
            <span className="brand-text">One beat.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            PlayBeat TV brings you 10,000+ live TV channels, thousands of
            movies and full series — in stunning HD & 4K. Start watching in
            seconds.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              className="gap-2 brand-gradient text-white"
              onClick={() => openAuth("signup")}
            >
              <PlayCircle className="h-5 w-5" />
              Start Watching Free
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2"
              onClick={goStorefront}
            >
              <Crown className="h-5 w-5" />
              View Plans
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No credit card required to sign up · Cancel anytime
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="h-full">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {f.desc}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Plans preview */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-2 text-muted-foreground">
            Pick a plan that fits you. Cancel anytime.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {PLAN_LIST.map((p) => (
            <Card key={p.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col p-6">
                <h3 className="text-lg font-bold">{p.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold">${p.price}</span>
                  <span className="text-sm text-muted-foreground">
                    /{p.durationDays >= 365 ? "year" : p.durationDays >= 90 ? "quarter" : "month"}
                  </span>
                </div>
                <ul className="mt-4 flex-1 space-y-2">
                  {p.features.slice(0, 4).map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-5 w-full brand-gradient text-white"
                  onClick={() => openAuth("signup")}
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 to-fuchsia-500/10 p-8 text-center sm:p-12">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Ready to start streaming?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            Join PlayBeat TV today and unlock a world of entertainment.
          </p>
          <Button
            size="lg"
            className="mt-6 gap-2 brand-gradient text-white"
            onClick={() => openAuth("signup")}
          >
            <PlayCircle className="h-5 w-5" />
            Create Free Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
          <span className="flex items-center gap-1.5">
            <PlayCircle className="h-4 w-4 text-primary" />
            PlayBeat TV · playbeat.live
          </span>
          <span>© {new Date().getFullYear()} PlayBeat TV. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
