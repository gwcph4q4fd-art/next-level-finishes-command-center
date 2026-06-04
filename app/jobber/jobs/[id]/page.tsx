"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ExternalLink, FileText, Mail, MapPin, MessageSquareText, Phone, Sparkles } from "lucide-react";
import { Badge, Panel, buttonClass } from "@/components/ui";
import { currency } from "@/lib/utils";
import type { JobberJobCard, JobberPipelineItem } from "@/lib/jobber-sync";

type JobDetail = {
  job: JobberJobCard;
  relatedQuotes: JobberPipelineItem[];
  relatedInvoices: JobberPipelineItem[];
  syncedAt?: string | null;
  recommendedNextAction: string;
};

const actionDrafts = [
  ["Draft text to client", "Confirm schedule, access, colors/stain, pets, parking, and anything that must be moved before arrival."],
  ["Draft follow-up", "Send a friendly check-in after estimate, quote, job completion, or unpaid invoice."],
  ["Draft job prep checklist", "Create an internal checklist for materials, masking, sanding, primers, hardware, ladders, and cleanup."],
  ["Draft social post", "Turn finished work into a local before-and-after style post without naming the client unless approved."],
  ["Draft estimate notes", "Convert job observations into quote notes and scope reminders."]
];

export default function JobberJobDetailPage({ params }: { params: { id: string } }) {
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");

  useEffect(() => {
    fetch(`/api/jobber/jobs/${encodeURIComponent(params.id)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load Jobber job.");
        setDetail(data);
      })
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Unable to load Jobber job."));
  }, [params.id]);

  function buildDraft(label: string, instruction: string) {
    if (!detail) return;
    const job = detail.job;
    setDraft(
      `${label}\n\nClient: ${job.clientName}\nJob: ${job.jobTitle}\nStatus: ${job.status || "Not provided"}\nAddress: ${job.address || "Missing from synced Jobber data"}\nStart: ${job.startDate ? new Date(job.startDate).toLocaleString() : "Not scheduled"}\n\nDraft guidance: ${instruction}\n\nSuggested next action: ${detail.recommendedNextAction}\n\nSafety: Draft only. Do not send or update Jobber automatically.`
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
      <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-pine">
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      {error ? (
        <Panel title="Job Not Loaded">
          <p className="text-sm text-clay">{error}</p>
          <p className="mt-2 text-sm text-steel">Run Sync Jobber from the dashboard, then open this job again.</p>
        </Panel>
      ) : null}

      {!detail && !error ? <Panel title="Loading Jobber Job"><p className="text-sm text-steel">Pulling the synced job record...</p></Panel> : null}

      {detail ? (
        <div className="grid gap-5">
          <Panel
            title={detail.job.jobTitle}
            action={detail.job.jobberUrl ? (
              <a className={buttonClass} href={detail.job.jobberUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open Jobber
              </a>
            ) : null}
          >
            <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="green">{detail.job.status || "Status missing"}</Badge>
                  {detail.syncedAt ? <span className="text-xs text-steel">Synced {new Date(detail.syncedAt).toLocaleString()}</span> : null}
                </div>
                <Info icon={<Sparkles />} label="Recommended next action" value={detail.recommendedNextAction} />
                <Info icon={<MapPin />} label="Address" value={detail.job.address || "Missing from synced Jobber data"} />
                <Info icon={<CalendarDays />} label="Schedule" value={detail.job.startDate ? `${new Date(detail.job.startDate).toLocaleString()}${detail.job.endDate ? ` to ${new Date(detail.job.endDate).toLocaleString()}` : ""}` : "No schedule returned"} />
                <Info icon={<FileText />} label="Notes" value={detail.job.notes || "No Jobber instructions/notes returned. Add prep notes before the crew goes out."} />
              </div>
              <div className="grid gap-3 rounded-md bg-primer/70 p-4">
                <p className="text-sm font-semibold text-ink">Client</p>
                <p className="text-lg font-bold text-ink">{detail.job.clientName}</p>
                <Info icon={<Phone />} label="Phone" value={detail.job.phone || "Missing"} compact />
                <Info icon={<Mail />} label="Email" value={detail.job.email || "Missing"} compact />
                <div className="grid grid-cols-2 gap-2">
                  <Money label="Job total" value={detail.job.total} />
                  <Money label="Quote amount" value={detail.job.quoteAmount} />
                </div>
                <p className="text-xs text-steel">Last updated {detail.job.lastUpdated ? new Date(detail.job.lastUpdated).toLocaleString() : "not returned"}</p>
              </div>
            </div>
          </Panel>

          <section className="grid gap-5 lg:grid-cols-2">
            <Panel title="Related Quotes">
              <RelatedItems items={detail.relatedQuotes} empty="No related quotes found in the synced cache." />
            </Panel>
            <Panel title="Related Invoices / Payment Status">
              <RelatedItems items={detail.relatedInvoices} empty="No related invoices found in the synced cache." />
            </Panel>
          </section>

          <Panel title="Draft-Only Actions">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {actionDrafts.map(([label, instruction]) => (
                <button key={label} className="rounded-md border border-ink/10 bg-white p-3 text-left text-sm font-semibold text-ink transition hover:border-pine/40 hover:bg-pine/5" onClick={() => buildDraft(label, instruction)}>
                  <MessageSquareText className="mb-2 h-4 w-4 text-pine" />
                  {label}
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

function Info({ icon, label, value, compact = false }: { icon: React.ReactNode; label: string; value: string; compact?: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 text-pine [&>svg]:h-4 [&>svg]:w-4">{icon}</div>
      <div>
        <p className="text-xs font-semibold uppercase text-steel">{label}</p>
        <p className={compact ? "text-sm text-ink" : "text-sm leading-relaxed text-ink"}>{value}</p>
      </div>
    </div>
  );
}

function Money({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="rounded-md border border-ink/10 p-3">
      <p className="text-xs text-steel">{label}</p>
      <p className="text-sm font-bold text-ink">{typeof value === "number" ? currency(value) : "Missing"}</p>
    </div>
  );
}

function RelatedItems({ items, empty }: { items: JobberPipelineItem[]; empty: string }) {
  if (!items.length) return <p className="rounded-md border border-dashed border-ink/20 p-4 text-sm text-steel">{empty}</p>;

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-md border border-ink/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">{item.title}</p>
            {item.status ? <Badge tone="blue">{item.status}</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-steel">{typeof item.amount === "number" ? currency(item.amount) : "Amount missing"}</p>
        </div>
      ))}
    </div>
  );
}
