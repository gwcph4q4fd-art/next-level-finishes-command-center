"use client";

import { JobberPipelineDetailPage } from "@/components/jobber-record-pages";

export default function JobberInvoiceDetailPage({ params }: { params: { id: string } }) {
  return <JobberPipelineDetailPage collection="invoices" id={params.id} />;
}
