"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { EventType, EventStatus, RsvpStatus } from "@/types/event";
import { getTenantContext } from "@/lib/supabase/tenant";
import { isPlatformOwner } from "@/lib/community-validation";
import { isValidUuid } from "@/lib/utils";

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

async function requireAdmin() {
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
    throw new Error("Only super admins, admins, and treasurers can manage events.");
  }

  const tenant = await getTenantContext(supabase);
  if (!tenant) throw new Error("Not authenticated");
  return { supabase, userId: user.id, tenant };
}

export async function createEvent(formData: FormData) {
  const { supabase, userId, tenant } = await requireAdmin();

  if (!tenant?.communityId) {
    throw new Error("Your account is not linked to a community.");
  }

  const title = formData.get("title") as string;
  const type = String(formData.get("type") ?? "") as EventType;
  const description = formData.get("description") as string;
  const eventDate = formData.get("event_date") as string;
  const venue = formData.get("venue") as string;
  const budget = Number(formData.get("budget") || 0);
  const extraContribution = Number(formData.get("extra_contribution_amount") || 0);

  if (!title || !["sports", "tour"].includes(type)) {
    throw new Error("Title and type are required.");
  }
  if (!Number.isFinite(budget) || budget < 0 || !Number.isFinite(extraContribution) || extraContribution < 0) {
    throw new Error("Budget values must be valid non-negative numbers.");
  }
  if (eventDate && !isValidIsoDate(eventDate)) {
    throw new Error("Please provide a valid event date.");
  }

  const { error } = await supabase.from("events").insert({
    title,
    type,
    description: description || null,
    event_date: eventDate || null,
    venue: venue || null,
    budget,
    extra_contribution_amount: extraContribution,
    created_by: userId,
    community_id: tenant.communityId,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/events");
}

export async function updateEvent(eventId: string, formData: FormData) {
  const { supabase, tenant } = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "") as EventType;
  const description = String(formData.get("description") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "");
  const venue = String(formData.get("venue") ?? "").trim();
  const budget = Number(formData.get("budget"));
  const extraContribution = Number(formData.get("extra_contribution_amount"));
  const validStatuses = ["sports", "tour"];

  if (!title || !validStatuses.includes(type)) {
    throw new Error("Event title and type are required.");
  }
  if (!Number.isFinite(budget) || budget < 0 || !Number.isFinite(extraContribution) || extraContribution < 0) {
    throw new Error("Budget values must be valid non-negative numbers.");
  }
  if (eventDate && !isValidIsoDate(eventDate)) {
    throw new Error("Please provide a valid event date.");
  }
  if (!isValidUuid(eventId)) {
    throw new Error("Event was not found.");
  }

  let updateQuery = supabase
    .from("events")
    .update({
      title,
      type,
      description: description || null,
      event_date: eventDate || null,
      venue: venue || null,
      budget,
      extra_contribution_amount: extraContribution,
    })
    .eq("id", eventId);
  if (tenant?.communityId) updateQuery = updateQuery.eq("community_id", tenant.communityId);
  const { data, error } = await updateQuery.select("id").maybeSingle();

  if (error) throw new Error(`Event update failed: ${error.message}`);
  if (!data) throw new Error("Event was not found or could not be updated.");

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
}

export async function deleteEvent(eventId: string) {
  const { supabase, tenant } = await requireAdmin();
  const scope = <T,>(query: T): T => tenant.isOwner ? query : (query as { eq: (field: string, value: string) => T }).eq("community_id", tenant.communityId!);

  const { error: participantError } = await scope(supabase
    .from("event_participants")
    .delete()
    .eq("event_id", eventId));
  if (participantError) throw new Error(`Event RSVP cleanup failed: ${participantError.message}`);

  const { error: contributionError } = await scope(supabase
    .from("contributions")
    .delete()
    .eq("event_id", eventId));
  if (contributionError) throw new Error(`Event contribution cleanup failed: ${contributionError.message}`);

  const { data, error } = await scope(supabase
    .from("events")
    .delete()
    .eq("id", eventId)).select("id").maybeSingle();

  if (error) throw new Error(`Event deletion failed: ${error.message}`);
  if (!data) throw new Error("Event was not found or could not be deleted.");

  revalidatePath("/events");
  revalidatePath("/finance");
}

export async function updateEventStatus(eventId: string, status: EventStatus) {
  const { supabase, tenant } = await requireAdmin();

  let query = supabase
    .from("events")
    .update({ status })
    .eq("id", eventId);
  if (tenant?.communityId) query = query.eq("community_id", tenant.communityId);
  const { data, error } = await query.select("id").maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Event was not found or could not be updated.");

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
}

export async function setRsvp(eventId: string, status: RsvpStatus) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");
  const tenant = await getTenantContext(supabase);
  if (!tenant) throw new Error("Not authenticated");
  if (!tenant) throw new Error("Not authenticated");

  if (!["going", "not_going", "pending"].includes(status)) {
    throw new Error("Invalid RSVP status.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (!isPlatformOwner(user.email) && profile?.status !== "active") {
    throw new Error("Only active members can RSVP to events.");
  }

  let eventQuery = supabase
    .from("events")
    .select("id")
    .eq("id", eventId);
  if (tenant.communityId && !tenant.isOwner) eventQuery = eventQuery.eq("community_id", tenant.communityId);
  const { data: event } = await eventQuery.single();

  if (!event) throw new Error("Event not found.");

  const { error } = await supabase.from("event_participants").upsert(
    {
      event_id: eventId,
      user_id: user.id,
      rsvp_status: status,
    },
    { onConflict: "event_id,user_id" }
  );

  if (error) throw new Error(error.message);

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
}

// Generates an extra "due" contribution for this event for every active member.
export async function generateEventContributions(eventId: string) {
  const { supabase, tenant } = await requireAdmin();
  const scope = <T,>(query: T): T => tenant.isOwner ? query : (query as { eq: (field: string, value: string) => T }).eq("community_id", tenant.communityId!);

  const { data: event } = await scope(supabase
    .from("events")
    .select("extra_contribution_amount")
    .eq("id", eventId)).single();

  const amount = event?.extra_contribution_amount ?? 0;
  if (!amount || amount <= 0) {
    throw new Error("Set an extra contribution amount on this event first.");
  }

  const { data: activeMembers } = await scope(supabase
    .from("profiles")
    .select("id")
    .eq("status", "active"));

  if (!activeMembers || activeMembers.length === 0) {
    return { created: 0 };
  }

  const { data: existing } = await scope(supabase
    .from("contributions")
    .select("user_id")
    .eq("type", "event")
    .eq("event_id", eventId));

  const existingUserIds = new Set(existing?.map((e) => e.user_id));
  const toCreate = activeMembers
    .filter((m) => !existingUserIds.has(m.id))
    .map((m) => ({
      user_id: m.id,
      type: "event" as const,
      event_id: eventId,
      amount,
      status: "due" as const,
      community_id: tenant?.communityId,
    }));

  if (toCreate.length === 0) {
    return { created: 0 };
  }

  const { error } = await supabase.from("contributions").insert(toCreate);
  if (error) throw new Error(error.message);

  revalidatePath("/finance");
  revalidatePath(`/events/${eventId}`);
  return { created: toCreate.length };
}
