"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase"; 

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isStaticCustomerPage = path.startsWith("/rezervare") || 
                               path === "/termeni" || 
                               path === "/confidentialitate" || 
                               path === "/cookies";

  // 1. GESTIONARE SESIUNE + PROTECȚIE RUTE
  useEffect(() => {
    let mounted = true;

    const syncAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        const loggedIn = !!session;
        setIsLoggedIn(loggedIn);
        setAuthLoaded(true);

        const params = new URLSearchParams(window.location.search);
        const isDemo = params.get("demo") === "true";
        setIsDemoMode(isDemo);

        const strictAdminRoutes = ["/programari", "/dosare-clienti", "/contacte-utile", "/abonamente", "/rapoarte", "/setari", "/profil", "/resurse", "/sugestii"];
        const isTryingToAccessStrictAdmin = strictAdminRoutes.some(route => path.startsWith(route));

        if (loggedIn && (path === "/login" || path === "/register")) {
          router.replace("/profil");
        } else if (!loggedIn && isTryingToAccessStrictAdmin && !isDemo) {
          router.replace("/login");
        }
      } catch (error) {
        console.error("Auth sync error:", error);
      }
    };

    syncAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        const loggedIn = !!session;
        setIsLoggedIn(loggedIn);
        if (loggedIn && (path === "/login" || path === "/register")) {
          router.replace("/profil");
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [path, router]);

  // 2. ÎNCHIDERE LA CLICK EXTERIOR + PATH CHANGE
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [path]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const nav = [
    { n: "📅 Programări", h: "/programari" },
    { n: "📂 Dosare Clienți", h: "/dosare-clienti" },
    { n: "🛠️ Servicii & Staff", h: "/resurse" },
    { n: "📊 Rapoarte Analitice", h: "/rapoarte" },
    { n: "👥 Contacte Utile", h: "/contacte-utile" },
    { n: "⭐ Recenzii & Sugestii", h: "/sugestii" },
    { n: "💎 Abonamente", h: "/abonamente" },
    { n: "⚙️ Setări", h: "/setari" },
  ];

  const currentPageLabel = [...nav, { n: "👤 Profil", h: "/profil" }].find(item => path === item.h || path.startsWith(item.h + "/"))?.n || "Chronos";

  return (
    <html lang="ro">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f59e0b" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/> 
        <title>Chronos - Management Profesional</title>
      </head>
      
      <body className="antialiased bg-slate-50 min-h-screen font-sans flex flex-col text-slate-900">
        
        {isDemoMode && !isLoggedIn && (
          <div className="bg-slate-900 text-white text-[10px] font-black py-2.5 px-4 text-center uppercase tracking-[0.2em] sticky top-0 z-[110] border-b border-amber-500/30">
            <span className="text-amber-500">●</span> Mod Previzualizare Activ <span className="mx-2 text-slate-700">|</span> 
            <Link 
              href="/login?view=sign_up" 
              title="Creează un cont pentru a salva datele"
              className="text-amber-400 hover:text-white transition-colors underline underline-offset-4"
            >
              Salvează-ți agenda creată acum →
            </Link>
          </div>
        )}

        <nav className={`w-full bg-white border-b-2 border-slate-100 sticky ${isDemoMode && !isLoggedIn ? 'top-[35px]' : 'top-0'} z-[100] shadow-sm`} ref={menuRef}>
          <div className="px-4 py-3 flex items-center justify-between gap-2 max-w-[1400px] mx-auto">
            
            <div className="flex items-center gap-2 md:gap-3 pointer-events-none select-none">
              <div className="w-10 h-10 md:w-11 md:h-11 relative rounded-xl overflow-hidden border border-slate-100 bg-white shadow-sm">
                <Image 
                  src="/logo-chronos.png" 
                  alt="Logo Chronos" 
                  fill 
                  sizes="(max-width: 768px) 44px, 44px"
                  style={{ objectFit: 'cover' }} 
                  className="scale-150" 
                  priority 
                />
              </div>
              <h1 className="text-lg md:text-xl font-black italic uppercase tracking-tighter text-slate-900">
                CHRONOS<span className="text-amber-500">.</span>
              </h1>
            </div>

            {(isLoggedIn || isDemoMode) && !isStaticCustomerPage && (
              <div className="flex-1 flex justify-center px-2">
                <span className="bg-slate-50 px-4 py-1.5 rounded-full text-[9px] md:text-xs font-black uppercase italic text-amber-600 border border-slate-200 tracking-widest text-center">
                  {isDemoMode && !isLoggedIn ? "Calendar Demo" : currentPageLabel}
                </span>
              </div>
            )}

            <div className="flex items-center">
              {isLoggedIn ? (
                <button 
                  title={isMenuOpen ? "Închide meniul" : "Deschide meniul principal Chronos"}
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase italic transition-all border-2 flex items-center gap-2
                    ${isMenuOpen ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 shadow-sm'}`}
                >
                  {isMenuOpen ? "ÎNCHIDE ✕" : "MENIU ☰"}
                </button>
              ) : isDemoMode ? (
                <Link 
                  title="Creează un cont nou pentru a salva datele"
                  href="/login?view=sign_up"
                  className="px-4 py-2 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase italic hover:bg-slate-900 transition-all shadow-lg border-2 border-amber-400 animate-pulse"
                >
                  ✨ CREEAZĂ CONT
                </Link>
              ) : (
                <button 
                  title="Testează funcționalitățile platformei fără cont"
                  onClick={() => router.push("/programari?demo=true")}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase italic hover:bg-amber-500 transition-all shadow-md flex items-center gap-2"
                >
                  🚀 TESTEAZĂ DEMO
                </button>
              )}
            </div>
          </div>

          {isLoggedIn && isMenuOpen && (
            <div className="absolute top-[calc(100%+8px)] right-4 w-[calc(100%-32px)] max-w-[400px] bg-white border border-slate-100 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] animate-in fade-in zoom-in-95 duration-200 z-[99] overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-3 grid grid-cols-1 gap-1.5 overflow-y-auto scrollbar-hide">
                <div className="px-4 py-2 mb-1 border-b border-slate-50 sticky top-0 bg-white z-10">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300 italic">Administrare Sistem</p>
                </div>
                
                {nav.map((l) => (
                  <Link 
                    key={l.h} 
                    href={l.h} 
                    onClick={() => setIsMenuOpen(false)}
                    title={`Spre pagina ${l.n}`}
                    className={`w-full p-4 rounded-[20px] font-black text-[11px] uppercase italic transition-all flex items-center justify-between ${path === l.h ? "bg-amber-500 text-white shadow-lg shadow-amber-200" : "bg-white text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-100"}`}
                  >
                    {l.n}
                    <span className="opacity-30 text-[10px]">→</span>
                  </Link>
                ))}
                
                <div className="mt-2 pt-2 border-t border-slate-50">
                  <p className="px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-300 italic">Contul Meu</p>
                  <Link 
                    href="/profil" 
                    onClick={() => setIsMenuOpen(false)}
                    title="Vizualizează profilul tău de utilizator"
                    className={`w-full p-4 rounded-[20px] font-black text-[11px] uppercase italic transition-all flex items-center justify-between ${path === "/profil" ? "bg-amber-500 text-white shadow-lg" : "bg-slate-50 text-slate-900 hover:bg-amber-100"}`}
                  >
                    👤 Profil Utilizator
                    <span className="opacity-30 text-[10px]">→</span>
                  </Link>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-50 sticky bottom-0 bg-white z-10">
                  <button 
                    onClick={handleLogout} 
                    title="Deconectează-te de la sistem"
                    className="w-full p-4 rounded-[20px] font-black text-[11px] uppercase italic transition-all flex items-center justify-between bg-red-50/50 text-red-500 hover:bg-red-500 hover:text-white group"
                  >
                    Ieșire din cont 🚪
                  </button>
                </div>
              </div>
            </div>
          )}
        </nav>

        <main className="flex-grow">
          {children}
        </main>

        <footer className="bg-white border-t border-slate-200 mt-6">
          <div className="max-w-[1400px] mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 relative bg-slate-50 rounded-lg border border-slate-100 p-0.5 shadow-inner">
                  <Image 
                    src="/logo-chronos.png" 
                    alt="Logo Suport" 
                    fill 
                    sizes="36px"
                    style={{ objectFit: 'cover' }}
                    className="scale-125" 
                  />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-black text-slate-900 uppercase italic leading-none mb-1">Suport Tehnic</span>
                  <a 
                    href="mailto:copedatoro@gmail.com" 
                    title="Trimite un e-mail către suport"
                    className="text-[12px] font-bold text-amber-600 hover:text-amber-700 underline underline-offset-2 transition-all"
                  >
                    copedatoro@gmail.com
                  </a>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
                <Link href="/sugestii" title="Trimite-ne o sugestie" className="text-[10px] font-black text-amber-600 uppercase tracking-widest hover:text-amber-700">Sugestii ⭐</Link>
                <Link href="/termeni" title="Vezi termenii și condițiile" className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-amber-600">Termeni</Link>
                <Link href="/confidentialitate" title="Politica de confidențialitate" className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-amber-600">Confidențialitate</Link>
                <Link href="/cookies" title="Politica de cookies" className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-amber-600">Cookies</Link>
              </div>
              <p className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.2em]">© 2026 Chronos System</p>
          </div>
        </footer>
      </body>
    </html>
  );
}