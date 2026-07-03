-- CreateIndex
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "cash_movements_tenantId_createdAt_idx" ON "cash_movements"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "chat_conversations_tenantId_updatedAt_idx" ON "chat_conversations"("tenantId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "chat_messages_conversationId_createdAt_idx" ON "chat_messages"("conversationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "internal_notifications_tenantId_status_createdAt_idx" ON "internal_notifications"("tenantId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "inventory_movements_tenantId_createdAt_idx" ON "inventory_movements"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "platform_audit_logs_tenantId_createdAt_idx" ON "platform_audit_logs"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "pos_sessions_tenantId_openedById_status_openedAt_idx" ON "pos_sessions"("tenantId", "openedById", "status", "openedAt" DESC);

-- CreateIndex
CREATE INDEX "pos_sessions_tenantId_openedAt_idx" ON "pos_sessions"("tenantId", "openedAt" DESC);

-- CreateIndex
CREATE INDEX "products_tenantId_status_idx" ON "products"("tenantId", "status");

-- CreateIndex
CREATE INDEX "receivables_tenantId_status_createdAt_idx" ON "receivables"("tenantId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "sale_items_tenantId_createdAt_idx" ON "sale_items"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "sales_tenantId_status_createdAt_idx" ON "sales"("tenantId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "sales_tenantId_memberId_status_createdAt_idx" ON "sales"("tenantId", "memberId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "third_party_payments_tenantId_createdAt_idx" ON "third_party_payments"("tenantId", "createdAt" DESC);

-- RenameIndex
ALTER INDEX "user_notification_preferences_userId_tenantId_notificationType_" RENAME TO "user_notification_preferences_userId_tenantId_notificationT_key";
