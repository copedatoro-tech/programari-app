"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Users, Zap, ShieldCheck, ArrowRight, Clock, Star, MousePointer2, Share2, CheckCircle2, MoreHorizontal, MessageSquare, Scissors, UserCheck } from "lucide-react";

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
      <nav className="flex items-center justify-between px-8 py-4 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <Image src="/logo-chronos.png" alt="Chronos Logo" width={30} height={30} />
          <span className="font-black text-base tracking-tighter italic uppercase">
            CHRONOS<span className="text-amber-500">.</span>
          </span>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <Link 
            href="/login" 
            className="bg-slate-900 px-5 py-2 rounded-xl shadow-lg text-[9px] font-black uppercase italic text-white hover:bg-amber-600 transition-all active:scale-95 block tracking-widest"
          >
            Intră în cont
          </Link>
        </motion.div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="px-6 pt-4 pb-12 max-w-7xl mx-auto flex flex-col items-center">
        <div className="text-center w-full max-w-4xl">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1 mb-6 rounded-full bg-slate-900 text-[8px] font-black uppercase italic text-white tracking-[0.2em]"
          >
            🔥 ADIO MESAJE LA 11 NOAPTEA
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9] mb-6"
          >
            CLIENTUL SE <span className="text-amber-600">PROGRAMEAZĂ SINGUR</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto text-slate-500 text-[10px] md:text-xs font-bold uppercase italic tracking-wide mb-8 leading-relaxed"
          >
            Tu doar tunzi, repari sau antrenezi. Chronos preia apelurile, verifică programul și confirmă locul. Fără stres, doar profit.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-4 mb-12"
          >
            <Link 
              href="/register"
              className="w-full max-w-xs h-[70px] bg-amber-600 text-white rounded-[25px] font-black italic uppercase tracking-widest hover:bg-slate-900 shadow-xl shadow-amber-600/20 transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95 group overflow-hidden relative"
            >
              <motion.div 
                className="absolute inset-0 bg-slate-900"
                initial={{ y: "100%" }}
                whileHover={{ y: 0 }}
                transition={{ duration: 0.3 }}
              />
              <span className="relative z-10 text-[9px] opacity-70">VREAU CONTROL TOTAL</span>
              <span className="relative z-10 text-xs flex items-center gap-2">10 Zile Gratuit <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
            </Link>
            <p className="text-[8px] font-black text-slate-400 uppercase italic tracking-widest">
              * După 10 zile, ne dai un feedback pe email și tu decizi dacă rămâi.
            </p>
          </motion.div>
        </div>

        {/* --- APP SHOWCASE (THE MACBOOK/TABLET MOCKUP) --- */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="relative w-full max-w-5xl"
        >
          {/* Mockup Frame */}
          <div className="bg-slate-800 rounded-t-[30px] p-2 shadow-2xl border-x-4 border-t-4 border-slate-700">
            <div className="flex items-center gap-1.5 mb-2 px-4 py-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <div className="ml-4 bg-slate-700/50 px-3 py-0.5 rounded text-[8px] text-slate-400 font-mono">app.chronos.system/dashboard</div>
            </div>
            
            {/* App Interface Sample */}
            <div className="bg-white rounded-t-xl overflow-hidden min-h-[400px]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-black italic text-lg uppercase tracking-tighter">Panou de Control</h3>
                <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse"></div>
                    <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse"></div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-4 gap-4 mb-8">
                  {[
                    { label: "Total Clienți", val: "124", color: "text-amber-600" },
                    { label: "Azi", val: "8", color: "text-slate-900" },
                    { label: "Venit Estimat", val: "1.450 RON", color: "text-emerald-600" },
                    { label: "Locuri Libere", val: "2", color: "text-red-500" }
                  ].map((stat, i) => (
                    <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[8px] font-black uppercase text-slate-400 mb-1">{stat.label}</p>
                      <p className={`text-sm font-black italic ${stat.color}`}>{stat.val}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="p-4 text-[9px] font-black uppercase italic text-slate-400 tracking-widest">Client</th>
                        <th className="p-4 text-[9px] font-black uppercase italic text-slate-400 tracking-widest">Serviciu</th>
                        <th className="p-4 text-[9px] font-black uppercase italic text-slate-400 tracking-widest">Ora</th>
                        <th className="p-4 text-[9px] font-black uppercase italic text-slate-400 tracking-widest">Status</th>
                        <th className="p-4"></th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px] font-bold italic">
                      {[
                        { name: "Andrei Ionescu", svc: "Tuns + Barbă", time: "14:30", status: "Confirmat", color: "bg-emerald-100 text-emerald-700" },
                        { name: "Mihai Georgescu", svc: "Tuns Fade", time: "15:15", status: "În Așteptare", color: "bg-amber-100 text-amber-700" },
                        { name: "Radu Popescu", svc: "Vopsit", time: "16:00", status: "Confirmat", color: "bg-emerald-100 text-emerald-700" }
                      ].map((row, i) => (
                        <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-slate-200 uppercase flex items-center justify-center text-[8px]">{row.name[0]}</div> {row.name}</td>
                          <td className="p-4 uppercase tracking-tighter text-slate-500">{row.svc}</td>
                          <td className="p-4 text-slate-900 font-black">{row.time}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${row.color}`}>{row.status}</span>
                          </td>
                          <td className="p-4"><MoreHorizontal className="w-4 h-4 text-slate-300" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative Floating Badges */}
          <motion.div 
            animate={{ x: [-10, 10, -10] }} 
            transition={{ repeat: Infinity, duration: 4 }}
            className="absolute -left-10 top-20 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 hidden lg:block"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-600"><Scissors className="w-5 h-5" /></div>
              <div>
                <p className="text-[9px] font-black uppercase italic text-slate-400">Ultima Programare</p>
                <p className="text-xs font-black italic">Tuns Fade la 14:30</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            animate={{ x: [10, -10, 10] }} 
            transition={{ repeat: Infinity, duration: 5 }}
            className="absolute -right-10 bottom-40 bg-slate-900 text-white p-4 rounded-2xl shadow-xl hidden lg:block"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-500"><UserCheck className="w-5 h-5" /></div>
              <div>
                <p className="text-[9px] font-black uppercase italic opacity-60">Feedback Clienți</p>
                <p className="text-xs font-black italic text-emerald-400">"Super ușor de folosit!"</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* --- CUM FUNCȚIONEAZĂ --- */}
      <section className="bg-white py-24 px-6 border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter mb-4">LOGICĂ SIMPLĂ. REZULTATE MAXIME.</h2>
            <p className="text-slate-400 text-xs font-bold uppercase italic">Fii creierul, nu secretara afacerii tale</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { 
                step: "01",
                title: "Te înscrii în 2 minute", 
                desc: "Nu-ți cerem cardul, nu-ți cerem sufletul. Doar numele și serviciile tale. Primești 10 zile acces total." 
              },
              { 
                step: "02",
                title: "Link-ul e asistentul tău", 
                desc: "Pui link-ul în Bio la Instagram sau status pe WhatsApp. Clienții se bat pe locurile libere fără să te sune." 
              },
              { 
                step: "03",
                title: "Feedback & Decizie", 
                desc: "După trial, ne dai un mail scurt: 'Dan, e super!' sau 'Nu e de mine'. Simplu, între bărbați de afaceri." 
              }
            ].map((s, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative p-8 rounded-[40px] bg-slate-50 border border-slate-100 group hover:border-amber-500/30 transition-all shadow-sm hover:shadow-xl"
              >
                <span className="absolute -top-6 left-8 text-6xl font-black italic text-slate-200/50 group-hover:text-amber-500/10 transition-colors">{s.step}</span>
                <h3 className="font-black italic uppercase text-lg mb-4 mt-4 tracking-tighter group-hover:text-amber-600">{s.title}</h3>
                <p className="text-slate-500 text-[10px] font-bold uppercase italic leading-relaxed">{s.desc}</p>
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