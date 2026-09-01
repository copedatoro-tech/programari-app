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
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { Eye, EyeOff } from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  // ✅ Placeholder dinamic — arată clar userului că nu trebuie să scrie
  // zero-ul inițial, fiindcă prefixul de țară îl înlocuiește deja
  const PHONE_PLACEHOLDERS: Record<string, string> = {
    "+40": "712 345 678",
    "+44": "7911 123456",
    "+33": "6 12 34 56 78",
    "+49": "151 23456789",
    "+34": "612 345 678",
    "+39": "312 345 6789",
    "+36": "20 123 4567",
    "+351": "912 345 678",
    "+48": "512 345 678",
    "+1": "555 123 4567",
  };
  const currentPlaceholder = PHONE_PLACEHOLDERS[countryCode] || t("phonePlaceholder");

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
          plan_type: 'chronos free',
          role: 'Administrator',
          // ✅ Dovada consimțământului — data exactă a acceptării
          terms_accepted_at: new Date().toISOString()
        }]);

        // 🐛 FIX: eroarea de la inserarea profilului era citită dar niciodată
        // verificata — userul vedea mereu "cont creat cu succes" si era
        // redirectionat la login, chiar daca profilul lui nu exista deloc in
        // baza de date (fara plan_type, full_name etc., esentiale pentru
        // functionarea aplicatiei). Acum tratam eroarea explicit.
        if (profileError) {
          console.error("Eroare la crearea profilului:", profileError.message);
          setError(t("unexpectedError"));
          setLoading(false);
          return;
        }

        alert(t("accountCreated"));
        await supabase.auth.signOut();
        router.push("/login");
      }
    } catch (err) {
      console.error("Eroare neasteptata la inregistrare:", err);
      setError(t("unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-svh flex flex-col items-center justify-start sm:justify-center p-1.5 sm:p-6 bg-slate-50 font-sans text-slate-900">
      <div className="w-full max-w-[300px] sm:max-w-2xl flex justify-end mb-1 z-50 scale-[0.82] origin-top-right sm:scale-100">
        <LocaleSwitcher />
      </div>

      <div ref={formRef} className="w-full max-w-[300px] sm:max-w-2xl bg-white rounded-[18px] sm:rounded-[40px] shadow-2xl border-4 border-white overflow-hidden transform hover:scale-[1.005] transition-all duration-500">

        <div className="bg-slate-900 px-2.5 py-2 sm:px-4 sm:py-12 text-center relative flex items-center gap-2 sm:flex-col sm:gap-0 sm:items-center overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full -mr-20 -mt-20 blur-3xl z-0"></div>

          <div className="relative z-10 mb-0 sm:mb-6 drop-shadow-2xl bg-white p-1.5 sm:p-4 rounded-xl sm:rounded-3xl flex-shrink-0">
            <Image src="/logo-chronos.png" alt="Chronos Logo" width={42} height={42} priority className="object-contain" />
          </div>

          <h2 className="text-[13px] sm:text-3xl font-black uppercase text-white italic tracking-tighter relative z-10 leading-none text-left sm:text-center">
            {t("title")} <span className="block text-amber-500">{t("titleHighlight")}</span>
          </h2>
          <p className="hidden sm:block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3 relative z-10 italic text-center">
            {t("subtitle")}
          </p>
        </div>

        <form onSubmit={handleRegister} className="p-2.5 sm:p-10 space-y-1.5 sm:space-y-6 bg-white">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 sm:gap-6">
            <div className="space-y-0.5 sm:space-y-2">
              <label className="text-[7px] sm:text-[10px] font-black uppercase text-slate-400 ml-1.5 sm:ml-2 italic tracking-widest">{t("fullName")}</label>
              <input
                type="text" required
                className="input-chronos !py-2 sm:!py-4 text-[9px] sm:text-[13px] uppercase italic tracking-wider font-bold"
                placeholder={t("fullNamePlaceholder")} value={form.nume}
                onChange={(e) => setForm({...form, nume: e.target.value})}
              />
            </div>

            <div className="space-y-0.5 sm:space-y-2">
              <label className="text-[7px] sm:text-[10px] font-black uppercase text-slate-400 ml-1.5 sm:ml-2 italic tracking-widest">{t("phone")}</label>
              <div className="grid grid-cols-[1fr_72px] sm:flex gap-1.5 sm:gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="input-chronos !py-2 sm:!py-4 text-[9px] sm:text-[12px] font-bold w-[110px] flex-shrink-0"
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
                    className="input-chronos !py-2 sm:!py-4 text-[9px] sm:text-[13px] font-bold w-[70px] flex-shrink-0"
                  />
                )}
                <input
                  type="tel"
                  className="input-chronos !py-2 sm:!py-4 text-[9px] sm:text-[13px] uppercase italic tracking-wider font-bold col-span-2 sm:col-span-1 flex-1"
                  placeholder={currentPlaceholder} value={form.telefon}
                  onChange={(e) => setForm({...form, telefon: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="space-y-0.5 sm:space-y-2">
            <label className="text-[7px] sm:text-[10px] font-black uppercase text-slate-400 ml-1.5 sm:ml-2 italic tracking-widest">{t("email")}</label>
            <input
              type="email" required
              className="input-chronos !py-2 sm:!py-4 text-[9px] sm:text-[13px] uppercase italic tracking-wider font-bold"
              placeholder={t("emailPlaceholder")} value={form.email}
              onChange={(e) => setForm({...form, email: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 sm:gap-6">
            <div className="space-y-0.5 sm:space-y-2">
              <label className="text-[7px] sm:text-[10px] font-black uppercase text-slate-400 ml-1.5 sm:ml-2 italic tracking-widest">{t("password")}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"} required
                  className="input-chronos !py-2 sm:!py-4 text-[9px] sm:text-[13px] font-bold pr-10"
                  placeholder="........" value={form.parola}
                  onChange={(e) => setForm({...form, parola: e.target.value})}
                />
                <button type="button" onClick={() => setShowPassword((show) => !show)} className="absolute right-3 top-2.5 sm:top-4 text-slate-400 hover:text-slate-900">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-0.5 sm:space-y-2">
              <label className="text-[7px] sm:text-[10px] font-black uppercase text-slate-400 ml-1.5 sm:ml-2 italic tracking-widest">{t("confirmPassword")}</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"} required
                  className="input-chronos !py-2 sm:!py-4 text-[9px] sm:text-[13px] font-bold pr-10"
                  placeholder="........" value={form.confirmParola}
                  onChange={(e) => setForm({...form, confirmParola: e.target.value})}
                />
                <button type="button" onClick={() => setShowConfirmPassword((show) => !show)} className="absolute right-3 top-2.5 sm:top-4 text-slate-400 hover:text-slate-900">
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* ✅ Checkbox obligatoriu de acceptare Termeni + GDPR */}
          <div className="flex items-start gap-2 sm:gap-3 bg-slate-50 rounded-lg sm:rounded-2xl p-2.5 sm:p-4 border border-slate-100">
            <input
              type="checkbox"
              id="accept-terms"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 w-4 h-4 accent-amber-500 cursor-pointer flex-shrink-0"
            />
            <label htmlFor="accept-terms" className="text-[7px] sm:text-[12px] font-medium text-slate-600 leading-snug sm:leading-relaxed cursor-pointer">
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
            className="btn-demo w-full py-2.5 sm:py-5 text-[10px] sm:text-sm mt-1 sm:mt-4 shadow-xl hover:shadow-amber-500/20"
          >
            {loading ? t("processing") : t("registerBtn")}
          </button>

          <div className="text-center pt-2 sm:pt-8 border-t-2 border-slate-50">
            <Link href="/login" className="text-[7px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-amber-600 transition-all flex items-center justify-center gap-1 sm:gap-2 group">
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
