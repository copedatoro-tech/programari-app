"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useCurrency } from "@/components/CurrencyProvider";
import { CURRENCY_INFO, type CurrencyCode } from "@/lib/currency";
import { useTranslations } from 'next-intl';

const CURRENCY_ORDER: CurrencyCode[] = ["RON", "EUR", "USD", "GBP", "HUF", "PLN"];

export default function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const currentInfo = CURRENCY_INFO[currency];
  const tc = useTranslations('currency');

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-100 hover:border-amber-500 transition-all"
      >
        <span className="text-sm font-black text-slate-700">{currentInfo.symbol}</span>
        <span className="text-[12px] font-black uppercase text-slate-700">{currency} - {tc?.(currency) ?? currentInfo.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-2 right-0 w-52 bg-white border-2 border-slate-900 rounded-2xl shadow-2xl p-2 z-[110] max-h-80 overflow-y-auto">
          {CURRENCY_ORDER.map((cur) => {
            const info = CURRENCY_INFO[cur];
            return (
              <button
                key={cur}
                onClick={() => {
                  setOpen(false);
                  setCurrency(cur);
                }}
                className={`w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl text-[12px] font-bold transition-colors ${
                  cur === currency ? "bg-amber-500 text-white" : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <span className="w-5 text-center font-black">{info.symbol}</span>
                {tc?.(cur) ?? info.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}