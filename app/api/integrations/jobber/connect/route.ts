import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildJobberAuthorizeUrl, getJobberConfig, getJobberRedirectUri } from "@/lib/jobber";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const config = getJobberConfig();

  if (!config.isConfigured) {
    return NextResponse.redirect(
      new URL(
        `/integrations?jobber=missing-config&redirect_uri=${encodeURIComponent(getJobberRedirectUri())}`,
        request.url
      ),
      302
    );
  }

  const stateBytes = crypto.getRandomValues(new Uint8Array(24));
  const state = Buffer.from(stateBytes).toString("base64url");

  cookies().set("jobber_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60
  });

  return NextResponse.redirect(buildJobberAuthorizeUrl(state), 302);
}
