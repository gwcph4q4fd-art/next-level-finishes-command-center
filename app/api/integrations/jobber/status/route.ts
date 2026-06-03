import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getJobberConfig, getJobberRedirectUri, type JobberConnection } from "@/lib/jobber";

export async function GET(request: Request) {
  const raw = cookies().get("jobber_connection")?.value;
  let connection: JobberConnection = { connected: false };

  if (raw) {
    try {
      connection = JSON.parse(raw) as JobberConnection;
    } catch {
      connection = { connected: false };
    }
  }

  return NextResponse.json({
    ...connection,
    configured: getJobberConfig().isConfigured,
    redirectUri: getJobberRedirectUri(request),
    safety: "Read-only OAuth setup. No Jobber create/edit/delete routes are implemented."
  });
}

