"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Users, Zap, ShieldCheck, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      if (!supabase || !supabase.auth) {
        setIsChecking(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const isDemo = localStorage.getItem("chronos_demo") === "true";
        
        if (session || isDemo) {
          router.replace("/programari");
        } else {
          // NU mai trimitem la /login automat. 
          // Oprim starea de verificare pentru a arăta Landing Page-ul.
          setIsChecking(false);
        }
      } catch (error) {
        setIsChecking(false);
      }
    };
    checkUser();
  }, [router]);

  // În timp ce verificăm dacă e logat, arătăm un loader discret
  if (isChecking) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <img src="/logo-chronos.png" alt="Logo" className="w-20 h-20 animate-pulse opacity-50" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* --- NAV BAR --- */}
      <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Image src="/logo-chronos.png" alt="Chronos Logo" width={35} height={35} />
          <span className="font-black text-lg tracking-tighter italic uppercase">
            CHRONOS<span className="text-amber-500">.</span>
          </span>
        </div>
        <Link 
          href="/login" 
          className="text-[10px] font-black uppercase italic text-slate-500 hover:text-amber-500 transition-all border-b-2 border-transparent hover:border-amber-500 pb-1"
        >
          Intră în cont
        </Link>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="px-6 py-12 md:py-20 max-w-7xl mx-auto text-center">
        <div className="inline-block px-4 py-1.5 mb-8 rounded-full bg-slate-900 text-[9px] font-black uppercase italic text-white tracking-[0.2em]">
          🚀 Gestiune Digitală Premium
        </div>
        
        <h1 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.85] mb-8">
          ADIO HAOS ÎN <br />
          <span className="text-amber-500 text-3xl md:text-6xl block mt-2">PROGRAMĂRILE TALE</span>
        </h1>
        
        <p className="max-w-xl mx-auto text-slate-500 text-xs md:text-sm font-bold uppercase italic tracking-wide mb-12 leading-relaxed opacity-80">
          Uită de agendele pierdute. Gestionează-ți afacerea de pe telefon <br className="hidden md:block" /> 
          cu cel mai rapid sistem de programări din România.
        </p>

        <div className="flex flex-col items-center gap-6">
          <Link 
            href="/register"
            className="w-full max-w-xs bg-amber-500 text-slate-900 px-8 py-5 rounded-2xl font-black italic uppercase tracking-widest hover:bg-amber-400 border-b-4 border-amber-700 active:translate-y-1 transition-all text-sm flex items-center justify-center gap-3 shadow-xl shadow-amber-500/20"
          >
            Începe 10 zile gratuit <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-[9px] font-black text-slate-400 uppercase italic tracking-tighter">Fără card bancar • Configurare în 2 minute</span>
          </div>
        </div>

        {/* --- APP PREVIEW --- */}
        <div className="mt-20 relative mx-auto max-w-4xl px-4">
            <div className="absolute -inset-4 bg-amber-500/5 blur-3xl rounded-full"></div>
            <div className="relative bg-slate-900 p-2 rounded-[2rem] shadow-2xl transform -rotate-1 md:-rotate-2">
                <div className="bg-slate-800 rounded-[1.5rem] aspect-video flex items-center justify-center overflow-hidden border-4 border-slate-700">
                   {/* Aici pui screenshot-ul aplicației tale */}
                   <p className="text-slate-500 font-black italic uppercase text-[10px] tracking-[0.3em]">Previzualizare Dashboard Chronos</p>
                </div>
            </div>
        </div>
      </section>

      {/* --- FOOTER SIMPLU --- */}
      <footer className="py-12 border-t border-slate-50 text-center">
         <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">
            Chronos System &copy; 2026 - Eficiență Absolută
         </p>
      </footer>
    </div>
  );
}