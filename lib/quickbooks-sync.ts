import {
  getCachedQuickBooksSnapshot,
  getValidQuickBooksAccessToken,
  markQuickBooksSynced,
  recordQuickBooksSyncError,
  type QuickBooksFinancialSnapshot
} from "@/lib/quickbooks-connection";
import { quickBooksGet, quickBooksQuery } from "@/lib/quickbooks";

export const QUICKBOOKS_CACHE_MAX_AGE_MS = 15 * 60 * 1000;

type QboRef = { value?: string; name?: string };

type QboAccount = {
  Id: string;
  Name?: string;
  AccountType?: string;
  CurrentBalance?: number;
  CurrentBalanceWithSubAccounts?: number;
};

type QboInvoice = {
  Id: string;
  DocNumber?: string;
  Balance?: number;
  DueDate?: string;
  TxnStatus?: string;
  CustomerRef?: QboRef;
};

type QboBill = {
  Id: string;
  DocNumber?: string;
  Balance?: number;
  DueDate?: string;
  TxnStatus?: string;
  VendorRef?: QboRef;
};

type QboQueryResponse<TName extends string, TItem> = {
  QueryResponse?: {
    [key: string]: TItem[] | undefined;
  } & {
    [key in TName]?: TItem[];
  };
};

type ReportRow = {
  Header?: { ColData?: Array<{ value?: string }> };
  Summary?: { ColData?: Array<{ value?: string }> };
  Rows?: { Row?: ReportRow[] };
};

type QboReport = {
  Header?: {
    ReportName?: string;
    StartPeriod?: string;
    EndPeriod?: string;
  };
  Rows?: { Row?: ReportRow[] };
};

function money(value?: string | number | null) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (!value) return null;
  const normalized = String(value).replace(/[$,]/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function yearStartIso() {
  return `${new Date().getFullYear()}-01-01`;
}

function collectReportTotals(report?: QboReport) {
  const totals: Record<string, number | null> = {};

  function walk(rows?: ReportRow[]) {
    (rows || []).forEach((row) => {
      const label = row.Summary?.ColData?.[0]?.value || row.Header?.ColData?.[0]?.value;
      const amount = row.Summary?.ColData?.[1]?.value;
      if (label && amount !== undefined) {
        totals[label.toLowerCase()] = money(amount);
      }
      walk(row.Rows?.Row);
    });
  }

  walk(report?.Rows?.Row);
  return totals;
}

async function safeSection<T>(label: string, fn: () => Promise<T>): Promise<{ data: T | null; error?: string }> {
  try {
    return { data: await fn() };
  } catch (error) {
    return { data: null, error: `${label}: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function syncQuickBooksFinancials(options: { force?: boolean; allowCache?: boolean } = {}) {
  if (!options.force && options.allowCache) {
    const cached = await getCachedQuickBooksSnapshot();
    if (cached?.data && !cached.stale) {
      return { ...cached.data, source: "cache" as const, stale: false, errors: [] as string[] };
    }
  }

  const token = await getValidQuickBooksAccessToken();
  if (!token?.accessToken || !token.realmId) {
    throw new Error("QuickBooks is not connected yet. Connect QuickBooks to pull live financial data.");
  }

  const startDate = yearStartIso();
  const endDate = todayIso();

  const [company, accounts, invoices, bills, profitAndLoss, balanceSheet] = await Promise.all([
    safeSection("Company", () =>
      quickBooksGet<{ CompanyInfo?: { CompanyName?: string; Id?: string } }>(
        token.accessToken,
        token.realmId,
        `/companyinfo/${encodeURIComponent(token.realmId)}`
      )
    ),
    safeSection("Accounts", () =>
      quickBooksQuery<QboQueryResponse<"Account", QboAccount>>(
        token.accessToken,
        token.realmId,
        "select * from Account where AccountType = 'Bank' startposition 1 maxresults 100"
      )
    ),
    safeSection("Invoices", () =>
      quickBooksQuery<QboQueryResponse<"Invoice", QboInvoice>>(
        token.accessToken,
        token.realmId,
        "select * from Invoice where Balance > '0' startposition 1 maxresults 50"
      )
    ),
    safeSection("Bills", () =>
      quickBooksQuery<QboQueryResponse<"Bill", QboBill>>(
        token.accessToken,
        token.realmId,
        "select * from Bill where Balance > '0' startposition 1 maxresults 50"
      )
    ),
    safeSection("Profit and Loss", () =>
      quickBooksGet<QboReport>(token.accessToken, token.realmId, "/reports/ProfitAndLoss", {
        start_date: startDate,
        end_date: endDate,
        accounting_method: "Accrual"
      })
    ),
    safeSection("Balance Sheet", () =>
      quickBooksGet<QboReport>(token.accessToken, token.realmId, "/reports/BalanceSheet", {
        date: endDate,
        accounting_method: "Accrual"
      })
    )
  ]);

  const errors = [company.error, accounts.error, invoices.error, bills.error, profitAndLoss.error, balanceSheet.error].filter(Boolean) as string[];
  if (errors.length === 6) {
    await recordQuickBooksSyncError(errors.join(" | "));
    throw new Error(errors.join(" | "));
  }

  const bankAccounts = (accounts.data?.QueryResponse?.Account || []).map((account) => ({
    id: account.Id,
    name: account.Name || "Bank account",
    balance: money(account.CurrentBalanceWithSubAccounts ?? account.CurrentBalance)
  }));
  const cashAvailable = bankAccounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const plTotals = collectReportTotals(profitAndLoss.data || undefined);
  const snapshot: QuickBooksFinancialSnapshot = {
    syncedAt: new Date().toISOString(),
    companyName: company.data?.CompanyInfo?.CompanyName,
    realmId: company.data?.CompanyInfo?.Id || token.realmId,
    cashAvailable,
    bankAccounts,
    profitAndLoss: {
      startDate,
      endDate,
      totalIncome: plTotals["total income"] ?? null,
      totalExpenses: plTotals["total expenses"] ?? null,
      grossProfit: plTotals["gross profit"] ?? null,
      netIncome: plTotals["net income"] ?? plTotals["net operating income"] ?? null
    },
    unpaidInvoices: (invoices.data?.QueryResponse?.Invoice || []).map((invoice) => ({
      id: invoice.Id,
      docNumber: invoice.DocNumber,
      customer: invoice.CustomerRef?.name,
      balance: money(invoice.Balance),
      dueDate: invoice.DueDate,
      status: invoice.TxnStatus
    })),
    billsDue: (bills.data?.QueryResponse?.Bill || []).map((bill) => ({
      id: bill.Id,
      docNumber: bill.DocNumber,
      vendor: bill.VendorRef?.name,
      balance: money(bill.Balance),
      dueDate: bill.DueDate,
      status: bill.TxnStatus
    })),
    rawReports: {
      profitAndLoss: profitAndLoss.data,
      balanceSheet: balanceSheet.data
    }
  };

  await markQuickBooksSynced(snapshot);
  await recordQuickBooksSyncError(errors.length ? errors.join(" | ") : null);
  return { ...snapshot, source: "fresh" as const, stale: false, errors };
}

export async function getQuickBooksFinancialSnapshot() {
  const cached = await getCachedQuickBooksSnapshot();
  if (!cached?.data) return null;
  return cached;
}
