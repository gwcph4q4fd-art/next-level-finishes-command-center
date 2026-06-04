import {
  CheckCircle2,
  ClipboardList,
  Inbox,
  Sparkles,
  Target,
  WalletCards
} from "lucide-react";
import { JobberDashboard } from "@/components/jobber-dashboard";
import { Badge, Panel } from "@/components/ui";
import { bills, cashSummary, draftLogs, integrations, invoices, leads, schedule } from "@/lib/mock-data";
import { currency } from "@/lib/utils";
import Link from "next/link";

const actions = [
  "Reply to Megan Brooks and offer two estimate windows for the cabinet project.",
  "Collect Fisher exterior deposit before ordering the rest of the paint.",
  "Follow up with Renee Martin while the exterior painting quote is still warm."
];

export default function DashboardPage() {
  const newLeads = leads.filter((lead) => lead.status === "New");
  const followUps = leads.filter((lead) => lead.status === "Quoted");
  const weeklyProgress = Math.round((cashSummary.bookedThisWeek / cashSummary.weeklyGoal) * 100);

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-5 rounded-lg border border-ink/10 bg-ink p-5 text-white shadow-soft">
            <div className="mb-8">
              <p className="text-sm text-white/65">AI Command Center</p>
              <h1 className="mt-2 text-2xl font-bold leading-tight">Next Level Finishes</h1>
              <p className="mt-2 text-sm text-white/70">Titusville, PA</p>
            </div>
            <nav className="grid gap-2 text-sm">
              {[
                ["Dashboard", "/"],
                ["Lead Inbox", "/leads"],
                ["Estimate Writer", "/estimates"],
                ["Schedule", "/schedule"],
                ["Daily Briefing", "/briefing"],
                ["Integrations", "/integrations"]
              ].map(([label, href]) => (
                <Link key={href} href={href} className="rounded-md px-3 py-2 text-white/80 hover:bg-white/10 hover:text-white">
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="mb-6 flex flex-col justify-between gap-4 border-b border-ink/10 pb-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-medium text-pine">Wednesday, June 3, 2026</p>
              <h2 className="mt-2 text-3xl font-bold tracking-normal text-ink">Today’s command board</h2>
              <p className="mt-2 max-w-2xl text-sm text-steel">
                Draft first, approve second. No texts, emails, QuickBooks changes, or Jobber changes happen automatically.
              </p>
              <p className="mt-2 text-xs font-semibold text-pine">Production sync check: GitHub to Vercel is active.</p>
            </div>
            <Link href="/briefing" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white">
              <Sparkles className="h-4 w-4" />
              Daily briefing
            </Link>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<WalletCards />} label="Cash available" value={currency(cashSummary.available)} detail="Mock QuickBooks read-only" />
            <Metric icon={<Inbox />} label="Leads need response" value={String(newLeads.length)} detail="Manual + placeholder sources" />
            <Metric icon={<ClipboardList />} label="Estimate follow-ups" value={String(followUps.length)} detail={currency(cashSummary.openEstimateValue) + " open quote value"} />
            <Metric icon={<Target />} label="Weekly goal" value={`${weeklyProgress}%`} detail={`${currency(cashSummary.revenueNeeded)} still needed`} />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Panel title="Top 3 Recommended Actions Today">
              <div className="grid gap-3">
                {actions.map((action, index) => (
                  <div key={action} className="flex gap-3 rounded-md border border-ink/10 bg-primer/50 p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pine text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <p className="text-sm text-ink">{action}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Safety Locks">
              <div className="grid gap-3 text-sm text-steel">
                {["AI drafts are logged", "Owner approval required", "QuickBooks is read-only", "Jobber is read-only"].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-pine" />
                    {item}
                  </div>
                ))}
              </div>
            </Panel>
          </section>

          <section className="mt-6">
            <JobberDashboard />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-3">
            <Panel title="Today’s Schedule" className="xl:col-span-1">
              <div className="grid gap-3">
                {schedule.map((item) => (
                  <div key={item.id} className="rounded-md border border-ink/10 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-ink">{item.time}</p>
                      <Badge tone={item.type === "Job" ? "green" : item.type === "Estimate" ? "blue" : "neutral"}>{item.type}</Badge>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-ink">{item.title}</p>
                    <p className="mt-1 text-xs text-steel">{item.location}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Leads and Follow-Ups" className="xl:col-span-1" action={<Link href="/leads" className="text-sm font-semibold text-pine">Open</Link>}>
              <div className="grid gap-3">
                {[...newLeads, ...followUps].map((lead) => (
                  <div key={lead.id} className="rounded-md border border-ink/10 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-ink">{lead.name}</p>
                      <Badge tone={lead.status === "New" ? "yellow" : "neutral"}>{lead.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-steel">{lead.nextStep}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Unpaid and Due Soon">
              <div className="grid gap-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-steel">Invoices and deposits</p>
                  {invoices.map((invoice) => (
                    <MoneyRow key={invoice.id} name={invoice.customer} amount={invoice.amount} detail={`${invoice.status} - ${invoice.due}`} />
                  ))}
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-steel">Bills due soon</p>
                  {bills.map((bill) => (
                    <MoneyRow key={bill.id} name={bill.vendor} amount={bill.amount} detail={`Due ${bill.due}`} />
                  ))}
                </div>
              </div>
            </Panel>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-2">
            <Panel title="Recent AI Draft Log">
              <div className="overflow-hidden rounded-md border border-ink/10">
                {draftLogs.map((draft) => (
                  <div key={draft.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-ink/10 p-3 last:border-b-0">
                    <div>
                      <p className="text-sm font-semibold text-ink">{draft.type}</p>
                      <p className="text-xs text-steel">{draft.relatedTo} - {draft.createdAt}</p>
                    </div>
                    <Badge tone={draft.status === "Approved" ? "green" : "neutral"}>{draft.status}</Badge>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Read-Only Integration Placeholders">
              <div className="grid gap-3">
                {integrations.slice(0, 2).map((integration) => (
                  <div key={integration.name} className="rounded-md border border-ink/10 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-ink">{integration.name}</p>
                      <Badge>{integration.mode}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-steel">{integration.covers}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </section>
        </div>
      </div>
    </main>
  );
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-steel">{label}</p>
          <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
          <p className="mt-1 text-xs text-steel">{detail}</p>
        </div>
        <div className="rounded-md bg-pine/10 p-2 text-pine [&>svg]:h-5 [&>svg]:w-5">{icon}</div>
      </div>
    </Panel>
  );
}

function MoneyRow({ name, amount, detail }: { name: string; amount: number; detail: string }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3 rounded-md bg-primer/60 p-3 last:mb-0">
      <div>
        <p className="text-sm font-semibold text-ink">{name}</p>
        <p className="text-xs text-steel">{detail}</p>
      </div>
      <p className="text-sm font-bold text-ink">{currency(amount)}</p>
    </div>
  );
}
