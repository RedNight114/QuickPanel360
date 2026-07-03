import { Module } from '@nestjs/common';
import { ThirdPartyPaymentsController } from './third-party-payments.controller';
import { ThirdPartyPaymentsService } from './third-party-payments.service';

@Module({
  controllers: [ThirdPartyPaymentsController],
  providers: [ThirdPartyPaymentsService],
})
export class ThirdPartyPaymentsModule {}
