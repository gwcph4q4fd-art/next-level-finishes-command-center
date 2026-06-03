import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const jobType = body.jobType || "Painting";
  const location = body.location || "Titusville, PA";
  const scope = body.scope || "Project scope to be confirmed on site.";
  const materials = body.materials || "Professional-grade primers, coatings, stains, and sundries as needed.";
  const prepLevel = body.prepLevel || "Standard prep";
  const timeline = body.timeline || "Schedule to be confirmed.";

  const estimate = {
    scopeOfWork: [
      `Complete ${jobType.toLowerCase()} work at ${location}.`,
      `Prep level: ${prepLevel}.`,
      `Scope notes: ${scope}`,
      `Materials: ${materials}`,
      `Expected timeline: ${timeline}`
    ],
    exclusions: [
      "Hidden damage, rot, water intrusion, or substrate repairs not visible during the estimate.",
      "Electrical, plumbing, structural work, or permit fees unless written into the final agreement.",
      "Color changes after materials are ordered may affect price and schedule."
    ],
    customerText: `Thanks for the opportunity to look at your ${jobType.toLowerCase()} project. Based on the notes provided, Next Level Finishes would handle the prep, materials, and finish work with a clean, professional process. The next step is to confirm measurements, photos, surface condition, and timing so the final estimate is accurate and there are no surprises.`,
    internalNotes:
      "Confirm access, parking, surface condition, moisture concerns, customer color expectations, deposit amount, and whether this needs to be phased around weather or household schedule."
  };

  return NextResponse.json({
    estimate,
    logged: true,
    safety: "Estimate draft only. Nothing was sent to the customer."
  });
}
