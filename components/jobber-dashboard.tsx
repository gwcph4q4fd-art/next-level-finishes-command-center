"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { Badge, Panel, buttonClass } from "@/components/ui";
import { currency } from "@/lib/utils";
import type { JobberCommandCenterData, JobberJobCard, JobberPipelineItem } from "@/lib/jobber-sync";

type JobberStatus = {
  connected: boolean;
  hasAccessToken: boolean;
  hasRefreshToken?: boolean;
  accountName?: string;
  accountId?: string;
  expiresAt?: string | null;
  tokenExpired?: boolean | null;
  lastSyncAt?: string | null;
  cacheSyncedAt?: string | null;
  cacheStale?: boolean;
  refreshStatus?: string;
  lastRefreshAttemptAt?: string | null;
  lastRefreshError?: string | null;
  lastGraphqlStatus?: string | null;
  lastSyncError?: string | null;
  scopes?: string | null;
  apiHealthy?: boolean;
};

const pipelineLabels: Array<[keyof JobberCommandCenterData["pipeline"], string]> = [
  ["newRequests", "New Requests / Leads"],
  ["quotesSent", "Quotes Sent"],
  ["awaitingApproval", "Awaiting Approval"],
  ["upcomingJobs", "Upcoming Jobs"],
  ["completedButUnpaid", "Completed but Unpaid"],
  ["followUpNeeded", "Follow-Up Needed"]
];

const agentQuestions = [
  "What should I focus on today?",
  "Which clients should I follow up with?",
  "What jobs look risky?",
  "Where is my pipeline weak?",
  "What should I advertise this week?"
];

export function JobberDashboard() {
  const [status, setStatus] = useState<JobberStatus | null>(null);
  const [data, setData] = useState<JobberCommandCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");

  async function loadStatus() {
    const response = await fetch("/api/integrations/jobber/status", { cache: "no-store" });
    const nextStatus = await response.json();
    setStatus(nextStatus);
    return nextStatus as JobberStatus;
  }

  async function loadJobber(force = false) {
    setError("");
    if (force) setSyncing(true);
    const nextStatus = await loadStatus();

    if (!nextStatus.connected || !nextStatus.hasAccessToken) {
      setData(null);
      setError("Jobber is not connected according to the backend status check.");
      setLoading(false);
      setSyncing(false);
      return;
    }

    const response = await fetch(`/api/integrations/jobber/sync${force ? "?force=1" : ""}`, { cache: "no-store" });
    const nextData = await response.json();

    if (!response.ok) {
      setError(nextData.error || "Jobber sync failed.");
      setLoading(false);
      setSyncing(false);
      return;
    }

    setData(nextData);
    setLoading(false);
    setSyncing(false);
    await loadStatus();
  }

  useEffect(() => {
    loadJobber(false).catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : "Jobber sync failed.");
      setLoading(false);
      setSyncing(false);
    });
  }, []);

  const missingSummary = useMemo(() => {
    if (!data?.upcomingJobs.length) return ["No upcoming Jobber jobs were returned. Check whether jobs have start dates or visits scheduled."];
    const missing = [];
    if (data.upcomingJobs.some((job) => !job.address)) missing.push("Some jobs are missing property addresses.");
    if (data.upcomingJobs.some((job) => !job.phone && !job.email)) missing.push("Some jobs are missing client phone/email.");
    if (data.upcomingJobs.some((job) => !job.total && !job.quoteAmount)) missing.push("Some jobs are missing totals or quote amounts.");
    if (data.upcomingJobs.some((job) => !job.notes)) missing.push("Some jobs are missing prep notes/instructions.");
    return missing;
  }, [data]);

  function makeDraft(label: string, body: string) {
    setDraft(`${label}\n\n${body}\n\nBusiness voice: professional, friendly, direct, local contractor. Draft only. Do not send automatically.`);
  }

  return (
    <div className="grid gap-5">
      <Panel
        title="Jobber Command Center"
        action={
          <button className={buttonClass} onClick={() => loadJobber(true)} disabled={loading || syncing}>
            <RefreshCw className="h-4 w-4" />
            {syncing ? "Syncing..." : "Sync Jobber"}
          </button>
        }
      >
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-steel">
            {loading ? (
              <Badge>Checking Jobber</Badge>
            ) : status?.connected && status.hasAccessToken && status.apiHealthy !== false ? (
              <>
                <Badge tone="green">Jobber connected</Badge>
                {status.accountName ? <span>{status.accountName}</span> : null}
              </>
            ) : status?.connected && status.hasAccessToken ? (
              <Badge tone="red">Jobber API failing</Badge>
            ) : (
              <Badge tone="yellow">Jobber disconnected</Badge>
            )}
            {data?.syncedAt ? <span>Last synced {new Date(data.syncedAt).toLocaleString()}</span> : null}
            {data?.source === "cache" ? <Badge tone="blue">Cached</Badge> : null}
          </div>

          {status ? (
            <details className="rounded-md border border-ink/10 bg-primer/50 p-3 text-xs text-steel">
              <summary className="cursor-pointer text-sm font-semibold text-ink">Jobber diagnostics</summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                <Diagnostic label="Connected" value={status.connected ? "Yes" : "No"} />
                <Diagnostic label="Token expires" value={status.expiresAt ? new Date(status.expiresAt).toLocaleString() : "Missing"} tone={status.tokenExpired ? "bad" : "normal"} />
                <Diagnostic label="Refresh token" value={status.hasRefreshToken ? "Saved" : "Missing"} tone={status.hasRefreshToken ? "normal" : "bad"} />
                <Diagnostic label="API account id" value={status.accountId || "Missing"} />
                <Diagnostic label="Refresh status" value={status.refreshStatus || "Not checked"} tone={status.refreshStatus === "failed" || status.refreshStatus === "missing_refresh_token" ? "bad" : "normal"} />
                <Diagnostic label="Last refresh" value={status.lastRefreshAttemptAt ? new Date(status.lastRefreshAttemptAt).toLocaleString() : "Not checked"} />
                <Diagnostic label="Last sync" value={status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : "Never"} />
                <Diagnostic label="GraphQL status" value={status.lastGraphqlStatus || "Not checked"} tone={status.lastGraphqlStatus?.includes("401") ? "bad" : "normal"} />
                <Diagnostic label="Scopes/token payload" value={status.scopes || "Not exposed by token"} />
                <Diagnostic label="Scopes needed" value="Read clients, jobs, requests, quotes, invoices" />
                <Diagnostic label="Refresh error" value={status.lastRefreshError || "None"} tone={status.lastRefreshError ? "bad" : "normal"} />
                <Diagnostic label="Last sync error" value={status.lastSyncError || "None"} tone={status.lastSyncError ? "bad" : "normal"} />
              </div>
            </details>
          ) : null}

          {error ? <p className="rounded-md bg-clay/10 p-3 text-sm text-clay">{error}</p> : null}

          {data?.errors.length ? (
            <div className="rounded-md border border-moss/30 bg-moss/10 p-3">
              <p className="text-sm font-semibold text-ink">Some Jobber sections could not sync</p>
              <div className="mt-2 grid gap-1 text-xs text-steel">
                {data.errors.map((item) => <p key={item}>{item}</p>)}
              </div>
            </div>
          ) : null}

          {missingSummary.length ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {missingSummary.map((item) => (
                <div key={item} className="flex gap-2 rounded-md border border-ink/10 bg-primer/60 p-3 text-sm text-steel">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
                  {item}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Panel>

      {loading ? <Panel title="Loading Jobber Data"><p className="text-sm text-steel">Checking the saved Jobber connection and refreshing data when the cache is older than 15 minutes...</p></Panel> : null}

      {data ? (
        <>
          <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <Panel title="Upcoming Jobber Jobs" action={<Link href="/jobber/jobs" className="text-sm font-semibold text-pine">View all</Link>}>
              <div className="grid gap-4">
                {data.upcomingJobs.length ? data.upcomingJobs.map((job) => <JobCard key={job.id} job={job} />) : (
                  <EmptyState text="No upcoming jobs came back from Jobber. If work exists, check that jobs have start dates or scheduled visits." />
                )}
              </div>
            </Panel>

            <Panel title="Business Agent">
              <div className="grid gap-3">
                {agentQuestions.map((question) => (
                  <AgentButton key={question} question={question} data={data} onDraft={makeDraft} />
                ))}
                {draft ? <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-ink p-4 text-xs leading-relaxed text-white">{draft}</pre> : null}
              </div>
            </Panel>
          </section>

          <Panel title="Jobber Pipeline">
            <div className="mb-4 flex flex-wrap gap-2 text-sm font-semibold text-pine">
              <Link href="/jobber/clients">Clients</Link>
              <Link href="/jobber/requests">Requests</Link>
              <Link href="/jobber/quotes">Quotes</Link>
              <Link href="/jobber/invoices">Invoices</Link>
              <Link href="/jobber/jobs">Jobs</Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pipelineLabels.map(([key, title]) => (
                <PipelineColumn key={key} title={title} items={data.pipeline[key]} />
              ))}
            </div>
          </Panel>
        </>
      ) : null}
    </div>
  );
}

function JobCard({ job }: { job: JobberJobCard }) {
  return (
    <article className="rounded-md border border-ink/10 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-steel">{job.clientName}</p>
          <h3 className="mt-1 break-words text-lg font-bold text-ink">{job.jobTitle}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {job.status ? <Badge tone="green">{job.status}</Badge> : <Badge tone="yellow">Status missing</Badge>}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-pine px-4 py-3 text-sm font-semibold text-white" href={`/jobber/jobs/${encodeURIComponent(job.id)}`}>
          Open job details
        </Link>
        {job.jobberUrl ? (
          <a className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink hover:border-pine/40" href={job.jobberUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
            Open in Jobber
          </a>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Fact icon={<CalendarDays />} label="Start" value={job.startDate ? new Date(job.startDate).toLocaleString() : "Missing"} />
        <Fact icon={<MapPin />} label="Address" value={job.address || "Missing"} />
        <Fact icon={<FileText />} label="Value" value={typeof job.total === "number" ? currency(job.total) : typeof job.quoteAmount === "number" ? `${currency(job.quoteAmount)} quote` : "Missing"} />
        <Fact icon={<Phone />} label="Phone" value={job.phone || "Missing"} />
        <Fact icon={<Mail />} label="Email" value={job.email || "Missing"} />
        <Fact icon={<RefreshCw />} label="Updated" value={job.lastUpdated ? new Date(job.lastUpdated).toLocaleString() : "Missing"} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-md bg-primer/70 p-3">
          <p className="text-xs font-semibold uppercase text-steel">Notes / Prep</p>
          <p className="mt-1 text-sm text-ink">{job.notes || "No Jobber instructions returned. Add prep notes before work starts."}</p>
        </div>
        <div className="rounded-md bg-pine/10 p-3">
          <p className="text-xs font-semibold uppercase text-pine">Recommended Action</p>
          <p className="mt-1 text-sm text-ink">{job.recommendedAction}</p>
        </div>
      </div>
    </article>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 gap-2 rounded-md bg-primer/60 p-3">
      <div className="mt-0.5 shrink-0 text-pine [&>svg]:h-4 [&>svg]:w-4">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase text-steel">{label}</p>
        <p className="break-words text-sm text-ink">{value}</p>
      </div>
    </div>
  );
}

function Diagnostic({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "bad" }) {
  return (
    <div className="min-w-0">
      <p className="font-semibold uppercase text-steel">{label}</p>
      <p className={tone === "bad" ? "break-words font-semibold text-clay" : "break-words text-ink"}>{value}</p>
    </div>
  );
}

function PipelineColumn({ title, items }: { title: string; items: JobberPipelineItem[] }) {
  return (
    <section className="rounded-md border border-ink/10 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <Badge>{String(items.length)}</Badge>
      </div>
      <div className="grid gap-2">
        {items.length ? items.map((item) => (
          <div key={item.id} className="rounded-md bg-primer/60 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="min-w-0 break-words text-sm font-semibold text-ink">{item.title}</p>
              {item.status ? <Badge tone="blue">{item.status}</Badge> : null}
            </div>
            {item.clientName ? <p className="mt-1 text-xs text-steel">{item.clientName}</p> : null}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-steel">
              {typeof item.amount === "number" ? <span>{currency(item.amount)}</span> : null}
              {item.date ? <span>{new Date(item.date).toLocaleDateString()}</span> : null}
              {item.jobberUrl ? <a className="font-semibold text-pine" href={item.jobberUrl} target="_blank" rel="noreferrer">Open in Jobber</a> : null}
            </div>
            {item.reason ? <p className="mt-2 text-xs text-clay">{item.reason}</p> : null}
          </div>
        )) : <EmptyState text="No records returned for this stage." />}
      </div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-ink/20 p-4 text-sm text-steel">{text}</p>;
}

function AgentButton({
  question,
  data,
  onDraft
}: {
  question: string;
  data: JobberCommandCenterData;
  onDraft: (label: string, body: string) => void;
}) {
  function answer() {
    if (question.includes("focus")) return data.agent.focusToday.join("\n");
    if (question.includes("follow")) return data.agent.followUpClients.length ? data.agent.followUpClients.join("\n") : "No urgent follow-ups were identified in synced Jobber data.";
    if (question.includes("risky")) return data.agent.riskyJobs.join("\n");
    if (question.includes("pipeline")) return data.agent.pipelineWeakness;
    return data.agent.advertisingIdea;
  }

  return (
    <button className="rounded-md border border-ink/10 bg-white p-3 text-left text-sm font-semibold text-ink transition hover:border-pine/40 hover:bg-pine/5" onClick={() => onDraft(question, answer())}>
      <Sparkles className="mb-2 h-4 w-4 text-pine" />
      {question}
    </button>
  );
}
