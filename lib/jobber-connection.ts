import { IntegrationMode, IntegrationProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptCookieValue, encryptCookieValue } from "@/lib/secure-cookie";
import { getJwtExpiresAt, getJwtScopeSummary, refreshJobberToken, testJobberGraphql, type StoredJobberToken } from "@/lib/jobber";

const OWNER_ACCOUNT_KEY = "owner";
const JOBBER_CACHE_KIND = "jobber-sync-cache";
const REFRESH_WINDOW_MS = 5 * 60 * 1000;

type JobberConnectionNotes<T = unknown> = {
  kind?: string;
  description?: string;
  syncedAt?: string | null;
  data?: T | null;
  diagnostics?: {
    lastRefreshAttemptAt?: string;
    lastRefreshStatus?: "not_needed" | "success" | "failed" | "missing_refresh_token";
    lastRefreshError?: string;
    lastGraphqlStatus?: string;
    lastSyncError?: string;
    scopes?: string;
  };
};

function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required to store Jobber tokens.");
  return secret;
}

export async function saveJobberConnection(input: {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: string;
  accountId?: string;
  accountName?: string;
}) {
  const savedAt = new Date().toISOString();
  const expiresAt = input.expiresAt || getJwtExpiresAt(input.accessToken);
  const scopes = getJwtScopeSummary(input.accessToken);
  const encryptedAccessToken = await encryptCookieValue(
    {
      accessToken: input.accessToken,
      tokenType: input.tokenType,
      expiresAt,
      savedAt
    },
    authSecret()
  );
  const encryptedRefreshToken = input.refreshToken
    ? await encryptCookieValue({ refreshToken: input.refreshToken, savedAt }, authSecret())
    : null;

  const connection = await prisma.integrationConnection.upsert({
    where: {
      provider_accountKey: {
        provider: IntegrationProvider.JOBBER,
        accountKey: OWNER_ACCOUNT_KEY
      }
    },
    create: {
      provider: IntegrationProvider.JOBBER,
      accountKey: OWNER_ACCOUNT_KEY,
      mode: IntegrationMode.READ_ONLY,
      status: "Connected",
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenType: input.tokenType,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      externalAccountId: input.accountId || null,
      externalAccountName: input.accountName || "Jobber account",
      lastSyncAt: null,
      notes: JSON.stringify({
        kind: JOBBER_CACHE_KIND,
        description: "Read-only Jobber OAuth connection.",
        syncedAt: null,
        data: null,
        diagnostics: {
          lastRefreshStatus: "not_needed",
          scopes
        }
      })
    },
    update: {
      mode: IntegrationMode.READ_ONLY,
      status: "Connected",
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenType: input.tokenType,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      externalAccountId: input.accountId || null,
      externalAccountName: input.accountName || "Jobber account",
      lastSyncAt: null,
      notes: JSON.stringify({
        kind: JOBBER_CACHE_KIND,
        description: "Read-only Jobber OAuth connection.",
        syncedAt: null,
        data: null,
        diagnostics: {
          lastRefreshStatus: "not_needed",
          scopes
        }
      })
    }
  });

  console.log("[jobber:callback] database save result", {
    id: connection.id,
    provider: connection.provider,
    accountKey: connection.accountKey,
    status: connection.status,
    hasAccessToken: Boolean(connection.accessToken),
    expiresAt: connection.expiresAt?.toISOString()
  });

  return connection;
}

export async function getJobberConnectionStatus() {
  const connection = await prisma.integrationConnection.findUnique({
    where: {
      provider_accountKey: {
        provider: IntegrationProvider.JOBBER,
        accountKey: OWNER_ACCOUNT_KEY
      }
    }
  });

  const token = connection?.accessToken ? await decryptCookieValue<StoredJobberToken>(connection.accessToken, authSecret()) : null;
  const refreshToken = connection?.refreshToken
    ? await decryptCookieValue<{ refreshToken?: string; savedAt?: string }>(connection.refreshToken, authSecret())
    : null;
  const notes = parseJobberNotes(connection?.notes);
  const expiresAt = connection?.expiresAt?.toISOString() || token?.expiresAt || null;
  const tokenExpired = expiresAt ? new Date(expiresAt).getTime() <= Date.now() : null;

  const status = {
    connected: Boolean(connection?.status === "Connected" && connection.accessToken),
    hasAccessToken: Boolean(connection?.accessToken),
    hasRefreshToken: Boolean(refreshToken?.refreshToken),
    expiresAt,
    tokenExpired,
    accountName: connection?.externalAccountName || undefined,
    accountId: connection?.externalAccountId || undefined,
    connectedAt: connection?.updatedAt.toISOString(),
    lastSyncAt: connection?.lastSyncAt?.toISOString(),
    syncStale: !connection?.lastSyncAt || Date.now() - connection.lastSyncAt.getTime() > 15 * 60 * 1000,
    refreshStatus: notes.diagnostics?.lastRefreshStatus || "not_needed",
    lastRefreshAttemptAt: notes.diagnostics?.lastRefreshAttemptAt || null,
    lastRefreshError: notes.diagnostics?.lastRefreshError || null,
    lastGraphqlStatus: notes.diagnostics?.lastGraphqlStatus || null,
    lastSyncError: notes.diagnostics?.lastSyncError || null,
    scopes: notes.diagnostics?.scopes || getJwtScopeSummary(token?.accessToken) || null,
    apiHealthy: !notes.diagnostics?.lastGraphqlStatus?.includes("401") && !notes.diagnostics?.lastSyncError?.includes("401")
  };

  console.log("[jobber:status] dashboard status fetch", status);

  return status;
}

export async function getStoredJobberAccessToken() {
  return getValidJobberAccessToken();
}

function parseJobberNotes<T = unknown>(raw?: string | null): JobberConnectionNotes<T> {
  if (!raw) return { kind: JOBBER_CACHE_KIND, data: null, syncedAt: null };
  try {
    return JSON.parse(raw) as JobberConnectionNotes<T>;
  } catch {
    return { kind: JOBBER_CACHE_KIND, data: null, syncedAt: null };
  }
}

async function updateJobberDiagnostics(diagnostics: NonNullable<JobberConnectionNotes["diagnostics"]>) {
  const connection = await prisma.integrationConnection.findUnique({
    where: {
      provider_accountKey: {
        provider: IntegrationProvider.JOBBER,
        accountKey: OWNER_ACCOUNT_KEY
      }
    }
  });
  if (!connection) return;

  const notes = parseJobberNotes(connection.notes);
  await prisma.integrationConnection.update({
    where: {
      provider_accountKey: {
        provider: IntegrationProvider.JOBBER,
        accountKey: OWNER_ACCOUNT_KEY
      }
    },
    data: {
      notes: JSON.stringify({
        ...notes,
        kind: JOBBER_CACHE_KIND,
        diagnostics: {
          ...notes.diagnostics,
          ...diagnostics
        }
      })
    }
  });
}

export async function recordJobberGraphqlStatus(status: string) {
  await updateJobberDiagnostics({ lastGraphqlStatus: status });
}

export async function recordJobberSyncError(error: string | null) {
  await updateJobberDiagnostics({ lastSyncError: error || undefined });
}

export async function markJobberNeedsReauthorization(reason: string) {
  await prisma.integrationConnection.update({
    where: {
      provider_accountKey: {
        provider: IntegrationProvider.JOBBER,
        accountKey: OWNER_ACCOUNT_KEY
      }
    },
    data: {
      status: "Needs reauthorization"
    }
  });
  await updateJobberDiagnostics({
    lastGraphqlStatus: "needs_reauthorization",
    lastSyncError: reason
  });
}

export async function markJobberApiHealthy() {
  await prisma.integrationConnection.update({
    where: {
      provider_accountKey: {
        provider: IntegrationProvider.JOBBER,
        accountKey: OWNER_ACCOUNT_KEY
      }
    },
    data: {
      status: "Connected"
    }
  });
}

export async function saveJobberAccountInfo(input: { accountId?: string; accountName?: string }) {
  if (!input.accountId && !input.accountName) return;

  await prisma.integrationConnection.update({
    where: {
      provider_accountKey: {
        provider: IntegrationProvider.JOBBER,
        accountKey: OWNER_ACCOUNT_KEY
      }
    },
    data: {
      externalAccountId: input.accountId || undefined,
      externalAccountName: input.accountName || undefined
    }
  });
}

export async function getValidJobberAccessToken(options: { forceRefresh?: boolean } = {}) {
  const connection = await prisma.integrationConnection.findUnique({
    where: {
      provider_accountKey: {
        provider: IntegrationProvider.JOBBER,
        accountKey: OWNER_ACCOUNT_KEY
      }
    }
  });

  if (!connection?.accessToken) return null;

  const token = await decryptCookieValue<StoredJobberToken>(connection.accessToken, authSecret());
  if (!token?.accessToken) return null;

  const refreshRecord = connection.refreshToken
    ? await decryptCookieValue<{ refreshToken?: string; savedAt?: string }>(connection.refreshToken, authSecret())
    : null;
  const expiresAt = connection.expiresAt?.toISOString() || token.expiresAt;
  const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : 0;
  const shouldRefresh = options.forceRefresh || !expiresAtMs || expiresAtMs - Date.now() <= REFRESH_WINDOW_MS;

  if (!shouldRefresh) {
    await updateJobberDiagnostics({
      lastRefreshStatus: "not_needed",
      lastRefreshAttemptAt: new Date().toISOString()
    });
    return token.accessToken;
  }

  if (!refreshRecord?.refreshToken) {
    await updateJobberDiagnostics({
      lastRefreshStatus: "missing_refresh_token",
      lastRefreshAttemptAt: new Date().toISOString(),
      lastRefreshError: "No refresh token is saved. Reconnect Jobber."
    });
    return token.accessToken;
  }

  const attemptedAt = new Date().toISOString();
  try {
    const refreshed = await refreshJobberToken(refreshRecord.refreshToken);
    const savedAt = new Date();
    const refreshedExpiresAt = refreshed.expires_in
      ? new Date(savedAt.getTime() + refreshed.expires_in * 1000).toISOString()
      : getJwtExpiresAt(refreshed.access_token);
    const encryptedAccessToken = await encryptCookieValue(
      {
        accessToken: refreshed.access_token,
        tokenType: refreshed.token_type || token.tokenType,
        expiresAt: refreshedExpiresAt,
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
    const notes = parseJobberNotes(connection.notes);

    await prisma.integrationConnection.update({
      where: {
        provider_accountKey: {
          provider: IntegrationProvider.JOBBER,
          accountKey: OWNER_ACCOUNT_KEY
        }
      },
      data: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenType: refreshed.token_type || token.tokenType,
        expiresAt: refreshedExpiresAt ? new Date(refreshedExpiresAt) : connection.expiresAt,
        notes: JSON.stringify({
          ...notes,
          kind: JOBBER_CACHE_KIND,
          diagnostics: {
            ...notes.diagnostics,
            lastRefreshAttemptAt: attemptedAt,
            lastRefreshStatus: "success",
            lastRefreshError: undefined,
            scopes: getJwtScopeSummary(refreshed.access_token) || notes.diagnostics?.scopes
          }
        })
      }
    });

    console.log("[jobber:token] refreshed access token", {
      expiresAt: refreshedExpiresAt,
      hasRotatedRefreshToken: Boolean(refreshed.refresh_token)
    });
    return refreshed.access_token;
  } catch (error) {
    await updateJobberDiagnostics({
      lastRefreshAttemptAt: attemptedAt,
      lastRefreshStatus: "failed",
      lastRefreshError: error instanceof Error ? error.message : String(error)
    });
    console.error("[jobber:token] refresh failed", error);
    if (options.forceRefresh || !expiresAtMs || expiresAtMs <= Date.now()) {
      throw error;
    }
    return token.accessToken;
  }
}

export async function testStoredJobberGraphql(options: { forceRefresh?: boolean } = {}) {
  const token = await getValidJobberAccessToken({ forceRefresh: options.forceRefresh });
  if (!token) {
    await recordJobberGraphqlStatus("missing_token");
    return { ok: false, status: 0, version: null, body: "No saved Jobber access token." };
  }

  let result = await testJobberGraphql(token);

  if (result.status === 401 && !options.forceRefresh) {
    try {
      const refreshedToken = await getValidJobberAccessToken({ forceRefresh: true });
      if (refreshedToken) {
        result = await testJobberGraphql(refreshedToken);
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await markJobberNeedsReauthorization(`Refresh failed after Jobber GraphQL 401: ${reason}`);
      return {
        ok: false,
        status: 401,
        version: result.version,
        body: `GraphQL returned 401 and refresh failed. ${reason}`
      };
    }
  }

  await recordJobberGraphqlStatus(String(result.status));

  if (result.ok) {
    await markJobberApiHealthy();
    await recordJobberSyncError(null);
  } else if (result.status === 401) {
    await markJobberNeedsReauthorization(`Jobber GraphQL account test returned 401. Response: ${result.body || "No response body."}`);
  }

  return result;
}

export async function getCachedJobberSnapshot<T>() {
  const connection = await prisma.integrationConnection.findUnique({
    where: {
      provider_accountKey: {
        provider: IntegrationProvider.JOBBER,
        accountKey: OWNER_ACCOUNT_KEY
      }
    }
  });

  if (!connection?.notes) return null;

  try {
    const parsed = parseJobberNotes<T>(connection.notes);
    if (parsed.kind !== JOBBER_CACHE_KIND || !parsed.data) return null;
    return {
      data: parsed.data,
      syncedAt: parsed.syncedAt || connection.lastSyncAt?.toISOString() || null,
      stale: !connection.lastSyncAt || Date.now() - connection.lastSyncAt.getTime() > 15 * 60 * 1000
    };
  } catch {
    return null;
  }
}

export async function markJobberSynced(snapshot?: unknown) {
  const syncedAt = new Date();
  const connection = await prisma.integrationConnection.findUnique({
    where: {
      provider_accountKey: {
        provider: IntegrationProvider.JOBBER,
        accountKey: OWNER_ACCOUNT_KEY
      }
    }
  });
  const notes = parseJobberNotes(connection?.notes);

  await prisma.integrationConnection.update({
    where: {
      provider_accountKey: {
        provider: IntegrationProvider.JOBBER,
        accountKey: OWNER_ACCOUNT_KEY
      }
    },
    data: {
      lastSyncAt: syncedAt,
      notes: snapshot
        ? JSON.stringify({
            ...notes,
            kind: JOBBER_CACHE_KIND,
            description: "Read-only Jobber OAuth connection.",
            syncedAt: syncedAt.toISOString(),
            data: snapshot
          })
        : undefined
    }
  });
}
