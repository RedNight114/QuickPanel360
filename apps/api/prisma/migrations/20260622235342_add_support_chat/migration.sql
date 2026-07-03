-- AlterEnum
ALTER TYPE "ChatConversationType" ADD VALUE 'SUPPORT';

-- AlterTable
ALTER TABLE "chat_conversations" ADD COLUMN     "assignedToId" TEXT;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
