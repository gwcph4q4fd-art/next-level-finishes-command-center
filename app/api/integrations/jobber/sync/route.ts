import { NextResponse } from "next/server";
import { getStoredJobberAccessToken, markJobberSynced } from "@/lib/jobber-connection";
import { jobberGraphql } from "@/lib/jobber";

export const dynamic = "force-dynamic";

type ClientName = {
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
};

type JobberSection<T> = {
  items: T[];
  error?: string;
};

type JobberSyncResult = {
  connected: boolean;
  syncedAt: string;
  schedule: JobberSection<DashboardItem>;
  activeJobs: JobberSection<DashboardItem>;
  openQuotes: JobberSection<DashboardItem>;
  recentInvoices: JobberSection<DashboardItem>;
  followUps: JobberSection<DashboardItem>;
};

type DashboardItem = {
  id: string;
  title: string;
  detail?: string;
  status?: string;
  date?: string;
};

function clientName(client?: ClientName | null) {
  if (!client) return "";
  return client.companyName || [client.firstName, client.lastName].filter(Boolean).join(" ");
}

async function section<T>(fn: () => Promise<T[]>): Promise<JobberSection<T>> {
  try {
    return { items: await fn() };
  } catch (error) {
    return { items: [], error: error instanceof Error ? error.message : String(error) };
  }
}

export async function GET() {
  console.log("[jobber:sync] sync request started");
  const accessToken = await getStoredJobberAccessToken();

  if (!accessToken) {
    console.log("[jobber:sync] no saved Jobber access token");
    return NextResponse.json({ connected: false, error: "Jobber is not connected." }, { status: 401 });
  }

  const activeJobs = await section(async () => {
    const data = await jobberGraphql<{
      jobs?: { nodes?: Array<{ id: string; jobNumber?: number | string; title?: string | null; jobStatus?: string; client?: ClientName }> };
    }>(
      accessToken,
      `query DashboardJobs {
        jobs {
          nodes {
            id
            jobNumber
            title
            jobStatus
            client { firstName lastName companyName }
          }
        }
      }`
    );

    return (data.jobs?.nodes || []).slice(0, 8).map((job) => ({
      id: job.id,
      title: job.title || `Job #${job.jobNumber || job.id}`,
      detail: clientName(job.client),
      status: job.jobStatus
    }));
  });

  const openQuotes = await section(async () => {
    const data = await jobberGraphql<{
      quotes?: { nodes?: Array<{ id: string; quoteNumber?: number | string; title?: string | null; quoteStatus?: string; client?: ClientName }> };
    }>(
      accessToken,
      `query DashboardQuotes {
        quotes {
          nodes {
            id
            quoteNumber
            title
            quoteStatus
            client { firstName lastName companyName }
          }
        }
      }`
    );

    return (data.quotes?.nodes || []).slice(0, 8).map((quote) => ({
      id: quote.id,
      title: quote.title || `Quote #${quote.quoteNumber || quote.id}`,
      detail: clientName(quote.client),
      status: quote.quoteStatus
    }));
  });

  const recentInvoices = await section(async () => {
    const data = await jobberGraphql<{
      invoices?: { nodes?: Array<{ id: string; invoiceNumber?: number | string; subject?: string | null; invoiceStatus?: string; client?: ClientName }> };
    }>(
      accessToken,
      `query DashboardInvoices {
        invoices {
          nodes {
            id
            invoiceNumber
            subject
            invoiceStatus
            client { firstName lastName companyName }
          }
        }
      }`
    );

    return (data.invoices?.nodes || []).slice(0, 8).map((invoice) => ({
      id: invoice.id,
      title: invoice.subject || `Invoice #${invoice.invoiceNumber || invoice.id}`,
      detail: clientName(invoice.client),
      status: invoice.invoiceStatus
    }));
  });

  const schedule = await section(async () => {
    const data = await jobberGraphql<{
      jobs?: {
        nodes?: Array<{
          id: string;
          jobNumber?: number | string;
          title?: string | null;
          client?: ClientName;
          visits?: {
            nodes?: Array<{ id: string; title?: string | null; startAt?: string | null; endAt?: string | null; visitStatus?: string }>;
          };
        }>;
      };
    }>(
      accessToken,
      `query DashboardSchedule {
        jobs {
          nodes {
            id
            jobNumber
            title
            client { firstName lastName companyName }
            visits {
              nodes {
                id
                title
                startAt
                endAt
                visitStatus
              }
            }
          }
        }
      }`
    );

    return (data.jobs?.nodes || []).flatMap((job) =>
      (job.visits?.nodes || []).map((visit) => ({
        id: visit.id,
        title: visit.title || job.title || `Job #${job.jobNumber || job.id}`,
        detail: clientName(job.client),
        status: visit.visitStatus,
        date: visit.startAt || visit.endAt || undefined
      }))
    ).slice(0, 8);
  });

  const followUps = await section(async () => {
    const data = await jobberGraphql<{
      clients?: { nodes?: Array<{ id: string; firstName?: string; lastName?: string; companyName?: string; updatedAt?: string; createdAt?: string }> };
    }>(
      accessToken,
      `query DashboardClients {
        clients {
          nodes {
            id
            firstName
            lastName
            companyName
            createdAt
            updatedAt
          }
        }
      }`
    );

    return (data.clients?.nodes || []).slice(0, 8).map((client) => ({
      id: client.id,
      title: clientName(client) || client.id,
      detail: "Recent Jobber client",
      date: client.updatedAt || client.createdAt
    }));
  });

  const result: JobberSyncResult = {
    connected: true,
    syncedAt: new Date().toISOString(),
    schedule,
    activeJobs,
    openQuotes,
    recentInvoices,
    followUps
  };

  await markJobberSynced();
  console.log("[jobber:sync] sync request completed", {
    schedule: result.schedule.items.length,
    activeJobs: result.activeJobs.items.length,
    openQuotes: result.openQuotes.items.length,
    recentInvoices: result.recentInvoices.items.length,
    followUps: result.followUps.items.length
  });

  return NextResponse.json(result);
}
