import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthGateway } from '../auth/auth.gateway';
import { ChatMessageDto, CreateChatDto, UpdateChatDto } from './chat.dto';
import { ChatService } from './chat.service';

@Controller('chats')
export class ChatController {
  constructor(private readonly chats: ChatService, private readonly gateway: AuthGateway) {}
  @Post() async create(@Body() dto: CreateChatDto) { const chat = await this.chats.create(dto); this.gateway.notifyChatCreated(chat); return chat; }
  @Get(':publicId') get(@Param('publicId') publicId: string) { return this.chats.publicConversation(publicId); }
  @Post(':publicId/messages') async message(@Param('publicId') publicId: string, @Body() dto: ChatMessageDto) { const result = await this.chats.visitorMessage(publicId, dto.message); this.gateway.notifyChatMessage(result.chat.publicId, result.message, result.chat.id); return result.message; }
}

type ChatRequest = Request & { user: { id: number; firstName: string; lastName: string } };
@UseGuards(AuthGuard)
@Controller('admin/chats')
export class AdminChatController {
  constructor(private readonly chats: ChatService, private readonly gateway: AuthGateway) {}
  @Get() list() { return this.chats.list(); }
  @Post(':id/messages') async message(@Param('id', ParseIntPipe) id: number, @Body() dto: ChatMessageDto, @Req() request: ChatRequest) { const result = await this.chats.advisorMessage(id, request.user, dto.message); this.gateway.notifyChatMessage(result.chat.publicId, result.message, id); this.gateway.notifyChatUpdated(result.chat); return result.message; }
  @Patch(':id') async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateChatDto) { const chat = await this.chats.update(id, dto); this.gateway.notifyChatUpdated(chat); return chat; }
}
