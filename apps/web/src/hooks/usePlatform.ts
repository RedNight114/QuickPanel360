import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, getJson, patchJson, postJson } from "@/lib/api";
import type {
  CreatePlatformTenantInput,
  CreatePlatformPlanInput,
  CloseSupportSessionInput,
  CreatePlatformInvoiceInput,
  CreatePlatformPaymentInput,
  CreatePlatformModuleInput,
  ConvertLeadToTenantInput,
  CreateTenantContactInput,
  CreateTenantOnboardingTaskInput,
  PlatformAuditLog,
  PlatformEmergencyLock,
  PlatformModuleDefinition,
  PlatformPlan,
  PlatformInvoice,
  PlatformOnboardingQueueItem,
  PlatformPayment,
  PlatformSubscriptionSummary,
  PlatformSupportSession,
  PlatformSummary,
  PlatformTenantDetail,
  PlatformTenantSummary,
  PlatformAccountSummary,
  PlatformCollectionSummary,
  PlatformStaffOption,
  PlatformAccountHealth,
  PlatformCollectionStatus,
  RenewTenantSubscriptionInput,
  RenewTenantSubscriptionResult,
  OpenSupportSessionInput,
  LoginResponse,
  TenantAccessStatus,
  TenantSubscriptionStatus,
  TenantStatus,
  UpdatePlatformModuleInput,
  UpdatePlatformPlanInput,
  UpdatePlatformTenantInput,
  UpdateTenantSubscriptionInput,
  UpdatePlatformInvoiceInput,
  UpdateTenantContactInput,
  UpdateTenantOnboardingTaskInput,
  UpdateTenantWorkspaceInput,
  UpdateTenantAccountInput,
  UpdateTenantCollectionInput,
  CreateTenantAccountActivityInput,
} from "@/lib/types";

export type PlatformTenantsFilters = {
  q?: string;
  status?: TenantStatus | "all";
  accessStatus?: TenantAccessStatus | "all";
  take?: number;
};

export type PlatformAuditFilters = {
  tenantId?: string;
  action?: string;
  actorUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  take?: number;
};

export type PlatformSupportFilters = {
  tenantId?: string;
};

export type PlatformBillingFilters = {
  q?: string;
  tenantId?: string;
  invoiceStatus?: string | "all";
  paymentStatus?: string | "all";
  dateFrom?: string;
  dateTo?: string;
  take?: number;
};

export type PlatformSubscriptionsFilters = {
  q?: string;
  status?: TenantSubscriptionStatus | "all";
  take?: number;
};

export type PlatformEmergencyFilters = {
  q?: string;
};

export type PlatformOnboardingFilters = {
  q?: string;
  taskStatus?: string | "all";
  lifecycleStage?: string | "all";
  riskLevel?: string | "all";
  take?: number;
};

export type PlatformAccountsFilters = {
  q?: string;
  accountHealth?: PlatformAccountHealth | "all";
  accountOwnerId?: string;
  collectionStatus?: PlatformCollectionStatus | "all";
  renewalWindowDays?: number;
  take?: number;
};

export type PlatformCollectionsFilters = {
  q?: string;
  status?: PlatformCollectionStatus | "all";
  assignedToId?: string;
  take?: number;
};

function buildQuery(filters: Record<string, unknown> = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      value === "all"
    )
      return;
    params.set(key, String(value));
  });

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function usePlatformSummary(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["platform", "summary"],
    queryFn: () => getJson<PlatformSummary>("/platform/summary"),
    enabled: options.enabled ?? true,
  });
}

export type PlatformMetrics = {
  mrr: number;
  series: Array<{
    month: string;
    tenants: number;
    revenue: number;
    payments: number;
    newTenants: number;
  }>;
  tenantUsage: Array<{
    id: string;
    name: string;
    users: number;
    members: number;
    products: number;
    dispensations: number;
  }>;
};

export type PlatformAlert = {
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  tenantId?: string;
  tenantName?: string;
};

export function usePlatformAlerts(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["platform", "alerts"],
    queryFn: () => getJson<PlatformAlert[]>("/platform/alerts"),
    enabled: options.enabled ?? true,
    refetchInterval: 120_000,
  });
}

export function useAssignTenantPlan() {
  const invalidate = usePlatformInvalidation();
  return useMutation({
    mutationFn: ({ tenantId, planId }: { tenantId: string; planId: string }) =>
      patchJson(`/platform/tenants/${tenantId}/plan`, { planId }),
    onSuccess: invalidate,
  });
}

export function usePlatformInvoiceDetail(invoiceId?: string | null) {
  return useQuery({
    queryKey: ["platform", "invoice", invoiceId],
    queryFn: () =>
      getJson<{
        id: string;
        number: string;
        amount: number | string;
        description?: string | null;
        status: string;
        issuedAt?: string;
        dueAt?: string | null;
        paidAt?: string | null;
        tenant: {
          id: string;
          name: string;
          legalName?: string | null;
          taxId?: string | null;
          email?: string | null;
          phone?: string | null;
          city?: string | null;
          country?: string | null;
        };
        payments: Array<{
          id: string;
          amount: number | string;
          method?: string | null;
          reference?: string | null;
          paidAt: string;
          status: string;
        }>;
      }>(`/platform/billing/invoices/${invoiceId}`),
    enabled: Boolean(invoiceId),
  });
}

export function useExportTenantData(tenantId?: string) {
  return useQuery({
    queryKey: ["platform", "export", tenantId],
    queryFn: () =>
      getJson<{
        exportedAt: string;
        tenant: Record<string, unknown>;
        summary: {
          members: number;
          products: number;
          sales: number;
          users: number;
        };
        data: Record<string, unknown[]>;
      }>(`/platform/tenants/${tenantId}/export`),
    enabled: false,
  });
}

export function useDeleteTenant() {
  const invalidate = usePlatformInvalidation();
  return useMutation({
    mutationFn: (tenantId: string) =>
      apiFetch<{ ok: boolean; deleted: string }>(
        `/platform/tenants/${tenantId}?confirm=DELETE`,
        { method: "DELETE" },
      ),
    onSuccess: invalidate,
  });
}

export function usePlatformLeads(
  filters: { status?: string; q?: string } = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["platform", "leads", filters],
    queryFn: () =>
      getJson<
        Array<{
          id: string;
          name: string;
          email: string;
          phone?: string | null;
          companyName: string;
          country: string;
          preferredLanguage: string;
          estimatedUsers?: number | null;
          message?: string | null;
          status: string;
          paymentStatus: string;
          internalNotes?: string | null;
          createdAt: string;
          reviewedAt?: string | null;
          acceptedAt?: string | null;
          rejectedAt?: string | null;
          requestedPlan?: {
            id: string;
            name: string;
            priceMonthly: number;
          } | null;
          assignedTo?: { id: string; name: string } | null;
          reviewedBy?: { id: string; name: string } | null;
          convertedTenant?: {
            id: string;
            name: string;
            status: string;
          } | null;
        }>
      >(`/platform/leads${buildQuery(filters)}`),
    enabled: options.enabled ?? true,
  });
}

export function useUpdateLeadStatus() {
  const invalidate = usePlatformInvalidation();
  return useMutation({
    mutationFn: ({
      id,
      status,
      internalNotes,
    }: {
      id: string;
      status: string;
      internalNotes?: string;
    }) => patchJson(`/platform/leads/${id}/status`, { status, internalNotes }),
    onSuccess: invalidate,
  });
}

export function useUpdateLeadPayment() {
  const invalidate = usePlatformInvalidation();
  return useMutation({
    mutationFn: ({
      id,
      paymentStatus,
    }: {
      id: string;
      paymentStatus: string;
    }) => patchJson(`/platform/leads/${id}/payment`, { paymentStatus }),
    onSuccess: invalidate,
  });
}

export function useConvertLeadToTenant() {
  const invalidate = usePlatformInvalidation();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: ConvertLeadToTenantInput;
    }) => postJson<PlatformTenantDetail>(`/platform/leads/${id}/convert`, body),
    onSuccess: invalidate,
  });
}

export function useGenerateMonthlyInvoices() {
  const invalidate = usePlatformInvalidation();
  return useMutation({
    mutationFn: () =>
      postJson<{
        generated: number;
        skipped: number;
        invoices: Array<{ tenantName: string; amount: number; number: string }>;
      }>("/platform/billing/generate-monthly"),
    onSuccess: invalidate,
  });
}

export function usePlatformMetrics(
  months = 6,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["platform", "metrics", months],
    queryFn: () =>
      getJson<PlatformMetrics>(`/platform/metrics?months=${months}`),
    enabled: options.enabled ?? true,
    staleTime: 60_000,
  });
}

export function usePlatformTenants(
  filters: PlatformTenantsFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["platform", "tenants", filters],
    queryFn: () =>
      getJson<PlatformTenantSummary[]>(
        `/platform/tenants${buildQuery(filters)}`,
      ),
    enabled: options.enabled ?? true,
  });
}

export function usePlatformTenant(
  id?: string,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["platform", "tenant", id],
    queryFn: () => getJson<PlatformTenantDetail>(`/platform/tenants/${id}`),
    enabled: Boolean(id) && (options.enabled ?? true),
  });
}

export function usePlatformAudit(
  filters: PlatformAuditFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["platform", "audit", filters],
    queryFn: () =>
      getJson<PlatformAuditLog[]>(`/platform/audit${buildQuery(filters)}`),
    enabled: options.enabled ?? true,
  });
}

export function usePlatformEmergencies(
  filters: PlatformEmergencyFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["platform", "emergencies", filters],
    queryFn: () =>
      getJson<PlatformEmergencyLock[]>(
        `/platform/emergencies${buildQuery(filters)}`,
      ),
    enabled: options.enabled ?? true,
  });
}

export function usePlatformPlans(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["platform", "plans"],
    queryFn: () => getJson<PlatformPlan[]>("/platform/plans"),
    enabled: options.enabled ?? true,
  });
}

export function usePlatformModules(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["platform", "modules"],
    queryFn: () => getJson<PlatformModuleDefinition[]>("/platform/modules"),
    enabled: options.enabled ?? true,
  });
}

export function usePlatformSupportSessions(
  filters: PlatformSupportFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["platform", "support", filters],
    queryFn: () =>
      getJson<PlatformSupportSession[]>(
        `/platform/support/sessions${buildQuery(filters)}`,
      ),
    enabled: options.enabled ?? true,
  });
}

export function usePlatformInvoices(
  filters: PlatformBillingFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["platform", "billing", "invoices", filters],
    queryFn: () =>
      getJson<PlatformInvoice[]>(
        `/platform/billing/invoices${buildQuery(filters)}`,
      ),
    enabled: options.enabled ?? true,
  });
}

export function usePlatformPayments(
  filters: PlatformBillingFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["platform", "billing", "payments", filters],
    queryFn: () =>
      getJson<PlatformPayment[]>(
        `/platform/billing/payments${buildQuery(filters)}`,
      ),
    enabled: options.enabled ?? true,
  });
}

export function usePlatformSubscriptions(
  filters: PlatformSubscriptionsFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["platform", "subscriptions", filters],
    queryFn: () =>
      getJson<PlatformSubscriptionSummary[]>(
        `/platform/subscriptions${buildQuery(filters)}`,
      ),
    enabled: options.enabled ?? true,
  });
}

export function usePlatformOnboardingQueue(
  filters: PlatformOnboardingFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["platform", "onboarding", filters],
    queryFn: () =>
      getJson<PlatformOnboardingQueueItem[]>(
        `/platform/onboarding${buildQuery(filters)}`,
      ),
    enabled: options.enabled ?? true,
  });
}

export function usePlatformAccounts(
  filters: PlatformAccountsFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["platform", "accounts", filters],
    queryFn: () =>
      getJson<PlatformAccountSummary[]>(`/platform/accounts${buildQuery(filters)}`),
    enabled: options.enabled ?? true,
  });
}

export function usePlatformCollections(
  filters: PlatformCollectionsFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["platform", "collections", filters],
    queryFn: () =>
      getJson<PlatformCollectionSummary[]>(
        `/platform/collections${buildQuery(filters)}`,
      ),
    enabled: options.enabled ?? true,
  });
}

export function usePlatformStaffOptions(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["platform", "staff", "options"],
    queryFn: () => getJson<PlatformStaffOption[]>("/platform/staff/options"),
    enabled: options.enabled ?? true,
    staleTime: 5 * 60_000,
  });
}

function usePlatformInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["platform"] });
  };
}

export function useCreatePlatformTenant() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: (body: CreatePlatformTenantInput) =>
      postJson<PlatformTenantDetail>("/platform/tenants", body),
    onSuccess: invalidate,
  });
}

export function useUpdatePlatformTenant() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdatePlatformTenantInput;
    }) => patchJson(`/platform/tenants/${id}`, body),
    onSuccess: invalidate,
  });
}

export function useUpdateTenantAccount() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: ({
      tenantId,
      body,
    }: {
      tenantId: string;
      body: UpdateTenantAccountInput;
    }) => patchJson<PlatformTenantDetail>(`/platform/tenants/${tenantId}/account`, body),
    onSuccess: invalidate,
  });
}

export function useUpdateTenantCollection() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: ({
      tenantId,
      body,
    }: {
      tenantId: string;
      body: UpdateTenantCollectionInput;
    }) => patchJson<PlatformTenantDetail>(`/platform/tenants/${tenantId}/collection`, body),
    onSuccess: invalidate,
  });
}

export function useCreateTenantAccountActivity() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: ({
      tenantId,
      body,
    }: {
      tenantId: string;
      body: CreateTenantAccountActivityInput;
    }) => postJson<PlatformTenantDetail>(`/platform/tenants/${tenantId}/account-activities`, body),
    onSuccess: invalidate,
  });
}
export function useUpdateTenantWorkspace() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: ({
      tenantId,
      body,
    }: {
      tenantId: string;
      body: UpdateTenantWorkspaceInput;
    }) =>
      patchJson<PlatformTenantDetail>(
        `/platform/tenants/${tenantId}/workspace`,
        body,
      ),
    onSuccess: invalidate,
  });
}

export function useCreateTenantContact() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: ({
      tenantId,
      body,
    }: {
      tenantId: string;
      body: CreateTenantContactInput;
    }) =>
      postJson<PlatformTenantDetail>(
        `/platform/tenants/${tenantId}/contacts`,
        body,
      ),
    onSuccess: invalidate,
  });
}

export function useUpdateTenantContact() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: ({
      tenantId,
      contactId,
      body,
    }: {
      tenantId: string;
      contactId: string;
      body: UpdateTenantContactInput;
    }) =>
      patchJson<PlatformTenantDetail>(
        `/platform/tenants/${tenantId}/contacts/${contactId}`,
        body,
      ),
    onSuccess: invalidate,
  });
}

export function useDeleteTenantContact() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: ({
      tenantId,
      contactId,
    }: {
      tenantId: string;
      contactId: string;
    }) =>
      apiFetch<PlatformTenantDetail>(
        `/platform/tenants/${tenantId}/contacts/${contactId}`,
        { method: "DELETE" },
      ),
    onSuccess: invalidate,
  });
}

export function useCreateTenantOnboardingTask() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: ({
      tenantId,
      body,
    }: {
      tenantId: string;
      body: CreateTenantOnboardingTaskInput;
    }) =>
      postJson<PlatformTenantDetail>(
        `/platform/tenants/${tenantId}/onboarding-tasks`,
        body,
      ),
    onSuccess: invalidate,
  });
}

export function useUpdateTenantOnboardingTask() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: ({
      tenantId,
      taskId,
      body,
    }: {
      tenantId: string;
      taskId: string;
      body: UpdateTenantOnboardingTaskInput;
    }) =>
      patchJson<PlatformTenantDetail>(
        `/platform/tenants/${tenantId}/onboarding-tasks/${taskId}`,
        body,
      ),
    onSuccess: invalidate,
  });
}

export function useDeleteTenantOnboardingTask() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: ({ tenantId, taskId }: { tenantId: string; taskId: string }) =>
      apiFetch<PlatformTenantDetail>(
        `/platform/tenants/${tenantId}/onboarding-tasks/${taskId}`,
        { method: "DELETE" },
      ),
    onSuccess: invalidate,
  });
}

export function useSuspendTenant() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: (id: string) => patchJson(`/platform/tenants/${id}/suspend`),
    onSuccess: invalidate,
  });
}

export function useReactivateTenant() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: (id: string) => patchJson(`/platform/tenants/${id}/reactivate`),
    onSuccess: invalidate,
  });
}

export function useArchiveTenant() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: (id: string) => patchJson(`/platform/tenants/${id}/archive`),
    onSuccess: invalidate,
  });
}

export function useResolveTenantEmergency() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: ({ tenantId, reason }: { tenantId: string; reason: string }) =>
      postJson<PlatformEmergencyLock>(
        `/platform/tenants/${tenantId}/emergency/deactivate`,
        { reason },
      ),
    onSuccess: invalidate,
  });
}

export function useActivateTenantEmergency() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: ({ tenantId, reason }: { tenantId: string; reason?: string }) =>
      postJson<PlatformEmergencyLock>(
        `/platform/tenants/${tenantId}/emergency/activate`,
        { reason },
      ),
    onSuccess: invalidate,
  });
}

export function useCreatePlatformPlan() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: (body: CreatePlatformPlanInput) =>
      postJson<PlatformPlan>("/platform/plans", body),
    onSuccess: invalidate,
  });
}

export function useUpdatePlatformPlan() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePlatformPlanInput }) =>
      patchJson<PlatformPlan>(`/platform/plans/${id}`, body),
    onSuccess: invalidate,
  });
}

export function useArchivePlatformPlan() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: (id: string) =>
      patchJson<PlatformPlan>(`/platform/plans/${id}/archive`),
    onSuccess: invalidate,
  });
}

export function useUpdateTenantSubscription() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: ({
      tenantId,
      body,
    }: {
      tenantId: string;
      body: UpdateTenantSubscriptionInput;
    }) =>
      patchJson<PlatformTenantDetail>(
        `/platform/tenants/${tenantId}/subscription`,
        body,
      ),
    onSuccess: invalidate,
  });
}

export function useRenewTenantSubscription() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: ({
      tenantId,
      body,
    }: {
      tenantId: string;
      body: RenewTenantSubscriptionInput;
    }) =>
      postJson<RenewTenantSubscriptionResult>(
        `/platform/tenants/${tenantId}/subscription/renew`,
        body,
      ),
    onSuccess: invalidate,
  });
}

export function useUpdateTenantModules() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: ({
      tenantId,
      modules,
    }: {
      tenantId: string;
      modules: Array<{ moduleId: string; enabled: boolean }>;
    }) =>
      patchJson<PlatformTenantDetail>(`/platform/tenants/${tenantId}/modules`, {
        modules,
      }),
    onSuccess: invalidate,
  });
}

export function useCreatePlatformModule() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: (body: CreatePlatformModuleInput) =>
      postJson<PlatformModuleDefinition>("/platform/modules", body),
    onSuccess: invalidate,
  });
}

export function useUpdatePlatformModule() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdatePlatformModuleInput;
    }) => patchJson<PlatformModuleDefinition>(`/platform/modules/${id}`, body),
    onSuccess: invalidate,
  });
}

export function useArchivePlatformModule() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: (id: string) =>
      patchJson<PlatformModuleDefinition>(`/platform/modules/${id}/archive`),
    onSuccess: invalidate,
  });
}

export function useUpdatePlanModules() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: ({
      planId,
      moduleIds,
    }: {
      planId: string;
      moduleIds: string[];
    }) =>
      patchJson<PlatformPlan[]>(`/platform/plans/${planId}/modules`, {
        moduleIds,
      }),
    onSuccess: invalidate,
  });
}

export function useOpenSupportSession() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: ({
      tenantId,
      body,
    }: {
      tenantId: string;
      body: OpenSupportSessionInput;
    }) =>
      postJson<PlatformSupportSession>(
        `/platform/tenants/${tenantId}/support-sessions`,
        body,
      ),
    onSuccess: invalidate,
  });
}

export function useCloseSupportSession() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: CloseSupportSessionInput;
    }) =>
      patchJson<PlatformSupportSession>(
        `/platform/support/sessions/${id}/close`,
        body,
      ),
    onSuccess: invalidate,
  });
}

export function useImpersonateSupportSession() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: (id: string) =>
      postJson<LoginResponse>(`/platform/support/sessions/${id}/impersonate`),
    onSuccess: invalidate,
  });
}

export function useCreatePlatformInvoice() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: ({
      tenantId,
      body,
    }: {
      tenantId: string;
      body: CreatePlatformInvoiceInput;
    }) =>
      postJson<PlatformInvoice>(`/platform/tenants/${tenantId}/invoices`, body),
    onSuccess: invalidate,
  });
}

export function useUpdatePlatformInvoice() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdatePlatformInvoiceInput;
    }) => patchJson<PlatformInvoice>(`/platform/billing/invoices/${id}`, body),
    onSuccess: invalidate,
  });
}

export function useCreatePlatformPayment() {
  const invalidate = usePlatformInvalidation();

  return useMutation({
    mutationFn: ({
      tenantId,
      body,
    }: {
      tenantId: string;
      body: CreatePlatformPaymentInput;
    }) =>
      postJson<PlatformPayment>(`/platform/tenants/${tenantId}/payments`, body),
    onSuccess: invalidate,
  });
}

export function usePlatformSettings(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['platform', 'settings'],
    queryFn: () => getJson<Record<string, unknown>>('/platform/settings'),
    enabled: options.enabled ?? true,
    staleTime: 60_000,
  });
}

export function useUpdatePlatformSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      patchJson<Record<string, unknown>>('/platform/settings', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'settings'] });
    },
  });
}




