import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildQuickBooksAuthorizeUrl, getQuickBooksConfig } from "@/lib/quickbooks";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const config = getQuickBooksConfig();

  if (!config.isConfigured) {
    console.error("[quickbooks:connect] missing OAuth configuration", {
      hasClientId: Boolean(config.clientId),
      hasClientSecret: Boolean(config.clientSecret),
      redirectUri: config.redirectUri,
      environment: config.environment
    });
    return NextResponse.redirect(
      new URL(
        `/integrations?quickbooks=missing-config&redirect_uri=${encodeURIComponent(config.redirectUri)}`,
        request.url
      ),
      302
    );
  }

  const stateBytes = crypto.getRandomValues(new Uint8Array(24));
  const state = Buffer.from(stateBytes).toString("base64url");

  cookies().set("quickbooks_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60
  });

  const authorizationUrl = buildQuickBooksAuthorizeUrl(state);
  console.log("[quickbooks:connect] redirecting to Intuit authorization", {
    redirectUri: config.redirectUri,
    environment: config.environment
  });

  return NextResponse.redirect(authorizationUrl, 302);
}
