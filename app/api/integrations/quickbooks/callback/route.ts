import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { saveQuickBooksConnection, testStoredQuickBooksApi } from "@/lib/quickbooks-connection";
import { exchangeQuickBooksCode, getQuickBooksConfig } from "@/lib/quickbooks";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const realmId = url.searchParams.get("realmId");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const expectedState = cookies().get("quickbooks_oauth_state")?.value;
  const config = getQuickBooksConfig();

  if (error) {
    const message = [error, errorDescription].filter(Boolean).join(": ");
    console.error("[quickbooks:callback] Intuit returned OAuth error", {
      error,
      errorDescription,
      redirectUri: config.redirectUri,
      environment: config.environment
    });
    return NextResponse.redirect(new URL(`/integrations?quickbooks=error&message=${encodeURIComponent(message)}`, request.url));
  }

  if (!code || !state || !expectedState || state !== expectedState || !realmId) {
    const reason = !code
      ? "Missing authorization code from Intuit."
      : !state
        ? "Missing OAuth state from Intuit."
        : !expectedState
          ? "Missing saved OAuth state cookie. Start the QuickBooks connection again from the same browser."
          : state !== expectedState
            ? "OAuth state mismatch. Start the QuickBooks connection again."
            : "Missing QuickBooks realmId/company id from Intuit.";
    console.error("[quickbooks:callback] OAuth state/callback validation failed", {
      reason,
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasExpectedState: Boolean(expectedState),
      stateMatches: Boolean(state && expectedState && state === expectedState),
      hasRealmId: Boolean(realmId),
      redirectUri: config.redirectUri
    });
    return NextResponse.redirect(
      new URL(`/integrations?quickbooks=state-error&message=${encodeURIComponent(reason)}`, request.url)
    );
  }

  try {
    console.log("[quickbooks:callback] exchanging OAuth code", {
      realmId,
      redirectUri: config.redirectUri,
      environment: config.environment
    });
    const token = await exchangeQuickBooksCode(code);
    console.log("[quickbooks:callback] OAuth code exchange succeeded", {
      realmId,
      hasAccessToken: Boolean(token.access_token),
      hasRefreshToken: Boolean(token.refresh_token),
      expiresIn: token.expires_in
    });

    await saveQuickBooksConnection({
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenType: token.token_type,
      expiresIn: token.expires_in,
      realmId
    });

    const test = await testStoredQuickBooksApi();
    cookies().delete("quickbooks_oauth_state");

    if (!test.ok) {
      console.error("[quickbooks:callback] API test failed after token save", {
        status: test.status,
        body: test.body,
        realmId,
        redirectUri: config.redirectUri
      });
    }

    return NextResponse.redirect(
      new URL(
        `/integrations?quickbooks=${test.ok ? "connected" : "api-error"}&status=${test.status}${test.ok ? "" : `&message=${encodeURIComponent(test.body || "QuickBooks API test failed after authorization.")}`}`,
        request.url
      )
    );
  } catch (callbackError) {
    const message = callbackError instanceof Error ? callbackError.message : String(callbackError);
    console.error("[quickbooks:callback] OAuth callback failed", {
      message,
      realmId,
      redirectUri: config.redirectUri,
      environment: config.environment
    });
    return NextResponse.redirect(
      new URL(`/integrations?quickbooks=error&message=${encodeURIComponent(message)}`, request.url)
    );
  }
}
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { encryptCookieValue } from "@/lib/secure-cookie";

export const dynamic = "force-dynamic";

const baseUrl = "https://next-level-finishes-command-center.vercel.app";
const redirectUri = baseUrl + "/api/integrations/quickbooks/callback";

function authSecret() {
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("AUTH_SECRET is required to store QuickBooks tokens.");
    return secret;
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const realmId = url.searchParams.get("realmId");
    const expectedState = cookies().get("quickbooks_oauth_state")?.value;

  if (!code || !state || !expectedState || state !== expectedState || !realmId) {
        return Response.redirect(baseUrl + "/integrations?quickbooks=state-error", 302);
  }

  const clientId = process.env.QUICKBOOKS_CLIENT_ID || "";
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET || "";
    const body = new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri
    });

  const tokenResponse = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
        method: "POST",
        headers: {
                Authorization: "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
                Accept: "application/json",
                "Content-Type": "application/x-www-form-urlencoded"
        },
        body
  });

  if (!tokenResponse.ok) {
        const text = await tokenResponse.text().catch(() => "");
        return Response.redirect(baseUrl + "/integrations?quickbooks=token-error&status=" + tokenResponse.status + "&message=" + encodeURIComponent(text.slice(0, 200)), 302);
  }

  const token = await tokenResponse.json();
    const savedAt = new Date();
    const expiresAt = token.expires_in ? new Date(savedAt.getTime() + token.expires_in * 1000) : null;
    const encryptedAccessToken = await encryptCookieValue({
          accessToken: token.access_token,
          tokenType: token.token_type,
          expiresAt: expiresAt?.toISOString(),
          savedAt: savedAt.toISOString()
    }, authSecret());
    const encryptedRefreshToken = token.refresh_token ? await encryptCookieValue({
          refreshToken: token.refresh_token,
          savedAt: savedAt.toISOString()
    }, authSecret()) : null;

  await prisma.integrationConnection.upsert({
        where: { provider_accountKey: { provider: "QUICKBOOKS", accountKey: "owner" } },
        create: {
                provider: "QUICKBOOKS",
                accountKey: "owner",
                mode: "READ_ONLY",
                status: "Connected",
                accessToken: encryptedAccessToken,
                refreshToken: encryptedRefreshToken,
                tokenType: token.token_type,
                expiresAt,
                externalAccountId: realmId,
                externalAccountName: "QuickBooks company",
                notes: JSON.stringify({ kind: "quickbooks-sync-cache", description: "Read-only QuickBooks Online OAuth connection." })
        },
        update: {
                mode: "READ_ONLY",
                status: "Connected",
                accessToken: encryptedAccessToken,
                refreshToken: encryptedRefreshToken,
                tokenType: token.token_type,
                expiresAt,
                externalAccountId: realmId,
                externalAccountName: "QuickBooks company"
        }
  });

  cookies().delete("quickbooks_oauth_state");
    return Response.redirect(baseUrl + "/integrations?quickbooks=connected", 302);
}
