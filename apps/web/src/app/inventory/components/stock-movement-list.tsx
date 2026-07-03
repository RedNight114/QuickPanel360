'use client';

import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, formatCurrency } from '@/lib/format';
import type { InventoryMovement } from '@/lib/types';
import { movementLabel, movementTone, quantityLabel } from './inventory-utils';

export function StockMovementList({
  movements,
  title = 'Ultimos movimientos',
}: {
  movements: InventoryMovement[];
  title?: string;
}) {
  return (
    <section className="rounded-xl border border-border-light bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold text-text-primary">{title}</h2>
      <div className="mt-4 space-y-2">
        {movements.length ? (
          movements.slice(0, 25).map((movement) => {
            const tone = movementTone(movement);
            const unitType = movement.product?.unitType;
            const signedQuantity =
              tone === 'success'
                ? `+${quantityLabel(movement.quantity, unitType)}`
                : tone === 'danger'
                  ? `-${quantityLabel(Math.abs(Number(movement.quantity ?? 0)), unitType)}`
                  : quantityLabel(movement.quantity, unitType);

            return (
              <div
                key={movement.id}
                className="grid gap-3 rounded-lg border border-border-light bg-bg-soft p-3 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={tone}>{movementLabel(movement.type)}</Badge>
                    <p className="truncate text-sm font-semibold text-text-primary">
                      {movement.product?.name ?? movement.productId}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">
                    {movement.previousQuantity != null && movement.newQuantity != null
                      ? `${quantityLabel(movement.previousQuantity, unitType)} -> ${quantityLabel(movement.newQuantity, unitType)} · `
                      : ''}
                    {movement.reason ?? 'Sin motivo'} · {formatDate(movement.createdAt)}
                  </p>
                  {movement.notes || movement.batchCode || movement.totalCost ? (
                    <p className="mt-1 text-xs text-text-muted">
                      {movement.notes ? `Notas: ${movement.notes}` : null}
                      {movement.notes && movement.batchCode ? ' · ' : null}
                      {movement.batchCode ? `Lote: ${movement.batchCode}` : null}
                      {(movement.notes || movement.batchCode) && movement.totalCost ? ' · ' : null}
                      {movement.totalCost ? `Coste interno total: ${formatCurrency(movement.totalCost)}` : null}
                    </p>
                  ) : null}
                  {movement.createdBy?.name ? (
                    <p className="mt-1 text-xs text-text-muted">Usuario: {movement.createdBy.name}</p>
                  ) : null}
                </div>
                <p
                  className={`text-lg font-bold ${
                    tone === 'success'
                      ? 'text-[#15140F]'
                      : tone === 'danger'
                        ? 'text-red-700'
                        : 'text-amber-700'
                  }`}
                >
                  {signedQuantity}
                </p>
              </div>
            );
          })
        ) : (
          <EmptyState title="No se encontraron movimientos." />
        )}
      </div>
    </section>
  );
}
