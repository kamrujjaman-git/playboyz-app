"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  CalendarDays,
  LayoutDashboard,
  Megaphone,
  Menu,
  Settings,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { isPlatformOwner } from "@/lib/community-validation";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/members", label: "Members", icon: Users },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/announcements", label: "Announcements", icon: Megaphone },
];

export function BottomNav({ userEmail, isOwner }: { userEmail: string; isOwner: boolean }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const canManageCommunities = isOwner || isPlatformOwner(userEmail);

  return (
    <>
      <nav className="glass-surface fixed inset-x-0 bottom-0 z-40 rounded-none border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex h-16 w-full items-stretch justify-around overflow-hidden px-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-11 min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl px-0.5 py-1.5 transition-colors ${isActive ? "bg-primary/10" : "hover:bg-secondary/70"}`}
              >
                <item.icon
                  size={19}
                  className={isActive ? "text-primary" : "text-muted-foreground"}
                />
                <span
                  className={`block max-w-full truncate whitespace-nowrap text-[10px] font-semibold ${isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
          <button
            type="button"
            aria-label="Open more navigation options"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen(true)}
            className={`flex min-h-11 min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl px-0.5 py-1.5 transition-colors ${moreOpen || pathname.startsWith("/settings") || pathname.startsWith("/owner") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/70"}`}
          >
            <Menu size={19} aria-hidden="true" />
            <span className="text-[10px] font-semibold">More</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end bg-slate-950/45 p-3 md:hidden"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMoreOpen(false);
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="mobile-more-title" className="w-full max-w-lg rounded-2xl border border-border bg-card p-4 shadow-2xl">
            <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
              <div>
                <p id="mobile-more-title" className="font-semibold">More</p>
                <p className="text-xs text-muted-foreground">Account and community tools</p>
              </div>
              <button type="button" aria-label="Close more navigation" onClick={() => setMoreOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
              <Link href="/settings" onClick={() => setMoreOpen(false)} className={`flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-border px-3 text-sm font-medium ${pathname.startsWith("/settings") ? "bg-primary/10 text-primary" : "hover:bg-secondary"}`}>
                <Settings size={17} aria-hidden="true" /> Settings
              </Link>
              {canManageCommunities && (
                <Link href="/owner" onClick={() => setMoreOpen(false)} className={`flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-border px-3 text-sm font-medium ${pathname.startsWith("/owner") ? "bg-primary/10 text-primary" : "hover:bg-secondary"}`}>
                  <Building2 size={17} aria-hidden="true" /> Communities
                </Link>
              )}
              <Link href="/announcements" onClick={() => setMoreOpen(false)} className={`flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-border px-3 text-sm font-medium ${pathname.startsWith("/announcements") ? "bg-primary/10 text-primary" : "hover:bg-secondary"}`}>
                <Megaphone size={17} aria-hidden="true" /> Announcements
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
