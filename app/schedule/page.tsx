import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Panel } from "@/components/ui";

export default function SchedulePage() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <Link href="/" className="text-sm font-semibold text-pine">Dashboard</Link>
        <h1 className="mt-2 text-3xl font-bold text-ink">Schedule</h1>
        <p className="mt-2 text-sm text-steel">The live schedule now comes from synced Jobber jobs and visits.</p>
      </header>

      <Panel title="Live Jobber Schedule" action={<CalendarClock className="h-4 w-4 text-pine" />}>
        <div className="grid gap-3 text-sm text-steel">
          <p>No fake calendar events are shown here. Use the Jobber Jobs page or the dashboard schedule cards to view live synced work.</p>
          <Link className="font-semibold text-pine" href="/jobber/jobs">Open Jobber jobs</Link>
        </div>
      </Panel>
    </main>
  );
}
