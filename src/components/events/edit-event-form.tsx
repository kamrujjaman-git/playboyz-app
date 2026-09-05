"use client";

import { useState, useTransition } from "react";
import { updateEvent } from "@/app/(protected)/events/event-actions";
import { Dropdown } from "@/components/ui/dropdown";
import { DatePicker } from "@/components/ui/date-picker";
import type { Event } from "@/types/event";
import { Pencil, X } from "lucide-react";

export function EditEventForm({ event }: { event: Event }) {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (formData: FormData) => {
        setError(null);
        startTransition(async () => {
            try {
                await updateEvent(event.id, formData);
                setOpen(false);
            } catch (saveError) {
                setError(saveError instanceof Error ? saveError.message : "Unable to update event.");
            }
        });
    };

    return (
        <>
            <button type="button" onClick={() => setOpen(true)} aria-label="Edit event" title="Edit event" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-secondary">
                <Pencil size={13} aria-hidden="true" /> Edit
            </button>
            {open && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center">
                    <div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-x-hidden overflow-y-auto rounded-2xl border border-border bg-card p-6">
                        <div className="mb-5 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Edit Event</h2>
                            <button type="button" onClick={() => setOpen(false)} aria-label="Close edit event"><X size={18} /></button>
                        </div>
                        <form action={handleSubmit} className="space-y-4">
                            <label className="block text-sm"><span className="mb-1 block text-xs text-muted-foreground">Title</span><input name="title" required defaultValue={event.title} className="w-full rounded-lg border border-border bg-secondary px-3 py-2" /></label>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block text-sm"><span className="mb-1 block text-xs text-muted-foreground">Type</span><Dropdown name="type" defaultValue={event.type} options={[{ value: "sports", label: "Sports" }, { value: "tour", label: "Tour" }]} aria-label="Event type" /></label>
                                <label className="block text-sm"><span className="mb-1 block text-xs text-muted-foreground">Date</span><DatePicker name="event_date" defaultValue={event.event_date ?? ""} aria-label="Event date" /></label>
                            </div>
                            <label className="block text-sm"><span className="mb-1 block text-xs text-muted-foreground">Venue</span><input name="venue" defaultValue={event.venue ?? ""} className="w-full rounded-lg border border-border bg-secondary px-3 py-2" /></label>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block text-sm"><span className="mb-1 block text-xs text-muted-foreground">Budget</span><input name="budget" type="number" min="0" step="0.01" defaultValue={event.budget} className="w-full rounded-lg border border-border bg-secondary px-3 py-2" /></label>
                                <label className="block text-sm"><span className="mb-1 block text-xs text-muted-foreground">Extra Contribution</span><input name="extra_contribution_amount" type="number" min="0" step="0.01" defaultValue={event.extra_contribution_amount} className="w-full rounded-lg border border-border bg-secondary px-3 py-2" /></label>
                            </div>
                            <label className="block text-sm"><span className="mb-1 block text-xs text-muted-foreground">Description</span><textarea name="description" rows={3} defaultValue={event.description ?? ""} className="w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2" /></label>
                            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                            <button type="submit" disabled={isPending} className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{isPending ? "Saving..." : "Save Changes"}</button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
