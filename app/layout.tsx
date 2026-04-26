"use client";

// @ts-ignore - Ignorăm eroarea TS(2882) pentru importul CSS care funcționează la runtime
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  
  const [authLoaded, setAuthLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [activePlan, setActivePlan] = useState<string>("CHRONOS FREE");
  
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
      case "/resurse": return "Servicii & Specialiști";
      case "/abonamente": return "Abonamente";
      case "/rapoarte": return "Analiză & Rapoarte";
      case "/sugestii": return "Recenzii Clienți";
      case "/settings": return "Setări Sistem";
      case "/profil": return "Profil Utilizator";
      case "/contacte-utile": return "Contacte Utile";
      default: return "Dashboard Chronos";
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
          if (session?.user) {
            const plan = await getActivePlan(supabase, session.user.id);
            setActivePlan(plan);
          }
        }
      } catch (error) {
        if (mounted) setAuthLoaded(true);
      }
    };

    syncAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => { 
        setIsLoggedIn(!!session); 
        setAuthLoaded(true);
        if (session?.user) {
          const plan = await getActivePlan(supabase, session.user.id);
          setActivePlan(plan);
        }
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
        <head>
          <script dangerouslySetInnerHTML={{
            __html: `
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
            `
          }} />
        </head>
        <body className="bg-slate-50 min-h-screen" />
      </html>
    );
  }

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
          <img 
            height="1" 
            width="1" 
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1181507873348855&ev=PageView&noscript=1" 
          />
        </noscript>
      </head>
      <body className="antialiased bg-slate-50 min-h-screen flex flex-col font-sans text-slate-900">
        {authLoaded ? (
          <>
            {!isPublicPage && (
              <header className="w-full bg-white border-b-2 border-slate-100 sticky top-0 z-[100] shadow-sm h-16 flex items-center">
                <div className="max-w-7xl w-full mx-auto px-6 flex justify-between items-center h-full gap-4">
                  
                  {/* STÂNGA: Logo Chronos */}
                  <Link href="/programari" className="flex items-center gap-3 h-full py-1 group shrink-0">
                    <div className="h-full aspect-square flex items-center justify-center transition-transform group-hover:scale-105">
                      <Image
                        src="/logo-chronos.png"
                        alt="Logo"
                        width={56} 
                        height={56}
                        priority
                        className="object-contain h-full w-auto"
                      />
                    </div>
                    <span className="font-black italic uppercase text-lg tracking-tighter text-slate-900 group-hover:text-amber-500 transition-colors hidden sm:block">
                      CHRONOS<span className="text-amber-500">.</span>
                    </span>
                  </Link>

                  {/* CENTRU: Indicator Pagina Activă */}
                  <div className="flex-1 flex justify-center min-w-0">
                    <div className="px-4 md:px-6 py-2 rounded-xl bg-amber-50 border-[3px] border-amber-500 shadow-sm">
                      <h2 className="text-[10px] md:text-sm font-black uppercase italic tracking-widest text-slate-900 truncate">
                        {getPageTitle()}
                      </h2>
                    </div>
                  </div>

                  {/* DREAPTA: Abonament & Meniu */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Badge Abonament Uniformizat */}
                    <Link 
                      href="/abonamente" 
                      className="hidden md:flex flex-col items-end px-4 py-1.5 rounded-[15px] bg-slate-50 border border-slate-100 hover:border-amber-500 transition-all group"
                    >
                      <span className="text-[7px] font-black uppercase tracking-tighter text-slate-400 group-hover:text-amber-600 transition-colors">Abonament Activ</span>
                      <span className="text-[10px] font-black italic uppercase text-slate-900 group-hover:text-amber-500 transition-colors">
                        {activePlan}
                      </span>
                    </Link>

                    <div className="relative" ref={menuRef}>
                      <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`px-4 md:px-5 py-2 rounded-xl font-black text-[10px] uppercase italic tracking-widest transition-all border-b-2 active:translate-y-0.5 active:border-b-0 ${
                          isMenuOpen
                            ? "bg-amber-500 border-amber-700 text-white"
                            : "bg-slate-900 border-slate-700 text-white hover:bg-slate-800"
                        }`}
                      >
                        {isMenuOpen ? "ÎNCHIDE ✕" : "MENIU ☰"}
                      </button>

                      {isMenuOpen && (
                        <div className="absolute top-full mt-3 right-0 w-64 bg-white border-2 border-slate-900 rounded-[25px] shadow-2xl p-2 z-[110]">
                          <div className="space-y-0.5 max-h-[70vh] overflow-y-auto scrollbar-none">
                            {[
                              { href: "/programari", icon: "📅", label: "Programări" },
                              { href: "/programari/calendar", icon: "🗓️", label: "Calendar" },
                              { href: "/clienti", icon: "👥", label: "Clienți" },
                              { href: "/resurse", icon: "📦", label: "Gestiune Servicii" },
                              { href: "/abonamente", icon: "💎", label: "Abonamente" },
                              { href: "/rapoarte", icon: "📊", label: "Analiză & Rapoarte" },
                              { href: "/sugestii", icon: "⭐", label: "Recenzii" },
                              { href: "/contacte-utile", icon: "📞", label: "Contacte Utile" },
                              { href: "/settings", icon: "⚙️", label: "Setări" },
                              { href: "/profil", icon: "👤", label: "Profil" },
                            ].map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMenuOpen(false)}
                                className={`flex items-center gap-3 p-3 rounded-xl font-black text-[10px] uppercase italic transition-all ${
                                  path === item.href ? "bg-amber-500 text-white shadow-md" : "hover:bg-slate-50 text-slate-900"
                                }`}
                              >
                                <span className="text-base">{item.icon}</span> {item.label}
                              </Link>
                            ))}
                          </div>
                          <button
                            onClick={handleLogout}
                            className="w-full mt-2 pt-2 border-t border-slate-100 text-left p-3 text-red-500 font-black text-[10px] uppercase italic hover:bg-red-50 rounded-xl flex items-center gap-3 transition-colors"
                          >
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
              <footer className="w-full bg-white border-t-2 border-slate-100 h-16 flex items-center px-8 mt-auto">
                <div className="max-w-7xl w-full mx-auto flex justify-between items-center h-full">
                  
                  <div className="flex items-center gap-4 h-full py-1">
                    <div className="h-full aspect-square flex items-center justify-center">
                      <Image 
                        src="/logo-chronos.png" 
                        alt="Logo Footer" 
                        width={48} 
                        height={48} 
                        className="object-contain h-full w-auto" 
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-black italic uppercase text-[10px] text-slate-900 leading-tight">CHRONOS</span>
                      <a href="mailto:copedatoro@gmail.com" className="text-[9px] font-bold text-slate-400 hover:text-slate-900 transition-colors">
                        copedatoro@gmail.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <button onClick={() => setModalOpen({ ...modalOpen, termeni: true })} className="text-[9px] font-black uppercase italic text-slate-400 hover:text-amber-500 transition-colors">Termeni</button>
                    <button onClick={() => setModalOpen({ ...modalOpen, gdpr: true })} className="text-[9px] font-black uppercase italic text-slate-400 hover:text-amber-500 transition-colors">Confidențialitate</button>
                    <button onClick={() => setModalOpen({ ...modalOpen, cookies: true })} className="text-[9px] font-black uppercase italic text-slate-400 hover:text-amber-500 transition-colors">Cookies</button>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-slate-900 uppercase italic hidden sm:block">
                      CHRONOS PREMIUM <span className="text-amber-500">MANAGEMENT</span>
                    </span>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-100">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span className="text-[8px] font-black text-emerald-700 uppercase italic">SECURED</span>
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
                <Image
                  src="/logo-chronos.png"
                  alt="Loading"
                  width={100}
                  height={100}
                  className="object-contain"
                />
            </div>
            <div className="text-center space-y-2">
              <div className="font-black italic text-slate-900 uppercase text-xs tracking-widest animate-pulse">
                Sincronizare Chronos...
              </div>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}