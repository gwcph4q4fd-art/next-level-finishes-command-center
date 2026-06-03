import type { AiDraftLog, Bill, Invoice, Lead, ScheduleItem } from "@/lib/types";

export const leads: Lead[] = [
  {
    id: "lead-101",
    name: "Megan Brooks",
    phone: "(814) 555-0192",
    email: "megan@example.com",
    source: "Website",
    status: "New",
    jobType: "Cabinet Painting",
    location: "Titusville, PA",
    message:
      "We want our oak kitchen cabinets painted white and need to know if you can look at them next week.",
    receivedAt: "Today, 8:15 AM",
    urgency: "High",
    nextStep: "Reply with cabinet questions and estimate appointment times"
  },
  {
    id: "lead-102",
    name: "Dan Keller",
    phone: "(814) 555-0140",
    source: "Meta Lead",
    status: "Estimate Scheduled",
    jobType: "Deck Staining",
    location: "Oil City, PA",
    message: "Deck needs cleaned and stained before July if possible.",
    receivedAt: "Yesterday, 6:40 PM",
    urgency: "Medium",
    nextStep: "Confirm Saturday 10:00 AM estimate"
  },
  {
    id: "lead-103",
    name: "Renee Martin",
    phone: "(814) 555-0127",
    email: "renee@example.com",
    source: "Manual",
    status: "Quoted",
    jobType: "Exterior Painting",
    location: "Meadville, PA",
    message: "Two-story exterior, peeling on south side, needs trim included.",
    receivedAt: "May 31, 2:05 PM",
    urgency: "Follow-up",
    nextStep: "Follow up on $7,800 quote"
  }
];

export const schedule: ScheduleItem[] = [
  {
    id: "sched-1",
    title: "Cabinet estimate - Brooks kitchen",
    type: "Estimate",
    time: "10:00 AM",
    location: "Titusville, PA",
    notes: "Ask about finish color, island, hinges, and timeline."
  },
  {
    id: "sched-2",
    title: "Prep and prime - Fisher exterior",
    type: "Job",
    time: "12:30 PM",
    location: "Hydetown, PA",
    notes: "Scrape south wall, spot prime, confirm rain window."
  },
  {
    id: "sched-3",
    title: "Call supplier about cabinet enamel",
    type: "Reminder",
    time: "3:15 PM",
    location: "Phone",
    notes: "Check availability for satin white and bonding primer."
  }
];

export const invoices: Invoice[] = [
  { id: "inv-1", customer: "Fisher Exterior", amount: 2200, due: "Today", status: "Deposit unpaid" },
  { id: "inv-2", customer: "Martin Exterior", amount: 7800, due: "Jun 7", status: "Invoice unpaid" }
];

export const bills: Bill[] = [
  { id: "bill-1", vendor: "Sherwin-Williams", amount: 614.83, due: "Jun 5" },
  { id: "bill-2", vendor: "Insurance", amount: 388.0, due: "Jun 10" }
];

export const draftLogs: AiDraftLog[] = [
  {
    id: "draft-1",
    type: "Lead Reply",
    relatedTo: "Megan Brooks",
    createdAt: "Today, 8:18 AM",
    status: "Drafted"
  },
  {
    id: "draft-2",
    type: "Estimate",
    relatedTo: "Renee Martin",
    createdAt: "Yesterday, 4:20 PM",
    status: "Approved"
  },
  {
    id: "draft-3",
    type: "Daily Briefing",
    relatedTo: "Command Center",
    createdAt: "Today, 6:30 AM",
    status: "Drafted"
  }
];

export const cashSummary = {
  available: 12450,
  weeklyGoal: 18000,
  bookedThisWeek: 11200,
  revenueNeeded: 6800,
  openEstimateValue: 24300
};

export const integrations = [
  {
    name: "QuickBooks",
    mode: "Read-only placeholder",
    covers: "Cash balance, invoices, expenses, bills, profit/loss",
    safety: "No create, edit, delete, or send actions enabled"
  },
  {
    name: "Jobber",
    mode: "Read-only placeholder",
    covers: "Jobs, clients, quotes, invoices, schedule",
    safety: "No Jobber writes enabled"
  },
  {
    name: "Meta Leads",
    mode: "Webhook placeholder",
    covers: "New Facebook and Instagram lead forms",
    safety: "Leads enter inbox as drafts for review"
  },
  {
    name: "Twilio SMS",
    mode: "Inbound/outbound placeholder",
    covers: "Customer text messages",
    safety: "AI drafts only; owner approval required before sending"
  }
];
