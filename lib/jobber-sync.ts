import { getCachedJobberSnapshot, getStoredJobberAccessToken, markJobberSynced } from "@/lib/jobber-connection";
import { jobberGraphql } from "@/lib/jobber";

export const JOBBER_CACHE_MAX_AGE_MS = 15 * 60 * 1000;

type ContactPoint = {
  address?: string | null;
  number?: string | null;
  primary?: boolean | null;
};

type ClientNode = {
  id?: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  defaultEmails?: string[] | null;
  emails?: ContactPoint[] | null;
  phones?: ContactPoint[] | null;
  isLead?: boolean | null;
  balance?: number | null;
  jobberWebUri?: string | null;
  updatedAt?: string | null;
};

type AddressNode = {
  street?: string | null;
  street1?: string | null;
  street2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
};

type PropertyNode = {
  address?: AddressNode | null;
  jobberWebUri?: string | null;
};

type VisitNode = {
  id: string;
  title?: string | null;
  visitStatus?: string | null;
  startAt?: string | null;
  endAt?: string | null;
};

type MoneyAmounts = {
  total?: number | null;
  outstanding?: number | null;
  paymentsTotal?: number | null;
  depositAmount?: number | null;
};

export type JobberJobCard = {
  id: string;
  clientName: string;
  jobTitle: string;
  address?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  total?: number | null;
  quoteAmount?: number | null;
  phone?: string;
  email?: string;
  notes?: string;
  lastUpdated?: string;
  jobberUrl?: string;
  recommendedAction: string;
};

export type JobberPipelineItem = {
  id: string;
  title: string;
  clientName?: string;
  status?: string;
  amount?: number | null;
  date?: string | null;
  jobberUrl?: string | null;
  reason?: string;
};

export type JobberCommandCenterData = {
  connected: boolean;
  syncedAt: string;
  source: "fresh" | "cache";
  stale: boolean;
  errors: string[];
  upcomingJobs: JobberJobCard[];
  activeJobs: JobberJobCard[];
  recentInvoices: JobberPipelineItem[];
  followUps: JobberPipelineItem[];
  pipeline: {
    newRequests: JobberPipelineItem[];
    quotesSent: JobberPipelineItem[];
    awaitingApproval: JobberPipelineItem[];
    upcomingJobs: JobberPipelineItem[];
    completedButUnpaid: JobberPipelineItem[];
    followUpNeeded: JobberPipelineItem[];
  };
  agent: {
    focusToday: string[];
    followUpClients: string[];
    riskyJobs: string[];
    pipelineWeakness: string;
    advertisingIdea: string;
  };
};

function clientName(client?: ClientNode | null) {
  if (!client) return "Unknown client";
  return client.name || client.companyName || [client.firstName, client.lastName].filter(Boolean).join(" ") || "Unknown client";
}

function firstEmail(client?: ClientNode | null) {
  return client?.defaultEmails?.[0] || client?.emails?.find((email) => email.primary)?.address || client?.emails?.[0]?.address || undefined;
}

function firstPhone(client?: ClientNode | null) {
  return client?.phones?.find((phone) => phone.primary)?.number || client?.phones?.[0]?.number || undefined;
}

function formatAddress(property?: PropertyNode | null) {
  const address = property?.address;
  if (!address) return undefined;
  return [
    [address.street1 || address.street, address.street2].filter(Boolean).join(" "),
    [address.city, address.province, address.postalCode].filter(Boolean).join(", ")
  ].filter(Boolean).join(" ");
}

function newestVisit(visits?: { nodes?: VisitNode[] | null } | null) {
  return (visits?.nodes || [])
    .filter((visit) => visit.startAt || visit.endAt)
    .sort((a, b) => String(a.startAt || a.endAt).localeCompare(String(b.startAt || b.endAt)))[0];
}

function asPipelineItem(item: {
  id: string;
  title?: string | null;
  client?: ClientNode | null;
  contactName?: string | null;
  companyName?: string | null;
  status?: string | null;
  amount?: number | null;
  date?: string | null;
  jobberWebUri?: string | null;
  reason?: string;
}): JobberPipelineItem {
  return {
    id: item.id,
    title: item.title || item.contactName || item.companyName || "Untitled Jobber item",
    clientName: item.client ? clientName(item.client) : item.contactName || item.companyName || undefined,
    status: item.status || undefined,
    amount: item.amount,
    date: item.date,
    jobberUrl: item.jobberWebUri,
    reason: item.reason
  };
}

function classifyNeedsFollowUp(status?: string | null, updatedAt?: string | null) {
  const normalized = String(status || "").toLowerCase();
  const olderThanThreeDays = updatedAt ? Date.now() - new Date(updatedAt).getTime() > 3 * 24 * 60 * 60 * 1000 : false;
  return normalized.includes("awaiting") || normalized.includes("sent") || normalized.includes("new") || olderThanThreeDays;
}

function jobRecommendedAction(job: JobberJobCard) {
  if (!job.startDate) return "Confirm schedule and materials before committing crew time.";
  const startsSoon = new Date(job.startDate).getTime() - Date.now() < 48 * 60 * 60 * 1000;
  if (startsSoon && !job.notes) return "Add prep notes and confirm access, colors, and parking before arrival.";
  if (!job.phone && !job.email) return "Add contact info in Jobber so reminders and follow-ups are easy.";
  if (!job.total && !job.quoteAmount) return "Review pricing so this job has a clear production target.";
  return "Confirm prep expectations and next customer touchpoint.";
}

async function safeSection<T>(label: string, fn: () => Promise<T[]>): Promise<{ items: T[]; error?: string }> {
  try {
    return { items: await fn() };
  } catch (error) {
    return { items: [], error: `${label}: ${error instanceof Error ? error.message : String(error)}` };
  }
}

async function fetchJobs(accessToken: string) {
  const data = await jobberGraphql<{
    jobs?: {
      nodes?: Array<{
        id: string;
        jobNumber?: number | string;
        title?: string | null;
        jobStatus?: string | null;
        total?: number | null;
        instructions?: string | null;
        jobberWebUri?: string | null;
        startAt?: string | null;
        endAt?: string | null;
        updatedAt?: string | null;
        completedAt?: string | null;
        client?: ClientNode | null;
        property?: PropertyNode | null;
        quote?: { id: string; title?: string | null; quoteStatus?: string | null; amounts?: MoneyAmounts | null; jobberWebUri?: string | null } | null;
        visits?: { nodes?: VisitNode[] | null } | null;
        invoices?: { nodes?: Array<{ id: string; invoiceStatus?: string | null; amounts?: MoneyAmounts | null; dueDate?: string | null; jobberWebUri?: string | null }> | null } | null;
      }>;
    };
  }>(
    accessToken,
    `query CommandCenterJobs {
      jobs(first: 25) {
        nodes {
          id
          jobNumber
          title
          jobStatus
          total
          instructions
          jobberWebUri
          startAt
          endAt
          updatedAt
          completedAt
          client { id name firstName lastName companyName defaultEmails emails { address primary } jobberWebUri }
          property { jobberWebUri address { street1 street2 city province postalCode } }
          quote { id title quoteStatus jobberWebUri amounts { total } }
          visits(first: 5) { nodes { id title visitStatus startAt endAt } }
          invoices(first: 5) { nodes { id invoiceStatus dueDate jobberWebUri amounts { total outstanding paymentsTotal } } }
        }
      }
    }`
  );

  return (data.jobs?.nodes || []).map((job) => {
    const visit = newestVisit(job.visits);
    const card: JobberJobCard = {
      id: job.id,
      clientName: clientName(job.client),
      jobTitle: job.title || `Job #${job.jobNumber || job.id}`,
      address: formatAddress(job.property),
      startDate: visit?.startAt || job.startAt || undefined,
      endDate: visit?.endAt || job.endAt || undefined,
      status: job.jobStatus || visit?.visitStatus || undefined,
      total: job.total,
      quoteAmount: job.quote?.amounts?.total,
      phone: firstPhone(job.client),
      email: firstEmail(job.client),
      notes: job.instructions || undefined,
      lastUpdated: job.updatedAt || undefined,
      jobberUrl: job.jobberWebUri || undefined,
      recommendedAction: ""
    };
    card.recommendedAction = jobRecommendedAction(card);
    return card;
  });
}

async function fetchRequests(accessToken: string) {
  const data = await jobberGraphql<{
    requests?: {
      nodes?: Array<{
        id: string;
        title?: string | null;
        requestStatus?: string | null;
        contactName?: string | null;
        companyName?: string | null;
        jobberWebUri?: string | null;
        updatedAt?: string | null;
        createdAt?: string | null;
        client?: ClientNode | null;
      }>;
    };
  }>(
    accessToken,
    `query CommandCenterRequests {
      requests(first: 20) {
        nodes {
          id
          title
          requestStatus
          contactName
          companyName
          jobberWebUri
          createdAt
          updatedAt
          client { id name companyName firstName lastName isLead }
        }
      }
    }`
  );

  return (data.requests?.nodes || []).map((request) =>
    asPipelineItem({
      id: request.id,
      title: request.title,
      client: request.client,
      contactName: request.contactName,
      companyName: request.companyName,
      status: request.requestStatus,
      date: request.updatedAt || request.createdAt,
      jobberWebUri: request.jobberWebUri,
      reason: classifyNeedsFollowUp(request.requestStatus, request.updatedAt) ? "Needs first response or next step." : undefined
    })
  );
}

async function fetchQuotes(accessToken: string) {
  const data = await jobberGraphql<{
    quotes?: {
      nodes?: Array<{
        id: string;
        title?: string | null;
        quoteNumber?: string | null;
        quoteStatus?: string | null;
        jobberWebUri?: string | null;
        updatedAt?: string | null;
        transitionedAt?: string | null;
        amounts?: MoneyAmounts | null;
        client?: ClientNode | null;
      }>;
    };
  }>(
    accessToken,
    `query CommandCenterQuotes {
      quotes(first: 25) {
        nodes {
          id
          title
          quoteNumber
          quoteStatus
          jobberWebUri
          transitionedAt
          updatedAt
          amounts { total }
          client { id name companyName firstName lastName defaultEmails }
        }
      }
    }`
  );

  return (data.quotes?.nodes || []).map((quote) =>
    asPipelineItem({
      id: quote.id,
      title: quote.title || `Quote #${quote.quoteNumber || quote.id}`,
      client: quote.client,
      status: quote.quoteStatus,
      amount: quote.amounts?.total,
      date: quote.transitionedAt || quote.updatedAt,
      jobberWebUri: quote.jobberWebUri,
      reason: classifyNeedsFollowUp(quote.quoteStatus, quote.transitionedAt || quote.updatedAt) ? "Quote needs a follow-up touch." : undefined
    })
  );
}

async function fetchInvoices(accessToken: string) {
  const data = await jobberGraphql<{
    invoices?: {
      nodes?: Array<{
        id: string;
        subject?: string | null;
        invoiceNumber?: string | null;
        invoiceStatus?: string | null;
        jobberWebUri?: string | null;
        dueDate?: string | null;
        updatedAt?: string | null;
        amounts?: MoneyAmounts | null;
        client?: ClientNode | null;
      }>;
    };
  }>(
    accessToken,
    `query CommandCenterInvoices {
      invoices(first: 25) {
        nodes {
          id
          subject
          invoiceNumber
          invoiceStatus
          jobberWebUri
          dueDate
          updatedAt
          amounts { total outstanding paymentsTotal }
          client { id name companyName firstName lastName }
        }
      }
    }`
  );

  return (data.invoices?.nodes || []).map((invoice) =>
    asPipelineItem({
      id: invoice.id,
      title: invoice.subject || `Invoice #${invoice.invoiceNumber || invoice.id}`,
      client: invoice.client,
      status: invoice.invoiceStatus,
      amount: invoice.amounts?.outstanding ?? invoice.amounts?.total,
      date: invoice.dueDate || invoice.updatedAt,
      jobberWebUri: invoice.jobberWebUri,
      reason: Number(invoice.amounts?.outstanding || 0) > 0 ? "Money is still outstanding." : undefined
    })
  );
}

async function fetchClients(accessToken: string) {
  const data = await jobberGraphql<{ clients?: { nodes?: ClientNode[] } }>(
    accessToken,
    `query CommandCenterClients {
      clients(first: 20) {
        nodes {
          id
          name
          companyName
          firstName
          lastName
          isLead
          balance
          defaultEmails
          jobberWebUri
          updatedAt
        }
      }
    }`
  );

  return (data.clients?.nodes || []).map((client) =>
    asPipelineItem({
      id: client.id || client.name || "client",
      title: clientName(client),
      client,
      status: client.isLead ? "Lead" : Number(client.balance || 0) > 0 ? "Balance due" : "Client",
      amount: client.balance,
      date: client.updatedAt,
      jobberWebUri: client.jobberWebUri,
      reason: client.isLead ? "Lead client still needs conversion." : Number(client.balance || 0) > 0 ? "Client has a balance." : undefined
    })
  );
}

function buildPipeline(input: {
  jobs: JobberJobCard[];
  requests: JobberPipelineItem[];
  quotes: JobberPipelineItem[];
  invoices: JobberPipelineItem[];
  clients: JobberPipelineItem[];
}) {
  const upcomingJobs = input.jobs
    .filter((job) => job.startDate && !String(job.status || "").toLowerCase().includes("complete"))
    .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)))
    .slice(0, 10);

  return {
    newRequests: input.requests.filter((item) => String(item.status || "").toLowerCase().includes("new")).slice(0, 8),
    quotesSent: input.quotes.filter((item) => !String(item.status || "").toLowerCase().includes("converted")).slice(0, 8),
    awaitingApproval: input.quotes.filter((item) => String(item.status || "").toLowerCase().includes("awaiting")).slice(0, 8),
    upcomingJobs: upcomingJobs.map((job) =>
      asPipelineItem({
        id: job.id,
        title: job.jobTitle,
        status: job.status,
        amount: job.total || job.quoteAmount,
        date: job.startDate,
        jobberWebUri: job.jobberUrl,
        contactName: job.clientName
      })
    ),
    completedButUnpaid: input.invoices.filter((item) => Number(item.amount || 0) > 0).slice(0, 8),
    followUpNeeded: [...input.requests, ...input.quotes, ...input.clients].filter((item) => item.reason).slice(0, 8)
  };
}

function buildAgent(data: Omit<JobberCommandCenterData, "agent">) {
  const riskyJobs = data.upcomingJobs
    .filter((job) => !job.notes || !job.address || !job.phone)
    .slice(0, 4)
    .map((job) => `${job.jobTitle} for ${job.clientName}: ${job.recommendedAction}`);

  const followUpClients = data.pipeline.followUpNeeded.slice(0, 5).map((item) => `${item.clientName || item.title}: ${item.reason}`);
  const focusToday = [
    data.upcomingJobs[0] ? `Prep for ${data.upcomingJobs[0].jobTitle} with ${data.upcomingJobs[0].clientName}.` : "No upcoming Jobber job was returned. Check whether upcoming work is scheduled in Jobber.",
    data.pipeline.awaitingApproval[0] ? `Follow up on ${data.pipeline.awaitingApproval[0].title}.` : "No awaiting-approval quote was returned.",
    data.pipeline.completedButUnpaid[0] ? `Collect or follow up on ${data.pipeline.completedButUnpaid[0].title}.` : "No unpaid completed work was returned."
  ];

  const quoteCount = data.pipeline.quotesSent.length + data.pipeline.awaitingApproval.length;
  const requestCount = data.pipeline.newRequests.length;
  const pipelineWeakness =
    requestCount === 0
      ? "Lead intake looks light. Put attention on Meta/Google/local posts and referral asks."
      : quoteCount === 0
        ? "There are leads, but not many active quotes. Move requests into estimate appointments or quotes."
        : "Pipeline has movement. The next win is fast follow-up on open quotes and unpaid work.";

  const advertisingIdea =
    data.upcomingJobs.some((job) => /cabinet/i.test(job.jobTitle))
      ? "Advertise cabinet refinishing before-and-after photos this week."
      : data.upcomingJobs.some((job) => /deck|stain/i.test(job.jobTitle))
        ? "Advertise deck staining and exterior prep while the weather window is active."
        : "Advertise interior painting, cabinet refreshes, and fast estimate scheduling around Titusville.";

  return {
    focusToday,
    followUpClients,
    riskyJobs: riskyJobs.length ? riskyJobs : ["No obvious job risks from the synced fields. Keep an eye on jobs missing notes, contact info, or addresses."],
    pipelineWeakness,
    advertisingIdea
  };
}

export async function syncJobberCommandCenter(options: { force?: boolean; allowCache?: boolean } = {}) {
  const cached = await getCachedJobberSnapshot<JobberCommandCenterData>();

  if (!options.force && cached?.data && cached.syncedAt && Date.now() - new Date(cached.syncedAt).getTime() < JOBBER_CACHE_MAX_AGE_MS) {
    return { ...cached.data, source: "cache" as const, stale: false };
  }

  const accessToken = await getStoredJobberAccessToken();
  if (!accessToken) {
    if (cached?.data && options.allowCache) return { ...cached.data, source: "cache" as const, stale: true };
    throw new Error("Jobber is not connected.");
  }

  const [jobs, requests, quotes, invoices, clients] = await Promise.all([
    safeSection("Jobs", () => fetchJobs(accessToken)),
    safeSection("Requests", () => fetchRequests(accessToken)),
    safeSection("Quotes", () => fetchQuotes(accessToken)),
    safeSection("Invoices", () => fetchInvoices(accessToken)),
    safeSection("Clients", () => fetchClients(accessToken))
  ]);

  const errors = [jobs.error, requests.error, quotes.error, invoices.error, clients.error].filter(Boolean) as string[];
  const upcomingJobs = jobs.items
    .filter((job) => !job.startDate || new Date(job.startDate).getTime() >= Date.now() - 24 * 60 * 60 * 1000)
    .sort((a, b) => String(a.startDate || "").localeCompare(String(b.startDate || "")))
    .slice(0, 12);
  const pipeline = buildPipeline({ jobs: jobs.items, requests: requests.items, quotes: quotes.items, invoices: invoices.items, clients: clients.items });

  const base: Omit<JobberCommandCenterData, "agent"> = {
    connected: true,
    syncedAt: new Date().toISOString(),
    source: "fresh",
    stale: false,
    errors,
    upcomingJobs,
    activeJobs: jobs.items.slice(0, 12),
    recentInvoices: invoices.items.slice(0, 10),
    followUps: pipeline.followUpNeeded,
    pipeline
  };
  const data: JobberCommandCenterData = { ...base, agent: buildAgent(base) };

  await markJobberSynced(data);
  return data;
}

export async function getJobberCommandCenterSnapshot() {
  return getCachedJobberSnapshot<JobberCommandCenterData>();
}
