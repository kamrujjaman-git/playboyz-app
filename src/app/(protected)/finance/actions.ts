"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/supabase/tenant";
import { isPlatformOwner } from "@/lib/community-validation";
import { isValidUuid } from "@/lib/utils";

async function requireAdminOrTreasurer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!isPlatformOwner(user.email) && (
    profile?.role !== "super_admin" &&
    profile?.role !== "admin" &&
    profile?.role !== "treasurer"
  )) {
    throw new Error("Only admins or treasurers can do this.");
  }

  const tenant = await getTenantContext(supabase);
  if (!tenant) throw new Error("Not authenticated");
  return { supabase, userId: user.id, tenant };
}

function getMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

// Generates a "due" contribution row for every active member for the current week,
// skipping members who already have one for this week.
export async function generateWeeklyDues() {
  try {
    const { supabase, tenant } = await requireAdminOrTreasurer();
    if (!tenant?.communityId) {
      throw new Error("Your account is not linked to a community.");
    }
    const scope = <T,>(query: T): T => (query as { eq: (field: string, value: string) => T }).eq("community_id", tenant.communityId!);
    const weekStart = getMonday(new Date());

    const { data: appSettings } = await supabase
      .from("app_settings")
      .select("weekly_contribution_amount")
      .eq("community_id", tenant.communityId)
      .maybeSingle();
    const weeklyAmount = Number(appSettings?.weekly_contribution_amount) || 50;

    const { data: activeMembers, error: activeMembersError } = await scope(supabase
      .from("profiles")
      .select("id")
      .eq("status", "active"));

    if (activeMembersError) {
      return { success: false, count: 0, error: activeMembersError.message };
    }

    if (activeMembers.length === 0) {
      return { success: true, count: 0 };
    }

    const { data: existing, error: existingError } = await scope(supabase
      .from("contributions")
      .select("user_id")
      .eq("type", "weekly")
      .eq("week_start_date", weekStart));

    if (existingError) {
      return { success: false, count: 0, error: existingError.message };
    }

    const existingUserIds = new Set(existing.map((contribution) => contribution.user_id));
    const toCreate = activeMembers
      .filter((member) => !existingUserIds.has(member.id))
      .map((member) => ({
        user_id: member.id,
        type: "weekly" as const,
        amount: weeklyAmount,
        week_start_date: weekStart,
        status: "due" as const,
        community_id: tenant?.communityId,
      }));

    if (toCreate.length === 0) {
      return { success: true, count: 0 };
    }

    const { error: insertError } = await supabase
      .from("contributions")
      .insert(toCreate);

    if (insertError) {
      if (insertError.code === "23505") {
        return { success: true, count: 0 };
      }

      return { success: false, count: 0, error: insertError.message };
    }

    revalidatePath("/finance");
    revalidatePath("/dashboard");
    return { success: true, count: toCreate.length };
  } catch (error) {
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Unable to generate weekly dues.",
    };
  }
}

export async function markContributionPaid(contributionId: string) {
  const { supabase, userId, tenant } = await requireAdminOrTreasurer();
  if (!tenant?.communityId) {
    throw new Error("Your account is not linked to a community.");
  }

  const query = supabase
    .from("contributions")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      marked_by: userId,
    })
    .eq("id", contributionId)
    .eq("community_id", tenant.communityId);
  const { data, error } = await query.select("id").maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Contribution was not found or could not be updated.");

  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

export async function markContributionDue(contributionId: string) {
  const { supabase, tenant } = await requireAdminOrTreasurer();
  if (!tenant?.communityId) {
    throw new Error("Your account is not linked to a community.");
  }

  const query = supabase
    .from("contributions")
    .update({ status: "due", paid_at: null, marked_by: null })
    .eq("id", contributionId)
    .eq("community_id", tenant.communityId);
  const { data, error } = await query.select("id").maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Contribution was not found or could not be updated.");

  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

export async function updateContribution(
  contributionId: string,
  amount: number,
  status: "due" | "paid"
) {
  const { supabase, userId, tenant } = await requireAdminOrTreasurer();
  if (!tenant?.communityId) {
    throw new Error("Your account is not linked to a community.");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Contribution amount must be greater than zero.");
  }

  if (status !== "due" && status !== "paid") {
    throw new Error("Invalid contribution status.");
  }

  const query = supabase
    .from("contributions")
    .update({
      amount,
      status,
      paid_at: status === "paid" ? new Date().toISOString() : null,
      marked_by: status === "paid" ? userId : null,
    })
    .eq("id", contributionId)
    .eq("community_id", tenant.communityId);
  const { data, error } = await query.select("id").maybeSingle();

  if (error) throw new Error(`Contribution update failed: ${error.message}`);
  if (!data) throw new Error("Contribution was not found or could not be updated.");

  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

export async function deleteContribution(contributionId: string) {
  const { supabase, tenant } = await requireAdminOrTreasurer();
  if (!tenant?.communityId) {
    throw new Error("Your account is not linked to a community.");
  }

  const query = supabase
    .from("contributions")
    .delete()
    .eq("id", contributionId)
    .eq("community_id", tenant.communityId);
  const { data, error } = await query.select("id").maybeSingle();

  if (error) throw new Error(`Contribution deletion failed: ${error.message}`);
  if (!data) throw new Error("Contribution was not found or could not be deleted.");

  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

// Creates an event-based extra contribution due for all active members.
export async function createEventContribution(
  eventId: string,
  amount: number
) {
  const { supabase, tenant } = await requireAdminOrTreasurer();
  if (!tenant?.communityId) {
    throw new Error("Your account is not linked to a community.");
  }
  if (!isValidUuid(eventId)) {
    throw new Error("Event was not found.");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Event contribution must be a valid number greater than zero.");
  }
  const scope = <T,>(query: T): T => (query as { eq: (field: string, value: string) => T }).eq("community_id", tenant.communityId!);

  const { data: event } = await scope(supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle());
  if (!event) {
    throw new Error("Event was not found in your community.");
  }

  const { data: activeMembers } = await scope(supabase
    .from("profiles")
    .select("id")
    .eq("status", "active"));

  if (!activeMembers || activeMembers.length === 0) {
    return { created: 0 };
  }

  const { data: existing, error: existingError } = await scope(supabase
    .from("contributions")
    .select("user_id")
    .eq("type", "event")
    .eq("event_id", eventId));
  if (existingError) throw new Error("Unable to check existing event contributions.");
  const existingUserIds = new Set((existing ?? []).map((contribution) => contribution.user_id));

  const toCreate = activeMembers.filter((member) => !existingUserIds.has(member.id)).map((m) => ({
    user_id: m.id,
    type: "event" as const,
    event_id: eventId,
    amount,
    status: "due" as const,
    community_id: tenant?.communityId,
  }));

  const { error } = await supabase.from("contributions").insert(toCreate);
  if (error) throw new Error(error.message);

  revalidatePath("/finance");
  revalidatePath("/dashboard");
  return { created: toCreate.length };
}
