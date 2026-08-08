"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Image from "next/image";
import { useTranslations } from "next-intl";
import LocaleSwitcher from "@/components/LocaleSwitcher";

export default function ForgotPasswordPage() {
  const t = useTranslations("forgotPasswordPage");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    if (error) {
      setError(error.message);
    } else {
      setMessage(t("emailSent"));
    }
    setLoading(false);
  };
  return (
    <main className="min-h-svh flex flex-col items-center justify-start sm:justify-center p-2 sm:p-6 bg-slate-50 font-sans text-slate-900">\n      <div className="w-full max-w-[300px] sm:max-w-md flex justify-end mb-1 z-50 scale-[0.82] origin-top-right sm:scale-100">\n        <LocaleSwitcher />\n      </div>
      <div className="w-full max-w-[300px] sm:max-w-md bg-white rounded-[20px] sm:rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden">

        <div className="bg-slate-900 px-3 py-3 sm:px-4 sm:py-14 text-center relative flex items-center gap-3 sm:flex-col sm:gap-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full -mr-20 -mt-20 blur-3xl z-0"></div>
          <Image src="/logo-chronos.png" alt="Chronos Logo" width={52} height={52} priority className="relative z-10 mb-0 sm:mb-6 drop-shadow-2xl bg-white rounded-2xl p-1.5 sm:p-0" />
          <h2 className="text-[14px] sm:text-3xl font-black uppercase text-white italic tracking-tighter relative z-10 leading-tight text-left sm:text-center">
            {t("title")} <span className="block text-amber-500">{t("titleHighlight")}</span>
          </h2>
        </div>
        <form onSubmit={handleReset} className="p-3 sm:p-10 space-y-3 sm:space-y-6 bg-white">
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase text-slate-400 ml-4 italic tracking-[0.2em]">
              {t("email")}
            </label>
            <input
              type="email"
              required
              className="w-full px-4 sm:px-8 py-3 sm:py-5 bg-slate-50 border-2 border-slate-100 focus:border-amber-500 rounded-xl sm:rounded-[22px] outline-none font-bold text-[10px] sm:text-sm italic text-slate-900"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && (
            <div className="p-5 bg-red-50 text-red-600 rounded-[20px] text-[10px] font-black uppercase italic text-center border-l-4 border-red-500">
              {error}
            </div>
          )}
          {message && (
            <div className="p-5 bg-green-50 text-green-600 rounded-[20px] text-[10px] font-black uppercase italic text-center border-l-4 border-green-500">
              {message}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 sm:py-6 bg-slate-900 text-amber-500 rounded-xl sm:rounded-[25px] font-black text-[9px] sm:text-[12px] tracking-[0.18em] sm:tracking-[0.3em] hover:bg-amber-600 hover:text-white transition-all border-b-4 sm:border-b-8 border-slate-800 uppercase italic shadow-2xl active:translate-y-1 active:border-b-0"
          >
            {loading ? t("sending") : t("sendBtn")}
          </button>
        </form>
      </div>
    </main>
  );
}