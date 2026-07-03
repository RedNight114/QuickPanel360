-- CreateTable
CREATE TABLE "chat_message_mentions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_message_mentions_messageId_userId_key" ON "chat_message_mentions"("messageId", "userId");

-- CreateIndex
CREATE INDEX "chat_message_mentions_messageId_idx" ON "chat_message_mentions"("messageId");

-- CreateIndex
CREATE INDEX "chat_message_mentions_userId_idx" ON "chat_message_mentions"("userId");

-- CreateIndex
CREATE INDEX "chat_message_mentions_tenantId_idx" ON "chat_message_mentions"("tenantId");

-- AddForeignKey
ALTER TABLE "chat_message_mentions" ADD CONSTRAINT "chat_message_mentions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message_mentions" ADD CONSTRAINT "chat_message_mentions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
