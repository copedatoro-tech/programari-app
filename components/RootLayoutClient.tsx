"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { Crown, Gem, ShieldCheck, Zap } from "lucide-react";

import GDPRModal from "@/components/GDPRModal";
import TermeniModal from "@/components/TermeniModal";
import CookiesModal from "@/components/CookiesModal";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import OnboardingTour from "@/components/OnboardingTour";
import { getActivePlan } from "@/lib/getActivePlan";

// ─── RootLayoutClient ──────────────────────────────────────────────────────
export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const t = useTranslations("layout");
  const path = usePathname();
  const router = useRouter();

  const [authLoaded, setAuthLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authCheckFailed, setAuthCheckFailed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activePlan, setActivePlan] = useState<string>("CHRONOS FREE");
  const [tourKey, setTourKey] = useState(0);

  const menuRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState({ gdpr: false, termeni: false, cookies: false });

  const isPublicPage =
    path === "/login" ||
    path === "/" ||
    path === "/register" ||
    path === "/forgot-password" ||
    (path && path.startsWith("/rezervare")) ||
    (path && path.startsWith("/specialist"));

  const getPageTitle = () => {
    switch (path) {
      case "/programari":          return t("pageTitles.programari");
      case "/programari/calendar": return t("pageTitles.calendar");
      case "/clienti":             return t("pageTitles.clienti");
      case "/lista-asteptare":     return t("nav.listaAsteptare");
      case "/resurse":             return t("pageTitles.resurse");
      case "/abonamente":          return t("pageTitles.abonamente");
      case "/rapoarte":            return t("pageTitles.rapoarte");
      case "/sugestii":            return t("pageTitles.sugestii");
      case "/settings":            return t("pageTitles.settings");
      case "/profil":              return t("pageTitles.profil");
      case "/contacte-utile":      return t("pageTitles.contacteUtile");
      default:                     return t("pageTitles.dashboard");
    }
  };

  useEffect(() => {
    if (isPublicPage) { setAuthLoaded(true); return; }
    let mounted = true;
    const syncAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          setAuthCheckFailed(false);
          setIsLoggedIn(true);
          setUserId(session.user.id);
          getActivePlan(supabase, session.user.id)
            .then((plan) => { if (mounted) setActivePlan(plan); })
            .catch(() => {});
        } else {
          setAuthCheckFailed(false);
          setIsLoggedIn(false);
          setUserId(null);
        }
      } catch {
        if (mounted) setAuthCheckFailed(true);
      } finally {
        if (mounted) setAuthLoaded(true);
      }
    };
    syncAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setAuthCheckFailed(false);
        setIsLoggedIn(!!session);
        setUserId(session?.user?.id ?? null);
        setAuthLoaded(true);
        if (session?.user) {
          getActivePlan(supabase, session.user.id)
            .then((plan) => { if (mounted) setActivePlan(plan); })
            .catch(() => {});
        }
      }
    );
    return () => { mounted = false; subscription?.unsubscribe(); };
    // ✅ FIX: nu mai depinde de "path" — se re-declanșa la fiecare navigare,
    // refăcând complet verificarea sesiunii, ceea ce crea o cursă (race condition):
    // exact la login → redirect spre Programări, sesiunea nu apuca să fie confirmată
    // la timp, și utilizatorul era aruncat instant înapoi la /login. Acum abonamentul
    // la schimbările de sesiune (onAuthStateChange) rămâne activ continuu, fără să
    // se refacă la fiecare click.
  }, [isPublicPage]);

  useEffect(() => {
    if (!authLoaded || authCheckFailed || isLoggedIn || isPublicPage) return;
    // ✅ Mică întârziere înainte de redirect — plasă de siguranță suplimentară,
    // ca o stare tranzitorie de o fracțiune de secundă să nu declanșeze un
    // redirect fals către login
    const timer = setTimeout(() => router.replace("/login"), 350);
    return () => clearTimeout(timer);
  }, [authLoaded, authCheckFailed, isLoggedIn, isPublicPage, router]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsMenuOpen(false);
    };
    if (isMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    try { await supabase.auth.signOut(); } catch {}
    finally { localStorage.removeItem("chronos_demo"); window.location.href = "/login"; }
  };

  // ✅ Revezi Turul — resetează flag-ul din profil și remontează turul fără reload complet.
  const handleReviewTour = async () => {
    if (!userId) return;
    try {
      await supabase.from("profiles").update({ onboarding_completed: false }).eq("id", userId);
    } catch {
      // ignorăm — dacă update-ul eșuează, măcar redirecționăm
    } finally {
      router.push("/profil" as any);
      setTourKey((key) => key + 1);
    }
  };

  const planVisual = (() => {
    const plan = activePlan.toUpperCase();
    if (plan.includes("TEAM")) return { Icon: Crown, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" };
    if (plan.includes("ELITE")) return { Icon: Gem, color: "text-sky-600", bg: "bg-sky-50", border: "border-sky-100" };
    if (plan.includes("PRO")) return { Icon: Zap, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" };
    return { Icon: ShieldCheck, color: "text-slate-700", bg: "bg-slate-100", border: "border-slate-200" };
  })();
  const ActivePlanIcon = planVisual.Icon;

  const menuItems = [
    { href: "/programari",          icon: "📅", label: t("nav.programari") },
    { href: "/programari/calendar", icon: "🗓️", label: t("nav.calendar") },
    { href: "/clienti",             icon: "👥", label: t("nav.clienti") },
    { href: "/lista-asteptare",     icon: "📋", label: t("nav.listaAsteptare") },
    { href: "/resurse",             icon: "📦", label: t("nav.servicii") },
    { href: "/abonamente",          icon: "💎", label: t("nav.abonamente") },
    { href: "/rapoarte",            icon: "📊", label: t("nav.rapoarte") },
    { href: "/sugestii",            icon: "⭐", label: t("nav.recenzii") },
    { href: "/contacte-utile",      icon: "📞", label: t("nav.contacteUtile") },
    { href: "/settings",            icon: "⚙️", label: t("nav.setari") },
    { href: "/profil",              icon: "👤", label: t("nav.profil") },
  ];

  return authLoaded ? (
    <>
      {isLoggedIn && !isPublicPage && userId && (
        <OnboardingTour key={tourKey} userId={userId} />
      )}

      {!isPublicPage && (
        <header className="w-full bg-white border-b-2 border-slate-100 sticky top-0 z-[100] shadow-sm h-16 flex items-center">
          <div className="max-w-7xl w-full mx-auto px-6 flex justify-between items-center h-full gap-4">
            <Link href="/programari" className="flex items-center gap-3 h-full py-1 group shrink-0">
              <div className="h-full aspect-square flex items-center justify-center transition-transform group-hover:scale-105">
                <Image src="/logo-chronos.png" alt="Logo" width={56} height={56} priority className="object-contain h-full w-auto" />
              </div>
              <span className="font-black italic uppercase text-lg tracking-tighter text-slate-900 group-hover:text-amber-500 transition-colors hidden sm:block">
                CHRONOS<span className="text-amber-500">.</span>
              </span>
            </Link>

            <div className="flex-1 flex justify-center min-w-0">
              <div className="px-4 md:px-6 py-2 rounded-xl bg-amber-50 border-[3px] border-amber-500 shadow-sm">
                <h2 className="text-[10px] md:text-sm font-black uppercase italic tracking-widest text-slate-900 truncate">
                  {getPageTitle()}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <LocaleSwitcher />

              <Link href="/abonamente"
                className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-[15px] bg-slate-50 border border-slate-100 hover:border-amber-500 transition-all group">
                <div className={`w-8 h-8 rounded-xl ${planVisual.bg} border ${planVisual.border} flex items-center justify-center shrink-0`}>
                  <ActivePlanIcon className={`w-4 h-4 ${planVisual.color}`} strokeWidth={2.7} />
                </div>
                <div className="flex flex-col items-end min-w-0">
                  <span className="text-[7px] font-black uppercase tracking-tighter text-slate-400 group-hover:text-amber-600 transition-colors">{t("header.abonamentActiv")}</span>
                  <span className="text-[10px] font-black italic uppercase text-slate-900 group-hover:text-amber-500 transition-colors truncate max-w-[150px]">{activePlan}</span>
                </div>
              </Link>

              <div className="relative" ref={menuRef}>
                <button onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className={`px-4 md:px-5 py-2 rounded-xl font-black text-[10px] uppercase italic tracking-widest transition-all border-b-2 active:translate-y-0.5 active:border-b-0 ${
                    isMenuOpen ? "bg-amber-500 border-amber-700 text-white" : "bg-slate-900 border-slate-700 text-white hover:bg-slate-800"
                  }`}>
                  {isMenuOpen ? t("header.menuClose") : t("header.menuOpen")}
                </button>

                {isMenuOpen && (
                  <div className="absolute top-full mt-3 right-0 w-64 bg-white border-2 border-slate-900 rounded-[25px] shadow-2xl p-2 z-[110]">
                    <div className="space-y-0.5 max-h-[70vh] overflow-y-auto scrollbar-none">
                      {menuItems.map((item) => (
                        <Link key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)}
                          className={`flex items-center gap-3 p-3 rounded-xl font-black text-[10px] uppercase italic transition-all ${
                            path === item.href ? "bg-amber-500 text-white shadow-md" : "hover:bg-slate-50 text-slate-900"
                          }`}>
                          <span className="text-base">{item.icon}</span> {item.label}
                        </Link>
                      ))}
                    </div>
                    <button onClick={handleLogout}
                      className="w-full mt-2 pt-2 border-t border-slate-100 text-left p-3 text-red-500 font-black text-[10px] uppercase italic hover:bg-red-50 rounded-xl flex items-center gap-3 transition-colors">
                      <span>🚪</span> {t("logout")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="flex-grow">{children}</main>

      {!isPublicPage && (
        <footer className="w-full bg-white border-t-2 border-slate-100 py-5 px-8 mt-auto">
          <div className="max-w-7xl w-full mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">

            <div className="flex items-center gap-4">
              <Image src="/logo-chronos.png" alt="Logo Footer" width={52} height={52} priority className="object-contain" />
              <div className="flex flex-col">
                <span className="font-black italic uppercase text-sm text-slate-900 leading-tight tracking-tight">
                  CHRONOS<span className="text-amber-500">.</span>
                </span>
                <span className="text-[11px] font-bold text-slate-400 mt-0.5">{t("footer.contact")}</span>
                <a href="mailto:copedatoro@gmail.com"
                  className="text-[11px] font-bold text-amber-600 hover:text-slate-900 transition-colors">
                  copedatoro@gmail.com
                </a>
              </div>
            </div>

            <div className="flex items-center gap-6 flex-wrap justify-center">
              {isLoggedIn && (
                <button onClick={handleReviewTour}
                  className="text-[11px] font-black uppercase italic text-amber-600 hover:text-slate-900 transition-colors flex items-center gap-1.5">
                  <span>🔄</span> {t("footer.reviewTour")}
                </button>
              )}
              <button onClick={() => setModalOpen({ ...modalOpen, termeni: true })}
                className="text-[11px] font-black uppercase italic text-slate-500 hover:text-amber-500 transition-colors">
                {t("footer.termeni")}
              </button>
              <button onClick={() => setModalOpen({ ...modalOpen, gdpr: true })}
                className="text-[11px] font-black uppercase italic text-slate-500 hover:text-amber-500 transition-colors">
                {t("footer.confidentialitate")}
              </button>
              <button onClick={() => setModalOpen({ ...modalOpen, cookies: true })}
                className="text-[11px] font-black uppercase italic text-slate-500 hover:text-amber-500 transition-colors">
                {t("footer.cookies")}
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-[11px] font-black text-slate-900 uppercase italic leading-tight">
                  {t("footer.premium")}
                </p>
                <p className="text-[10px] font-bold text-amber-500 uppercase italic">
                  {t("footer.management")}
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[10px] font-black text-emerald-700 uppercase italic">{t("footer.secured")}</span>
              </div>
            </div>

          </div>
        </footer>
      )}

      <GDPRModal isOpen={modalOpen.gdpr} onClose={() => setModalOpen({ ...modalOpen, gdpr: false })} />
      <TermeniModal isOpen={modalOpen.termeni} onClose={() => setModalOpen({ ...modalOpen, termeni: false })} />
      <CookiesModal isOpen={modalOpen.cookies} onClose={() => setModalOpen({ ...modalOpen, cookies: false })} />
    </>
  ) : (
    <div className="h-screen w-full flex flex-col items-center justify-center gap-6 bg-slate-50">
      <div className="w-24 h-24 flex items-center justify-center animate-bounce">
        <Image src="/logo-chronos.png" alt="Loading" width={100} height={100} priority className="object-contain" />
      </div>
      <div className="font-black italic text-slate-900 uppercase text-xs tracking-widest animate-pulse">
        {t("loading")}
      </div>
    </div>
  );
}