import { Body, Controller, Post } from '@nestjs/common';
import { CreateLeadDto } from './create-lead.dto';
import { LeadsService } from './leads.service';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}
  @Post() create(@Body() data: CreateLeadDto) { return this.leads.create(data); }
}
