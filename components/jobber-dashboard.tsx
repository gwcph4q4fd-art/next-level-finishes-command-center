"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Badge, Panel, buttonClass } from "@/components/ui";

type JobberItem = {
  id: string;
  title: string;
  detail?: string;
  status?: string;
  date?: string;
};

type JobberSection = {
  items: JobberItem[];
  error?: string;
};

type JobberData = {
  connected: boolean;
  syncedAt: string;
  schedule: JobberSection;
  activeJobs: JobberSection;
  openQuotes: JobberSection;
  recentInvoices: JobberSection;
  followUps: JobberSection;
};

type JobberStatus = {
  connected: boolean;
  hasAccessToken: boolean;
  expiresAt?: string | null;
  accountName?: string;
};

const sections: Array<[keyof JobberData, string]> = [
  ["schedule", "Upcoming Schedule"],
  ["activeJobs", "Active Jobs"],
  ["openQuotes", "Open Quotes"],
  ["recentInvoices", "Recent Invoices"],
  ["followUps", "Clients Needing Follow-Up"]
];

export function JobberDashboard() {
  const [status, setStatus] = useState<JobberStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [data, setData] = useState<JobberData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadStatus() {
    setStatusLoading(true);
    const response = await fetch("/api/integrations/jobber/status", { cache: "no-store" });
    const nextStatus = await response.json();
    setStatus(nextStatus);
    setStatusLoading(false);
    return nextStatus as JobberStatus;
  }

  useEffect(() => {
    loadStatus().catch(() => {
      setStatus({ connected: false, hasAccessToken: false });
      setStatusLoading(false);
    });
  }, []);

  async function syncJobber() {
    setLoading(true);
    setError("");
    const backendStatus = await loadStatus();

    if (!backendStatus.connected || !backendStatus.hasAccessToken) {
      setError("Jobber is disconnected according to the backend status check.");
      setData(null);
      setLoading(false);
      return;
    }

    const response = await fetch("/api/integrations/jobber/sync", { cache: "no-store" });
    const nextData = await response.json();

    if (!response.ok) {
      setError(nextData.error || "Jobber sync failed.");
      setData(null);
      setLoading(false);
      return;
    }

    setData(nextData);
    setLoading(false);
  }

  return (
    <Panel
      title="Jobber Live Data"
      action={
        <button className={buttonClass} onClick={syncJobber} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          {loading ? "Syncing..." : "Sync Jobber"}
        </button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-steel">
        {statusLoading ? (
          <Badge>Checking status</Badge>
        ) : status?.connected && status.hasAccessToken ? (
          <>
            <Badge tone="green">Jobber connected</Badge>
            {status.accountName ? <span>{status.accountName}</span> : null}
            {status.expiresAt ? <span>Token expires {new Date(status.expiresAt).toLocaleString()}</span> : null}
          </>
        ) : (
          <Badge tone="yellow">Jobber disconnected</Badge>
        )}
      </div>

      {!data && !error ? (
        <p className="rounded-md border border-dashed border-ink/20 p-5 text-sm text-steel">
          Click Sync Jobber to pull read-only schedule, jobs, quotes, invoices, and follow-up candidates from Jobber.
        </p>
      ) : null}

      {error ? <p className="rounded-md bg-clay/10 p-3 text-sm text-clay">{error}</p> : null}

      {data ? (
        <div className="grid gap-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-steel">
            <Badge tone="green">Connected</Badge>
            <span>Last synced {new Date(data.syncedAt).toLocaleString()}</span>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {sections.map(([key, title]) => {
              const section = data[key] as JobberSection;
              return <JobberList key={key} title={title} section={section} />;
            })}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

function JobberList({ title, section }: { title: string; section: JobberSection }) {
  return (
    <section className="rounded-md border border-ink/10 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <Badge>{String(section.items.length)}</Badge>
      </div>
      {section.error ? <p className="mb-3 rounded-md bg-clay/10 p-2 text-xs text-clay">{section.error}</p> : null}
      <div className="grid gap-2">
        {section.items.length ? (
          section.items.map((item) => (
            <div key={item.id} className="rounded-md bg-primer/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">{item.title}</p>
                {item.status ? <Badge tone="blue">{item.status}</Badge> : null}
              </div>
              {item.detail ? <p className="mt-1 text-xs text-steel">{item.detail}</p> : null}
              {item.date ? <p className="mt-1 text-xs text-steel">{new Date(item.date).toLocaleString()}</p> : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-steel">No Jobber records returned for this section.</p>
        )}
      </div>
    </section>
  );
}
