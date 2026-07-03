CREATE TABLE IF NOT EXISTS "chat_device_keys" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "publicKey" TEXT NOT NULL,
  "algorithm" TEXT NOT NULL DEFAULT 'ECDH-P256',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3),
  CONSTRAINT "chat_device_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "chat_device_keys_tenantId_userId_deviceId_key" ON "chat_device_keys"("tenantId", "userId", "deviceId");
CREATE INDEX IF NOT EXISTS "chat_device_keys_tenantId_idx" ON "chat_device_keys"("tenantId");
CREATE INDEX IF NOT EXISTS "chat_device_keys_userId_idx" ON "chat_device_keys"("userId");
CREATE INDEX IF NOT EXISTS "chat_device_keys_active_idx" ON "chat_device_keys"("active");

DO $$
BEGIN
  ALTER TABLE "chat_device_keys" ADD CONSTRAINT "chat_device_keys_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "chat_device_keys" ADD CONSTRAINT "chat_device_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
