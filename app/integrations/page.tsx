"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, MessageSquareText, PlugZap, ShieldCheck } from "lucide-react";
import { Badge, Panel } from "@/components/ui";

type TwilioStatus = {
  connected: boolean;
  status: string;
  webhookUrl?: string;
  lastReceivedAt?: string | null;
  lastError?: string | null;
  lastLeadId?: string | null;
  twilio?: {
    accountSidConfigured: boolean;
    authTokenConfigured: boolean;
    phoneNumberConfigured: boolean;
    webhookUrl: string;
  } | null;
};

type QuickBooksStatus = {
  configured: boolean;
  connected: boolean;
  redirectUri?: string;
  environment?: string;
  hasClientId?: boolean;
  hasClientSecret?: boolean;
  sampleApi?: { ok: boolean; status: number; body?: string } | null;
};

type JobberStatus = {
  configured: boolean;
  connected: boolean;
  redirectUri?: string;
  lastGraphqlStatus?: string | null;
};

export default function IntegrationsPage() {
  const [twilio, setTwilio] = useState<TwilioStatus | null>(null);
  const [quickBooks, setQuickBooks] = useState<QuickBooksStatus | null>(null);
  const [jobber, setJobber] = useState<JobberStatus | null>(null);
  const [quickBooksMessage, setQuickBooksMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuickBooksMessage(params.get("quickbooks") ? params.get("message") : null);
    fetch("/api/integrations/twilio/status", { cache: "no-store" }).then((r) => r.json()).then(setTwilio).catch(() => setTwilio(null));
    fetch("/api/integrations/quickbooks/status", { cache: "no-store" }).then((r) => r.json()).then(setQuickBooks).catch(() => setQuickBooks(null));
    fetch("/api/integrations/jobber/status", { cache: "no-store" }).then((r) => r.json()).then(setJobber).catch(() => setJobber(null));
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-pine">
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>

      <header className="mb-6">
        <p className="text-sm font-semibold text-pine">Next Level Finishes</p>
        <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">Integrations</h1>
        <p className="mt-2 text-sm text-steel">Read-only and draft-only connections for the command center.</p>
      </header>

      <section className="grid gap-5 lg:grid-cols-2">
        <Panel title="Twilio SMS AI" action={<MessageSquareText className="h-4 w-4 text-pine" />}>
          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge tone={twilio?.twilio?.accountSidConfigured && twilio?.twilio?.authTokenConfigured ? "green" : "yellow"}>
                {twilio?.twilio?.accountSidConfigured && twilio?.twilio?.authTokenConfigured ? "Credentials configured" : "Needs Twilio credentials"}
              </Badge>
              <Badge tone="green">Draft only</Badge>
            </div>
            <p className="text-sm text-steel">Incoming Twilio texts create Lead Inbox records and AI reply drafts. Nothing sends automatically.</p>
            {twilio?.webhookUrl ? <CodeBlock label="Inbound SMS webhook URL" value={twilio.webhookUrl} /> : null}
            <Diag label="Last received" value={twilio?.lastReceivedAt ? new Date(twilio.lastReceivedAt).toLocaleString() : "Never"} />
            <Diag label="Last error" value={twilio?.lastError || "None"} bad={Boolean(twilio?.lastError)} />
            <div className="grid gap-2 sm:grid-cols-2">
              <Link className="inline-flex min-h-11 items-center justify-center rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white" href="/sms">Open SMS AI setup</Link>
              <Link className="inline-flex min-h-11 items-center justify-center rounded-md border border-ink/10 px-4 py-2 text-sm font-semibold text-ink" href="/leads">Open Lead Inbox</Link>
            </div>
          </div>
        </Panel>

        <Panel title="QuickBooks Online" action={<PlugZap className="h-4 w-4 text-pine" />}>
          <div className="grid gap-3">
            <Badge tone={quickBooks?.connected ? "green" : quickBooks?.configured ? "yellow" : "red"}>
              {quickBooks?.connected ? "Connected" : quickBooks?.configured ? "Ready to authorize" : "Needs credentials"}
            </Badge>
            {quickBooksMessage ? <p className="rounded-md bg-clay/10 p-3 text-sm font-semibold text-clay">{quickBooksMessage}</p> : null}
            {quickBooks?.redirectUri ? <CodeBlock label="QuickBooks redirect URI" value={quickBooks.redirectUri} /> : null}
            <Diag label="Environment" value={quickBooks?.environment || "sandbox"} />
            <Diag label="Client ID" value={quickBooks?.hasClientId ? "Configured" : "Missing"} bad={!quickBooks?.hasClientId} />
            <Diag label="Client secret" value={quickBooks?.hasClientSecret ? "Configured" : "Missing"} bad={!quickBooks?.hasClientSecret} />
            <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white" href="/api/integrations/quickbooks/connect">
              <ExternalLink className="h-4 w-4" /> Connect QuickBooks
            </a>
          </div>
        </Panel>

        <Panel title="Jobber" action={<ShieldCheck className="h-4 w-4 text-pine" />}>
          <div className="grid gap-3">
            <Badge tone={jobber?.connected ? "green" : "yellow"}>{jobber?.connected ? "Connected" : "Needs attention"}</Badge>
            {jobber?.redirectUri ? <CodeBlock label="Jobber redirect URI" value={jobber.redirectUri} /> : null}
            <Diag label="GraphQL status" value={jobber?.lastGraphqlStatus || "Not checked"} />
            <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white" href="/api/integrations/jobber/connect">Connect Jobber</a>
          </div>
        </Panel>

        <Panel title="Meta Leads">
          <div className="grid gap-3 text-sm text-steel">
            <p>Meta Lead Ads webhook receiver is installed. Leads will enter the Lead Inbox and create draft-only replies when configured.</p>
            <Link className="font-semibold text-pine" href="/leads">Open Lead Inbox</Link>
          </div>
        </Panel>
      </section>
    </main>
  );
}

function CodeBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-ink">{label}</p>
      <code className="mt-1 block max-w-full overflow-x-auto break-all rounded-md bg-ink p-3 text-xs text-white">{value}</code>
    </div>
  );
}

function Diag({ label, value, bad = false }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="min-w-0 rounded-md bg-primer/60 p-3 text-xs">
      <p className="font-semibold uppercase text-steel">{label}</p>
      <p className={bad ? "break-words font-semibold text-clay" : "break-words text-ink"}>{value}</p>
    </div>
  );
}
