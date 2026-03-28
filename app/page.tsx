"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
// ✅ Import corectat: am adăugat acoladele { } pentru a importa corect 'export const supabase'
import { supabase } from "../lib/supabaseClient";

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      // Obținem sesiunea curentă folosind instanța centralizată
      if (!supabase || !supabase.auth) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const isDemo = localStorage.getItem("chronos_demo") === "true";
        
        if (session || isDemo) {
          router.replace("/programari");
        } else {
          router.replace("/login");
        }
      } catch (error) {
        router.replace("/login");
      }
    };
    checkUser();
  }, [router]);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-8">
        
        {/* Logo central cu animație de pulsare fină */}
        <div className="relative group">
          <img 
            src="/logo-chronos.png" 
            alt="Chronos Logo" 
            className="w-32 h-32 object-contain animate-pulse group-hover:scale-105 transition-transform duration-500" 
            title="Sistemul Chronos se sincronizează..."
          />
          {/* Efect de strălucire discret în spate */}
          <div className="absolute inset-0 bg-amber-500/10 blur-3xl rounded-full -z-10 animate-pulse"></div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">
            CHRONOS<span className="text-amber-500">.</span>
          </h1>
          <div className="flex items-center justify-center gap-3">
            <span className="h-[2px] w-8 bg-amber-500/30 rounded-full"></span>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic">
              Premium System
            </p>
            <span className="h-[2px] w-8 bg-amber-500/30 rounded-full"></span>
          </div>
        </div>
        
        {/* Buton de fallback folosind clasa globală btn-chronos */}
        <div className="mt-4">
          <button 
            onClick={() => router.push("/login")}
            title="Apasă aici dacă redirecționarea automată nu are loc"
            className="btn-chronos !text-[9px] !px-8 !py-2.5 opacity-80 hover:opacity-100"
          >
            Sincronizare Manuală
          </button>
        </div>

      </div>
    </div>
  );
}