"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui";

type QuickBooksSnapshot = {
  syncedAt: string;
  source?: "fresh" | "cache";
  errors?: string[];
  companyName?: string;
  cashAvailable: number | null;
  bankAccounts: Array<{ id: string; name: string; balance: number | null }>;
  profitAndLoss: {
    startDate: string;
    endDate: string;
    totalIncome: number | null;
    totalExpenses: number | null;
    grossProfit: number | null;
    netIncome: number | null;
  };
  unpaidInvoices: Array<{ id: string; docNumber?: string; customer?: string; balance: number | null; dueDate?: string; status?: string }>;
  billsDue: Array<{ id: string; docNumber?: string; vendor?: string; balance: number | null; dueDate?: string; status?: string }>;
};

type QuickBooksStatus = {
  configured: boolean;
  connected: boolean;
  hasAccessToken?: boolean;
  hasRefreshToken?: boolean;
  expiresAt?: string | null;
  companyName?: string;
  lastSyncAt?: string | null;
  lastSyncError?: string | null;
  syncStale?: boolean;
  cachedSnapshot?: QuickBooksSnapshot | null;
  sampleApi?: { ok: boolean; status: number; body?: string } | null;
};

function formatMoney(value?: number | null) {
  if (value === null || value === undefined) return "No live data";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function QuickBooksFinance() {
  const [status, setStatus] = useState<QuickBooksStatus | null>(null);
  const [snapshot, setSnapshot] = useState<QuickBooksSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus() {
    const response = await fetch("/api/integrations/quickbooks/status", { cache: "no-store" });
    const data = (await response.json()) as QuickBooksStatus;
    setStatus(data);
    setSnapshot(data.cachedSnapshot || null);
    return data;
  }

  async function sync(force = false) {
    setSyncing(true);
    setError(null);
    try {
      const response = await fetch(`/api/integrations/quickbooks/sync${force ? "?force=1" : ""}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "QuickBooks sync failed.");
      setSnapshot(data as QuickBooksSnapshot);
      await loadStatus();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "QuickBooks sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadStatus()
      .then((nextStatus) => {
        if (nextStatus.connected && nextStatus.syncStale) return sync(false);
        return undefined;
      })
      .catch(() => setError("Unable to check QuickBooks connection."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-steel">Checking QuickBooks...</p>;
  }

  if (!status?.configured) {
    return (
      <div className="grid gap-3">
        <Badge tone="yellow">QuickBooks credentials needed</Badge>
        <p className="text-sm text-steel">
          The app is ready for QuickBooks, but Vercel still needs `QUICKBOOKS_CLIENT_ID` and `QUICKBOOKS_CLIENT_SECRET`.
        </p>
        <Link className="text-sm font-semibold text-pine" href="/integrations">Open setup</Link>
      </div>
    );
  }

  if (!status.connected) {
    return (
      <div className="grid gap-3">
        <Badge tone="yellow">QuickBooks not connected yet</Badge>
        <p className="text-sm text-steel">
          No fake cash numbers are shown. Connect QuickBooks to pull cash, bank balances, P&L, unpaid invoices, and bills due.
        </p>
        {status.hasAccessToken && !status.sampleApi?.ok ? (
          <p className="rounded-md bg-clay/10 p-3 text-xs font-semibold text-clay">
            QuickBooks API test failed: {status.sampleApi?.status || "unknown"} {status.sampleApi?.body || status.lastSyncError}
          </p>
        ) : null}
        <a className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white" href="/api/integrations/quickbooks/connect">
          <WalletCards className="h-4 w-4" />
          Connect QuickBooks
        </a>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="green">QuickBooks connected</Badge>
        {snapshot?.source ? <Badge tone="blue">{snapshot.source === "cache" ? "Cached" : "Fresh sync"}</Badge> : null}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase text-steel">Cash available from bank accounts</p>
        <p className="mt-1 text-2xl font-bold text-ink">{formatMoney(snapshot?.cashAvailable)}</p>
        <p className="mt-1 text-xs text-steel">
          {snapshot?.syncedAt ? `Last synced ${new Date(snapshot.syncedAt).toLocaleString()}` : "No sync yet"}
        </p>
      </div>

      {error || status.lastSyncError ? (
        <p className="rounded-md bg-clay/10 p-3 text-xs font-semibold text-clay">{error || status.lastSyncError}</p>
      ) : null}

      <div className="grid gap-2 text-sm">
        <Metric label="YTD income" value={formatMoney(snapshot?.profitAndLoss.totalIncome)} />
        <Metric label="YTD expenses" value={formatMoney(snapshot?.profitAndLoss.totalExpenses)} />
        <Metric label="YTD net income" value={formatMoney(snapshot?.profitAndLoss.netIncome)} />
        <Metric label="Unpaid invoices" value={`${snapshot?.unpaidInvoices.length || 0}`} />
        <Metric label="Bills due" value={`${snapshot?.billsDue.length || 0}`} />
      </div>

      {snapshot?.bankAccounts.length ? (
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase text-steel">Bank accounts</p>
          {snapshot.bankAccounts.slice(0, 4).map((account) => (
            <Metric key={account.id} label={account.name} value={formatMoney(account.balance)} />
          ))}
        </div>
      ) : null}

      <button
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-ink/10 px-4 py-2 text-sm font-semibold text-ink hover:border-pine/40 disabled:opacity-60"
        disabled={syncing}
        onClick={() => sync(true)}
      >
        <RefreshCw className={syncing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        {syncing ? "Syncing QuickBooks..." : "Sync QuickBooks"}
      </button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-primer/60 px-3 py-2">
      <span className="text-steel">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}
