import { WebSocketGateway, WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody, OnGatewayConnection } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true } })
export class AuthGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(private readonly auth: AuthService, private readonly prisma: PrismaService) {}

  async handleConnection(client: Socket) {
    const rawCookie = client.handshake.headers.cookie || '';
    const session = rawCookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('tci_session='))?.slice('tci_session='.length);
    if (!session) return;
    try {
      const payload = this.auth.verifySession(decodeURIComponent(session));
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (user?.active) {
        await client.join('active-portal');
        if (user.role === 'ADMIN') await client.join('active-admins');
      }
    } catch {
      // Los visitantes pendientes también usan el socket, pero nunca entran al canal administrativo.
    }
  }

  @SubscribeMessage('pending:watch')
  watchPending(@ConnectedSocket() client: Socket, @MessageBody() token: string) {
    try {
      const payload = this.auth.verifyPendingToken(token);
      void client.join(`pending-user:${payload.sub}`);
      return { watching: true };
    } catch {
      return { watching: false };
    }
  }

  @SubscribeMessage('chat:watch')
  async watchChat(@ConnectedSocket() client: Socket, @MessageBody() publicId: string) {
    const chat = await this.prisma.chatConversation.findUnique({ where: { publicId }, select: { id: true } });
    if (!chat) return { watching: false };
    await client.join(`chat:${publicId}`);
    return { watching: true };
  }

  notifyAdmins(user: { id: number; firstName: string; lastName: string; email: string; createdAt: Date }) {
    this.server.to('active-admins').emit('registration:pending', user);
  }

  notifyNewLead(lead: { id: number; name: string; phone: string; model: string; land: string; location: string; status: string; createdAt: Date; updatedAt: Date }) {
    this.server.to('active-portal').emit('lead:created', lead);
  }

  notifyApproved(userId: number) {
    this.server.to(`pending-user:${userId}`).emit('registration:approved', { userId });
  }

  notifyBusinessProfile(profile: { years: number; houseCount: number }) {
    this.server.emit('business-profile:updated', profile);
  }

  notifyProjectsChanged(change: { action: 'created' | 'updated' | 'deleted' | 'visibility'; projectId: number }) {
    this.server.emit('projects:updated', change);
  }

  notifyWorksChanged(change: { action: 'created' | 'updated' | 'deleted' | 'visibility'; workId: number }) {
    this.server.emit('works:updated', change);
  }

  notifyChatCreated(chat: unknown) { this.server.to('active-portal').emit('chat:created', chat); }
  notifyChatMessage(publicId: string, message: unknown, conversationId: number) {
    this.server.to(`chat:${publicId}`).emit('chat:message', message);
    this.server.to('active-portal').emit('chat:message', { conversationId, message });
  }
  notifyChatUpdated(chat: unknown) { this.server.to('active-portal').emit('chat:updated', chat); }
}
