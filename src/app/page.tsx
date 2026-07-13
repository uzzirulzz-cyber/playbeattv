"use client";

import { useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/iptv/sidebar";
import { Topbar } from "@/components/iptv/topbar";
import { HomeView } from "@/components/iptv/home-view";
import { BrowserView } from "@/components/iptv/browser-view";
import { FavoritesView } from "@/components/iptv/favorites-view";
import { HistoryView } from "@/components/iptv/history-view";
import { CategoriesView } from "@/components/iptv/categories-view";
import { StorefrontView } from "@/components/iptv/storefront-view";
import { AccountView } from "@/components/iptv/account-view";
import { AdminView } from "@/components/iptv/admin-view";
import { AdminLogin } from "@/components/iptv/admin-login";
import { LandingView } from "@/components/iptv/landing-view";
import { PlayerModal } from "@/components/iptv/player-modal";
import { SeriesDetailDialog } from "@/components/iptv/series-detail";
import { AuthDialog } from "@/components/iptv/auth-dialog";
import { BotHeartbeat } from "@/components/iptv/bot-heartbeat";
import { Logo } from "@/components/iptv/logo";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import type { ViewId } from "@/lib/types";

const VALID_VIEWS: ViewId[] = [
  "home", "live", "movies", "series", "categories",
  "favorites", "history", "storefront", "account", "admin",
];

export default function Home() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const { isAuthenticated, isLoading } = useAuth();

  // Handle URL routing: ?view=X, #/view=X, or #view — plus payment redirects.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const { hash, search } = window.location;

    // Parse view from query string (?view=X) or hash (#/storefront or #storefront)
    let viewParam: ViewId | null = null;
    const searchParams = new URLSearchParams(search);
    viewParam = searchParams.get("view") as ViewId | null;

    if (!viewParam && hash) {
      // Hash routing: #/storefront or #storefront
      const clean = hash.replace(/^#\/?/, "");
      const hashView = clean.split(/[?&]/)[0] as ViewId;
      if (VALID_VIEWS.includes(hashView)) {
        viewParam = hashView;
      }
    }

    if (viewParam && VALID_VIEWS.includes(viewParam)) {
      setView(viewParam);
    }

    const paymentParam = searchParams.get("payment");
    if (paymentParam) {
      const messages: Record<string, { title: string; variant: "success" | "error" | "info" }> = {
        success: { title: "Payment successful! Your subscription is now active. 🎉", variant: "success" },
        failed: { title: "Payment failed. Please try again.", variant: "error" },
        cancelled: { title: "Payment cancelled.", variant: "info" },
        error: { title: "Payment verification error. Contact support.", variant: "error" },
        notfound: { title: "Payment record not found.", variant: "error" },
      };
      const msg = messages[paymentParam];
      if (msg) {
        if (msg.variant === "success") toast.success(msg.title);
        else if (msg.variant === "error") toast.error(msg.title);
        else toast.info(msg.title);
      }
      // Clean the URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [setView]);

  // Loading splash while the session resolves.
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 bg-background" style={{ minHeight: "100vh" }}>
        <Logo size={56} />
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading PlayBeat TV…
        </div>
      </div>
    );
  }

  // Public landing experience for signed-out visitors.
  // Storefront is visible; admin requires the admin login.
  if (!isAuthenticated) {
    return (
      <>
        {view === "storefront" ? (
          <PublicShell>
            <StorefrontView />
          </PublicShell>
        ) : view === "admin" ? (
          <AdminLogin />
        ) : (
          <LandingView />
        )}
        <AuthDialog />
      </>
    );
  }

  // Authenticated app shell.
  return (
    <div className="flex flex-col bg-background" style={{ minHeight: "100vh" }}>
      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <div className="sticky top-0 h-screen">
            <Sidebar />
          </div>
        </div>

        {/* Mobile sidebar drawer */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar />
          </SheetContent>
        </Sheet>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1600px]">
              {view === "home" ? <HomeView /> : null}
              {view === "live" ? <BrowserView type="live" /> : null}
              {view === "movies" ? <BrowserView type="movie" /> : null}
              {view === "series" ? <BrowserView type="series" /> : null}
              {view === "favorites" ? <FavoritesView /> : null}
              {view === "history" ? <HistoryView /> : null}
              {view === "categories" ? <CategoriesView /> : null}
              {view === "storefront" ? <StorefrontView /> : null}
              {view === "account" ? <AccountView /> : null}
              {view === "admin" ? <AdminView /> : null}
            </div>
          </main>
        </div>
      </div>

      {/* Sticky footer */}
      <footer className="mt-auto border-t border-border bg-card/50 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center justify-between gap-3 sm:flex-row">
          <Logo size={28} />
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} PlayBeat TV. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* Overlays */}
      <PlayerModal />
      <SeriesDetailDialog />
      <AuthDialog />
      <BotHeartbeat />
    </div>
  );
}

/** Minimal shell for the public storefront (top bar + content). */
function PublicShell({ children }: { children: React.ReactNode }) {
  const setView = useAppStore((s) => s.setView);
  const openAuth = useAppStore((s) => s.openAuth);
  return (
    <div className="bg-background" style={{ minHeight: "100vh" }}>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
        <button
          type="button"
          onClick={() => setView("home")}
        >
          <Logo size={36} />
        </button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setView("home")}>
            Back to home
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
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}
