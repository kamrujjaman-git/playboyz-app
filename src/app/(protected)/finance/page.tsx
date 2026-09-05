import { createClient } from "@/lib/supabase/server";
import { FinanceSummaryCards } from "@/components/finance/finance-summary-cards";
import { GenerateWeeklyDuesButton } from "@/components/finance/generate-dues-button";
import { ContributionRow } from "@/components/finance/contribution-row";
import { AddExpenseForm } from "@/components/finance/add-expense-form";
import { ExpenseList } from "@/components/finance/expense-list";
import { getReceiptSignedUrl } from "@/app/(protected)/finance/expense-actions";
import type { Contribution } from "@/types/contribution";
import type { Expense } from "@/types/expense";
import { getTenantContext } from "@/lib/supabase/tenant";
import { isPlatformOwner } from "@/lib/community-validation";

export default async function FinancePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenant = await getTenantContext(supabase);
  const owner = isPlatformOwner(user?.email);
  if (!tenant) return null;
  const communityFilter = <T,>(query: T): T => tenant.isOwner || !tenant.communityId ? query : (query as { eq: (field: string, value: string) => T }).eq("community_id", tenant.communityId);

  const [profileResult, contributionsResult, expensesResult] = await Promise.all([
    owner ? Promise.resolve({ data: { role: "super_admin" } }) : supabase.from("profiles").select("role").eq("id", user?.id).single(),
    communityFilter(supabase.from("contributions").select("*").order("created_at", { ascending: false })),
    communityFilter(supabase.from("expenses").select("*").order("expense_date", { ascending: false })),
  ]);

  const myProfile = profileResult.data;

  const canManage =
    myProfile?.role === "super_admin" ||
    myProfile?.role === "admin" ||
    myProfile?.role === "treasurer";

  const rawContributions = contributionsResult.data;
  const rawExpenses = expensesResult.data;

  // Merge profile names manually (avoids relying on PostgREST auto-joins).
  const contributionUserIds = [
    ...new Set((rawContributions ?? []).map((c) => c.user_id)),
  ];
  const expenseUserIds = [
    ...new Set(
      (rawExpenses ?? []).map((e) => e.spent_by).filter(Boolean) as string[]
    ),
  ];
  const allUserIds = [...new Set([...contributionUserIds, ...expenseUserIds])];

  let profilesMap: Record<string, string> = {};
  if (allUserIds.length > 0) {
    const { data: profilesData } = await communityFilter(supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", allUserIds));

    profilesMap = Object.fromEntries(
      (profilesData ?? []).map((p) => [p.id, p.full_name ?? "Unknown"])
    );
  }

  const allContributions: Contribution[] = (rawContributions ?? []).map(
    (c) => ({
      ...c,
      profiles: { full_name: profilesMap[c.user_id] ?? "Unknown" },
    })
  );

  const allExpenses: Expense[] = await Promise.all((rawExpenses ?? []).map(async (e) => ({
    ...e,
    receipt_url: e.receipt_url ? await getReceiptSignedUrl(e.id) : null,
    spent_by_name: e.spent_by ? profilesMap[e.spent_by] : undefined,
  })));

  const totalCollected = allContributions
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const totalDue = allContributions
    .filter((c) => c.status === "due")
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const totalExpense = allExpenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  const totalFund = totalCollected - totalExpense;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Finance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Weekly contributions, event dues, and fund overview.
          </p>
        </div>
        {canManage && <GenerateWeeklyDuesButton />}
      </div>

      <FinanceSummaryCards
        totalFund={totalFund}
        totalCollected={totalCollected}
        totalDue={totalDue}
        totalExpense={totalExpense}
      />

      <div className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          {canManage ? "All Contributions" : "Recent Contributions"}
        </h2>
        {allContributions.length > 0 ? (
          <div className="space-y-2">
            {allContributions.map((c) => (
              <ContributionRow
                key={c.id}
                contribution={c}
                canManage={canManage}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No contributions yet.
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Expenses
          </h2>
          {canManage && <AddExpenseForm />}
        </div>
        <ExpenseList expenses={allExpenses} canManage={canManage} />
      </div>
    </div>
  );
}
