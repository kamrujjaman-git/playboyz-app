"use client";

import { useState, useTransition } from "react";
import { deleteExpense } from "@/app/(protected)/finance/expense-actions";
import { EditExpenseForm } from "@/components/finance/edit-expense-form";
import { Paperclip, Trash2 } from "lucide-react";
import type { Expense } from "@/types/expense";

const categoryLabels: Record<string, string> = {
  sports_equipment: "Sports Equipment",
  venue: "Venue",
  tour: "Tour",
  misc: "Misc",
};

export function ExpenseList({
  expenses,
  canManage,
}: {
  expenses: Expense[];
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (!confirm("Delete this expense?")) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteExpense(id);
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : "Unable to delete expense.");
      }
    });
  };

  if (expenses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>
    );
  }

  return (
    <div className="space-y-2">
      {expenses.map((e) => (
        <div
          key={e.id}
          className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 break-words">
            <p className="break-words text-sm font-medium">{e.title}</p>
            <p className="break-words text-xs text-muted-foreground">
              {categoryLabels[e.category]} · {e.expense_date}
              {e.spent_by_name && ` · by ${e.spent_by_name}`}
            </p>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-3 self-end sm:self-auto">
            {e.receipt_url && (
              <a
                href={e.receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
                title="View receipt"
              >
                <Paperclip size={14} />
              </a>
            )}
            <span className="text-sm font-semibold text-destructive">
              ৳{e.amount}
            </span>
            {canManage && <EditExpenseForm expense={e} />}
            {canManage && (
              <button
                onClick={() => handleDelete(e.id)}
                disabled={isPending}
                className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                title="Delete expense"
                aria-label="Delete expense"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      ))}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
