"use client";

import { useState, useTransition } from "react";
import { updateAnnouncement } from "@/app/(protected)/announcements/announcement-actions";
import type { Announcement } from "@/types/announcement";
import { Pencil, X } from "lucide-react";

export function EditAnnouncementForm({ announcement }: { announcement: Announcement }) {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (formData: FormData) => {
        setError(null);
        startTransition(async () => {
            try {
                await updateAnnouncement(announcement.id, formData);
                setOpen(false);
            } catch (saveError) {
                setError(saveError instanceof Error ? saveError.message : "Unable to update announcement.");
            }
        });
    };

    return (
        <>
            <button type="button" onClick={() => setOpen(true)} disabled={isPending} aria-label="Edit announcement" title="Edit announcement" className="text-muted-foreground hover:text-primary disabled:opacity-50">
                <Pencil size={14} aria-hidden="true" />
            </button>
            {open && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center">
                    <div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-x-hidden overflow-y-auto rounded-2xl border border-border bg-card p-6">
                        <div className="mb-5 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Edit Announcement</h2>
                            <button type="button" onClick={() => setOpen(false)} aria-label="Close edit announcement"><X size={18} /></button>
                        </div>
                        <form action={handleSubmit} className="space-y-4">
                            <label className="block text-sm"><span className="mb-1 block text-xs text-muted-foreground">Title</span><input name="title" required defaultValue={announcement.title} className="w-full rounded-lg border border-border bg-secondary px-3 py-2" /></label>
                            <label className="block text-sm"><span className="mb-1 block text-xs text-muted-foreground">Message</span><textarea name="body" required rows={5} defaultValue={announcement.body} className="w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2" /></label>
                            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                            <button type="submit" disabled={isPending} className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{isPending ? "Saving..." : "Save Changes"}</button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
