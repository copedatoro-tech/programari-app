"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";

import GDPRModal from "@/components/GDPRModal";
import TermeniModal from "@/components/TermeniModal";
import CookiesModal from "@/components/CookiesModal";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { getActivePlan } from "@/app/[locale]/abonamente/page";

// ─── Onboarding Modal ──────────────────────────────────────────────────────
function OnboardingModal({
  path,
  onClose,
  t,
}: {
  path: string;
  onClose: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const KEY_BY_PATH: Record<string, string> = {
    "/profil": "profil",
    "/settings": "settings",
    "/resurse": "resurse",
    "/programari": "programari",
    "/programari/calendar": "calendar",
    "/clienti": "clienti",
    "/abonamente": "abonamente",
    "/rapoarte": "rapoarte",
    "/sugestii": "sugestii",
    "/contacte-utile": "contacteUtile",
  };
  const key = KEY_BY_PATH[path];
  if (!key) return null;

  const ICONS: Record<string, string> = {
    profil: "👤", settings: "⚙️", resurse: "📦", programari: "📅",
    calendar: "🗓️", clienti: "👥", abonamente: "💎", rapoarte: "📊",
    sugestii: "⭐", contacteUtile: "📞",
  };

  const titlu = t(`onboarding.${key}.titlu`);
  const subtitlu = t(`onboarding.${key}.subtitlu`);
  const tip = t(`onboarding.${key}.tip`);
  const pasi = t.raw(`onboarding.${key}.pasi`) as string[];

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(15,23,42,0.85)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        animation: "fadeIn 0.2s ease",
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUp { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 28, overflow: "hidden",
          width: "100%", maxWidth: 480, maxHeight: "90vh",
          boxShadow: "0 32px 80px rgba(0,0,0,0.3)",
          animation: "slideUp 0.25s ease",
          display: "flex", flexDirection: "column",
        }}
      >
        <div style={{ background: "#0f172a", padding: "20px 22px 16px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                {ICONS[key]}
              </div>
              <div>
                <p style={{ fontSize: 8, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>
                  {t("onboarding.badge")}
                </p>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0, fontStyle: "italic", textTransform: "uppercase" }}>{titlu}</h2>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center" }}
              className="hover:bg-red-500 hover:text-white transition-all">✕</button>
          </div>
          <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, fontWeight: 600 }}>{subtitlu}</p>
        </div>

        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {pasi.map((pas, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#f8fafc", borderRadius: 12, padding: "10px 12px", border: "1.5px solid #e2e8f0" }}>
                <span style={{ width: 22, height: 22, borderRadius: 7, background: "#0f172a", color: "#f59e0b", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                <p style={{ fontSize: 12, color: "#334155", fontWeight: 600, margin: 0, lineHeight: 1.5 }}>{pas}</p>
              </div>
            ))}
          </div>

          {tip && (
            <div style={{ background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
              <p style={{ fontSize: 11, color: "#92400e", fontWeight: 700, margin: 0, lineHeight: 1.5 }}>{tip}</p>
            </div>
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1.5px solid #f1f5f9", flexShrink: 0, display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", background: "#0f172a", border: "none", borderRadius: 14, fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer", textTransform: "uppercase", fontStyle: "italic" }}
            className="hover:bg-amber-600 transition-all">
            {t("onboarding.understood")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── RootLayoutClient ──────────────────────────────────────────────────────
export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const t = useTranslations("layout");
  const path = usePathname();
  const router = useRouter();

  const [authLoaded, setAuthLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activePlan, setActivePlan] = useState<string>("CHRONOS FREE");
  const [showOnboarding, setShowOnboarding] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState({ gdpr: false, termeni: false, cookies: false });

  const ONBOARDING_PATHS = [
    "/profil", "/settings", "/resurse", "/programari", "/programari/calendar",
    "/clienti", "/abonamente", "/rapoarte", "/sugestii", "/contacte-utile",
  ];

  const isPublicPage =
    path === "/login" ||
    path === "/" ||
    path === "/register" ||
    path === "/forgot-password" ||
    (path && path.startsWith("/rezervare"));

  useEffect(() => {
    if (!isLoggedIn || isPublicPage || !path) return;
    if (!ONBOARDING_PATHS.includes(path)) return;

    const key = `chronos_onboarding_${path.replace(/\//g, "_")}`;
    const seen = localStorage.getItem(key);
    if (!seen) {
      const timer = setTimeout(() => setShowOnboarding(true), 600);
      return () => clearTimeout(timer);
    }
  }, [path, isLoggedIn, isPublicPage]);

  const closeOnboarding = useCallback(() => {
    setShowOnboarding(false);
    const key = `chronos_onboarding_${path.replace(/\//g, "_")}`;
    localStorage.setItem(key, "1");
  }, [path]);

  const getPageTitle = useCallback(() => {
    switch (path) {
      case "/programari":          return t("pageTitles.programari");
      case "/programari/calendar": return t("pageTitles.calendar");
      case "/clienti":             return t("pageTitles.clienti");
      case "/resurse":             return t("pageTitles.resurse");
      case "/abonamente":          return t("pageTitles.abonamente");
      case "/rapoarte":            return t("pageTitles.rapoarte");
      case "/sugestii":            return t("pageTitles.sugestii");
      case "/settings":            return t("pageTitles.settings");
      case "/profil":              return t("pageTitles.profil");
      case "/contacte-utile":      return t("pageTitles.contacteUtile");
      default:                     return t("pageTitles.dashboard");
    }
  }, [path, t]);

  useEffect(() => {
    if (isPublicPage) { setAuthLoaded(true); return; }
    let mounted = true;
    const syncAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          setIsLoggedIn(true);
          getActivePlan(supabase, session.user.id, t("trialSuffix"))
            .then((plan) => { if (mounted) setActivePlan(plan); })
            .catch(() => {});
        } else {
          setIsLoggedIn(false);
        }
      } catch {
        // ignorăm
      } finally {
        if (mounted) setAuthLoaded(true);
      }
    };
    syncAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setIsLoggedIn(!!session);
        setAuthLoaded(true);
        if (session?.user) {
          getActivePlan(supabase, session.user.id, t("trialSuffix"))
            .then((plan) => { if (mounted) setActivePlan(plan); })
            .catch(() => {});
        }
      }
    );
    return () => { mounted = false; subscription?.unsubscribe(); };
  }, [path]);

  // ✅ Eliminat: redirect dublu către /login. Middleware.ts verifică deja
  // sesiunea la nivel de server și redirecționează corect — verificarea
  // din React aici intra în conflict cu el (buclă /programari ↔ /login).

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

  const menuItems = [
    { href: "/programari",          icon: "📅", label: t("nav.programari") },
    { href: "/programari/calendar", icon: "🗓️", label: t("nav.calendar") },
    { href: "/clienti",             icon: "👥", label: t("nav.clienti") },
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
      {false && showOnboarding && isLoggedIn && (
        <OnboardingModal path={path} onClose={closeOnboarding} t={t} />
      )}

      {isPublicPage && path !== "/" && !path?.startsWith("/rezervare") && (
        <div className="fixed top-4 right-4 z-[700]">
          <LocaleSwitcher />
        </div>
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
                className="hidden md:flex flex-col items-end px-4 py-1.5 rounded-[15px] bg-slate-50 border border-slate-100 hover:border-amber-500 transition-all group">
                <span className="text-[7px] font-black uppercase tracking-tighter text-slate-400 group-hover:text-amber-600 transition-colors">{t("header.abonamentActiv")}</span>
                <span className="text-[10px] font-black italic uppercase text-slate-900 group-hover:text-amber-500 transition-colors">{activePlan}</span>
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

            <div className="flex items-center gap-6">
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