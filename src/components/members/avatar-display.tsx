"use client";

import Image from "next/image";
import { useState } from "react";

export function AvatarDisplay({
    name,
    avatarUrl,
    size = "md",
}: {
    name: string | null;
    avatarUrl?: string | null;
    size?: "md" | "card" | "lg";
}) {
    const initial = name?.charAt(0)?.toUpperCase() ?? "?";
    const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
    const dimensions = size === "lg"
        ? "h-20 w-20 text-2xl"
        : size === "card"
            ? "h-16 w-16 text-xl"
            : "h-9 w-9 text-sm";
    const normalizedAvatarUrl = avatarUrl?.trim();

    const imageFailed = normalizedAvatarUrl !== undefined && normalizedAvatarUrl === failedAvatarUrl;

    return (
        <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-bold text-primary-foreground ${dimensions}`}>
            {normalizedAvatarUrl && !imageFailed ? (
                <Image
                    src={normalizedAvatarUrl}
                    alt={`${name ?? "Member"} avatar`}
                    fill
                    sizes={size === "lg" ? "80px" : size === "card" ? "64px" : "36px"}
                    className="object-cover"
                    onError={() => setFailedAvatarUrl(normalizedAvatarUrl)}
                />
            ) : (
                <span aria-hidden="true">{initial}</span>
            )}
        </div>
    );
}
