import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminChatController, ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({ imports: [AuthModule], controllers: [ChatController, AdminChatController], providers: [ChatService] })
export class ChatModule {}
