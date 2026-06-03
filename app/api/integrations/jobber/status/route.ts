import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { decryptCookieValue } from "@/lib/secure-cookie";
import {
  getJobberConfig,
  getJobberRedirectUri,
  JOBBER_CONNECTION_COOKIE,
  JOBBER_TOKEN_COOKIE,
  type JobberConnection,
  type StoredJobberToken
} from "@/lib/jobber";

export async function GET(request: Request) {
  const raw = cookies().get(JOBBER_CONNECTION_COOKIE)?.value;
  const rawToken = cookies().get(JOBBER_TOKEN_COOKIE)?.value;
  let connection: JobberConnection = { connected: false };
  let storedToken: StoredJobberToken | null = null;

  if (raw) {
    try {
      connection = JSON.parse(raw) as JobberConnection;
    } catch {
      connection = { connected: false };
    }
  }

  if (rawToken && process.env.AUTH_SECRET) {
    storedToken = await decryptCookieValue<StoredJobberToken>(rawToken, process.env.AUTH_SECRET);
  }

  return NextResponse.json({
    ...connection,
    connected: Boolean(connection.connected && storedToken?.accessToken),
    tokenSaved: Boolean(storedToken?.accessToken),
    tokenExpiresAt: storedToken?.expiresAt,
    configured: getJobberConfig().isConfigured,
    redirectUri: getJobberRedirectUri(),
    safety: "Read-only OAuth setup. No Jobber create/edit/delete routes are implemented."
  });
}
