import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const name = body.name || "there";
  const jobType = body.jobType || "your project";
  const location = body.location || "your place";
  const message = body.message || "";

  const prompt = [
    "Draft a customer reply for Next Level Finishes.",
    "Tone: professional, friendly, direct, local contractor, not corporate.",
    "Safety: draft only, never auto-send.",
    `Lead: ${name}, ${jobType}, ${location}. Message: ${message}`
  ].join("\n");

  const fallback = `Hi ${name}, thanks for reaching out to Next Level Finishes. We can definitely talk through the ${jobType.toLowerCase()} project in ${location}. A couple quick questions so I can point you in the right direction: what areas are included, do you have any photos you can send over, and are you hoping to have it done by a certain date?\n\nIf it works for you, I can also set up a time to look at it in person and give you a clear estimate. What does your schedule look like over the next few days?`;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      draft: fallback,
      prompt,
      model: "local-fallback",
      logged: true,
      safety: "Draft generated only. No customer message was sent."
    });
  }

  try {
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You draft replies for Next Level Finishes in Titusville, PA. Sound like a real local contractor: professional, friendly, direct, never corporate. Ask useful scheduling and scope questions. Do not imply anything was sent."
        },
        { role: "user", content: prompt }
      ]
    });

    return NextResponse.json({
      draft: completion.choices[0]?.message.content || fallback,
      prompt,
      model: "gpt-4o-mini",
      logged: true,
      safety: "Draft generated only. No customer message was sent."
    });
  } catch {
    return NextResponse.json({
      draft: fallback,
      prompt,
      model: "local-fallback",
      logged: true,
      safety: "OpenAI unavailable, so a local fallback draft was created. No customer message was sent."
    });
  }
}
