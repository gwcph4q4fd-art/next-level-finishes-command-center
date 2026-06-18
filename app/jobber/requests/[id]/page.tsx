"use client";

import { JobberPipelineDetailPage } from "@/components/jobber-record-pages";

export default function JobberRequestDetailPage({ params }: { params: { id: string } }) {
  return <JobberPipelineDetailPage collection="requests" id={params.id} />;
}
