import { NextResponse } from "next/server";
import { syncJobberCommandCenter } from "@/lib/jobber-sync";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (secret && authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
  }

  try {
    const data = await syncJobberCommandCenter({ force: true, allowCache: true });
    return NextResponse.json({
      ok: true,
      syncedAt: data.syncedAt,
      upcomingJobs: data.upcomingJobs.length,
      errors: data.errors
    });
  } catch (error) {
    console.error("[jobber:cron] sync failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Cron Jobber sync failed." },
      { status: 500 }
    );
  }
}
