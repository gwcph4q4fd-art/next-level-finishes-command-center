"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, KeyRound, PlugZap, ShieldCheck } from "lucide-react";
import { Badge, Panel } from "@/components/ui";

const setupSections = [
  {
    name: "Jobber",
    mode: "Read-only first",
    purpose: "Pull jobs, clients, quotes, invoices, and schedule into the command center.",
    needed: ["Jobber developer app", "OAuth client ID and secret", "Read scopes for clients, jobs, quotes, invoices, and schedule"],
    safety: "No create or edit permissions will be requested until you explicitly approve write access later."
  },
  {
    name: "QuickBooks Online",
    mode: "Read-only first",
    purpose: "Pull cash balance snapshots, invoices, expenses, bills, and profit/loss summaries.",
    needed: ["Intuit developer app", "OAuth client ID and secret", "Accounting read scopes", "Company ID after authorization"],
    safety: "No create, edit, delete, send, or payment actions will be enabled."
  },
  {
    name: "Meta Leads",
    mode: "Inbound lead capture",
    purpose: "Receive Facebook and Instagram lead form submissions into the Lead Inbox.",
    needed: ["Meta app", "Page access", "Lead Ads webhook subscription", "Webhook verify token"],
    safety: "New Meta leads enter as inbox records and AI reply drafts only."
  },
  {
    name: "Twilio SMS",
    mode: "Draft-only messaging",
    purpose: "Receive customer texts and prepare owner-approved reply drafts.",
    needed: ["Twilio account SID", "Auth token or API key", "Messaging phone number", "Inbound webhook URL"],
    safety: "Outbound sending remains disabled until an explicit approve-and-send workflow is built."
  }
];

export default function IntegrationsPage() {
  const [jobberStatus, setJobberStatus] = useState<{
    connected: boolean;
    configured: boolean;
    apiHealthy?: boolean;
    hasAccessToken?: boolean;
    hasRefreshToken?: boolean;
    expiresAt?: string | null;
    lastSyncAt?: string | null;
    lastSyncError?: string | null;
    refreshStatus?: string | null;
    lastRefreshError?: string | null;
    lastGraphqlStatus?: string | null;
    accountName?: string;
    accountId?: string;
    connectedAt?: string;
    redirectUri?: string;
    sampleGraphql?: {
      ok: boolean;
      status: number;
      version?: string | null;
      body?: string;
    };
  } | null>(null);

  useEffect(() => {
    fetch("/api/integrations/jobber/status")
      .then((response) => response.json())
      .then(setJobberStatus)
      .catch(() => setJobberStatus(null));
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <a href="/" className="text-sm font-semibold text-pine">Dashboard</a>
        <h1 className="mt-2 text-3xl font-bold text-ink">Integration Setup</h1>
        <p className="mt-2 text-sm text-steel">
          Setup sections for the next phase. These integrations are not connected yet, and each starts read-only or draft-only.
        </p>
      </header>

      <section className="grid gap-5 md:grid-cols-2">
        {setupSections.map((integration) => (
          <Panel key={integration.name} title={integration.name} action={<PlugZap className="h-4 w-4 text-pine" />}>
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="blue">{integration.mode}</Badge>
                {integration.name === "Jobber" && jobberStatus?.connected ? <Badge tone="green">API connected</Badge> : null}
                {integration.name === "Jobber" && jobberStatus && !jobberStatus.connected && jobberStatus.hasAccessToken ? <Badge tone="red">API failing</Badge> : null}
                {integration.name === "Jobber" && jobberStatus && !jobberStatus.configured ? <Badge tone="yellow">Needs credentials</Badge> : null}
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Goal</p>
                <p className="mt-1 text-sm text-steel">{integration.purpose}</p>
              </div>
              {integration.name === "Jobber" ? (
                <JobberSetup status={jobberStatus} />
              ) : null}
              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                  <KeyRound className="h-4 w-4 text-pine" />
                  Setup Needed
                </p>
                <div className="grid gap-2">
                  {integration.needed.map((item) => (
                    <p key={item} className="flex gap-2 rounded-md bg-primer/60 p-3 text-sm text-ink">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-pine" />
                      {item}
                    </p>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 rounded-md bg-pine/10 p-3 text-sm text-pine">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{integration.safety}</p>
              </div>
            </div>
          </Panel>
        ))}
      </section>
    </main>
  );
}

function JobberSetup({
  status
}: {
  status: {
    connected: boolean;
    configured: boolean;
    apiHealthy?: boolean;
    hasAccessToken?: boolean;
    hasRefreshToken?: boolean;
    expiresAt?: string | null;
    lastSyncAt?: string | null;
    lastSyncError?: string | null;
    refreshStatus?: string | null;
    lastRefreshError?: string | null;
    lastGraphqlStatus?: string | null;
    accountName?: string;
    accountId?: string;
    connectedAt?: string;
    redirectUri?: string;
    sampleGraphql?: {
      ok: boolean;
      status: number;
      version?: string | null;
      body?: string;
    };
  } | null;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-ink/10 p-3">
      <div>
        <p className="text-sm font-semibold text-ink">Connection Status</p>
        <p className="mt-1 text-sm text-steel">
          {!status
            ? "Checking Jobber setup..."
            : status.connected
              ? `API verified for ${status.accountName || "Jobber"}`
              : status.configured
                ? status.hasAccessToken
                  ? "Jobber has saved tokens, but the API test is failing."
                  : "Ready to authorize with Jobber."
                : "Add Jobber credentials in Vercel before connecting."}
        </p>
      </div>

      {status ? (
        <div className="grid gap-2 rounded-md bg-primer/60 p-3 text-xs text-steel">
          <Diag label="GraphQL test" value={status.sampleGraphql ? `${status.sampleGraphql.status} ${status.sampleGraphql.ok ? "OK" : "FAILED"}` : "Not checked"} bad={!status.sampleGraphql?.ok} />
          <Diag label="Access token" value={status.hasAccessToken ? "Saved" : "Missing"} bad={!status.hasAccessToken} />
          <Diag label="Refresh token" value={status.hasRefreshToken ? "Saved" : "Missing"} bad={!status.hasRefreshToken} />
          <Diag label="Token expires" value={status.expiresAt ? new Date(status.expiresAt).toLocaleString() : "Missing"} bad={!status.expiresAt} />
          <Diag label="API account id" value={status.accountId || "Missing"} bad={!status.accountId} />
          <Diag label="Last sync" value={status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : "Never"} />
          <Diag label="Last sync error" value={status.lastSyncError || "None"} bad={Boolean(status.lastSyncError)} />
          <Diag label="Refresh status" value={status.refreshStatus || "Not checked"} bad={status.refreshStatus === "failed" || status.refreshStatus === "missing_refresh_token"} />
          <Diag label="Refresh error" value={status.lastRefreshError || "None"} bad={Boolean(status.lastRefreshError)} />
          <Diag label="Last GraphQL status" value={status.lastGraphqlStatus || "Not checked"} bad={status.lastGraphqlStatus?.includes("401")} />
          {!status.sampleGraphql?.ok ? (
            <div>
              <p className="font-semibold uppercase text-steel">Exact failure reason</p>
              <p className="break-words font-semibold text-clay">
                {status.sampleGraphql?.status === 401
                  ? `Jobber returned 401. ${status.sampleGraphql.body || "No response body returned."}`
                  : status.sampleGraphql?.body || "GraphQL test has not succeeded yet."}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {status?.redirectUri ? (
        <div>
          <p className="text-sm font-semibold text-ink">Jobber Redirect URI</p>
          <code className="mt-1 block overflow-x-auto rounded-md bg-ink p-3 text-xs text-white">{status.redirectUri}</code>
        </div>
      ) : null}

      {status?.connectedAt ? (
        <p className="text-xs text-steel">Connected at {new Date(status.connectedAt).toLocaleString()}</p>
      ) : null}

      <a
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90 aria-disabled:pointer-events-none aria-disabled:opacity-60"
        href="/api/integrations/jobber/connect"
        aria-disabled={!status?.configured}
      >
        <ExternalLink className="h-4 w-4" />
        {status?.hasAccessToken ? "Reauthorize Jobber" : "Connect Jobber"}
      </a>
    </div>
  );
}

function Diag({ label, value, bad = false }: { label: string; value: string; bad?: boolean }) {
  return (
    <div>
      <p className="font-semibold uppercase text-steel">{label}</p>
      <p className={bad ? "break-words font-semibold text-clay" : "break-words text-ink"}>{value}</p>
    </div>
  );
}
