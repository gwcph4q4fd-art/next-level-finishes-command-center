import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { saveJobberConnection } from "@/lib/jobber-connection";
import { exchangeJobberCode, fetchJobberAccount } from "@/lib/jobber";

export const dynamic = "force-dynamic";

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
    console.log("[jobber:callback] OAuth code exchange succeeded", {
      hasAccessToken: Boolean(token.access_token),
      hasRefreshToken: Boolean(token.refresh_token),
      expiresIn: token.expires_in
    });

    let account: { id?: string; name?: string } = {};

    try {
      account = await fetchJobberAccount(token.access_token);
    } catch {
      account = {};
    }

    const savedAt = new Date();
    const expiresAt = token.expires_in ? new Date(savedAt.getTime() + token.expires_in * 1000).toISOString() : undefined;
    await saveJobberConnection({
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenType: token.token_type,
      expiresAt,
      accountId: account.id,
      accountName: account.name
    });

    cookies().delete("jobber_oauth_state");
    return NextResponse.redirect(new URL("/integrations?jobber=connected", request.url));
  } catch (error) {
    console.error("[jobber:callback] OAuth callback failed", error);
    return NextResponse.redirect(
      new URL(`/integrations?jobber=error&message=${encodeURIComponent(String(error))}`, request.url)
    );
  }
}
