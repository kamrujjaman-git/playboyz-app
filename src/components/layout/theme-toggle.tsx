"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const mounted = useSyncExternalStore(
        () => () => undefined,
        () => true,
        () => false
    );

    if (!mounted) {
        return <div className="h-9 w-9 rounded-lg border border-transparent bg-secondary shadow-[var(--shadow-soft-sm)]" aria-hidden="true" />;
    }

    const current = themes.find((item) => item.value === theme) ?? themes[2];
    const Icon = current.icon;

    return (
        <div className="relative">
            <button
                type="button"
                aria-label={`Theme: ${current.label}`}
                title={`Theme: ${current.label}`}
                onClick={() => setTheme(themes[(themes.findIndex((item) => item.value === theme) + 1) % themes.length].value)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent bg-secondary text-muted-foreground shadow-[var(--shadow-soft-sm)] transition-all hover:-translate-y-px hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring active:shadow-[var(--shadow-inset)]"
            >
                <Icon size={17} aria-hidden="true" />
            </button>
        </div>
    );
}
