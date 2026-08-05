"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useLocale } from "next-intl";
import { createBrowserClient } from "@supabase/ssr";
import {
  type CurrencyCode,
  LOCALE_CURRENCY_MAP,
  FALLBACK_RATES,
  convertFromRON,
  formatCurrency,
} from "@/lib/currency";

type CurrencyContextValue = {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  convert: (amountInRON: number) => number;
  format: (amountInRON: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);
const COOKIE_NAME = "chronos_currency";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}`;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const [currency, setCurrencyState] = useState<CurrencyCode>(
    () => LOCALE_CURRENCY_MAP[locale] ?? "RON"
  );
  const [rates, setRates] = useState<Record<CurrencyCode, number>>(FALLBACK_RATES);
  const [manuallySelected, setManuallySelected] = useState(false);

  // La montare: dacă userul are deja o valută salvată (cookie de la o vizită
  // anterioară), o folosim pe aceea în loc de default-ul legat de limbă.
  useEffect(() => {
    const saved = readCookie(COOKIE_NAME);
    if (saved && saved in FALLBACK_RATES) {
      setCurrencyState(saved as CurrencyCode);
      setManuallySelected(true);
    }
  }, []);

  // Dacă userul NU a ales manual o valută, schimbarea limbii îi actualizează
  // automat și valuta implicită (ex: trece pe engleză → trece pe USD).
  // Dacă a ales manual una, schimbarea limbii nu-i mai suprascrie alegerea.
  useEffect(() => {
    if (!manuallySelected) setCurrencyState(LOCALE_CURRENCY_MAP[locale] ?? "RON");
  }, [locale, manuallySelected]);

  useEffect(() => {
    let mounted = true;
    fetch("/api/exchange-rates")
      .then((res) => res.json())
      .then((data) => {
        if (mounted && data?.rates) setRates(data.rates);
      })
      .catch(() => {
        // Eșec silențios — rămânem pe FALLBACK_RATES
      });
    return () => {
      mounted = false;
    };
  }, []);

  const setCurrency = useCallback(async (c: CurrencyCode) => {
    setManuallySelected(true);
    setCurrencyState(c);
    writeCookie(COOKIE_NAME, c);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ preferred_currency: c }).eq("id", user.id);
      }
    } catch {
      // Eșec silențios — schimbarea valutei pe pagină nu trebuie blocată de asta
    }
  }, []);

  const convert = useCallback(
    (amountInRON: number) => convertFromRON(amountInRON, rates, currency),
    [rates, currency]
  );
  const format = useCallback(
    (amountInRON: number) => formatCurrency(convert(amountInRON), currency),
    [convert, currency]
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convert, format }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency trebuie folosit în interiorul CurrencyProvider");
  return ctx;
}