"use client";

import { useState, useEffect, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";

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

    setLoading(true);
    setError("");

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.parola,
        options: {
          data: {
            full_name: form.nume,
            phone: form.telefon || null
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
          phone: form.telefon || null,
          email: form.email,
          plan_type: 'start (gratuit)',
          role: 'Administrator',
          staff: [],
          services: []
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
              <input
                type="tel"
                className="input-chronos !py-4 text-[13px] uppercase italic tracking-wider font-bold"
                placeholder={t("phonePlaceholder")} value={form.telefon}
                onChange={(e) => setForm({...form, telefon: e.target.value})}
              />
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
    </main>
  );
}