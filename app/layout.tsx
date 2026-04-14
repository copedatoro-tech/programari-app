"use client";

// @ts-ignore - Ignorăm eroarea TS(2882) pentru importul CSS care funcționează la runtime
import "./globals.css";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { Mail, ShieldCheck } from "lucide-react";

import GDPRModal from "@/components/GDPRModal";
import TermeniModal from "@/components/TermeniModal";
import CookiesModal from "@/components/CookiesModal";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  
  const [authLoaded, setAuthLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);

  const [modalOpen, setModalOpen] = useState({
    gdpr: false,
    termeni: false,
    cookies: false,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getPageTitle = useCallback(() => {
    switch (path) {
      case "/programari": return "Programări";
      case "/programari/calendar": return "Calendar Programări";
      case "/clienti": return "Clienți";
      case "/resurse": return "Gestiune Servicii & Specialiști";
      case "/abonamente": return "Abonamente";
      case "/rapoarte": return "Analiză & Rapoarte";
      case "/sugestii": return "Gestiune Recenzii";
      case "/settings": return "Setări Orar & Programări Online";
      case "/profil": return "Profil Utilizator";
      case "/contacte-utile": return "Contacte Utile";
      default: return "Sistem Chronos";
    }
  }, [path]);

  const isPublicPage =
    path === "/login" ||
    path === "/" ||
    path === "/register" ||
    path === "/forgot-password" ||
    (path && path.startsWith("/rezervare"));

  useEffect(() => {
    let mounted = true;

    const syncAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setIsLoggedIn(!!session);
          setAuthLoaded(true);
        }
      } catch (error) {
        if (mounted) setAuthLoaded(true);
      }
    };

    syncAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => { 
        setIsLoggedIn(!!session); 
        setAuthLoaded(true);
      }
    );

    return () => { 
      mounted = false;
      if (subscription) subscription.unsubscribe(); 
    };
  }, []);

  useEffect(() => {
    if (authLoaded && !isLoggedIn && !isPublicPage) {
      router.replace("/login");
    }
  }, [authLoaded, isLoggedIn, isPublicPage, router]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.log("Logout transition...");
    } finally {
      localStorage.removeItem("chronos_demo");
      window.location.href = "/login";
    }
  };

  if (!isMounted) {
    return (
      <html lang="ro">
        <body className="bg-slate-50 min-h-screen" />
      </html>
    );
  }

  return (
    <html lang="ro">
      <body className="antialiased bg-slate-50 min-h-screen flex flex-col font-sans text-slate-900">
        {authLoaded ? (
          <>
            {!isPublicPage && (
              <header className="w-full bg-white border-b-4 border-slate-100 sticky top-0 z-[100] shadow-md">
                {/* --- SECTIUNE LOGO MARE SI CENTRAL --- */}
                <div className="w-full flex justify-center pt-6 pb-2">
                  <Link href="/programari" className="flex flex-col items-center group">
                    <div className="relative w-24 h-24 md:w-28 md:h-28 flex items-center justify-center bg-slate-900 rounded-[30px] shadow-2xl shadow-amber-200/50 group-hover:rotate-3 transition-all duration-500 p-4 border-4 border-white ring-4 ring-slate-900">
                      <Image
                        src="/logo-chronos.png"
                        alt="Logo Chronos"
                        width={100}
                        height={100}
                        priority
                        className="object-contain brightness-0 invert"
                      />
                    </div>
                    <div className="mt-4 text-center">
                      <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter leading-none text-slate-900 group-hover:text-amber-500 transition-colors">
                        CHRONOS<span className="text-amber-500">.</span>
                      </h1>
                      <div className="h-1 w-full bg-amber-500 mt-1 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                    </div>
                  </Link>
                </div>

                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center relative">
                  {/* Titlu Pagina */}
                  <div className="border-2 border-amber-500 px-6 py-2 rounded-xl bg-amber-50/50 shadow-sm transform -skew-x-12">
                    <h2 className="text-sm font-black uppercase italic tracking-widest text-slate-900 leading-none skew-x-12">
                      {getPageTitle()}
                    </h2>
                  </div>

                  {/* Buton Meniu */}
                  <div className="flex items-center gap-2 md:gap-4 relative" ref={menuRef}>
                    <button
                      title="Deschide Meniul Principal"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(!isMenuOpen);
                      }}
                      className={`px-8 py-3 rounded-[20px] font-black text-[10px] uppercase italic tracking-widest transition-all border-b-4 active:translate-y-1 active:border-b-0 shadow-md z-[120] ${
                        isMenuOpen
                          ? "bg-amber-500 border-amber-700 text-white"
                          : "bg-slate-900 border-slate-700 text-white hover:bg-slate-800 ring-2 ring-amber-500/50"
                      }`}
                    >
                      {isMenuOpen ? "ÎNCHIDE ✕" : "MENIU ☰"}
                    </button>

                    {isMenuOpen && (
                      <div className="absolute top-[calc(100%+15px)] right-0 w-72 bg-white border-4 border-slate-900 rounded-[30px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-3 z-[110] flex flex-col max-h-[80vh]">
                        <div className="space-y-1 overflow-y-auto pr-1 scrollbar-thin">
                          {[
                            { href: "/programari", icon: "📅", label: "Programări" },
                            { href: "/programari/calendar", icon: "🗓️", label: "Calendar" },
                            { href: "/clienti", icon: "👥", label: "Clienți" },
                            { href: "/contacte-utile", icon: "📞", label: "Contacte Utile" },
                            { href: "/resurse", icon: "📦", label: "Gestiune Servicii & Specialiști" },
                            { href: "/abonamente", icon: "💎", label: "Abonamente" },
                            { href: "/rapoarte", icon: "📊", label: "Analiză & Rapoarte" },
                            { href: "/sugestii", icon: "⭐", label: "Gestiune Recenzii" },
                            { href: "/settings", icon: "⚙️", label: "Setări Orar & Programări" },
                            { href: "/profil", icon: "👤", label: "Contul Meu" },
                          ].map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              title={`Accesează ${item.label}`}
                              onClick={() => setIsMenuOpen(false)}
                              className={`flex items-center gap-3 p-4 rounded-[20px] font-black text-[11px] uppercase italic transition-all ${
                                path === item.href
                                  ? "bg-amber-500 text-white shadow-lg"
                                  : "hover:bg-slate-100 text-slate-900"
                              }`}
                            >
                              <span className="text-lg">{item.icon}</span>
                              {item.label}
                            </Link>
                          ))}
                        </div>

                        <div className="mt-2 pt-2 border-t-2 border-slate-100 bg-white">
                          <button
                            title="Ieșire securizată din cont"
                            onClick={handleLogout}
                            className="w-full text-left p-4 text-red-500 font-black text-[11px] uppercase italic hover:bg-red-50 rounded-[20px] transition-all flex items-center gap-3"
                          >
                            <span>🚪</span> IEȘIRE SISTEM
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </header>
            )}

            <main className="flex-grow">{children}</main>

            {!isPublicPage && (
              <footer className="w-full bg-white border-t-4 border-slate-100 py-10 px-10 mt-auto">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-10">
                  
                  {/* Copy & Branding */}
                  <div className="flex flex-col items-center lg:items-start gap-1">
                    <p className="text-slate-900 font-black text-xs uppercase italic tracking-widest">
                      © 2026 CHRONOS <span className="text-amber-500">.</span> PREMIUM MANAGEMENT
                    </p>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">High Performance Business Tool</span>
                  </div>

                  {/* Link-uri Legale & Suport */}
                  <div className="flex flex-col items-center gap-6">
                    <div className="flex flex-wrap justify-center gap-6">
                      <button onClick={() => setModalOpen({ ...modalOpen, termeni: true })} className="text-[10px] font-black uppercase italic text-slate-400 hover:text-amber-500 transition-colors">Termeni și Condiții</button>
                      <button onClick={() => setModalOpen({ ...modalOpen, gdpr: true })} className="text-[10px] font-black uppercase italic text-slate-400 hover:text-amber-500 transition-colors">Politică Confidențialitate</button>
                      <button onClick={() => setModalOpen({ ...modalOpen, cookies: true })} className="text-[10px] font-black uppercase italic text-slate-400 hover:text-amber-500 transition-colors">Politică Cookies</button>
                    </div>
                    
                    {/* SUPORT E-MAIL */}
                    <div className="flex items-center gap-3 bg-slate-900 px-6 py-2.5 rounded-full shadow-lg shadow-slate-200">
                      <Mail className="w-3 h-3 text-amber-500" />
                      <span className="text-[10px] font-black uppercase italic text-amber-500">SUPORT:</span>
                      <a href="mailto:copedatoro@gmail.com" className="text-[10px] font-black uppercase italic text-white hover:text-amber-400 transition-colors tracking-widest">
                        copedatoro@gmail.com
                      </a>
                    </div>
                  </div>

                  {/* Securitate */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-[9px] font-black text-emerald-700 uppercase italic tracking-widest">Secured Cloud Environment</span>
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
            {/* LOGO IN LOADING SCREEN */}
            <div className="relative w-32 h-32 bg-slate-900 rounded-[40px] flex items-center justify-center p-6 shadow-2xl animate-bounce">
                <Image
                  src="/logo-chronos.png"
                  alt="Loading Chronos"
                  width={120}
                  height={120}
                  className="object-contain brightness-0 invert"
                />
            </div>
            {/* TEXT SINCRONIZARE COMPLETĂ */}
            <div className="text-center space-y-2">
              <div className="font-black italic text-slate-900 uppercase text-sm tracking-widest animate-pulse">
                Sincronizare totală a programărilor tale...
              </div>
              <div className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.3em]">
                Vă rugăm așteptați
              </div>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}