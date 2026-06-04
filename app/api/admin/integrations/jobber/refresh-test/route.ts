import { NextResponse } from "next/server";
import { testStoredJobberGraphql } from "@/lib/jobber-connection";
import { JOBBER_GRAPHQL_VERSION } from "@/lib/jobber";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await testStoredJobberGraphql({ forceRefresh: true });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: 0,
        version: JOBBER_GRAPHQL_VERSION,
        body: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
