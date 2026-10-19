import { Controller, Get } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Get('health') health() { return { status: 'ok' }; }
  @Get('models') models() { return this.catalog.models(); }
  @Get('works') works() { return this.catalog.works(); }
  @Get('projects') projects() { return this.catalog.projects(); }
  @Get('business-profile') businessProfile() { return this.catalog.businessProfile(); }
}
