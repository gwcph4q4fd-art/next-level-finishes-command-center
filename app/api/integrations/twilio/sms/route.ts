import { IntegrationProvider } from "@prisma/client";
import { NextResponse } from "next/server";
import { createInboundLead, getTwilioSmsWebhookUrl, markInboundIntegration, verifyTwilioSignature } from "@/lib/inbound-integrations";
import { draftSmsReply } from "@/lib/sms-ai";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ready: true,
    message: "Twilio inbound SMS webhook is ready. Use POST from Twilio.",
    webhookUrl: getTwilioSmsWebhookUrl(),
    method: "POST",
    contentType: "application/x-www-form-urlencoded",
    requiredTwilioField: "A message comes in",
    signatureValidation: process.env.TWILIO_AUTH_TOKEN ? "enabled" : "disabled_missing_auth_token"
  });
}

export async function POST(request: Request) {
  const receivedAt = new Date().toISOString();

  try {
    const raw = await request.text();
    const params = new URLSearchParams(raw);
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    const forwardedUrl = forwardedHost ? `${forwardedProto}://${forwardedHost}${new URL(request.url).pathname}` : "";
    const signatureUrls = Array.from(new Set([getTwilioSmsWebhookUrl(), request.url, forwardedUrl].filter(Boolean)));
    const signature = request.headers.get("x-twilio-signature");
    const verification = verifyTwilioSignature(signatureUrls, params, signature);

    if (!verification.valid) {
      await markInboundIntegration(IntegrationProvider.TWILIO, "Signature failed", {
        webhookUrl: getTwilioSmsWebhookUrl(),
        lastReceivedAt: receivedAt,
        lastError: "Twilio signature check failed. Confirm the Twilio phone number webhook URL exactly matches the Command Center webhook URL.",
        diagnostics: {
          signatureChecked: verification.checked,
          signaturePresent: Boolean(signature),
          candidateUrlCount: signatureUrls.length,
          stableWebhookUrl: getTwilioSmsWebhookUrl(),
          requestUrl: request.url,
          forwardedUrl
        }
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
      lastReceivedAt: receivedAt,
      lastError: null,
      lastLeadId: lead.id,
      lastDraftId: lead.draftId,
      diagnostics: {
        signatureChecked: verification.checked,
        signatureMatchedUrl: verification.matchedUrl || "not_checked",
        messageSid: params.get("MessageSid"),
        from,
        bodyLength: body.length,
        aiModel: draft.model,
        promptSource: draft.promptSource
      }
    });

    return new Response("<Response></Response>", { status: 200, headers: { "Content-Type": "text/xml" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[twilio:sms] inbound webhook failed", error);
    try {
      await markInboundIntegration(IntegrationProvider.TWILIO, "Webhook error", {
        webhookUrl: getTwilioSmsWebhookUrl(),
        lastReceivedAt: receivedAt,
        lastError: message.slice(0, 1000),
        diagnostics: {
          errorName: error instanceof Error ? error.name : "UnknownError"
        }
      });
    } catch (statusError) {
      console.error("[twilio:sms] failed to record webhook error", statusError);
    }
    return new Response("<Response></Response>", { status: 500, headers: { "Content-Type": "text/xml" } });
  }
}
