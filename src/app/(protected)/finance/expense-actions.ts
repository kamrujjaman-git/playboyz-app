"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ExpenseCategory } from "@/types/expense";
import { getTenantContext } from "@/lib/supabase/tenant";
import { isPlatformOwner } from "@/lib/community-validation";
import { isValidUuid } from "@/lib/utils";

const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;
const RECEIPT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};
const VALID_CATEGORIES = new Set<ExpenseCategory>(["sports_equipment", "venue", "tour", "misc"]);

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function receiptPath(value: string) {
  const marker = "/storage/v1/object/public/receipts/";
  const markerIndex = value.indexOf(marker);
  return markerIndex >= 0 ? decodeURIComponent(value.slice(markerIndex + marker.length)) : value;
}

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

  return { supabase, userId: user.id, tenant: await getTenantContext(supabase) };
}

export async function createExpense(formData: FormData) {
  const { supabase, userId, tenant } = await requireAdminOrTreasurer();

  if (!tenant?.communityId) {
    throw new Error("Your account is not linked to a community.");
  }

  const title = formData.get("title") as string;
  const category = String(formData.get("category") ?? "") as ExpenseCategory;
  const amount = Number(formData.get("amount"));
  const expenseDate = String(formData.get("expense_date") ?? "");
  const receiptEntry = formData.get("receipt");
  const receiptFile = receiptEntry instanceof File ? receiptEntry : null;

  if (!title || !VALID_CATEGORIES.has(category)) {
    throw new Error("Please provide a valid expense title and category.");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Expense amount must be a valid number greater than zero.");
  }
  if (expenseDate && !isValidIsoDate(expenseDate)) {
    throw new Error("Please provide a valid expense date.");
  }

  let receiptUrl: string | null = null;
  let uploadedReceiptName: string | null = null;

  if (receiptEntry && !receiptFile) {
    throw new Error("The receipt upload is invalid.");
  }

  if (receiptFile) {
    if (receiptFile.size === 0) {
      throw new Error("The receipt file is empty.");
    }

    if (receiptFile.size > MAX_RECEIPT_SIZE) {
      throw new Error("The receipt file must be 5 MB or smaller.");
    }

    const fileExt = receiptFile.name.split(".").pop()?.toLowerCase() ?? "";
    const expectedType = RECEIPT_TYPES[fileExt];

    if (!expectedType || receiptFile.type !== expectedType) {
      throw new Error("Receipt must be a JPEG, PNG, WEBP image, or PDF.");
    }

    const fileName = `${userId}-${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(fileName, receiptFile);

    if (uploadError) {
      throw new Error(`Receipt upload failed. ${uploadError.message}`);
    }

    uploadedReceiptName = fileName;

    receiptUrl = fileName;
  }

  const { error } = await supabase.from("expenses").insert({
    title,
    category,
    amount,
    expense_date: expenseDate || new Date().toISOString().split("T")[0],
    receipt_url: receiptUrl,
    spent_by: userId,
    approved_by: userId,
    community_id: tenant.communityId,
  });

  if (error) {
    if (uploadedReceiptName) {
      const { error: cleanupError } = await supabase.storage
        .from("receipts")
        .remove([uploadedReceiptName]);

      if (cleanupError) {
        throw new Error(
          `Expense save failed: ${error.message} Receipt cleanup also failed: ${cleanupError.message}`
        );
      }
    }

    throw new Error(`Expense save failed: ${error.message}`);
  }

  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

export async function deleteExpense(expenseId: string) {
  const { supabase, tenant } = await requireAdminOrTreasurer();
  if (!tenant?.communityId) {
    throw new Error("Your account is not linked to a community.");
  }

  const query = supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .eq("community_id", tenant.communityId);
  const { data, error } = await query.select("id").maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Expense was not found or could not be deleted.");

  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

export async function getReceiptSignedUrl(expenseId: string) {
  if (!isValidUuid(expenseId)) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const tenant = await getTenantContext(supabase);
  if (!tenant || (!tenant.isOwner && !tenant.communityId)) return null;

  let expenseQuery = supabase
    .from("expenses")
    .select("receipt_url")
    .eq("id", expenseId)
  if (tenant.communityId) expenseQuery = expenseQuery.eq("community_id", tenant.communityId);
  const { data: expense } = await expenseQuery.maybeSingle();
  if (!expense?.receipt_url) return null;

  const { data, error } = await supabase.storage
    .from("receipts")
    .createSignedUrl(receiptPath(expense.receipt_url), 60 * 60);
  return error ? null : data.signedUrl;
}

export async function updateExpense(expenseId: string, formData: FormData) {
  const { supabase, tenant } = await requireAdminOrTreasurer();
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const amount = Number(formData.get("amount"));
  const expenseDate = String(formData.get("expense_date") ?? "");

  if (!title || !VALID_CATEGORIES.has(category as ExpenseCategory)) {
    throw new Error("Please provide a valid expense title and category.");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Expense amount must be greater than zero.");
  }
  if (!isValidIsoDate(expenseDate)) {
    throw new Error("Please provide a valid expense date.");
  }

  if (!tenant?.communityId) {
    throw new Error("Your account is not linked to a community.");
  }

  const query = supabase
    .from("expenses")
    .update({ title, category, amount, expense_date: expenseDate })
    .eq("id", expenseId)
    .eq("community_id", tenant.communityId);
  const { data, error } = await query.select("id").maybeSingle();

  if (error) throw new Error(`Expense update failed: ${error.message}`);
  if (!data) throw new Error("Expense was not found or could not be updated.");

  revalidatePath("/finance");
  revalidatePath("/dashboard");
}
