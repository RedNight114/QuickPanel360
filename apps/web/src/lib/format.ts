export function formatCredits(value: unknown) {
  const amount = Number(value ?? 0);

  return `${new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)} CR`;
}

export function formatCurrency(value: unknown) {
  return formatCredits(value);
}

export function formatEuros(value: unknown) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(value: unknown) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(String(value)));
}
