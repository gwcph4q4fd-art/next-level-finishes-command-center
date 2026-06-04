import { NextResponse } from "next/server";
import { getJobberCommandCenterSnapshot, syncJobberCommandCenter } from "@/lib/jobber-sync";

export const dynamic = "force-dynamic";

export async function GET() {
  let data = (await getJobberCommandCenterSnapshot())?.data;

  if (!data) {
    try {
      data = await syncJobberCommandCenter({ allowCache: true });
    } catch {
      data = undefined;
    }
  }

  const jobsToday = (data?.upcomingJobs || [])
    .filter((job) => job.startDate && new Date(job.startDate).toDateString() === new Date().toDateString())
    .map((job) => `${job.jobTitle} - ${job.clientName}`);

  return NextResponse.json({
    briefing: {
      cashAvailable: "QuickBooks not connected yet",
      billsDue: "QuickBooks not connected yet",
      jobsToday,
      leadsNeedingResponse: (data?.requests || []).filter((item) => item.reason).map((item) => item.title),
      estimatesToFollowUp: (data?.quotes || []).filter((item) => item.reason).map((item) => item.title),
      revenueNeededThisWeek: "QuickBooks not connected yet",
      biggestRisk: data?.agent.riskyJobs[0] || "No live Jobber data synced yet. Connect/sync Jobber before relying on this briefing.",
      topActions: data?.agent.focusToday || [
        "Sync Jobber.",
        "Connect QuickBooks when ready for cash and P&L visibility.",
        "Add Meta/SMS later for lead response automation."
      ]
    },
    logged: true,
    safety: "Briefing generated from live synced Jobber data when available. No systems were changed."
  });
}
