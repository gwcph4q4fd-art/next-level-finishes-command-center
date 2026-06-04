import { NextResponse } from "next/server";
import { getJobberConnectionStatus } from "@/lib/jobber-connection";
import { getJobberConfig, getJobberRedirectUri } from "@/lib/jobber";
import { getJobberCommandCenterSnapshot } from "@/lib/jobber-sync";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const status = await getJobberConnectionStatus();
  const snapshot = await getJobberCommandCenterSnapshot();

  return NextResponse.json({
    ...status,
    hasCachedData: Boolean(snapshot?.data),
    cacheSyncedAt: snapshot?.syncedAt || null,
    cacheStale: snapshot?.stale ?? true,
    tokenSaved: status.hasAccessToken,
    tokenExpiresAt: status.expiresAt,
    configured: getJobberConfig().isConfigured,
    redirectUri: getJobberRedirectUri(),
    safety: "Read-only OAuth setup. No Jobber create/edit/delete routes are implemented."
  });
}
