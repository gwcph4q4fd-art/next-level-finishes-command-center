"use client";

import { useState } from "react";
import { ClipboardPenLine, Sparkles } from "lucide-react";
import { Badge, Field, Panel, buttonClass, inputClass } from "@/components/ui";
import type { JobType } from "@/lib/types";

const jobTypes: JobType[] = [
  "Interior Painting",
  "Exterior Painting",
  "Cabinet Painting",
  "Deck Staining",
  "Drywall/Trim",
  "Bathroom Remodel",
  "Kitchen Remodel"
];

type EstimateResult = {
  scopeOfWork: string[];
  exclusions: string[];
  customerText: string;
  internalNotes: string;
};

export default function EstimateWriterPage() {
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function generateEstimate(formData: FormData) {
    setLoading(true);
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch("/api/ai/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    setResult(data.estimate);
    setLoading(false);
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <a href="/" className="text-sm font-semibold text-pine">Dashboard</a>
        <h1 className="mt-2 text-3xl font-bold text-ink">Estimate Writer</h1>
        <p className="mt-2 text-sm text-steel">
          Build customer-facing scope, exclusions, and internal notes for painting, cabinet, deck, drywall, trim, kitchen, and bathroom projects.
        </p>
      </header>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Project Details" action={<ClipboardPenLine className="h-4 w-4 text-pine" />}>
          <form action={generateEstimate} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Job type">
                <select name="jobType" className={inputClass}>{jobTypes.map((type) => <option key={type}>{type}</option>)}</select>
              </Field>
              <Field label="Location"><input name="location" defaultValue="Titusville, PA" className={inputClass} /></Field>
              <Field label="Prep level">
                <select name="prepLevel" className={inputClass}>
                  <option>Light prep</option>
                  <option>Standard prep</option>
                  <option>Heavy prep / restoration</option>
                </select>
              </Field>
              <Field label="Timeline"><input name="timeline" placeholder="Example: 3-5 working days" className={inputClass} /></Field>
            </div>
            <Field label="Scope, photos, and notes"><textarea name="scope" rows={5} className={inputClass} placeholder="Rooms, cabinets, deck size, surfaces, damage, access, color notes, photos provided..." /></Field>
            <Field label="Materials"><textarea name="materials" rows={3} className={inputClass} placeholder="Primer, cabinet enamel, exterior paint, stain, caulk, patching materials..." /></Field>
            <button className={buttonClass} disabled={loading} type="submit">
              <Sparkles className="h-4 w-4" />
              {loading ? "Writing..." : "Generate estimate draft"}
            </button>
          </form>
        </Panel>

        <Panel title="Draft Estimate" action={<Badge tone="green">Not sent</Badge>}>
          {!result ? (
            <div className="rounded-md border border-dashed border-ink/20 p-8 text-center text-sm text-steel">
              Fill out the project details and generate a draft. The result can be edited before it ever reaches a customer.
            </div>
          ) : (
            <div className="grid gap-5">
              <Block title="Scope of Work" items={result.scopeOfWork} />
              <Block title="Exclusions" items={result.exclusions} />
              <Editable title="Customer-Facing Estimate Text" value={result.customerText} />
              <Editable title="Internal Notes" value={result.internalNotes} />
              <div className="flex flex-wrap gap-2">
                <button className={buttonClass}>Approve draft</button>
                <button className="inline-flex min-h-10 items-center justify-center rounded-md border border-ink/15 px-4 py-2 text-sm font-semibold text-ink">
                  Save internal version
                </button>
              </div>
            </div>
          )}
        </Panel>
      </section>
    </main>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-ink">{title}</h2>
      <div className="grid gap-2">
        {items.map((item) => (
          <p key={item} className="rounded-md bg-primer/60 p-3 text-sm text-ink">{item}</p>
        ))}
      </div>
    </div>
  );
}

function Editable({ title, value }: { title: string; value: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-ink">{title}</span>
      <textarea className={inputClass + " min-h-32"} defaultValue={value} />
    </label>
  );
}
