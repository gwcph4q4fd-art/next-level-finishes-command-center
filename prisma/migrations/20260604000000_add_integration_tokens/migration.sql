ALTER TABLE "IntegrationConnection" ADD COLUMN "accountKey" TEXT NOT NULL DEFAULT 'owner';
ALTER TABLE "IntegrationConnection" ADD COLUMN "accessToken" TEXT;
ALTER TABLE "IntegrationConnection" ADD COLUMN "refreshToken" TEXT;
ALTER TABLE "IntegrationConnection" ADD COLUMN "tokenType" TEXT;
ALTER TABLE "IntegrationConnection" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "IntegrationConnection" ADD COLUMN "externalAccountId" TEXT;
ALTER TABLE "IntegrationConnection" ADD COLUMN "externalAccountName" TEXT;

CREATE UNIQUE INDEX "IntegrationConnection_provider_accountKey_key" ON "IntegrationConnection"("provider", "accountKey");
