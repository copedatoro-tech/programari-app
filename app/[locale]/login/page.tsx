"use client";

import { useState, useMemo, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("loginPage");
  const locale = useLocale();
  const loginMessages = useMemo(() => {
    const byLocale: Record<string, { accountMissing: string; wrongPassword: string; specialistAccount: string; checkFailed: string }> = {
      ro: {
        accountMissing: "Acest cont nu există. Verifică dacă emailul este scris corect sau creează un cont nou.",
        wrongPassword: "Email sau parolă greșită. Reîncearcă datele. Dacă nu ai cont, poți crea unul nou.",
        specialistAccount: "Acest email aparține unui cont de specialist. Folosește pagina de autentificare pentru specialist.",
        checkFailed: "Nu am putut verifica acest email acum. Te rugăm să încerci din nou.",
      },
      en: {
        accountMissing: "This account does not exist. Check that the email is correct or create a new account.",
        wrongPassword: "Wrong email or password. Try again. If you don't have an account, you can create a new one.",
        specialistAccount: "This email belongs to a specialist account. Please use the specialist login page.",
        checkFailed: "We couldn't verify this email right now. Please try again.",
      },
    };
    return byLocale[locale] || byLocale.en;
  }, [locale]);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [missingAccount, setMissingAccount] = useState(false);

  // ✅ Stare nouă: dacă userul are 2FA activ, cerem codul înainte de acces complet
  const [needsMfa, setNeedsMfa] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      const { error } = await supabase.auth.getSession();
      if (error && error.message.includes("Refresh Token Not Found")) {
        console.warn("Sesiune invalidă detectată, curățăm datele locale...");
        await supabase.auth.signOut();
        router.refresh();
      }
    };
    checkSession();
  }, [supabase, router]);

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId || mfaCode.length < 6) return;
    setMfaError("");
    setLoading(true);

    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId,
      });
      if (challengeError) {
        setMfaError(challengeError.message);
        setLoading(false);
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code: mfaCode,
      });

      if (verifyError) {
        setMfaError(t("mfaIncorrectCode"));
        setLoading(false);
        return;
      }

      router.push("/programari/calendar");
      router.refresh();
    } catch {
      setMfaError("Eroare neașteptată.");
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const normalizedEmail = email.trim().toLowerCase();
    setLoginError("");
    setMissingAccount(false);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        console.error("Eroare detaliată:", error);

        if (error.message.includes("Refresh Token Not Found")) {
          await supabase.auth.signOut();
          setLoginError(t("sessionExpired"));
        } else {
          try {
            const res = await fetch("/api/auth/check-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: normalizedEmail }),
            });
            const check = await res.json();

            if (res.ok && check?.exists === false) {
              setMissingAccount(true);
              setLoginError(loginMessages.accountMissing);
            } else if (res.ok && check?.type === "specialist") {
              setLoginError(loginMessages.specialistAccount);
            } else if (res.ok && check?.exists === true) {
              setLoginError(loginMessages.wrongPassword);
            } else {
              setLoginError(loginMessages.checkFailed);
            }
          } catch {
            setLoginError(t("errorPrefix") + error.message);
          }
        }

        setLoading(false);
        return;
      }

      if (data.session) {
        // ✅ Verificăm dacă acest cont are 2FA activ și necesită cod suplimentar
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        if (aalData && aalData.nextLevel === "aal2" && aalData.currentLevel !== "aal2") {
          const { data: factorsData } = await supabase.auth.mfa.listFactors();
          const verifiedFactor = factorsData?.totp.find((f) => f.status === "verified");

          if (verifiedFactor) {
            setMfaFactorId(verifiedFactor.id);
            setNeedsMfa(true);
            setLoading(false);
            return;
          }
        }

        router.push("/programari/calendar");
        router.refresh();
      } else {
        setLoginError(t("sessionNotCreated"));
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
      console.error("Eroare Catch:", err);
      setLoginError(t("connectionError"));
    }
  };

  return (
    <main className="min-h-svh flex flex-col items-center justify-start sm:justify-center gap-1.5 p-2 sm:p-6 bg-slate-50 font-sans text-slate-900">
      <div className="w-full max-w-[300px] sm:max-w-md flex justify-end z-50">
        <LocaleSwitcher />
      </div>

      <div className="w-full max-w-[300px] sm:max-w-md bg-white rounded-[20px] sm:rounded-[40px] shadow-2xl shadow-slate-200/60 border-4 border-white overflow-hidden transform sm:hover:scale-[1.01] transition-all duration-500">

        <div className="bg-slate-900 px-3 py-3 sm:px-4 sm:py-10 text-center relative flex items-center gap-3 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16 blur-2xl z-0"></div>

          <Image
            src="/logo-chronos.png"
            alt="Chronos Logo"
            width={54}
            height={54}
            style={{ height: "auto" }}
            priority
            className="object-contain relative z-10 shrink-0 drop-shadow-xl rounded-2xl"
          />

          <div className="relative z-10 min-w-0 text-left">
            <h2 className="text-[13px] sm:text-3xl font-black uppercase text-white italic tracking-tighter leading-tight">
              {t("title")} <span className="block text-amber-500">{t("titleHighlight")}</span>
            </h2>
            <p className="text-[6px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.16em] sm:tracking-[0.3em] italic mt-1">
              {t("subtitle")}
            </p>
          </div>
        </div>

        {needsMfa ? (
          <form onSubmit={handleVerifyMfa} className="p-4 sm:p-10 space-y-3 sm:space-y-5 bg-white">
            <p className="text-center text-slate-500 text-sm font-medium mb-2">
              {t("mfaPrompt")}
            </p>
            <input
              type="text"
              maxLength={6}
              autoFocus
              placeholder="000000"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
              className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-center text-2xl tracking-[0.5em] focus:border-amber-500 outline-none transition-all"
            />
            {mfaError && (
              <p className="text-red-600 text-xs font-bold text-center">{mfaError}</p>
            )}
            <button
              type="submit"
              disabled={loading || mfaCode.length < 6}
              className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black italic uppercase tracking-widest hover:bg-slate-800 transition-all text-xs disabled:opacity-60"
            >
              {loading ? t("mfaVerifying") : t("mfaConfirmBtn")}
            </button>
          </form>
        ) : (
        <form onSubmit={handleLogin} className="p-3 sm:p-10 space-y-2.5 sm:space-y-5 bg-white">
          <div className="space-y-2.5 sm:space-y-4">
            <input
              type="email"
              required
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setLoginError(""); setMissingAccount(false); }}
              className="w-full pl-3 pr-10 py-2.5 sm:p-5 sm:pr-12 bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-2xl font-bold text-[9px] sm:text-[11px] uppercase italic tracking-wider focus:border-amber-500 outline-none transition-all"
                />
            <div className="relative group text-right">
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder={t("passwordPlaceholder")}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setLoginError(""); }}
                className="w-full pl-3 pr-10 py-2.5 sm:p-5 sm:pr-12 bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-2xl font-bold text-[9px] sm:text-[11px] uppercase italic tracking-wider focus:border-amber-500 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((show) => !show)}
                className="absolute right-3 top-2.5 sm:top-4 text-slate-400 hover:text-slate-900 transition-colors"
                aria-label={showPassword ? "Ascunde parola" : "Arata parola"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <Link
                href="/forgot-password"
                className="inline-block mt-1 text-[8px] sm:text-[9px] font-black uppercase italic text-slate-400 hover:text-amber-500 transition-colors mr-2"
              >
                {t("forgotPassword")}
              </Link>
            </div>
          </div>

          {loginError && (
            <div className={`${missingAccount ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-red-50 border-red-100 text-red-600"} border-2 rounded-xl p-3 text-[10px] sm:text-xs font-bold text-center leading-relaxed flex flex-col gap-2`}>
              <span>{loginError}</span>
              {missingAccount && (
                <Link
                  href={email.trim() ? `/register?email=${encodeURIComponent(email.trim().toLowerCase())}` : "/register"}
                  className="w-full py-2 rounded-lg bg-amber-500 text-slate-900 font-black uppercase italic text-[9px] sm:text-[10px] hover:bg-amber-600 transition-all"
                >
                  {t("createAccount")}
                </Link>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-2.5 sm:p-5 rounded-xl sm:rounded-2xl font-black italic uppercase tracking-widest hover:bg-slate-800 border-b-4 border-slate-700 active:border-b-0 active:translate-y-1 transition-all text-[9px] sm:text-xs disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? t("checking") : t("loginBtn")}
          </button>

          <div className="pt-1.5 sm:pt-4 border-t-2 border-slate-50 flex flex-col items-center gap-1.5 sm:gap-3 text-center">
            <p className="text-[7px] sm:text-[10px] font-black uppercase italic text-slate-400 mt-0.5 sm:mt-2">
              {t("noAccount")}
            </p>
            <Link
              href={missingAccount && email.trim() ? `/register?email=${encodeURIComponent(email.trim().toLowerCase())}` : "/register"}
              className="w-full py-2 sm:py-3 text-[9px] sm:text-[11px] font-black uppercase italic bg-amber-500 text-slate-900 rounded-xl border-b-4 border-amber-600 hover:bg-amber-600 transition-all text-center"
            >
              {t("createAccount")}
            </Link>
          </div>
        </form>
        )}
      </div>
    </main>
  );
}
