"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquareText, RefreshCw, Sparkles } from "lucide-react";
import { Badge, Panel, buttonClass } from "@/components/ui";
import type { JobberCommandCenterData } from "@/lib/jobber-sync";
import { businessProfile } from "@/lib/business-profile";

const questions = [
  "What should I do today?",
  "Who should I follow up with?",
  "What quotes are most important?",
  "What jobs look risky?",
  "What should I advertise this week?",
  "What is missing from my pipeline?",
  "What should I text this client?",
  "What do I need to prep for upcoming jobs?",
  "What work should I prioritize to make money this week?"
];

export default function AgentPage() {
  const [data, setData] = useState<JobberCommandCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  async function load(force = false) {
    setLoading(true);
    setError("");
    const response = await fetch(`/api/jobber/snapshot${force ? "?force=1" : ""}`, { cache: "no-store" });
    const nextData = await response.json();
    if (!response.ok) {
      setError(nextData.error || "Unable to load synced business data.");
      setData(null);
    } else {
      setData(nextData);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function reply(question: string) {
    if (!data) return;

    const quoteFocus = data.quotes
      .filter((quote) => quote.reason || String(quote.status || "").toLowerCase().includes("awaiting"))
      .slice(0, 5)
      .map((quote) => `${quote.title} · ${quote.clientName || "client missing"} · ${quote.amount ? `$${quote.amount}` : "amount missing"}`);

    const prep = data.upcomingJobs.slice(0, 5).map((job) => `${job.jobTitle}: ${job.recommendedAction}`);
    const money = [...data.pipeline.completedButUnpaid, ...data.pipeline.awaitingApproval].slice(0, 5).map((item) => `${item.title}: ${item.reason || "Move this forward."}`);

    let body = "";
    if (question.includes("today")) body = data.agent.focusToday.join("\n");
    else if (question.includes("follow")) body = data.agent.followUpClients.length ? data.agent.followUpClients.join("\n") : "No clear follow-ups were returned from synced Jobber data.";
    else if (question.includes("quotes")) body = quoteFocus.length ? quoteFocus.join("\n") : "No high-priority quotes were returned. If quotes exist in Jobber, check permissions and sync again.";
    else if (question.includes("risky")) body = data.agent.riskyJobs.join("\n");
    else if (question.includes("advertise")) body = data.agent.advertisingIdea;
    else if (question.includes("pipeline")) body = data.agent.pipelineWeakness;
    else if (question.includes("text")) body = "Pick the client from Jobs or Clients, then use the draft action there. Suggested structure: friendly opener, job-specific detail, one clear scheduling or approval question.";
    else if (question.includes("prep")) body = prep.length ? prep.join("\n") : "No upcoming jobs were returned to prep.";
    else body = money.length ? money.join("\n") : "No money-moving quote or unpaid invoice priority was returned.";

    setAnswer(`${question}\n\n${body}\n\nDraft/approval safety: I can draft texts, follow-ups, quote notes, prep checklists, social posts, and ad ideas. I will not send, publish, edit Jobber, or change invoices without approval.`);
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-pine">
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <button className={buttonClass} onClick={() => load(true)} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          Refresh synced data
        </button>
      </div>

      <Panel title="Next Level Finishes AI Agent" action={<Sparkles className="h-4 w-4 text-pine" />}>
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-steel">
          {data?.syncedAt ? <span>Using Jobber data synced {new Date(data.syncedAt).toLocaleString()}</span> : null}
          <Badge tone="yellow">QuickBooks not connected yet</Badge>
          <Badge tone="green">Draft-only actions</Badge>
        </div>
        <p className="mb-5 text-sm text-steel">
          This agent uses {businessProfile.business}, owner {businessProfile.owner}, services in {businessProfile.serviceAreas.join(", ")}, plus synced Jobber jobs, clients, requests, quotes, invoices, and schedule. QuickBooks, Meta, and SMS data will be added when connected.
        </p>

        {error ? <p className="rounded-md bg-clay/10 p-3 text-sm text-clay">{error}</p> : null}
        {loading ? <p className="rounded-md border border-dashed border-ink/20 p-4 text-sm text-steel">Loading synced business data...</p> : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {questions.map((question) => (
            <button key={question} className="rounded-md border border-ink/10 bg-white p-3 text-left text-sm font-semibold text-ink hover:border-pine/40 hover:bg-pine/5" onClick={() => reply(question)} disabled={!data}>
              <MessageSquareText className="mb-2 h-4 w-4 text-pine" />
              {question}
            </button>
          ))}
        </div>

        {answer ? <pre className="mt-5 whitespace-pre-wrap rounded-md bg-ink p-4 text-xs leading-relaxed text-white">{answer}</pre> : null}
      </Panel>
    </main>
  );
}
