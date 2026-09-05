/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wallet,
  CalendarDays,
  Megaphone,
  Settings,
  Building2,
} from "lucide-react";
import { motion } from "framer-motion";
import { isPlatformOwner } from "@/lib/community-validation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/members", label: "Members", icon: Users },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/announcements", label: "Announcements", icon: Megaphone },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  userEmail,
  isOwner,
  communityName,
  communityLogo,
}: {
  userEmail: string;
  isOwner: boolean;
  communityName: string;
  communityLogo: string;
}) {
  const pathname = usePathname();
  const visibleNavItems = isOwner || isPlatformOwner(userEmail)
    ? [...navItems, { href: "/owner", label: "Communities", icon: Building2 }]
    : navItems;

  return (
    <aside className="glass-surface hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col rounded-none border-y-0 border-l-0">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-6">
        <img
          src={communityLogo}
          alt={`${communityName} logo`}
          width={32}
          height={32}
          className="rounded-lg flex-shrink-0"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = "/logo.png";
          }}
        />
        <span className="text-xl font-black tracking-tight text-primary">
          {communityName}
        </span>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
        {visibleNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg border border-primary/30 bg-primary/10 shadow-[var(--shadow-inset)]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <item.icon
                className={`relative w-4.5 h-4.5 ${isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                size={18}
              />
              <span
                className={`relative ${isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
