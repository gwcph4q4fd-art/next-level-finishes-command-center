"use client";

import { JobberPipelineDetailPage } from "@/components/jobber-record-pages";

export default function JobberQuoteDetailPage({ params }: { params: { id: string } }) {
  return <JobberPipelineDetailPage collection="quotes" id={params.id} />;
}
