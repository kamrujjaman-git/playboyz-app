"use client";

import { useState, useTransition } from "react";
import { updateContribution } from "@/app/(protected)/finance/actions";
import { Dropdown } from "@/components/ui/dropdown";
import type { Contribution } from "@/types/contribution";
import { Pencil, X } from "lucide-react";

export function EditContributionForm({
    contribution,
}: {
    contribution: Contribution;
}) {
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState(String(contribution.amount));
    const [status, setStatus] = useState<"due" | "paid">(contribution.status);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleSave = () => {
        setError(null);
        startTransition(async () => {
            try {
                await updateContribution(contribution.id, Number(amount), status);
                setOpen(false);
            } catch (saveError) {
                setError(saveError instanceof Error ? saveError.message : "Unable to update contribution.");
            }
        });
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                disabled={isPending}
                aria-label="Edit contribution"
                title="Edit contribution"
                className="text-muted-foreground hover:text-primary disabled:opacity-50"
            >
                <Pencil size={14} aria-hidden="true" />
            </button>
            {open && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center">
                    <div className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-x-hidden overflow-y-auto rounded-2xl border border-border bg-card p-6">
                        <div className="mb-5 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Edit Contribution</h2>
                            <button type="button" onClick={() => setOpen(false)} aria-label="Close edit contribution">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <label className="block text-sm">
                                <span className="mb-1 block text-xs text-muted-foreground">Amount</span>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={amount}
                                    onChange={(event) => setAmount(event.target.value)}
                                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2"
                                />
                            </label>
                            <label className="block text-sm">
                                <span className="mb-1 block text-xs text-muted-foreground">Status</span>
                                <Dropdown
                                    value={status}
                                    onValueChange={(value) => setStatus(value as "due" | "paid")}
                                    options={[{ value: "due", label: "Due" }, { value: "paid", label: "Paid" }]}
                                    aria-label="Contribution status"
                                />
                            </label>
                            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isPending}
                                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                            >
                                {isPending ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
