"use client";

import { useTransition } from "react";
import { deleteAnnouncement } from "@/app/(protected)/announcements/announcement-actions";
import { Megaphone, Trash2 } from "lucide-react";
import { EditAnnouncementForm } from "@/components/announcements/edit-announcement-form";
import type { Announcement } from "@/types/announcement";

export function AnnouncementCard({
  announcement,
  canManage,
}: {
  announcement: Announcement;
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm("Delete this announcement?")) return;
    startTransition(async () => {
      await deleteAnnouncement(announcement.id);
    });
  };

  const date = new Date(announcement.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Megaphone size={16} className="text-primary" />
          </div>
          <div className="min-w-0 break-words">
            <h3 className="break-words text-sm font-semibold">{announcement.title}</h3>
            <p className="mt-1 break-words text-sm text-muted-foreground">
              {announcement.body}
            </p>
            <p className="mt-2 break-words text-[11px] text-muted-foreground">
              {announcement.author_name && `${announcement.author_name} · `}
              {date}
            </p>
          </div>
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
            <EditAnnouncementForm announcement={announcement} />
            <button
              onClick={handleDelete}
              disabled={isPending}
              aria-label="Delete announcement"
              title="Delete announcement"
              className="text-muted-foreground hover:text-destructive disabled:opacity-50"
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
