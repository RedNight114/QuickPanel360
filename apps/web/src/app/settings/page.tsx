'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Boxes,
  Building2,
  Eye,
  EyeOff,
  Headphones,
  Layers,
  LayoutList,
  Loader2,
  Palette,
  Save,
  Scale,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Users,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Field } from '@/components/ui/field';
import { SectionSkeleton } from '@/components/ui/loading-state';
import { useMemberClasses, useUpsertMemberClass } from '@/hooks/useMemberClasses';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { useCreateSupportChat, useMySupportChat } from '@/hooks/useSupportChat';
import { useChatMessages, useSendChatMessage } from '@/hooks/useChat';
import { getJson, patchJson } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import type {
  MemberClassConfig,
  SettingsResponse,
  TenantSettings,
  UpdateSettingsInput,
} from '@/lib/types';
import { navSections } from '@/components/layout/app-shell';
import { useAuth } from '@/providers/auth-provider';

type SettingsTab =
  | 'company'
  | 'appearance'
  | 'pos'
  | 'scale'
  | 'members'
  | 'cash'
  | 'inventory'
  | 'security'
  | 'notifications'
  | 'modules'
  | 'menu'
  | 'member-app'
  | 'support';

const tabs: Array<{
  id: SettingsTab;
  label: string;
  icon: typeof Building2;
}> = [
  { id: 'company', label: 'Empresa', icon: Building2 },
  { id: 'appearance', label: 'Apariencia y regional', icon: Palette },
  { id: 'pos', label: 'Punto de dispensación', icon: ShoppingCart },
  { id: 'scale', label: 'Báscula', icon: Scale },
  { id: 'members', label: 'Socios y clases', icon: Users },
  { id: 'cash', label: 'Caja', icon: Wallet },
  { id: 'inventory', label: 'Inventario', icon: Boxes },
  { id: 'security', label: 'Seguridad y acceso', icon: ShieldCheck },
  { id: 'notifications', label: 'Avisos del club', icon: Bell },
  { id: 'menu', label: 'Menú lateral', icon: LayoutList },
  { id: 'member-app', label: 'Portal del Socio', icon: Smartphone },
  { id: 'modules', label: 'Módulos', icon: Layers },
];

const moduleLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  pos: 'Punto de dispensación',
  cash: 'Caja',
  members: 'Socios y CRM',
  products: 'Productos',
  inventory: 'Inventario',
  receivables: 'Cuentas pendientes',
  third_party_payments: 'Aportaciones a terceros',
  users: 'Colaboradores',
  analytics: 'Analítica',
  audit: 'Auditoría',
  chat: 'Chat interno',
  security: 'Seguridad y acceso',
  notifications: 'Centro de avisos',
  settings: 'Configuración',
};

const defaultForm: UpdateSettingsInput = {
  name: '',
  legalName: '',
  taxId: '',
  email: '',
  phone: '',
  city: '',
  country: 'ES',
  displayName: '',
  logoUrl: '',
  primaryColor: '#10B981',
  accentColor: '#059669',
  currency: 'CR',
  locale: 'es-ES',
  timezone: 'Atlantic/Canary',
  defaultDensity: 'comfortable',
  allowCreditSales: true,
  requireCreditReason: true,
  allowSpecialSales: false,
  quickWeightValuesGrams: '1,2,3,5',
  showReceiptAfterSale: true,
  scaleVerificationEnabled: true,
  requireScaleVerification: true,
  maxWastePerLineGrams: 0.05,
  maxWastePercent: 5,
  scaleToleranceAction: 'BLOCK',
  allowUnderWeight: false,
  scalePrecisionGrams: 0.01,
  autoRegisterScaleWaste: true,
  scaleWasteReason: 'Diferencia por peso real en báscula',
  showScaleStepOnMobile: true,
  autoGenerateMemberNumber: false,
  memberNumberPrefix: '',
  minimumMemberAge: null,
  requireMemberPhoto: false,
  requireCashCloseConfirmation: true,
  allowCashDiscrepancyClose: true,
  requireCashDiscrepancyReason: false,
  recommendedOpeningCash: null,
  alertOpenCashSessionMinutes: null,
  blockDispensationIfNoStock: false,
  lowStockAlertEnabled: true,
  lowStockThresholdGrams: 50,
  requireAdjustmentReason: false,
  requireWasteReason: false,
  showNegativeScaleDiff: true,
  inventoryDisplayUnit: 'g',
  showSecurityBadges: true,
  requireAccessLink: true,
  notifyLowStock: true,
  notifyCashDiscrepancy: true,
  notifyHighWaste: false,
  notifyMemberBirthday: true,
  notifyHighReceivables: false,
  notifyEmergency: true,
  notifySupportActivity: true,
};

type MemberClassDraft = {
  memberClass: MemberClassConfig['memberClass'];
  label: string;
  description: string;
  suggestedBonification: string;
  birthdayBonification: string;
  requirePhoto: boolean;
  isDefault: boolean;
  isActive: boolean;
};

function responseToForm(response?: SettingsResponse | null): UpdateSettingsInput {
  if (!response) return defaultForm;
  return {
    ...defaultForm,
    ...response.tenant,
    ...response.settings,
    legalName: response.tenant.legalName ?? '',
    taxId: response.tenant.taxId ?? '',
    email: response.tenant.email ?? '',
    phone: response.tenant.phone ?? '',
    city: response.tenant.city ?? '',
    country: response.tenant.country ?? 'ES',
    displayName: response.settings.displayName ?? '',
    logoUrl: response.settings.logoUrl ?? '',
    primaryColor: response.settings.primaryColor ?? '#10B981',
    accentColor: response.settings.accentColor ?? '#059669',
    memberNumberPrefix: response.settings.memberNumberPrefix ?? '',
    scaleWasteReason: response.settings.scaleWasteReason ?? '',
    quickWeightValuesGrams: response.settings.quickWeightValuesGrams ?? '1,2,3,5',
  };
}

function toNullableNumber(value: unknown) {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanPayload(form: UpdateSettingsInput): UpdateSettingsInput {
  return {
    name: form.name || undefined,
    legalName: form.legalName || null,
    taxId: form.taxId || null,
    email: form.email || null,
    phone: form.phone || null,
    city: form.city || null,
    country: form.country || undefined,
    displayName: form.displayName || null,
    logoUrl: form.logoUrl || null,
    primaryColor: form.primaryColor || undefined,
    accentColor: form.accentColor || undefined,
    currency: form.currency || undefined,
    locale: form.locale || undefined,
    timezone: form.timezone || undefined,
    defaultDensity: form.defaultDensity || undefined,
    quickWeightValuesGrams: form.quickWeightValuesGrams || undefined,
    showReceiptAfterSale: form.showReceiptAfterSale,
    allowCreditSales: form.allowCreditSales,
    requireCreditReason: form.requireCreditReason,
    allowSpecialSales: form.allowSpecialSales,
    scaleVerificationEnabled: form.scaleVerificationEnabled,
    requireScaleVerification: form.requireScaleVerification,
    maxWastePerLineGrams: Number(form.maxWastePerLineGrams ?? 0),
    maxWastePercent: Number(form.maxWastePercent ?? 0),
    scaleToleranceAction: form.scaleToleranceAction,
    allowUnderWeight: form.allowUnderWeight,
    scalePrecisionGrams: Number(form.scalePrecisionGrams ?? 0.01),
    autoRegisterScaleWaste: form.autoRegisterScaleWaste,
    scaleWasteReason: String(form.scaleWasteReason ?? ''),
    showScaleStepOnMobile: form.showScaleStepOnMobile,
    autoGenerateMemberNumber: form.autoGenerateMemberNumber,
    memberNumberPrefix: form.memberNumberPrefix || null,
    minimumMemberAge: toNullableNumber(form.minimumMemberAge),
    requireMemberPhoto: form.requireMemberPhoto,
    requireCashCloseConfirmation: form.requireCashCloseConfirmation,
    allowCashDiscrepancyClose: form.allowCashDiscrepancyClose,
    requireCashDiscrepancyReason: form.requireCashDiscrepancyReason,
    recommendedOpeningCash: toNullableNumber(form.recommendedOpeningCash),
    alertOpenCashSessionMinutes: toNullableNumber(form.alertOpenCashSessionMinutes),
    blockDispensationIfNoStock: form.blockDispensationIfNoStock,
    lowStockAlertEnabled: form.lowStockAlertEnabled,
    lowStockThresholdGrams: Number(form.lowStockThresholdGrams ?? 0),
    requireAdjustmentReason: form.requireAdjustmentReason,
    requireWasteReason: form.requireWasteReason,
    showNegativeScaleDiff: form.showNegativeScaleDiff,
    inventoryDisplayUnit: form.inventoryDisplayUnit || undefined,
    showSecurityBadges: form.showSecurityBadges,
    requireAccessLink: form.requireAccessLink,
    notifyLowStock: form.notifyLowStock,
    notifyCashDiscrepancy: form.notifyCashDiscrepancy,
    notifyHighWaste: form.notifyHighWaste,
    notifyMemberBirthday: form.notifyMemberBirthday,
    notifyHighReceivables: form.notifyHighReceivables,
    notifyEmergency: form.notifyEmergency,
    notifySupportActivity: form.notifySupportActivity,
  };
}

interface MemberAppSettings {
  id: string;
  tenantId: string;
  enabled: boolean;
  catalogEnabled: boolean;
  showProductValues: boolean;
  showApproxAvailability: boolean;
  pointsEnabled: boolean;
  allowProfileEdit: boolean;
  digitalCardEnabled: boolean;
}

function boolValue(value: unknown) {
  return Boolean(value);
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      {description ? (
        <p className="mt-0.5 text-sm text-text-muted">{description}</p>
      ) : null}
    </div>
  );
}

function ToggleCard({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-start justify-between gap-4 rounded-xl border p-3.5 text-left transition ${
        checked
          ? 'border-brand-primary/30 bg-brand-lighter/20'
          : 'border-border-light bg-white hover:border-brand-primary/20'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-primary">{label}</p>
        <p className="mt-0.5 text-xs text-text-muted">{description}</p>
      </div>
      <div
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-brand-primary' : 'bg-gray-300'
        }`}
      >
        <div
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
  );
}

function memberClassToDraft(config: MemberClassConfig): MemberClassDraft {
  return {
    memberClass: config.memberClass,
    label: config.label,
    description: config.description ?? '',
    suggestedBonification: String(config.suggestedBonification ?? 0),
    birthdayBonification: String(config.birthdayBonification ?? 0),
    requirePhoto: config.requirePhoto,
    isDefault: config.isDefault,
    isActive: config.isActive,
  };
}

export default function SettingsPage() {
  const { hasPermission, tenant, updateTenant } = useAuth();
  const canRead = hasPermission('settings.read');
  const canUpdate = hasPermission('settings.update');

  const settingsQuery = useSettings({ enabled: canRead });
  const updateSettings = useUpdateSettings();
  const memberClassesQuery = useMemberClasses({ enabled: canRead });
  const upsertMemberClass = useUpsertMemberClass();

  const [tab, setTab] = useState<SettingsTab>('company');
  const [form, setForm] = useState<UpdateSettingsInput>(defaultForm);
  const [memberClassModal, setMemberClassModal] = useState(false);
  const [memberClassDraft, setMemberClassDraft] = useState<MemberClassDraft | null>(
    null,
  );

  // ── Member-app settings ──────────────────────────────────────
  const canManageMemberApp = hasPermission('member_app.manage');
  const [memberAppSettings, setMemberAppSettings] = useState<MemberAppSettings | null>(null);
  const [memberAppLoading, setMemberAppLoading] = useState(false);
  const [memberAppSaving, setMemberAppSaving] = useState(false);

  useEffect(() => {
    if (tab === 'member-app' && canManageMemberApp && !memberAppSettings) {
      setMemberAppLoading(true);
      getJson<MemberAppSettings>('/member-app-admin/settings')
        .then(setMemberAppSettings)
        .catch(() => toast.error('No se pudo cargar la configuración del portal.'))
        .finally(() => setMemberAppLoading(false));
    }
  }, [tab, canManageMemberApp, memberAppSettings]);

  function setMemberAppValue<K extends keyof MemberAppSettings>(
    key: K,
    value: MemberAppSettings[K],
  ) {
    setMemberAppSettings((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSaveMemberApp() {
    if (!memberAppSettings) return;
    setMemberAppSaving(true);
    try {
      const updated = await patchJson<MemberAppSettings>('/member-app-admin/settings', {
        enabled: memberAppSettings.enabled,
        catalogEnabled: memberAppSettings.catalogEnabled,
        showProductValues: memberAppSettings.showProductValues,
        showApproxAvailability: memberAppSettings.showApproxAvailability,
        pointsEnabled: memberAppSettings.pointsEnabled,
        allowProfileEdit: memberAppSettings.allowProfileEdit,
        digitalCardEnabled: memberAppSettings.digitalCardEnabled,
      });
      setMemberAppSettings(updated);
      toast.success('Configuración del portal guardada.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo guardar la configuración del portal.'));
    } finally {
      setMemberAppSaving(false);
    }
  }

  useEffect(() => {
    if (settingsQuery.data) {
      setForm(responseToForm(settingsQuery.data));
    }
  }, [settingsQuery.data]);

  const memberClasses = useMemo(
    () => memberClassesQuery.data ?? [],
    [memberClassesQuery.data],
  );

  function setValue<K extends keyof UpdateSettingsInput>(
    key: K,
    value: UpdateSettingsInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    try {
      const payload = cleanPayload(form);
      const response = await updateSettings.mutateAsync(payload);
      setForm(responseToForm(response));
      if (response.tenant?.name) {
        updateTenant({ name: response.tenant.name });
      }
      toast.success('Configuración guardada.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo guardar la configuración.'));
    }
  }

  async function handleSaveMemberClass() {
    if (!memberClassDraft) return;

    try {
      await upsertMemberClass.mutateAsync({
        memberClass: memberClassDraft.memberClass,
        label: memberClassDraft.label.trim(),
        description: memberClassDraft.description.trim() || null,
        suggestedBonification: Number(memberClassDraft.suggestedBonification ?? 0),
        birthdayBonification: Number(memberClassDraft.birthdayBonification ?? 0),
        requirePhoto: memberClassDraft.requirePhoto,
        isDefault: memberClassDraft.isDefault,
        isActive: memberClassDraft.isActive,
      });
      setMemberClassModal(false);
      toast.success('Clase de socio guardada.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo guardar la clase de socio.'));
    }
  }

  if (!canRead) {
    return (
      <ProtectedLayout>
        <EmptyState title="No tienes acceso a la configuración del club." />
      </ProtectedLayout>
    );
  }

  if (settingsQuery.isLoading) {
    return (
      <ProtectedLayout>
        <div className="space-y-4">
          <SectionSkeleton rows={3} />
          <SectionSkeleton rows={4} />
        </div>
      </ProtectedLayout>
    );
  }

  if (settingsQuery.error) {
    return (
      <ProtectedLayout>
        <ErrorState
          message="No se pudo cargar la configuración."
          onRetry={() => settingsQuery.refetch()}
        />
      </ProtectedLayout>
    );
  }

  const enabledModules = tenant?.enabledModules ?? [];
  const chatModuleActive = enabledModules.length === 0 || enabledModules.includes('chat');
  const visibleTabs = chatModuleActive
    ? tabs
    : [...tabs, { id: 'support' as SettingsTab, label: 'Soporte', icon: Headphones }];

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <PageHeader
          title="Configuración del club"
          description="Ajusta identidad, operativa, inventario, seguridad y avisos internos."
          action={
            canUpdate ? (
              <Button onClick={handleSave} disabled={updateSettings.isPending}>
                {updateSettings.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {updateSettings.isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            ) : null
          }
        />

        <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
          <Card className="h-fit p-3">
            <div className="grid gap-1.5">
              {visibleTabs.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                      active
                        ? 'bg-brand-lighter text-brand-primary'
                        : 'text-text-secondary hover:bg-bg-soft hover:text-text-primary'
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="space-y-6">
            {tab === 'company' ? (
              <div className="space-y-4">
                <Card>
                  <SectionTitle
                    title="Identidad del club"
                    description="Nombre visible para socios y colaboradores."
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Nombre del club" value={String(form.name ?? '')} onChange={(event) => setValue('name', event.target.value)} />
                    <Field label="Nombre visible (opcional)" value={String(form.displayName ?? '')} onChange={(event) => setValue('displayName', event.target.value)} />
                  </div>
                </Card>
                <Card>
                  <SectionTitle
                    title="Datos fiscales"
                    description="Información legal para facturación y documentos oficiales."
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Razón social" value={String(form.legalName ?? '')} onChange={(event) => setValue('legalName', event.target.value)} />
                    <Field label="NIF / CIF" value={String(form.taxId ?? '')} onChange={(event) => setValue('taxId', event.target.value)} />
                  </div>
                </Card>
                <Card>
                  <SectionTitle
                    title="Contacto y ubicación"
                    description="Datos de contacto del club."
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Email" value={String(form.email ?? '')} onChange={(event) => setValue('email', event.target.value)} />
                    <Field label="Teléfono" value={String(form.phone ?? '')} onChange={(event) => setValue('phone', event.target.value)} />
                    <Field label="Ciudad" value={String(form.city ?? '')} onChange={(event) => setValue('city', event.target.value)} />
                    <Field label="País" value={String(form.country ?? 'ES')} onChange={(event) => setValue('country', event.target.value)} />
                  </div>
                </Card>
              </div>
            ) : null}

            {tab === 'appearance' ? (
              <div className="space-y-4">
                <Card>
                  <SectionTitle title="Branding" description="Personaliza la imagen visual de tu club." />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Logo URL" value={String(form.logoUrl ?? '')} onChange={(event) => setValue('logoUrl', event.target.value)} />
                    <Field label="Color principal" type="color" value={String(form.primaryColor ?? '#10B981')} onChange={(event) => setValue('primaryColor', event.target.value)} />
                    <Field label="Color acento" type="color" value={String(form.accentColor ?? '#059669')} onChange={(event) => setValue('accentColor', event.target.value)} />
                  </div>
                  <div className="mt-3">
                    <label className="block">
                      <span className="text-sm font-medium text-text-primary">Densidad visual</span>
                      <select className="mt-1.5 h-11 w-full rounded-lg border border-border-light bg-white px-3 text-text-primary outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20" value={String(form.defaultDensity ?? 'comfortable')} onChange={(event) => setValue('defaultDensity', event.target.value as TenantSettings['defaultDensity'])}>
                        <option value="compact">Compacta</option>
                        <option value="comfortable">Cómoda</option>
                      </select>
                    </label>
                  </div>
                </Card>
                <Card>
                  <SectionTitle title="Configuración regional" description="Moneda, idioma y zona horaria del club." />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Moneda" value={String(form.currency ?? 'CR')} onChange={(event) => setValue('currency', event.target.value)} />
                    <Field label="Idioma / Locale" value={String(form.locale ?? 'es-ES')} onChange={(event) => setValue('locale', event.target.value)} />
                    <Field label="Zona horaria" value={String(form.timezone ?? 'Atlantic/Canary')} onChange={(event) => setValue('timezone', event.target.value)} />
                  </div>
                </Card>
              </div>
            ) : null}

            {tab === 'pos' ? (
              <Card>
                <SectionTitle
                  title="Punto de dispensación"
                  description="Reglas para dispensaciones, créditos y flujo operativo."
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    label="Valores rápidos de peso (g)"
                    value={String(form.quickWeightValuesGrams ?? '')}
                    onChange={(event) =>
                      setValue('quickWeightValuesGrams', event.target.value)
                    }
                  />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <ToggleCard
                    label="Permitir ventas a crédito"
                    description="Autoriza dejar importe pendiente al socio."
                    checked={boolValue(form.allowCreditSales)}
                    onChange={(value) => setValue('allowCreditSales', value)}
                  />
                  <ToggleCard
                    label="Exigir motivo de crédito"
                    description="Pide justificar la operación cuando queda pendiente."
                    checked={boolValue(form.requireCreditReason)}
                    onChange={(value) => setValue('requireCreditReason', value)}
                  />
                  <ToggleCard
                    label="Permitir ventas especiales"
                    description="Activa operaciones excepcionales o no estándar."
                    checked={boolValue(form.allowSpecialSales)}
                    onChange={(value) => setValue('allowSpecialSales', value)}
                  />
                  <ToggleCard
                    label="Mostrar recibo tras la venta"
                    description="Mantiene visible el resumen final al cerrar la operación."
                    checked={boolValue(form.showReceiptAfterSale)}
                    onChange={(value) => setValue('showReceiptAfterSale', value)}
                  />
                </div>
              </Card>
            ) : null}

            {tab === 'scale' ? (
              <Card>
                <SectionTitle
                  title="Báscula y tolerancias"
                  description="Controla verificación de peso real, tolerancias y merma automática."
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    label="Merma máxima por línea (g)"
                    type="number"
                    step="0.01"
                    value={String(form.maxWastePerLineGrams ?? 0)}
                    onChange={(event) =>
                      setValue('maxWastePerLineGrams', Number(event.target.value))
                    }
                  />
                  <Field
                    label="Merma máxima (%)"
                    type="number"
                    step="0.1"
                    value={String(form.maxWastePercent ?? 0)}
                    onChange={(event) =>
                      setValue('maxWastePercent', Number(event.target.value))
                    }
                  />
                  <Field
                    label="Precisión de báscula (g)"
                    type="number"
                    step="0.001"
                    value={String(form.scalePrecisionGrams ?? 0)}
                    onChange={(event) =>
                      setValue('scalePrecisionGrams', Number(event.target.value))
                    }
                  />
                  <Field
                    label="Motivo por defecto de merma"
                    value={String(form.scaleWasteReason ?? '')}
                    onChange={(event) =>
                      setValue('scaleWasteReason', event.target.value)
                    }
                  />
                </div>
                <div className="mt-3">
                  <label className="block">
                    <span className="text-sm font-medium text-text-primary">
                      Acción ante exceso de tolerancia
                    </span>
                    <select
                      className="mt-1.5 h-11 w-full rounded-lg border border-border-light bg-white px-3 text-text-primary outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                      value={String(form.scaleToleranceAction ?? 'BLOCK')}
                      onChange={(event) =>
                        setValue(
                          'scaleToleranceAction',
                          event.target.value as TenantSettings['scaleToleranceAction'],
                        )
                      }
                    >
                      <option value="BLOCK">Bloquear</option>
                      <option value="REQUIRE_MANAGER_CONFIRMATION">
                        Requiere autorización
                      </option>
                      <option value="ALLOW_WITH_WARNING">
                        Permitir con aviso
                      </option>
                    </select>
                  </label>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <ToggleCard
                    label="Verificación de báscula activa"
                    description="Activa flujo de comprobación de peso real."
                    checked={boolValue(form.scaleVerificationEnabled)}
                    onChange={(value) => setValue('scaleVerificationEnabled', value)}
                  />
                  <ToggleCard
                    label="Exigir verificación"
                    description="No permite cerrar líneas a peso sin confirmación."
                    checked={boolValue(form.requireScaleVerification)}
                    onChange={(value) => setValue('requireScaleVerification', value)}
                  />
                  <ToggleCard
                    label="Permitir peso por debajo"
                    description="Acepta diferencias negativas dentro de la regla configurada."
                    checked={boolValue(form.allowUnderWeight)}
                    onChange={(value) => setValue('allowUnderWeight', value)}
                  />
                  <ToggleCard
                    label="Registrar merma automáticamente"
                    description="Convierte la diferencia de peso en merma sin paso manual."
                    checked={boolValue(form.autoRegisterScaleWaste)}
                    onChange={(value) => setValue('autoRegisterScaleWaste', value)}
                  />
                  <ToggleCard
                    label="Mostrar paso de báscula en móvil"
                    description="Mantiene visible el bloque de peso en pantallas pequeñas."
                    checked={boolValue(form.showScaleStepOnMobile)}
                    onChange={(value) => setValue('showScaleStepOnMobile', value)}
                  />
                </div>
              </Card>
            ) : null}

            {tab === 'members' ? (
              <div className="space-y-4">
              <Card>
                <SectionTitle
                  title="Configuración de socios"
                  description="Numeración automática, restricciones de edad y requisitos."
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    label="Prefijo de número de socio"
                    value={String(form.memberNumberPrefix ?? '')}
                    onChange={(event) =>
                      setValue('memberNumberPrefix', event.target.value)
                    }
                  />
                  <Field
                    label="Edad mínima"
                    type="number"
                    value={String(form.minimumMemberAge ?? '')}
                    onChange={(event) =>
                      setValue('minimumMemberAge', toNullableNumber(event.target.value))
                    }
                  />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <ToggleCard
                    label="Autogenerar número de socio"
                    description="Genera el código sin intervención manual."
                    checked={boolValue(form.autoGenerateMemberNumber)}
                    onChange={(value) =>
                      setValue('autoGenerateMemberNumber', value)
                    }
                  />
                  <ToggleCard
                    label="Exigir foto de socio"
                    description="Marca la ficha como incompleta si no hay imagen."
                    checked={boolValue(form.requireMemberPhoto)}
                    onChange={(value) => setValue('requireMemberPhoto', value)}
                  />
                </div>

              </Card>
              <Card>
                <SectionTitle
                  title="Clases de socio"
                  description="Bonificaciones sugeridas, cumpleaños y requisitos por clase."
                />
                <div className="grid gap-3 md:grid-cols-3">
                  {memberClassesQuery.isLoading ? (
                    <SectionSkeleton rows={3} />
                  ) : memberClasses.length ? (
                    memberClasses.map((item) => (
                      <Card key={item.id} className="p-4">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-text-primary">
                            {item.label}
                          </h4>
                          {item.isDefault ? (
                            <Badge variant="secondary">Por defecto</Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-text-muted">
                          {item.description || 'Sin descripción'}
                        </p>
                        <div className="mt-3 space-y-1 text-xs text-text-muted">
                          <p>Bonificación sugerida: {item.suggestedBonification}%</p>
                          <p>Cumpleaños: {item.birthdayBonification}%</p>
                          <p>Foto requerida: {item.requirePhoto ? 'Sí' : 'No'}</p>
                        </div>
                        <div className="mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setMemberClassDraft(memberClassToDraft(item));
                              setMemberClassModal(true);
                            }}
                          >
                            Editar clase
                          </Button>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <EmptyState
                      title="Sin clases configuradas"
                      text="Las clases de socio aparecerán aquí."
                    />
                  )}
                </div>
              </Card>
              </div>
            ) : null}

            {tab === 'cash' ? (
              <Card>
                <SectionTitle
                  title="Caja"
                  description="Reglas de apertura, cierre y tratamiento de diferencias."
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    label="Apertura recomendada"
                    type="number"
                    step="0.01"
                    value={String(form.recommendedOpeningCash ?? '')}
                    onChange={(event) =>
                      setValue(
                        'recommendedOpeningCash',
                        toNullableNumber(event.target.value),
                      )
                    }
                  />
                  <Field
                    label="Aviso por sesión abierta (min)"
                    type="number"
                    value={String(form.alertOpenCashSessionMinutes ?? '')}
                    onChange={(event) =>
                      setValue(
                        'alertOpenCashSessionMinutes',
                        toNullableNumber(event.target.value),
                      )
                    }
                  />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <ToggleCard
                    label="Exigir confirmación al cierre"
                    description="Pide confirmación antes de cerrar la caja."
                    checked={boolValue(form.requireCashCloseConfirmation)}
                    onChange={(value) =>
                      setValue('requireCashCloseConfirmation', value)
                    }
                  />
                  <ToggleCard
                    label="Permitir cierre con diferencia"
                    description="Autoriza cerrar incluso si el efectivo no cuadra."
                    checked={boolValue(form.allowCashDiscrepancyClose)}
                    onChange={(value) =>
                      setValue('allowCashDiscrepancyClose', value)
                    }
                  />
                  <ToggleCard
                    label="Exigir motivo de diferencia"
                    description="Obliga a documentar la discrepancia de caja."
                    checked={boolValue(form.requireCashDiscrepancyReason)}
                    onChange={(value) =>
                      setValue('requireCashDiscrepancyReason', value)
                    }
                  />
                </div>
              </Card>
            ) : null}

            {tab === 'inventory' ? (
              <Card>
                <SectionTitle
                  title="Inventario"
                  description="Protecciones y avisos para stock, ajustes y mermas."
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    label="Umbral de stock bajo (g)"
                    type="number"
                    step="1"
                    value={String(form.lowStockThresholdGrams ?? 0)}
                    onChange={(event) =>
                      setValue('lowStockThresholdGrams', Number(event.target.value))
                    }
                  />
                  <Field
                    label="Unidad visible"
                    value={String(form.inventoryDisplayUnit ?? 'g')}
                    onChange={(event) =>
                      setValue('inventoryDisplayUnit', event.target.value)
                    }
                  />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <ToggleCard
                    label="Bloquear si no hay stock"
                    description="Evita dispensar productos agotados."
                    checked={boolValue(form.blockDispensationIfNoStock)}
                    onChange={(value) =>
                      setValue('blockDispensationIfNoStock', value)
                    }
                  />
                  <ToggleCard
                    label="Aviso de stock bajo"
                    description="Muestra avisos internos cuando el stock cae bajo el umbral."
                    checked={boolValue(form.lowStockAlertEnabled)}
                    onChange={(value) => setValue('lowStockAlertEnabled', value)}
                  />
                  <ToggleCard
                    label="Exigir motivo en ajustes"
                    description="No permite correcciones de stock sin explicación."
                    checked={boolValue(form.requireAdjustmentReason)}
                    onChange={(value) => setValue('requireAdjustmentReason', value)}
                  />
                  <ToggleCard
                    label="Exigir motivo en merma"
                    description="Obliga a documentar pérdidas y desperdicio."
                    checked={boolValue(form.requireWasteReason)}
                    onChange={(value) => setValue('requireWasteReason', value)}
                  />
                  <ToggleCard
                    label="Mostrar diferencia negativa"
                    description="Mantiene visibles diferencias bajo el peso esperado."
                    checked={boolValue(form.showNegativeScaleDiff)}
                    onChange={(value) => setValue('showNegativeScaleDiff', value)}
                  />
                </div>
              </Card>
            ) : null}

            {tab === 'security' ? (
              <Card>
                <SectionTitle
                  title="Seguridad"
                  description="Comportamiento de acceso y visibilidad de señales de riesgo."
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <ToggleCard
                    label="Exigir access link"
                    description="Fuerza el uso del enlace seguro para acceder al club."
                    checked={boolValue(form.requireAccessLink)}
                    onChange={(value) => setValue('requireAccessLink', value)}
                  />
                  <ToggleCard
                    label="Mostrar insignias de seguridad"
                    description="Hace visibles indicadores internos en la interfaz."
                    checked={boolValue(form.showSecurityBadges)}
                    onChange={(value) => setValue('showSecurityBadges', value)}
                  />
                </div>
              </Card>
            ) : null}

            {tab === 'notifications' ? (
              <Card>
                <SectionTitle
                  title="Notificaciones"
                  description="Controla qué eventos internos generan avisos al equipo."
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <ToggleCard
                    label="Avisar de stock bajo"
                    description="Crea avisos cuando un producto cae bajo el umbral."
                    checked={boolValue(form.notifyLowStock)}
                    onChange={(value) => setValue('notifyLowStock', value)}
                  />
                  <ToggleCard
                    label="Avisar de diferencia de caja"
                    description="Notifica discrepancias al cierre."
                    checked={boolValue(form.notifyCashDiscrepancy)}
                    onChange={(value) =>
                      setValue('notifyCashDiscrepancy', value)
                    }
                  />
                  <ToggleCard
                    label="Avisar de merma alta"
                    description="Lanza avisos cuando la pérdida supera lo esperado."
                    checked={boolValue(form.notifyHighWaste)}
                    onChange={(value) => setValue('notifyHighWaste', value)}
                  />
                  <ToggleCard
                    label="Avisar de cumpleaños"
                    description="Genera recordatorios de beneficios de cumpleaños."
                    checked={boolValue(form.notifyMemberBirthday)}
                    onChange={(value) =>
                      setValue('notifyMemberBirthday', value)
                    }
                  />
                  <ToggleCard
                    label="Avisar de cuentas pendientes altas"
                    description="Marca acumulados de crédito relevantes."
                    checked={boolValue(form.notifyHighReceivables)}
                    onChange={(value) =>
                      setValue('notifyHighReceivables', value)
                    }
                  />
                  <ToggleCard
                    label="Avisar de emergencias"
                    description="Mantiene visible cualquier estado crítico del club."
                    checked={boolValue(form.notifyEmergency)}
                    onChange={(value) => setValue('notifyEmergency', value)}
                  />
                  <ToggleCard
                    label="Avisar de soporte"
                    description="Muestra actividad relacionada con soporte y plataforma."
                    checked={boolValue(form.notifySupportActivity)}
                    onChange={(value) =>
                      setValue('notifySupportActivity', value)
                    }
                  />
                </div>
              </Card>
            ) : null}

            {tab === 'menu' ? (
              <SidebarMenuConfig />
            ) : null}

            {tab === 'member-app' ? (
              canManageMemberApp ? (
                memberAppLoading ? (
                  <SectionSkeleton rows={4} />
                ) : memberAppSettings ? (
                  <div className="space-y-4">
                    <Card>
                      <SectionTitle
                        title="Portal del Socio"
                        description="Controla el acceso y las funcionalidades visibles del portal para socios."
                      />
                      <div className="grid gap-3 md:grid-cols-2">
                        <ToggleCard
                          label="Activar Portal del Socio"
                          description="Permite a los socios acceder a su portal privado."
                          checked={memberAppSettings.enabled}
                          onChange={(value) => setMemberAppValue('enabled', value)}
                        />
                        <ToggleCard
                          label="Catalogo visible"
                          description="El catalogo es informativo y no permite compras ni reservas."
                          checked={memberAppSettings.catalogEnabled}
                          onChange={(value) => setMemberAppValue('catalogEnabled', value)}
                        />
                        <ToggleCard
                          label="Mostrar valores en CR"
                          description="Muestra el valor orientativo de cada producto."
                          checked={memberAppSettings.showProductValues}
                          onChange={(value) => setMemberAppValue('showProductValues', value)}
                        />
                        <ToggleCard
                          label="Mostrar disponibilidad"
                          description="Indica si el producto esta disponible para dispensacion."
                          checked={memberAppSettings.showApproxAvailability}
                          onChange={(value) => setMemberAppValue('showApproxAvailability', value)}
                        />
                        <ToggleCard
                          label="Sistema de puntos"
                          description="Los puntos son de participacion, no de consumo."
                          checked={memberAppSettings.pointsEnabled}
                          onChange={(value) => setMemberAppValue('pointsEnabled', value)}
                        />
                        <ToggleCard
                          label="Permitir edicion de perfil"
                          description="El socio puede editar su telefono y email."
                          checked={memberAppSettings.allowProfileEdit}
                          onChange={(value) => setMemberAppValue('allowProfileEdit', value)}
                        />
                        <ToggleCard
                          label="Carnet digital"
                          description="El carnet digital sirve para identificar al socio dentro del club."
                          checked={memberAppSettings.digitalCardEnabled}
                          onChange={(value) => setMemberAppValue('digitalCardEnabled', value)}
                        />
                      </div>
                      <div className="mt-6 flex justify-end">
                        <Button onClick={handleSaveMemberApp} disabled={memberAppSaving}>
                          {memberAppSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          {memberAppSaving ? 'Guardando...' : 'Guardar portal'}
                        </Button>
                      </div>
                    </Card>
                  </div>
                ) : (
                  <ErrorState
                    message="No se pudo cargar la configuración del portal."
                    onRetry={() => {
                      setMemberAppSettings(null);
                    }}
                  />
                )
              ) : (
                <EmptyState title="No tienes permisos para gestionar el Portal del Socio." />
              )
            ) : null}

            {tab === 'modules' ? (
              <Card>
                <SectionTitle
                  title="Módulos activos"
                  description="Vista rápida de los módulos habilitados para esta empresa."
                />
                {enabledModules.length ? (
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {enabledModules.map((moduleKey) => (
                      <div
                        key={moduleKey}
                        className="flex items-center justify-between rounded-lg border border-border-light bg-bg-soft px-3 py-2.5"
                      >
                        <span className="text-sm text-text-primary">
                          {moduleLabels[moduleKey] ?? moduleKey}
                        </span>
                        <Badge variant="success">Activo</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Sin módulos detectados"
                    text="Los módulos habilitados aparecerán aquí."
                  />
                )}
              </Card>
            ) : null}

            {tab === 'support' ? (
              <SupportChatTab />
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={memberClassModal} onOpenChange={setMemberClassModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar clase de socio</DialogTitle>
            <DialogDescription>
              Ajusta etiqueta, bonificaciones y reglas de registro.
            </DialogDescription>
          </DialogHeader>

          {memberClassDraft ? (
            <div className="space-y-3">
              <Field
                label="Etiqueta"
                value={memberClassDraft.label}
                onChange={(event) =>
                  setMemberClassDraft((current) =>
                    current ? { ...current, label: event.target.value } : current,
                  )
                }
              />
              <Field
                label="Descripción"
                value={memberClassDraft.description}
                onChange={(event) =>
                  setMemberClassDraft((current) =>
                    current
                      ? { ...current, description: event.target.value }
                      : current,
                  )
                }
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="Bonificación sugerida (%)"
                  type="number"
                  value={memberClassDraft.suggestedBonification}
                  onChange={(event) =>
                    setMemberClassDraft((current) =>
                      current
                        ? {
                            ...current,
                            suggestedBonification: event.target.value,
                          }
                        : current,
                    )
                  }
                />
                <Field
                  label="Bonificación cumpleaños (%)"
                  type="number"
                  value={memberClassDraft.birthdayBonification}
                  onChange={(event) =>
                    setMemberClassDraft((current) =>
                      current
                        ? {
                            ...current,
                            birthdayBonification: event.target.value,
                          }
                        : current,
                    )
                  }
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <ToggleCard
                  label="Foto requerida"
                  description="Aplica esta regla a la clase."
                  checked={memberClassDraft.requirePhoto}
                  onChange={(value) =>
                    setMemberClassDraft((current) =>
                      current ? { ...current, requirePhoto: value } : current,
                    )
                  }
                />
                <ToggleCard
                  label="Clase activa"
                  description="Permite usarla en registros nuevos."
                  checked={memberClassDraft.isActive}
                  onChange={(value) =>
                    setMemberClassDraft((current) =>
                      current ? { ...current, isActive: value } : current,
                    )
                  }
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberClassModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveMemberClass}
              disabled={!memberClassDraft || upsertMemberClass.isPending}
            >
              {upsertMemberClass.isPending ? 'Guardando...' : 'Guardar clase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedLayout>
  );
}

function SidebarMenuConfig() {
  const [hiddenLinks, setHiddenLinks] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('pref:sidebarLinks');
      if (raw) return new Set(JSON.parse(raw).hidden ?? []);
    } catch {}
    return new Set();
  });

  function toggleLink(href: string) {
    const next = new Set(hiddenLinks);
    if (next.has(href)) next.delete(href); else next.add(href);
    setHiddenLinks(next);
    localStorage.setItem('pref:sidebarLinks', JSON.stringify({ hidden: Array.from(next) }));
  }

  function resetAll() {
    setHiddenLinks(new Set());
    localStorage.removeItem('pref:sidebarLinks');
  }

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle
          title="Menú lateral"
          description="Elige qué secciones mostrar en la barra de navegación. Los cambios se aplican inmediatamente."
        />
        <div className="flex justify-end mb-3">
          <Button variant="ghost" size="sm" onClick={resetAll}>Restablecer todo</Button>
        </div>
        <div className="space-y-4">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-muted">{section.label}</p>
              <div className="grid gap-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isHidden = hiddenLinks.has(item.href);
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => toggleLink(item.href)}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                        isHidden
                          ? 'border-border-light bg-bg-soft/50 opacity-50'
                          : 'border-brand-primary/20 bg-brand-lighter/20'
                      }`}
                    >
                      <Icon size={16} className={isHidden ? 'text-text-muted' : 'text-brand-primary'} />
                      <span className="flex-1 text-sm font-medium text-text-primary">{item.label}</span>
                      {isHidden ? (
                        <EyeOff size={14} className="text-text-muted" />
                      ) : (
                        <Eye size={14} className="text-brand-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SupportChatTab() {
  const [message, setMessage] = useState('');
  const supportChatQuery = useMySupportChat();
  const createSupportChat = useCreateSupportChat();
  const conversationId = supportChatQuery.data?.id ?? null;
  const messagesQuery = useChatMessages(conversationId);
  const sendMessage = useSendChatMessage(conversationId);
  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);

  async function handleStartChat() {
    await createSupportChat.mutateAsync();
    supportChatQuery.refetch();
  }

  async function handleSend() {
    const body = message.trim();
    if (!body || !conversationId) return;
    await sendMessage.mutateAsync({ body });
    setMessage('');
  }

  if (!conversationId) {
    return (
      <Card>
        <div className="space-y-4 p-6 text-center">
          <Headphones size={32} className="mx-auto text-text-muted" />
          <div>
            <h3 className="text-base font-semibold text-text-primary">Contactar con soporte</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Abre un chat directo con el equipo de soporte.
            </p>
          </div>
          <Button onClick={handleStartChat} disabled={createSupportChat.isPending}>
            {createSupportChat.isPending ? 'Abriendo...' : 'Iniciar chat de soporte'}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-col" style={{ height: '400px' }}>
        <div className="border-b border-border-light px-4 py-3">
          <h3 className="text-sm font-semibold text-text-primary">Chat de soporte</h3>
          <p className="text-xs text-text-muted">Escribe tu consulta y te responderemos pronto.</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {messages.length === 0 ? (
            <p className="text-center text-xs text-text-muted py-8">Sin mensajes aún. Escribe tu consulta.</p>
          ) : (
            [...messages].reverse().map((msg) => (
              <div
                key={msg.id}
                className={`rounded-xl px-3 py-2 text-sm max-w-[80%] ${
                  msg.type === 'SYSTEM'
                    ? 'mx-auto text-center text-xs text-text-muted bg-bg-soft'
                    : msg.sender?.id === supportChatQuery.data?.participants?.[0]?.userId
                      ? 'ml-auto bg-brand-primary text-white'
                      : 'bg-bg-soft text-text-primary'
                }`}
              >
                {msg.type !== 'SYSTEM' && msg.sender ? (
                  <p className="text-[10px] font-medium opacity-70 mb-0.5">{msg.sender.name}</p>
                ) : null}
                <p>{msg.body}</p>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-border-light p-3 flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-lg border border-border-light bg-white px-3 py-2 text-sm outline-none focus:border-brand-primary"
            placeholder="Escribe un mensaje..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button size="sm" disabled={!message.trim() || sendMessage.isPending} onClick={handleSend}>
            Enviar
          </Button>
        </div>
      </div>
    </Card>
  );
}
