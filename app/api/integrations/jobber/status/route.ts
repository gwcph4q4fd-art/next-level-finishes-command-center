import { NextResponse } from "next/server";
import { getJobberConnectionStatus } from "@/lib/jobber-connection";
import { getJobberConfig, getJobberRedirectUri } from "@/lib/jobber";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const status = await getJobberConnectionStatus();

  return NextResponse.json({
    ...status,
    tokenSaved: status.hasAccessToken,
    tokenExpiresAt: status.expiresAt,
    configured: getJobberConfig().isConfigured,
    redirectUri: getJobberRedirectUri(),
    safety: "Read-only OAuth setup. No Jobber create/edit/delete routes are implemented."
  });
}
