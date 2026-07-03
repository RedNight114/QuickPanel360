import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PublicService } from './public.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('marketing/plans')
  getPublicPlans() {
    return this.publicService.getPublicPlans();
  }

  @Get('marketing/modules')
  getPublicModules() {
    return this.publicService.getPublicModules();
  }

  @Post('leads')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  createLead(@Body() dto: CreateLeadDto) {
    return this.publicService.createLead(dto);
  }
}
