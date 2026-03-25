"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// Configurare Supabase
const SUPABASE_URL = "https://zzrubdbngjfwurdwxtwf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6cnViZGJuZ2pmd3VyZHd4dHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDkyMTgsImV4cCI6MjA4ODQ4NTIxOH0.6uw6yzCs5OfCP7xqWshzPQP36bCPxi2LU0QtpwsvnOo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isStaticCustomerPage = path.startsWith("/rezervare") || 
                               path === "/termeni" || 
                               path === "/confidentialitate" || 
                               path === "/cookies";

  const shouldHideMenu = isStaticCustomerPage || 
                        ((path === "/sugestii" || path === "/resurse") && !isLoggedIn);

  // 1. GESTIONARE SESIUNE + DEMO + SERVICE WORKER
  useEffect(() => {
    const checkInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    
    // Verificăm dacă URL-ul conține parametrul demo
    const checkDemoStatus = () => {
      const params = new URLSearchParams(window.location.search);
      setIsDemoMode(params.get("demo") === "true");
    };

    checkInitialSession();
    checkDemoStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js').then(
          function(registration) { console.log('Chronos SW active:', registration.scope); },
          function(err) { console.log('Chronos SW fail:', err); }
        );
      });
    }

    return () => subscription.unsubscribe();
  }, [path]); // Re-verificăm la schimbarea paginii

  // 2. PROTECȚIE RUTE ADMIN (PERMISIVĂ PENTRU DEMO)
  useEffect(() => {
    const verifyAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams(window.location.search);
      const isDemo = params.get("demo") === "true";
      
      const strictAdminRoutes = ["/programari", "/dosare-clienti", "/contacte-utile", "/abonamente", "/rapoarte", "/setari", "/profil"];
      const isTryingToAccessStrictAdmin = strictAdminRoutes.some(route => path.startsWith(route));

      // DACĂ e rută privată ȘI NU are sesiune ȘI NU e demo -> trimite la LOGIN
      if (isTryingToAccessStrictAdmin && !session && !isDemo) {
        router.push("/login");
      }
    };

    verifyAccess();
    setIsMenuOpen(false);
  }, [path, router]);

  // 3. ÎNCHIDERE MENIU LA CLICK ÎN EXTERIOR
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = `${window.location.origin}/login`;
  };

  const handleDemoMode = () => {
    router.push("/programari?demo=true");
  };

  // NAVIGAȚIE
  const nav = [
    { n: "📅 Programări", h: "/programari" },
    { n: "📂 Dosare Clienți", h: "/dosare-clienti" },
    { n: "🛠️ Servicii & Staff", h: "/resurse" },
    { n: "📊 Rapoarte Analitice", h: "/rapoarte" },
    { n: "👥 Contacte Utile", h: "/contacte-utile" },
    { n: "⭐ Recenzii & Sugestii", h: "/sugestii" },
    { n: "💎 Abonamente", h: "/abonamente" },
    { n: "⚙️ Setări", h: "/setari" },
    { n: "👤 Profil", h: "/profil" },
  ];

  const currentPage = nav.find(item => path === item.h || path.startsWith(item.h + "/"))?.n || "Chronos";

  return (
    <html lang="ro">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f59e0b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/logo-chronos.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/> 
        <title>Chronos - Management Profesional</title>
      </head>
      
      <body className="antialiased bg-slate-50 min-h-screen font-sans flex flex-col text-slate-900">
        
        {/* BANNER MOD DEMO - Vizibil doar în mod demo pentru a converti vizitatorii */}
        {isDemoMode && !isLoggedIn && (
          <div className="bg-amber-600 text-white text-[10px] font-black py-2 px-4 text-center uppercase tracking-widest sticky top-0 z-[110] animate-pulse">
            Ești în modul Demo. Datele nu se salvează. 
            <Link href="/login" className="ml-3 underline decoration-white underline-offset-2 hover:text-slate-900 transition-colors">
              Creează cont gratuit acum →
            </Link>
          </div>
        )}

        <nav className={`w-full bg-white border-b-2 border-slate-100 sticky ${isDemoMode && !isLoggedIn ? 'top-[30px]' : 'top-0'} z-[100] shadow-sm`} ref={menuRef}>
          <div className="px-4 py-3 flex items-center justify-between gap-2 max-w-[1400px] mx-auto">
            
            {/* BRANDING */}
            <div className="flex items-center gap-2 md:gap-3 pointer-events-none select-none touch-none">
              <div className="w-10 h-10 md:w-11 md:h-11 relative rounded-xl overflow-hidden border border-slate-100 bg-white shadow-sm">
                <Image src="/logo-chronos.png" alt="Logo" fill className="object-cover scale-150" priority />
              </div>
              <h1 className="text-lg md:text-xl font-black italic uppercase tracking-tighter text-slate-900">
                CHRONOS<span className="text-amber-500">.</span>
              </h1>
            </div>

            {/* Indicator Pagină */}
            {(isLoggedIn || isDemoMode) && !isStaticCustomerPage && (
              <div className="flex-1 flex justify-center px-2">
                <span className="bg-slate-50 px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase italic text-amber-600 border border-slate-200 tracking-widest text-center">
                  {currentPage} {isDemoMode && !isLoggedIn && "(DEMO)"}
                </span>
              </div>
            )}

            {/* Buton Meniu / Demo */}
            <div className="flex items-center">
              {!shouldHideMenu && (
                (isLoggedIn || (isDemoMode && path !== "/login")) ? (
                  <button 
                    title="Meniu Principal"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={`px-4 py-2 rounded-xl font-black text-[11px] uppercase italic transition-all border-2
                      ${isMenuOpen ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 shadow-sm'}`}
                  >
                    {isMenuOpen ? "ÎNCHIDE ✕" : "MENIU ☰"}
                  </button>
                ) : (
                  (path !== "/sugestii" && path !== "/resurse") && (
                    <button 
                      onClick={handleDemoMode}
                      className="px-5 py-2 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase italic hover:bg-slate-900 transition-all shadow-md tracking-tighter"
                    >
                      🚀 Testează Demo
                    </button>
                  )
                )
              )}
            </div>
          </div>

          {/* Meniu Dropdown */}
          {(isLoggedIn || isDemoMode) && isMenuOpen && (
            <div className="absolute top-[calc(100%+8px)] right-4 w-[calc(100%-32px)] max-w-[400px] bg-white border border-slate-100 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] animate-in fade-in zoom-in-95 duration-200 z-[99] overflow-hidden">
              <div className="p-3 grid grid-cols-1 gap-1.5">
                <div className="px-4 py-2 mb-1 border-b border-slate-50">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300 italic">Navigație Sistem</p>
                </div>
                {nav.map((l) => (
                  <Link 
                    key={l.h} 
                    href={isLoggedIn ? l.h : `${l.h}?demo=true`} 
                    title={l.n}
                    className={`w-full p-4 rounded-[20px] font-black text-[11px] uppercase italic transition-all flex items-center justify-between ${path === l.h ? "bg-amber-500 text-white shadow-lg shadow-amber-200" : "bg-white text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-100"}`}
                  >
                    {l.n}
                    <span className="opacity-30 text-[10px]">→</span>
                  </Link>
                ))}
                <div className="mt-2 pt-2 border-t border-slate-50">
                  {isLoggedIn ? (
                    <button onClick={handleLogout} className="w-full p-4 rounded-[20px] font-black text-[11px] uppercase italic transition-all flex items-center justify-between bg-red-50/50 text-red-500 hover:bg-red-500 hover:text-white group">
                      Ieșire din cont 🚪
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">Deconectare</span>
                    </button>
                  ) : (
                    <Link href="/login" className="w-full p-4 rounded-[20px] font-black text-[11px] uppercase italic transition-all flex items-center justify-between bg-slate-900 text-white hover:bg-amber-600">
                      Creează cont oficial 💎
                      <span>→</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </nav>

        <main className="flex-grow">
          {children}
        </main>

        <footer className="bg-white border-t border-slate-200 mt-6">
          {/* ... footer-ul ramane neschimbat ... */}
          <div className="max-w-[1400px] mx-auto px-6 py-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3 group">
                <div className="w-9 h-9 relative bg-slate-50 rounded-lg border border-slate-100 p-0.5 shadow-inner transition-transform group-hover:rotate-3">
                  <Image src="/logo-chronos.png" alt="Logo Support" fill className="object-cover scale-125" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-900 uppercase italic leading-none mb-1">Suport Tehnic</span>
                  <a href="mailto:copedatoro@gmail.com" className="text-[12px] font-bold text-amber-600 hover:text-amber-700 underline decoration-amber-200 underline-offset-2 transition-all">
                    copedatoro@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 py-2 md:py-0">
                <Link href="/sugestii" className="text-[10px] font-black text-amber-600 uppercase tracking-widest hover:text-amber-700 transition-colors">
                  Sugestii ⭐
                </Link>
                <Link href="/termeni" className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-amber-600 transition-colors">
                  Termeni
                </Link>
                <Link href="/confidentialitate" className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-amber-600 transition-colors">
                  Confidențialitate
                </Link>
                <Link href="/cookies" className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-amber-600 transition-colors">
                  Cookies
                </Link>
              </div>

              <div className="flex flex-col items-center md:items-end gap-1">
                <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-full border border-slate-100 shadow-sm">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Online</span>
                </div>
                <p className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.2em]">
                  © 2026 Chronos System
                </p>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}