import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MemberClassesController } from './member-classes.controller';
import { MemberClassesService } from './member-classes.service';

@Module({
  imports: [PrismaModule],
  controllers: [MemberClassesController],
  providers: [MemberClassesService],
  exports: [MemberClassesService],
})
export class MemberClassesModule {}
