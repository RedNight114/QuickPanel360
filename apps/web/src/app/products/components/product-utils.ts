import type { Product } from '@/lib/types';

export function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getProductStock(product: Product) {
  return toNumber(product.inventory?.currentQuantity);
}

export function getProductMinimum(product: Product) {
  return toNumber(product.inventory?.minimumQuantity);
}

export function getStockStatus(product: Product) {
  const stock = getProductStock(product);
  const minimum = getProductMinimum(product);

  if (stock <= 0) {
    return { label: 'Sin disponibilidad', tone: 'danger' as const };
  }

  if (stock <= minimum) {
    return { label: 'Inventario bajo', tone: 'warning' as const };
  }

  return { label: 'Disponible', tone: 'success' as const };
}

export function isArchived(product: Product) {
  return product.status === 'ARCHIVED';
}
