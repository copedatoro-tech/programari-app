"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Users, Zap, ShieldCheck, ArrowRight, Clock, Star, MousePointer2, Share2, CheckCircle2, MoreHorizontal, MessageSquare, Scissors, UserCheck, Phone, BellRing } from "lucide-react";

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
            TU FACI CE ȘTII <span className="text-amber-600">CEL MAI BINE!</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-3xl mx-auto text-slate-800 text-[11px] md:text-sm font-bold uppercase italic tracking-wide mb-8 leading-relaxed"
          >
            Iar Chronos se ocupă de rezervări fără ca tu să îți mai faci probleme. Odată ce ai setat orarul și timpul de execuție al serviciilor, Chronos va ști exact să îți organizeze clienții și programările în funcție de necesitățile tale.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-4 mb-12"
          >
            <Link 
              href="/register"
              className="w-full max-w-lg h-[100px] bg-amber-500 text-slate-950 rounded-[30px] font-black italic uppercase tracking-widest hover:bg-amber-400 shadow-2xl shadow-amber-500/40 transition-all flex flex-col items-center justify-center active:scale-95 group overflow-hidden relative border-b-8 border-amber-700"
            >
              <span className="relative z-10 text-xl md:text-2xl flex items-center gap-3">
                DORESC OFERTA: 10 ZILE GRATUIT 
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <ArrowRight className="w-7 h-7" />
                </motion.div>
              </span>
              <span className="relative z-10 text-[11px] font-black tracking-[0.3em] mt-1">CREEAZĂ-ȚI CONT</span>
            </Link>

            <p className="text-[10px] font-black text-slate-900 uppercase italic tracking-widest bg-amber-100 px-4 py-1 rounded-full mt-2">
              * După 10 zile, ne dai un feedback pe email și tu decizi dacă mergem mai departe.
            </p>
          </motion.div>
        </div>

        {/* --- APP SHOWCASE --- */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="relative w-full max-w-5xl"
        >
          <div className="bg-slate-800 rounded-t-[30px] p-2 shadow-2xl border-x-4 border-t-4 border-slate-700">
            <div className="flex items-center gap-1.5 mb-2 px-4 py-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <div className="ml-4 bg-slate-700/50 px-3 py-0.5 rounded text-[8px] text-slate-400 font-mono italic uppercase">agenda.chronos/dashboard</div>
            </div>
            
            <div className="bg-white rounded-t-xl overflow-hidden min-h-[450px] relative">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                    <h3 className="font-black italic text-lg uppercase tracking-tighter leading-none">Agenda Ta</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase italic mt-1">Luni, 13 Aprilie 2026</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase italic tracking-widest">+ Adaugă Manual</div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm relative">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="p-4 text-[9px] font-black uppercase italic text-slate-400 tracking-widest">Ora</th>
                        <th className="p-4 text-[9px] font-black uppercase italic text-slate-400 tracking-widest">Client / Detalii</th>
                        <th className="p-4 text-[9px] font-black uppercase italic text-slate-400 tracking-widest">Serviciu</th>
                        <th className="p-4 text-[9px] font-black uppercase italic text-slate-400 tracking-widest">Status</th>
                        <th className="p-4"></th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px] font-bold italic">
                      <tr className="border-b border-slate-50 bg-slate-50/30 relative">
                        <td className="p-4 text-amber-600 font-black">14:30</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[8px]">A</div>
                            <span>Andrei Ionescu</span>
                          </div>
                          
                          {/* --- POP-UP REZERVARE --- */}
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="absolute left-32 top-10 z-20 bg-white shadow-2xl rounded-2xl p-3 border border-slate-100 flex items-center gap-3"
                          >
                            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
                                <BellRing className="w-4 h-4" />
                            </div>
                            <div className="pr-4">
                                <p className="text-[10px] font-black text-slate-900 uppercase italic leading-none">Rezervare #9 primită</p>
                                <p className="text-[8px] text-slate-400 uppercase font-black tracking-tighter mt-1">Verifică detaliile în agendă</p>
                            </div>
                          </motion.div>
                        </td>
                        <td className="p-4 uppercase tracking-tighter text-slate-500">Tuns + Barbă</td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded-lg text-[8px] font-black uppercase bg-emerald-100 text-emerald-700">Confirmat</span>
                        </td>
                        <td className="p-4"><MoreHorizontal className="w-4 h-4 text-slate-300" /></td>
                      </tr>

                      <tr className="border-b border-slate-50 opacity-60">
                        <td className="p-4 text-slate-400 font-black">15:15</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[8px]">M</div>
                            <span>Mihai Georgescu</span>
                          </div>
                        </td>
                        <td className="p-4 uppercase tracking-tighter text-slate-500">Tuns Fade</td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded-lg text-[8px] font-black uppercase bg-amber-100 text-amber-700">În Așteptare</span>
                        </td>
                        <td className="p-4"><MoreHorizontal className="w-4 h-4 text-slate-300" /></td>
                      </tr>

                      <tr className="border-b border-slate-50">
                        <td className="p-4 text-amber-600 font-black">16:00</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[8px]">R</div>
                            <span>Radu Popescu</span>
                          </div>
                        </td>
                        <td className="p-4 uppercase tracking-tighter text-slate-500">Vopsit</td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded-lg text-[8px] font-black uppercase bg-emerald-100 text-emerald-700">Confirmat</span>
                        </td>
                        <td className="p-4"><MoreHorizontal className="w-4 h-4 text-slate-300" /></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex gap-4">
                    <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[8px] font-black uppercase text-slate-400 mb-1 italic">Total Azi</p>
                        <p className="text-sm font-black italic">12 Programări</p>
                    </div>
                    <div className="flex-1 bg-amber-50 p-4 rounded-2xl border border-amber-100">
                        <p className="text-[8px] font-black uppercase text-amber-600 mb-1 italic">Timp Ocupat</p>
                        <p className="text-sm font-black italic">6h 30min</p>
                    </div>
                </div>
              </div>
            </div>
          </div>

          <motion.div 
            animate={{ y: [-5, 5, -5] }} 
            transition={{ repeat: Infinity, duration: 3 }}
            className="absolute -left-12 top-1/2 bg-white p-5 rounded-[25px] shadow-2xl border-4 border-slate-100 hidden lg:block z-30"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20"><UserCheck className="w-6 h-6" /></div>
              <div>
                <p className="text-[9px] font-black uppercase italic text-slate-400 leading-none mb-1">Automatizare</p>
                <p className="text-xs font-black italic">SINCRO TOTALĂ</p>
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
                desc: "Nu-ți cerem cardul la început. Doar numele și serviciile tale. Primești 10 zile acces total pentru a vedea cum crește profitul." 
              },
              { 
                step: "02",
                title: "Link-ul face treaba", 
                desc: "Clienții primesc link-ul tău. Ei își aleg ora, Chronos le confirmă rezervarea și tu îi vezi direct în agenda ta." 
              },
              { 
                step: "03",
                title: "Feedback & Evoluție", 
                desc: "După trial, discutăm pe email despre experiența ta. Ne dorim să construim cel mai bun asistent digital pentru afacerea ta." 
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
            CHRONOS<span className="text-amber-500">.SYSTEM</span>
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