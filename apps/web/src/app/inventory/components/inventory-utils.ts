import type { InventoryItem, InventoryMovement } from '@/lib/types';
import { formatWeightKg, isKgProduct } from '@/lib/weight';

export function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function quantityLabel(value: unknown, unitType?: string | null) {
  if (isKgProduct(unitType)) {
    return formatWeightKg(value);
  }

  return toNumber(value).toLocaleString('es-ES', {
    maximumFractionDigits: 3,
  });
}

export function getInventoryStatus(item: InventoryItem) {
  const current = toNumber(item.currentQuantity);
  const minimum = toNumber(item.minimumQuantity);

  if (current <= 0) return { label: 'Sin disponibilidad', tone: 'danger' as const };
  if (current <= minimum) return { label: 'Inventario bajo', tone: 'warning' as const };
  return { label: 'Correcto', tone: 'success' as const };
}

export function movementLabel(type: string) {
  const labels: Record<string, string> = {
    SALE: 'Dispensación',
    STOCK_IN: 'Entrada de stock',
    ADJUSTMENT: 'Ajuste manual',
    WASTE: 'Merma',
    LOSS: 'Merma',
    DAMAGED: 'Producto dañado',
    SAMPLE: 'Muestra',
    RETURN: 'Devolución',
    CORRECTION: 'Corrección',
  };

  return labels[type] ?? type;
}

export function movementTone(movement: InventoryMovement) {
  const quantity = toNumber(movement.quantity);

  if (movement.type === 'STOCK_IN' || quantity > 0) return 'success' as const;
  if (['SALE', 'LOSS', 'WASTE', 'DAMAGED', 'SAMPLE'].includes(movement.type) || quantity < 0) {
    return 'danger' as const;
  }
  return 'warning' as const;
}
