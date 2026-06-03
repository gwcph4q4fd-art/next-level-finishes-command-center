import { CheckCircle2, KeyRound, PlugZap, ShieldCheck } from "lucide-react";
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
              <Badge tone="blue">{integration.mode}</Badge>
              <div>
                <p className="text-sm font-semibold text-ink">Goal</p>
                <p className="mt-1 text-sm text-steel">{integration.purpose}</p>
              </div>
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
