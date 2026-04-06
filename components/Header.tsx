"use client";

import React, { useState, useEffect } from "react";
import { Inter } from "next/font/google";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import "./globals.css";

// IMPORTĂM MODALELE (Asigură-te că fișierele există în folderul components)
import GDPRModal from "./components/GDPRModal";
import TermeniModal from "./components/TermeniModal";
import CookiesModal from "./components/CookiesModal";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Stări pentru deschiderea modalelor (Pop-up-uri)
  const [isGDPRPinned, setIsGDPRPinned] = useState(false);
  const [isTermeniPinned, setIsTermeniPinned] = useState(false);
  const [isCookiesPinned, setIsCookiesPinned] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isLoginPage = pathname === "/login";

  return (
    <html lang="ro">
      <body className={`${inter.className} bg-slate-50 text-slate-900 min-h-screen flex flex-col`}>
        
        {!isLoginPage && (
          <header className="w-full bg-white border-b border-slate-200 py-6 px-4 md:px-8 sticky top-0 z-50 shadow-sm">
            <div className="max-w-[1700px] mx-auto flex items-center justify-between">
              
              {/* 1. LOGO */}
              <Link href="/" className="flex items-center gap-4 group flex-shrink-0">
                <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-amber-500 shadow-xl group-hover:rotate-6 transition-all duration-300 border-b-4 border-amber-600">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 2h14" /><path d="M5 22h14" />
                    <path d="M6 2v6.7a6 6 0 0 0 3 5.2L12 16l3-2.1a6 6 0 0 0 3-5.2V2" />
                    <path d="M6 22v-6.7a6 6 0 0 1 3-5.2L12 8l3 2.1a6 6 0 0 1 3 5.2V22" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-black text-slate-900 tracking-tighter leading-none uppercase italic">
                    CHRONOS<span className="text-amber-600">.</span>
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mt-1.5">
                    Mastery of Time
                  </span>
                </div>
              </Link>

              {/* 2. NAVIGARE */}
              {isLoggedIn && (
                <nav className="flex items-center gap-4 xl:gap-8 ml-auto mr-10">
                  {[
                    { name: "Programări", href: "/programari" },
                    { name: "Calendar", href: "/calendar" },
                    { name: "Dosare", href: "/dosare-clienti" },
                    { name: "Setări", href: "/setari" },
                  ].map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-lg xl:text-xl font-black text-slate-500 hover:text-slate-900 transition-all relative py-2 group whitespace-nowrap uppercase italic"
                    >
                      {link.name}
                      <span className={`absolute bottom-0 left-0 h-1 bg-amber-600 rounded-full transition-all duration-300 ${pathname === link.href ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                    </Link>
                  ))}
                </nav>
              )}

              {/* 3. BUTON LOGARE/IESIRE */}
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="h-10 w-[1px] bg-slate-200 mx-2"></div>
                {isLoggedIn ? (
                  <button 
                    onClick={() => supabase.auth.signOut()}
                    className="flex items-center gap-3 bg-slate-100 text-slate-900 px-6 py-3 rounded-2xl font-black text-xs hover:bg-slate-200 transition-all border-b-2 border-slate-300 uppercase italic"
                  >
                    <span>IEȘIRE</span>
                    <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white">✕</div>
                  </button>
                ) : (
                  <Link 
                    href="/login"
                    className="flex items-center gap-3 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs hover:bg-slate-800 transition-all shadow-lg border-b-2 border-slate-700 uppercase italic active:border-b-0 active:translate-y-0.5"
                  >
                    <span>LOGARE</span>
                    <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-[10px] text-slate-900">👤</div>
                  </Link>
                )}
              </div>
            </div>
          </header>
        )}

        <main className="flex-grow">
          {children}
        </main>

        <footer className="w-full py-8 border-t border-slate-100 mt-auto bg-white">
          <div className="max-w-[1700px] mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] italic">
              © 2026 Chronos • Premium Management System
            </p>
            
            <div className="flex gap-6">
              <button onClick={() => setIsTermeniPinned(true)} className="text-[10px] font-black text-slate-400 hover:text-amber-600 uppercase transition-all">Termeni</button>
              <button onClick={() => setIsGDPRPinned(true)} className="text-[10px] font-black text-slate-400 hover:text-amber-600 uppercase transition-all">Confidențialitate</button>
              <button onClick={() => setIsCookiesPinned(true)} className="text-[10px] font-black text-slate-400 hover:text-amber-600 uppercase transition-all">Cookies</button>
            </div>
          </div>
        </footer>

        {/* COMPONENTELE MODALE */}
        <GDPRModal isOpen={isGDPRPinned} onClose={() => setIsGDPRPinned(false)} />
        <TermeniModal isOpen={isTermeniPinned} onClose={() => setIsTermeniPinned(false)} />
        <CookiesModal isOpen={isCookiesPinned} onClose={() => setIsCookiesPinned(false)} />

      </body>
    </html>
  );
}