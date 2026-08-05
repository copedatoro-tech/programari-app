import { NextResponse } from "next/server";
import { FALLBACK_RATES, type CurrencyCode } from "@/lib/currency";

const CURRENCIES: CurrencyCode[] = ["RON", "EUR", "USD", "GBP", "HUF", "PLN"];

export async function GET() {
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/RON", {
      next: { revalidate: 86400 }, // cache 24h — nu batem API-ul la fiecare vizitator
    });
    if (!res.ok) throw new Error("Exchange rate API a răspuns cu eroare");
    const data = await res.json();
    const rates: Record<string, number> = {};
    for (const cur of CURRENCIES) {
      rates[cur] = typeof data.rates?.[cur] === "number" ? data.rates[cur] : FALLBACK_RATES[cur];
    }
    return NextResponse.json({ rates, source: "live", updatedAt: data.date ?? null });
  } catch {
    return NextResponse.json({ rates: FALLBACK_RATES, source: "fallback", updatedAt: null });
  }
}