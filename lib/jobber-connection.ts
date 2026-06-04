import { IntegrationMode, IntegrationProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptCookieValue, encryptCookieValue } from "@/lib/secure-cookie";
import type { StoredJobberToken } from "@/lib/jobber";

const OWNER_ACCOUNT_KEY = "owner";
const JOBBER_CACHE_KIND = "jobber-sync-cache";

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
  const encryptedAccessToken = await encryptCookieValue(
    {
      accessToken: input.accessToken,
      tokenType: input.tokenType,
      expiresAt: input.expiresAt,
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
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      externalAccountId: input.accountId || null,
      externalAccountName: input.accountName || "Jobber account",
      lastSyncAt: new Date(),
      notes: JSON.stringify({
        kind: JOBBER_CACHE_KIND,
        description: "Read-only Jobber OAuth connection.",
        syncedAt: null,
        data: null
      })
    },
    update: {
      mode: IntegrationMode.READ_ONLY,
      status: "Connected",
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenType: input.tokenType,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      externalAccountId: input.accountId || null,
      externalAccountName: input.accountName || "Jobber account",
      lastSyncAt: new Date(),
      notes: JSON.stringify({
        kind: JOBBER_CACHE_KIND,
        description: "Read-only Jobber OAuth connection.",
        syncedAt: null,
        data: null
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

  const status = {
    connected: Boolean(connection?.status === "Connected" && connection.accessToken),
    hasAccessToken: Boolean(connection?.accessToken),
    expiresAt: connection?.expiresAt?.toISOString() || null,
    accountName: connection?.externalAccountName || undefined,
    accountId: connection?.externalAccountId || undefined,
    connectedAt: connection?.updatedAt.toISOString(),
    lastSyncAt: connection?.lastSyncAt?.toISOString(),
    syncStale: !connection?.lastSyncAt || Date.now() - connection.lastSyncAt.getTime() > 15 * 60 * 1000
  };

  console.log("[jobber:status] dashboard status fetch", status);

  return status;
}

export async function getStoredJobberAccessToken() {
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
  return token?.accessToken || null;
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
    const parsed = JSON.parse(connection.notes) as { kind?: string; data?: T; syncedAt?: string | null };
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
            kind: JOBBER_CACHE_KIND,
            description: "Read-only Jobber OAuth connection.",
            syncedAt: syncedAt.toISOString(),
            data: snapshot
          })
        : undefined
    }
  });
}
