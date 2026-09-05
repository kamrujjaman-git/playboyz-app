import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import type { Metadata } from "next";
import { isPlatformOwner } from "@/lib/community-validation";

const DEFAULT_LOGO = "/logo.png";
const DEFAULT_FAVICON = "/favicon.ico";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { title: "Campusphere" };

  if (isPlatformOwner(user.email)) {
    return { title: "Platform Owner" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("community_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.community_id) return { title: "Campusphere" };

  const { data: community } = await supabase
    .from("communities")
    .select("name, favicon_url")
    .eq("id", profile.community_id)
    .maybeSingle();

  return {
    title: community?.name || "Campusphere",
    icons: { icon: community?.favicon_url || DEFAULT_FAVICON },
  };
}

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const owner = isPlatformOwner(user.email);
  const profile = owner
    ? {
      full_name: "Platform Owner",
      status: "active" as const,
      role: "super_admin" as const,
      avatar_url: null,
      community_id: null,
    }
    : (await supabase
      .from("profiles")
      .select("full_name, status, role, avatar_url, community_id")
      .eq("id", user.id)
      .single()).data;

  if (!owner && (!profile || profile.status === "inactive" || !profile.community_id)) {
    await supabase.auth.signOut();
    redirect(`/login?error=${profile?.status === "inactive" ? "inactive" : "unregistered_user"}`);
  }

  const resolvedProfile = profile ?? {
    full_name: "Member",
    status: "active" as const,
    role: "member" as const,
    avatar_url: null,
    community_id: null,
  };
  const communityId = resolvedProfile.community_id;
  const { data: community } = !owner && communityId
    ? await supabase
      .from("communities")
      .select("name, logo_url, favicon_url")
      .eq("id", communityId)
      .maybeSingle()
    : { data: null };

  const communityName = community?.name || "Campusphere";
  const communityLogo = community?.logo_url || DEFAULT_LOGO;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        userEmail={user.email ?? ""}
        isOwner={owner}
        communityName={communityName}
        communityLogo={communityLogo}
      />
      <div className="min-w-0 md:pl-64">
        <Header
          userName={resolvedProfile.full_name || "Member"}
          userEmail={user.email ?? ""}
          userRole={resolvedProfile.role}
          avatarUrl={resolvedProfile.avatar_url ?? user.user_metadata?.avatar_url ?? null}
          communityName={communityName}
          communityLogo={communityLogo}
        />
        <main className="min-w-0 p-4 pb-24 md:p-8 md:pb-8">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}