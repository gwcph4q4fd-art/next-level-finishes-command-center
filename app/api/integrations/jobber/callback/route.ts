import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeJobberCode, fetchJobberAccount } from "@/lib/jobber";

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
    const account = await fetchJobberAccount(token.access_token);

    cookies().set(
      "jobber_connection",
      JSON.stringify({
        connected: true,
        accountName: account.name || "Jobber account",
        accountId: account.id || "",
        connectedAt: new Date().toISOString()
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30
      }
    );
    cookies().delete("jobber_oauth_state");
    return NextResponse.redirect(new URL("/integrations?jobber=connected", request.url));
  } catch (error) {
    return NextResponse.redirect(
      new URL(`/integrations?jobber=error&message=${encodeURIComponent(String(error))}`, request.url)
    );
  }
}
