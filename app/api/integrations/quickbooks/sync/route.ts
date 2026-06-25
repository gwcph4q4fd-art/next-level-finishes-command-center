import { NextResponse } from "next/server";
import { syncQuickBooksFinancials } from "@/lib/quickbooks-sync";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";

  try {
    const data = await syncQuickBooksFinancials({ force, allowCache: true });
    return NextResponse.json({ connected: true, ...data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "QuickBooks sync failed.";
    console.error("[quickbooks:sync] sync failed", error);
    return NextResponse.json({ connected: false, error: message }, { status: 500 });
  }
}
