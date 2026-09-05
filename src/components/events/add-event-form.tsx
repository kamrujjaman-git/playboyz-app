"use client";

import { useState, useRef, useTransition } from "react";
import { createEvent } from "@/app/(protected)/events/event-actions";
import { Dropdown } from "@/components/ui/dropdown";
import { DatePicker } from "@/components/ui/date-picker";
import { Plus, X } from "lucide-react";

export function AddEventForm() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await createEvent(formData);
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
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <Plus size={14} />
        New Event
      </button>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-card border border-border mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Create Event</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      <form ref={formRef} action={handleSubmit} className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground block mb-1">
              Title
            </label>
            <input
              name="title"
              required
              placeholder="e.g. Inter-batch Cricket Match"
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Type
            </label>
            <Dropdown
              name="type"
              options={[{ value: "sports", label: "Sports" }, { value: "tour", label: "Tour" }]}
              aria-label="Event type"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Date
            </label>
            <DatePicker name="event_date" aria-label="Event date" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Venue
            </label>
            <input
              name="venue"
              placeholder="e.g. Uttara Sports Complex"
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Budget (৳, optional)
            </label>
            <input
              name="budget"
              type="number"
              min="0"
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground block mb-1">
              Extra Contribution per Member (৳, optional)
            </label>
            <input
              name="extra_contribution_amount"
              type="number"
              min="0"
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              If this event needs extra money beyond the weekly fund, set an
              amount here — you can generate dues for it from the event page.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground block mb-1">
              Description (optional)
            </label>
            <textarea
              name="description"
              rows={2}
              placeholder="Any details members should know..."
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Creating..." : "Create Event"}
        </button>
      </form>
    </div>
  );
}
