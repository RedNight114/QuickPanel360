'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { readStoredAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { detectSpanishDocumentType, getMemberClassLabel } from '@/lib/members';
import type { Member, MemberClassConfig } from '@/lib/types';

export type MemberForm = {
  memberNumber: string;
  firstName: string;
  lastName: string;
  displayName: string;
  documentType: string;
  documentNumber: string;
  birthDate: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  notes: string;
  internalNotes: string;
  photoUrl: string;
  memberClass: 'STANDARD' | 'PREFERRED' | 'VIP';
  preferredContactMethod: string;
  marketingConsent: boolean;
};

export const emptyMemberForm: MemberForm = {
  memberNumber: '',
  firstName: '',
  lastName: '',
  displayName: '',
  documentType: '',
  documentNumber: '',
  birthDate: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  postalCode: '',
  notes: '',
  internalNotes: '',
  photoUrl: '',
  memberClass: 'STANDARD',
  preferredContactMethod: '',
  marketingConsent: false,
};

export function memberToForm(member: Member): MemberForm {
  return {
    memberNumber: member.memberNumber ?? '',
    firstName: member.firstName ?? '',
    lastName: member.lastName ?? '',
    displayName: member.displayName ?? '',
    documentType: member.documentType ?? '',
    documentNumber: member.documentNumber ?? '',
    birthDate: member.birthDate ? member.birthDate.slice(0, 10) : '',
    phone: member.phone ?? '',
    email: member.email ?? '',
    address: member.address ?? '',
    city: member.city ?? '',
    postalCode: member.postalCode ?? '',
    notes: member.profileNotes ?? member.notes ?? '',
    internalNotes: member.internalNotes ?? '',
    photoUrl: member.photoUrl ?? '',
    memberClass: member.memberClass ?? 'STANDARD',
    preferredContactMethod: member.preferredContactMethod ?? '',
    marketingConsent: Boolean(member.marketingConsent),
  };
}

type MemberFormModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  memberId?: string;
  initialValue?: MemberForm;
  saving: boolean;
  error?: string | null;
  autoGenerateMemberNumber?: boolean;
  minimumMemberAge?: number | null;
  memberNumberPrefix?: string | null;
  memberClassConfigs?: MemberClassConfig[];
  onClose: () => void;
  onSubmit: (form: MemberForm) => Promise<void>;
};

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function MemberFormModal({
  open,
  mode,
  memberId,
  initialValue,
  saving,
  error,
  autoGenerateMemberNumber = false,
  minimumMemberAge,
  memberNumberPrefix,
  memberClassConfigs,
  onClose,
  onSubmit,
}: MemberFormModalProps) {
  const [form, setForm] = useState<MemberForm>(initialValue ?? emptyMemberForm);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm(initialValue ?? emptyMemberForm);
      setUploadError(null);
    }
  }, [initialValue, open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(form);
  }

  function update<K extends keyof MemberForm>(key: K, value: MemberForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateDocument(value: string) {
    const detected = detectSpanishDocumentType(value);
    setForm((current) => ({
      ...current,
      documentNumber: value,
      documentType: detected && detected !== 'OTHER' ? detected : current.documentType,
    }));
  }

  async function handlePhotoFile(file: File) {
    if (!memberId) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setUploadError('Solo se aceptan imágenes JPEG, PNG o WebP.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const auth = readStoredAuth();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${apiUrl}/members/${memberId}/photo/upload`, {
        method: 'POST',
        headers: auth?.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        let msg = 'Error al subir la foto.';
        try {
          const payload = JSON.parse(text) as { message?: string | string[] };
          msg = Array.isArray(payload?.message)
            ? payload.message.join(', ')
            : (payload?.message ?? msg);
        } catch {}
        throw new Error(msg);
      }

      const updated = (await response.json()) as Member;
      update('photoUrl', updated.photoUrl ?? '');
      toast.success('La foto se actualizó correctamente.');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al subir la foto.');
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    void handlePhotoFile(file);
  }

  async function handleRemovePhoto() {
    if (!memberId) return;
    setUploading(true);
    setUploadError(null);
    try {
      await apiFetch(`/members/${memberId}/photo`, { method: 'DELETE' });
      update('photoUrl', '');
      toast.success('Foto eliminada.');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al eliminar la foto.');
    } finally {
      setUploading(false);
    }
  }

  const documentDetection = detectSpanishDocumentType(form.documentNumber);
  const avatarInitials = (form.firstName || form.displayName || '?').slice(0, 1).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nuevo socio' : 'Editar socio'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Registra los datos principales del socio.'
              : 'Actualiza la ficha del socio.'}
          </DialogDescription>
        </DialogHeader>

        <form id="member-form" onSubmit={submit} className="space-y-4">
          {/* Foto */}
          <section className="rounded-xl border border-border-light bg-white p-3">
            <p className="mb-3 text-sm font-semibold text-text-primary">Foto del socio</p>
            <div className="flex items-start gap-4">
              <div
                className="grid h-20 w-20 flex-shrink-0 place-items-center overflow-hidden rounded-full bg-brand-lighter bg-cover bg-center text-2xl font-bold text-brand-primary"
                style={form.photoUrl ? { backgroundImage: `url(${form.photoUrl})` } : undefined}
              >
                {form.photoUrl ? null : avatarInitials}
              </div>

              <div className="flex-1 space-y-2">
                {mode === 'create' ? (
                  <p className="rounded-lg border border-border-light bg-bg-soft p-2 text-xs text-text-muted">
                    Guarda el socio antes de subir una foto.
                  </p>
                ) : memberId ? (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploading ? 'Subiendo...' : form.photoUrl ? 'Cambiar foto' : 'Subir foto'}
                      </Button>
                      {form.photoUrl ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={uploading}
                          onClick={() => void handleRemovePhoto()}
                        >
                          Quitar foto
                        </Button>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-text-muted">JPEG, PNG o WebP · máx. 5 MB</p>
                    {uploadError ? (
                      <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                        {uploadError}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          </section>

          {/* Datos básicos */}
          <section className="grid gap-3 rounded-xl border border-border-light bg-bg-soft p-3 sm:grid-cols-2">
            <p className="text-sm font-semibold text-text-primary sm:col-span-2">Datos básicos</p>
            <Field
              label="Número de socio"
              value={form.memberNumber}
              onChange={(event) => update('memberNumber', event.target.value)}
              disabled={mode === 'create' && autoGenerateMemberNumber}
              placeholder={autoGenerateMemberNumber ? `${memberNumberPrefix || 'SOC-'}0001` : undefined}
            />
            <Field
              label="Alias / nombre visible"
              value={form.displayName}
              onChange={(event) => update('displayName', event.target.value)}
            />
            <Field
              label="Nombre"
              value={form.firstName}
              onChange={(event) => update('firstName', event.target.value)}
            />
            <Field
              label="Apellidos"
              value={form.lastName}
              onChange={(event) => update('lastName', event.target.value)}
            />
            <Field
              label="Teléfono"
              value={form.phone}
              onChange={(event) => update('phone', event.target.value)}
            />
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
            />
            <Field
              label="Fecha nacimiento"
              type="date"
              value={form.birthDate}
              onChange={(event) => update('birthDate', event.target.value)}
            />
          </section>

          {/* Documento con autodetección */}
          <section className="grid gap-3 rounded-xl border border-border-light bg-white p-3 sm:grid-cols-2">
            <p className="text-sm font-semibold text-text-primary sm:col-span-2">Documento</p>

            <div className="grid gap-1">
              <Field
                label="Número de documento"
                value={form.documentNumber}
                onChange={(event) => updateDocument(event.target.value)}
                placeholder="12345678Z ó X1234567L"
              />
              {documentDetection === 'NIF' ? (
                <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-[#15140F]">
                  ✓ NIF detectado
                </span>
              ) : documentDetection === 'NIE' ? (
                <span className="inline-flex w-fit items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                  ✓ NIE detectado
                </span>
              ) : null}
            </div>

            <label className="grid gap-1 text-sm font-medium text-text-primary">
              Tipo de documento
              <select
                className="h-11 rounded-lg border border-border-light bg-white px-3 text-sm text-text-primary outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                value={form.documentType}
                onChange={(event) => update('documentType', event.target.value)}
              >
                <option value="">Sin especificar</option>
                <option value="NIF">NIF</option>
                <option value="NIE">NIE</option>
                <option value="Pasaporte">Pasaporte</option>
                <option value="Otro">Otro</option>
              </select>
            </label>

            {documentDetection === 'OTHER' && form.documentNumber ? (
              <p className="rounded-lg border border-amber-100 bg-amber-50 p-2 text-xs text-amber-700 sm:col-span-2">
                El formato del documento no parece válido, pero puedes guardar igualmente.
              </p>
            ) : null}
          </section>

          {/* Dirección */}
          <section className="grid gap-3 rounded-xl border border-border-light bg-white p-3 sm:grid-cols-2">
            <p className="text-sm font-semibold text-text-primary sm:col-span-2">Dirección</p>
            <Field
              className="sm:col-span-2"
              label="Dirección"
              value={form.address}
              onChange={(event) => update('address', event.target.value)}
            />
            <Field
              label="Ciudad"
              value={form.city}
              onChange={(event) => update('city', event.target.value)}
            />
            <Field
              label="Código postal"
              value={form.postalCode}
              onChange={(event) => update('postalCode', event.target.value)}
            />
          </section>

          {/* Clase y trato */}
          <section className="grid gap-3 rounded-xl border border-border-light bg-white p-3 sm:grid-cols-2">
            <p className="text-sm font-semibold text-text-primary sm:col-span-2">Clase y trato</p>
            <div className="grid gap-1">
              <label className="text-sm font-medium text-text-primary">Clase de socio</label>
              <select
                className="h-11 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                value={form.memberClass}
                onChange={(event) => update('memberClass', event.target.value as MemberForm['memberClass'])}
              >
                {(['STANDARD', 'PREFERRED', 'VIP'] as const).map((value) => {
                  const cfg = memberClassConfigs?.find((c) => c.memberClass === value);
                  return (
                    <option key={value} value={value}>
                      {cfg ? cfg.label : getMemberClassLabel(value)}
                    </option>
                  );
                })}
              </select>
              {(() => {
                const cfg = memberClassConfigs?.find((c) => c.memberClass === form.memberClass);
                if (!cfg) return null;
                return (
                  <div className="rounded-lg border border-green-100 bg-amber-50 px-3 py-2 text-xs text-green-900">
                    {cfg.suggestedBonification > 0 ? <span>Bonificación sugerida: <strong>{cfg.suggestedBonification} CR</strong></span> : null}
                    {cfg.birthdayBonification > 0 ? <span className="ml-3">Cumpleaños: <strong>{cfg.birthdayBonification} CR</strong></span> : null}
                    {cfg.description ? <p className="mt-0.5 text-text-muted">{cfg.description}</p> : null}
                  </div>
                );
              })()}
            </div>
            <Field
              label="Contacto preferido"
              value={form.preferredContactMethod}
              onChange={(event) => update('preferredContactMethod', event.target.value)}
              placeholder="Teléfono, email, WhatsApp..."
            />
            <label className="flex items-center gap-2 rounded-lg border border-border-light bg-bg-soft px-3 py-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={form.marketingConsent}
                onChange={(event) => update('marketingConsent', event.target.checked)}
              />
              Consentimiento de comunicaciones
            </label>
            <Field
              className="sm:col-span-2"
              label="Notas internas"
              value={form.internalNotes}
              onChange={(event) => update('internalNotes', event.target.value)}
            />
            <Field
              className="sm:col-span-2"
              label="Notas generales"
              value={form.notes}
              onChange={(event) => update('notes', event.target.value)}
            />
          </section>
        </form>

        {mode === 'create' && autoGenerateMemberNumber ? (
          <p className="rounded-lg border border-green-100 bg-amber-50 p-3 text-sm text-green-900">
            El número de socio se generará automáticamente al guardar.
          </p>
        ) : null}

        {mode === 'create' && minimumMemberAge ? (
          <p className="rounded-lg border border-border-light bg-bg-soft p-3 text-sm text-text-muted">
            Edad mínima configurada: {minimumMemberAge} años. La fecha de nacimiento será obligatoria.
          </p>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="member-form" disabled={saving || uploading}>
            {saving ? 'Guardando...' : mode === 'create' ? 'Crear socio' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
