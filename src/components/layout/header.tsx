/* eslint-disable @next/next/no-img-element */
"use client";

import { SignOutButton } from "@/components/layout/sign-out-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AvatarDisplay } from "@/components/members/avatar-display";
import { RoleBadge } from "@/components/members/role-badge";
import type { UserRole } from "@/types/profile";

export function Header({
  userName,
  userEmail,
  userRole,
  avatarUrl,
  communityName,
  communityLogo,
}: {
  userName: string;
  userEmail: string;
  userRole: UserRole;
  avatarUrl: string | null;
  communityName: string;
  communityLogo: string;
}) {
  return (
    <header className="glass-surface sticky top-0 z-30 flex h-16 items-center justify-between rounded-none border-x-0 border-t-0 px-4 md:px-8">
      <div className="md:hidden flex items-center gap-2">
        <img
          src={communityLogo}
          alt={`${communityName} logo`}
          width={28}
          height={28}
          className="rounded-lg"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = "/logo.png";
          }}
        />
        <span className="font-black text-primary tracking-tight">
          {communityName}
        </span>
      </div>
      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <div className="flex items-center justify-end gap-2">
            <p className="text-sm font-medium leading-tight">{userName}</p>
            <RoleBadge role={userRole} />
          </div>
          <p className="text-xs text-muted-foreground leading-tight">
            {userEmail}
          </p>
        </div>
        <ThemeToggle />
        <AvatarDisplay name={userName} avatarUrl={avatarUrl} />
        <SignOutButton />
      </div>
    </header>
  );
}