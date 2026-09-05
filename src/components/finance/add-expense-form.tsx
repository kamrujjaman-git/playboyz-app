"use client";

import { useState, useRef, useTransition } from "react";
import { createExpense } from "@/app/(protected)/finance/expense-actions";
import { Dropdown } from "@/components/ui/dropdown";
import { DatePicker } from "@/components/ui/date-picker";
import { Plus, X, Paperclip } from "lucide-react";

const categories = [
  { value: "sports_equipment", label: "Sports Equipment" },
  { value: "venue", label: "Venue" },
  { value: "tour", label: "Tour" },
  { value: "misc", label: "Miscellaneous" },
];

export function AddExpenseForm() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await createExpense(formData);
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
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors"
      >
        <Plus size={14} />
        Add Expense
      </button>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-card border border-border mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Add Expense</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      <form ref={formRef} action={handleSubmit} className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Title
            </label>
            <input
              name="title"
              required
              placeholder="e.g. Cricket bat"
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Category
            </label>
            <Dropdown name="category" options={categories} aria-label="Expense category" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Amount (৳)
            </label>
            <input
              name="amount"
              type="number"
              min="1"
              step="0.01"
              required
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Date
            </label>
            <DatePicker name="expense_date" defaultValue={new Date().toISOString().split("T")[0]} aria-label="Expense date" />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Paperclip size={12} /> Receipt (optional)
          </label>
          <input
            name="receipt"
            type="file"
            accept="image/*,.pdf"
            className="w-full text-xs text-muted-foreground file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-secondary file:text-foreground file:text-xs"
          />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Adding..." : "Add Expense"}
        </button>
      </form>
    </div>
  );
}
