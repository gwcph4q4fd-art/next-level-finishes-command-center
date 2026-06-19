import { IntegrationProvider } from "@prisma/client";
import { NextResponse } from "next/server";
import { createInboundLead, getMetaWebhookUrl, markInboundIntegration, verifyMetaSignature } from "@/lib/inbound-integrations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.META_VERIFY_TOKEN && challenge) {
    await markInboundIntegration(IntegrationProvider.META, "Ready", {
      webhookUrl: getMetaWebhookUrl(),
      lastError: null,
      diagnostics: { webhookVerified: true }
    });
    return new Response(challenge, { status: 200 });
  }

  await markInboundIntegration(IntegrationProvider.META, "Verification failed", {
    webhookUrl: getMetaWebhookUrl(),
    lastError: "Meta webhook verify token did not match."
  });
  return NextResponse.json({ error: "Meta verification failed." }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const verification = verifyMetaSignature(rawBody, signature);

  if (!verification.valid) {
    await markInboundIntegration(IntegrationProvider.META, "Signature failed", {
      webhookUrl: getMetaWebhookUrl(),
      lastError: "Meta signature check failed."
    });
    return NextResponse.json({ error: "Invalid Meta signature." }, { status: 401 });
  }

  const payload = rawBody ? JSON.parse(rawBody) : {};
  const entry = payload.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value || {};
  const fields = Array.isArray(value.field_data) ? value.field_data : [];
  const field = (name: string) => fields.find((item: { name?: string }) => item.name === name)?.values?.[0];
  const name = field("full_name") || field("name") || value.full_name || "Meta Lead";
  const phone = field("phone_number") || field("phone") || value.phone_number;
  const email = field("email") || value.email;
  const message = [
    value.leadgen_id ? `Meta lead ID: ${value.leadgen_id}` : "New Meta lead received.",
    value.form_id ? `Form ID: ${value.form_id}` : "",
    fields.length ? `Fields: ${fields.map((item: { name?: string; values?: string[] }) => `${item.name}: ${(item.values || []).join(", ")}`).join("; ")}` : ""
  ].filter(Boolean).join("\n");

  const lead = await createInboundLead({
    source: "Meta Lead Ads",
    name,
    phone,
    email,
    message,
    externalId: value.leadgen_id
  });

  await markInboundIntegration(IntegrationProvider.META, "Receiving", {
    webhookUrl: getMetaWebhookUrl(),
    lastReceivedAt: new Date().toISOString(),
    lastError: null,
    lastLeadId: lead.id,
    diagnostics: { signatureChecked: verification.checked }
  });

  return NextResponse.json({ received: true, leadId: lead.id });
}
