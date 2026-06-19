import { IntegrationProvider } from "@prisma/client";
import { NextResponse } from "next/server";
import { getInboundIntegrationStatus } from "@/lib/inbound-integrations";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getInboundIntegrationStatus(IntegrationProvider.META));
}
