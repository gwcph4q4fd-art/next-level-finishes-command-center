export type LeadStatus =
  | "New"
  | "Contacted"
  | "Estimate Scheduled"
  | "Quoted"
  | "Won"
  | "Lost";

export type JobType =
  | "Interior Painting"
  | "Exterior Painting"
  | "Cabinet Painting"
  | "Deck Staining"
  | "Drywall/Trim"
  | "Bathroom Remodel"
  | "Kitchen Remodel";

export type Lead = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: string;
  status: LeadStatus;
  jobType: JobType;
  location: string;
  message: string;
  receivedAt: string;
  urgency: string;
  nextStep: string;
};

export type ScheduleItem = {
  id: string;
  title: string;
  type: "Estimate" | "Job" | "Reminder";
  time: string;
  location: string;
  notes: string;
};

export type Invoice = {
  id: string;
  customer: string;
  amount: number;
  due: string;
  status: "Deposit unpaid" | "Invoice unpaid" | "Overdue";
};

export type Bill = {
  id: string;
  vendor: string;
  amount: number;
  due: string;
};

export type AiDraftLog = {
  id: string;
  type: "Lead Reply" | "Estimate" | "Daily Briefing";
  relatedTo: string;
  createdAt: string;
  status: "Drafted" | "Approved" | "Sent manually";
};
