export type CurrencyCode = "RON" | "EUR" | "USD" | "GBP" | "HUF" | "PLN";

export const CURRENCY_INFO: Record<CurrencyCode, { symbol: string; label: string; decimals: number }> = {
  RON: { symbol: "RON", label: "Leu românesc", decimals: 0 },
  EUR: { symbol: "€", label: "Euro", decimals: 2 },
  USD: { symbol: "$", label: "Dolar american", decimals: 2 },
  GBP: { symbol: "£", label: "Liră sterlină", decimals: 2 },
  HUF: { symbol: "Ft", label: "Forint maghiar", decimals: 0 },
  PLN: { symbol: "zł", label: "Zlot polonez", decimals: 2 },
};

// Default-ul de valută la prima vizită, în funcție de limba UI selectată.
export const LOCALE_CURRENCY_MAP: Record<string, CurrencyCode> = {
  ro: "RON",
  en: "USD",
  fr: "EUR",
  de: "EUR",
  es: "EUR",
  it: "EUR",
  hu: "HUF",
  pt: "EUR",
  pl: "PLN",
};

// Curs de rezervă — folosit doar dacă API-ul extern de curs valutar nu răspunde.
// Actualizează manual din când în când (1 RON = X din valuta respectivă).
export const FALLBACK_RATES: Record<CurrencyCode, number> = {
  RON: 1,
  EUR: 0.2,
  USD: 0.215,
  GBP: 0.17,
  HUF: 82,
  PLN: 0.86,
};

export function convertFromRON(
  amountInRON: number,
  rates: Record<CurrencyCode, number>,
  currency: CurrencyCode
): number {
  const rate = rates[currency] ?? FALLBACK_RATES[currency];
  return amountInRON * rate;
}

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const info = CURRENCY_INFO[currency];
  const rounded = info.decimals === 0 ? Math.round(amount) : Math.round(amount * 100) / 100;
  const formattedNumber = rounded.toLocaleString("ro-RO", {
    minimumFractionDigits: info.decimals,
    maximumFractionDigits: info.decimals,
  });
  if (currency === "USD" || currency === "GBP") return `${info.symbol}${formattedNumber}`;
  return `${formattedNumber} ${info.symbol}`;
}