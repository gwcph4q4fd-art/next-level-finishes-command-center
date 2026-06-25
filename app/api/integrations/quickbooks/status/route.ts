import { NextResponse } from "next/server";
import { getQuickBooksConnectionStatus, testStoredQuickBooksApi } from "@/lib/quickbooks-connection";
import { getQuickBooksConfig } from "@/lib/quickbooks";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getQuickBooksConnectionStatus();
  const sampleApi = status.hasAccessToken && status.realmId ? await testStoredQuickBooksApi() : null;
  const config = getQuickBooksConfig();

  return NextResponse.json({
    ...status,
    connected: Boolean(status.connected && sampleApi?.ok),
    configured: config.isConfigured,
    hasClientId: Boolean(config.clientId),
    hasClientSecret: Boolean(config.clientSecret),
    environment: config.environment,
    redirectUri: config.redirectUri,
    sampleApi
  });
}
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const redirectUri = "https://next-level-finishes-command-center.vercel.app/api/integrations/quickbooks/callback";

export async function GET() {
    const configured = Boolean(process.env.QUICKBOOKS_CLIENT_ID && process.env.QUICKBOOKS_CLIENT_SECRET);
    const connection = await prisma.integrationConnection.findUnique({
          where: {
                  provider_accountKey: {
                            provider: "QUICKBOOKS",
                            accountKey: "owner"
                  }
          }
    });

  return Response.json({
        configured,
        connected: Boolean(connection?.accessToken && connection?.externalAccountId),
        hasAccessToken: Boolean(connection?.accessToken),
        hasRefreshToken: Boolean(connection?.refreshToken),
        expiresAt: connection?.expiresAt?.toISOString() || null,
        companyName: connection?.externalAccountName || null,
        realmId: connection?.externalAccountId || null,
        lastSyncAt: connection?.lastSyncAt?.toISOString() || null,
        status: connection?.status || "Not connected",
        redirectUri
  });
}
