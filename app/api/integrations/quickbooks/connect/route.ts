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
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const baseUrl = "https://next-level-finishes-command-center.vercel.app";
const redirectUri = baseUrl + "/api/integrations/quickbooks/callback";

export async function GET() {
    const clientId = process.env.QUICKBOOKS_CLIENT_ID;
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
        return Response.redirect(baseUrl + "/integrations?quickbooks=missing-config", 302);
  }

  const state = crypto.randomUUID();
    cookies().set("quickbooks_oauth_state", state, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          maxAge: 600
    });

  const url = new URL("https://appcenter.intuit.com/connect/oauth2");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "com.intuit.quickbooks.accounting");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);

  return Response.redirect(url.toString(), 302);
}
