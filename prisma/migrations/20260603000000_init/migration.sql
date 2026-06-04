-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'ESTIMATE_SCHEDULED', 'QUOTED', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('INTERIOR_PAINTING', 'EXTERIOR_PAINTING', 'CABINET_PAINTING', 'DECK_STAINING', 'DRYWALL_TRIM', 'BATHROOM_REMODEL', 'KITCHEN_REMODEL');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('ESTIMATE', 'JOB', 'REMINDER');

-- CreateEnum
CREATE TYPE "DraftType" AS ENUM ('LEAD_REPLY', 'TEXT_REPLY', 'ESTIMATE', 'DAILY_BRIEFING');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('DRAFTED', 'APPROVED', 'SENT_MANUALLY', 'DISCARDED');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('QUICKBOOKS', 'JOBBER', 'META', 'WEBSITE', 'TWILIO');

-- CreateEnum
CREATE TYPE "IntegrationMode" AS ENUM ('READ_ONLY', 'PLACEHOLDER');

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT DEFAULT 'PA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "source" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "jobType" "JobType",
    "message" TEXT NOT NULL,
    "urgency" TEXT,
    "location" TEXT,
    "nextStep" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastTouched" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estimate" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "customerId" TEXT,
    "jobType" "JobType" NOT NULL,
    "location" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "materials" TEXT,
    "prepLevel" TEXT,
    "timeline" TEXT,
    "amountLow" DECIMAL(10,2),
    "amountHigh" DECIMAL(10,2),
    "customerText" TEXT NOT NULL,
    "internalNotes" TEXT NOT NULL,
    "exclusions" TEXT NOT NULL,
    "followUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Estimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "title" TEXT NOT NULL,
    "jobType" "JobType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Scheduled',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "AppointmentType" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceSnapshot" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "customer" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'Mock',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillSnapshot" (
    "id" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'Mock',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiDraft" (
    "id" TEXT NOT NULL,
    "type" "DraftType" NOT NULL,
    "status" "DraftStatus" NOT NULL DEFAULT 'DRAFTED',
    "leadId" TEXT,
    "prompt" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "model" TEXT,
    "approvedAt" TIMESTAMP(3),
    "sentManuallyAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "accountKey" TEXT NOT NULL DEFAULT 'owner',
    "mode" "IntegrationMode" NOT NULL DEFAULT 'PLACEHOLDER',
    "status" TEXT NOT NULL DEFAULT 'Not connected',
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenType" TEXT,
    "expiresAt" TIMESTAMP(3),
    "externalAccountId" TEXT,
    "externalAccountName" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_receivedAt_idx" ON "Lead"("receivedAt");

-- CreateIndex
CREATE INDEX "AiDraft_type_idx" ON "AiDraft"("type");

-- CreateIndex
CREATE INDEX "AiDraft_createdAt_idx" ON "AiDraft"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConnection_provider_accountKey_key" ON "IntegrationConnection"("provider", "accountKey");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDraft" ADD CONSTRAINT "AiDraft_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
