import { NextResponse } from "next/server";
import { getJobberCommandCenterSnapshot, syncJobberCommandCenter } from "@/lib/jobber-sync";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";

  try {
    if (force) {
      return NextResponse.json(await syncJobberCommandCenter({ force: true, allowCache: true }));
    }

    const snapshot = await getJobberCommandCenterSnapshot();
    if (snapshot?.data && !snapshot.stale) {
      return NextResponse.json({ ...snapshot.data, source: "cache", stale: false });
    }

    return NextResponse.json(await syncJobberCommandCenter({ allowCache: true }));
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : "Unable to load Jobber data.",
        hint: "Connect Jobber or run Sync Jobber from the dashboard."
      },
      { status: 500 }
    );
  }
}
