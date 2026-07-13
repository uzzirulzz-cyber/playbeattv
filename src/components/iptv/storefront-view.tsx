"use client";

import { useState } from "react";
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
  CreditCard,
  Wallet,
  Smartphone,
  Globe,
} from "lucide-react";
import { PLANS, PLAN_LIST, getPlanPrice, formatPrice, getRegionList, getRegion, type PlanId } from "@/lib/plans";
import { api } from "@/hooks/use-iptv";
import { useAuth } from "@/hooks/use-auth";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Gateway = "jazzcash" | "easypaisa" | "stripe" | "paypal";

export function StorefrontView() {
  const { user, plan, planExpires, isAuthenticated, update } = useAuth();
  const openAuth = useAppStore((s) => s.openAuth);
  const [selectedRegion, setSelectedRegion] = useState<string>(
    user?.region || "PK"
  );
  const [checkoutPlan, setCheckoutPlan] = useState<PlanId | null>(null);
  const [checkoutGateway, setCheckoutGateway] = useState<Gateway | null>(null);

  const activePlan = plan && plan !== "free" ? plan : null;
  const expired =
    planExpires && new Date(planExpires).getTime() < Date.now();

  const region = getRegion(selectedRegion);

  const startCheckout = (planId: PlanId) => {
    if (!isAuthenticated) {
      openAuth("signup");
      return;
    }
    setCheckoutPlan(planId);
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
            Unlock 10,000+ live channels, thousands of movies & series. Starting
            at just {formatPrice(1.4, "USD", "$")}/month. Cancel anytime.
          </p>
          {activePlan && !expired ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-sm text-amber-400">
              <Crown className="h-4 w-4" />
              You&apos;re on the {PLANS[activePlan as PlanId]?.name} plan
              {planExpires ? ` · until ${new Date(planExpires).toLocaleDateString()}` : ""}
            </div>
          ) : null}
        </div>
      </div>

      {/* Region selector */}
      <div className="flex items-center justify-center gap-3">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Pricing for:</span>
        <Select value={selectedRegion} onValueChange={setSelectedRegion}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {getRegionList().map((r) => (
              <SelectItem key={r.code} value={r.code}>
                {r.name} ({r.currency})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {PLAN_LIST.map((p) => {
          const isCurrent = activePlan === p.id && !expired;
          const featured = p.id === "quarterly";
          const { amount, currency, symbol } = getPlanPrice(p.id, selectedRegion);
          return (
            <Card
              key={p.id}
              className={cn(
                "relative flex flex-col overflow-hidden",
                featured ? "border-primary shadow-lg ring-1 ring-primary/30" : ""
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
                    {formatPrice(amount, currency, symbol)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    /{p.durationDays >= 365 ? "year" : p.durationDays >= 90 ? "quarter" : "month"}
                  </span>
                </div>
                {region.currency !== "USD" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    ≈ ${p.priceUSD.toFixed(2)} USD
                  </p>
                )}

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
                    !isCurrent ? "brand-gradient text-white" : ""
                  )}
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent}
                  onClick={() => startCheckout(p.id)}
                >
                  {isCurrent ? (
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

      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card/50 p-6 text-center">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <p className="text-sm text-muted-foreground">
          Secure checkout · Cancel anytime · No hidden fees
        </p>
      </div>

      {/* Checkout dialog */}
      <CheckoutDialog
        plan={checkoutPlan}
        gateway={checkoutGateway}
        setGateway={setCheckoutGateway}
        onClose={() => {
          setCheckoutPlan(null);
          setCheckoutGateway(null);
        }}
        regionCode={selectedRegion}
        onPlanActivated={async () => {
          await update({ plan: checkoutPlan! });
          setCheckoutPlan(null);
          setCheckoutGateway(null);
        }}
      />
    </div>
  );
}

function CheckoutDialog({
  plan,
  gateway,
  setGateway,
  onClose,
  regionCode,
  onPlanActivated,
}: {
  plan: PlanId | null;
  gateway: Gateway | null;
  setGateway: (g: Gateway | null) => void;
  onClose: () => void;
  regionCode: string;
  onPlanActivated: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [easypaisaData, setEasypaisaData] = useState<{
    number: string;
    amount: number;
    currency: string;
    paymentId: string;
  } | null>(null);
  const [easypaisaTID, setEasypaisaTID] = useState("");
  const region = getRegion(regionCode);

  const planObj = plan ? PLANS[plan] : null;
  const { amount, currency, symbol } = plan
    ? getPlanPrice(plan, regionCode)
    : { amount: 0, currency: "USD", symbol: "$" };

  const gateways: { id: Gateway; label: string; icon: React.ComponentType<{ className?: string }>; desc: string; available: boolean }[] = [
    {
      id: "jazzcash",
      label: "JazzCash",
      icon: Smartphone,
      desc: "Mobile account / card",
      available: currency === "PKR",
    },
    {
      id: "easypaisa",
      label: "EasyPaisa",
      icon: Wallet,
      desc: `Send to ${process.env.NEXT_PUBLIC_EASYPAISA_NUMBER || "03390005715"}`,
      available: currency === "PKR",
    },
    {
      id: "stripe",
      label: "Card (Stripe)",
      icon: CreditCard,
      desc: "Visa / Mastercard / Amex",
      available: true,
    },
    {
      id: "paypal",
      label: "PayPal",
      icon: CreditCard,
      desc: "International payments",
      available: true,
    },
  ];

  const initiateMutation = useMutation({
    mutationFn: async ({ g }: { g: Gateway }) => {
      if (g === "jazzcash") {
        return api<{ action: string; fields: Record<string, string>; method: string }>(
          "/api/payments/jazzcash/initiate",
          { method: "POST", body: JSON.stringify({ plan }) }
        );
      }
      if (g === "easypaisa") {
        return api<{
          paymentId: string;
          amount: number;
          currency: string;
          number: string;
          instructions: string[];
        }>("/api/payments/easypaisa", {
          method: "POST",
          body: JSON.stringify({ plan }),
        });
      }
      if (g === "stripe") {
        return api<{ url: string }>("/api/payments/stripe/create-session", {
          method: "POST",
          body: JSON.stringify({ plan }),
        });
      }
      if (g === "paypal") {
        return api<{ url: string }>("/api/payments/paypal/create-order", {
          method: "POST",
          body: JSON.stringify({ plan }),
        });
      }
      throw new Error("Unknown gateway");
    },
    onSuccess: async (data, vars) => {
      setBusy(false);
      if (vars.g === "jazzcash") {
        const d = data as { action: string; fields: Record<string, string>; method: string };
        // Build and submit a hidden form to JazzCash.
        const form = document.createElement("form");
        form.method = d.method.toLowerCase() === "get" ? "GET" : "POST";
        form.action = d.action;
        for (const [k, v] of Object.entries(d.fields)) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = k;
          input.value = v;
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
      } else if (vars.g === "easypaisa") {
        const d = data as {
          paymentId: string;
          amount: number;
          currency: string;
          number: string;
          instructions: string[];
        };
        setEasypaisaData({
          number: d.number,
          amount: d.amount,
          currency: d.currency,
          paymentId: d.paymentId,
        });
      } else {
        const d = data as { url: string };
        if (d.url) window.location.href = d.url;
      }
    },
    onError: (e: Error) => {
      setBusy(false);
      toast.error(e.message);
    },
  });

  const confirmEasypaisa = useMutation({
    mutationFn: () =>
      api("/api/payments/easypaisa", {
        method: "PATCH",
        body: JSON.stringify({
          paymentId: easypaisaData?.paymentId,
          txnId: easypaisaTID,
        }),
      }),
    onSuccess: () => {
      toast.success("Transaction ID submitted! Your plan will be activated within 1-2 hours.");
      onPlanActivated();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handlePay = () => {
    if (!gateway || !plan) return;
    setBusy(true);
    initiateMutation.mutate({ g: gateway });
  };

  return (
    <Dialog open={plan !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-400" />
            {planObj ? `${planObj.name} Plan` : "Checkout"}
          </DialogTitle>
        </DialogHeader>

        {planObj ? (
          <div className="space-y-4">
            {/* Price summary */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
              <div>
                <p className="text-sm text-muted-foreground">{planObj.name} subscription</p>
                <p className="text-xs text-muted-foreground">{planObj.durationDays} days</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {formatPrice(amount, currency, symbol)}
                </p>
                <p className="text-xs text-muted-foreground">{currency}</p>
              </div>
            </div>

            {easypaisaData ? (
              /* EasyPaisa manual flow */
              <div className="space-y-3">
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                  <p className="mb-2 font-semibold text-amber-400">
                    Send {easypaisaData.currency}{" "}
                    {easypaisaData.amount.toLocaleString()} to:
                  </p>
                  <p className="font-mono text-lg font-bold">{easypaisaData.number}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    (EasyPaisa — use your registered number)
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    EasyPaisa Transaction ID (TID)
                  </label>
                  <input
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={easypaisaTID}
                    onChange={(e) => setEasypaisaTID(e.target.value)}
                    placeholder="e.g. 12345678901"
                  />
                </div>
                <Button
                  className="w-full brand-gradient text-white"
                  disabled={!easypaisaTID || confirmEasypaisa.isPending}
                  onClick={() => confirmEasypaisa.mutate()}
                >
                  {confirmEasypaisa.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Confirm Payment
                </Button>
              </div>
            ) : (
              <>
                {/* Gateway selection */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Select payment method:</p>
                  {gateways.map((g) => {
                    const Icon = g.icon;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        disabled={!g.available}
                        onClick={() => setGateway(g.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                          gateway === g.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40",
                          !g.available && "cursor-not-allowed opacity-40"
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{g.label}</p>
                          <p className="text-xs text-muted-foreground">{g.desc}</p>
                        </div>
                        {gateway === g.id ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <Button
                  className="w-full brand-gradient text-white"
                  disabled={!gateway || busy}
                  onClick={handlePay}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Pay {formatPrice(amount, currency, symbol)}
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
