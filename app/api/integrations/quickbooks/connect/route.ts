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
