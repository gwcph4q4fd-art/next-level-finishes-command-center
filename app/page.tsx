import Link from "next/link";
import { CheckCircle2, PlugZap, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { JobberDashboard } from "@/components/jobber-dashboard";
import { Badge, Panel } from "@/components/ui";

const navItems = [
  ["Dashboard", "/"],
  ["Agent", "/agent"],
  ["Jobber Jobs", "/jobber/jobs"],
  ["Clients", "/jobber/clients"],
  ["Quotes", "/jobber/quotes"],
  ["Invoices", "/jobber/invoices"],
  ["Integrations", "/integrations"]
];

export default function DashboardPage() {
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
              {navItems.map(([label, href]) => (
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
              <p className="text-sm font-medium text-pine">Next Level Finishes · Titusville, PA</p>
              <h2 className="mt-2 text-3xl font-bold tracking-normal text-ink">Daily command center</h2>
              <p className="mt-2 max-w-2xl text-sm text-steel">
                Live Jobber data first. Draft actions only. No texts, emails, Jobber edits, invoices, ads, or financial changes happen automatically.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/agent" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white">
                <Sparkles className="h-4 w-4" />
                Open agent
              </Link>
              <Link href="/integrations" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink/10 bg-white px-4 py-2 text-sm font-semibold text-ink">
                <PlugZap className="h-4 w-4" />
                Integrations
              </Link>
            </div>
          </header>

          <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
            <Panel title="Today’s Priorities">
              <div className="grid gap-3 text-sm text-steel">
                <p>Priorities are generated from synced Jobber work below. If Jobber has no live data, the dashboard will say what is missing.</p>
                <Link className="font-semibold text-pine" href="/agent">Ask the AI agent what to do today</Link>
              </div>
            </Panel>

            <Panel title="Cash Status" action={<WalletCards className="h-4 w-4 text-pine" />}>
              <div className="grid gap-3">
                <Badge tone="yellow">QuickBooks not connected yet</Badge>
                <p className="text-sm text-steel">
                  No fake cash numbers are shown. QuickBooks will later provide cash balance, revenue, expenses, unpaid invoices, taxes set aside, and profit/loss.
                </p>
                <Link className="text-sm font-semibold text-pine" href="/integrations">Connect QuickBooks when ready</Link>
              </div>
            </Panel>

            <Panel title="Safety Locks" action={<ShieldCheck className="h-4 w-4 text-pine" />}>
              <div className="grid gap-3 text-sm text-steel">
                {["Jobber is read-only", "AI creates drafts only", "Owner approval required", "QuickBooks not connected yet"].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-pine" />
                    {item}
                  </div>
                ))}
              </div>
            </Panel>
          </section>

          <JobberDashboard />
        </div>
      </div>
    </main>
  );
}
