import { CalendarClock } from "lucide-react";
import { Badge, Panel } from "@/components/ui";
import { schedule } from "@/lib/mock-data";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SchedulePage() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <a href="/" className="text-sm font-semibold text-pine">Dashboard</a>
        <h1 className="mt-2 text-3xl font-bold text-ink">Schedule</h1>
        <p className="mt-2 text-sm text-steel">Calendar-style view for jobs, estimate appointments, start/end dates, and reminder tasks.</p>
      </header>

      <Panel title="This Week" action={<CalendarClock className="h-4 w-4 text-pine" />}>
        <div className="grid gap-3 lg:grid-cols-6">
          {days.map((day, index) => (
            <div key={day} className="min-h-56 rounded-md border border-ink/10 bg-primer/40 p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold text-ink">{day}</p>
                <span className="text-xs text-steel">Jun {index + 1}</span>
              </div>
              {day === "Wed" ? (
                <div className="grid gap-2">
                  {schedule.map((item) => (
                    <div key={item.id} className="rounded-md bg-white p-3 shadow-sm">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-ink">{item.time}</p>
                        <Badge tone={item.type === "Job" ? "green" : item.type === "Estimate" ? "blue" : "neutral"}>{item.type}</Badge>
                      </div>
                      <p className="text-sm font-semibold text-ink">{item.title}</p>
                      <p className="mt-1 text-xs text-steel">{item.location}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-steel">Open capacity</p>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </main>
  );
}
