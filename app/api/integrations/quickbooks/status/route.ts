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
