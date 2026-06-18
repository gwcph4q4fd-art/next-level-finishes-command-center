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
