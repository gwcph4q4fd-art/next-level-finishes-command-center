import { PlugZap, ShieldCheck } from "lucide-react";
import { Badge, Panel } from "@/components/ui";
import { integrations } from "@/lib/mock-data";

export default function IntegrationsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <a href="/" className="text-sm font-semibold text-pine">Dashboard</a>
        <h1 className="mt-2 text-3xl font-bold text-ink">Integration Placeholders</h1>
        <p className="mt-2 text-sm text-steel">Read-only first. These cards define what each connection may read and what it cannot change.</p>
      </header>

      <section className="grid gap-5 md:grid-cols-2">
        {integrations.map((integration) => (
          <Panel key={integration.name} title={integration.name} action={<PlugZap className="h-4 w-4 text-pine" />}>
            <div className="grid gap-4">
              <Badge tone="blue">{integration.mode}</Badge>
              <div>
                <p className="text-sm font-semibold text-ink">Reads</p>
                <p className="mt-1 text-sm text-steel">{integration.covers}</p>
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
