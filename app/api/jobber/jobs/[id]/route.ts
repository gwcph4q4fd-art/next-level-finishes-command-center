import { NextResponse } from "next/server";
import { getJobberCommandCenterSnapshot, syncJobberCommandCenter } from "@/lib/jobber-sync";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const jobId = decodeURIComponent(params.id);
  let snapshot = await getJobberCommandCenterSnapshot();

  if (!snapshot?.data) {
    try {
      const data = await syncJobberCommandCenter({ allowCache: true });
      snapshot = { data, syncedAt: data.syncedAt, stale: data.stale };
    } catch {
      snapshot = null;
    }
  }

  const data = snapshot?.data;
  const job = data?.activeJobs.find((item) => item.id === jobId) || data?.upcomingJobs.find((item) => item.id === jobId);

  if (!job) {
    return NextResponse.json(
      {
        error: "This Jobber job is not in the synced cache yet.",
        hint: "Return to the dashboard, run Sync Jobber, then open the job again."
      },
      { status: 404 }
    );
  }

  const relatedQuotes = [
    ...(data?.pipeline.quotesSent || []),
    ...(data?.pipeline.awaitingApproval || [])
  ].filter((item) => item.clientName === job.clientName);
  const relatedInvoices = (data?.recentInvoices || []).filter((item) => item.clientName === job.clientName);

  return NextResponse.json({
    job,
    relatedQuotes,
    relatedInvoices,
    syncedAt: snapshot?.syncedAt || data?.syncedAt || null,
    recommendedNextAction: job.recommendedAction
  });
}
