import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { ResolveIncidentDto } from './dto/resolve-incident.dto';
import { UpdateMemberBenefitsDto } from './dto/update-member-benefits.dto';
import { UpdateMemberClassDto } from './dto/update-member-class.dto';
import { UpdateMemberPhotoDto } from './dto/update-member-photo.dto';
import { UpdateMemberStatusDto } from './dto/update-member-status.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MembersService } from './members.service';

@Controller('members')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @Permissions('members.read')
  findAll(@CurrentUser() user: AuthUser, @Query('take') take?: string) {
    const limit = Math.min(Math.max(Number(take) || 500, 1), 1000);
    return this.membersService.findAll(user.tenantId, limit);
  }

  @Get('search')
  @Permissions('members.read_basic')
  search(@CurrentUser() user: AuthUser, @Query('q') query?: string) {
    return this.membersService.searchBasic(user.tenantId, query);
  }

  @Get('birthdays/upcoming')
  @Permissions('members.read')
  birthdays(@CurrentUser() user: AuthUser, @Query('days') days?: string) {
    return this.membersService.getUpcomingBirthdays(
      user.tenantId,
      Math.max(1, Math.min(Number(days ?? 7) || 7, 31)),
    );
  }

  @Get('benefits/config')
  @Permissions('members.benefits.view')
  benefits(@CurrentUser() user: AuthUser) {
    return this.membersService.getBenefits(user.tenantId);
  }

  @Patch('benefits/config')
  @Permissions('members.benefits.manage')
  updateBenefits(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMemberBenefitsDto,
  ) {
    return this.membersService.updateBenefits(
      user.tenantId,
      user.userId,
      dto.benefits,
    );
  }

  @Post('import')
  @Permissions('members.create')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: any,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.membersService.importFromCsv(user.tenantId, user.userId, file.buffer);
  }

  @Post('summaries')
  @Permissions('members.read')
  summaries(@CurrentUser() user: AuthUser, @Body() body: { ids: string[] }) {
    const memberIds = (body.ids ?? []).filter(Boolean);
    return this.membersService.getSummaries(user.tenantId, memberIds);
  }

  @Get(':id/summary')
  @Permissions('members.read')
  summary(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.membersService.getSummary(user.tenantId, id);
  }

  @Get(':id')
  @Permissions('members.read_basic')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    if (user.permissions.includes('members.read')) {
      return this.membersService.findOne(user.tenantId, id);
    }

    return this.membersService.findOneBasic(user.tenantId, id);
  }

  @Post()
  @Permissions('members.create')
  create(
    @CurrentUser() user: AuthUser,
    @Body() createMemberDto: CreateMemberDto,
  ) {
    return this.membersService.create(
      user.tenantId,
      user.userId,
      createMemberDto,
    );
  }

  @Patch(':id')
  @Permissions('members.update')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() updateMemberDto: UpdateMemberDto,
  ) {
    return this.membersService.update(
      user.tenantId,
      user.userId,
      id,
      updateMemberDto,
    );
  }

  @Patch(':id/class')
  @Permissions('members.class.update')
  updateClass(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateMemberClassDto,
  ) {
    return this.membersService.updateClass(
      user.tenantId,
      user.userId,
      id,
      dto.memberClass,
    );
  }

  @Post(':id/photo')
  @Permissions('members.photo.upload')
  updatePhoto(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateMemberPhotoDto,
  ) {
    return this.membersService.updatePhoto(
      user.tenantId,
      user.userId,
      id,
      dto.photoUrl,
      dto.photoStorageKey,
    );
  }

  @Post(':id/photo/upload')
  @Permissions('members.photo.upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhotoFile(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file?: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.membersService.uploadPhoto(
      user.tenantId,
      user.userId,
      id,
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }

  @Delete(':id/photo')
  @Permissions('members.photo.remove')
  removePhoto(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.membersService.removePhoto(user.tenantId, user.userId, id);
  }

  @Get(':id/incidents')
  @Permissions('member_incidents.read')
  findIncidents(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.membersService.findIncidents(user.tenantId, id);
  }

  @Post(':id/incidents')
  @Permissions('member_incidents.create')
  createIncident(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateIncidentDto,
  ) {
    return this.membersService.createIncident(user.tenantId, user.userId, id, dto);
  }

  @Patch(':id/incidents/:incidentId')
  @Permissions('member_incidents.resolve')
  resolveIncident(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('incidentId') incidentId: string,
    @Body() dto: ResolveIncidentDto,
  ) {
    return this.membersService.resolveIncident(
      user.tenantId,
      user.userId,
      id,
      incidentId,
      dto,
    );
  }

  @Post(':id/notes')
  @Permissions('members.update')
  createNote(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { note: string; visibility?: string },
  ) {
    const visibility = (
      ['OWNER_ONLY', 'MANAGER_AND_OWNER', 'ALL_STAFF'].includes(
        body.visibility ?? '',
      )
        ? body.visibility
        : 'ALL_STAFF'
    ) as 'OWNER_ONLY' | 'MANAGER_AND_OWNER' | 'ALL_STAFF';
    return this.membersService.createNote(
      user.tenantId,
      user.userId,
      id,
      body.note,
      visibility,
    );
  }

  @Delete(':id/notes/:noteId')
  @Permissions('members.update')
  deleteNote(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('noteId') noteId: string,
  ) {
    return this.membersService.deleteNote(user.tenantId, id, noteId);
  }

  @Patch(':id/status')
  @Permissions('members.block')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() updateMemberStatusDto: UpdateMemberStatusDto,
  ) {
    return this.membersService.updateStatus(
      user.tenantId,
      user.userId,
      id,
      updateMemberStatusDto.status,
    );
  }
}
