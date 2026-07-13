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
import { Separator } from "@/components/ui/separator";
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

const GOOGLE_READY = !!(
  process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "1"
);
const FACEBOOK_READY = !!(
  process.env.NEXT_PUBLIC_FACEBOOK_ENABLED === "1"
);

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
      toast.success(activeMode === "signup" ? "Welcome to PlayBeat TV!" : "Signed in!");
      closeAuth();
      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setBusy(false);
    }
  };

  const oauth = async (provider: "google" | "facebook") => {
    if (provider === "google" && !GOOGLE_READY) {
      toast.info(
        "Google sign-in is coming soon. Please use email sign-up for now."
      );
      return;
    }
    if (provider === "facebook" && !FACEBOOK_READY) {
      toast.info(
        "Facebook sign-in is coming soon. Please use email sign-up for now."
      );
      return;
    }
    await signIn(provider, { callbackUrl: "/" });
  };

  const isSignup = effectiveMode === "signup";

  return (
    <Dialog open={authOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        {/* Brand header */}
        <div className="brand-gradient px-6 pb-5 pt-6 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
              <PlayCircle className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-extrabold">
                PlayBeat <span className="opacity-90">TV</span>
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

          {/* OAuth */}
          <div className="mt-4 space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => oauth("google")}
            >
              <GoogleIcon className="h-4 w-4" />
              Continue with Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => oauth("facebook")}
            >
              <FacebookIcon className="h-4 w-4" />
              Continue with Facebook
            </Button>
          </div>

          <div className="my-4 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

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

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.02 4.39 11.01 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.08 24 18.09 24 12.07z"
      />
    </svg>
  );
}
