const JOBBER_AUTHORIZE_URL = "https://api.getjobber.com/api/oauth/authorize";
const JOBBER_TOKEN_URL = "https://api.getjobber.com/api/oauth/token";
const JOBBER_GRAPHQL_URL = "https://api.getjobber.com/api/graphql";

export type JobberTokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
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

function getBaseUrl(request?: Request) {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (request) return new URL(request.url).origin;
  return "";
}

export function getJobberRedirectUri(request?: Request) {
  return `${getBaseUrl(request)}/api/integrations/jobber/callback`;
}

export function getJobberConfig() {
  return {
    clientId: process.env.JOBBER_CLIENT_ID || "",
    clientSecret: process.env.JOBBER_CLIENT_SECRET || "",
    isConfigured: Boolean(process.env.JOBBER_CLIENT_ID && process.env.JOBBER_CLIENT_SECRET)
  };
}

export function buildJobberAuthorizeUrl(state: string, request?: Request) {
  const { clientId } = getJobberConfig();
  const url = new URL(JOBBER_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", getJobberRedirectUri(request));
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeJobberCode(code: string, request: Request) {
  const { clientId, clientSecret } = getJobberConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: getJobberRedirectUri(request)
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

export async function fetchJobberAccount(accessToken: string) {
  const response = await fetch(JOBBER_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: `query AccountStatus { account { id name } }`
    })
  });

  if (!response.ok) {
    throw new Error(`Jobber account query failed with status ${response.status}`);
  }

  const data = await response.json();
  return {
    id: data?.data?.account?.id as string | undefined,
    name: data?.data?.account?.name as string | undefined
  };
}
