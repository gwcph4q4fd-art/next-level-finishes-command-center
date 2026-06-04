const JOBBER_AUTHORIZE_URL = "https://api.getjobber.com/api/oauth/authorize";
const JOBBER_TOKEN_URL = "https://api.getjobber.com/api/oauth/token";
const JOBBER_GRAPHQL_URL = "https://api.getjobber.com/api/graphql";
const JOBBER_OAUTH_BASE_URL = "https://next-level-finishes-command-center.vercel.app";
export const JOBBER_GRAPHQL_VERSION = "2025-04-16";

export type JobberTokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  warning?: string;
};

export type StoredJobberToken = {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: string;
  savedAt: string;
};

export type JobberConnection = {
  connected: boolean;
  accountName?: string;
  accountId?: string;
  connectedAt?: string;
};

export const JOBBER_CONNECTION_COOKIE = "jobber_connection";
export const JOBBER_TOKEN_COOKIE = "jobber_token";

function getJobberBaseUrl() {
  return JOBBER_OAUTH_BASE_URL;
}

export function getJobberRedirectUri() {
  return `${getJobberBaseUrl()}/api/integrations/jobber/callback`;
}

export function getJobberConfig() {
  return {
    clientId: process.env.JOBBER_CLIENT_ID || "",
    clientSecret: process.env.JOBBER_CLIENT_SECRET || "",
    isConfigured: Boolean(process.env.JOBBER_CLIENT_ID && process.env.JOBBER_CLIENT_SECRET)
  };
}

export function buildJobberAuthorizeUrl(state: string) {
  const { clientId } = getJobberConfig();
  const url = new URL(JOBBER_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", getJobberRedirectUri());
  url.searchParams.set("state", state);
  return url.toString();
}

export function getJwtExpiresAt(accessToken?: string | null) {
  if (!accessToken) return undefined;

  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return undefined;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as { exp?: number; scope?: string; scp?: string[] };
    return decoded.exp ? new Date(decoded.exp * 1000).toISOString() : undefined;
  } catch {
    return undefined;
  }
}

export function getJwtScopeSummary(accessToken?: string | null) {
  if (!accessToken) return undefined;

  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return undefined;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as { scope?: string; scp?: string[] };
    return decoded.scope || decoded.scp?.join(" ");
  } catch {
    return undefined;
  }
}

export async function exchangeJobberCode(code: string, request: Request) {
  const { clientId, clientSecret } = getJobberConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: getJobberRedirectUri()
  });

  const response = await fetch(JOBBER_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    throw new Error(`Jobber token exchange failed with status ${response.status}`);
  }

  return (await response.json()) as JobberTokenResponse;
}

export async function refreshJobberToken(refreshToken: string) {
  const { clientId, clientSecret } = getJobberConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });

  const response = await fetch(JOBBER_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Jobber token refresh failed with status ${response.status}${text ? `: ${text}` : ""}`);
  }

  return (await response.json()) as JobberTokenResponse;
}

export async function fetchJobberAccount(accessToken: string) {
  const data = await jobberGraphql<{ account?: { id?: string; name?: string } }>(
    accessToken,
    `query AccountStatus { account { id name } }`
  );

  return {
    id: data?.account?.id,
    name: data?.account?.name
  };
}

export async function jobberGraphql<T>(accessToken: string, query: string, variables?: Record<string, unknown>) {
  const response = await fetch(JOBBER_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-JOBBER-GRAPHQL-VERSION": JOBBER_GRAPHQL_VERSION
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Jobber GraphQL request failed with status ${response.status}${text ? `: ${text.slice(0, 300)}` : ""}`);
  }

  const data = await response.json();
  if (data.errors?.length) {
    throw new Error(data.errors.map((error: { message?: string }) => error.message).filter(Boolean).join("; "));
  }

  return data.data as T;
}

export async function testJobberGraphql(accessToken: string) {
  const response = await fetch(JOBBER_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-JOBBER-GRAPHQL-VERSION": JOBBER_GRAPHQL_VERSION
    },
    body: JSON.stringify({ query: "query JobberAdminTest { account { id name } }" })
  });
  const body = await response.text().catch(() => "");

  return {
    ok: response.ok,
    status: response.status,
    version: JOBBER_GRAPHQL_VERSION,
    body: body.slice(0, 1000)
  };
}
