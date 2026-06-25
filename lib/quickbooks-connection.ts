import { IntegrationMode, IntegrationProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptCookieValue, encryptCookieValue } from "@/lib/secure-cookie";
import {
  getQuickBooksConfig,
  refreshQuickBooksToken,
  testQuickBooksApi,
  type StoredQuickBooksToken
} from "@/lib/quickbooks";

const OWNER_ACCOUNT_KEY = "owner";
const QUICKBOOKS_CACHE_KIND = "quickbooks-sync-cache";
const REFRESH_WINDOW_MS = 5 * 60 * 1000;

export type QuickBooksFinancialSnapshot = {
  syncedAt: string;
  companyName?: string;
  realmId?: string;
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
  rawReports: {
    profitAndLoss?: unknown;
    balanceSheet?: unknown;
  };
};

type QuickBooksNotes<T = unknown> = {
  kind?: string;
  description?: string;
  syncedAt?: string | null;
  data?: T | null;
  diagnostics?: {
    lastRefreshAttemptAt?: string;
    lastRefreshStatus?: "not_needed" | "success" | "failed" | "missing_refresh_token";
    lastRefreshError?: string;
    lastApiStatus?: string;
    lastSyncError?: string;
    scope?: string;
  };
};

function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required to store QuickBooks tokens.");
  return secret;
}

function parseNotes<T = unknown>(raw?: string | null): QuickBooksNotes<T> {
  if (!raw) return { kind: QUICKBOOKS_CACHE_KIND, data: null, syncedAt: null };
  try {
    return JSON.parse(raw) as QuickBooksNotes<T>;
  } catch {
    return { kind: QUICKBOOKS_CACHE_KIND, data: null, syncedAt: null };
  }
}

async function updateDiagnostics(diagnostics: NonNullable<QuickBooksNotes["diagnostics"]>) {
  const connection = await prisma.integrationConnection.findUnique({
    where: {
      provider_accountKey: {
        provider: IntegrationProvider.QUICKBOOKS,
        accountKey: OWNER_ACCOUNT_KEY
      }
    }
  });
  if (!connection) return;

  const notes = parseNotes(connection.notes);
  await prisma.integrationConnection.update({
    where: {
      provider_accountKey: {
        provider: IntegrationProvider.QUICKBOOKS,
        accountKey: OWNER_ACCOUNT_KEY
      }
    },
    data: {
      notes: JSON.stringify({
        ...notes,
        kind: QUICKBOOKS_CACHE_KIND,
        diagnostics: {
          ...notes.diagnostics,
          ...diagnostics
        }
      })
    }
  });
}

export async function saveQuickBooksConnection(input: {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  realmId: string;
  companyName?: string;
}) {
  const savedAt = new Date();
  const expiresAt = input.expiresIn ? new Date(savedAt.getTime() + input.expiresIn * 1000).toISOString() : undefined;
  const encryptedAccessToken = await encryptCookieValue(
    {
      accessToken: input.accessToken,
      tokenType: input.tokenType,
      expiresAt,
      savedAt: savedAt.toISOString()
    },
    authSecret()
  );
  const encryptedRefreshToken = input.refreshToken
    ? await encryptCookieValue({ refreshToken: input.refreshToken, savedAt: savedAt.toISOString() }, authSecret())
    : null;

  const notes: QuickBooksNotes<QuickBooksFinancialSnapshot> = {
    kind: QUICKBOOKS_CACHE_KIND,
    description: "Read-only QuickBooks Online OAuth connection.",
    syncedAt: null,
    data: null,
    diagnostics: {
      lastRefreshStatus: "not_needed",
      scope: getQuickBooksConfig().scope
    }
  };

  const connection = await prisma.integrationConnection.upsert({
    where: {
      provider_accountKey: {
        provider: IntegrationProvider.QUICKBOOKS,
        accountKey: OWNER_ACCOUNT_KEY
      }
    },
    create: {
      provider: IntegrationProvider.QUICKBOOKS,
      accountKey: OWNER_ACCOUNT_KEY,
      mode: IntegrationMode.READ_ONLY,
      status: "Connected",
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenType: input.tokenType,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      externalAccountId: input.realmId,
      externalAccountName: input.companyName || "QuickBooks company",
      notes: JSON.stringify(notes)
    },
    update: {
      mode: IntegrationMode.READ_ONLY,
      status: "Connected",
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenType: input.tokenType,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      externalAccountId: input.realmId,
      externalAccountName: input.companyName || "QuickBooks company",
      notes: JSON.stringify(notes)
    }
  });

  console.log("[quickbooks:callback] database save result", {
    provider: connection.provider,
    status: connection.status,
    realmId: connection.externalAccountId,
    hasAccessToken: Boolean(connection.accessToken),
    hasRefreshToken: Boolean(connection.refreshToken),
    expiresAt: connection.expiresAt?.toISOString()
  });

  return connection;
}

export async function getQuickBooksConnectionStatus() {
  const config = getQuickBooksConfig();
  const connection = await prisma.integrationConnection.findUnique({
    where: {
      provider_accountKey: {
        provider: IntegrationProvider.QUICKBOOKS,
        accountKey: OWNER_ACCOUNT_KEY
      }
    }
  });
  const token = connection?.accessToken ? await decryptCookieValue<StoredQuickBooksToken>(connection.accessToken, authSecret()) : null;
  const refreshToken = connection?.refreshToken
    ? await decryptCookieValue<{ refreshToken?: string; savedAt?: string }>(connection.refreshToken, authSecret())
    : null;
  const notes = parseNotes<QuickBooksFinancialSnapshot>(connection?.notes);
  const expiresAt = connection?.expiresAt?.toISOString() || token?.expiresAt || null;

  return {
    configured: config.isConfigured,
    connected: Boolean(connection?.status === "Connected" && connection.accessToken && connection.externalAccountId),
    hasAccessToken: Boolean(connection?.accessToken),
    hasRefreshToken: Boolean(refreshToken?.refreshToken),
    expiresAt,
    tokenExpired: expiresAt ? new Date(expiresAt).getTime() <= Date.now() : null,
    companyName: connection?.externalAccountName || notes.data?.companyName || undefined,
    realmId: connection?.externalAccountId || undefined,
    connectedAt: connection?.updatedAt.toISOString(),
    lastSyncAt: connection?.lastSyncAt?.toISOString(),
    syncStale: !connection?.lastSyncAt || Date.now() - connection.lastSyncAt.getTime() > 15 * 60 * 1000,
    lastSyncError: notes.diagnostics?.lastSyncError || null,
    lastRefreshStatus: notes.diagnostics?.lastRefreshStatus || "not_needed",
    lastRefreshAttemptAt: notes.diagnostics?.lastRefreshAttemptAt || null,
    lastRefreshError: notes.diagnostics?.lastRefreshError || null,
    lastApiStatus: notes.diagnostics?.lastApiStatus || null,
    scope: notes.diagnostics?.scope || config.scope,
    cachedSnapshot: notes.data || null
  };
}

export async function getValidQuickBooksAccessToken(options: { forceRefresh?: boolean } = {}) {
  const connection = await prisma.integrationConnection.findUnique({
    where: {
      provider_accountKey: {
        provider: IntegrationProvider.QUICKBOOKS,
        accountKey: OWNER_ACCOUNT_KEY
      }
    }
  });

  if (!connection?.accessToken) return null;
  const token = await decryptCookieValue<StoredQuickBooksToken>(connection.accessToken, authSecret());
  if (!token?.accessToken) return null;

  const refreshRecord = connection.refreshToken
    ? await decryptCookieValue<{ refreshToken?: string; savedAt?: string }>(connection.refreshToken, authSecret())
    : null;
  const expiresAt = connection.expiresAt?.toISOString() || token.expiresAt;
  const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : 0;
  const shouldRefresh = options.forceRefresh || !expiresAtMs || expiresAtMs - Date.now() <= REFRESH_WINDOW_MS;

  if (!shouldRefresh) {
    await updateDiagnostics({ lastRefreshStatus: "not_needed", lastRefreshAttemptAt: new Date().toISOString() });
    return { accessToken: token.accessToken, realmId: connection.externalAccountId || "" };
  }

  if (!refreshRecord?.refreshToken) {
    await updateDiagnostics({
      lastRefreshStatus: "missing_refresh_token",
      lastRefreshAttemptAt: new Date().toISOString(),
      lastRefreshError: "No QuickBooks refresh token is saved. Reconnect QuickBooks."
    });
    return { accessToken: token.accessToken, realmId: connection.externalAccountId || "" };
  }

  const attemptedAt = new Date().toISOString();
  try {
    const refreshed = await refreshQuickBooksToken(refreshRecord.refreshToken);
    const savedAt = new Date();
    const expiresAtNext = refreshed.expires_in ? new Date(savedAt.getTime() + refreshed.expires_in * 1000).toISOString() : undefined;
    const encryptedAccessToken = await encryptCookieValue(
      {
        accessToken: refreshed.access_token,
        tokenType: refreshed.token_type || token.tokenType,
        expiresAt: expiresAtNext,
        savedAt: savedAt.toISOString()
      },
      authSecret()
    );
    const encryptedRefreshToken = await encryptCookieValue(
      {
        refreshToken: refreshed.refresh_token || refreshRecord.refreshToken,
        savedAt: savedAt.toISOString()
      },
      authSecret()
    );
    const notes = parseNotes(connection.notes);

    await prisma.integrationConnection.update({
      where: {
        provider_accountKey: {
          provider: IntegrationProvider.QUICKBOOKS,
          accountKey: OWNER_ACCOUNT_KEY
        }
      },
      data: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenType: refreshed.token_type || token.tokenType,
        expiresAt: expiresAtNext ? new Date(expiresAtNext) : connection.expiresAt,
        status: "Connected",
        notes: JSON.stringify({
          ...notes,
          kind: QUICKBOOKS_CACHE_KIND,
          diagnostics: {
            ...notes.diagnostics,
            lastRefreshAttemptAt: attemptedAt,
            lastRefreshStatus: "success",
            lastRefreshError: undefined
          }
        })
      }
    });

    return { accessToken: refreshed.access_token, realmId: connection.externalAccountId || "" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateDiagnostics({
      lastRefreshAttemptAt: attemptedAt,
      lastRefreshStatus: "failed",
      lastRefreshError: message
    });
    if (options.forceRefresh || !expiresAtMs || expiresAtMs <= Date.now()) {
      await markQuickBooksNeedsReauthorization(`Refresh failed: ${message}`);
      throw error;
    }
    return { accessToken: token.accessToken, realmId: connection.externalAccountId || "" };
  }
}

export async function markQuickBooksNeedsReauthorization(reason: string) {
  await prisma.integrationConnection.update({
    where: {
      provider_accountKey: {
        provider: IntegrationProvider.QUICKBOOKS,
        accountKey: OWNER_ACCOUNT_KEY
      }
    },
    data: { status: "Needs reauthorization" }
  });
  await updateDiagnostics({ lastApiStatus: "needs_reauthorization", lastSyncError: reason });
}

export async function testStoredQuickBooksApi(options: { forceRefresh?: boolean } = {}) {
  const token = await getValidQuickBooksAccessToken({ forceRefresh: options.forceRefresh });
  if (!token?.accessToken || !token.realmId) {
    await updateDiagnostics({ lastApiStatus: "missing_token_or_realm" });
    return { ok: false, status: 0, body: "No saved QuickBooks access token or realm/company ID.", companyName: undefined, companyId: undefined };
  }

  let result = await testQuickBooksApi(token.accessToken, token.realmId);
  if (result.status === 401 && !options.forceRefresh) {
    try {
      const refreshed = await getValidQuickBooksAccessToken({ forceRefresh: true });
      if (refreshed?.accessToken && refreshed.realmId) {
        result = await testQuickBooksApi(refreshed.accessToken, refreshed.realmId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await markQuickBooksNeedsReauthorization(`QuickBooks returned 401 and token refresh failed: ${message}`);
      return { ok: false, status: 401, body: message, companyName: undefined, companyId: token.realmId };
    }
  }

  await updateDiagnostics({ lastApiStatus: String(result.status) });
  if (result.ok) {
    await prisma.integrationConnection.update({
      where: {
        provider_accountKey: {
          provider: IntegrationProvider.QUICKBOOKS,
          accountKey: OWNER_ACCOUNT_KEY
        }
      },
      data: {
        status: "Connected",
        externalAccountName: result.companyName || undefined,
        externalAccountId: result.companyId || token.realmId
      }
    });
    await updateDiagnostics({ lastSyncError: undefined });
  } else if (result.status === 401) {
    await markQuickBooksNeedsReauthorization(`QuickBooks API test returned 401. ${result.body}`);
  }
  return result;
}

export async function getCachedQuickBooksSnapshot() {
  const connection = await prisma.integrationConnection.findUnique({
    where: {
      provider_accountKey: {
        provider: IntegrationProvider.QUICKBOOKS,
        accountKey: OWNER_ACCOUNT_KEY
      }
    }
  });
  const notes = parseNotes<QuickBooksFinancialSnapshot>(connection?.notes);
  if (notes.kind !== QUICKBOOKS_CACHE_KIND || !notes.data) return null;
  return {
    data: notes.data,
    syncedAt: notes.syncedAt || connection?.lastSyncAt?.toISOString() || null,
    stale: !connection?.lastSyncAt || Date.now() - connection.lastSyncAt.getTime() > 15 * 60 * 1000
  };
}

export async function markQuickBooksSynced(snapshot: QuickBooksFinancialSnapshot) {
  const syncedAt = new Date();
  const connection = await prisma.integrationConnection.findUnique({
    where: {
      provider_accountKey: {
        provider: IntegrationProvider.QUICKBOOKS,
        accountKey: OWNER_ACCOUNT_KEY
      }
    }
  });
  const notes = parseNotes(connection?.notes);

  await prisma.integrationConnection.update({
    where: {
      provider_accountKey: {
        provider: IntegrationProvider.QUICKBOOKS,
        accountKey: OWNER_ACCOUNT_KEY
      }
    },
    data: {
      status: "Connected",
      lastSyncAt: syncedAt,
      notes: JSON.stringify({
        ...notes,
        kind: QUICKBOOKS_CACHE_KIND,
        description: "Read-only QuickBooks Online OAuth connection.",
        syncedAt: syncedAt.toISOString(),
        data: snapshot,
        diagnostics: {
          ...notes.diagnostics,
          lastSyncError: undefined
        }
      })
    }
  });
}

export async function recordQuickBooksSyncError(error: string | null) {
  await updateDiagnostics({ lastSyncError: error || undefined });
}
