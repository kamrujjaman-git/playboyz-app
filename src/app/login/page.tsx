"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/layout/theme-toggle";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const errorCode = searchParams.get("error");
  const errorDetail = searchParams.get("error_detail");
  const tabParam = searchParams.get("tab");
  const initialMode = tabParam === "join" || tabParam === "create" ? tabParam : "signin";
  const [mode, setMode] = useState<"signin" | "join" | "create">(initialMode);
  const [communityKey, setCommunityKey] = useState(searchParams.get("community_key") ?? "");
  const [communityName, setCommunityName] = useState("");
  const supabase = createClient();

  const changeMode = (nextMode: "signin" | "join" | "create") => {
    setMode(nextMode);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextMode);
    params.delete("error");
    router.replace(`/login?${params.toString()}`);
  };

  const handleGoogleLogin = async () => {
    const callbackUrl = new URL(
      `${window.location.origin}/auth/callback`
    );
    callbackUrl.searchParams.set("tab", mode);
    if (mode === "join") {
      if (!communityKey.trim()) return;
      callbackUrl.searchParams.set("community_key", communityKey.trim());
    }
    if (mode === "create") {
      if (!communityName.trim()) return;
      callbackUrl.searchParams.set("create_community_name", communityName.trim());
    }

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });
  };

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center overflow-x-hidden overflow-y-auto bg-background px-4 py-16 sm:px-6 sm:py-10">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6"><ThemeToggle /></div>
      <div className="relative flex w-full min-w-0 max-w-md shrink-0 flex-col items-center gap-5 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-10">
        <Image
          src="/logo.png"
          alt="Campusphere logo"
          width={88}
          height={88}
          className="rounded-2xl mb-1"
          priority
        />
        <h1 className="text-3xl font-black tracking-tight text-primary">Campusphere</h1>
        <p className="text-sm text-muted-foreground">Access your Campusphere community</p>
        <div className="grid min-h-12 w-full min-w-0 grid-cols-3 rounded-xl border border-border bg-secondary p-1">
          {[["signin", "Sign In"], ["join", "Join Community"], ["create", "Create Community"]].map(([value, label]) => (
            <button key={value} type="button" onClick={() => changeMode(value as typeof mode)} className={`min-h-10 min-w-0 shrink-0 rounded-lg px-1 py-2 text-center text-[11px] font-semibold leading-tight transition-colors sm:px-2 sm:text-xs ${mode === value ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {label}
            </button>
          ))}
        </div>
        {errorCode && (
          <div role="alert" className="flex min-h-16 w-full shrink-0 items-center justify-center rounded-xl border border-destructive bg-destructive/10 px-4 py-3 text-center text-sm font-semibold text-destructive">
            {errorCode === "invalid_domain"
              ? "Sign-in blocked: only official university emails ending in .edu or .edu.bd are permitted."
              : errorCode === "unregistered_user"
                ? "No active community profile found. Please create or join a community first."
                : errorCode === "already_registered"
                  ? "Your account is already registered to another community."
                  : errorCode === "not_owner"
                    ? "You Are Not The Owner. Use Join Community to access a university community."
                    : errorCode === "community_domain_mismatch"
                      ? "This email does not match the community's registered university domain."
                      : errorCode === "community_not_found"
                        ? "Community key not found. Check the key and try again."
                        : errorCode === "inactive"
                          ? "Your account is inactive. Please contact an admin for access."
                          : errorCode === "db_error"
                            ? `Community creation failed${errorDetail ? `: ${errorDetail}` : ". Please try again."}`
                            : "Authentication failed. Please try again."}
          </div>
        )}
        <div className="flex min-h-12 w-full min-w-0 shrink-0 flex-col justify-center gap-3">
          {mode === "join" && (
            <input value={communityKey} onChange={(event) => setCommunityKey(event.target.value)} placeholder="Community Key" className="min-h-12 w-full min-w-0 shrink-0 rounded-xl border border-border bg-secondary px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          )}
          {mode === "create" && (
            <input value={communityName} onChange={(event) => setCommunityName(event.target.value)} placeholder="Community name" className="min-h-12 w-full min-w-0 shrink-0 rounded-xl border border-border bg-secondary px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          )}
        </div>
        <p className="flex min-h-16 w-full shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-center text-xs leading-5 text-muted-foreground">
          Only official university emails (.edu / .edu.bd) are permitted. Personal Gmail accounts will be rejected.
        </p>
        <button
          onClick={handleGoogleLogin}
          disabled={(mode === "join" && !communityKey.trim()) || (mode === "create" && !communityName.trim())}
          className="min-h-12 w-full shrink-0 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-[var(--shadow-soft-sm)] transition-transform hover:-translate-y-0.5 hover:opacity-90 active:translate-y-px active:shadow-[var(--shadow-inset)]"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 p-8">
        <div className="h-[88px] w-[88px] animate-pulse rounded-2xl bg-secondary" />
        <div className="h-8 w-32 animate-pulse rounded-lg bg-secondary" />
        <div className="h-5 w-40 animate-pulse rounded-lg bg-secondary" />
        <div className="h-10 w-48 animate-pulse rounded-md bg-secondary" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
