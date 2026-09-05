"use client";

import { useState, useRef, useTransition } from "react";
import { createAnnouncement } from "@/app/(protected)/announcements/announcement-actions";
import { Plus, X } from "lucide-react";

export function AddAnnouncementForm() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await createAnnouncement(formData);
        formRef.current?.reset();
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
      >
        <Plus size={14} />
        New Announcement
      </button>
    );
  }

  return (
    <div className="w-full min-w-0 rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
        <h3 className="min-w-0 break-words text-sm font-semibold">Post Announcement</h3>
        <button
          onClick={() => setOpen(false)}
          className="min-h-11 min-w-11 shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      <form ref={formRef} action={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Title
          </label>
          <input
            name="title"
            required
            placeholder="e.g. Practice moved to Saturday"
            className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Message
          </label>
          <textarea
            name="body"
            required
            rows={3}
            placeholder="Details for everyone..."
            className="min-h-24 w-full min-w-0 resize-none rounded-lg border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Posting..." : "Post Announcement"}
        </button>
      </form>
    </div>
  );
}
