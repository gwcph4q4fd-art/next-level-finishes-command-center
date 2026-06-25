const QUICKBOOKS_AUTHORIZE_URL = "https://appcenter.intuit.com/connect/oauth2";
const QUICKBOOKS_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const QUICKBOOKS_API_BASE_URL = "https://quickbooks.api.intuit.com/v3/company";
const QUICKBOOKS_SCOPE = "com.intuit.quickbooks.accounting";
const QUICKBOOKS_MINOR_VERSION = "75";
const DEFAULT_QUICKBOOKS_REDIRECT_URI = "https://next-level-finishes-command-center.vercel.app/api/integrations/quickbooks/callback";

export type QuickBooksTokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  x_refresh_token_expires_in?: number;
};

export type StoredQuickBooksToken = {
  accessToken: string;
  tokenType?: string;
  expiresAt?: string;
  savedAt: string;
};

export function getQuickBooksRedirectUri() {
  return (process.env.QUICKBOOKS_REDIRECT_URI || DEFAULT_QUICKBOOKS_REDIRECT_URI).trim();
}

export function getQuickBooksConfig() {
  const redirectUri = getQuickBooksRedirectUri();
  const environment = (process.env.QUICKBOOKS_ENVIRONMENT || "sandbox").trim().toLowerCase();

  return {
    clientId: process.env.QUICKBOOKS_CLIENT_ID || "",
    clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || "",
    redirectUri,
    environment,
    isConfigured: Boolean(process.env.QUICKBOOKS_CLIENT_ID && process.env.QUICKBOOKS_CLIENT_SECRET && redirectUri),
    scope: QUICKBOOKS_SCOPE,
    minorVersion: QUICKBOOKS_MINOR_VERSION
  };
}

function clientAuthHeader() {
  const { clientId, clientSecret } = getQuickBooksConfig();
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export function buildQuickBooksAuthorizeUrl(state: string) {
  const { clientId, redirectUri } = getQuickBooksConfig();
  const url = new URL(QUICKBOOKS_AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", QUICKBOOKS_SCOPE);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeQuickBooksCode(code: string) {
  const { redirectUri } = getQuickBooksConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri
  });

  console.log("[quickbooks:oauth] exchanging code", { redirectUri });

  const response = await fetch(QUICKBOOKS_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: clientAuthHeader(),
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("[quickbooks:oauth] token exchange failed", {
      status: response.status,
      redirectUri,
      body: text.slice(0, 1000)
    });
    throw new Error(`QuickBooks token exchange failed with status ${response.status}${text ? `: ${text.slice(0, 500)}` : ""}`);
  }

  return (await response.json()) as QuickBooksTokenResponse;
}

export async function refreshQuickBooksToken(refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });

  const response = await fetch(QUICKBOOKS_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: clientAuthHeader(),
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`QuickBooks token refresh failed with status ${response.status}${text ? `: ${text.slice(0, 500)}` : ""}`);
  }

  return (await response.json()) as QuickBooksTokenResponse;
}

export async function quickBooksGet<T>(accessToken: string, realmId: string, path: string, params?: Record<string, string>) {
  const url = new URL(`${QUICKBOOKS_API_BASE_URL}/${encodeURIComponent(realmId)}${path}`);
  url.searchParams.set("minorversion", QUICKBOOKS_MINOR_VERSION);
  Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    },
    cache: "no-store"
  });
  const text = await response.text().catch(() => "");

  if (!response.ok) {
    throw new Error(`QuickBooks API request failed with status ${response.status}${text ? `: ${text.slice(0, 500)}` : ""}`);
  }

  return text ? (JSON.parse(text) as T) : ({} as T);
}

export async function quickBooksQuery<T>(accessToken: string, realmId: string, query: string) {
  return quickBooksGet<T>(accessToken, realmId, "/query", { query });
}

export async function testQuickBooksApi(accessToken: string, realmId: string) {
  try {
    const body = await quickBooksGet<{ CompanyInfo?: { CompanyName?: string; Id?: string } }>(
      accessToken,
      realmId,
      `/companyinfo/${encodeURIComponent(realmId)}`
    );
    return {
      ok: true,
      status: 200,
      body: JSON.stringify(body).slice(0, 1000),
      companyName: body.CompanyInfo?.CompanyName,
      companyId: body.CompanyInfo?.Id || realmId
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const match = message.match(/status (\d+)/);
    return {
      ok: false,
      status: match?.[1] ? Number(match[1]) : 0,
      body: message.slice(0, 1000),
      companyName: undefined,
      companyId: realmId
    };
  }
}
