"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import "./globals.css";

// IMPORTURI CORECTATE: Fiind în același folder 'app', folosim ./components/
import GDPRModal from "./components/GDPRModal";
import TermeniModal from "./components/TermeniModal";
import CookiesModal from "./components/CookiesModal";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [authLoaded, setAuthLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Stări pentru controlul modalelor
  const [modalOpen, setModalOpen] = useState({
    gdpr: false,
    termeni: false,
    cookies: false,
  });

  const getPageTitle = () => {
    switch (path) {
      case "/programari": return "Programări";
      case "/programari/calendar": return "Calendar Programări";
      case "/dosare-clienti": return "Dosare Clienți";
      case "/resurse": return "Resurse";
      case "/abonamente": return "Abonamente";
      case "/rapoarte": return "Analiză & Rapoarte";
      case "/sugestii": return "Sugestii Sistem";
      case "/setari": return "Setări";
      case "/profil": return "Profil Utilizator";
      default: return "Sistem Chronos";
    }
  };

  const isPublicPage = 
    path === "/login" || 
    path === "/" || 
    path === "/register" || 
    path === "/forgot-password";

  useEffect(() => {
    const syncAuth = async () => {
      if (!supabase || typeof supabase.auth === 'undefined') {
        setAuthLoaded(true);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const demoActive = localStorage.getItem("chronos_demo") === "true";
        
        const authenticated = !!session || demoActive;
        setIsLoggedIn(!!session);
        setIsDemo(demoActive);
        setAuthLoaded(true);

        if (!isPublicPage && !authenticated) {
          router.replace("/login");
        }
      } catch (error) {
        setAuthLoaded(true);
      }
    };

    syncAuth();

    let subscription: any = null;
    if (supabase && supabase.auth) {
      try {
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          const demoActive = localStorage.getItem("chronos_demo") === "true";
          setIsLoggedIn(!!session);
          
          if (session) {
            setIsDemo(false);
            localStorage.removeItem("chronos_demo");
          } else if (!isPublicPage && !demoActive) {
            router.replace("/login");
          }
        });
        subscription = data?.subscription;
      } catch (e) {}
    }

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [path, router, isPublicPage]);

  // Închidere meniu la click exterior
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  return (
    <html lang="ro">
      <body className="antialiased bg-slate-50 min-h-screen flex flex-col font-sans text-slate-900">
        {authLoaded ? (
          <>
            {!isPublicPage && (
              <nav className="w-full bg-white border-b-4 border-slate-100 sticky top-0 z-[100] shadow-sm" ref={menuRef}>
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center relative">
                  
                  <div className="flex items-center gap-4">
                    <Link 
                      href="/programari" 
                      title="Mergi la Panoul de Control Chronos"
                      className="flex items-center gap-5 group"
                    >
                      <img src="/logo-chronos.png" alt="Chronos Logo" className="w-16 h-16 object-contain group-hover:rotate-3 transition-transform duration-300" />
                      <div className="text-2xl font-black italic uppercase tracking-tighter group-hover:text-amber-600 transition-all">
                        CHRONOS<span className="text-amber-500">.</span>
                      </div>
                    </Link>
                  </div>

                  <div className="absolute left-1/2 -translate-x-1/2 hidden lg:block">
                    <div className="border-2 border-amber-500 px-6 py-2 rounded-xl bg-amber-50/50 shadow-sm" title={`Ești pe pagina: ${getPageTitle()}`}>
                      <h2 className="text-sm font-black uppercase italic tracking-widest text-slate-900 leading-none">
                         {getPageTitle()}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {isDemo && (
                      <span className="hidden sm:block bg-amber-100 text-amber-700 text-[9px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest border border-amber-200 animate-pulse">
                        Mod Demo Activat
                      </span>
                    )}
                    <button 
                      title={isMenuOpen ? "Închide meniul principal" : "Deschide meniul de navigare"}
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className={`px-6 py-3 rounded-[20px] font-black text-[10px] uppercase italic tracking-widest transition-all border-b-4 active:translate-y-1 active:border-b-0 shadow-md ${
                        isMenuOpen 
                        ? "bg-amber-500 border-amber-700 text-white" 
                        : "bg-slate-900 border-slate-700 text-white hover:bg-slate-800 ring-2 ring-amber-500/50 border-2 border-amber-500"
                      }`}
                    >
                      {isMenuOpen ? "ÎNCHIDE ✕" : "MENIU ☰"}
                    </button>
                  </div>
                </div>

                {isMenuOpen && (
                  <div className="absolute top-[calc(100%+10px)] right-6 w-72 bg-white border-2 border-slate-100 rounded-[30px] shadow-2xl p-3 z-[110] flex flex-col max-h-[80vh]">
                    <div className="space-y-1 overflow-y-auto pr-1 scrollbar-thin">
                      {[
                        { href: "/programari", icon: "📅", label: "Programări" },
                        { href: "/programari/calendar", icon: "🗓️", label: "Calendar" },
                        { href: "/dosare-clienti", icon: "👥", label: "Dosare Clienți" },
                        { href: "/resurse", icon: "📦", label: "Resurse" },
                        { href: "/abonamente", icon: "💎", label: "Abonamente" },
                        { href: "/rapoarte", icon: "📊", label: "Analiză & Rapoarte" },
                        { href: "/sugestii", icon: "💡", label: "Sugestii Sistem" },
                        { href: "/profil", icon: "👤", label: "Contul Meu" },
                        { href: "/setari", icon: "⚙️", label: "Setări" }
                      ].map((item) => (
                        <Link 
                          key={item.href}
                          href={item.href} 
                          onClick={() => setIsMenuOpen(false)} 
                          title={`Deschide secțiunea ${item.label}`}
                          className={`flex items-center gap-3 p-3 rounded-[20px] font-black text-[11px] uppercase italic transition-all group ${path === item.href ? "bg-amber-500 text-white shadow-inner" : "hover:bg-slate-50 text-slate-900"}`}
                        >
                          <span className={`p-2 rounded-lg ${path === item.href ? "bg-amber-600" : "bg-white shadow-sm"}`}>
                            {item.icon}
                          </span> 
                          {item.label}
                        </Link>
                      ))}
                    </div>

                    <div className="mt-2 pt-2 border-t-2 border-slate-50 sticky bottom-0 bg-white">
                      <button 
                        title="Deconectare securizată din contul Chronos"
                        onClick={async () => { 
                          setIsMenuOpen(false);
                          if (supabase && supabase.auth) {
                            await supabase.auth.signOut(); 
                          }
                          localStorage.clear(); 
                          window.location.href="/login"; 
                        }}
                        className="w-full text-left p-3 text-red-500 font-black text-[11px] uppercase italic hover:bg-red-50 rounded-[20px] transition-all flex items-center gap-3"
                      >
                        <span className="bg-red-100 p-2 rounded-lg">🚪</span> IEȘIRE SISTEM
                      </button>
                    </div>
                  </div>
                )}
              </nav>
            )}

            <main className="flex-grow">{children}</main>

            <footer className="w-full bg-white border-t-4 border-slate-100 py-4 px-10 mt-auto">
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  <img src="/logo-chronos.png" alt="Chronos Logo" className="w-10 h-10 object-contain" />
                  <p className="text-slate-900 font-black text-[10px] uppercase italic tracking-widest">
                    © 2026 CHRONOS <span className="text-slate-300 mx-1">|</span> PREMIUM SYSTEM
                  </p>
                </div>
                
                <div className="flex gap-6">
                  <button 
                    onClick={() => setModalOpen({ ...modalOpen, termeni: true })}
                    className="text-[11px] font-black uppercase italic text-slate-900 hover:text-amber-500 transition-colors"
                  >
                    Termeni
                  </button>
                  <button 
                    onClick={() => setModalOpen({ ...modalOpen, gdpr: true })}
                    className="text-[11px] font-black uppercase italic text-slate-900 hover:text-amber-500 transition-colors"
                  >
                    Confidențialitate
                  </button>
                  <button 
                    onClick={() => setModalOpen({ ...modalOpen, cookies: true })}
                    className="text-[11px] font-black uppercase italic text-slate-900 hover:text-amber-500 transition-colors"
                  >
                    Cookies
                  </button>
                </div>
              </div>
            </footer>

            <GDPRModal 
              isOpen={modalOpen.gdpr} 
              onClose={() => setModalOpen({ ...modalOpen, gdpr: false })} 
            />
            <TermeniModal 
              isOpen={modalOpen.termeni} 
              onClose={() => setModalOpen({ ...modalOpen, termeni: false })} 
            />
            <CookiesModal 
              isOpen={modalOpen.cookies} 
              onClose={() => setModalOpen({ ...modalOpen, cookies: false })} 
            />
          </>
        ) : (
          <div className="h-screen w-full flex items-center justify-center font-black italic text-slate-900 uppercase text-xs animate-pulse">
            Sincronizare Chronos...
          </div>
        )}
      </body>
    </html>
  );
}