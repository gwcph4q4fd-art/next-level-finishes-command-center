import { IntegrationMode, IntegrationProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const OWNER_ACCOUNT_KEY = "owner";
const SMS_PROMPT_VERSION = "sms-ai-v1";

export const defaultSmsAiPrompt = [
  "You write SMS reply drafts for Next Level Finishes.",
  "Business: Next Level Finishes, owned by Rueben, a painting and refinishing contractor based in Titusville, PA.",
  "Services: exterior painting, cabinet refinishing, deck staining/refinishing, pressure washing, trim, drywall, and small remodeling.",
  "Service areas: Titusville, Franklin, Oil City, Meadville, Erie, Warren, Kane, and surrounding areas.",
  "Goals: respond fast, book profitable estimates, avoid underpricing, keep the pipeline full, improve cash flow, and sound like a real local contractor.",
  "Voice: professional, friendly, direct, confident, not corporate, not pushy.",
  "Every reply should usually ask one clear next-step question, such as project address, photos, timeline, scope, or estimate availability.",
  "Never promise availability, pricing, or start dates unless the customer already provided enough information.",
  "Never say the message was sent. This is a draft for Rueben to approve."
].join("\n");

type SmsAiNotes = {
  kind?: string;
  smsAiPrompt?: string;
  promptUpdatedAt?: string;
  promptUpdatedBy?: string;
};

function parseNotes(raw?: string | null): SmsAiNotes {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as SmsAiNotes;
  } catch {
    return {};
  }
}

export async function getSmsAiPrompt() {
  const connection = await prisma.integrationConnection.findUnique({
    where: {
      provider_accountKey: {
        provider: IntegrationProvider.TWILIO,
        accountKey: OWNER_ACCOUNT_KEY
      }
    }
  });
  const notes = parseNotes(connection?.notes);

  return {
    prompt: notes.smsAiPrompt || process.env.SMS_AI_SYSTEM_PROMPT || defaultSmsAiPrompt,
    defaultPrompt: defaultSmsAiPrompt,
    updatedAt: notes.promptUpdatedAt || null,
    source: notes.smsAiPrompt ? "database" : process.env.SMS_AI_SYSTEM_PROMPT ? "environment" : "default"
  };
}

export async function saveSmsAiPrompt(prompt: string) {
  const trimmed = prompt.trim();
  if (trimmed.length < 50) {
    throw new Error("SMS AI prompt must be at least 50 characters so the drafts have real guidance.");
  }

  const current = await prisma.integrationConnection.findUnique({
    where: {
      provider_accountKey: {
        provider: IntegrationProvider.TWILIO,
        accountKey: OWNER_ACCOUNT_KEY
      }
    }
  });
  const notes = {
    ...parseNotes(current?.notes),
    kind: SMS_PROMPT_VERSION,
    smsAiPrompt: trimmed,
    promptUpdatedAt: new Date().toISOString(),
    promptUpdatedBy: "owner"
  };

  await prisma.integrationConnection.upsert({
    where: {
      provider_accountKey: {
        provider: IntegrationProvider.TWILIO,
        accountKey: OWNER_ACCOUNT_KEY
      }
    },
    create: {
      provider: IntegrationProvider.TWILIO,
      accountKey: OWNER_ACCOUNT_KEY,
      mode: IntegrationMode.PLACEHOLDER,
      status: "Ready",
      notes: JSON.stringify(notes)
    },
    update: {
      notes: JSON.stringify(notes)
    }
  });

  return {
    prompt: trimmed,
    updatedAt: notes.promptUpdatedAt
  };
}

export async function draftSmsReply(input: {
  from: string;
  name?: string;
  message: string;
}) {
  const promptConfig = await getSmsAiPrompt();
  const prompt = [
    promptConfig.prompt,
    "",
    "Incoming business text:",
    `From: ${input.name || input.from || "Unknown customer"}`,
    `Phone: ${input.from || "Not provided"}`,
    `Message: ${input.message || "No message body provided."}`,
    "",
    "Write one strong SMS reply draft.",
    "Keep it concise enough for texting. Ask a specific next-step question. Do not include labels, analysis, or quotation marks."
  ].join("\n");

  const fallback = `Thanks for reaching out to Next Level Finishes. I can help with that. Can you send the project address, a few photos, and what kind of timeline you are hoping for? Then I can point you in the right direction and set up an estimate if it makes sense.`;

  if (!process.env.OPENAI_API_KEY) {
    return {
      output: fallback,
      prompt,
      model: "local-fallback",
      promptSource: promptConfig.source
    };
  }

  try {
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: process.env.SMS_AI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You draft text message replies for a local contractor. Draft only. Never claim anything was sent."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.65
    });

    return {
      output: completion.choices[0]?.message.content?.trim() || fallback,
      prompt,
      model: process.env.SMS_AI_MODEL || "gpt-4o-mini",
      promptSource: promptConfig.source
    };
  } catch (error) {
    console.error("[twilio:sms-ai] draft generation failed", error);
    return {
      output: fallback,
      prompt,
      model: "local-fallback",
      promptSource: promptConfig.source
    };
  }
}
