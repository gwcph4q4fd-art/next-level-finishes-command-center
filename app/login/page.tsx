"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { buttonClass, inputClass } from "@/components/ui";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Login failed");
      setLoading(false);
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next");
    window.location.href = next || "/";
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="w-full max-w-md rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-md bg-pine/10 p-2 text-pine">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-pine">Secure Access</p>
            <h1 className="text-2xl font-bold text-ink">Next Level Finishes</h1>
          </div>
        </div>

        <form onSubmit={submit} className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            Password
            <input
              className={inputClass}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error ? (
            <p className="rounded-md border border-clay/20 bg-clay/10 p-3 text-sm text-clay">{error}</p>
          ) : null}

          <button className={buttonClass} disabled={loading} type="submit">
            <ShieldCheck className="h-4 w-4" />
            {loading ? "Checking..." : "Log in"}
          </button>
        </form>

        <p className="mt-5 text-xs leading-5 text-steel">
          This command center is private. Sessions expire after 8 hours, and no integrations can send or change data without owner approval.
        </p>
      </section>
    </main>
  );
}
