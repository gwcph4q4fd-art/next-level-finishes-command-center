import { IntegrationProvider } from "@prisma/client";
import { NextResponse } from "next/server";
import { createInboundLead, getTwilioSmsWebhookUrl, markInboundIntegration, verifyTwilioSignature } from "@/lib/inbound-integrations";
import { draftSmsReply } from "@/lib/sms-ai";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ready: true,
    message: "Twilio inbound SMS webhook is ready. Use POST from Twilio.",
    webhookUrl: getTwilioSmsWebhookUrl()
  });
}

export async function POST(request: Request) {
  const raw = await request.text();
  const params = new URLSearchParams(raw);
  const verification = verifyTwilioSignature(getTwilioSmsWebhookUrl(), params, request.headers.get("x-twilio-signature"));

  if (!verification.valid) {
    await markInboundIntegration(IntegrationProvider.TWILIO, "Signature failed", {
      webhookUrl: getTwilioSmsWebhookUrl(),
      lastError: "Twilio signature check failed."
    });
    return new Response("<Response></Response>", { status: 401, headers: { "Content-Type": "text/xml" } });
  }

  const from = params.get("From") || "";
  const body = params.get("Body") || "";
  const name = params.get("ProfileName") || from || "Text message lead";
  const draft = await draftSmsReply({
    from,
    name,
    message: body || "Inbound text received with no body."
  });

  const lead = await createInboundLead({
    source: "Twilio SMS",
    name,
    phone: from,
    message: body || "Inbound text received with no body.",
    externalId: params.get("MessageSid") || undefined,
    draft: {
      prompt: draft.prompt,
      output: draft.output,
      model: draft.model
    }
  });

  await markInboundIntegration(IntegrationProvider.TWILIO, "Receiving", {
    webhookUrl: getTwilioSmsWebhookUrl(),
    lastReceivedAt: new Date().toISOString(),
    lastError: null,
    lastLeadId: lead.id,
    lastDraftId: lead.draftId,
    diagnostics: {
      signatureChecked: verification.checked,
      messageSid: params.get("MessageSid"),
      aiModel: draft.model,
      promptSource: draft.promptSource
    }
  });

  return new Response("<Response></Response>", { status: 200, headers: { "Content-Type": "text/xml" } });
}
