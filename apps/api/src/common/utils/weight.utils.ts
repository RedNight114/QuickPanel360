import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const KG_PRECISION = 1_000_000;

export function gramsToKg(grams: number) {
  return toDecimal(grams).div(1000).toDecimalPlaces(6).toNumber();
}

export function kgToGrams(kg: number) {
  return toDecimal(kg).times(1000).toDecimalPlaces(3).toNumber();
}

export function eurosToKg(amount: number, pricePerGram: number) {
  if (pricePerGram <= 0) {
    throw new BadRequestException(
      'El precio por gramo debe ser mayor que cero.',
    );
  }

  return toDecimal(amount)
    .div(pricePerGram)
    .div(1000)
    .toDecimalPlaces(6)
    .toNumber();
}

export function kgToEuros(kg: number, pricePerGram: number) {
  return toDecimal(kg)
    .times(1000)
    .times(pricePerGram)
    .toDecimalPlaces(2)
    .toNumber();
}

export function roundKg(value: number) {
  return roundQuantity(value, 6);
}

export function roundQuantity(value: number, precision = 6) {
  return toDecimal(value).toDecimalPlaces(precision).toNumber();
}

export function roundMoney(value: number) {
  return toDecimal(value).toDecimalPlaces(2).toNumber();
}

export function assertPositiveQuantity(value: number, label = 'cantidad') {
  if (!Number.isFinite(value) || value <= 0) {
    throw new BadRequestException(`Introduce una ${label} válida.`);
  }
}

export function clampKg(value: number) {
  return Math.max(
    0,
    toDecimal(value).times(KG_PRECISION).round().div(KG_PRECISION).toNumber(),
  );
}

function toDecimal(value: number) {
  return new Prisma.Decimal(Number.isFinite(value) ? value : 0);
}
