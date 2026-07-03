import { Module } from '@nestjs/common';
import { StorageModule } from '../common/storage/storage.module';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { MemberDiscountService } from './member-discount.service';

@Module({
  imports: [StorageModule],
  controllers: [MembersController],
  providers: [MembersService, MemberDiscountService],
  exports: [MemberDiscountService],
})
export class MembersModule {}
