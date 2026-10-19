import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './create-lead.dto';
import { AuthGateway } from '../auth/auth.gateway';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService, private readonly gateway: AuthGateway) {}
  async create(data: CreateLeadDto) {
    const lead = await this.prisma.lead.create({ data });
    this.gateway.notifyNewLead(lead);
    return lead;
  }
}
