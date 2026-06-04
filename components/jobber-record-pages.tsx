"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react";
import { Badge, Panel, buttonClass } from "@/components/ui";
import { currency } from "@/lib/utils";
import type { JobberCommandCenterData, JobberJobCard, JobberPipelineItem } from "@/lib/jobber-sync";

type Collection = "jobs" | "clients" | "quotes" | "invoices" | "requests";

const titles: Record<Collection, string> = {
  jobs: "Jobber Jobs",
  clients: "Jobber Clients",
  quotes: "Jobber Quotes",
  invoices: "Jobber Invoices",
  requests: "Jobber Requests / Leads"
};

export function JobberListPage({ collection }: { collection: Collection }) {
  const [data, setData] = useState<JobberCommandCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(force = false) {
    setLoading(true);
    setError("");
    const response = await fetch(`/api/jobber/snapshot${force ? "?force=1" : ""}`, { cache: "no-store" });
    const nextData = await response.json();
    if (!response.ok) {
      setError(nextData.error || "Unable to load Jobber data.");
      setData(null);
    } else {
      setData(nextData);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const records = useMemo(() => {
    if (!data) return [];
    if (collection === "jobs") return data.activeJobs;
    if (collection === "clients") return data.clients;
    if (collection === "quotes") return data.quotes;
    if (collection === "requests") return data.requests;
    return data.invoices;
  }, [collection, data]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-pine">
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <button className={buttonClass} onClick={() => load(true)} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          {loading ? "Loading..." : "Refresh Jobber"}
        </button>
      </div>

      <Panel title={titles[collection]}>
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-steel">
          {data?.syncedAt ? <span>Last synced {new Date(data.syncedAt).toLocaleString()}</span> : null}
          {data?.source === "cache" ? <Badge tone="blue">Cached</Badge> : null}
        </div>

        {error ? <p className="rounded-md bg-clay/10 p-3 text-sm text-clay">{error}</p> : null}
        {loading ? <p className="rounded-md border border-dashed border-ink/20 p-4 text-sm text-steel">Loading synced Jobber records...</p> : null}

        {!loading && !error && !records.length ? (
          <p className="rounded-md border border-dashed border-ink/20 p-4 text-sm text-steel">
            No {titles[collection].toLowerCase()} were returned from Jobber. Check Jobber permissions, record availability, or run a fresh sync.
          </p>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          {records.map((record) =>
            collection === "jobs" ? (
              <JobRecord key={(record as JobberJobCard).id} job={record as JobberJobCard} />
            ) : (
              <PipelineRecord key={(record as JobberPipelineItem).id} item={record as JobberPipelineItem} collection={collection} />
            )
          )}
        </div>
      </Panel>
    </main>
  );
}

function JobRecord({ job }: { job: JobberJobCard }) {
  return (
    <article className="rounded-md border border-ink/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase text-steel">{job.clientName}</p>
          <h2 className="mt-1 break-words text-base font-bold text-ink">{job.jobTitle}</h2>
        </div>
        {job.status ? <Badge tone="green">{job.status}</Badge> : <Badge tone="yellow">Status missing</Badge>}
      </div>
      <div className="mt-3 grid gap-1 text-sm text-steel">
        <p>{job.address || "Address missing"}</p>
        <p>{job.startDate ? new Date(job.startDate).toLocaleString() : "Schedule missing"}</p>
        <p>{typeof job.total === "number" ? currency(job.total) : typeof job.quoteAmount === "number" ? `${currency(job.quoteAmount)} quote` : "Value missing"}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link className="text-sm font-semibold text-pine" href={`/jobber/jobs/${encodeURIComponent(job.id)}`}>Open details</Link>
        {job.jobberUrl ? <a className="inline-flex items-center gap-1 text-sm font-semibold text-pine" href={job.jobberUrl} target="_blank" rel="noreferrer">Open Jobber <ExternalLink className="h-3 w-3" /></a> : null}
      </div>
    </article>
  );
}

function PipelineRecord({ item, collection }: { item: JobberPipelineItem; collection: Collection }) {
  const detailHref = collection === "clients" ? `/jobber/clients/${encodeURIComponent(item.id)}` : undefined;

  return (
    <article className="rounded-md border border-ink/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="break-words text-base font-bold text-ink">{item.title}</h2>
        {item.status ? <Badge tone="blue">{item.status}</Badge> : null}
      </div>
      <div className="mt-3 grid gap-1 text-sm text-steel">
        {item.clientName ? <p>{item.clientName}</p> : null}
        {typeof item.amount === "number" ? <p>{currency(item.amount)}</p> : <p>Amount not returned</p>}
        {item.date ? <p>{new Date(item.date).toLocaleDateString()}</p> : <p>Date not returned</p>}
        {item.reason ? <p className="text-clay">{item.reason}</p> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {detailHref ? <Link className="text-sm font-semibold text-pine" href={detailHref}>Open details</Link> : null}
        {item.jobberUrl ? <a className="inline-flex items-center gap-1 text-sm font-semibold text-pine" href={item.jobberUrl} target="_blank" rel="noreferrer">Open Jobber <ExternalLink className="h-3 w-3" /></a> : null}
      </div>
    </article>
  );
}
