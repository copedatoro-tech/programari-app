"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { createBrowserClient } from '@supabase/ssr';
import Image from "next/image";

// --- TIPURI PENTRU RAPORT ---
type ReportData = {
  plan: string;
  perioada: string;
  total_programari: number;
  clienti_unici: number;
  top_3_clienti?: { nume: string; vizite: number }[];
  statistici_generale?: { total: number; clienti_unici: number; medie_pe_zi: number };
  analiza_clienti?: { nume: string; vizite: number }[];
  distributie_saptamanala?: Record<string, number>;
  servicii_top?: { serviciu: string; total: number }[];
  recomandare_ai?: string;
};

function RapoarteContent() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchReport();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        // Închide eventuale modale conform regulii de design
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchReport() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Preluăm datele profilului pentru a valida planul (din coloana plan_type indicată în captură)
      const { data: profile } = await supabase.from('profiles').select('plan_type').eq('id', user.id).single();

      const { data, error } = await supabase.rpc('get_monthly_report', {
        target_user_id: user.id,
        report_month: new Date().getMonth() + 1,
        report_year: new Date().getFullYear(),
        plan_type: profile?.plan_type || 'START (GRATUIT)'
      });

      if (data) setReport(data);
    } catch (err) {
      console.error("Eroare la preluarea raportului:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfcfc]">
      <div className="text-center font-black italic animate-pulse text-slate-900 uppercase text-[10px] tracking-widest">
        GENERARE RAPORT CHRONOS...
      </div>
    </div>
  );

  return (
    <main ref={contentRef} className="min-h-screen bg-[#fcfcfc] p-4 md:p-12 text-slate-900 font-sans pb-32">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER CU LOGO REPARAT (LCP Error fix) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
          <div className="flex items-center gap-6">
            <Image 
              src="/logo-chronos.png" 
              alt="Logo Chronos" 
              width={60} 
              height={60} 
              priority // Rezolvă eroarea LCP din log-uri
              className="rounded-xl shadow-lg border border-slate-100"
            />
            <div>
              <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">
                Insights <span className="text-amber-600">Premium</span>
              </h1>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-3 italic">
                Sincronizat cu Planul: <span className="text-amber-600">{report?.plan || "Standard"}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={() => window.print()} 
            className="bg-slate-900 text-white px-10 py-5 rounded-[25px] font-black text-[10px] uppercase italic border-b-4 border-slate-700 hover:scale-105 transition-all shadow-xl"
            title="Descarcă versiunea oficială a raportului"
          >
            Exportă Analiza PDF
          </button>
        </div>

        {/* CIFRE CHEIE */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: "Volum Total", value: report?.total_programari || 0, color: "text-slate-900" },
            { label: "Clienți Noi", value: report?.clienti_unici || 0, color: "text-amber-600" },
            { label: "Medie/Zi", value: report?.statistici_generale?.medie_pe_zi || 0, color: "text-slate-900" },
            { label: "Grad Ocupare", value: "82%", color: "text-emerald-600" }
          ].map((stat, idx) => (
            <div key={idx} className="bg-white p-8 rounded-[40px] shadow-lg border border-slate-50 relative group">
              <p className="text-[9px] font-black text-slate-400 uppercase italic mb-3 tracking-widest">{stat.label}</p>
              <h2 className={`text-5xl font-black italic leading-none ${stat.color}`}>{stat.value}</h2>
              <div className="absolute top-4 right-8 text-slate-100 font-black text-4xl opacity-20 group-hover:opacity-100 transition-opacity">0{idx+1}</div>
            </div>
          ))}
        </div>

        {/* DISTRIBUȚIE ȘI ANALIZĂ - Spațiere corectată pentru a evita suprapunerea footer-ului */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-12">
          
          <div className="lg:col-span-8 bg-white p-10 rounded-[55px] shadow-2xl border border-slate-50 flex flex-col">
            <h3 className="text-xl font-black uppercase italic mb-10 tracking-tighter border-l-8 border-amber-500 pl-6">Analiza Activității Săptămânale</h3>
            <div className="flex items-end justify-between h-64 gap-4 px-4 mt-auto">
              {report?.distributie_saptamanala ? Object.entries(report.distributie_saptamanala).map(([zi, val], i) => (
                <div key={i} className="flex flex-col items-center flex-1 group">
                  <div 
                    className="w-full bg-slate-100 rounded-2xl transition-all duration-500 group-hover:bg-slate-900 relative shadow-inner" 
                    style={{ height: `${(val / (report?.total_programari || 1)) * 100 + 10}%` }}
                    title={`Total: ${val} programări`}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity font-black text-xs text-slate-900">{val}</div>
                  </div>
                  <span className="text-[10px] font-black uppercase mt-6 italic text-slate-400">{zi.substring(0, 3)}</span>
                </div>
              )) : <p>Date indisponibile</p>}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8 flex flex-col">
             <div className="bg-slate-900 p-10 rounded-[50px] text-white flex-1 shadow-2xl border-b-8 border-slate-800">
                <h3 className="text-[10px] font-black uppercase italic mb-8 text-amber-500 tracking-widest">Performanță Servicii</h3>
                <div className="space-y-4">
                  {report?.servicii_top?.map((s, i) => (
                    <div key={i} className="flex justify-between items-center group cursor-help" title={`Procentaj din total: ${Math.round((s.total / (report?.total_programari || 1)) * 100)}%`}>
                      <span className="text-[11px] font-bold italic uppercase">{s.serviciu || 'General'}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-1 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500" style={{ width: '60%' }}></div>
                        </div>
                        <span className="text-[11px] font-black text-amber-500">{s.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
             </div>

             <div className="bg-amber-600 p-10 rounded-[50px] text-white relative overflow-hidden shadow-2xl shadow-amber-200">
                <h3 className="text-[10px] font-black uppercase italic mb-4 text-amber-100 tracking-widest">Chronos AI Sfat</h3>
                <p className="text-base font-black italic leading-tight uppercase tracking-tighter relative z-10">
                  {report?.recomandare_ai || "Pe baza volumului ridicat de Joi, sugerez o promoție pentru zilele de Luni pentru a echilibra fluxul."}
                </p>
                <div className="absolute -right-4 -bottom-4 text-[100px] opacity-10 font-black italic select-none">AI</div>
             </div>
          </div>
        </div>

        {/* TABEL CLIENȚI LOIALI - Mutat jos pentru a respira */}
        <div className="bg-white p-12 rounded-[60px] shadow-xl border border-slate-100">
          <h3 className="text-xl font-black uppercase italic mb-8 tracking-tighter">Analiză Loialitate Clienți</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(report?.analiza_clienti || report?.top_3_clienti)?.map((c, i) => (
              <div key={i} className="p-6 bg-slate-50 rounded-[35px] flex justify-between items-center hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-slate-100 group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-xs italic">{c.nume.charAt(0)}</div>
                  <span className="font-black text-[11px] uppercase italic text-slate-700">{c.nume}</span>
                </div>
                <span className="bg-amber-100 text-amber-700 px-4 py-2 rounded-2xl font-black text-[9px] group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  {c.vizite} VIZITE
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FOOTER UNIFORM (Acum nu se mai suprapune) */}
      <footer className="max-w-7xl mx-auto mt-20 pt-10 border-t border-slate-100 flex justify-between items-center px-6">
        <p className="text-[9px] font-black text-slate-300 uppercase italic">© 2026 Chronos | Premium Management System</p>
        <div className="flex gap-4">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[9px] font-black text-slate-400 uppercase italic">Sistem Online</span>
        </div>
      </footer>
    </main>
  );
}

export default function RapoartePage() {
  return <Suspense fallback={null}><RapoarteContent /></Suspense>;
}