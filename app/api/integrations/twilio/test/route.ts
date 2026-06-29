import { IntegrationProvider } from "@prisma/client";
import { NextResponse } from "next/server";
import { createInboundLead, getTwilioSmsWebhookUrl, markInboundIntegration } from "@/lib/inbound-integrations";
import { draftSmsReply } from "@/lib/sms-ai";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const from = typeof body.from === "string" && body.from.trim() ? body.from.trim() : "+18145550123";
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Test SMS lead";
  const message =
    typeof body.message === "string" && body.message.trim()
      ? body.message.trim()
      : "Hi, I need an estimate for cabinet painting. Can you help?";

  const draft = await draftSmsReply({ from, name, message });
  const lead = await createInboundLead({
    source: "Twilio SMS",
    name,
    phone: from,
    message,
    externalId: `manual-test-${Date.now()}`,
    draft: {
      prompt: draft.prompt,
      output: draft.output,
      model: draft.model
    }
  });

  await markInboundIntegration(IntegrationProvider.TWILIO, "Tested", {
    webhookUrl: getTwilioSmsWebhookUrl(),
    lastReceivedAt: new Date().toISOString(),
    lastError: null,
    lastLeadId: lead.id,
    lastDraftId: lead.draftId,
    diagnostics: {
      testMode: true,
      aiModel: draft.model,
      promptSource: draft.promptSource
    }
  });

  return NextResponse.json({
    ok: true,
    leadId: lead.id,
    draftId: lead.draftId,
    draft: draft.output,
    safety: "Test draft only. No SMS was sent."
  });
}
