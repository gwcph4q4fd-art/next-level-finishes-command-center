import { NextResponse } from "next/server";
import { getJobberConnectionStatus, testStoredJobberGraphql } from "@/lib/jobber-connection";
import { getJobberConfig, getJobberRedirectUri, JOBBER_GRAPHQL_VERSION } from "@/lib/jobber";
import { getJobberCommandCenterSnapshot } from "@/lib/jobber-sync";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getJobberConnectionStatus();
  const snapshot = await getJobberCommandCenterSnapshot();
  const sample = await testStoredJobberGraphql().catch((error) => ({
    ok: false,
    status: 0,
    version: JOBBER_GRAPHQL_VERSION,
    body: error instanceof Error ? error.message : String(error)
  }));

  return NextResponse.json({
    status,
    config: {
      configured: getJobberConfig().isConfigured,
      redirectUri: getJobberRedirectUri(),
      graphqlVersion: JOBBER_GRAPHQL_VERSION
    },
    snapshot: {
      hasData: Boolean(snapshot?.data),
      syncedAt: snapshot?.syncedAt || null,
      stale: snapshot?.stale ?? true
    },
    sampleGraphql: sample
  });
}
