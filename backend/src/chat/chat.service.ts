import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChatDto, UpdateChatDto } from './chat.dto';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  private include = { assignedTo: { select: { id: true, firstName: true, lastName: true } }, messages: { include: { advisor: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: 'asc' as const } } };

  create(dto: CreateChatDto) {
    return this.prisma.chatConversation.create({
      data: {
        publicId: randomUUID(), name: dto.name.trim(), email: dto.email.trim().toLowerCase(), phone: dto.phone.trim(), tags: [],
        messages: { create: [
          { sender: 'VISITOR', text: dto.message.trim() },
          { sender: 'SYSTEM', text: 'Gracias por escribirnos. Uno de nuestros asesores se pondrá en contacto contigo enseguida.' },
        ] },
      }, include: this.include,
    });
  }

  async publicConversation(publicId: string) {
    const chat = await this.prisma.chatConversation.findUnique({ where: { publicId }, include: this.include });
    if (!chat) throw new NotFoundException('La conversación no existe.');
    return chat;
  }

  async visitorMessage(publicId: string, text: string) {
    const chat = await this.prisma.chatConversation.findUnique({ where: { publicId } });
    if (!chat) throw new NotFoundException('La conversación no existe.');
    const message = await this.prisma.chatMessage.create({ data: { conversationId: chat.id, sender: 'VISITOR', text: text.trim() }, include: { advisor: { select: { id: true, firstName: true, lastName: true } } } });
    await this.prisma.chatConversation.update({ where: { id: chat.id }, data: { lastMessageAt: new Date(), status: chat.status === 'CLOSED' ? 'WAITING' : chat.status } });
    return { chat, message };
  }

  list() { return this.prisma.chatConversation.findMany({ include: this.include, orderBy: { lastMessageAt: 'desc' } }); }

  async advisorMessage(id: number, user: { id: number; firstName: string; lastName: string }, text: string) {
    const existing = await this.prisma.chatConversation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('La conversación no existe.');
    if (!existing.assignedToId) await this.prisma.chatConversation.updateMany({ where: { id, assignedToId: null }, data: { assignedToId: user.id, status: 'ACTIVE' } });
    const chat = await this.prisma.chatConversation.findUniqueOrThrow({ where: { id }, include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } } });
    const firstAdvisorMessage = await this.prisma.chatMessage.count({ where: { conversationId: id, sender: 'ADVISOR' } }) === 0;
    const body = firstAdvisorMessage ? `Hola ${existing.name}, mi nombre es ${user.firstName}, soy tu asesor de Tu Casa Ideal. ${text.trim()}` : text.trim();
    const message = await this.prisma.chatMessage.create({ data: { conversationId: id, sender: 'ADVISOR', advisorId: user.id, text: body }, include: { advisor: { select: { id: true, firstName: true, lastName: true } } } });
    await this.prisma.chatConversation.update({ where: { id }, data: { lastMessageAt: new Date(), status: 'ACTIVE' } });
    return { chat, message };
  }

  async update(id: number, dto: UpdateChatDto) {
    const tags = dto.tags?.map((tag) => tag.trim()).filter(Boolean).slice(0, 8);
    return this.prisma.chatConversation.update({ where: { id }, data: { status: dto.status, priority: dto.priority, ...(tags ? { tags } : {}) }, include: this.include });
  }
}
