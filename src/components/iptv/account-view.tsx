"use client";

import { useState } from "react";
import {
  User,
  Crown,
  Calendar,
  Mail,
  Tv,
  Smartphone,
  Copy,
  Check,
  LogOut,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useAuth } from "@/hooks/use-auth";
import { useAppStore } from "@/lib/store";
import { PLANS, type PlanId } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function CopyField({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <Icon className="h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-sm">{value}</p>
      </div>
      <Button
        size="icon"
        variant="ghost"
        aria-label={`Copy ${label}`}
        onClick={copy}
        className="shrink-0"
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

export function AccountView() {
  const { user, plan, planExpires, isAuthenticated } = useAuth();
  const setView = useAppStore((s) => s.setView);

  if (!isAuthenticated) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <User className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Please sign in to view your account.
          </p>
        </CardContent>
      </Card>
    );
  }

  const planLabel = plan && plan !== "free" ? PLANS[plan as PlanId]?.name ?? plan : "Free";
  const hasPlan = plan && plan !== "free";
  const expired = planExpires && new Date(planExpires).getTime() < Date.now();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, subscription and devices.
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5 text-primary" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full brand-gradient text-xl font-bold text-white">
              {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">
                {user?.name || "PlayBeat Member"}
              </p>
              <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                {user?.email}
              </p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Account type</span>
            <Badge variant="secondary">
              {user?.role === "admin" ? "Administrator" : "Member"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-5 w-5 text-amber-400" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Current plan</p>
              <p className="text-lg font-semibold capitalize">{planLabel}</p>
            </div>
            {hasPlan && !expired ? (
              <Badge className="gap-1.5 bg-emerald-500/15 text-emerald-500">
                <Check className="h-3.5 w-3.5" />
                Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-muted-foreground">
                {expired ? "Expired" : "No active plan"}
              </Badge>
            )}
          </div>
          {hasPlan && planExpires ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {expired ? "Expired on " : "Renews on "}
              {new Date(planExpires).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          ) : null}

          <Button
            className="mt-2 w-full gap-1.5 brand-gradient text-white sm:w-auto"
            onClick={() => setView("storefront")}
          >
            <Crown className="h-4 w-4" />
            {hasPlan && !expired ? "Change Plan" : "Subscribe Now"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Device setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-5 w-5 text-primary" />
            Watch on any device
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            PlayBeat TV works right in your browser. Just sign in and start
            watching — no app install required.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <CopyField
              label="PlayBeat TV website"
              value="https://playbeat.live"
              icon={Tv}
            />
            <CopyField
              label="Support email"
              value="support@playbeat.live"
              icon={Mail}
            />
          </div>
          <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Never share your login. PlayBeat TV staff will never ask for your
            password.
          </p>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="gap-1.5 text-muted-foreground hover:text-destructive"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-4 w-4" />
            Sign out of PlayBeat TV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
