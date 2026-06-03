import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSessionToken, getAuthConfig, SESSION_COOKIE, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const { password } = await request.json();
  const config = getAuthConfig();

  if (!config.isConfigured) {
    return NextResponse.json(
      { error: "Authentication is not configured. Set AUTH_SECRET and ADMIN_PASSWORD_HASH." },
      { status: 503 }
    );
  }

  if (typeof password !== "string" || !(await verifyPassword(password, config.passwordHash))) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await createSessionToken(config.secret);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8
  });

  return NextResponse.json({ ok: true });
}

