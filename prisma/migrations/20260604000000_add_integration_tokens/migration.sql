ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "accountKey" TEXT NOT NULL DEFAULT 'owner';
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "accessToken" TEXT;
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "refreshToken" TEXT;
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "tokenType" TEXT;
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "externalAccountId" TEXT;
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "externalAccountName" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationConnection_provider_accountKey_key" ON "IntegrationConnection"("provider", "accountKey");
