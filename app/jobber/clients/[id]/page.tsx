"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, MessageSquareText, RefreshCw, Sparkles } from "lucide-react";
import { Badge, Panel } from "@/components/ui";
import { currency } from "@/lib/utils";
import type { JobberJobCard, JobberPipelineItem } from "@/lib/jobber-sync";

type ClientDetail = {
  client: JobberPipelineItem;
  jobs: JobberJobCard[];
  quotes: JobberPipelineItem[];
  invoices: JobberPipelineItem[];
  followUps: JobberPipelineItem[];
  syncedAt?: string | null;
};

export default function JobberClientDetailPage({ params }: { params: { id: string } }) {
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");

  useEffect(() => {
    fetch(`/api/jobber/clients/${encodeURIComponent(params.id)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load Jobber client.");
        setDetail(data);
      })
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Unable to load Jobber client."));
  }, [params.id]);

  function draftText(kind: string) {
    if (!detail) return;
    setDraft(
      `${kind}\n\nClient: ${detail.client.title}\nStatus: ${detail.client.status || "Not returned"}\nBalance/amount: ${typeof detail.client.amount === "number" ? currency(detail.client.amount) : "Not returned"}\n\nRecommended tone: friendly, direct, local contractor. Ask a clear next-step question. Draft only. Do not send automatically.`
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
      <Link href="/jobber/clients" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-pine">
        <ArrowLeft className="h-4 w-4" />
        Clients
      </Link>

      {error ? <Panel title="Client Not Loaded"><p className="text-sm text-clay">{error}</p></Panel> : null}
      {!detail && !error ? <Panel title="Loading Client"><p className="text-sm text-steel">Reading synced Jobber data...</p></Panel> : null}

      {detail ? (
        <div className="grid gap-5">
          <Panel
            title={detail.client.title}
            action={detail.client.jobberUrl ? (
              <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-ink/10 px-4 py-2 text-sm font-semibold text-pine" href={detail.client.jobberUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open Jobber
              </a>
            ) : null}
          >
            <div className="grid gap-3 md:grid-cols-3">
              <Fact label="Status" value={detail.client.status || "Not returned"} />
              <Fact label="Amount / balance" value={typeof detail.client.amount === "number" ? currency(detail.client.amount) : "Not returned"} />
              <Fact label="Last updated" value={detail.client.updatedAt ? new Date(detail.client.updatedAt).toLocaleString() : "Not returned"} />
            </div>
            {detail.client.reason ? <p className="mt-4 rounded-md bg-pine/10 p-3 text-sm text-ink">{detail.client.reason}</p> : null}
          </Panel>

          <section className="grid gap-5 lg:grid-cols-3">
            <RecordPanel title="Jobs" items={detail.jobs.map((job) => ({ id: job.id, title: job.jobTitle, status: job.status, amount: job.total || job.quoteAmount, date: job.startDate, jobberUrl: job.jobberUrl }))} />
            <RecordPanel title="Quotes" items={detail.quotes} />
            <RecordPanel title="Invoices" items={detail.invoices} />
          </section>

          <Panel title="Draft-Only Client Actions">
            <div className="grid gap-3 sm:grid-cols-3">
              {["Draft text to client", "Draft follow-up", "Draft quote/payment note"].map((action) => (
                <button key={action} className="rounded-md border border-ink/10 bg-white p-3 text-left text-sm font-semibold text-ink hover:border-pine/40 hover:bg-pine/5" onClick={() => draftText(action)}>
                  <MessageSquareText className="mb-2 h-4 w-4 text-pine" />
                  {action}
                </button>
              ))}
            </div>
            {draft ? <pre className="mt-4 max-w-full overflow-auto whitespace-pre-wrap rounded-md bg-ink p-4 text-xs leading-relaxed text-white">{draft}</pre> : null}
          </Panel>
        </div>
      ) : null}
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink/10 p-3">
      <p className="text-xs font-semibold uppercase text-steel">{label}</p>
      <p className="mt-1 break-words text-sm text-ink">{value}</p>
    </div>
  );
}

function RecordPanel({ title, items }: { title: string; items: JobberPipelineItem[] }) {
  return (
    <Panel title={title}>
      <div className="grid gap-2">
        {items.length ? items.map((item) => (
          <div key={item.id} className="min-w-0 rounded-md bg-primer/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="break-words text-sm font-semibold text-ink">{item.title}</p>
              {item.status ? <Badge tone="blue">{item.status}</Badge> : null}
            </div>
            <p className="mt-1 text-xs text-steel">{typeof item.amount === "number" ? currency(item.amount) : "Amount not returned"}</p>
          </div>
        )) : <p className="rounded-md border border-dashed border-ink/20 p-4 text-sm text-steel">No synced {title.toLowerCase()} for this client.</p>}
      </div>
    </Panel>
  );
}
