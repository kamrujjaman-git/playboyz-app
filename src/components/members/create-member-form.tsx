"use client";

import { useRef, useState, useTransition } from "react";
import { createMember } from "@/app/(protected)/members/actions";
import { Dropdown } from "@/components/ui/dropdown";
import type { UserRole } from "@/types/profile";
import { Plus, X } from "lucide-react";

export function CreateMemberForm({ requesterRole }: { requesterRole: UserRole }) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const canCreateSuperAdmin = requesterRole === "super_admin";

    const handleSubmit = (formData: FormData) => {
        setError(null);
        startTransition(async () => {
            const result = await createMember(formData);
            if (result.success) {
                formRef.current?.reset();
                setOpen(false);
            } else {
                setError(result.error);
            }
        });
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
                <Plus size={14} aria-hidden="true" />
                Create Member
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setOpen(false);
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-member-title"
                        className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-x-hidden overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
                    >
                        <div className="mb-5 flex items-center justify-between">
                            <h2 id="create-member-title" className="text-lg font-semibold">
                                Create Member
                            </h2>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                aria-label="Close create member dialog"
                                className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            >
                                <X size={18} aria-hidden="true" />
                            </button>
                        </div>

                        <form ref={formRef} action={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="member-full-name" className="mb-1 block text-xs text-muted-foreground">
                                    Name
                                </label>
                                <input
                                    id="member-full-name"
                                    name="full_name"
                                    required
                                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="member-email" className="mb-1 block text-xs text-muted-foreground">
                                    Email
                                </label>
                                <input
                                    id="member-email"
                                    name="email"
                                    type="email"
                                    required
                                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="member-phone" className="mb-1 block text-xs text-muted-foreground">
                                    Phone
                                </label>
                                <input
                                    id="member-phone"
                                    name="phone"
                                    type="tel"
                                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="member-role" className="mb-1 block text-xs text-muted-foreground">
                                        Role
                                    </label>
                                    <Dropdown
                                        name="role"
                                        defaultValue="member"
                                        options={[{ value: "member", label: "Member" }, { value: "treasurer", label: "Treasurer" }, { value: "admin", label: "Admin" }, ...(canCreateSuperAdmin ? [{ value: "super_admin", label: "Super Admin" }] : [])]}
                                        aria-label="Member role"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="member-status" className="mb-1 block text-xs text-muted-foreground">
                                        Status
                                    </label>
                                    <Dropdown name="status" defaultValue="active" options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} aria-label="Member status" />
                                </div>
                            </div>

                            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                            >
                                {isPending ? "Creating..." : "Create Member"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
