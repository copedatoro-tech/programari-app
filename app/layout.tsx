"use client";

// @ts-ignore
import "./globals.css";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import Script from "next/script";

import GDPRModal from "@/components/GDPRModal";
import TermeniModal from "@/components/TermeniModal";
import CookiesModal from "@/components/CookiesModal";
import { getActivePlan } from "@/app/abonamente/page";

// ─── Onboarding data per pagină ───────────────────────────────────────────────
const ONBOARDING: Record<string, {
  icon: string; titlu: string; subtitlu: string; pasi: string[]; tip?: string;
}> = {
  "/profil": {
    icon: "👤",
    titlu: "Profil Utilizator",
    subtitlu: "Primul pas important — completează toate datele afacerii tale.",
    pasi: [
      "📝 Adaugă numele afacerii tale — apare pe pagina publică de rezervări",
      "🔗 Setează slug-ul unic (ex: salon-maria) — acesta generează link-ul tău personal și codul QR pentru rezervări online",
      "📞 Adaugă telefonul și email-ul de contact — sunt datele persoanei responsabile de aplicație",
      "🖼️ Încarcă logo-ul afacerii — apare pe pagina de rezervări și în aplicație",
      "📍 Adaugă adresa — clienții o vor putea vedea pe pagina de rezervări pentru a ști unde să vină",
    ],
    tip: "Slug-ul este esențial — fără el nu se poate genera link-ul de rezervări și codul QR! Datele de contact sunt ale persoanei responsabile și pot fi accesate în caz de urgență.",
  },
  "/settings": {
    icon: "⚙️",
    titlu: "Setări Sistem",
    subtitlu: "Configurează programul de lucru și disponibilitatea.",
    pasi: [
      "🕐 Setează orele de lucru pentru fiecare zi a săptămânii — ex: Luni–Vineri 09:00–18:00",
      "🚫 Marchează zilele închise (ex: Duminică) — acestea apar vizual diferit în Calendar cu fond roșcat",
      "🔗 Generează link-ul public de rezervări și codul QR din această pagină",
      "⛔ Poți bloca manual anumite ore când nu ești disponibil puntual",
      "📱 Testează link-ul de rezervări din telefon ca să verifici că totul funcționează corect",
    ],
    tip: "Fără programul de lucru setat, toate orele apar disponibile! Zilele marcate ca închise apar cu fond roșcat în Calendar (vizualizarea pe Zi, Săptămână și Lună) și nu pot fi rezervate online.",
  },
  "/resurse": {
    icon: "📦",
    titlu: "Gestiune Servicii & Specialiști",
    subtitlu: "Adaugă echipa ta și serviciile oferite de fiecare.",
    pasi: [
      "👨‍💼 Adaugă fiecare specialist cu numele complet (și opțional telefon/email pentru notificări)",
      "✂️ Creează serviciile oferite — completează prețul și durata pentru fiecare",
      "🔗 Asociază fiecare specialist cu serviciile pe care le oferă el — aceasta filtrează automat opțiunile la programare",
      "⏱️ Durata serviciului blochează automat slotul în calendar și previne suprapunerile",
      "💰 Prețul și durata generează rapoarte detaliate de productivitate și profit per specialist",
    ],
    tip: "Asocierea specialist–serviciu este esențială! La crearea unei programări, sistemul arată doar specialiștii care oferă serviciul ales și invers. Durata și prețul sunt folosite pentru rapoarte de productivitate.",
  },
  "/programari": {
    icon: "📅",
    titlu: "Gestiune Programări",
    subtitlu: "Aici creezi programări noi și le gestionezi pe cele existente.",
    pasi: [
      "➕ Completează datele clientului (nume, telefon, email) — se salvează automat în dosarul clientului",
      "👨‍💼 Alege specialistul și serviciul oferit de acesta — lista se filtrează automat în funcție de asocierile setate",
      "📅 Selectează data și ora — sistemul blochează automat orele ocupate ale specialistului ales",
      "📎 Poți atașa documente, imagini, audio sau video relevante pentru programare",
      "✅ Programările create apar automat în Calendar și în dosarul clientului din pagina Clienți",
    ],
    tip: "Poți adăuga mai multe servicii pentru același client în aceeași sesiune — fiecare cu specialistul și ora lui! Dacă doi specialiști diferiți sunt disponibili la aceeași oră, ambele programări sunt permise.",
  },
  "/programari/calendar": {
    icon: "🗓️",
    titlu: "Calendar Programări",
    subtitlu: "Vizualizează, editează și organizează toate programările.",
    pasi: [
      "📆 Comută între Zi, Săptămână, Lună sau An — fiecare vizualizare are avantajele ei",
      "🕐 În vizualizarea pe Zi: orele din programul de lucru au fond alb, orele în afara programului au fond dungat gri — ușor de distins",
      "🚫 Zilele închise (setate în Setări) apar cu fond roșcat atât în Săptămână cât și în Lună",
      "👨‍💼 Filtrează după specialist sau serviciu pentru a vedea agenda fiecăruia separat",
      "✏️ Click pe orice programare pentru a o edita, muta sau adăuga documente",
    ],
    tip: "Mai mulți specialiști pot avea programări la aceeași oră — fiecare are agenda lui separată! Orele ocupate sunt blocate per specialist, nu per zi.",
  },
  "/clienti": {
    icon: "👥",
    titlu: "Bază Date Clienți",
    subtitlu: "Arhiva completă și dosarul fiecărui client.",
    pasi: [
      "🔄 Clienții se salvează automat din programări după numărul de telefon — nu trebuie adăugați manual",
      "📁 Fiecare client are un dosar complet: istoric programări, lucrări efectuate și fișiere atașate",
      "📎 Poți atașa fișiere, imagini, audio sau video la dosarul fiecărui client (ex: foto înainte/după, rețete, specificații)",
      "🔧 Secțiunea Lucrări calculează automat costul materialelor, profitul și marja per client",
      "🔍 Caută rapid după nume, telefon sau email",
    ],
    tip: "Dosarul clientului se actualizează automat la fiecare programare nouă! Documentele atașate la programări apar și în dosarul clientului.",
  },
  "/abonamente": {
    icon: "💎",
    titlu: "Abonamente Chronos",
    subtitlu: "Alege planul potrivit — și când să activezi trial-ul.",
    pasi: [
      "⚠️ Activează trial-ul de 10 zile DOAR după ce ai configurat complet: Profil, Setări, Servicii și Specialiști",
      "🎁 Trial-ul îți oferă acces la planul Team (nelimitat) timp de 10 zile — nu îl pierde pe setări",
      "📊 Free: 30 prog/lună · Pro: 150 · Elite: 500 · Team: nelimitat",
      "💬 Planul Elite și Team include trimitere automată de mesaje WhatsApp către clienți și specialiști",
      "🔓 Link-ul de rezervări, codul QR și rapoartele avansate sunt disponibile din planul Pro",
    ],
    tip: "Nu activa trial-ul înainte să configurezi aplicația — altfel pierzi zile prețioase din cele 10! Configurează totul mai întâi, apoi activează.",
  },
  "/rapoarte": {
    icon: "📊",
    titlu: "Analiză & Rapoarte",
    subtitlu: "Monitorizează performanța afacerii tale în timp real.",
    pasi: [
      "📈 Vezi numărul de programări per zi, săptămână sau lună",
      "💰 Analizează veniturile și profitul per serviciu și per specialist",
      "⭐ Urmărește rata programărilor online vs. față în față",
      "📉 Identifică zilele și orele cu cea mai mare activitate pentru a optimiza programul",
      "🔧 Rapoartele sunt mai detaliate dacă ai setat prețul și durata pentru fiecare serviciu în Gestiune Servicii",
    ],
    tip: "Cu cât prețul și durata serviciilor sunt setate corect, cu atât rapoartele de productivitate și profit sunt mai relevante!",
  },
  "/sugestii": {
    icon: "⭐",
    titlu: "Recenzii Clienți",
    subtitlu: "Gestionează reputația afacerii tale online.",
    pasi: [
      "⭐ Vezi toate recenziile lăsate de clienți prin pagina publică de rezervări",
      "➕ Poți adăuga manual recenzii de la clienți fideli care nu au lăsat feedback online",
      "📈 Cu cât ai mai multe recenzii pozitive, cu atât pagina ta de rezervări atrage mai mulți clienți noi",
      "💬 Recenziile sunt vizibile pe pagina publică de rezervări a afacerii tale",
      "🌟 Scorul mediu din recenzii influențează încrederea clienților noi în afacerea ta",
    ],
    tip: "Cere clienților mulțumiți să lase o recenzie după fiecare vizită — fiecare stea contează pentru atragerea clienților noi!",
  },
  "/contacte-utile": {
    icon: "📞",
    titlu: "Contacte Utile",
    subtitlu: "Agenda ta de contacte profesionale și de urgență.",
    pasi: [
      "🏭 Salvează numerele furnizorilor de produse și materiale pentru comenzi rapide",
      "🔧 Adaugă contactele tehnicienilor, instalatorilor, partenerilor sau colaboratorilor",
      "⚡ Acces rapid în situații de urgență — panaje, defecțiuni, aprovizionări de urgență",
      "📋 Această pagină este separată de clienți — clienții se găsesc automat în pagina Clienți",
      "👤 Poți salva aici și datele persoanei responsabile de aplicație pentru contact rapid în caz de urgență",
    ],
    tip: "Contactele utile sunt pentru furnizorii și partenerii tăi profesionali — nu pentru clienți! Clienții se salvează automat din programări în pagina dedicată.",
  },
};

// ─── Componenta Onboarding Modal ──────────────────────────────────────────────
function OnboardingModal({ path, onClose }: { path: string; onClose: () => void }) {
  const data = ONBOARDING[path];
  if (!data) return null;

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
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 28, overflow: "hidden",
          width: "100%", maxWidth: 480, maxHeight: "90vh",
          boxShadow: "0 32px 80px rgba(0,0,0,0.3)",
          animation: "slideUp 0.25s ease",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ background: "#0f172a", padding: "20px 22px 16px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                {data.icon}
              </div>
              <div>
                <p style={{ fontSize: 8, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>Ghid Chronos</p>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0, fontStyle: "italic", textTransform: "uppercase" }}>{data.titlu}</h2>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center" }}
              className="hover:bg-red-500 hover:text-white transition-all">✕</button>
          </div>
          <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, fontWeight: 600 }}>{data.subtitlu}</p>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {data.pasi.map((pas, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#f8fafc", borderRadius: 12, padding: "10px 12px", border: "1.5px solid #e2e8f0" }}>
                <span style={{ width: 22, height: 22, borderRadius: 7, background: "#0f172a", color: "#f59e0b", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                <p style={{ fontSize: 12, color: "#334155", fontWeight: 600, margin: 0, lineHeight: 1.5 }}>{pas}</p>
              </div>
            ))}
          </div>

          {/* Tip important */}
          {data.tip && (
            <div style={{ background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
              <p style={{ fontSize: 11, color: "#92400e", fontWeight: 700, margin: 0, lineHeight: 1.5 }}>{data.tip}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1.5px solid #f1f5f9", flexShrink: 0, display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", background: "#0f172a", border: "none", borderRadius: 14, fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer", textTransform: "uppercase", fontStyle: "italic" }}
            className="hover:bg-amber-600 transition-all">
            Am înțeles — să începem! 🚀
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── RootLayout ───────────────────────────────────────────────────────────────
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();

  const [authLoaded, setAuthLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activePlan, setActivePlan] = useState<string>("CHRONOS FREE");
  const [showOnboarding, setShowOnboarding] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState({ gdpr: false, termeni: false, cookies: false });

  const isPublicPage =
    path === "/login" ||
    path === "/" ||
    path === "/register" ||
    path === "/forgot-password" ||
    (path && path.startsWith("/rezervare"));

  // ─── Onboarding: verificăm dacă pagina curentă a fost văzută ────────────────
  useEffect(() => {
    if (!isLoggedIn || isPublicPage || !path) return;
    if (!ONBOARDING[path]) return;

    const key = `chronos_onboarding_${path.replace(/\//g, "_")}`;
    const seen = localStorage.getItem(key);
    if (!seen) {
      // Mică întârziere ca să nu apară brusc
      const t = setTimeout(() => setShowOnboarding(true), 600);
      return () => clearTimeout(t);
    }
  }, [path, isLoggedIn, isPublicPage]);

  const closeOnboarding = useCallback(() => {
    setShowOnboarding(false);
    const key = `chronos_onboarding_${path.replace(/\//g, "_")}`;
    localStorage.setItem(key, "1");
  }, [path]);

  const getPageTitle = useCallback(() => {
    switch (path) {
      case "/programari":          return "Programări";
      case "/programari/calendar": return "Calendar Programări";
      case "/clienti":             return "Clienți";
      case "/resurse":             return "Servicii & Specialiști";
      case "/abonamente":          return "Abonamente";
      case "/rapoarte":            return "Analiză & Rapoarte";
      case "/sugestii":            return "Recenzii Clienți";
      case "/settings":            return "Setări Sistem";
      case "/profil":              return "Profil Utilizator";
      case "/contacte-utile":      return "Contacte Utile";
      default:                     return "Dashboard Chronos";
    }
  }, [path]);

  useEffect(() => {
    if (isPublicPage) { setAuthLoaded(true); return; }
    let mounted = true;
    const syncAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          setIsLoggedIn(true);
          getActivePlan(supabase, session.user.id)
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
          getActivePlan(supabase, session.user.id)
            .then((plan) => { if (mounted) setActivePlan(plan); })
            .catch(() => {});
        }
      }
    );
    return () => { mounted = false; subscription?.unsubscribe(); };
  }, [path]);

  useEffect(() => {
    if (authLoaded && !isLoggedIn && !isPublicPage) router.replace("/login");
  }, [authLoaded, isLoggedIn, isPublicPage, router]);

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

  return (
    <html lang="ro">
      <head>
        <Script id="fb-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1181507873348855');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img height="1" width="1" style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1181507873348855&ev=PageView&noscript=1" />
        </noscript>
      </head>
      <body className="antialiased bg-slate-50 min-h-screen flex flex-col font-sans text-slate-900">
        {authLoaded ? (
          <>
            {/* ── Onboarding modal per pagină ─────────────────────────────── */}
            {false && showOnboarding && isLoggedIn && (
              <OnboardingModal path={path} onClose={closeOnboarding} />
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
                    <Link href="/abonamente"
                      className="hidden md:flex flex-col items-end px-4 py-1.5 rounded-[15px] bg-slate-50 border border-slate-100 hover:border-amber-500 transition-all group">
                      <span className="text-[7px] font-black uppercase tracking-tighter text-slate-400 group-hover:text-amber-600 transition-colors">Abonament Activ</span>
                      <span className="text-[10px] font-black italic uppercase text-slate-900 group-hover:text-amber-500 transition-colors">{activePlan}</span>
                    </Link>

                    <div className="relative" ref={menuRef}>
                      <button onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`px-4 md:px-5 py-2 rounded-xl font-black text-[10px] uppercase italic tracking-widest transition-all border-b-2 active:translate-y-0.5 active:border-b-0 ${
                          isMenuOpen ? "bg-amber-500 border-amber-700 text-white" : "bg-slate-900 border-slate-700 text-white hover:bg-slate-800"
                        }`}>
                        {isMenuOpen ? "ÎNCHIDE ✕" : "MENIU ☰"}
                      </button>

                      {isMenuOpen && (
                        <div className="absolute top-full mt-3 right-0 w-64 bg-white border-2 border-slate-900 rounded-[25px] shadow-2xl p-2 z-[110]">
                          <div className="space-y-0.5 max-h-[70vh] overflow-y-auto scrollbar-none">
                            {[
                              { href: "/programari",          icon: "📅", label: "Programări" },
                              { href: "/programari/calendar", icon: "🗓️", label: "Calendar" },
                              { href: "/clienti",             icon: "👥", label: "Clienți" },
                              { href: "/resurse",             icon: "📦", label: "Gestiune Servicii" },
                              { href: "/abonamente",          icon: "💎", label: "Abonamente" },
                              { href: "/rapoarte",            icon: "📊", label: "Analiză & Rapoarte" },
                              { href: "/sugestii",            icon: "⭐", label: "Recenzii" },
                              { href: "/contacte-utile",      icon: "📞", label: "Contacte Utile" },
                              { href: "/settings",            icon: "⚙️", label: "Setări" },
                              { href: "/profil",              icon: "👤", label: "Profil" },
                            ].map((item) => (
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
                            <span>🚪</span> IEȘIRE SISTEM
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

                  {/* Stânga: Logo + Contact */}
                  <div className="flex items-center gap-4">
                    <Image src="/logo-chronos.png" alt="Logo Footer" width={52} height={52} priority className="object-contain" />
                    <div className="flex flex-col">
                      <span className="font-black italic uppercase text-sm text-slate-900 leading-tight tracking-tight">
                        CHRONOS<span className="text-amber-500">.</span>
                      </span>
                      <span className="text-[11px] font-bold text-slate-400 mt-0.5">Contact Chronos</span>
                      <a href="mailto:copedatoro@gmail.com"
                        className="text-[11px] font-bold text-amber-600 hover:text-slate-900 transition-colors">
                        copedatoro@gmail.com
                      </a>
                    </div>
                  </div>

                  {/* Centru: Legal */}
                  <div className="flex items-center gap-6">
                    <button onClick={() => setModalOpen({ ...modalOpen, termeni: true })}
                      className="text-[11px] font-black uppercase italic text-slate-500 hover:text-amber-500 transition-colors">
                      Termeni
                    </button>
                    <button onClick={() => setModalOpen({ ...modalOpen, gdpr: true })}
                      className="text-[11px] font-black uppercase italic text-slate-500 hover:text-amber-500 transition-colors">
                      Confidențialitate
                    </button>
                    <button onClick={() => setModalOpen({ ...modalOpen, cookies: true })}
                      className="text-[11px] font-black uppercase italic text-slate-500 hover:text-amber-500 transition-colors">
                      Cookies
                    </button>
                  </div>

                  {/* Dreapta: Brand + Secured */}
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-[11px] font-black text-slate-900 uppercase italic leading-tight">
                        CHRONOS PREMIUM
                      </p>
                      <p className="text-[10px] font-bold text-amber-500 uppercase italic">
                        MANAGEMENT
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[10px] font-black text-emerald-700 uppercase italic">SECURED</span>
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
              Sincronizare Chronos...
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
