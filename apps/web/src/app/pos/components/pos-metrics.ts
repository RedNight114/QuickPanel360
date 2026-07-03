import type { PosSession, Product } from '@/lib/types';

export function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function getProductStock(product: Product) {
  return toNumber(product.inventory?.currentQuantity);
}

export function isLowStock(product: Product) {
  const stock = getProductStock(product);
  const minimum = toNumber(product.inventory?.minimumQuantity);

  return stock > 0 && stock <= minimum;
}

export function getSessionMetrics(session: PosSession | null) {
  const sales = session?.sales?.filter((sale) => sale.status !== 'CANCELLED') ?? [];
  const openingCash = toNumber(session?.cashSummary?.openingCash ?? session?.openingCash);
  const totalSold = roundMoney(
    toNumber(session?.cashSummary?.salesTotal) ||
      sales.reduce((sum, sale) => sum + toNumber(sale.total), 0),
  );
  const salesCount = session?.cashSummary?.operationsCount ?? sales.length;
  const averageTicket = salesCount ? roundMoney(totalSold / salesCount) : 0;
  const hasCashMovements = Array.isArray(session?.cashMovements);
  const hasPaymentDetails = hasCashMovements || sales.some((sale) => Array.isArray(sale.payments));
  const cashSales = session?.cashSummary
    ? roundMoney(toNumber(session.cashSummary.salesCashIn) + toNumber(session.cashSummary.receivableCashIn) - toNumber(session.cashSummary.cashOut))
    : hasCashMovements
    ? roundMoney(
        session?.cashMovements?.reduce((sum, movement) => {
          const amount = toNumber(movement.amount);

          if (movement.type === 'CASH_OUT' || movement.type === 'EXPENSE') {
            return sum - amount;
          }

          return sum + amount;
        }, 0) ?? 0,
      )
    : sales.some((sale) => Array.isArray(sale.payments))
      ? roundMoney(
          sales.reduce(
            (sum, sale) =>
              sum +
              (sale.payments?.reduce(
                (paymentSum, payment) =>
                  payment.method === 'CASH'
                    ? paymentSum + toNumber(payment.amount)
                    : paymentSum,
                0,
              ) ?? 0),
            0,
          ),
        )
      : totalSold;
  const expectedCash = session?.cashSummary
    ? roundMoney(toNumber(session.cashSummary.expectedCash))
    : roundMoney(openingCash + cashSales);

  return {
    openingCash,
    cashSales,
    expectedCash,
    totalSold,
    salesCount,
    averageTicket,
    hasPaymentDetails,
  };
}
