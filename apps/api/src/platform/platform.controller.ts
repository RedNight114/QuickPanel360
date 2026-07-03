import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { CreatePlatformTenantDto } from './dto/create-tenant.dto';
import {
  AssignTenantPlanDto,
  CreatePlatformPlanDto,
  UpdatePlatformPlanDto,
  UpdateTenantSubscriptionDto,
} from './dto/platform-plan.dto';
import {
  CreatePlatformModuleDto,
  UpdatePlanModulesDto,
  UpdatePlatformModuleDto,
  UpdateTenantModulesDto,
} from './dto/tenant-modules.dto';
import {
  PlatformAuditQueryDto,
  PlatformBillingQueryDto,
  PlatformOnboardingQueryDto,
  PlatformSubscriptionsQueryDto,
  PlatformTenantsQueryDto,
} from './dto/tenants-query.dto';
import { UpdatePlatformTenantDto } from './dto/update-tenant.dto';
import {
  CloseSupportSessionDto,
  OpenSupportSessionDto,
} from './dto/platform-support.dto';
import {
  CreatePlatformInvoiceDto,
  CreatePlatformPaymentDto,
  RenewTenantSubscriptionDto,
  UpdatePlatformInvoiceDto,
} from './dto/platform-billing.dto';
import {
  ActivatePlatformEmergencyDto,
  ResolvePlatformEmergencyDto,
} from './dto/platform-emergency.dto';
import { ConvertLeadToTenantDto } from './dto/platform-leads.dto';
import {
  CreateTenantAccountActivityDto,
  PlatformAccountsQueryDto,
  PlatformCollectionsQueryDto,
  UpdateTenantAccountDto,
  UpdateTenantCollectionDto,
} from './dto/platform-accounts.dto';
import {
  CreateTenantContactDto,
  CreateTenantOnboardingTaskDto,
  UpdateTenantContactDto,
  UpdateTenantOnboardingTaskDto,
  UpdateTenantWorkspaceDto,
} from './dto/platform-workspace.dto';
import { PlatformService } from './platform.service';

@Controller('platform')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('summary')
  @Permissions('platform.dashboard.view')
  getSummary() {
    return this.platformService.getSummary();
  }

  @Get('alerts')
  @Permissions('platform.dashboard.view')
  getAlerts() {
    return this.platformService.getPlatformAlerts();
  }

  @Post('billing/generate-monthly')
  @Permissions('platform.billing.manage')
  generateMonthlyInvoices(@CurrentUser() user: AuthUser) {
    return this.platformService.generateMonthlyInvoices(user.userId);
  }

  @Get('metrics')
  @Permissions('platform.dashboard.view')
  getMetrics(@Query('months') months?: string) {
    return this.platformService.getMetrics(
      months ? Math.min(parseInt(months, 10) || 6, 12) : 6,
    );
  }

  @Get('leads')
  @Permissions('platform.tenants.view')
  findLeads(@Query('status') status?: string, @Query('q') q?: string) {
    return this.platformService.findLeads(status, q);
  }

  @Patch('leads/:id/status')
  @Permissions('platform.tenants.update')
  updateLeadStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status: string; internalNotes?: string },
  ) {
    return this.platformService.updateLeadStatus(
      user.userId,
      id,
      body.status,
      body.internalNotes,
    );
  }

  @Patch('leads/:id/assign')
  @Permissions('platform.tenants.update')
  assignLead(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { assignedToId: string },
  ) {
    return this.platformService.assignLead(user.userId, id, body.assignedToId);
  }

  @Patch('leads/:id/payment')
  @Permissions('platform.tenants.update')
  updateLeadPayment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { paymentStatus: string },
  ) {
    return this.platformService.updateLeadPayment(
      user.userId,
      id,
      body.paymentStatus,
    );
  }

  @Post('leads/:id/convert')
  @Permissions('platform.tenants.create')
  convertLeadToTenant(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ConvertLeadToTenantDto,
  ) {
    return this.platformService.convertLeadToTenant(user.userId, id, dto);
  }

  @Get('tenants')
  @Permissions('platform.tenants.view')
  findTenants(@Query() query: PlatformTenantsQueryDto) {
    return this.platformService.findTenants(query);
  }

  @Get('subscriptions')
  @Permissions('platform.tenants.view')
  findSubscriptions(@Query() query: PlatformSubscriptionsQueryDto) {
    return this.platformService.findSubscriptions(query);
  }

  @Get('onboarding')
  @Permissions('platform.tenants.view')
  findOnboardingQueue(@Query() query: PlatformOnboardingQueryDto) {
    return this.platformService.findOnboardingQueue(query);
  }

  @Get('accounts')
  @Permissions('platform.accounts.view')
  findAccounts(@Query() query: PlatformAccountsQueryDto) {
    return this.platformService.findAccounts(query);
  }

  @Get('collections')
  @Permissions('platform.collections.view')
  findCollections(@Query() query: PlatformCollectionsQueryDto) {
    return this.platformService.findCollections(query);
  }

  @Get('staff/options')
  @Permissions('platform.accounts.view')
  findPlatformStaffOptions() {
    return this.platformService.findPlatformStaffOptions();
  }

  @Get('emergencies')
  @Permissions('platform.emergency.view')
  findEmergencies(@Query('q') q?: string) {
    return this.platformService.findEmergencies(q);
  }

  @Get('plans')
  @Permissions('platform.plans.view')
  findPlans() {
    return this.platformService.findPlans();
  }

  @Post('plans')
  @Permissions('platform.plans.create')
  createPlan(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePlatformPlanDto,
  ) {
    return this.platformService.createPlan(user.userId, dto);
  }

  @Patch('plans/:id')
  @Permissions('platform.plans.update')
  updatePlan(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePlatformPlanDto,
  ) {
    return this.platformService.updatePlan(user.userId, id, dto);
  }

  @Patch('plans/:id/archive')
  @Permissions('platform.plans.archive')
  archivePlan(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.platformService.archivePlan(user.userId, id);
  }

  @Patch('plans/:id/modules')
  @Permissions('platform.plans.update')
  updatePlanModules(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePlanModulesDto,
  ) {
    return this.platformService.updatePlanModules(user.userId, id, dto);
  }

  @Get('modules')
  @Permissions('platform.modules.view')
  findModules() {
    return this.platformService.findModules();
  }

  @Get('support/sessions')
  @Permissions('platform.support.view')
  findSupportSessions(@Query('tenantId') tenantId?: string) {
    return this.platformService.findSupportSessions(tenantId);
  }

  @Get('billing/invoices')
  @Permissions('platform.billing.view')
  findInvoices(@Query() query: PlatformBillingQueryDto) {
    return this.platformService.findInvoices(query);
  }

  @Get('billing/payments')
  @Permissions('platform.billing.view')
  findPayments(@Query() query: PlatformBillingQueryDto) {
    return this.platformService.findPayments(query);
  }

  @Post('modules')
  @Permissions('platform.modules.update')
  createModule(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePlatformModuleDto,
  ) {
    return this.platformService.createModule(user.userId, dto);
  }

  @Patch('modules/:id')
  @Permissions('platform.modules.update')
  updateModule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePlatformModuleDto,
  ) {
    return this.platformService.updateModule(user.userId, id, dto);
  }

  @Patch('modules/:id/archive')
  @Permissions('platform.modules.update')
  archiveModule(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.platformService.archiveModule(user.userId, id);
  }

  @Post('tenants')
  @Permissions('platform.tenants.create')
  createTenant(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePlatformTenantDto,
  ) {
    return this.platformService.createTenant(user.userId, dto);
  }

  @Get('tenants/:id')
  @Permissions('platform.tenants.view')
  findTenant(@Param('id') id: string) {
    return this.platformService.findTenant(id);
  }

  @Patch('tenants/:id')
  @Permissions('platform.tenants.update')
  updateTenant(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePlatformTenantDto,
  ) {
    return this.platformService.updateTenant(user.userId, id, dto);
  }

  @Patch('tenants/:id/workspace')
  @Permissions('platform.tenants.update')
  updateTenantWorkspace(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTenantWorkspaceDto,
  ) {
    return this.platformService.updateTenantWorkspace(user.userId, id, dto);
  }

  @Patch('tenants/:id/account')
  @Permissions('platform.accounts.manage')
  updateTenantAccount(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTenantAccountDto,
  ) {
    return this.platformService.updateTenantAccount(user.userId, id, dto);
  }

  @Patch('tenants/:id/collection')
  @Permissions('platform.collections.manage')
  updateTenantCollection(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTenantCollectionDto,
  ) {
    return this.platformService.updateTenantCollection(user.userId, id, dto);
  }

  @Post('tenants/:id/account-activities')
  @Permissions('platform.accounts.manage')
  createTenantAccountActivity(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateTenantAccountActivityDto,
  ) {
    return this.platformService.createTenantAccountActivity(user.userId, id, dto);
  }

  @Post('tenants/:id/contacts')
  @Permissions('platform.tenants.update')
  createTenantContact(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateTenantContactDto,
  ) {
    return this.platformService.createTenantContact(user.userId, id, dto);
  }

  @Patch('tenants/:tenantId/contacts/:contactId')
  @Permissions('platform.tenants.update')
  updateTenantContact(
    @CurrentUser() user: AuthUser,
    @Param('tenantId') tenantId: string,
    @Param('contactId') contactId: string,
    @Body() dto: UpdateTenantContactDto,
  ) {
    return this.platformService.updateTenantContact(
      user.userId,
      tenantId,
      contactId,
      dto,
    );
  }

  @Delete('tenants/:tenantId/contacts/:contactId')
  @Permissions('platform.tenants.update')
  deleteTenantContact(
    @CurrentUser() user: AuthUser,
    @Param('tenantId') tenantId: string,
    @Param('contactId') contactId: string,
  ) {
    return this.platformService.deleteTenantContact(
      user.userId,
      tenantId,
      contactId,
    );
  }

  @Post('tenants/:id/onboarding-tasks')
  @Permissions('platform.tenants.update')
  createTenantOnboardingTask(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateTenantOnboardingTaskDto,
  ) {
    return this.platformService.createTenantOnboardingTask(
      user.userId,
      id,
      dto,
    );
  }

  @Patch('tenants/:tenantId/onboarding-tasks/:taskId')
  @Permissions('platform.tenants.update')
  updateTenantOnboardingTask(
    @CurrentUser() user: AuthUser,
    @Param('tenantId') tenantId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTenantOnboardingTaskDto,
  ) {
    return this.platformService.updateTenantOnboardingTask(
      user.userId,
      tenantId,
      taskId,
      dto,
    );
  }

  @Delete('tenants/:tenantId/onboarding-tasks/:taskId')
  @Permissions('platform.tenants.update')
  deleteTenantOnboardingTask(
    @CurrentUser() user: AuthUser,
    @Param('tenantId') tenantId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.platformService.deleteTenantOnboardingTask(
      user.userId,
      tenantId,
      taskId,
    );
  }

  @Patch('tenants/:id/plan')
  @Permissions('platform.tenants.update')
  assignTenantPlan(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AssignTenantPlanDto,
  ) {
    return this.platformService.assignTenantPlan(user.userId, id, dto);
  }

  @Patch('tenants/:id/subscription')
  @Permissions('platform.tenants.update')
  updateTenantSubscription(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTenantSubscriptionDto,
  ) {
    return this.platformService.updateTenantSubscription(user.userId, id, dto);
  }

  @Post('tenants/:id/subscription/renew')
  @Permissions('platform.billing.manage')
  renewTenantSubscription(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RenewTenantSubscriptionDto,
  ) {
    return this.platformService.renewTenantSubscription(user.userId, id, dto);
  }

  @Patch('tenants/:id/modules')
  @Permissions('platform.modules.update')
  updateTenantModules(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTenantModulesDto,
  ) {
    return this.platformService.updateTenantModules(user.userId, id, dto);
  }

  @Post('tenants/:id/support-sessions')
  @Permissions('platform.support.manage')
  openSupportSession(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: OpenSupportSessionDto,
  ) {
    return this.platformService.openSupportSession(user.userId, id, dto);
  }

  @Patch('support/sessions/:id/close')
  @Permissions('platform.support.manage')
  closeSupportSession(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CloseSupportSessionDto,
  ) {
    return this.platformService.closeSupportSession(user.userId, id, dto);
  }

  @Post('support/sessions/:id/impersonate')
  @Permissions('platform.support.impersonate')
  impersonateSupportSession(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.platformService.impersonateSupportSession(user.userId, id);
  }

  @Post('tenants/:id/invoices')
  @Permissions('platform.billing.manage')
  createInvoice(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreatePlatformInvoiceDto,
  ) {
    return this.platformService.createInvoice(user.userId, id, dto);
  }

  @Get('billing/invoices/:id')
  @Permissions('platform.billing.view')
  findInvoiceById(@Param('id') id: string) {
    return this.platformService.findInvoiceById(id);
  }

  @Patch('billing/invoices/:id')
  @Permissions('platform.billing.manage')
  updateInvoice(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePlatformInvoiceDto,
  ) {
    return this.platformService.updateInvoice(user.userId, id, dto);
  }

  @Post('tenants/:id/payments')
  @Permissions('platform.billing.manage')
  createPayment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreatePlatformPaymentDto,
  ) {
    return this.platformService.createPayment(user.userId, id, dto);
  }

  @Get('tenants/:id/export')
  @Permissions('platform.tenants.view')
  exportTenantData(@Param('id') id: string) {
    return this.platformService.exportTenantData(id);
  }

  @Delete('tenants/:id')
  @Permissions('platform.tenants.archive')
  deleteTenant(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('confirm') confirm?: string,
  ) {
    if (confirm !== 'DELETE') {
      throw new BadRequestException(
        'Confirma la eliminación con ?confirm=DELETE',
      );
    }
    return this.platformService.deleteTenant(user.userId, id);
  }

  @Patch('tenants/:id/suspend')
  @Permissions('platform.tenants.suspend')
  suspendTenant(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.platformService.suspendTenant(user.userId, id);
  }

  @Patch('tenants/:id/reactivate')
  @Permissions('platform.tenants.suspend')
  reactivateTenant(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.platformService.reactivateTenant(user.userId, id);
  }

  @Patch('tenants/:id/archive')
  @Permissions('platform.tenants.archive')
  archiveTenant(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.platformService.archiveTenant(user.userId, id);
  }

  @Post('tenants/:id/emergency/activate')
  @Permissions('platform.emergency.manage')
  activateTenantEmergency(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ActivatePlatformEmergencyDto,
  ) {
    return this.platformService.activateTenantEmergency(user.userId, id, dto);
  }

  @Post('tenants/:id/emergency/deactivate')
  @Permissions('platform.emergency.manage')
  deactivateTenantEmergency(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ResolvePlatformEmergencyDto,
  ) {
    return this.platformService.deactivateTenantEmergency(user.userId, id, dto);
  }

  @Get('audit')
  @Permissions('platform.audit.view')
  findAudit(@Query() query: PlatformAuditQueryDto) {
    return this.platformService.findAudit(query);
  }

  @Get('settings')
  @Permissions('platform.dashboard.view')
  getSettings() {
    return this.platformService.getSettings();
  }

  @Patch('settings')
  @Permissions('platform.dashboard.view')
  updateSettings(@Body() body: Record<string, unknown>) {
    return this.platformService.updateSettings(body);
  }
}




