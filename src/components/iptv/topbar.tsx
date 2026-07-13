"use client";

import { Menu, Search, Sun, Moon, X, Crown, LogIn } from "lucide-react";
import { useTheme } from "next-themes";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const search = useAppStore((s) => s.search);
  const setSearch = useAppStore((s) => s.setSearch);
  const setView = useAppStore((s) => s.setView);
  const openAuth = useAppStore((s) => s.openAuth);
  const { isAuthenticated, plan, planExpires } = useAuth();

  const planLabel =
    plan && plan !== "free"
      ? plan.charAt(0).toUpperCase() + plan.slice(1)
      : null;

  const expired =
    planExpires && new Date(planExpires).getTime() < Date.now();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open menu"
        className="md:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search */}
      <div className="relative max-w-xl flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search channels, movies, series…"
          className="pl-9 pr-9"
        />
        {search ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {isAuthenticated ? (
          planLabel && !expired ? (
            <Badge className="hidden gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-400 sm:inline-flex">
              <Crown className="h-3.5 w-3.5" />
              {planLabel}
            </Badge>
          ) : (
            <Button
              size="sm"
              className="gap-1.5 brand-gradient text-white"
              onClick={() => setView("storefront")}
            >
              <Crown className="h-4 w-4" />
              <span className="hidden sm:inline">Subscribe</span>
            </Button>
          )
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => openAuth("signin")}
          >
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Sign in</span>
          </Button>
        )}

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>
    </header>
  );
}
