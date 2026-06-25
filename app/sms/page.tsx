"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquareText, Save, ShieldCheck } from "lucide-react";
import { Badge, Panel, buttonClass, inputClass } from "@/components/ui";

type TwilioStatus = {
  connected: boolean;
  status: string;
  lastReceivedAt?: string | null;
  lastError?: string | null;
  lastLeadId?: string | null;
  webhookUrl?: string;
  twilio?: {
    accountSidConfigured: boolean;
    authTokenConfigured: boolean;
    phoneNumberConfigured: boolean;
    webhookUrl: string;
  } | null;
};

type PromptConfig = {
  prompt: string;
  defaultPrompt: string;
  updatedAt?: string | null;
  source: string;
};

export default function SmsCommandCenterPage() {
  const [status, setStatus] = useState<TwilioStatus | null>(null);
  const [promptConfig, setPromptConfig] = useState<PromptConfig | null>(null);
  const [prompt, setPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const [statusResponse, promptResponse] = await Promise.all([
      fetch("/api/integrations/twilio/status", { cache: "no-store" }),
      fetch("/api/integrations/twilio/prompt", { cache: "no-store" })
    ]);
    const nextStatus = await statusResponse.json();
    const nextPrompt = await promptResponse.json();
    setStatus(nextStatus);
    setPromptConfig(nextPrompt);
    setPrompt(nextPrompt.prompt || "");
  }

  async function savePrompt() {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/integrations/twilio/prompt", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setMessage(data.error || "Unable to save prompt.");
      return;
    }
    setMessage("SMS AI prompt saved. New inbound texts will use this guidance.");
    await load();
  }

  useEffect(() => {
    load().catch(() => setMessage("Unable to load SMS setup."));
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-pine">
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>

      <header className="mb-6">
        <p className="text-sm font-semibold text-pine">Next Level Finishes</p>
        <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">SMS AI Command Center</h1>
        <p className="mt-2 text-sm text-steel">
          Incoming business texts become Lead Inbox records with AI reply drafts. Replies are never sent automatically.
        </p>
      </header>

      <div className="grid gap-5">
        <Panel title="Twilio Receiver" action={<MessageSquareText className="h-4 w-4 text-pine" />}>
          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge tone={status?.twilio?.accountSidConfigured && status?.twilio?.authTokenConfigured ? "green" : "yellow"}>
                {status?.twilio?.accountSidConfigured && status?.twilio?.authTokenConfigured ? "Credentials configured" : "Needs Twilio credentials"}
              </Badge>
              <Badge tone="green">Draft only</Badge>
            </div>
            <p className="text-sm text-steel">
              To connect business SMS, use a Twilio phone number or forward your business number into Twilio. A normal personal cell inbox cannot be read by this app unless the messages are routed through Twilio.
            </p>
            {status?.webhookUrl ? (
              <div>
                <p className="text-sm font-semibold text-ink">Inbound SMS webhook URL</p>
                <code className="mt-1 block max-w-full overflow-x-auto break-all rounded-md bg-ink p-3 text-xs text-white">{status.webhookUrl}</code>
              </div>
            ) : null}
            <div className="grid gap-2 rounded-md bg-primer/60 p-3 text-xs text-steel sm:grid-cols-2">
              <Diag label="Last received" value={status?.lastReceivedAt ? new Date(status.lastReceivedAt).toLocaleString() : "Never"} />
              <Diag label="Last lead id" value={status?.lastLeadId || "None yet"} />
              <Diag label="Last error" value={status?.lastError || "None"} bad={Boolean(status?.lastError)} />
              <Diag label="Twilio phone number" value={status?.twilio?.phoneNumberConfigured ? "Configured" : "Optional/missing"} />
            </div>
          </div>
        </Panel>

        <Panel title="AI Reply Instructions" action={<ShieldCheck className="h-4 w-4 text-pine" />}>
          <div className="grid gap-4">
            <p className="text-sm text-steel">
              Paste the big prompt you want the SMS agent to follow. Include services, prices, tone, scheduling rules, what jobs you want, what jobs you do not want, and how aggressive you want follow-up to be.
            </p>
            <textarea
              className={`${inputClass} min-h-96 w-full leading-relaxed`}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button className={`${buttonClass} w-full sm:w-auto`} onClick={savePrompt} disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save SMS AI prompt"}
              </button>
              {promptConfig?.updatedAt ? <span className="text-xs text-steel">Updated {new Date(promptConfig.updatedAt).toLocaleString()}</span> : null}
              {promptConfig?.source ? <Badge tone="blue">Prompt source: {promptConfig.source}</Badge> : null}
            </div>
            {message ? <p className={message.includes("Unable") ? "rounded-md bg-clay/10 p-3 text-sm text-clay" : "rounded-md bg-pine/10 p-3 text-sm text-pine"}>{message}</p> : null}
          </div>
        </Panel>

        <Panel title="What Happens When A Text Comes In">
          <div className="grid gap-2 text-sm text-steel">
            <p>1. Twilio posts the inbound text to the webhook URL.</p>
            <p>2. The app verifies the Twilio signature when `TWILIO_AUTH_TOKEN` is set.</p>
            <p>3. A Lead Inbox record is created with the customer phone number and message.</p>
            <p>4. OpenAI drafts a reply using your saved SMS instructions.</p>
            <p>5. The draft is logged and waits for you to approve, edit, copy, or send manually.</p>
          </div>
        </Panel>
      </div>
    </main>
  );
}

function Diag({ label, value, bad = false }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="font-semibold uppercase text-steel">{label}</p>
      <p className={bad ? "break-words font-semibold text-clay" : "break-words text-ink"}>{value}</p>
    </div>
  );
}
