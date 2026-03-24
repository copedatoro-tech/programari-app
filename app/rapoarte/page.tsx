"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";

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

  useEffect(() => {
    fetchReport();
  }, []);

  async function fetchReport() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Aici chemăm funcția SQL creată anterior
    // Notă: În producție, 'plan_type' ar trebui să vină din profilul utilizatorului
    const { data, error } = await supabase.rpc('get_monthly_report', {
      target_user_id: session.user.id,
      report_month: new Date().getMonth() + 1,
      report_year: new Date().getFullYear(),
      plan_type: 'elite' // Simulăm un cont Elite pentru a vedea toate funcțiile
    });

    if (data) setReport(data);
    setLoading(false);
  }

  if (loading) return <div className="p-20 text-center font-black italic animate-pulse">SE ÎNCARCĂ ANALIZA...</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-12 text-slate-900">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter">
              Chronos <span className="text-amber-600">Insights</span>
            </h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] ml-1">
              Raport {report?.perioada} • Plan {report?.plan}
            </p>
          </div>
          <button onClick={() => window.print()} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 font-black text-[10px] uppercase italic hover:bg-slate-900 hover:text-white transition-all">
            Descarcă PDF
          </button>
        </div>

        {/* --- GRID STATISTICI GENERALE --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase italic mb-2">Total Programări</p>
            <h2 className="text-5xl font-black italic text-slate-900">{report?.total_programari || report?.statistici_generale?.total}</h2>
          </div>
          <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase italic mb-2">Clienți Activi</p>
            <h2 className="text-5xl font-black italic text-amber-600">{report?.clienti_unici || report?.statistici_generale?.clienti_unici}</h2>
          </div>
          {report?.statistici_generale?.medie_pe_zi && (
            <div className="bg-slate-900 p-8 rounded-[40px] shadow-xl">
              <p className="text-[10px] font-black text-slate-500 uppercase italic mb-2">Medie Zilnică</p>
              <h2 className="text-5xl font-black italic text-white">{report.statistici_generale.medie_pe_zi}</h2>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* --- TOP CLIENȚI --- */}
          <div className="lg:col-span-4 bg-white p-8 rounded-[50px] shadow-2xl border border-slate-100">
            <h3 className="text-xl font-black uppercase italic mb-6">Top Clienți</h3>
            <div className="space-y-4">
              {(report?.analiza_clienti || report?.top_3_clienti)?.map((c, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-[25px]">
                  <span className="font-black text-xs uppercase italic">{c.nume}</span>
                  <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-black text-[10px]">{c.vizite} Vizite</span>
                </div>
              ))}
            </div>
          </div>

          {/* --- SECȚIUNI EXCLUSIVE ELITE --- */}
          {report?.plan === 'Elite' && (
            <div className="lg:col-span-8 space-y-8">
              {/* Distribuție Săptămânală */}
              <div className="bg-white p-8 rounded-[50px] shadow-2xl border border-slate-100">
                <h3 className="text-xl font-black uppercase italic mb-6">Activitate pe Zile</h3>
                <div className="flex items-end justify-between h-32 gap-2">
                  {Object.entries(report.distributie_saptamanala || {}).map(([zi, val], i) => (
                    <div key={i} className="flex flex-col items-center flex-1">
                      <div 
                        className="w-full bg-amber-500 rounded-t-xl transition-all duration-1000" 
                        style={{ height: `${(val / (report.total_programari || 1)) * 100 + 10}%` }}
                      ></div>
                      <span className="text-[8px] font-black uppercase mt-2 italic text-slate-400">{zi.substring(0, 3)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Servicii de Top & Recomandare AI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 p-8 rounded-[45px] text-white">
                  <h3 className="text-sm font-black uppercase italic mb-4 text-amber-500">Servicii Populare</h3>
                  {report.servicii_top?.map((s, i) => (
                    <div key={i} className="flex justify-between border-b border-slate-800 py-2 last:border-0">
                      <span className="text-[10px] font-bold italic truncate pr-2">{s.serviciu || 'General'}</span>
                      <span className="text-[10px] font-black">{s.total}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-amber-600 p-8 rounded-[45px] text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-sm font-black uppercase italic mb-2">Sfatul Chronos AI</h3>
                        <p className="text-xs font-bold italic leading-relaxed opacity-90">
                            "{report.recomandare_ai}"
                        </p>
                    </div>
                    <div className="absolute -right-4 -bottom-4 text-8xl opacity-10 font-black italic">AI</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function RapoartePage() {
  return <Suspense fallback={null}><RapoarteContent /></Suspense>;
}