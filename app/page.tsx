"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight, ShieldCheck, Mail, BellRing, MoreHorizontal,
  Calendar, Users, Zap, Star, Clock, FileText, BarChart2,
  Phone, CheckCircle2, Package, MapPin, QrCode, Smartphone,
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const isDemo = localStorage.getItem("chronos_demo") === "true";
        if (session || isDemo) router.replace("/programari");
        else setIsChecking(false);
      } catch {
        setIsChecking(false);
      }
    };
    checkUser();
  }, [router]);

  if (isChecking) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <motion.div animate={{ scale: [1,1.1,1], opacity: [0.3,0.6,0.3] }} transition={{ repeat: Infinity, duration: 2 }}>
          <Image src="/logo-chronos.png" alt="Logo" width={80} height={80} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">

      {/* ── NAVBAR ───────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 md:px-10 py-4 max-w-7xl mx-auto">
        <motion.div initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} className="flex items-center gap-2">
          <Image src="/logo-chronos.png" alt="Chronos Logo" width={32} height={32} />
          <span className="font-black text-base tracking-tighter italic uppercase">
            CHRONOS<span className="text-amber-500">.</span>
          </span>
        </motion.div>
        <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} className="flex items-center gap-3">
          <Link href="/login" className="text-[10px] font-black uppercase italic text-slate-600 hover:text-slate-900 transition-colors px-3 py-2">
            Intră în cont
          </Link>
          <Link href="/register" className="bg-slate-900 px-5 py-2 rounded-xl text-[10px] font-black uppercase italic text-white hover:bg-amber-600 transition-all active:scale-95 tracking-widest">
            Înregistrare gratuită →
          </Link>
        </motion.div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="px-6 pt-6 pb-16 max-w-7xl mx-auto flex flex-col items-center text-center">
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-amber-50 border border-amber-200 text-[9px] font-black uppercase italic text-amber-700 tracking-[0.15em]">
          🔥 10 ZILE TRIAL GRATUIT — FĂRĂ CARD
        </motion.div>

        <motion.h1 initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
          className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9] mb-6 max-w-4xl">
          TU FACI CE ȘTII <span className="text-amber-600">CEL MAI BINE.</span><br/>
          <span className="text-slate-400">CHRONOS SE OCUPĂ DE REST.</span>
        </motion.h1>

        <motion.p initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
          className="max-w-2xl text-slate-600 text-[11px] md:text-sm font-bold uppercase italic tracking-wide mb-10 leading-relaxed">
          Platforma completă de management pentru saloane, clinici, ateliere și orice afacere bazată pe programări. Calendar, clienți, documente, rapoarte și rezervări online — totul într-un singur loc.
        </motion.p>

        <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.3 }}
          className="flex flex-col items-center gap-4 w-full max-w-lg mb-16">
          <Link href="/register"
            className="w-full h-[90px] bg-amber-500 text-slate-950 rounded-[28px] font-black italic uppercase tracking-widest hover:bg-amber-400 shadow-2xl shadow-amber-500/30 transition-all flex flex-col items-center justify-center active:scale-95 border-b-8 border-amber-700 hover:border-amber-600 group">
            <span className="text-xl md:text-2xl flex items-center gap-3">
              VREAU 10 ZILE GRATUIT
              <motion.div animate={{ x:[0,5,0] }} transition={{ repeat:Infinity, duration:1.5 }}>
                <ArrowRight className="w-6 h-6" />
              </motion.div>
            </span>
            <span className="text-[10px] font-black tracking-[0.3em] mt-1 opacity-70">CREEAZĂ-ȚI CONTUL ACUM</span>
          </Link>
          <p className="text-[9px] font-black text-slate-500 uppercase italic tracking-widest">
            * Fără card. Fără obligații. Doar rezultate.
          </p>
        </motion.div>

        {/* App mockup */}
        <motion.div initial={{ opacity:0, y:40 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5, duration:0.8 }}
          className="relative w-full max-w-5xl">
          <div className="bg-slate-800 rounded-t-[28px] p-2 shadow-2xl border-x-4 border-t-4 border-slate-700">
            <div className="flex items-center gap-1.5 mb-2 px-4 py-1">
              <div className="w-2 h-2 rounded-full bg-red-500"/>
              <div className="w-2 h-2 rounded-full bg-amber-500"/>
              <div className="w-2 h-2 rounded-full bg-emerald-500"/>
              <div className="ml-4 bg-slate-700/50 px-3 py-0.5 rounded text-[8px] text-slate-400 font-mono italic">chronos.app/programari</div>
            </div>
            <div className="bg-white rounded-t-xl overflow-hidden min-h-[420px]">
              {/* Header mock */}
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="font-black italic text-base uppercase tracking-tighter leading-none">Gestiune <span className="text-amber-600">Programări</span></h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase italic mt-1">Joi, 18 Iunie 2026 · 3 programări azi</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-[9px] font-black uppercase italic text-amber-700">📅 Calendar</div>
                  <div className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase italic">+ Programare Nouă</div>
                </div>
              </div>
              {/* Table mock */}
              <div className="p-5">
                <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {["Ora","Client","Specialist","Serviciu","Status",""].map(h=>(
                          <th key={h} className="p-3 text-[8px] font-black uppercase italic text-slate-400 tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-[10px] font-bold italic">
                      {[
                        { ora:"09:00", client:"Maria Ionescu", spec:"Alexandra", svc:"Masaj Facial 90min", status:"Confirmat", color:"emerald", online:true },
                        { ora:"10:30", client:"Dan Popescu", spec:"Andrei", svc:"Tuns + Barbă 60min", status:"Confirmat", color:"emerald", online:false },
                        { ora:"12:00", client:"Ioana Stan", spec:"Ramona", svc:"Vopsit 120min", status:"În așteptare", color:"amber", online:true },
                      ].map((row,i)=>(
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 relative">
                          <td className="p-3 text-amber-600 font-black">{row.ora}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[8px]">{row.client[0]}</div>
                              <span>{row.client}</span>
                              {row.online && <span className="text-[7px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-md font-black">🌐 Online</span>}
                            </div>
                          </td>
                          <td className="p-3 text-slate-500">{row.spec}</td>
                          <td className="p-3 text-slate-500">{row.svc}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase bg-${row.color}-100 text-${row.color}-700`}>{row.status}</span>
                          </td>
                          <td className="p-3"><MoreHorizontal className="w-4 h-4 text-slate-300"/></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Stats row */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { label:"Programări Azi", val:"3 Total · 2 Online", bg:"bg-slate-50", border:"border-slate-100", text:"text-slate-700" },
                    { label:"Timp Ocupat", val:"4h 30min", bg:"bg-amber-50", border:"border-amber-100", text:"text-amber-700" },
                    { label:"Specialiști Activi", val:"3 din 3", bg:"bg-emerald-50", border:"border-emerald-100", text:"text-emerald-700" },
                  ].map((s,i)=>(
                    <div key={i} className={`${s.bg} border ${s.border} p-3 rounded-2xl`}>
                      <p className="text-[8px] font-black uppercase text-slate-400 mb-1 italic">{s.label}</p>
                      <p className={`text-sm font-black italic ${s.text}`}>{s.val}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Floating badge */}
          <motion.div animate={{ y:[-5,5,-5] }} transition={{ repeat:Infinity, duration:3 }}
            className="absolute -left-6 top-1/3 bg-white p-4 rounded-[22px] shadow-2xl border-2 border-slate-100 hidden lg:flex items-center gap-3 z-30">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center"><BellRing className="w-5 h-5 text-white"/></div>
            <div>
              <p className="text-[9px] font-black uppercase italic text-slate-400 leading-none mb-1">Rezervare Nouă</p>
              <p className="text-xs font-black italic text-slate-900">Maria Ionescu · 14:30</p>
            </div>
          </motion.div>
          <motion.div animate={{ y:[5,-5,5] }} transition={{ repeat:Infinity, duration:3.5 }}
            className="absolute -right-6 top-1/2 bg-slate-900 p-4 rounded-[22px] shadow-2xl hidden lg:flex items-center gap-3 z-30">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-white"/></div>
            <div>
              <p className="text-[9px] font-black uppercase italic text-slate-400 leading-none mb-1">Confirmat automat</p>
              <p className="text-xs font-black italic text-white">0 mesaje de trimis</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── CE CONȚINE CHRONOS ────────────────────────────────────────────── */}
      <section className="bg-white py-24 px-6 border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter mb-4">
              TOT CE AI NEVOIE.<br/><span className="text-amber-500">NIMIC ÎN PLUS.</span>
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase italic">Fiecare modul a fost gândit pentru afaceri reale</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Calendar className="w-6 h-6"/>,
                color: "bg-amber-500",
                titlu: "Calendar Inteligent",
                desc: "Vizualizare pe Zi, Săptămână, Lună și An. Orele din programul de lucru sunt distincte vizual față de cele în afara programului. Zilele închise apar cu fond diferit. Filtrare per specialist sau serviciu.",
              },
              {
                icon: <Zap className="w-6 h-6"/>,
                color: "bg-blue-500",
                titlu: "Rezervări Online",
                desc: "Link personal și cod QR unice pentru afacerea ta. Clienții își aleg singuri ora disponibilă. Sistemul blochează automat orele ocupate per specialist. Fără suprapuneri, fără confuzii.",
              },
              {
                icon: <Users className="w-6 h-6"/>,
                color: "bg-emerald-500",
                titlu: "Bază Date Clienți",
                desc: "Dosarul complet al fiecărui client: istoric programări, lucrări efectuate, calculator profit per lucrare, fișiere atașate (imagini, video, audio, documente PDF). Se actualizează automat.",
              },
              {
                icon: <Package className="w-6 h-6"/>,
                color: "bg-violet-500",
                titlu: "Gestiune Servicii & Specialiști",
                desc: "Definești serviciile cu preț și durată. Asociezi fiecare specialist cu serviciile pe care le oferă. La programare, sistemul filtrează automat opțiunile și blochează slotul corect în calendar.",
              },
              {
                icon: <BarChart2 className="w-6 h-6"/>,
                color: "bg-rose-500",
                titlu: "Rapoarte & Analiză",
                desc: "Monitorizează numărul de programări, veniturile și profitul per specialist și serviciu. Identifică orele și zilele cu cea mai mare activitate. Cu cât datele sunt mai complete, cu atât rapoartele sunt mai precise.",
              },
              {
                icon: <FileText className="w-6 h-6"/>,
                color: "bg-cyan-500",
                titlu: "Documente per Programare",
                desc: "Atașează orice tip de fișier la fiecare programare: PDF, imagini, audio, video. Documentele se sincronizează automat cu dosarul clientului. Utile pentru rețete, specificații tehnice, note sau referințe vizuale.",
              },
              {
                icon: <Star className="w-6 h-6"/>,
                color: "bg-amber-400",
                titlu: "Recenzii Clienți",
                desc: "Clienții pot lăsa recenzii prin pagina publică de rezervări. Poți adăuga manual recenzii de la clienți fideli. Scorul mediu este vizibil pe pagina ta publică și influențează încrederea clienților noi.",
              },
              {
                icon: <Phone className="w-6 h-6"/>,
                color: "bg-teal-500",
                titlu: "Contacte Utile",
                desc: "Agenda separată pentru furnizori, parteneri și colaboratori. Acces rapid la numerele importante în situații de urgență. Complet separată de baza de date a clienților.",
              },
              {
                icon: <Smartphone className="w-6 h-6"/>,
                color: "bg-indigo-500",
                titlu: "Notificări WhatsApp",
                desc: "Disponibil în planurile Elite și Team. Trimite confirmări și remindere automate clienților pe WhatsApp. Direct din aplicație, cu un singur click, personalizat cu numele clientului și detaliile programării.",
              },
            ].map((f,i)=>(
              <motion.div key={i}
                initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ delay: i*0.05 }}
                className="bg-slate-50 border border-slate-100 rounded-[30px] p-7 hover:border-amber-300 hover:shadow-lg transition-all group">
                <div className={`w-12 h-12 ${f.color} rounded-2xl flex items-center justify-center text-white mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                  {f.icon}
                </div>
                <h3 className="font-black italic uppercase text-base tracking-tight mb-3 group-hover:text-amber-600 transition-colors">{f.titlu}</h3>
                <p className="text-slate-500 text-[10px] font-bold leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CUM FUNCȚIONEAZĂ ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter mb-4">
              PORNEȘTI ÎN <span className="text-amber-500">4 PAȘI SIMPLI</span>
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase italic">De la zero la afacere organizată în mai puțin de o oră</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step:"01", icon:"👤", titlu:"Completezi Profilul", desc:"Adaugi numele afacerii, slug-ul unic, telefonul, adresa și logo-ul. Slug-ul generează link-ul tău personal și codul QR pentru rezervări online." },
              { step:"02", icon:"⚙️", titlu:"Setezi Programul", desc:"Definești orele de lucru pentru fiecare zi, marchezi zilele închise și adaugi serviciile cu prețul și durata lor. Asociezi fiecare specialist cu serviciile lui." },
              { step:"03", icon:"🔗", titlu:"Distribui Link-ul", desc:"Trimiți link-ul sau codul QR clienților. Ei rezervă singuri, sistemul confirmă automat și programarea apare instant în calendarul tău." },
              { step:"04", icon:"📊", titlu:"Monitorizezi & Crești", desc:"Urmărești rapoartele de activitate, gestionezi dosarele clienților și optimizezi programul în funcție de datele reale din aplicație." },
            ].map((s,i)=>(
              <motion.div key={i}
                initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ delay: i*0.1 }}
                className="relative bg-white border border-slate-100 rounded-[30px] p-7 hover:border-amber-300 hover:shadow-lg transition-all group">
                <span className="absolute -top-5 left-6 text-5xl font-black italic text-slate-100 group-hover:text-amber-50 transition-colors select-none">{s.step}</span>
                <div className="text-3xl mb-4 mt-2">{s.icon}</div>
                <h3 className="font-black italic uppercase text-sm tracking-tight mb-3 group-hover:text-amber-600 transition-colors">{s.titlu}</h3>
                <p className="text-slate-500 text-[10px] font-bold leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANURI ──────────────────────────────────────────────────────── */}
      <section className="bg-white py-24 px-6 border-t border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter mb-4">
              PREȚURI <span className="text-amber-500">TRANSPARENTE</span>
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase italic">Activează trial-ul după ce ai configurat complet aplicația — nu pierzi nicio zi</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {[
              { plan:"Free", price:"Gratuit", prog:"30 prog/lună", features:["Calendar complet","Bază date clienți","Gestiune servicii","Documente atașate"], highlight:false },
              { plan:"Pro", price:"—", prog:"150 prog/lună", features:["Tot din Free","Link rezervări online","Cod QR personal","Rapoarte avansate"], highlight:false },
              { plan:"Elite", price:"—", prog:"500 prog/lună", features:["Tot din Pro","WhatsApp automat clienți","Notificări specialiști","Prioritate suport"], highlight:true },
              { plan:"Team", price:"—", prog:"Nelimitat", features:["Tot din Elite","Programări nelimitate","Multi-specialist complet","10 zile trial gratuit"], highlight:false },
            ].map((p,i)=>(
              <motion.div key={i}
                initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ delay: i*0.08 }}
                className={`rounded-[28px] p-6 border-2 transition-all ${p.highlight ? "bg-slate-900 border-amber-500 shadow-2xl scale-105" : "bg-slate-50 border-slate-100 hover:border-amber-200"}`}>
                <div className={`text-[9px] font-black uppercase tracking-widest italic mb-2 ${p.highlight?"text-amber-500":"text-slate-400"}`}>
                  {p.highlight ? "⭐ POPULAR" : "PLAN"}
                </div>
                <h3 className={`text-2xl font-black italic uppercase tracking-tighter mb-1 ${p.highlight?"text-white":"text-slate-900"}`}>{p.plan}</h3>
                <p className={`text-[10px] font-black italic mb-5 ${p.highlight?"text-amber-400":"text-amber-600"}`}>{p.prog}</p>
                <div className="space-y-2.5 mb-6">
                  {p.features.map((f,j)=>(
                    <div key={j} className="flex items-center gap-2">
                      <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 ${p.highlight?"text-amber-500":"text-emerald-500"}`}/>
                      <span className={`text-[10px] font-bold ${p.highlight?"text-slate-300":"text-slate-600"}`}>{f}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/register"
              className="inline-flex items-center gap-3 bg-amber-500 text-slate-900 px-10 py-5 rounded-2xl font-black italic uppercase text-sm tracking-widest hover:bg-amber-400 shadow-xl shadow-amber-500/20 transition-all active:scale-95 border-b-4 border-amber-700">
              ÎNCEPE CU 10 ZILE GRATUIT <ArrowRight className="w-5 h-5"/>
            </Link>
            <p className="text-[9px] text-slate-400 font-bold uppercase italic mt-3 tracking-widest">Fără card. Fără obligații. Activează după ce configurezi totul.</p>
          </div>
        </div>
      </section>

      {/* ── PENTRU CINE E CHRONOS ─────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter mb-4">
              PENTRU ORICINE <span className="text-amber-500">LUCREAZĂ CU PROGRAMĂRI</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon:"💇", label:"Saloane & Coafuri" },
              { icon:"💅", label:"Saloane Unghii" },
              { icon:"🧴", label:"Clinici Estetice" },
              { icon:"💪", label:"Personal Trainers" },
              { icon:"🔧", label:"Ateliere Auto" },
              { icon:"🏥", label:"Cabinete Medicale" },
              { icon:"🎸", label:"Profesori Muzică" },
              { icon:"🏠", label:"Servicii la Domiciliu" },
            ].map((c,i)=>(
              <motion.div key={i}
                initial={{ opacity:0, scale:0.95 }} whileInView={{ opacity:1, scale:1 }} viewport={{ once:true }} transition={{ delay:i*0.05 }}
                className="bg-white border border-slate-100 rounded-[22px] p-5 text-center hover:border-amber-300 hover:shadow-md transition-all">
                <div className="text-3xl mb-3">{c.icon}</div>
                <p className="text-[10px] font-black uppercase italic text-slate-700 leading-tight">{c.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────────────── */}
      <section className="bg-slate-900 py-24 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}>
            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-white mb-6">
              GATA SĂ ÎNCERCI?<br/><span className="text-amber-500">10 ZILE. GRATUIT. FĂRĂ RISC.</span>
            </h2>
            <p className="text-slate-400 text-sm font-bold uppercase italic mb-10 leading-relaxed">
              Completezi profilul, setezi programul, adaugi serviciile și specialiștii — și ești gata să primești rezervări online. Activezi trial-ul după ce ai terminat setările ca să nu pierzi nicio zi.
            </p>
            <Link href="/register"
              className="inline-flex items-center gap-3 bg-amber-500 text-slate-900 px-12 py-6 rounded-2xl font-black italic uppercase text-base tracking-widest hover:bg-amber-400 shadow-2xl shadow-amber-500/20 transition-all active:scale-95 border-b-4 border-amber-700">
              CREEAZĂ CONT GRATUIT <ArrowRight className="w-6 h-6"/>
            </Link>
            <p className="text-[9px] text-slate-600 font-bold uppercase italic mt-4 tracking-widest">Fără card. Fără obligații. Fără mesaje la 11 noaptea.</p>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-white pt-16 pb-8 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Image src="/logo-chronos.png" alt="Chronos" width={30} height={30} className="brightness-200"/>
                <span className="font-black text-lg tracking-tighter italic uppercase">CHRONOS<span className="text-amber-500">.</span></span>
              </div>
              <p className="text-slate-500 text-[10px] font-bold uppercase italic leading-relaxed">
                Platforma completă de management pentru afaceri bazate pe programări. Calendar, clienți, documente, rapoarte și rezervări online.
              </p>
            </div>
            {/* Legal */}
            <div className="flex flex-col gap-3">
              <h4 className="text-amber-500 font-black italic uppercase text-[10px] tracking-widest mb-1">Legal</h4>
              {[
                { label:"Termeni și Condiții", href:"/terms" },
                { label:"Politica de Confidențialitate", href:"/privacy" },
                { label:"Politica Cookies", href:"/cookies" },
              ].map(l=>(
                <Link key={l.href} href={l.href} className="text-slate-500 text-[10px] font-black uppercase italic hover:text-white transition-colors">{l.label}</Link>
              ))}
            </div>
            {/* Contact */}
            <div className="flex flex-col gap-3">
              <h4 className="text-amber-500 font-black italic uppercase text-[10px] tracking-widest mb-1">Contact Chronos</h4>
              <a href="mailto:copedatoro@gmail.com" className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase italic hover:text-white transition-colors">
                <Mail className="w-3 h-3 text-amber-500"/> copedatoro@gmail.com
              </a>
              <p className="text-slate-600 text-[9px] font-bold uppercase italic">Răspundem în maxim 24 de ore.</p>
            </div>
            {/* CTA */}
            <div className="flex flex-col gap-3">
              <h4 className="text-amber-500 font-black italic uppercase text-[10px] tracking-widest mb-1">Acces Rapid</h4>
              <Link href="/register" className="bg-amber-500 text-slate-900 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase italic text-center hover:bg-amber-400 transition-all">
                Cont Nou Gratuit →
              </Link>
              <Link href="/login" className="bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase italic text-center hover:bg-white/10 transition-all">
                Intră în Contul Meu
              </Link>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] italic">
              &copy; 2026 CHRONOS. Toate drepturile rezervate.
            </p>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500"/>
              <span className="text-[8px] font-black text-slate-600 uppercase italic tracking-widest">Securizat prin Supabase</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}