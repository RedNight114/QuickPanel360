import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CancelThirdPartyPaymentDto } from './dto/cancel-third-party-payment.dto';
import { CreateThirdPartyPaymentDto } from './dto/create-third-party-payment.dto';
import { ThirdPartyPaymentsQueryDto } from './dto/third-party-payments-query.dto';
import { ThirdPartyPaymentsService } from './third-party-payments.service';

@Controller('third-party-payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ThirdPartyPaymentsController {
  constructor(
    private readonly thirdPartyPaymentsService: ThirdPartyPaymentsService,
  ) {}

  @Get()
  @Permissions('third_party_payment.view')
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: ThirdPartyPaymentsQueryDto,
  ) {
    return this.thirdPartyPaymentsService.findAll(user.tenantId, query);
  }

  @Get('summary-by-category')
  @Permissions('third_party_payment.view')
  summaryByCategory(
    @CurrentUser() user: AuthUser,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.thirdPartyPaymentsService.getSummaryByCategory(
      user.tenantId,
      dateFrom,
      dateTo,
    );
  }

  @Post()
  @Permissions('third_party_payment.create')
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateThirdPartyPaymentDto,
  ) {
    return this.thirdPartyPaymentsService.create(
      user.tenantId,
      user.userId,
      dto,
    );
  }

  @Patch(':id/cancel')
  @Permissions('third_party_payment.cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelThirdPartyPaymentDto,
  ) {
    return this.thirdPartyPaymentsService.cancel(
      user.tenantId,
      user.userId,
      id,
      dto,
    );
  }
}
