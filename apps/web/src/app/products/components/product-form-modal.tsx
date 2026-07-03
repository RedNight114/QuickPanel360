'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
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
import { formatCurrency } from '@/lib/format';
import { gramsToKg } from '@/lib/weight';
import type { Product } from '@/lib/types';

const unitTypes = ['KG', 'UNIT', 'ML', 'PACK', 'GRAM'] as const;

export type ProductForm = {
  name: string;
  description: string;
  sku: string;
  barcode: string;
  unitType: string;
  price: string;
  cost: string;
  // Para productos de peso: mínimo/ideal almacenados en GRAMOS (string)
  minimumStock: string;
  idealStock: string;
  allowDecimalQuantity: boolean;
  trackStock: boolean;
  imageUrl: string;
  categoryId: string;
};

export const emptyProductForm: ProductForm = {
  name: '',
  description: '',
  sku: '',
  barcode: '',
  unitType: 'KG',
  price: '0',
  cost: '',
  minimumStock: '5000',
  idealStock: '50000',
  allowDecimalQuantity: true,
  trackStock: true,
  imageUrl: '',
  categoryId: '',
};

// ─── SKU generation ───────────────────────────────────────────────────────────

function stripAccents(str: string) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function slugWords(str: string) {
  return stripAccents(str)
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function companyPrefix(tenantName: string) {
  const words = slugWords(tenantName);
  if (!words.length) return 'CC';
  // 1 word → first 3 chars; 2+ words → initials (max 4)
  if (words.length === 1) return words[0].slice(0, 3);
  return words
    .slice(0, 4)
    .map((w) => w[0])
    .join('');
}

function productCode(name: string) {
  const words = slugWords(name);
  if (!words.length) return 'PRD';
  // 1 word → first 4 chars; 2 words → first 2 chars each; 3+ → initials
  if (words.length === 1) return words[0].slice(0, 4);
  if (words.length === 2) return words.map((w) => w.slice(0, 3)).join('');
  return words
    .slice(0, 5)
    .map((w) => w[0])
    .join('');
}

export function suggestedSku(name: string, tenantName?: string) {
  if (!name.trim()) return '';
  const company = tenantName ? companyPrefix(tenantName) : 'CC';
  const product = productCode(name);
  // Format: CC-PROD-001
  return `${company}-${product}-001`;
}

// ─── Conversions ──────────────────────────────────────────────────────────────

export function productToForm(product: Product): ProductForm {
  const isWeight = product.unitType === 'KG' || product.unitType === 'GRAM';
  // minimumStock / idealStock stored in kg in DB → convert to grams for display
  const rawMin = product.minimumStock ?? product.inventory?.minimumQuantity;
  const rawIdeal = product.idealStock ?? product.inventory?.maximumQuantity;
  return {
    name: product.name,
    description: product.description ?? '',
    sku: product.sku ?? '',
    barcode: product.barcode ?? '',
    unitType: product.unitType ?? 'KG',
    price: String(product.price ?? 0),
    cost: product.cost == null ? '' : String(product.cost),
    minimumStock: isWeight && rawMin != null
      ? String(Math.round(Number(rawMin) * 1000))
      : String(rawMin ?? ''),
    idealStock: isWeight && rawIdeal != null
      ? String(Math.round(Number(rawIdeal) * 1000))
      : String(rawIdeal ?? ''),
    allowDecimalQuantity:
      product.allowDecimalQuantity ?? ['KG', 'GRAM'].includes(product.unitType ?? ''),
    trackStock: product.trackStock ?? true,
    imageUrl: product.imageUrl ?? '',
    categoryId: product.categoryId ?? '',
  };
}

export function productFormToPayload(form: ProductForm, includeCost: boolean) {
  const isWeight = form.unitType === 'KG' || form.unitType === 'GRAM';
  const payload: Record<string, string | number | boolean> = {
    name: form.name,
    unitType: form.unitType,
    price: Number(form.price),
    allowDecimalQuantity: form.allowDecimalQuantity,
    trackStock: form.trackStock,
  };

  if (form.description.trim()) payload.description = form.description;
  if (form.sku.trim()) payload.sku = form.sku;
  if (form.barcode.trim()) payload.barcode = form.barcode;
  if (form.imageUrl.trim()) payload.imageUrl = form.imageUrl;
  if (form.categoryId.trim()) payload.categoryId = form.categoryId;

  if (form.minimumStock.trim()) {
    const raw = Number(form.minimumStock);
    // Convert grams → kg for weight products before sending to API
    payload.minimumStock = isWeight ? gramsToKg(raw) : raw;
  }
  if (form.idealStock.trim()) {
    const raw = Number(form.idealStock);
    payload.idealStock = isWeight ? gramsToKg(raw) : raw;
  }
  if (includeCost && form.cost.trim()) payload.cost = Number(form.cost);

  return payload;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WEIGHT_UNIT_TYPES = new Set(['KG', 'GRAM']);

function isWeightUnit(unitType: string) {
  return WEIGHT_UNIT_TYPES.has(unitType);
}

// ─── Component ────────────────────────────────────────────────────────────────

type ProductFormModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  initialValue?: ProductForm;
  canViewCost: boolean;
  saving: boolean;
  error?: string | null;
  tenantName?: string;
  onClose: () => void;
  onSubmit: (form: ProductForm) => Promise<void>;
};

export function ProductFormModal({
  open,
  mode,
  initialValue,
  canViewCost,
  saving,
  error,
  tenantName,
  onClose,
  onSubmit,
}: ProductFormModalProps) {
  const [form, setForm] = useState<ProductForm>(initialValue ?? emptyProductForm);
  const [skuTouched, setSkuTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initialValue ?? emptyProductForm);
      setSkuTouched(Boolean(initialValue?.sku));
    }
  }, [initialValue, open]);

  const isWeight = isWeightUnit(form.unitType);
  const priceNum = Number(form.price || 0);
  const costNum = Number(form.cost || 0);
  const minGrams = Number(form.minimumStock || 0);
  const idealGrams = Number(form.idealStock || 0);

  const margin = useMemo(() => {
    if (!priceNum || !costNum) return null;
    return {
      value: priceNum - costNum,
      percent: ((priceNum - costNum) / priceNum) * 100,
    };
  }, [costNum, priceNum]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(form);
  }

  function update<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };

      if (key === 'name' && !skuTouched && typeof value === 'string') {
        next.sku = suggestedSku(value, tenantName);
      }

      if (key === 'unitType') {
        const strVal = value as string;
        if (isWeightUnit(strVal)) {
          next.allowDecimalQuantity = true;
          // defaults in grams
          if (!current.minimumStock || current.minimumStock === '1') next.minimumStock = '5000';
          if (!current.idealStock || current.idealStock === '10') next.idealStock = '50000';
        } else {
          next.allowDecimalQuantity = strVal === 'ML';
          if (!current.minimumStock || current.minimumStock === '5000') next.minimumStock = '1';
          if (!current.idealStock || current.idealStock === '50000') next.idealStock = '10';
        }
      }

      return next;
    });
  }

  function setGranelMode(granel: boolean) {
    update('unitType', granel ? 'KG' : 'UNIT');
  }

  const skuPreview = form.sku || suggestedSku(form.name, tenantName);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nuevo producto' : 'Editar producto'}</DialogTitle>
          <DialogDescription>
            Configura catálogo, valor y reglas de inventario del producto.
          </DialogDescription>
        </DialogHeader>

        <form id="product-form" onSubmit={submit} className="space-y-5">
          {/* ── 1. Tipo de producto ── */}
          <section className="rounded-xl border border-border-light bg-white p-4 shadow-card">
            <h3 className="mb-3 text-sm font-semibold text-text-primary">Tipo de producto</h3>
            <div className="flex rounded-lg border border-border-light bg-white p-1">
              <button
                type="button"
                className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                  isWeight
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                onClick={() => setGranelMode(true)}
              >
                Granel / peso
              </button>
              <button
                type="button"
                className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                  !isWeight
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                onClick={() => setGranelMode(false)}
              >
                Por unidad
              </button>
            </div>

            {!isWeight || form.unitType === 'GRAM' ? (
              <label className="mt-3 block">
                <span className="text-sm font-medium text-text-primary">Tipo exacto</span>
                <select
                  className="mt-1.5 h-11 w-full rounded-lg border border-border-light bg-white px-3 text-text-primary outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  value={form.unitType}
                  onChange={(event) => update('unitType', event.target.value)}
                >
                  {unitTypes.map((ut) => (
                    <option key={ut} value={ut}>
                      {ut === 'KG'
                        ? 'KG · estándar peso'
                        : ut === 'GRAM'
                          ? 'GRAM · legacy'
                          : ut === 'ML'
                            ? 'ML · líquido'
                            : ut}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {isWeight ? (
              <p className="mt-2 rounded-lg border border-green-100 bg-amber-50 px-3 py-2 text-xs text-[#15140F]">
                Inventario en kg. Valor y coste por gramo. Dispensación por gramos o por importe en el Punto de dispensación.
              </p>
            ) : (
              <p className="mt-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-700">
                Inventario y dispensación por unidades enteras.
              </p>
            )}
          </section>

          {/* ── 2. Datos básicos ── */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-text-primary">Datos básicos</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Nombre"
                value={form.name}
                onChange={(event) => update('name', event.target.value)}
                required
              />
              <div>
                <Field
                  label="SKU"
                  value={form.sku}
                  onChange={(event) => {
                    setSkuTouched(true);
                    update('sku', event.target.value);
                  }}
                  placeholder={skuPreview}
                />
                {!skuTouched && skuPreview ? (
                  <p className="mt-1 text-xs text-text-muted">
                    Se usará: <span className="font-mono font-medium text-brand-primary">{skuPreview}</span>
                    {' · '}
                    <button
                      type="button"
                      className="underline hover:text-text-primary"
                      onClick={() => {
                        setSkuTouched(true);
                        update('sku', skuPreview);
                      }}
                    >
                      Confirmar
                    </button>
                  </p>
                ) : null}
              </div>
              <Field
                label="Código de barras"
                value={form.barcode}
                onChange={(event) => update('barcode', event.target.value)}
              />
            </div>
          </section>

          {/* ── 3. Valor y coste ── */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-text-primary">Valor y coste interno</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Field
                  label={isWeight ? 'Valor por gramo (CR/g)' : 'Valor (CR)'}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => update('price', event.target.value)}
                  required
                />
                {isWeight && priceNum > 0 ? (
                  <p className="mt-1 text-xs text-brand-primary font-medium">
                    = {formatCurrency(priceNum * 1000)} CR/kg
                  </p>
                ) : null}
              </div>
              {canViewCost ? (
                <div>
                  <Field
                    label={isWeight ? 'Coste interno por gramo (CR/g)' : 'Coste interno (CR)'}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost}
                    onChange={(event) => update('cost', event.target.value)}
                  />
                  {isWeight && costNum > 0 ? (
                    <p className="mt-1 text-xs text-text-muted">
                      = {formatCurrency(costNum * 1000)} CR/kg
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            {canViewCost ? (
              <div className="mt-2 rounded-lg border border-border-light bg-bg-soft px-3 py-2 text-sm text-text-secondary">
                {margin
                  ? `Margen estimado: ${formatCurrency(margin.value)} (${margin.percent.toFixed(1)}%)`
                  : 'Introduce valor y coste para ver el margen.'}
              </div>
            ) : null}
          </section>

          {/* ── 4. Reglas de inventario ── */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-text-primary">Reglas de inventario</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Field
                  label={isWeight ? 'Inventario mínimo (g)' : 'Inventario mínimo'}
                  type="number"
                  min="0"
                  step={isWeight ? '1' : '0.001'}
                  value={form.minimumStock}
                  onChange={(event) => update('minimumStock', event.target.value)}
                />
                {isWeight && minGrams >= 1000 ? (
                  <p className="mt-1 text-xs text-text-muted">
                    = {(minGrams / 1000).toLocaleString('es-ES', { maximumFractionDigits: 3 })} kg
                  </p>
                ) : null}
              </div>
              <div>
                <Field
                  label={isWeight ? 'Inventario ideal (g)' : 'Inventario ideal'}
                  type="number"
                  min="0"
                  step={isWeight ? '1' : '0.001'}
                  value={form.idealStock}
                  onChange={(event) => update('idealStock', event.target.value)}
                />
                {isWeight && idealGrams >= 1000 ? (
                  <p className="mt-1 text-xs text-text-muted">
                    = {(idealGrams / 1000).toLocaleString('es-ES', { maximumFractionDigits: 3 })} kg
                  </p>
                ) : null}
              </div>
              <label className="flex items-center gap-2 rounded-lg border border-border-light bg-white px-3 py-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={form.allowDecimalQuantity}
                  onChange={(event) => update('allowDecimalQuantity', event.target.checked)}
                  className="accent-brand-primary"
                />
                Permitir cantidades decimales
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-border-light bg-white px-3 py-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={form.trackStock}
                  onChange={(event) => update('trackStock', event.target.checked)}
                  className="accent-brand-primary"
                />
                Controlar inventario
              </label>
            </div>
          </section>

          {/* ── 5. Imagen y descripción ── */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-text-primary">Imagen y descripción</h3>
            <div className="grid gap-3">
              <Field
                label="Imagen URL"
                value={form.imageUrl}
                onChange={(event) => update('imageUrl', event.target.value)}
              />
              <Field
                label="Descripción"
                value={form.description}
                onChange={(event) => update('description', event.target.value)}
              />
            </div>
          </section>
        </form>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="product-form" disabled={saving}>
            {saving ? 'Guardando...' : mode === 'create' ? 'Crear producto' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
