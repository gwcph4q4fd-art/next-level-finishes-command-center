"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Banknote, CheckCircle2, Sparkles } from "lucide-react";
import { Badge, Panel, buttonClass } from "@/components/ui";

type Briefing = {
  cashAvailable: string;
  billsDue: string;
  jobsToday: string[];
  leadsNeedingResponse: string[];
  estimatesToFollowUp: string[];
  revenueNeededThisWeek: string;
  biggestRisk: string;
  topActions: string[];
};

export default function BriefingPage() {
  const [briefing, setBriefing] = useState<Briefing | null>(null);

  async function loadBriefing() {
    const response = await fetch("/api/ai/briefing");
    const data = await response.json();
    setBriefing(data.briefing);
  }

  useEffect(() => {
    loadBriefing();
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <a href="/" className="text-sm font-semibold text-pine">Dashboard</a>
        <h1 className="mt-2 text-3xl font-bold text-ink">Daily Briefing</h1>
        <p className="mt-2 text-sm text-steel">A draft business summary from live synced Jobber data when available. It does not change accounting, scheduling, or customer systems.</p>
      </header>

      <Panel title="Today’s Briefing" action={<Badge tone="green">Draft logged</Badge>}>
        {!briefing ? (
          <button onClick={loadBriefing} className={buttonClass}><Sparkles className="h-4 w-4" />Generate briefing</button>
        ) : (
          <div className="grid gap-5">
            <section className="grid gap-4 md:grid-cols-3">
              <BriefMetric icon={<Banknote />} label="Cash available" value={briefing.cashAvailable} />
              <BriefMetric icon={<AlertTriangle />} label="Bills due" value={briefing.billsDue} />
              <BriefMetric icon={<CheckCircle2 />} label="Revenue needed" value={briefing.revenueNeededThisWeek} />
            </section>
            <TextBlock title="Jobs Today" items={briefing.jobsToday} />
            <TextBlock title="Leads Needing Response" items={briefing.leadsNeedingResponse} />
            <TextBlock title="Estimates To Follow Up" items={briefing.estimatesToFollowUp} />
            <div className="rounded-md border border-clay/20 bg-clay/10 p-4">
              <p className="text-sm font-semibold text-ink">Biggest Risk</p>
              <p className="mt-1 text-sm text-ink">{briefing.biggestRisk}</p>
            </div>
            <TextBlock title="Top 3 Actions" items={briefing.topActions} numbered />
          </div>
        )}
      </Panel>
    </main>
  );
}

function BriefMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md bg-primer/60 p-4">
      <div className="mb-3 text-pine [&>svg]:h-5 [&>svg]:w-5">{icon}</div>
      <p className="text-sm text-steel">{label}</p>
      <p className="mt-1 text-xl font-bold text-ink">{value}</p>
    </div>
  );
}

function TextBlock({ title, items, numbered }: { title: string; items: string[]; numbered?: boolean }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink">{title}</p>
      <div className="grid gap-2">
        {items.map((item, index) => (
          <p key={item} className="rounded-md border border-ink/10 p-3 text-sm text-ink">
            {numbered ? `${index + 1}. ` : ""}{item}
          </p>
        ))}
      </div>
    </div>
  );
}
