import { NextResponse } from "next/server";
import { getSmsAiPrompt, saveSmsAiPrompt } from "@/lib/sms-ai";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getSmsAiPrompt());
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const prompt = typeof body.prompt === "string" ? body.prompt : "";
    return NextResponse.json(await saveSmsAiPrompt(prompt));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save SMS AI prompt.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
