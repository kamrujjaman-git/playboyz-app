import { createClient } from "@/lib/supabase/server";
import { AddAnnouncementForm } from "@/components/announcements/add-announcement-form";
import { AnnouncementCard } from "@/components/announcements/announcement-card";
import type { Announcement } from "@/types/announcement";
import { getTenantContext } from "@/lib/supabase/tenant";
import { isPlatformOwner } from "@/lib/community-validation";

export default async function AnnouncementsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenant = await getTenantContext(supabase);
  const owner = isPlatformOwner(user?.email);
  if (!tenant) return null;
  const communityFilter = <T,>(query: T): T => tenant.isOwner || !tenant.communityId ? query : (query as { eq: (field: string, value: string) => T }).eq("community_id", tenant.communityId);

  const [profileResult, announcementsResult] = await Promise.all([
    owner ? Promise.resolve({ data: { role: "super_admin" } }) : supabase.from("profiles").select("role").eq("id", user?.id).single(),
    communityFilter(supabase.from("announcements").select("*").order("created_at", { ascending: false })),
  ]);

  const myProfile = profileResult.data;

  const canManage =
    myProfile?.role === "super_admin" ||
    myProfile?.role === "admin" ||
    myProfile?.role === "treasurer";

  const rawAnnouncements = announcementsResult.data;

  const authorIds = [
    ...new Set(
      (rawAnnouncements ?? [])
        .map((a) => a.created_by)
        .filter(Boolean) as string[]
    ),
  ];

  let authorsMap: Record<string, string> = {};
  if (authorIds.length > 0) {
    const { data: profiles } = await communityFilter(supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", authorIds));

    authorsMap = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p.full_name ?? "Unknown"])
    );
  }

  const announcements: Announcement[] = (rawAnnouncements ?? []).map((a) => ({
    ...a,
    author_name: a.created_by ? authorsMap[a.created_by] : undefined,
  }));

  return (
    <div className="min-w-0 space-y-6 pb-24">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold">Announcements</h1>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            Notices and updates for everyone.
          </p>
        </div>
        {canManage && <div className="w-full shrink-0 sm:w-auto"><AddAnnouncementForm /></div>}
      </div>

      {announcements.length === 0 ? (
        <p className="break-words text-sm text-muted-foreground">
          No announcements yet.
        </p>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
