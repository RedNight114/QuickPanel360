ALTER TABLE "chat_messages"
ADD COLUMN IF NOT EXISTS "clientEncryptedPayload" JSONB;

ALTER TABLE "chat_device_keys"
ADD COLUMN IF NOT EXISTS "deviceName" TEXT,
ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
