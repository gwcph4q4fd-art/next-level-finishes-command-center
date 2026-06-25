"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, MessageSquareText, RefreshCw } from "lucide-react";
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
    <main className="mx-auto min-h-screen max-w-6xl px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-pine">
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <button className={`${buttonClass} w-full sm:w-auto`} onClick={() => load(true)} disabled={loading}>
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
    <article className="min-w-0 rounded-md border border-ink/10 bg-white p-4 transition hover:border-pine/40 hover:shadow-soft">
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
      <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
        <Link className="inline-flex min-h-11 items-center justify-center rounded-md bg-pine px-4 py-2 text-center text-sm font-semibold text-white" href={`/jobber/jobs/${encodeURIComponent(job.id)}`}>Open details</Link>
        {job.jobberUrl ? <a className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-ink/10 px-4 py-2 text-center text-sm font-semibold text-ink" href={job.jobberUrl} target="_blank" rel="noreferrer">Open Jobber <ExternalLink className="h-3 w-3" /></a> : null}
      </div>
    </article>
  );
}

function PipelineRecord({ item, collection }: { item: JobberPipelineItem; collection: Collection }) {
  const detailHref = `/jobber/${collection}/${encodeURIComponent(item.id)}`;

  return (
    <article className="min-w-0 rounded-md border border-ink/10 bg-white p-4 transition hover:border-pine/40 hover:shadow-soft">
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
      <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
        <Link className="inline-flex min-h-11 items-center justify-center rounded-md bg-pine px-4 py-2 text-center text-sm font-semibold text-white" href={detailHref}>Open details</Link>
        {item.jobberUrl ? <a className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-ink/10 px-4 py-2 text-center text-sm font-semibold text-ink" href={item.jobberUrl} target="_blank" rel="noreferrer">Open Jobber <ExternalLink className="h-3 w-3" /></a> : null}
      </div>
    </article>
  );
}

export function JobberPipelineDetailPage({ collection, id }: { collection: Exclude<Collection, "jobs" | "clients">; id: string }) {
  const [data, setData] = useState<JobberCommandCenterData | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");

  useEffect(() => {
    fetch("/api/jobber/snapshot", { cache: "no-store" })
      .then(async (response) => {
        const nextData = await response.json();
        if (!response.ok) throw new Error(nextData.error || "Unable to load Jobber data.");
        setData(nextData);
      })
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Unable to load Jobber data."));
  }, []);

  const item = useMemo(() => {
    if (!data) return null;
    const records =
      collection === "quotes" ? data.quotes :
      collection === "invoices" ? data.invoices :
      data.requests;
    return records.find((record) => record.id === decodeURIComponent(id)) || null;
  }, [collection, data, id]);

  function draftAction(kind: string) {
    if (!item) return;
    setDraft(
      `${kind}\n\nRecord: ${item.title}\nClient: ${item.clientName || "Not returned"}\nStatus: ${item.status || "Not returned"}\nAmount: ${typeof item.amount === "number" ? currency(item.amount) : "Not returned"}\nDate: ${item.date ? new Date(item.date).toLocaleDateString() : "Not returned"}\n\nWrite this like Rueben from Next Level Finishes: friendly, direct, professional, local contractor voice. Draft only. Do not send or update Jobber.`
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
      <Link href={`/jobber/${collection}`} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-pine">
        <ArrowLeft className="h-4 w-4" />
        Back to {titles[collection]}
      </Link>

      {error ? <Panel title="Record Not Loaded"><p className="text-sm text-clay">{error}</p></Panel> : null}
      {!data && !error ? <Panel title="Loading Jobber Record"><p className="text-sm text-steel">Reading synced Jobber data...</p></Panel> : null}
      {data && !item ? (
        <Panel title="Record Missing">
          <p className="text-sm text-steel">This {collection.slice(0, -1)} is not in the synced Jobber cache yet. Run Sync Jobber, then open it again.</p>
        </Panel>
      ) : null}

      {item ? (
        <div className="grid gap-5">
          <Panel
            title={item.title}
            action={item.jobberUrl ? (
              <a className="inline-flex min-h-10 items-center gap-2 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white" href={item.jobberUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open Jobber
              </a>
            ) : null}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailFact label="Client" value={item.clientName || "Not returned"} />
              <DetailFact label="Status" value={item.status || "Not returned"} />
              <DetailFact label="Amount" value={typeof item.amount === "number" ? currency(item.amount) : "Not returned"} />
              <DetailFact label="Date" value={item.date ? new Date(item.date).toLocaleDateString() : "Not returned"} />
              <DetailFact label="Last updated" value={item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "Not returned"} />
              <DetailFact label="Sync reason" value={item.reason || "No warning returned"} />
            </div>
          </Panel>

          <Panel title="Recommended Next Action">
            <p className="text-sm text-ink">{recommendedAction(collection, item)}</p>
          </Panel>

          <Panel title="Draft-Only Actions">
            <div className="grid gap-3 sm:grid-cols-3">
              {["Draft follow-up", "Draft client text", "Draft internal note"].map((action) => (
                <button key={action} className="rounded-md border border-ink/10 bg-white p-3 text-left text-sm font-semibold text-ink hover:border-pine/40 hover:bg-pine/5" onClick={() => draftAction(action)}>
                  <MessageSquareText className="mb-2 h-4 w-4 text-pine" />
                  {action}
                </button>
              ))}
            </div>
            {draft ? <pre className="mt-4 whitespace-pre-wrap rounded-md bg-ink p-4 text-xs leading-relaxed text-white">{draft}</pre> : null}
          </Panel>
        </div>
      ) : null}
    </main>
  );
}

function DetailFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink/10 bg-primer/60 p-3">
      <p className="text-xs font-semibold uppercase text-steel">{label}</p>
      <p className="mt-1 break-words text-sm text-ink">{value}</p>
    </div>
  );
}

function recommendedAction(collection: Exclude<Collection, "jobs" | "clients">, item: JobberPipelineItem) {
  if (collection === "quotes") return "Follow up with a short, direct message asking whether they want to get on the schedule and whether any scope changed.";
  if (collection === "invoices") return typeof item.amount === "number" && item.amount > 0
    ? "Check whether this invoice has a balance due, then draft a polite payment reminder before doing any new work."
    : "Review the invoice status in Jobber and confirm whether anything needs collection or follow-up.";
  return "Respond quickly, ask for the project address, photos, timing, and the best day for an estimate.";
}
