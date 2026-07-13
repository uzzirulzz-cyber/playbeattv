"use client";

import {
  Home,
  Tv,
  Film,
  Clapperboard,
  Heart,
  History,
  Store,
  UserCog,
  Shield,
  X,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";
import { signOut } from "next-auth/react";
import type { ViewId } from "@/lib/types";

interface NavItem {
  id: ViewId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "live", label: "Live TV", icon: Tv },
  { id: "movies", label: "Movies", icon: Film },
  { id: "series", label: "Series", icon: Clapperboard },
  { id: "favorites", label: "Favorites", icon: Heart },
  { id: "history", label: "History", icon: History },
  { id: "storefront", label: "Subscribe", icon: Store },
  { id: "account", label: "My Account", icon: UserCog },
  { id: "admin", label: "Admin Panel", icon: Shield, adminOnly: true },
];

export function Sidebar() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const { user, isAdmin } = useAuth();

  const nav = NAV.filter((n) => !n.adminOnly);
  const adminItems = NAV.filter((n) => n.adminOnly);
  return (
    <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg brand-gradient text-white shadow-sm">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-base font-extrabold tracking-tight text-sidebar-foreground">
            PlayBeat <span className="brand-text">TV</span>
          </span>
          <span className="text-[11px] text-muted-foreground">playbeat.live</span>
        </div>
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
          className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
        <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Browse
        </p>
        {nav.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setView(item.id);
                setSidebarOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </button>
          );
        })}

        {isAdmin ? (
          <>
            <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Administration
            </p>
            {adminItems.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setView(item.id);
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </>
        ) : null}
      </nav>

      {/* User + footer */}
      <div className="border-t border-sidebar-border p-3">
        <button
          type="button"
          onClick={() => {
            setView("account");
            setSidebarOpen(false);
          }}
          className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full brand-gradient text-sm font-bold text-white">
            {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {user?.name || "Member"}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>

        <div className="mt-2 flex items-center gap-1.5 px-3 pt-2 text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3" />
          Secured streaming · PlayBeat TV
        </div>
      </div>
    </aside>
  );
}
