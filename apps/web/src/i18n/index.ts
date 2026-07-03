import { es } from './es';
import { en } from './en';
import { nl } from './nl';

export type Locale = 'es' | 'en' | 'nl';
export type Messages = typeof es;

const messages: Record<Locale, Messages> = { es, en, nl };

export const locales: Locale[] = ['es', 'en', 'nl'];
export const localeLabels: Record<Locale, string> = { es: 'Español', en: 'English', nl: 'Nederlands' };

export function getMessages(locale: Locale): Messages {
  return messages[locale] ?? messages.es;
}

export function isValidLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
