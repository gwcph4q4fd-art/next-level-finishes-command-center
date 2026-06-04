import { NextResponse } from "next/server";
import { syncJobberCommandCenter } from "@/lib/jobber-sync";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";

  console.log("[jobber:sync] sync request started", { force });

  try {
    const data = await syncJobberCommandCenter({ force, allowCache: true });
    console.log("[jobber:sync] sync request completed", {
      source: data.source,
      syncedAt: data.syncedAt,
      upcomingJobs: data.upcomingJobs.length,
      activeJobs: data.activeJobs.length,
      errors: data.errors.length
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("[jobber:sync] sync request failed", error);
    return NextResponse.json(
      { connected: false, error: error instanceof Error ? error.message : "Jobber sync failed." },
      { status: 401 }
    );
  }
}
