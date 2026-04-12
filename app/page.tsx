"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Users, Zap, ShieldCheck, ArrowRight, Clock, Star, MousePointer2, Share2, CheckCircle2 } from "lucide-react";

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
          setIsChecking(false);
        }
      } catch (error) {
        setIsChecking(false);
      }
    };
    checkUser();
  }, [router]);

  if (isChecking) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Image src="/logo-chronos.png" alt="Logo" width={80} height={80} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      {/* --- NAV BAR --- */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <Image src="/logo-chronos.png" alt="Chronos Logo" width={35} height={35} />
          <span className="font-black text-lg tracking-tighter italic uppercase">
            CHRONOS<span className="text-amber-500">.</span>
          </span>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <Link 
            href="/login" 
            className="bg-slate-900 px-6 py-2.5 rounded-2xl shadow-lg text-[10px] font-black uppercase italic text-white hover:bg-amber-600 transition-all active:scale-95 block tracking-widest"
          >
            Intră în cont
          </Link>
        </motion.div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="px-6 pt-12 pb-24 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
        <div className="flex-1 text-center lg:text-left">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-block px-4 py-1.5 mb-10 rounded-full bg-slate-900 text-[9px] font-black uppercase italic text-white tracking-[0.2em]"
          >
            🚀 Automatizare Completă WhatsApp
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black italic uppercase tracking-tighter leading-tight mb-10"
          >
            CLIENTUL SE <br />
            <span className="text-amber-600 block mt-4">PROGRAMEAZĂ SINGUR</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="max-w-xl mx-auto lg:mx-0 text-slate-500 text-xs md:text-sm font-bold uppercase italic tracking-wide mb-14 leading-relaxed"
          >
            Setezi durata serviciilor și programul tău, trimiți link-ul pe WhatsApp, 
            iar clienții își aleg singuri ora disponibilă. Fără telefoane, fără stres.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center lg:items-start gap-6"
          >
            <Link 
              href="/register"
              className="w-full max-w-xs h-[80px] bg-amber-600 text-white rounded-[30px] font-black italic uppercase tracking-widest hover:bg-slate-900 shadow-xl shadow-amber-600/20 transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95 group overflow-hidden relative"
            >
               <motion.div 
                className="absolute inset-0 bg-slate-900"
                initial={{ y: "100%" }}
                whileHover={{ y: 0 }}
                transition={{ duration: 0.3 }}
              />
              <span className="relative z-10 text-[10px] opacity-70">ÎNCEPE ACUM</span>
              <span className="relative z-10 text-sm flex items-center gap-2">10 Zile Gratuit <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-50 bg-slate-300" />)}
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase italic tracking-tighter">Alătură-te celor 500+ specialiști</span>
            </div>
          </motion.div>
        </div>

        {/* --- ANIMATED BOOKING WIDGET --- */}
        <motion.div 
          className="flex-1 w-full max-w-lg relative"
          initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="relative bg-white rounded-[50px] p-8 md:p-10 shadow-2xl border border-white"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="font-black italic uppercase text-lg leading-none text-slate-400">PAGINA CLIENTULUI</h4>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  <p className="text-[9px] font-black text-emerald-600 uppercase italic tracking-widest">Link-ul tău este Activ</p>
                </div>
              </div>
              <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg">
                <Share2 className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-[20px] border-2 border-slate-100 font-black text-xs text-slate-400 italic flex items-center justify-between">
                <span>chronos.com/salonul-tau</span>
                <span className="text-[9px] bg-slate-200 px-2 py-1 rounded-lg">COPIAZĂ</span>
              </div>

              <div className="bg-slate-900 p-6 rounded-[30px] text-white space-y-3">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-[10px] font-black uppercase italic opacity-60">Alege Serviciul</span>
                  <span className="text-xs font-black">Tuns Fade</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-[10px] font-black uppercase italic opacity-60">Durată</span>
                  <span className="text-xs font-black">45 MIN</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase italic opacity-60">Data</span>
                  <span className="text-xs font-black text-amber-500">12 APRILIE, 14:30</span>
                </div>
              </div>

              <div className="pt-2">
                <motion.div 
                  className="w-full h-[65px] bg-amber-600 text-white rounded-[25px] font-black uppercase italic text-xs flex items-center justify-center shadow-lg relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    ✓ CLIENTUL CONFIRMĂ AICI
                  </span>
                </motion.div>
              </div>
            </div>

            <motion.div 
              animate={{ rotate: [-2, 2, -2] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -bottom-6 -right-6 bg-slate-900 text-white p-5 rounded-[25px] shadow-2xl border-4 border-white hidden md:block"
            >
              <p className="text-[10px] font-black uppercase italic leading-tight flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                PROGRAMARE <br />SĂLVATĂ ÎN CALENDAR
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* --- CUM FUNCȚIONEAZĂ (STEP BY STEP) --- */}
      <section className="bg-white py-24 px-6 border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter mb-4">LOGICĂ SIMPLĂ. REZULTATE MAXIME.</h2>
            <p className="text-slate-400 text-xs font-bold uppercase italic">Urmează acești 3 pași pentru a-ți automatiza afacerea</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { 
                step: "01",
                title: "Configurezi Profilul", 
                desc: "Adaugi serviciile (ex: Tuns, Barba) și timpul necesar pentru fiecare. Setezi intervalul orar în care ești disponibil." 
              },
              { 
                step: "02",
                title: "Trimiți Link-ul", 
                desc: "Copiezi link-ul tău personalizat și îl pui în Bio pe Instagram, Facebook sau îl trimiți direct pe WhatsApp clienților." 
              },
              { 
                step: "03",
                title: "Gata! Primești Notificări", 
                desc: "Clienții își aleg singuri ora, iar tu primești instant notificarea. Calendarul tău se completează singur." 
              }
            ].map((s, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative p-8 rounded-[40px] bg-slate-50 border border-slate-100"
              >
                <span className="absolute -top-6 left-8 text-6xl font-black italic text-slate-200/50">{s.step}</span>
                <h3 className="font-black italic uppercase text-lg mb-4 mt-4 tracking-tighter">{s.title}</h3>
                <p className="text-slate-500 text-xs font-bold uppercase italic leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-16 px-6 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-2">
          <Image src="/logo-chronos.png" alt="Chronos Logo" width={25} height={25} />
          <span className="font-black text-sm tracking-tighter italic uppercase text-slate-400">
            CHRONOS<span className="text-amber-500">.</span>SYSTEM
          </span>
        </div>
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] italic">
          &copy; 2026 - Eficiență Absolută • Creat pentru Profesioniști
        </p>
        <div className="flex gap-6">
          <Link href="/terms" className="text-[9px] font-black text-slate-400 uppercase italic hover:text-amber-600 transition-colors">Termeni</Link>
          <Link href="/privacy" className="text-[9px] font-black text-slate-400 uppercase italic hover:text-amber-600 transition-colors">Confidențialitate</Link>
        </div>
      </footer>
    </div>
  );
}