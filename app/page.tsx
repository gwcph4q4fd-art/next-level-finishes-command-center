import Link from "next/link";
import type { ReactNode } from "react";
import { BriefcaseBusiness, FileText, PlugZap, Sparkles, Users, WalletCards } from "lucide-react";
import { JobberDashboard } from "@/components/jobber-dashboard";
import { Badge, Panel } from "@/components/ui";

const navItems = [
  ["Dashboard", "/"],
  ["Agent", "/agent"],
  ["Jobber Jobs", "/jobber/jobs"],
  ["Requests", "/jobber/requests"],
  ["Clients", "/jobber/clients"],
  ["Quotes", "/jobber/quotes"],
  ["Invoices", "/jobber/invoices"],
  ["Integrations", "/integrations"]
];

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
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
          <header className="mb-5 flex flex-col justify-between gap-4 border-b border-ink/10 pb-5 md:mb-6 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-medium text-pine">Next Level Finishes - Titusville, PA</p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-ink sm:text-3xl">Business command center</h2>
              <p className="mt-2 max-w-2xl text-sm text-steel">
                Live Jobber work, follow-up pressure, quote movement, invoice review, and AI draft actions in one place.
                Nothing sends, edits, publishes, or changes finances automatically.
              </p>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
              <Link href="/agent" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white">
                <Sparkles className="h-4 w-4" />
                Open agent
              </Link>
              <Link href="/integrations" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-ink/10 bg-white px-4 py-2 text-sm font-semibold text-ink">
                <PlugZap className="h-4 w-4" />
                Integrations
              </Link>
            </div>
          </header>

          <nav className="sticky top-0 z-20 mb-5 grid grid-cols-2 gap-2 bg-[#f7f3ec]/95 py-2 backdrop-blur sm:grid-cols-4 lg:hidden">
            <MobileNav href="/jobber/jobs" label="Jobs" icon={<BriefcaseBusiness />} />
            <MobileNav href="/jobber/clients" label="Clients" icon={<Users />} />
            <MobileNav href="/jobber/quotes" label="Quotes" icon={<FileText />} />
            <MobileNav href="/integrations" label="Connect" icon={<PlugZap />} />
          </nav>

          <div className="mb-6">
            <JobberDashboard />
          </div>

          <section className="mb-6 grid gap-4 lg:grid-cols-3">
            <Panel title="Financial System" action={<WalletCards className="h-4 w-4 text-pine" />}>
              <div className="grid gap-3">
                <Badge tone="yellow">QuickBooks not connected yet</Badge>
                <p className="text-sm text-steel">
                  No fake cash, profit, deposit, bill, or tax numbers are shown. QuickBooks will be the source for balances,
                  P&L, unpaid invoices, and bills once Intuit authorization is healthy.
                </p>
                <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white" href="/api/integrations/quickbooks/connect">
                  <WalletCards className="h-4 w-4" />
                  Connect QuickBooks
                </a>
              </div>
            </Panel>

            <Panel title="Lead Intake">
              <div className="grid gap-3 text-sm text-steel">
                <p>Meta Leads and Twilio SMS receiver routes are installed. The app shows missing setup instead of inventing leads.</p>
                <div className="flex flex-wrap gap-2">
                  <Link className="font-semibold text-pine" href="/integrations">Open integrations</Link>
                  <Link className="font-semibold text-pine" href="/leads">Lead inbox</Link>
                </div>
              </div>
            </Panel>

            <Panel title="AI Controls">
              <div className="grid gap-3 text-sm text-steel">
                <Badge tone="green">Draft and approve only</Badge>
                <p>The agent can draft follow-ups, prep checklists, quote notes, client texts, and ad ideas from live Jobber data.</p>
                <Link className="font-semibold text-pine" href="/agent">Open AI agent</Link>
              </div>
            </Panel>
          </section>
        </div>
      </div>
    </main>
  );
}

function MobileNav({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  return (
    <Link
      href={href}
      className="flex min-h-14 items-center justify-center gap-2 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm"
    >
      <span className="text-pine [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {label}
    </Link>
  );
}
