"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabaseClient";
import LocaleSwitcher from "@/components/LocaleSwitcher";

export default function SpecialistLoginPage() {
  const t = useTranslations("specialistPortal.login");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError || !data.session) {
        setError(t("wrongCredentials"));
        setLoading(false);
        return;
      }

      // ✅ Confirmăm că acest cont chiar aparține unui specialist (nu unui admin normal)
      const { data: staffRow } = await supabase
        .from("staff")
        .select("id")
        .eq("auth_user_id", data.session.user.id)
        .maybeSingle();

      if (!staffRow) {
        await supabase.auth.signOut();
        setError(t("notSpecialistAccount"));
        setLoading(false);
        return;
      }

      router.push("/specialist");
    } catch {
      setError(t("connectionError"));
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative">
      <div className="fixed top-4 right-4 z-[700]">
        <LocaleSwitcher />
      </div>

      <div className="w-full max-w-sm bg-white rounded-[45px] shadow-2xl border border-slate-100 p-10">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo-chronos.png" alt="Chronos" width={64} height={64} className="mb-4" />
          <h1 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">
            {t("title")} <span className="text-amber-500">{t("titleHighlight")}</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase italic mt-1">{t("subtitle")}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder={t("emailPlaceholder")}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-amber-500 transition-all"
          />
          <input
            type="password"
            placeholder={t("passwordPlaceholder")}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-amber-500 transition-all"
          />

          {error && (
            <p className="text-[11px] font-bold text-red-500 text-center italic">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase italic text-[12px] hover:bg-amber-500 hover:text-black transition-all disabled:opacity-50"
          >
            {loading ? t("checkingBtn") : t("loginBtn")}
          </button>
        </form>

        <p className="text-center text-[9px] font-bold text-slate-300 uppercase italic mt-8">
          {t("noAccessFooter")}
        </p>
      </div>
    </main>
  );
}