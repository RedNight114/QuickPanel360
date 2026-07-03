import { formatCurrency } from './format';

export type WeightPricingMode = 'BY_UNIT' | 'BY_WEIGHT' | 'BY_AMOUNT';

export type AddCartInput =
  | number
  | {
      pricingMode?: WeightPricingMode;
      quantityKg?: number;
      quantityGrams?: number;
      amountEuros?: number;
      quantityUnits?: number;
    };

export function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isKgProduct(unitType?: string | null) {
  return unitType === 'KG';
}

export function gramsToKg(grams: number) {
  return roundKg(grams / 1000);
}

export function kgToGrams(kg: number) {
  return Math.round(kg * 1000 * 1000) / 1000;
}

export function roundKg(value: number) {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function amountToKg(amount: number, pricePerGram: number) {
  if (pricePerGram <= 0) return 0;
  return roundKg(amount / pricePerGram / 1000);
}

export function kgToAmount(kg: number, pricePerGram: number) {
  return roundMoney(kg * 1000 * pricePerGram);
}

export function formatWeightKg(kg: unknown) {
  const grams = kgToGrams(toNumber(kg));
  return `${grams.toLocaleString('es-ES', { maximumFractionDigits: 3 })} g`;
}

export function formatPricePerGram(price: unknown) {
  return `${formatCurrency(toNumber(price))}/g`;
}
