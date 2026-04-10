"use client";

// @ts-ignore - Ignorăm eroarea TS(2882) pentru importul CSS care funcționează la runtime
import "./globals.css";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";

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
      case "/resurse": return "Resurse";
      case "/abonamente": return "Abonamente";
      case "/rapoarte": return "Analiză & Rapoarte";
      case "/sugestii": return "Sugestii Sistem";
      case "/settings": return "Settings Admin";
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
              <nav className="w-full bg-white border-b-4 border-slate-100 sticky top-0 z-[100] shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center relative">

                  <div className="flex items-center gap-4">
                    <Link href="/programari" className="flex items-center gap-2 group">
                      <div className="w-20 h-20 flex items-center justify-center transition-all duration-300 relative overflow-hidden">
                        <Image
                          src="/logo-chronos.png"
                          alt="Logo Chronos"
                          fill
                          priority
                          className="object-contain p-0"
                        />
                      </div>
                      <div className="text-2xl font-black italic uppercase tracking-tighter group-hover:text-amber-600 transition-all">
                        CHRONOS<span className="text-amber-500">.</span>
                      </div>
                    </Link>
                  </div>

                  <div className="absolute left-1/2 -translate-x-1/2 hidden lg:block">
                    <div className="border-2 border-amber-500 px-6 py-2 rounded-xl bg-amber-50/50 shadow-sm">
                      <h2 className="text-sm font-black uppercase italic tracking-widest text-slate-900 leading-none">
                        {getPageTitle()}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:gap-4 relative" ref={menuRef}>
                    <button
                      title="Deschide Meniul Principal"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(!isMenuOpen);
                      }}
                      className={`px-6 py-3 rounded-[20px] font-black text-[10px] uppercase italic tracking-widest transition-all border-b-4 active:translate-y-1 active:border-b-0 shadow-md z-[120] ${
                        isMenuOpen
                          ? "bg-amber-500 border-amber-700 text-white"
                          : "bg-slate-900 border-slate-700 text-white hover:bg-slate-800 ring-2 ring-amber-500/50 border-2 border-amber-500"
                      }`}
                    >
                      {isMenuOpen ? "ÎNCHIDE ✕" : "MENIU ☰"}
                    </button>

                    {isMenuOpen && (
                      <div
                        className="absolute top-[calc(100%+15px)] right-0 w-72 bg-white border-4 border-slate-900 rounded-[30px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-3 z-[110] flex flex-col max-h-[80vh]"
                      >
                        <div className="space-y-1 overflow-y-auto pr-1 scrollbar-thin">
                          {[
                            { href: "/programari", icon: "📅", label: "Programări" },
                            { href: "/programari/calendar", icon: "🗓️", label: "Calendar" },
                            { href: "/clienti", icon: "👥", label: "Clienți" },
                            { href: "/contacte-utile", icon: "📞", label: "Contacte Utile" },
                            { href: "/resurse", icon: "📦", label: "Resurse" },
                            { href: "/abonamente", icon: "💎", label: "Abonamente" },
                            { href: "/rapoarte", icon: "📊", label: "Analiză & Rapoarte" },
                            { href: "/sugestii", icon: "💡", label: "Sugestii Sistem" },
                            { href: "/settings", icon: "⚙️", label: "Settings Admin" },
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
              </nav>
            )}

            <main className="flex-grow">{children}</main>

            {!isPublicPage && (
              <footer className="w-full bg-white border-t-4 border-slate-100 py-8 px-10 mt-auto">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-8">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-16 flex items-center justify-center relative overflow-hidden">
                      <Image
                        src="/logo-chronos.png"
                        alt="Logo Chronos Footer"
                        fill
                        priority
                        className="object-contain p-0"
                      />
                    </div>
                    <p className="text-slate-900 font-black text-xs uppercase italic tracking-widest">
                      © 2026 CHRONOS{" "}
                      <span className="text-slate-300 mx-2">|</span> PREMIUM MANAGEMENT
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-8">
                    <button
                      onClick={() => setModalOpen({ ...modalOpen, termeni: true })}
                      className="text-xs font-black uppercase italic text-slate-400 hover:text-amber-500 transition-colors"
                    >
                      Termeni și Condiții
                    </button>
                    <button
                      onClick={() => setModalOpen({ ...modalOpen, gdpr: true })}
                      className="text-xs font-black uppercase italic text-slate-400 hover:text-amber-500 transition-colors"
                    >
                      Politică de Confidențialitate
                    </button>
                    <button
                      onClick={() => setModalOpen({ ...modalOpen, cookies: true })}
                      className="text-xs font-black uppercase italic text-slate-400 hover:text-amber-500 transition-colors"
                    >
                      Politică Cookies
                    </button>
                  </div>
                </div>
              </footer>
            )}

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