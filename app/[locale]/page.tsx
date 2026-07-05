"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { supabase } from "@/lib/supabaseClient";
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
  const t = useTranslations("landing");

  useEffect(() => {
    const checkUser = async () => {
      try {
        // ✅ Timeout de 1.5s — dacă Supabase nu răspunde rapid, afișăm landing page-ul oricum
        const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 1500));
        const sessionPromise = supabase.auth.getSession().then(r => r.data.session);
        const session = await Promise.race([sessionPromise, timeout]);
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

  const features = t.raw("features.items") as { titlu: string; desc: string }[];
  const steps = t.raw("steps.items") as { titlu: string; desc: string }[];
  const pricingPlans = t.raw("pricing.plans") as { plan: string; price: string; prog: string; features: string[] }[];
  const audienceItems = t.raw("audience.items") as { icon: string; label: string }[];
  const legalLinks = t.raw("footer.legalLinks") as { label: string; href: string }[];

  const featureIcons = [
    <Calendar className="w-6 h-6" key="cal" />, <Zap className="w-6 h-6" key="zap" />,
    <Users className="w-6 h-6" key="users" />, <Package className="w-6 h-6" key="pkg" />,
    <BarChart2 className="w-6 h-6" key="bar" />, <FileText className="w-6 h-6" key="file" />,
    <Star className="w-6 h-6" key="star" />, <Phone className="w-6 h-6" key="phone" />,
    <Smartphone className="w-6 h-6" key="smart" />,
  ];
  const featureColors = ["bg-amber-500","bg-blue-500","bg-emerald-500","bg-violet-500","bg-rose-500","bg-cyan-500","bg-amber-400","bg-teal-500","bg-indigo-500"];
  const stepIcons = ["👤", "⚙️", "🔗", "📊"];

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
          <LocaleSwitcher />
          <Link href="/login" className="text-[10px] font-black uppercase italic text-slate-600 hover:text-slate-900 transition-colors px-3 py-2">
            {t("nav.login")}
          </Link>
          <Link href="/register" className="bg-slate-900 px-5 py-2 rounded-xl text-[10px] font-black uppercase italic text-white hover:bg-amber-600 transition-all active:scale-95 tracking-widest">
            {t("nav.registerCta")}
          </Link>
        </motion.div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="px-6 pt-6 pb-16 max-w-7xl mx-auto flex flex-col items-center text-center">
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-amber-50 border border-amber-200 text-[9px] font-black uppercase italic text-amber-700 tracking-[0.15em]">
          {t("hero.badge")}
        </motion.div>

        <motion.h1 initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
          className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none mb-6 max-w-4xl">
          <span className="block mb-3">{t("hero.titleLine1")} <span className="text-amber-600">{t("hero.titleHighlight1")}</span></span>
          <span className="block text-slate-400">{t("hero.titleLine2")}</span>
        </motion.h1>

        <motion.p initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
          className="max-w-2xl text-slate-600 text-[11px] md:text-sm font-bold uppercase italic tracking-wide mb-10 leading-relaxed">
          {t("hero.subtitle")}
        </motion.p>

        <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.3 }}
          className="flex flex-col items-center gap-4 w-full max-w-lg mb-16">
          <Link href="/register"
            className="w-full h-[90px] bg-amber-500 text-slate-950 rounded-[28px] font-black italic uppercase tracking-widest hover:bg-amber-400 shadow-2xl shadow-amber-500/30 transition-all flex flex-col items-center justify-center active:scale-95 border-b-8 border-amber-700 hover:border-amber-600 group">
            <span className="text-xl md:text-2xl flex items-center gap-3">
              {t("hero.ctaMain")}
              <motion.div animate={{ x:[0,5,0] }} transition={{ repeat:Infinity, duration:1.5 }}>
                <ArrowRight className="w-6 h-6" />
              </motion.div>
            </span>
            <span className="text-[10px] font-black tracking-[0.3em] mt-1 opacity-70">{t("hero.ctaSub")}</span>
          </Link>
          <p className="text-[9px] font-black text-slate-500 uppercase italic tracking-widest">
            {t("hero.disclaimer")}
          </p>
        </motion.div>

        {/* ── App Mockup — fidel interfeței reale ── */}
        <motion.div initial={{ opacity:0, y:40 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5, duration:0.8 }}
          className="relative w-full max-w-5xl">

          {/* Cadru browser */}
          <div className="bg-slate-800 rounded-t-[28px] p-2 shadow-2xl border-x-4 border-t-4 border-slate-700">
            <div className="flex items-center gap-1.5 mb-2 px-4 py-1">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500"/>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500"/>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"/>
              <div className="ml-4 bg-slate-700/60 px-4 py-0.5 rounded-lg text-[8px] text-slate-400 font-mono">chronos.app/programari</div>
            </div>

            <div className="bg-slate-50 rounded-t-xl overflow-hidden">

              {/* ── Header aplicație — identic cu cel real ── */}
              <div className="bg-white border-b-2 border-slate-100 h-12 flex items-center px-5 gap-4 shadow-sm">
                <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center">
                  <span className="text-amber-500 font-black text-[11px]">C</span>
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-lg bg-amber-50 border-2 border-amber-500">
                    <span className="text-[9px] font-black uppercase italic tracking-widest text-slate-900">{t("mockup.pageTitle")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden md:flex flex-col items-end px-3 py-1 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[6px] font-black uppercase text-slate-400">{t("mockup.planActive")}</span>
                    <span className="text-[8px] font-black italic uppercase text-slate-900">CHRONOS TEAM</span>
                  </div>
                  <div className="px-3 py-1.5 bg-slate-900 rounded-lg text-[8px] font-black uppercase italic text-white">{t("mockup.menuBtn")}</div>
                </div>
              </div>

              {/* ── Conținut pagină programări ── */}
              <div className="p-5">

                {/* Titlu pagină + stats */}
                <div className="flex items-end justify-between mb-5">
                  <div>
                    <h1 className="text-xl font-black italic uppercase tracking-tighter leading-none">
                      {t("mockup.heading")} <span className="text-amber-600">{t("mockup.headingHighlight")}</span>
                    </h1>
                    <p className="text-[8px] font-black uppercase italic text-slate-400 mt-1">
                      {t("mockup.planLine")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 items-end">
                    <div className="bg-white px-4 py-1.5 rounded-xl shadow-sm border border-amber-100 flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"/>
                      <span className="text-[8px] font-black uppercase italic text-slate-600">
                        {t("mockup.todayStats")}
                      </span>
                    </div>
                    <div className="bg-white px-4 py-1.5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-2">
                      <span className="text-[9px]">📅</span>
                      <span className="text-[8px] font-black uppercase italic text-slate-600">{t("mockup.calendarLabel")}</span>
                    </div>
                  </div>
                </div>

                {/* ── Formular client (simplificat) ── */}
                <div className="bg-white rounded-[28px] p-5 shadow-xl border border-slate-100 mb-4">
                  {/* Câmpuri client */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="col-span-3 bg-slate-50 rounded-[18px] px-4 py-2.5 border-2 border-transparent">
                      <p className="text-[7px] font-black uppercase italic text-slate-400 mb-0.5">{t("mockup.clientNameLabel")}</p>
                      <p className="text-[11px] font-black text-slate-700 italic">Ion Vasile</p>
                    </div>
                    <div className="bg-slate-50 rounded-[18px] px-4 py-2.5 border-2 border-transparent">
                      <p className="text-[7px] font-black uppercase italic text-slate-400 mb-0.5">{t("mockup.emailLabel")}</p>
                      <p className="text-[9px] font-black text-slate-500 italic truncate">ion@email.com</p>
                    </div>
                    <div className="bg-slate-50 rounded-[18px] px-4 py-2.5 border-2 border-transparent">
                      <p className="text-[7px] font-black uppercase italic text-slate-400 mb-0.5">{t("mockup.phoneLabel")}</p>
                      <p className="text-[9px] font-black text-slate-500 italic">0770 123 456</p>
                    </div>
                    <div className="bg-slate-50 rounded-[18px] px-4 py-2.5 border-2 border-transparent">
                      <p className="text-[7px] font-black uppercase italic text-slate-400 mb-0.5">{t("mockup.notesLabel")}</p>
                      <p className="text-[9px] font-black text-slate-300 italic">{t("mockup.notesPlaceholder")}</p>
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-slate-100"/>
                    <span className="text-[7px] font-black text-slate-400 uppercase italic tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-200">{t("mockup.servicesDivider")}</span>
                    <div className="h-px flex-1 bg-slate-100"/>
                  </div>

                  {/* Slot serviciu — card complet */}
                  <div className="bg-white rounded-[22px] border-2 border-amber-400 shadow-md p-4 mb-3">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-[10px] italic">✓</div>
                      <span className="text-[8px] font-black uppercase italic text-slate-400 tracking-widest">{t("mockup.serviceNumberLabel")} <span className="text-amber-600">{t("mockup.serviceDemo")}</span></span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-slate-50 rounded-[16px] px-3 py-2.5">
                        <p className="text-[7px] font-black uppercase italic text-slate-400 mb-0.5">{t("mockup.specialistLabel")}</p>
                        <p className="text-[10px] font-black italic text-slate-800">Alexandra</p>
                      </div>
                      <div className="bg-slate-50 rounded-[16px] px-3 py-2.5">
                        <p className="text-[7px] font-black uppercase italic text-slate-400 mb-0.5">{t("mockup.serviceLabel")}</p>
                        <p className="text-[10px] font-black italic text-slate-800">{t("mockup.serviceWithPrice")}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-9 bg-slate-900 text-white rounded-[16px] flex items-center justify-center gap-2 text-[9px] font-black italic uppercase">
                        <span>📅</span> 25.06.2026
                      </div>
                      <div className="h-9 bg-amber-500 text-white rounded-[16px] flex items-center justify-center gap-2 text-[9px] font-black italic uppercase">
                        <span>🕒</span> 10:30
                      </div>
                    </div>
                    {/* Interval rezervat */}
                    <div className="mt-3 bg-gradient-to-r from-slate-900 to-slate-800 rounded-[14px] px-4 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 text-sm">⏱️</span>
                        <div>
                          <p className="text-[6px] font-black text-amber-400 uppercase italic tracking-widest">{t("mockup.intervalReserved")}</p>
                          <p className="text-[9px] font-black text-white italic">10:30 → 11:30 · 25.06.2026</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-amber-400">150 RON</p>
                        <p className="text-[7px] font-bold text-slate-400 italic">60 min</p>
                      </div>
                    </div>
                  </div>

                  {/* Buton adaugă serviciu */}
                  <div className="w-full py-3 border-2 border-dashed border-amber-400 rounded-[22px] flex items-center justify-center gap-2 mb-4">
                    <span className="w-5 h-5 bg-amber-500 text-white rounded-lg flex items-center justify-center text-sm font-black leading-none">+</span>
                    <span className="text-[8px] font-black uppercase italic text-amber-600">{t("mockup.addServiceBtn")}</span>
                  </div>

                  {/* Sumar */}
                  <div className="bg-slate-50 rounded-[22px] border-2 border-slate-100 p-4">
                    <p className="text-[7px] font-black text-slate-400 uppercase italic tracking-widest mb-3">{t("mockup.summaryTitle")}</p>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-amber-500 rounded-lg flex items-center justify-center text-white text-[7px] font-black">1</span>
                        <div>
                          <p className="text-[9px] font-black text-slate-800 uppercase italic">{t("mockup.serviceDemo")}</p>
                          <p className="text-[7px] font-bold text-slate-400 italic">Alexandra · 10:30 → 11:30</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-800">150 RON</p>
                        <p className="text-[7px] font-bold text-slate-400 italic">60 min</p>
                      </div>
                    </div>
                    <div className="flex justify-between pt-2">
                      <p className="text-[10px] font-black text-slate-900 uppercase italic">{t("mockup.totalLabel")}</p>
                      <div className="text-right">
                        <p className="text-base font-black text-amber-600">150 RON</p>
                        <p className="text-[7px] font-bold text-slate-400 italic">{t("mockup.durationMinutes")}</p>
                      </div>
                    </div>
                  </div>

                  {/* Buton salvează */}
                  <div className="mt-4 w-full py-4 bg-amber-600 text-white rounded-[22px] font-black uppercase italic text-[11px] flex items-center justify-center shadow-xl border-b-4 border-amber-700">
                    {t("mockup.saveBtn")}
                  </div>
                </div>

                {/* ── Programări azi — carduri reale ── */}
                <p className="text-[9px] font-black uppercase italic tracking-tighter text-slate-400 mb-3">{t("mockup.todayAppointments")}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { ora:"09:00", nume:"Maria I.", spec:"Alexandra", svc: t("mockup.demoServices.masajFacial"), color:"#3b82f6", online:true },
                    { ora:"10:30", nume:"Dan P.", spec:"Andrei", svc: t("mockup.demoServices.tunsBarba"), color:"#10b981", online:false },
                    { ora:"12:00", nume:"Ioana S.", spec:"Ramona", svc: t("mockup.demoServices.vopsit"), color:"#8b5cf6", online:true },
                    { ora:"14:15", nume:"Vasile M.", spec:"Alexandra", svc: t("mockup.demoServices.coafor"), color:"#3b82f6", online:false },
                  ].map((p,i)=>(
                    <div key={i} className="bg-white p-3.5 rounded-[22px] shadow-sm border-2 border-amber-100 ring-1 ring-amber-50 cursor-pointer hover:shadow-md transition-all">
                      <div className="flex gap-2 items-center mb-2.5 pr-2">
                        <div className="w-8 h-8 rounded-[12px] bg-slate-50 overflow-hidden border-2 border-white shadow-inner flex items-center justify-center relative shrink-0"
                          style={{ background: p.color + "22" }}>
                          <span className="text-[11px] font-black" style={{ color: p.color }}>{p.nume[0]}</span>
                        </div>
                        <div className="overflow-hidden flex-1">
                          <h4 className="font-black text-slate-800 uppercase text-[9px] truncate italic leading-tight">{p.nume}</h4>
                          <p className="text-[7px] font-black uppercase italic" style={{ color: p.color }}>
                            {p.ora} · {p.spec}
                          </p>
                          <p className="text-[7px] font-bold text-slate-400 italic uppercase truncate">{p.svc}</p>
                        </div>
                      </div>
                      <div className="bg-slate-50 px-2 py-1 rounded-lg flex items-center justify-between">
                        <p className="text-[7px] font-black text-slate-400 uppercase italic truncate">{p.svc}</p>
                        {p.online && <span className="text-[6px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md">🌐</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Floating badges */}
          <motion.div animate={{ y:[-5,5,-5] }} transition={{ repeat:Infinity, duration:3 }}
            className="absolute -left-8 top-1/4 bg-white p-4 rounded-[22px] shadow-2xl border-2 border-slate-100 hidden lg:flex items-center gap-3 z-30">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <BellRing className="w-5 h-5 text-white"/>
            </div>
            <div>
              <p className="text-[8px] font-black uppercase italic text-slate-400 leading-none mb-1">{t("mockup.onlineBadge")}</p>
              <p className="text-[11px] font-black italic text-slate-900">Maria I. · 10:30</p>
              <p className="text-[7px] font-bold text-blue-500 uppercase italic">{t("mockup.onlineSource")}</p>
            </div>
          </motion.div>

          <motion.div animate={{ y:[5,-5,5] }} transition={{ repeat:Infinity, duration:3.5 }}
            className="absolute -right-8 top-1/3 bg-slate-900 p-4 rounded-[22px] shadow-2xl hidden lg:flex items-center gap-3 z-30">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-white"/>
            </div>
            <div>
              <p className="text-[8px] font-black uppercase italic text-slate-400 leading-none mb-1">{t("mockup.autoConfirmed")}</p>
              <p className="text-[11px] font-black italic text-white">{t("mockup.autoConfirmedName")}</p>
              <p className="text-[7px] font-bold text-emerald-400 uppercase italic">{t("mockup.autoConfirmedNote")}</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── CE CONȚINE CHRONOS ────────────────────────────────────────────── */}
      <section className="bg-white py-24 px-6 border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter mb-4">
              {t("features.heading1")}<br/><span className="text-amber-500">{t("features.heading2")}</span>
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase italic">{t("features.subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f,i)=>(
              <motion.div key={i}
                initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ delay: i*0.05 }}
                className="bg-slate-50 border border-slate-100 rounded-[30px] p-7 hover:border-amber-300 hover:shadow-lg transition-all group">
                <div className={`w-12 h-12 ${featureColors[i]} rounded-2xl flex items-center justify-center text-white mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                  {featureIcons[i]}
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
              {t("steps.heading")} <span className="text-amber-500">{t("steps.headingHighlight")}</span>
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase italic">{t("steps.subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((s,i)=>(
              <motion.div key={i}
                initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ delay: i*0.1 }}
                className="relative bg-white border border-slate-100 rounded-[30px] p-7 hover:border-amber-300 hover:shadow-lg transition-all group">
                <span className="absolute -top-5 left-6 text-5xl font-black italic text-slate-100 group-hover:text-amber-50 transition-colors select-none">{String(i+1).padStart(2,"0")}</span>
                <div className="text-3xl mb-4 mt-2">{stepIcons[i]}</div>
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
              {t("pricing.heading")} <span className="text-amber-500">{t("pricing.headingHighlight")}</span>
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase italic">{t("pricing.subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {pricingPlans.map((p,i)=>{
              const highlight = i === 2;
              return (
              <motion.div key={i}
                initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ delay: i*0.08 }}
                className={`rounded-[28px] p-6 border-2 transition-all ${highlight ? "bg-slate-900 border-amber-500 shadow-2xl scale-105" : "bg-slate-50 border-slate-100 hover:border-amber-200"}`}>
                <div className={`text-[9px] font-black uppercase tracking-widest italic mb-2 ${highlight?"text-amber-500":"text-slate-400"}`}>
                  {highlight ? t("pricing.popularBadge") : t("pricing.planBadge")}
                </div>
                <h3 className={`text-2xl font-black italic uppercase tracking-tighter mb-1 ${highlight?"text-white":"text-slate-900"}`}>{p.plan}</h3>
                <p className={`text-[10px] font-black italic mb-5 ${highlight?"text-amber-400":"text-amber-600"}`}>{p.prog}</p>
                <div className="space-y-2.5 mb-6">
                  {p.features.map((f,j)=>(
                    <div key={j} className="flex items-center gap-2">
                      <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 ${highlight?"text-amber-500":"text-emerald-500"}`}/>
                      <span className={`text-[10px] font-bold ${highlight?"text-slate-300":"text-slate-600"}`}>{f}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );})}
          </div>

          <div className="mt-10 text-center">
            <Link href="/register"
              className="inline-flex items-center gap-3 bg-amber-500 text-slate-900 px-10 py-5 rounded-2xl font-black italic uppercase text-sm tracking-widest hover:bg-amber-400 shadow-xl shadow-amber-500/20 transition-all active:scale-95 border-b-4 border-amber-700">
              {t("pricing.cta")} <ArrowRight className="w-5 h-5"/>
            </Link>
            <p className="text-[9px] text-slate-400 font-bold uppercase italic mt-3 tracking-widest">{t("pricing.ctaNote")}</p>
          </div>
        </div>
      </section>

      {/* ── PENTRU CINE E CHRONOS ─────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter mb-4">
              {t("audience.heading")} <span className="text-amber-500">{t("audience.headingHighlight")}</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {audienceItems.map((c,i)=>(
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
              {t("finalCta.heading1")}<br/><span className="text-amber-500">{t("finalCta.heading2")}</span>
            </h2>
            <p className="text-slate-400 text-sm font-bold uppercase italic mb-10 leading-relaxed">
              {t("finalCta.paragraph")}
            </p>
            <Link href="/register"
              className="inline-flex items-center gap-3 bg-amber-500 text-slate-900 px-12 py-6 rounded-2xl font-black italic uppercase text-base tracking-widest hover:bg-amber-400 shadow-2xl shadow-amber-500/20 transition-all active:scale-95 border-b-4 border-amber-700">
              {t("finalCta.button")} <ArrowRight className="w-6 h-6"/>
            </Link>
            <p className="text-[9px] text-slate-600 font-bold uppercase italic mt-4 tracking-widest">{t("finalCta.note")}</p>
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
                {t("footer.description")}
              </p>
            </div>
            {/* Legal */}
            <div className="flex flex-col gap-3">
              <h4 className="text-amber-500 font-black italic uppercase text-[10px] tracking-widest mb-1">{t("footer.legalHeading")}</h4>
              {legalLinks.map(l=>(
                <Link key={l.href} href={l.href} className="text-slate-500 text-[10px] font-black uppercase italic hover:text-white transition-colors">{l.label}</Link>
              ))}
            </div>
            {/* Contact */}
            <div className="flex flex-col gap-3">
              <h4 className="text-amber-500 font-black italic uppercase text-[10px] tracking-widest mb-1">{t("footer.contactHeading")}</h4>
              <a href="mailto:copedatoro@gmail.com" className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase italic hover:text-white transition-colors">
                <Mail className="w-3 h-3 text-amber-500"/> copedatoro@gmail.com
              </a>
              <p className="text-slate-600 text-[9px] font-bold uppercase italic">{t("footer.contactNote")}</p>
            </div>
            {/* CTA */}
            <div className="flex flex-col gap-3">
              <h4 className="text-amber-500 font-black italic uppercase text-[10px] tracking-widest mb-1">{t("footer.quickAccessHeading")}</h4>
              <Link href="/register" className="bg-amber-500 text-slate-900 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase italic text-center hover:bg-amber-400 transition-all">
                {t("footer.newAccountBtn")}
              </Link>
              <Link href="/login" className="bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase italic text-center hover:bg-white/10 transition-all">
                {t("footer.loginBtn")}
              </Link>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] italic">
              {t("footer.copyright")}
            </p>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500"/>
              <span className="text-[8px] font-black text-slate-600 uppercase italic tracking-widest">{t("footer.secured")}</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}