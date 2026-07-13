"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Shield, Lock, Loader2, ArrowLeft, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Logo } from "@/components/iptv/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function AdminLogin() {
  const setView = useAppStore((s) => s.setView);
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // Step 1: Verify the admin password server-side.
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data.error || "Invalid password.";
        setError(msg);
        toast.error(msg);
        setBusy(false);
        return;
      }

      // Step 2: Sign in with the admin credentials (email + admin password).
      const signInRes = await signIn("credentials", {
        email: data.adminEmail,
        password: data.adminPassword,
        redirect: false,
      });

      if (signInRes?.error) {
        const msg = "Admin verified, but sign-in failed. Please try again.";
        setError(msg);
        toast.error(msg);
        setBusy(false);
        return;
      }

      toast.success("Welcome, Admin!");
      // Wait for the session cookie to be set, then reload at /admin.
      setTimeout(() => {
        window.location.href = "/admin?t=" + Date.now();
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
      toast.error(msg);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4" style={{ minHeight: "100vh" }}>
      <div className="w-full max-w-sm">
        {/* Back button */}
        <button
          type="button"
          onClick={() => setView("home")}
          className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </button>

        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Logo size={48} />
        </div>

        {/* Admin login card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl brand-gradient text-white">
              <Shield className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold">Admin Access</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the admin password to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-pass">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-pass"
                  type={showPass ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 pr-9"
                  autoFocus
                />
                <button
                  type="button"
                  aria-label={showPass ? "Hide" : "Show"}
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error ? (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={busy || !password}
              className="w-full gap-1.5 brand-gradient text-white"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              Access Admin Panel
            </Button>
          </form>

          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            Authorized personnel only. All access is logged.
          </p>
        </div>
      </div>
    </div>
  );
}
