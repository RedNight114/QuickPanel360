-- AlterTable: add replyToId to chat_messages
ALTER TABLE "chat_messages" ADD COLUMN "replyToId" TEXT;

-- AddForeignKey
ALTER TABLE "chat_messages"
    ADD CONSTRAINT "chat_messages_replyToId_fkey"
    FOREIGN KEY ("replyToId") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "chat_messages_replyToId_idx" ON "chat_messages"("replyToId");
