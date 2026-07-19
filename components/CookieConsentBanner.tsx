"use client";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

const CONSENT_KEY = "chronos_cookie_consent";

// ✅ Banner real de consimțământ (opt-in), diferit de CookiesModal (care e doar
// informativ, din footer). Acesta apare la prima vizită și blochează efectiv
// pagina până userul alege — conform cerinței legale (GDPR/ePrivacy) de
// consimțământ activ, nu doar informare pasivă.
//
// ⚠️ Dacă folosești scripturi non-esențiale (ex. Facebook Pixel), acestea
// trebuie încărcate DOAR după ce userul alege "Accept toate", verificând
// valoarea din localStorage(CONSENT_KEY) === "all" înainte de a le injecta.
export default function CookieConsentBanner() {
  const t = useTranslations("cookieConsent");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const existing = localStorage.getItem(CONSENT_KEY);
    if (!existing) setVisible(true);
  }, []);

  const handleChoice = (choice: "all" | "essential") => {
    localStorage.setItem(CONSENT_KEY, choice);
    setVisible(false);
    // ✅ Anunțăm restul aplicației (ex. un script care așteaptă consimțământul
    // pentru Facebook Pixel) că userul a ales, fără reîncărcare de pagină
    window.dispatchEvent(new CustomEvent("cookie-consent-changed", { detail: choice }));
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-slate-900 border-t-4 border-amber-500 p-5 md:p-6 shadow-2xl">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-4 justify-between">
        <p className="text-white text-[12px] md:text-sm font-medium leading-relaxed flex-1">
          🍪 {t("message")}
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={() => handleChoice("essential")}
            className="px-5 py-3 bg-slate-700 text-white rounded-xl font-black uppercase text-[10px] hover:bg-slate-600 transition-all whitespace-nowrap"
          >
            {t("essentialOnlyBtn")}
          </button>
          <button
            onClick={() => handleChoice("all")}
            className="px-5 py-3 bg-amber-500 text-slate-900 rounded-xl font-black uppercase text-[10px] hover:bg-amber-400 transition-all whitespace-nowrap"
          >
            {t("acceptAllBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}