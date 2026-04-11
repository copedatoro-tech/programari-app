"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Users, Zap, ShieldCheck, ArrowRight, Clock, Star, MousePointer2 } from "lucide-react";

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
            className="bg-white px-6 py-2.5 rounded-2xl shadow-sm border border-slate-200 text-[10px] font-black uppercase italic text-slate-600 hover:bg-slate-900 hover:text-white transition-all active:scale-95 block"
          >
            Intră în cont
          </Link>
        </motion.div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="px-6 pt-12 pb-24 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1 text-center lg:text-left">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-block px-4 py-1.5 mb-8 rounded-full bg-slate-900 text-[9px] font-black uppercase italic text-white tracking-[0.2em]"
          >
            🚀 Gestiune Digitală Premium
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black italic uppercase tracking-tighter leading-[0.85] mb-8"
          >
            ADIO HAOS ÎN <br />
            <span className="text-amber-600 block mt-2">PROGRAMĂRI</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="max-w-xl mx-auto lg:mx-0 text-slate-400 text-xs md:text-sm font-black uppercase italic tracking-wide mb-12 leading-relaxed"
          >
            Uită de agendele pierdute. Gestionează-ți afacerea de pe telefon 
            cu cel mai rapid sistem de programări din România.
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
          {/* Floating Effect Wrapper */}
          <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="relative bg-white rounded-[50px] p-8 md:p-10 shadow-2xl border border-white"
          >
            {/* Header Widget */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="font-black italic uppercase text-lg leading-none">REZERVARE NOUĂ</h4>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  <p className="text-[9px] font-black text-amber-600 uppercase italic">Live Preview</p>
                </div>
              </div>
              <motion.div 
                whileHover={{ rotate: 180 }}
                className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-slate-100"
              >
                ✨
              </motion.div>
            </div>

            {/* Form Fields Dummy */}
            <div className="space-y-4">
              <motion.div whileHover={{ x: 5 }} className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase ml-4 text-slate-400 italic tracking-widest">Nume Client</label>
                <div className="p-4 bg-slate-50 rounded-[20px] border-2 border-transparent font-bold text-sm text-slate-600 shadow-inner flex items-center justify-between">
                  <span>Popescu Dan</span>
                  <MousePointer2 className="w-4 h-4 text-amber-500 animate-bounce" />
                </div>
              </motion.div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase ml-4 text-slate-400 italic tracking-widest">Specialist</label>
                  <div className="p-4 bg-slate-50 rounded-[20px] font-bold text-xs text-slate-600 shadow-inner flex justify-between">
                    <span>Alex S.</span>
                    <span className="text-amber-500 text-[10px]">▼</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase ml-4 text-slate-400 italic tracking-widest">Ora</label>
                  <div className="p-4 bg-slate-50 rounded-[20px] font-bold text-xs text-slate-600 shadow-inner flex justify-between">
                    <span>14:30</span>
                    <Clock className="w-3 h-3 text-amber-500" />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full h-[65px] bg-slate-900 text-white rounded-[25px] font-black uppercase italic text-xs flex items-center justify-center shadow-lg group cursor-pointer relative overflow-hidden"
                >
                  <motion.div 
                    className="absolute inset-0 bg-amber-600"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: 0 }}
                  />
                  <span className="relative z-10 flex items-center gap-2">
                    ✓ Confirmă Programarea
                  </span>
                </motion.div>
              </div>
            </div>

            {/* Badge floating */}
            <motion.div 
              animate={{ rotate: [6, 10, 6], scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute -bottom-6 -right-6 bg-amber-500 text-slate-900 p-4 rounded-[25px] shadow-xl border-4 border-white hidden md:block"
            >
              <p className="text-[10px] font-black uppercase italic leading-tight text-center">
                99% Mai<br />Puține Erori
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* --- FEATURES SECTION --- */}
      <section className="bg-white py-24 px-6 border-y border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { icon: <Zap />, title: "Viteză Maximă", desc: "Programarea unui client durează sub 10 secunde pe orice dispozitiv." },
            { icon: <Users />, title: "Echipă & Roluri", desc: "Gestionează mai mulți angajați, fiecare cu propriul său calendar." },
            { icon: <ShieldCheck />, title: "Securitate Cloud", desc: "Datele tale sunt criptate și disponibile 24/7, fără grija agendei fizice." }
          ].map((f, i) => (
            <motion.div 
              key={i} 
              whileHover={{ y: -10 }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group p-8 rounded-[40px] hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
            >
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner group-hover:bg-amber-500 group-hover:text-white transition-colors text-amber-600">
                {f.icon}
              </div>
              <h3 className="font-black italic uppercase text-lg mb-3 tracking-tighter">{f.title}</h3>
              <p className="text-slate-400 text-xs font-bold uppercase italic leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
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
          <Link href="/terms" className="text-[9px] font-black text-slate-400 uppercase italic hover:text-amber-600">Termeni</Link>
          <Link href="/privacy" className="text-[9px] font-black text-slate-400 uppercase italic hover:text-amber-600">Confidențialitate</Link>
        </div>
      </footer>
    </div>
  );
}