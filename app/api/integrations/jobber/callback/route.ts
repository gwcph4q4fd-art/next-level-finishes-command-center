import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { encryptCookieValue } from "@/lib/secure-cookie";
import {
  exchangeJobberCode,
  fetchJobberAccount,
  JOBBER_CONNECTION_COOKIE,
  JOBBER_TOKEN_COOKIE
} from "@/lib/jobber";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = cookies().get("jobber_oauth_state")?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/integrations?jobber=state-error", request.url));
  }

  try {
    const token = await exchangeJobberCode(code, request);
    let account: { id?: string; name?: string } = {};

    try {
      account = await fetchJobberAccount(token.access_token);
    } catch {
      account = {};
    }

    const savedAt = new Date();
    const expiresAt = token.expires_in ? new Date(savedAt.getTime() + token.expires_in * 1000).toISOString() : undefined;
    const encryptedToken = await encryptCookieValue(
      {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        tokenType: token.token_type,
        expiresAt,
        savedAt: savedAt.toISOString()
      },
      process.env.AUTH_SECRET || ""
    );

    cookies().set(
      JOBBER_TOKEN_COOKIE,
      encryptedToken,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30
      }
    );

    cookies().set(
      JOBBER_CONNECTION_COOKIE,
      JSON.stringify({
        connected: true,
        accountName: account.name || "Jobber account",
        accountId: account.id || "",
        connectedAt: savedAt.toISOString()
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30
      }
    );
    cookies().delete("jobber_oauth_state");
    return NextResponse.redirect(new URL("/integrations?jobber=connected", request.url));
  } catch (error) {
    return NextResponse.redirect(
      new URL(`/integrations?jobber=error&message=${encodeURIComponent(String(error))}`, request.url)
    );
  }
}
