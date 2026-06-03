import { NextResponse } from "next/server";
import { bills, cashSummary, invoices, leads, schedule } from "@/lib/mock-data";
import { currency } from "@/lib/utils";

export async function GET() {
  const newLeads = leads.filter((lead) => lead.status === "New");
  const followUps = leads.filter((lead) => lead.status === "Quoted");
  const billTotal = bills.reduce((total, bill) => total + bill.amount, 0);
  const unpaidTotal = invoices.reduce((total, invoice) => total + invoice.amount, 0);

  return NextResponse.json({
    briefing: {
      cashAvailable: currency(cashSummary.available),
      billsDue: `${currency(billTotal)} due soon`,
      jobsToday: schedule.filter((item) => item.type === "Job").map((item) => `${item.time} - ${item.title}`),
      leadsNeedingResponse: newLeads.map((lead) => lead.name),
      estimatesToFollowUp: followUps.map((lead) => lead.name),
      revenueNeededThisWeek: currency(cashSummary.revenueNeeded),
      biggestRisk:
        unpaidTotal > cashSummary.revenueNeeded
          ? "Cash is tied up in unpaid deposits and invoices, so collections should happen before new material spending."
          : "The week needs more booked revenue, so follow-ups and fast lead response matter most.",
      topActions: [
        "Reply to every new lead before lunch.",
        "Follow up on quoted exterior work with a clear yes/no next step.",
        "Collect unpaid deposit before ordering additional job materials."
      ]
    },
    logged: true,
    safety: "Briefing generated from mock/read-only data. No financial systems were changed."
  });
}
