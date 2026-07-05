"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

const LOCALE_INFO: Record<string, { label: string; flag: string }> = {
  ro: { label: "Română", flag: "🇷🇴" },
  en: { label: "English", flag: "🇬🇧" },
  fr: { label: "Français", flag: "🇫🇷" },
  de: { label: "Deutsch", flag: "🇩🇪" },
  es: { label: "Español", flag: "🇪🇸" },
  it: { label: "Italiano", flag: "🇮🇹" },
  hu: { label: "Magyar", flag: "🇭🇺" },
  pt: { label: "Português", flag: "🇵🇹" },
  pl: { label: "Polski", flag: "🇵🇱" },
};
const LOCALES = Object.keys(LOCALE_INFO);

// ℹ️ Diferă de LocaleSwitcher.tsx: acela navighează prin URL-uri cu prefix
// de limbă (/en/..., /ro/...), potrivit paginilor din app/[locale]/...
// Această variantă e pentru pagini din AFARA acelei structuri (ex: app/auth/...) —
// schimbă limba direct prin cookie și reîmprospătează pagina curentă, fără redirecționare.
export default function StandaloneLocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const current = LOCALE_INFO[locale] ?? { label: locale, flag: "🌐" };

  const selectLocale = (loc: string) => {
    document.cookie = `NEXT_LOCALE=${loc}; path=/; max-age=31536000`;
    setOpen(false);
    router.refresh();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-slate-100 shadow-sm hover:border-amber-500 transition-all"
      >
        <span className="text-lg leading-none">{current.flag}</span>
        <span className="text-[12px] font-black uppercase text-slate-700">{locale}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-2 right-0 w-48 bg-white border-2 border-slate-900 rounded-2xl shadow-2xl p-2 z-[110] max-h-80 overflow-y-auto">
          {LOCALES.map((loc) => {
            const info = LOCALE_INFO[loc];
            return (
              <button
                key={loc}
                onClick={() => selectLocale(loc)}
                className={`w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl text-[12px] font-bold transition-colors ${
                  loc === locale ? "bg-amber-500 text-white" : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <span className="text-lg leading-none">{info.flag}</span>
                {info.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}