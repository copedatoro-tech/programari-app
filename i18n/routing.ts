import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ro', 'en', 'fr', 'de', 'es', 'it', 'hu', 'pt', 'pl'],
  defaultLocale: 'ro',
  localePrefix: 'as-needed'
});

export type Locale = (typeof routing.locales)[number];