import { NextResponse } from "next/server";
import { getJobberCommandCenterSnapshot, syncJobberCommandCenter } from "@/lib/jobber-sync";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const clientId = decodeURIComponent(params.id);
  let snapshot = await getJobberCommandCenterSnapshot();

  if (!snapshot?.data) {
    const data = await syncJobberCommandCenter({ allowCache: true });
    snapshot = { data, syncedAt: data.syncedAt, stale: data.stale };
  }

  const data = snapshot.data;
  const client = data.clients.find((item) => item.id === clientId);

  if (!client) {
    return NextResponse.json(
      { error: "This client is not in the synced Jobber cache yet.", hint: "Run Sync Jobber and try again." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    client,
    jobs: data.activeJobs.filter((job) => job.clientName === client.title || job.clientName === client.clientName),
    quotes: data.quotes.filter((quote) => quote.clientName === client.title || quote.clientName === client.clientName),
    invoices: data.invoices.filter((invoice) => invoice.clientName === client.title || invoice.clientName === client.clientName),
    followUps: data.followUps.filter((item) => item.clientName === client.title || item.clientName === client.clientName || item.id === client.id),
    syncedAt: snapshot.syncedAt
  });
}
