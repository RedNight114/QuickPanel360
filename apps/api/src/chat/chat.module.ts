import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatController } from './chat.controller';
import { ChatCryptoService } from './chat-crypto.service';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { SupportChatController } from './support-chat.controller';
import { SupportChatService } from './support-chat.service';

@Module({
  imports: [PrismaModule, AuditModule, AuthModule],
  controllers: [ChatController, SupportChatController],
  providers: [ChatService, ChatGateway, ChatCryptoService, SupportChatService],
})
export class ChatModule {}
