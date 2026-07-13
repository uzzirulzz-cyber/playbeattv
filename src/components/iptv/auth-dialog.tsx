"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getRegionList, DEFAULT_REGION } from "@/lib/plans";
import {
  Mail,
  Lock,
  User,
  Loader2,
  PlayCircle,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api } from "@/hooks/use-iptv";
import { toast } from "sonner";
import { Logo } from "@/components/iptv/logo";

export function AuthDialog() {
  const { authOpen, authMode, closeAuth, openAuth } = useAppStore();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);

  // Sync local mode when opened via store
  const effectiveMode = authMode;

  const onClose = (open: boolean) => {
    if (!open) closeAuth();
  };

  const onTabChange = (v: string) => {
    setMode(v as "signin" | "signup");
    openAuth(v as "signin" | "signup");
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const activeMode = effectiveMode === "signup" ? "signup" : "signin";

    // Client-side validation
    if (!email.trim() || !password) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      if (activeMode === "signup") {
        await api("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ name, email, password, region }),
        });
      }
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        toast.error(
          activeMode === "signup"
            ? "Account created, but sign-in failed. Please try signing in."
            : "Invalid email or password."
        );
        return;
      }
      if (res?.status === 429) {
        toast.error("Too many attempts. Please wait a minute and try again.");
        return;
      }
      toast.success(activeMode === "signup" ? "Welcome to PlayBeat TV!" : "Signed in!");
      closeAuth();
      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      // Handle rate limit error from the proxy
      if (msg.includes("429") || msg.toLowerCase().includes("too many")) {
        toast.error("Too many attempts. Please wait a minute and try again.");
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const isSignup = effectiveMode === "signup";

  return (
    <Dialog open={authOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        {/* Brand header */}
        <div className="brand-gradient px-6 pb-5 pt-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
              <Logo showText={false} size={32} />
            </div>
            <div>
              <DialogTitle className="text-xl font-extrabold uppercase tracking-tight">
                PlayBeat TV
              </DialogTitle>
              <DialogDescription className="text-white/80">
                {isSignup
                  ? "Create your free account"
                  : "Welcome back — sign in to continue"}
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-2">
          <Tabs
            value={effectiveMode}
            onValueChange={onTabChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Email sign-up/sign-in — the primary, always-working method */}

          {/* Email form */}
          <form onSubmit={submitEmail} className="space-y-3">
            {isSignup ? (
              <div className="space-y-1.5">
                <Label htmlFor="auth-name">Full name</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="auth-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="pl-9"
                    autoComplete="name"
                  />
                </div>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="auth-email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-9"
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="auth-pass">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="auth-pass"
                  type={showPass ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 pr-9"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  aria-label={showPass ? "Hide password" : "Show password"}
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isSignup ? (
              <div className="space-y-1.5">
                <Label htmlFor="auth-region">Region</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger id="auth-region">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getRegionList().map((r) => (
                      <SelectItem key={r.code} value={r.code}>
                        {r.name} ({r.currency} {r.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Prices are shown in your local currency.
                </p>
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={busy}
              className="w-full gap-1.5 brand-gradient text-white"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              {isSignup ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            By continuing you agree to PlayBeat TV&apos;s Terms & Privacy Policy.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
