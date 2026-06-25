import crypto from "crypto";
import { DraftType, IntegrationMode, IntegrationProvider, JobType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const APP_URL = "https://next-level-finishes-command-center.vercel.app";
const OWNER_ACCOUNT_KEY = "owner";

type Notes = {
  webhookUrl?: string;
  lastReceivedAt?: string;
  lastError?: string | null;
  lastLeadId?: string;
  lastDraftId?: string;
  diagnostics?: Record<string, string | boolean | null | undefined>;
  smsAiPrompt?: string;
  promptUpdatedAt?: string;
  promptUpdatedBy?: string;
};

function parseNotes(raw?: string | null): Notes {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Notes;
  } catch {
    return {};
  }
}

export function getMetaWebhookUrl() {
  return `${APP_URL}/api/integrations/meta/webhook`;
}

export function getTwilioSmsWebhookUrl() {
  return `${APP_URL}/api/integrations/twilio/sms`;
}

export function getMetaStatusConfig() {
  return {
    verifyTokenConfigured: Boolean(process.env.META_VERIFY_TOKEN),
    pageAccessTokenConfigured: Boolean(process.env.META_PAGE_ACCESS_TOKEN),
    appSecretConfigured: Boolean(process.env.META_APP_SECRET),
    webhookUrl: getMetaWebhookUrl()
  };
}

export function getTwilioStatusConfig() {
  return {
    accountSidConfigured: Boolean(process.env.TWILIO_ACCOUNT_SID),
    authTokenConfigured: Boolean(process.env.TWILIO_AUTH_TOKEN),
    phoneNumberConfigured: Boolean(process.env.TWILIO_PHONE_NUMBER),
    webhookUrl: getTwilioSmsWebhookUrl()
  };
}

type InboundProvider = typeof IntegrationProvider.META | typeof IntegrationProvider.TWILIO;

export async function getInboundIntegrationStatus(provider: InboundProvider) {
  const connection = await prisma.integrationConnection.findUnique({
    where: { provider_accountKey: { provider, accountKey: OWNER_ACCOUNT_KEY } }
  });
  const notes = parseNotes(connection?.notes);
  const metaConfig = provider === IntegrationProvider.META ? getMetaStatusConfig() : null;
  const twilioConfig = provider === IntegrationProvider.TWILIO ? getTwilioStatusConfig() : null;

  return {
    connected: Boolean(connection?.status === "Ready" || connection?.status === "Receiving"),
    status: connection?.status || "Not connected",
    lastSyncAt: connection?.lastSyncAt?.toISOString() || null,
    lastReceivedAt: notes.lastReceivedAt || null,
    lastError: notes.lastError || null,
    lastLeadId: notes.lastLeadId || null,
    webhookUrl: notes.webhookUrl || metaConfig?.webhookUrl || twilioConfig?.webhookUrl,
    meta: metaConfig,
    twilio: twilioConfig
  };
}

export async function markInboundIntegration(provider: InboundProvider, status: string, notes: Notes) {
  const current = await prisma.integrationConnection.findUnique({
    where: { provider_accountKey: { provider, accountKey: OWNER_ACCOUNT_KEY } }
  });
  const nextNotes = {
    ...parseNotes(current?.notes),
    ...notes
  };

  return prisma.integrationConnection.upsert({
    where: { provider_accountKey: { provider, accountKey: OWNER_ACCOUNT_KEY } },
    create: {
      provider,
      accountKey: OWNER_ACCOUNT_KEY,
      mode: IntegrationMode.PLACEHOLDER,
      status,
      lastSyncAt: notes.lastReceivedAt ? new Date(notes.lastReceivedAt) : undefined,
      notes: JSON.stringify(nextNotes)
    },
    update: {
      mode: IntegrationMode.PLACEHOLDER,
      status,
      lastSyncAt: notes.lastReceivedAt ? new Date(notes.lastReceivedAt) : current?.lastSyncAt,
      notes: JSON.stringify(nextNotes)
    }
  });
}

export async function createInboundLead(input: {
  source: "Meta Lead Ads" | "Twilio SMS";
  name?: string;
  phone?: string;
  email?: string;
  location?: string;
  message: string;
  externalId?: string;
  draft?: {
    prompt: string;
    output: string;
    model: string;
  };
}) {
  const lead = await prisma.lead.create({
    data: {
      source: input.source,
      jobType: JobType.EXTERIOR_PAINTING,
      location: input.location || "Titusville, PA",
      message: input.message,
      urgency: "New inbound",
      nextStep: "Review lead and draft reply. Nothing has been sent automatically.",
      customer: {
        create: {
          name: input.name || input.phone || input.email || "New inbound lead",
          phone: input.phone || null,
          email: input.email || null,
          address: input.location || null,
          state: "PA"
        }
      }
    },
    include: { customer: true }
  });

  await prisma.aiDraft.create({
    data: {
      type: input.source === "Twilio SMS" ? DraftType.TEXT_REPLY : DraftType.LEAD_REPLY,
      leadId: lead.id,
      prompt: input.draft?.prompt || `Create a friendly local-contractor reply for ${input.source}.`,
      output: input.draft?.output || `Draft needed for ${lead.customer?.name || "new lead"}: ask for project address, photos, timing, and the best time to schedule an estimate. Do not send automatically.`,
      model: input.draft?.model || "system-placeholder"
    }
  });

  const latestDraft = await prisma.aiDraft.findFirst({
    where: { leadId: lead.id },
    orderBy: { createdAt: "desc" }
  });

  return {
    id: lead.id,
    draftId: latestDraft?.id || "",
    name: lead.customer?.name || "New inbound lead",
    phone: lead.customer?.phone || "",
    email: lead.customer?.email || "",
    source: lead.source,
    message: lead.message
  };
}

export function verifyMetaSignature(rawBody: string, signature?: string | null) {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return { checked: false, valid: true };
  if (!signature?.startsWith("sha256=")) return { checked: true, valid: false };
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  return { checked: true, valid: crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) };
}

export function verifyTwilioSignature(url: string, params: URLSearchParams, signature?: string | null) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return { checked: false, valid: true };
  if (!signature) return { checked: true, valid: false };
  const sorted = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
  const base = sorted.reduce((value, [key, next]) => `${value}${key}${next}`, url);
  const expected = crypto.createHmac("sha1", token).update(base).digest("base64");
  return { checked: true, valid: crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) };
}
