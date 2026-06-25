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
  const [quickBooksMessage, setQuickBooksMessage] = useState<string | null>(null);
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
  const [quickBooksStatus, setQuickBooksStatus] = useState<{
    configured: boolean;
    connected: boolean;
    hasAccessToken?: boolean;
    hasRefreshToken?: boolean;
    expiresAt?: string | null;
    companyName?: string;
    realmId?: string;
    lastSyncAt?: string | null;
    lastSyncError?: string | null;
    lastRefreshStatus?: string | null;
    lastRefreshError?: string | null;
    lastApiStatus?: string | null;
    scope?: string;
    redirectUri?: string;
    environment?: string;
    hasClientId?: boolean;
    hasClientSecret?: boolean;
    sampleApi?: {
      ok: boolean;
      status: number;
      body?: string;
      companyName?: string;
      companyId?: string;
    } | null;
  } | null>(null);
  const [metaStatus, setMetaStatus] = useState<InboundStatus | null>(null);
  const [twilioStatus, setTwilioStatus] = useState<InboundStatus | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuickBooksMessage(params.get("quickbooks") ? params.get("message") : null);

    fetch("/api/integrations/jobber/status")
      .then((response) => response.json())
      .then(setJobberStatus)
      .catch(() => setJobberStatus(null));
    fetch("/api/integrations/quickbooks/status")
      .then((response) => response.json())
      .then(setQuickBooksStatus)
      .catch(() => setQuickBooksStatus(null));
    fetch("/api/integrations/meta/status")
      .then((response) => response.json())
      .then(setMetaStatus)
      .catch(() => setMetaStatus(null));
    fetch("/api/integrations/twilio/status")
      .then((response) => response.json())
      .then(setTwilioStatus)
      .catch(() => setTwilioStatus(null));
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <header className="mb-6">
        <a href="/" className="text-sm font-semibold text-pine">Dashboard</a>
        <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">Integration Setup</h1>
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
                {integration.name === "QuickBooks Online" && quickBooksStatus?.connected ? <Badge tone="green">API connected</Badge> : null}
                {integration.name === "QuickBooks Online" && quickBooksStatus && !quickBooksStatus.connected && quickBooksStatus.hasAccessToken ? <Badge tone="red">API failing</Badge> : null}
                {integration.name === "QuickBooks Online" && quickBooksStatus && !quickBooksStatus.configured ? <Badge tone="yellow">Needs credentials</Badge> : null}
                {integration.name === "Meta Leads" && metaStatus?.connected ? <Badge tone="green">Webhook ready</Badge> : null}
                {integration.name === "Twilio SMS" && twilioStatus?.connected ? <Badge tone="green">Webhook ready</Badge> : null}
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Goal</p>
                <p className="mt-1 text-sm text-steel">{integration.purpose}</p>
              </div>
              {integration.name === "Jobber" ? (
                <JobberSetup status={jobberStatus} />
              ) : null}
              {integration.name === "QuickBooks Online" ? (
                <QuickBooksSetup status={quickBooksStatus} oauthMessage={quickBooksMessage} />
              ) : null}
              {integration.name === "Meta Leads" ? (
                <InboundSetup
                  name="Meta Lead Ads"
                  status={metaStatus}
                  configured={Boolean(metaStatus?.meta?.verifyTokenConfigured)}
                  missing="META_VERIFY_TOKEN is not set in Vercel yet."
                  instructions="Use this webhook URL in Meta Lead Ads. The verify token must match META_VERIFY_TOKEN."
                />
              ) : null}
              {integration.name === "Twilio SMS" ? (
                <InboundSetup
                  name="Twilio SMS"
                  status={twilioStatus}
                  configured={Boolean(twilioStatus?.twilio?.accountSidConfigured && twilioStatus?.twilio?.authTokenConfigured)}
                  missing="TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are not set in Vercel yet."
                  instructions="Use this webhook URL for incoming messages on your Twilio phone number. Incoming texts create Lead Inbox records and draft-only replies."
                />
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

type InboundStatus = {
  connected: boolean;
  status: string;
  lastSyncAt?: string | null;
  lastReceivedAt?: string | null;
  lastError?: string | null;
  lastLeadId?: string | null;
  webhookUrl?: string;
  meta?: {
    verifyTokenConfigured: boolean;
    pageAccessTokenConfigured: boolean;
    appSecretConfigured: boolean;
    webhookUrl: string;
  } | null;
  twilio?: {
    accountSidConfigured: boolean;
    authTokenConfigured: boolean;
    phoneNumberConfigured: boolean;
    webhookUrl: string;
  } | null;
};

function InboundSetup({
  name,
  status,
  configured,
  missing,
  instructions
}: {
  name: string;
  status: InboundStatus | null;
  configured: boolean;
  missing: string;
  instructions: string;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-ink/10 p-3">
      <div>
        <p className="text-sm font-semibold text-ink">Connection Status</p>
        <p className="mt-1 text-sm text-steel">
          {!status ? `Checking ${name} setup...` : configured ? `${name} receiver is ready in the app.` : missing}
        </p>
      </div>
      <div className="grid gap-2 rounded-md bg-primer/60 p-3 text-xs text-steel">
        <Diag label="App receiver" value={status?.connected ? status.status : configured ? "Ready for first webhook" : "Needs credentials"} bad={!configured} />
        <Diag label="Last received" value={status?.lastReceivedAt ? new Date(status.lastReceivedAt).toLocaleString() : "Never"} />
        <Diag label="Last error" value={status?.lastError || "None"} bad={Boolean(status?.lastError)} />
        <Diag label="Last lead id" value={status?.lastLeadId || "None yet"} />
        {status?.meta ? (
          <>
            <Diag label="Verify token" value={status.meta.verifyTokenConfigured ? "Configured" : "Missing"} bad={!status.meta.verifyTokenConfigured} />
            <Diag label="App secret" value={status.meta.appSecretConfigured ? "Configured" : "Optional but missing"} />
            <Diag label="Page token" value={status.meta.pageAccessTokenConfigured ? "Configured" : "Optional for later enrichment"} />
          </>
        ) : null}
        {status?.twilio ? (
          <>
            <Diag label="Account SID" value={status.twilio.accountSidConfigured ? "Configured" : "Missing"} bad={!status.twilio.accountSidConfigured} />
            <Diag label="Auth token" value={status.twilio.authTokenConfigured ? "Configured" : "Missing"} bad={!status.twilio.authTokenConfigured} />
            <Diag label="Phone number" value={status.twilio.phoneNumberConfigured ? "Configured" : "Optional but missing"} />
          </>
        ) : null}
      </div>
      {status?.webhookUrl ? (
        <div>
          <p className="text-sm font-semibold text-ink">{name} Webhook URL</p>
          <code className="mt-1 block max-w-full overflow-x-auto break-all rounded-md bg-ink p-3 text-xs text-white">{status.webhookUrl}</code>
          <p className="mt-2 text-xs text-steel">{instructions}</p>
        </div>
      ) : null}
      <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-ink/10 bg-white px-4 py-2 text-center text-sm font-semibold text-ink" href="/leads">
        Open Lead Inbox
      </a>
    </div>
  );
}

function QuickBooksSetup({
  status,
  oauthMessage
}: {
  status: {
    configured: boolean;
    connected: boolean;
    hasAccessToken?: boolean;
    hasRefreshToken?: boolean;
    expiresAt?: string | null;
    companyName?: string;
    realmId?: string;
    lastSyncAt?: string | null;
    lastSyncError?: string | null;
    lastRefreshStatus?: string | null;
    lastRefreshError?: string | null;
    lastApiStatus?: string | null;
    scope?: string;
    redirectUri?: string;
    environment?: string;
    hasClientId?: boolean;
    hasClientSecret?: boolean;
    sampleApi?: {
      ok: boolean;
      status: number;
      body?: string;
      companyName?: string;
      companyId?: string;
    } | null;
  } | null;
  oauthMessage?: string | null;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-ink/10 p-3">
      <div>
        <p className="text-sm font-semibold text-ink">Connection Status</p>
        <p className="mt-1 text-sm text-steel">
          {!status
            ? "Checking QuickBooks setup..."
            : status.connected
              ? `API verified for ${status.companyName || "QuickBooks Online"}`
              : status.configured
                ? status.hasAccessToken
                  ? "QuickBooks has saved tokens, but the API test is failing."
                  : "Ready to authorize with QuickBooks."
                : "Add QuickBooks credentials in Vercel before connecting."}
        </p>
      </div>

      {oauthMessage ? (
        <div className="rounded-md border border-clay/20 bg-clay/10 p-3">
          <p className="text-sm font-semibold text-clay">Latest QuickBooks OAuth error</p>
          <p className="mt-1 break-words text-sm text-clay">{oauthMessage}</p>
        </div>
      ) : null}

      {status ? (
        <div className="grid gap-2 rounded-md bg-primer/60 p-3 text-xs text-steel">
          <Diag label="Environment" value={status.environment || "sandbox"} />
          <Diag label="Client ID" value={status.hasClientId ? "Configured" : "Missing"} bad={!status.hasClientId} />
          <Diag label="Client secret" value={status.hasClientSecret ? "Configured" : "Missing"} bad={!status.hasClientSecret} />
          <Diag label="API test" value={status.sampleApi ? `${status.sampleApi.status} ${status.sampleApi.ok ? "OK" : "FAILED"}` : "Not checked"} bad={!status.sampleApi?.ok} />
          <Diag label="Access token" value={status.hasAccessToken ? "Saved" : "Missing"} bad={!status.hasAccessToken} />
          <Diag label="Refresh token" value={status.hasRefreshToken ? "Saved" : "Missing"} bad={!status.hasRefreshToken} />
          <Diag label="Token expires" value={status.expiresAt ? new Date(status.expiresAt).toLocaleString() : "Missing"} bad={!status.expiresAt} />
          <Diag label="Company / realm id" value={status.realmId || "Missing"} bad={!status.realmId} />
          <Diag label="Scope" value={status.scope || "com.intuit.quickbooks.accounting"} />
          <Diag label="Last sync" value={status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : "Never"} />
          <Diag label="Last sync error" value={status.lastSyncError || "None"} bad={Boolean(status.lastSyncError)} />
          <Diag label="Refresh status" value={status.lastRefreshStatus || "Not checked"} bad={status.lastRefreshStatus === "failed" || status.lastRefreshStatus === "missing_refresh_token"} />
          <Diag label="Refresh error" value={status.lastRefreshError || "None"} bad={Boolean(status.lastRefreshError)} />
          <Diag label="Last API status" value={status.lastApiStatus || "Not checked"} bad={status.lastApiStatus === "401"} />
          {!status.sampleApi?.ok ? (
            <div>
              <p className="font-semibold uppercase text-steel">Exact failure reason</p>
              <p className="break-words font-semibold text-clay">{status.sampleApi?.body || status.lastSyncError || "QuickBooks API has not succeeded yet."}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {status?.redirectUri ? (
        <div>
          <p className="text-sm font-semibold text-ink">QuickBooks Redirect URI</p>
          <code className="mt-1 block max-w-full overflow-x-auto break-all rounded-md bg-ink p-3 text-xs text-white">{status.redirectUri}</code>
          <p className="mt-2 text-xs text-steel">
            If Intuit says there is a connection problem after sign-in, this exact URI must be saved in the Intuit app under Production Keys & OAuth redirect URIs.
          </p>
        </div>
      ) : null}

      <a
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-pine px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-pine/90 aria-disabled:pointer-events-none aria-disabled:opacity-60"
        href="/api/integrations/quickbooks/connect"
        aria-disabled={!status?.configured}
      >
        <ExternalLink className="h-4 w-4" />
        {status?.hasAccessToken ? "Reauthorize QuickBooks" : "Connect QuickBooks"}
      </a>
    </div>
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
          <code className="mt-1 block max-w-full overflow-x-auto break-all rounded-md bg-ink p-3 text-xs text-white">{status.redirectUri}</code>
        </div>
      ) : null}

      {status?.connectedAt ? (
        <p className="text-xs text-steel">Connected at {new Date(status.connectedAt).toLocaleString()}</p>
      ) : null}

      <a
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-pine px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-pine/90 aria-disabled:pointer-events-none aria-disabled:opacity-60"
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
  const [quickBooksStatus, setQuickBooksStatus] = useState<{
    configured: boolean;
    connected: boolean;
    hasAccessToken?: boolean;
    hasRefreshToken?: boolean;
    expiresAt?: string | null;
    companyName?: string;
    realmId?: string;
    lastSyncAt?: string | null;
    lastSyncError?: string | null;
    lastRefreshStatus?: string | null;
    lastRefreshError?: string | null;
    lastApiStatus?: string | null;
    scope?: string;
    redirectUri?: string;
    sampleApi?: {
      ok: boolean;
      status: number;
      body?: string;
      companyName?: string;
      companyId?: string;
    } | null;
  } | null>(null);
  const [metaStatus, setMetaStatus] = useState<InboundStatus | null>(null);
  const [twilioStatus, setTwilioStatus] = useState<InboundStatus | null>(null);

  useEffect(() => {
    fetch("/api/integrations/jobber/status")
      .then((response) => response.json())
      .then(setJobberStatus)
      .catch(() => setJobberStatus(null));
    fetch("/api/integrations/quickbooks/status")
      .then((response) => response.json())
      .then(setQuickBooksStatus)
      .catch(() => setQuickBooksStatus(null));
    fetch("/api/integrations/meta/status")
      .then((response) => response.json())
      .then(setMetaStatus)
      .catch(() => setMetaStatus(null));
    fetch("/api/integrations/twilio/status")
      .then((response) => response.json())
      .then(setTwilioStatus)
      .catch(() => setTwilioStatus(null));
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <header className="mb-6">
        <a href="/" className="text-sm font-semibold text-pine">Dashboard</a>
        <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">Integration Setup</h1>
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
                {integration.name === "QuickBooks Online" && quickBooksStatus?.connected ? <Badge tone="green">API connected</Badge> : null}
                {integration.name === "QuickBooks Online" && quickBooksStatus && !quickBooksStatus.connected && quickBooksStatus.hasAccessToken ? <Badge tone="red">API failing</Badge> : null}
                {integration.name === "QuickBooks Online" && quickBooksStatus && !quickBooksStatus.configured ? <Badge tone="yellow">Needs credentials</Badge> : null}
                {integration.name === "Meta Leads" && metaStatus?.connected ? <Badge tone="green">Webhook ready</Badge> : null}
                {integration.name === "Twilio SMS" && twilioStatus?.connected ? <Badge tone="green">Webhook ready</Badge> : null}
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Goal</p>
                <p className="mt-1 text-sm text-steel">{integration.purpose}</p>
              </div>
              {integration.name === "Jobber" ? (
                <JobberSetup status={jobberStatus} />
              ) : null}
              {integration.name === "QuickBooks Online" ? (
                <QuickBooksSetup status={quickBooksStatus} />
              ) : null}
              {integration.name === "Meta Leads" ? (
                <InboundSetup
                  name="Meta Lead Ads"
                  status={metaStatus}
                  configured={Boolean(metaStatus?.meta?.verifyTokenConfigured)}
                  missing="META_VERIFY_TOKEN is not set in Vercel yet."
                  instructions="Use this webhook URL in Meta Lead Ads. The verify token must match META_VERIFY_TOKEN."
                />
              ) : null}
              {integration.name === "Twilio SMS" ? (
                <InboundSetup
                  name="Twilio SMS"
                  status={twilioStatus}
                  configured={Boolean(twilioStatus?.twilio?.accountSidConfigured && twilioStatus?.twilio?.authTokenConfigured)}
                  missing="TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are not set in Vercel yet."
                  instructions="Use this webhook URL for incoming messages on your Twilio phone number. Incoming texts create Lead Inbox records and draft-only replies."
                />
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

type InboundStatus = {
  connected: boolean;
  status: string;
  lastSyncAt?: string | null;
  lastReceivedAt?: string | null;
  lastError?: string | null;
  lastLeadId?: string | null;
  webhookUrl?: string;
  meta?: {
    verifyTokenConfigured: boolean;
    pageAccessTokenConfigured: boolean;
    appSecretConfigured: boolean;
    webhookUrl: string;
  } | null;
  twilio?: {
    accountSidConfigured: boolean;
    authTokenConfigured: boolean;
    phoneNumberConfigured: boolean;
    webhookUrl: string;
  } | null;
};

function InboundSetup({
  name,
  status,
  configured,
  missing,
  instructions
}: {
  name: string;
  status: InboundStatus | null;
  configured: boolean;
  missing: string;
  instructions: string;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-ink/10 p-3">
      <div>
        <p className="text-sm font-semibold text-ink">Connection Status</p>
        <p className="mt-1 text-sm text-steel">
          {!status ? `Checking ${name} setup...` : configured ? `${name} receiver is ready in the app.` : missing}
        </p>
      </div>
      <div className="grid gap-2 rounded-md bg-primer/60 p-3 text-xs text-steel">
        <Diag label="App receiver" value={status?.connected ? status.status : configured ? "Ready for first webhook" : "Needs credentials"} bad={!configured} />
        <Diag label="Last received" value={status?.lastReceivedAt ? new Date(status.lastReceivedAt).toLocaleString() : "Never"} />
        <Diag label="Last error" value={status?.lastError || "None"} bad={Boolean(status?.lastError)} />
        <Diag label="Last lead id" value={status?.lastLeadId || "None yet"} />
        {status?.meta ? (
          <>
            <Diag label="Verify token" value={status.meta.verifyTokenConfigured ? "Configured" : "Missing"} bad={!status.meta.verifyTokenConfigured} />
            <Diag label="App secret" value={status.meta.appSecretConfigured ? "Configured" : "Optional but missing"} />
            <Diag label="Page token" value={status.meta.pageAccessTokenConfigured ? "Configured" : "Optional for later enrichment"} />
          </>
        ) : null}
        {status?.twilio ? (
          <>
            <Diag label="Account SID" value={status.twilio.accountSidConfigured ? "Configured" : "Missing"} bad={!status.twilio.accountSidConfigured} />
            <Diag label="Auth token" value={status.twilio.authTokenConfigured ? "Configured" : "Missing"} bad={!status.twilio.authTokenConfigured} />
            <Diag label="Phone number" value={status.twilio.phoneNumberConfigured ? "Configured" : "Optional but missing"} />
          </>
        ) : null}
      </div>
      {status?.webhookUrl ? (
        <div>
          <p className="text-sm font-semibold text-ink">{name} Webhook URL</p>
          <code className="mt-1 block max-w-full overflow-x-auto break-all rounded-md bg-ink p-3 text-xs text-white">{status.webhookUrl}</code>
          <p className="mt-2 text-xs text-steel">{instructions}</p>
        </div>
      ) : null}
      <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-ink/10 bg-white px-4 py-2 text-center text-sm font-semibold text-ink" href="/leads">
        Open Lead Inbox
      </a>
    </div>
  );
}

function QuickBooksSetup({
  status
}: {
  status: {
    configured: boolean;
    connected: boolean;
    hasAccessToken?: boolean;
    hasRefreshToken?: boolean;
    expiresAt?: string | null;
    companyName?: string;
    realmId?: string;
    lastSyncAt?: string | null;
    lastSyncError?: string | null;
    lastRefreshStatus?: string | null;
    lastRefreshError?: string | null;
    lastApiStatus?: string | null;
    scope?: string;
    redirectUri?: string;
    sampleApi?: {
      ok: boolean;
      status: number;
      body?: string;
      companyName?: string;
      companyId?: string;
    } | null;
  } | null;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-ink/10 p-3">
      <div>
        <p className="text-sm font-semibold text-ink">Connection Status</p>
        <p className="mt-1 text-sm text-steel">
          {!status
            ? "Checking QuickBooks setup..."
            : status.connected
              ? `API verified for ${status.companyName || "QuickBooks Online"}`
              : status.configured
                ? status.hasAccessToken
                  ? "QuickBooks has saved tokens, but the API test is failing."
                  : "Ready to authorize with QuickBooks."
                : "Add QuickBooks credentials in Vercel before connecting."}
        </p>
      </div>

      {status ? (
        <div className="grid gap-2 rounded-md bg-primer/60 p-3 text-xs text-steel">
          <Diag label="API test" value={status.sampleApi ? `${status.sampleApi.status} ${status.sampleApi.ok ? "OK" : "FAILED"}` : "Not checked"} bad={!status.sampleApi?.ok} />
          <Diag label="Access token" value={status.hasAccessToken ? "Saved" : "Missing"} bad={!status.hasAccessToken} />
          <Diag label="Refresh token" value={status.hasRefreshToken ? "Saved" : "Missing"} bad={!status.hasRefreshToken} />
          <Diag label="Token expires" value={status.expiresAt ? new Date(status.expiresAt).toLocaleString() : "Missing"} bad={!status.expiresAt} />
          <Diag label="Company / realm id" value={status.realmId || "Missing"} bad={!status.realmId} />
          <Diag label="Scope" value={status.scope || "com.intuit.quickbooks.accounting"} />
          <Diag label="Last sync" value={status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : "Never"} />
          <Diag label="Last sync error" value={status.lastSyncError || "None"} bad={Boolean(status.lastSyncError)} />
          <Diag label="Refresh status" value={status.lastRefreshStatus || "Not checked"} bad={status.lastRefreshStatus === "failed" || status.lastRefreshStatus === "missing_refresh_token"} />
          <Diag label="Refresh error" value={status.lastRefreshError || "None"} bad={Boolean(status.lastRefreshError)} />
          <Diag label="Last API status" value={status.lastApiStatus || "Not checked"} bad={status.lastApiStatus === "401"} />
          {!status.sampleApi?.ok ? (
            <div>
              <p className="font-semibold uppercase text-steel">Exact failure reason</p>
              <p className="break-words font-semibold text-clay">{status.sampleApi?.body || status.lastSyncError || "QuickBooks API has not succeeded yet."}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {status?.redirectUri ? (
        <div>
          <p className="text-sm font-semibold text-ink">QuickBooks Redirect URI</p>
          <code className="mt-1 block max-w-full overflow-x-auto break-all rounded-md bg-ink p-3 text-xs text-white">{status.redirectUri}</code>
          <p className="mt-2 text-xs text-steel">
            If Intuit says there is a connection problem after sign-in, this exact URI must be saved in the Intuit app under Production Keys & OAuth redirect URIs.
          </p>
        </div>
      ) : null}

      <a
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-pine px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-pine/90 aria-disabled:pointer-events-none aria-disabled:opacity-60"
        href="/api/integrations/quickbooks/connect"
        aria-disabled={!status?.configured}
      >
        <ExternalLink className="h-4 w-4" />
        {status?.hasAccessToken ? "Reauthorize QuickBooks" : "Connect QuickBooks"}
      </a>
    </div>
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
          <code className="mt-1 block max-w-full overflow-x-auto break-all rounded-md bg-ink p-3 text-xs text-white">{status.redirectUri}</code>
        </div>
      ) : null}

      {status?.connectedAt ? (
        <p className="text-xs text-steel">Connected at {new Date(status.connectedAt).toLocaleString()}</p>
      ) : null}

      <a
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-pine px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-pine/90 aria-disabled:pointer-events-none aria-disabled:opacity-60"
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
