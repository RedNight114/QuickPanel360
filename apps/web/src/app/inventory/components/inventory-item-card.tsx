'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { InventoryItem, InventoryMovement } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { getInventoryStatus, quantityLabel, toNumber } from './inventory-utils';

export function InventoryItemCard({
  item,
  lastMovement,
  canAdd,
  canAdjust,
  canReadMovements,
  onAdd,
  onAdjust,
  onWaste,
  onViewMovements,
}: {
  item: InventoryItem;
  lastMovement?: InventoryMovement;
  canAdd: boolean;
  canAdjust: boolean;
  canReadMovements: boolean;
  onAdd: (item: InventoryItem) => void;
  onAdjust: (item: InventoryItem) => void;
  onWaste: (item: InventoryItem) => void;
  onViewMovements: (item: InventoryItem) => void;
}) {
  const status = getInventoryStatus(item);
  const unitType = item.product?.unitType;
  const hasWaste = toNumber(item.lostQuantity) > 0;

  return (
    <Card className="border border-border-light bg-white p-4 shadow-sm transition hover:border-brand-primary/40 hover:shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-text-primary">
            {item.product?.name ?? item.productId}
          </h3>
          <p className="mt-1 text-xs text-text-muted">
            {item.product?.sku ?? 'Sin SKU'} · {item.product?.unitType ?? 'UNIT'}
          </p>
        </div>
        <Badge variant={status.tone}>{status.label}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg border border-border-light bg-bg-soft p-2">
          <p className="text-xs text-text-muted">Inventario disponible</p>
          <p className="text-lg font-bold text-text-primary">
            {quantityLabel(item.currentQuantity, unitType)}
          </p>
        </div>
        <div className="rounded-lg border border-border-light bg-bg-soft p-2">
          <p className="text-xs text-text-muted">Inventario minimo</p>
          <p className="text-lg font-bold text-text-primary">
            {quantityLabel(item.minimumQuantity, unitType)}
          </p>
        </div>
        <div className="rounded-lg border border-border-light bg-bg-soft p-2">
          <p className="text-xs text-text-muted">Inventario ideal</p>
          <p className="text-lg font-bold text-text-primary">
            {quantityLabel(item.maximumQuantity ?? item.product?.idealStock, unitType)}
          </p>
        </div>
        <div className={`rounded-lg border p-2 ${hasWaste ? 'border-amber-200 bg-amber-50' : 'border-border-light bg-bg-soft'}`}>
          <p className={`text-xs ${hasWaste ? 'font-medium text-amber-700' : 'text-text-muted'}`}>
            Merma acumulada
          </p>
          <p className={`text-lg font-bold ${hasWaste ? 'text-amber-700' : 'text-text-muted'}`}>
            {quantityLabel(item.lostQuantity, unitType)}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs text-text-muted">
        Ultimo movimiento:{' '}
        {lastMovement ? formatDate(lastMovement.createdAt) : 'Sin movimientos recientes'}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {canAdd ? (
          <Button size="sm" onClick={() => onAdd(item)}>Anadir inventario</Button>
        ) : null}
        {canAdjust ? (
          <Button size="sm" variant="secondary" onClick={() => onAdjust(item)}>Ajustar</Button>
        ) : null}
        {canAdjust ? (
          <Button size="sm" variant="danger" onClick={() => onWaste(item)}>Merma</Button>
        ) : null}
        {canReadMovements ? (
          <Button size="sm" variant="outline" onClick={() => onViewMovements(item)}>Ver movimientos</Button>
        ) : null}
      </div>
    </Card>
  );
}
