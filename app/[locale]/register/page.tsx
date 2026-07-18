"use client";

import { useState, useEffect, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
// ⚠️ Verifică această cale de import — ajusteaz-o dacă modalele tale
// sunt în alt folder (ex. "@/components/modals/TermeniModal")
import TermeniModal from "@/components/TermeniModal";
import GDPRModal from "@/components/GDPRModal";

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations("registerPage");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    nume: "",
    email: "",
    telefon: "",
    parola: "",
    confirmParola: ""
  });

  // ✅ Stare nouă: acceptarea obligatorie a Termenilor + GDPR
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermeniModal, setShowTermeniModal] = useState(false);
  const [showGDPRModal, setShowGDPRModal] = useState(false);

  // ✅ Stare nouă: prefix de țară, ca numărul salvat să fie mereu în format
  // internațional corect (necesar pentru ca notificările WhatsApp să funcționeze)
  const [countryCode, setCountryCode] = useState("+40");

  const COUNTRY_CODES = [
    { code: "+40", label: "🇷🇴 România (+40)" },
    { code: "+44", label: "🇬🇧 UK (+44)" },
    { code: "+33", label: "🇫🇷 France (+33)" },
    { code: "+49", label: "🇩🇪 Deutschland (+49)" },
    { code: "+34", label: "🇪🇸 España (+34)" },
    { code: "+39", label: "🇮🇹 Italia (+39)" },
    { code: "+36", label: "🇭🇺 Magyarország (+36)" },
    { code: "+351", label: "🇵🇹 Portugal (+351)" },
    { code: "+48", label: "🇵🇱 Polska (+48)" },
    { code: "+1", label: "🇺🇸 USA/Canada (+1)" },
    { code: "other", label: t("otherCountry") },
  ];

  const [customCode, setCustomCode] = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setError("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.parola !== form.confirmParola) {
      setError(t("passwordMismatch"));
      return;
    }

    if (form.parola.length < 6) {
      setError(t("passwordTooShort"));
      return;
    }

    // ✅ Blocăm înregistrarea dacă nu a bifat acceptarea
    if (!acceptedTerms) {
      setError(t("termsRequired"));
      return;
    }

    // ✅ Construim numărul final în format internațional (necesar pentru WhatsApp)
    const prefix = countryCode === "other" ? customCode.trim() : countryCode;
    const telefonCurat = form.telefon.replace(/\D/g, ""); // doar cifre
    const telefonFinal = form.telefon
      ? `${prefix}${telefonCurat.replace(/^0+/, "")}` // elimină zero-ul inițial redundant
      : null;

    if (form.telefon && countryCode === "other" && !customCode.trim()) {
      setError(t("customCodeRequired"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.parola,
        options: {
          data: {
            full_name: form.nume,
            phone: telefonFinal
          }
        }
      });

      if (authError) {
        setError("❌ " + authError.message);
        setLoading(false);
        return;
      }

      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert([{
          id: authData.user.id,
          full_name: form.nume,
          phone: telefonFinal,
          email: form.email,
          plan_type: 'start (gratuit)',
          role: 'Administrator',
          staff: [],
          services: [],
          // ✅ Dovada consimțământului — data exactă a acceptării
          terms_accepted_at: new Date().toISOString()
        }]);

        alert(t("accountCreated"));
        await supabase.auth.signOut();
        router.push("/login");
      }
    } catch (err: any) {
      setError(t("unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50 font-sans text-slate-900">
      <div ref={formRef} className="w-full max-w-2xl bg-white rounded-[40px] shadow-2xl border-4 border-white overflow-hidden transform hover:scale-[1.005] transition-all duration-500">

        <div className="bg-slate-900 px-4 py-12 text-center relative flex flex-col items-center overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full -mr-20 -mt-20 blur-3xl z-0"></div>

          <div className="relative z-10 mb-6 drop-shadow-2xl bg-white p-4 rounded-3xl">
            <Image src="/logo-chronos.png" alt="Chronos Logo" width={80} height={80} priority className="object-contain" />
          </div>

          <h2 className="text-3xl font-black uppercase text-white italic tracking-tighter relative z-10 leading-none">
            {t("title")} <span className="text-amber-500">{t("titleHighlight")}</span>
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3 relative z-10 italic">
            {t("subtitle")}
          </p>
        </div>

        <form onSubmit={handleRegister} className="p-10 space-y-6 bg-white">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">{t("fullName")}</label>
              <input
                type="text" required
                className="input-chronos !py-4 text-[13px] uppercase italic tracking-wider font-bold"
                placeholder={t("fullNamePlaceholder")} value={form.nume}
                onChange={(e) => setForm({...form, nume: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">{t("phone")}</label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="input-chronos !py-4 text-[12px] font-bold w-[110px] flex-shrink-0"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
                {countryCode === "other" && (
                  <input
                    type="text"
                    placeholder="+..."
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value)}
                    className="input-chronos !py-4 text-[13px] font-bold w-[70px] flex-shrink-0"
                  />
                )}
                <input
                  type="tel"
                  className="input-chronos !py-4 text-[13px] uppercase italic tracking-wider font-bold flex-1"
                  placeholder={t("phonePlaceholder")} value={form.telefon}
                  onChange={(e) => setForm({...form, telefon: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">{t("email")}</label>
            <input
              type="email" required
              className="input-chronos !py-4 text-[13px] uppercase italic tracking-wider font-bold"
              placeholder={t("emailPlaceholder")} value={form.email}
              onChange={(e) => setForm({...form, email: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">{t("password")}</label>
              <input
                type="password" required
                className="input-chronos !py-4 text-[13px] font-bold"
                placeholder="••••••••" value={form.parola}
                onChange={(e) => setForm({...form, parola: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">{t("confirmPassword")}</label>
              <input
                type="password" required
                className="input-chronos !py-4 text-[13px] font-bold"
                placeholder="••••••••" value={form.confirmParola}
                onChange={(e) => setForm({...form, confirmParola: e.target.value})}
              />
            </div>
          </div>

          {/* ✅ Checkbox obligatoriu de acceptare Termeni + GDPR */}
          <div className="flex items-start gap-3 bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <input
              type="checkbox"
              id="accept-terms"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 w-4 h-4 accent-amber-500 cursor-pointer flex-shrink-0"
            />
            <label htmlFor="accept-terms" className="text-[12px] font-medium text-slate-600 leading-relaxed cursor-pointer">
              {t("termsCheckboxPrefix")}{" "}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setShowTermeniModal(true); }}
                className="text-amber-600 font-bold underline hover:text-amber-700"
              >
                {t("termsLinkLabel")}
              </button>
              {" "}{t("termsCheckboxAnd")}{" "}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setShowGDPRModal(true); }}
                className="text-amber-600 font-bold underline hover:text-amber-700"
              >
                {t("gdprLinkLabel")}
              </button>
            </label>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase italic text-center border-l-8 border-red-500 animate-pulse">
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="btn-demo w-full py-5 text-sm mt-4 shadow-xl hover:shadow-amber-500/20"
          >
            {loading ? t("processing") : t("registerBtn")}
          </button>

          <div className="text-center pt-8 border-t-2 border-slate-50">
            <Link href="/login" className="text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-amber-600 transition-all flex items-center justify-center gap-2 group">
              <span className="group-hover:-translate-x-1 transition-transform">←</span> {t("haveAccount")} <span className="text-slate-900 underline decoration-amber-500 decoration-2 underline-offset-4">{t("loginLink")}</span>
            </Link>
          </div>
        </form>
      </div>

      <TermeniModal isOpen={showTermeniModal} onClose={() => setShowTermeniModal(false)} />
      <GDPRModal isOpen={showGDPRModal} onClose={() => setShowGDPRModal(false)} />
    </main>
  );
}