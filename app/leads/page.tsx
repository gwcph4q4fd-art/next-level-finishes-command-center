"use client";

import { useMemo, useState } from "react";
import { MessageSquarePlus, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { Badge, Field, Panel, buttonClass, inputClass } from "@/components/ui";
import { leads as mockLeads } from "@/lib/mock-data";
import type { JobType, Lead, LeadStatus } from "@/lib/types";

const statuses: LeadStatus[] = ["New", "Contacted", "Estimate Scheduled", "Quoted", "Won", "Lost"];
const jobTypes: JobType[] = [
  "Interior Painting",
  "Exterior Painting",
  "Cabinet Painting",
  "Deck Staining",
  "Drywall/Trim",
  "Bathroom Remodel",
  "Kitchen Remodel"
];

export default function LeadInboxPage() {
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [selectedId, setSelectedId] = useState(mockLeads[0]?.id);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const selected = useMemo(() => leads.find((lead) => lead.id === selectedId) || leads[0], [leads, selectedId]);

  function addLead(formData: FormData) {
    const lead: Lead = {
      id: `lead-${Date.now()}`,
      name: String(formData.get("name") || "New Lead"),
      phone: String(formData.get("phone") || ""),
      email: String(formData.get("email") || ""),
      source: "Manual",
      status: "New",
      jobType: String(formData.get("jobType") || "Interior Painting") as JobType,
      location: String(formData.get("location") || "Titusville, PA"),
      message: String(formData.get("message") || ""),
      receivedAt: "Just now",
      urgency: "New",
      nextStep: "Draft reply and schedule estimate"
    };
    setLeads((current) => [lead, ...current]);
    setSelectedId(lead.id);
    setDraft("");
  }

  async function generateDraft() {
    if (!selected) return;
    setLoading(true);
    const response = await fetch("/api/ai/lead-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selected)
    });
    const data = await response.json();
    setDraft(data.draft);
    setLoading(false);
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Header title="Lead Inbox" subtitle="Manual lead entry now, webhook placeholders ready for Meta, Jobber, website, and Twilio." />
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Create Manual Lead" action={<Plus className="h-4 w-4 text-pine" />}>
          <form action={addLead} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Customer name"><input name="name" className={inputClass} required /></Field>
              <Field label="Phone"><input name="phone" className={inputClass} /></Field>
              <Field label="Email"><input name="email" className={inputClass} /></Field>
              <Field label="Location"><input name="location" defaultValue="Titusville, PA" className={inputClass} /></Field>
            </div>
            <Field label="Job type">
              <select name="jobType" className={inputClass}>{jobTypes.map((type) => <option key={type}>{type}</option>)}</select>
            </Field>
            <Field label="Lead message"><textarea name="message" rows={4} className={inputClass} required /></Field>
            <button className={buttonClass} type="submit"><MessageSquarePlus className="h-4 w-4" />Add lead</button>
          </form>
        </Panel>

        <Panel title="Inbox">
          <div className="grid gap-3">
            {leads.map((lead) => (
              <button
                key={lead.id}
                onClick={() => {
                  setSelectedId(lead.id);
                  setDraft("");
                }}
                className="rounded-md border border-ink/10 bg-white p-4 text-left transition hover:border-pine/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-ink">{lead.name}</p>
                  <Badge tone={lead.status === "New" ? "yellow" : "neutral"}>{lead.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-steel">{lead.jobType} - {lead.location}</p>
                <p className="mt-2 line-clamp-2 text-sm text-ink">{lead.message}</p>
              </button>
            ))}
          </div>
        </Panel>
      </section>

      {selected && (
        <section className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <Panel title="Selected Lead">
            <div className="grid gap-3 text-sm">
              <Info label="Name" value={selected.name} />
              <Info label="Phone" value={selected.phone} />
              <Info label="Source" value={selected.source} />
              <Info label="Job type" value={selected.jobType} />
              <Info label="Next step" value={selected.nextStep} />
              <div>
                <p className="font-semibold text-ink">Status</p>
                <select className={inputClass + " mt-1 w-full"} value={selected.status} onChange={(event) => {
                  const status = event.target.value as LeadStatus;
                  setLeads((current) => current.map((lead) => lead.id === selected.id ? { ...lead, status } : lead));
                }}>
                  {statuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </div>
            </div>
          </Panel>

          <Panel title="AI Reply Drafting" action={<Badge tone="green">Draft only</Badge>}>
            <div className="mb-4 flex items-center gap-2 rounded-md bg-pine/10 p-3 text-sm text-pine">
              <ShieldCheck className="h-4 w-4" />
              Nothing is sent automatically. Every draft is logged and waits for approval.
            </div>
            <button onClick={generateDraft} disabled={loading} className={buttonClass}>
              <Sparkles className="h-4 w-4" />
              {loading ? "Drafting..." : "Generate reply draft"}
            </button>
            <textarea className={inputClass + " mt-4 min-h-56 w-full"} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="AI draft will appear here." />
            <div className="mt-3 flex flex-wrap gap-2">
              <button className={buttonClass} disabled={!draft}>Approve draft</button>
              <button className="inline-flex min-h-10 items-center justify-center rounded-md border border-ink/15 px-4 py-2 text-sm font-semibold text-ink" disabled={!draft}>
                Mark sent manually
              </button>
            </div>
          </Panel>
        </section>
      )}
    </main>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="mb-6">
      <a href="/" className="text-sm font-semibold text-pine">Dashboard</a>
      <h1 className="mt-2 text-3xl font-bold text-ink">{title}</h1>
      <p className="mt-2 text-sm text-steel">{subtitle}</p>
    </header>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="font-semibold text-ink">{label}</p>
      <p className="text-steel">{value || "Not provided"}</p>
    </div>
  );
}
