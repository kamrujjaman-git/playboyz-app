import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  MAX_ACTIVE_COMMUNITIES,
  isPlatformOwner,
  validateUniversityEmail,
} from "@/lib/community-validation";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tab = ["signin", "join", "create"].includes(searchParams.get("tab") ?? "")
    ? searchParams.get("tab")!
    : "signin";
  const rawCommunityKey = searchParams.get("community_key") ?? "";
  const communityKey = rawCommunityKey.trim();
  const createCommunityName = searchParams.get("create_community_name")?.trim();
  const loginRedirect = (error: string) => {
    const params = new URLSearchParams({ tab, error });
    if (communityKey) params.set("community_key", communityKey);
    return NextResponse.redirect(`${origin}/login?${params.toString()}`);
  };

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const ownerBypass = isPlatformOwner(data.user.email);

      if (ownerBypass) {
        return NextResponse.redirect(new URL("/owner", request.url));
      }

      const normalizedEmail = (data.user.email ?? "").trim().toLowerCase();
      const adminClient = createAdminClient();
      const { data: pendingInvite } = await adminClient
        .from("community_admin_invites")
        .select("id, community_id")
        .eq("email", normalizedEmail)
        .eq("status", "pending")
        .maybeSingle();

      if (pendingInvite) {
        const { data: invitedCommunity } = await adminClient
          .from("communities")
          .select("id, status")
          .eq("id", pendingInvite.community_id)
          .eq("status", "active")
          .maybeSingle();
        if (invitedCommunity) {
          const { error: inviteProfileError } = await adminClient.from("profiles").upsert({
            id: data.user.id,
            full_name: data.user.user_metadata?.full_name ?? "",
            avatar_url: data.user.user_metadata?.avatar_url ?? "",
            community_id: invitedCommunity.id,
            role: "super_admin",
            status: "active",
            profile_completed: false,
          });
          if (inviteProfileError) {
            await supabase.auth.signOut();
            return loginRedirect("profile_update_failed");
          }
          await adminClient.from("community_admin_invites").update({ status: "accepted" }).eq("id", pendingInvite.id);
          return NextResponse.redirect(`${origin}/dashboard`);
        }
      }

      const emailValidation = validateUniversityEmail(data.user.email ?? "");

      if (!emailValidation.valid) {
        await supabase.auth.signOut();
        return loginRedirect("invalid_domain");
      }

      const { data: existingProfile, error: profileLookupError } = await supabase
        .from("profiles")
        .select("id, status, role, community_id")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileLookupError) {
        await supabase.auth.signOut();
        return loginRedirect("profile_lookup_failed");
      }

      if (tab === "signin") {
        if (!existingProfile?.community_id || existingProfile.status !== "active") {
          await supabase.auth.signOut();
          return loginRedirect("unregistered_user");
        }

        const { data: community, error: communityError } = await supabase
          .from("communities")
          .select("id")
          .eq("id", existingProfile.community_id)
          .eq("status", "active")
          .maybeSingle();

        if (communityError || !community) {
          await supabase.auth.signOut();
          return loginRedirect("unregistered_user");
        }

        return NextResponse.redirect(`${origin}/dashboard`);
      }

      if (existingProfile?.status === "inactive") {
        await supabase.auth.signOut();
        return loginRedirect("inactive");
      }

      if (tab === "join" && !communityKey) {
        await supabase.auth.signOut();
        return loginRedirect("community_not_found");
      }

      if (tab === "create" && existingProfile?.community_id) {
        await supabase.auth.signOut();
        return loginRedirect("already_registered");
      }

      let communityId: string | null = null;
      if (tab === "join" && communityKey) {
        const { data: community, error: communityError } = await supabase
          .from("communities")
          .select("id, domain")
          .ilike("community_key", communityKey)
          .maybeSingle();

        if (communityError || !community) {
          await supabase.auth.signOut();
          return loginRedirect("community_not_found");
        }

        if (emailValidation.domain !== String(community.domain).trim().toLowerCase()) {
          await supabase.auth.signOut();
          return loginRedirect("community_domain_mismatch");
        }

        if (existingProfile?.community_id && existingProfile.community_id !== community.id) {
          await supabase.auth.signOut();
          return loginRedirect("already_registered");
        }

        communityId = community.id;
      }

      if (tab === "create" && createCommunityName) {
        const { count, error: countError } = await supabase
          .from("communities")
          .select("id", { count: "exact", head: true })
          .eq("status", "active");
        if (countError || (count ?? 0) >= MAX_ACTIVE_COMMUNITIES) {
          await supabase.auth.signOut();
          return loginRedirect("community_limit");
        }

        const prefix = createCommunityName
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 24) || "COMMUNITY";
        let generatedKey = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const { data: keyMatch } = await supabase
            .from("communities")
            .select("id")
            .eq("key", generatedKey)
            .maybeSingle();
          if (!keyMatch) break;
          generatedKey = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
        }
        const { data: createdCommunity, error: communityError } = await supabase
          .from("communities")
          .insert({
            name: createCommunityName,
            key: generatedKey,
            community_key: generatedKey,
            domain: emailValidation.domain,
            created_by: data.user.id,
            status: "active",
          })
          .select("id")
          .maybeSingle();
        if (communityError || !createdCommunity) {
          const message = communityError?.message ?? "Community insert returned no row.";
          console.error("Community creation failed in OAuth callback:", {
            message,
            code: communityError?.code,
            details: communityError?.details,
            hint: communityError?.hint,
          });
          await supabase.auth.signOut();
          return loginRedirect("db_error");
        }
        communityId = createdCommunity.id;
      } else if (tab === "create") {
        await supabase.auth.signOut();
        return loginRedirect("db_error");
      }

      if (existingProfile && ownerBypass && existingProfile.role !== "super_admin") {
        const { error: ownerRoleError } = await supabase
          .from("profiles")
          .update({ role: "super_admin" })
          .eq("id", data.user.id);
        if (ownerRoleError) return loginRedirect("profile_update_failed");
      }

      if (existingProfile && tab === "join" && communityId) {
        const { error: profileCommunityError } = await supabase
          .from("profiles")
          .update({ community_id: communityId })
          .eq("id", data.user.id);
        if (profileCommunityError) {
          await supabase.auth.signOut();
          return loginRedirect("profile_update_failed");
        }
      }

      if (existingProfile && tab === "create" && createCommunityName && communityId) {
        const { error: profileCommunityError } = await supabase
          .from("profiles")
          .update({ community_id: communityId, role: "super_admin" })
          .eq("id", data.user.id);
        if (profileCommunityError) {
          await supabase.auth.signOut();
          return loginRedirect("profile_update_failed");
        }
      }

      if (!existingProfile) {
        const { error: profileInsertError } = await supabase.from("profiles").insert({
          id: data.user.id,
          full_name: data.user.user_metadata?.full_name ?? "",
          avatar_url: data.user.user_metadata?.avatar_url ?? "",
          community_id: communityId,
          role: ownerBypass || createCommunityName ? "super_admin" : "member",
          status: "active",
          profile_completed: false,
        });

        if (profileInsertError) {
          console.error("Profile creation failed in OAuth callback:", {
            message: profileInsertError.message,
            code: profileInsertError.code,
            details: profileInsertError.details,
            hint: profileInsertError.hint,
          });
          await supabase.auth.signOut();
          return loginRedirect("db_error");
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return loginRedirect("auth_failed");
}
