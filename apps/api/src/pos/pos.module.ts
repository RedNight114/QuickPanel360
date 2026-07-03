import { Module } from '@nestjs/common';
import { MembersModule } from '../members/members.module';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';

@Module({
  imports: [MembersModule],
  controllers: [PosController],
  providers: [PosService],
})
export class PosModule {}
