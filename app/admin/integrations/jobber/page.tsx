"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, ShieldAlert } from "lucide-react";
import { Badge, Panel, buttonClass } from "@/components/ui";

type Diagnostics = {
  status: {
    connected: boolean;
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
    expiresAt?: string | null;
    tokenExpired?: boolean | null;
    accountId?: string | null;
    accountName?: string | null;
    lastSyncAt?: string | null;
    lastSyncError?: string | null;
    refreshStatus?: string | null;
    lastRefreshAttemptAt?: string | null;
    lastRefreshError?: string | null;
    lastGraphqlStatus?: string | null;
    scopes?: string | null;
    apiHealthy?: boolean;
  };
  config: {
    configured: boolean;
    redirectUri: string;
    graphqlVersion: string;
  };
  snapshot: {
    hasData: boolean;
    syncedAt?: string | null;
    stale: boolean;
  };
  sampleGraphql: {
    ok: boolean;
    status: number;
    version?: string | null;
    body: string;
  };
};

export default function JobberAdminPage() {
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<Diagnostics["sampleGraphql"] | null>(null);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/integrations/jobber/diagnostics", { cache: "no-store" });
    setDiagnostics(await response.json());
    setLoading(false);
  }

  async function testRefresh() {
    setTesting(true);
    const response = await fetch("/api/admin/integrations/jobber/refresh-test", { method: "POST", cache: "no-store" });
    setTestResult(await response.json());
    setTesting(false);
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-pine">
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <div className="flex flex-wrap gap-2">
          <button className={buttonClass} onClick={load} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Refresh diagnostics
          </button>
          <button className={buttonClass} onClick={testRefresh} disabled={testing || loading}>
            <ShieldAlert className="h-4 w-4" />
            {testing ? "Testing..." : "Test token refresh"}
          </button>
          <a className={buttonClass} href="/api/integrations/jobber/connect">
            Reauthorize Jobber
          </a>
        </div>
      </div>

      <Panel title="Jobber Integration Diagnostics">
        {loading ? <p className="rounded-md border border-dashed border-ink/20 p-4 text-sm text-steel">Loading diagnostics...</p> : null}

        {diagnostics ? (
          <div className="grid gap-5">
            <div className="flex flex-wrap gap-2">
              <Badge tone={diagnostics.status.connected && diagnostics.status.apiHealthy !== false ? "green" : "red"}>
                {diagnostics.status.connected && diagnostics.status.apiHealthy !== false ? "API healthy" : "API not healthy"}
              </Badge>
              <Badge tone={diagnostics.status.hasRefreshToken ? "green" : "red"}>
                {diagnostics.status.hasRefreshToken ? "Refresh token exists" : "No refresh token"}
              </Badge>
              <Badge tone={diagnostics.sampleGraphql.ok ? "green" : "red"}>
                GraphQL test {diagnostics.sampleGraphql.status}
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Fact label="Connected" value={diagnostics.status.connected ? "true" : "false"} />
              <Fact label="Token expires at" value={diagnostics.status.expiresAt ? new Date(diagnostics.status.expiresAt).toLocaleString() : "Missing"} bad={Boolean(diagnostics.status.tokenExpired)} />
              <Fact label="Refresh token exists" value={diagnostics.status.hasRefreshToken ? "true" : "false"} bad={!diagnostics.status.hasRefreshToken} />
              <Fact label="API account id" value={diagnostics.status.accountId || "Missing"} bad={!diagnostics.status.accountId} />
              <Fact label="Account name" value={diagnostics.status.accountName || "Missing"} />
              <Fact label="Last sync" value={diagnostics.status.lastSyncAt ? new Date(diagnostics.status.lastSyncAt).toLocaleString() : "Never"} />
              <Fact label="Last sync error" value={diagnostics.status.lastSyncError || "None"} bad={Boolean(diagnostics.status.lastSyncError)} />
              <Fact label="Refresh status" value={diagnostics.status.refreshStatus || "Not checked"} bad={diagnostics.status.refreshStatus === "failed" || diagnostics.status.refreshStatus === "missing_refresh_token"} />
              <Fact label="Last refresh attempt" value={diagnostics.status.lastRefreshAttemptAt ? new Date(diagnostics.status.lastRefreshAttemptAt).toLocaleString() : "Not checked"} />
              <Fact label="Last refresh error" value={diagnostics.status.lastRefreshError || "None"} bad={Boolean(diagnostics.status.lastRefreshError)} />
              <Fact label="Last GraphQL status" value={diagnostics.status.lastGraphqlStatus || "Not checked"} bad={diagnostics.status.lastGraphqlStatus?.includes("401")} />
              <Fact label="GraphQL API version" value={diagnostics.config.graphqlVersion} />
            </div>

            <div className="grid gap-3">
              <Fact label="Scopes / token payload" value={diagnostics.status.scopes || "Token does not expose scopes. Confirm read scopes in Jobber Developer Center."} />
              <Fact label="Redirect URI" value={diagnostics.config.redirectUri} />
              <Fact label="Cached snapshot" value={diagnostics.snapshot.hasData ? `Yes, synced ${diagnostics.snapshot.syncedAt || "unknown"}` : "No synced data cached"} bad={!diagnostics.snapshot.hasData} />
            </div>

            <Panel title="Sample GraphQL Account Test">
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-ink p-4 text-xs text-white">{JSON.stringify(diagnostics.sampleGraphql, null, 2)}</pre>
            </Panel>

            {!diagnostics.sampleGraphql.ok ? (
              <Panel title="Exact Failure Reason">
                <p className="rounded-md bg-clay/10 p-3 text-sm text-clay">
                  {diagnostics.sampleGraphql.status === 401
                    ? `Jobber returned 401. ${diagnostics.sampleGraphql.body || "No response body was returned."}`
                    : diagnostics.sampleGraphql.body || "GraphQL test failed without a response body."}
                </p>
              </Panel>
            ) : null}

            {testResult ? (
              <Panel title="Refresh Token Test Result">
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-ink p-4 text-xs text-white">{JSON.stringify(testResult, null, 2)}</pre>
              </Panel>
            ) : null}
          </div>
        ) : null}
      </Panel>
    </main>
  );
}

function Fact({ label, value, bad = false }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="min-w-0 rounded-md border border-ink/10 bg-primer/50 p-3">
      <p className="text-xs font-semibold uppercase text-steel">{label}</p>
      <p className={bad ? "mt-1 break-words text-sm font-semibold text-clay" : "mt-1 break-words text-sm text-ink"}>{value}</p>
    </div>
  );
}
