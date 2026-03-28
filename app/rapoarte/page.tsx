"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { createBrowserClient } from '@supabase/ssr';

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
  
  // Clientul Supabase
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Referință pentru detectarea click-ului în exterior (Regulă Design Uniform)
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchReport();
    
    const handleClickOutside = (event: MouseEvent) => {
      // Această funcție asigură conformitatea cu regula: "Any pop-up should close when clicked outside of it"
      // Deși pagina de rapoarte este statică în mare parte, menținem structura pentru consistență
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        // Dacă am avea modale sau drop-down-uri deschise aici, le-am închide
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

      // Apelăm RPC-ul get_monthly_report definit în baza de date
      const { data, error } = await supabase.rpc('get_monthly_report', {
        target_user_id: user.id,
        report_month: new Date().getMonth() + 1,
        report_year: new Date().getFullYear(),
        plan_type: 'elite' 
      });

      if (data) setReport(data);
      if (error) console.error("Eroare RPC:", error);
    } catch (err) {
      console.error("Eroare la preluarea raportului:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center font-black italic animate-pulse text-slate-900 uppercase text-[10px] tracking-widest">
        SE ÎNCARCĂ ANALIZA CHRONOS...
      </div>
    </div>
  );

  return (
    <main ref={contentRef} className="min-h-screen bg-slate-50 p-4 md:p-12 text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER RAPORT */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
          <div>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">
              Chronos <span className="text-amber-600">Insights</span>
            </h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-3 ml-1">
              Raport {report?.perioada} • Plan <span className="text-amber-600">{report?.plan?.toUpperCase()}</span>
            </p>
          </div>
          <div className="relative group">
            <button 
              onClick={() => window.print()} 
              className="bg-white px-8 py-4 rounded-2xl shadow-sm border border-slate-200 font-black text-[10px] uppercase italic hover:bg-slate-900 hover:text-white transition-all duration-200 group flex items-center gap-3"
              title="Apasă pentru a descărca sau printa raportul complet în format PDF"
            >
              <span className="group-hover:scale-110 transition-transform">📄</span> Descarcă PDF
            </button>
            {/* Tooltip Uniform */}
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[8px] font-black uppercase py-2 px-3 rounded-xl whitespace-nowrap z-50 shadow-xl">
              Generează varianta pentru imprimare
            </div>
          </div>
        </div>

        {/* STATISTICI PRINCIPALE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-8 rounded-[45px] shadow-xl border border-slate-100 transition-all hover:scale-[1.02] hover:shadow-2xl group cursor-default" title="Numărul total de programări înregistrate în această lună">
            <p className="text-[10px] font-black text-slate-400 uppercase italic mb-2">Total Programări</p>
            <h2 className="text-5xl font-black italic text-slate-900 leading-none">
              {report?.total_programari || report?.statistici_generale?.total || 0}
            </h2>
          </div>
          
          <div className="bg-white p-8 rounded-[45px] shadow-xl border border-slate-100 transition-all hover:scale-[1.02] hover:shadow-2xl group cursor-default" title="Numărul de clienți unici care au avut cel puțin o programare">
            <p className="text-[10px] font-black text-slate-400 uppercase italic mb-2">Clienți Activi</p>
            <h2 className="text-5xl font-black italic text-amber-600 leading-none">
              {report?.clienti_unici || report?.statistici_generale?.clienti_unici || 0}
            </h2>
          </div>

          <div className="bg-slate-900 p-8 rounded-[45px] shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl group cursor-default" title="Media programărilor efectuate într-o singură zi">
            <p className="text-[10px] font-black text-slate-500 uppercase italic mb-2">Medie Zilnică</p>
            <h2 className="text-5xl font-black italic text-white leading-none">
              {report?.statistici_generale?.medie_pe_zi || 0}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20">
          
          {/* ANALIZĂ CLIENȚI LOIALI */}
          <div className="lg:col-span-4 bg-white p-10 rounded-[55px] shadow-2xl border border-slate-100">
            <h3 className="text-xl font-black uppercase italic mb-8 tracking-tighter">Top Clienți</h3>
            <div className="space-y-4">
              {(report?.analiza_clienti || report?.top_3_clienti)?.length ? (
                (report?.analiza_clienti || report?.top_3_clienti)?.map((c, i) => (
                  <div key={i} className="flex justify-between items-center p-5 bg-slate-50 rounded-[30px] hover:bg-amber-50 transition-colors group relative cursor-pointer" title={`Clientul ${c.nume} a vizitat locația de ${c.vizite} ori luna aceasta`}>
                    <span className="font-black text-[11px] uppercase italic text-slate-700">{c.nume}</span>
                    <span className="bg-white text-amber-600 px-4 py-1.5 rounded-2xl font-black text-[9px] shadow-sm border border-amber-100">
                      {c.vizite} VIZITE
                    </span>
                    {/* Tooltip Uniform */}
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[7px] font-black uppercase py-2 px-3 rounded-xl z-50 shadow-lg">
                      Detalii activitate client
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[10px] font-black uppercase italic text-slate-300 text-center py-10">Date insuficiente pentru top</p>
              )}
            </div>
          </div>

          {/* SECȚIUNI EXCLUSIVE PENTRU PLANURI AVANSATE */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* GRAFIC DISTRIBUȚIE ZILNICĂ */}
            <div className="bg-white p-10 rounded-[55px] shadow-2xl border border-slate-100 h-full">
              <h3 className="text-xl font-black uppercase italic mb-8 tracking-tighter">Activitate pe Zile</h3>
              <div className="flex items-end justify-between h-48 gap-3 px-2">
                {report?.distributie_saptamanala ? (
                  Object.entries(report.distributie_saptamanala).map(([zi, val], i) => (
                    <div key={i} className="flex flex-col items-center flex-1 group relative">
                      <div 
                        className="w-full bg-slate-100 rounded-t-2xl transition-all duration-700 group-hover:bg-amber-500 cursor-help relative" 
                        style={{ height: `${(val / (report?.total_programari || 1)) * 100 + 15}%` }}
                      >
                         <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity font-black text-[10px] text-amber-600 italic">
                           {val}
                         </div>
                      </div>
                      <div className="absolute bottom-full mb-3 hidden group-hover:block bg-slate-900 text-white text-[8px] font-black uppercase py-2 px-3 rounded-xl z-20 shadow-xl whitespace-nowrap">
                        {val} Programări în ziua de {zi}
                      </div>
                      <span className="text-[9px] font-black uppercase mt-4 italic text-slate-400 group-hover:text-slate-900 transition-colors">{zi.substring(0, 3)}</span>
                    </div>
                  ))
                ) : (
                   <div className="w-full h-full flex items-center justify-center opacity-20 italic font-black uppercase text-[10px] tracking-widest">Așteptare date grafic...</div>
                )}
              </div>
            </div>

            {/* SERVICII ȘI AI ADVICE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-900 p-10 rounded-[50px] text-white shadow-2xl shadow-slate-200">
                <h3 className="text-[10px] font-black uppercase italic mb-6 text-amber-500 tracking-widest">Servicii Populare</h3>
                <div className="space-y-3">
                  {report?.servicii_top?.length ? (
                    report.servicii_top.map((s, i) => (
                      <div key={i} className="flex justify-between items-center border-b border-slate-800 pb-3 last:border-0 hover:translate-x-1 transition-transform cursor-help" title={`Serviciul ${s.serviciu} a fost solicitat de ${s.total} ori`}>
                        <span className="text-[11px] font-bold italic truncate pr-4 uppercase">{s.serviciu || 'General'}</span>
                        <span className="text-[11px] font-black text-amber-500">{s.total}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] opacity-30 italic uppercase font-black">Lipsă date servicii</p>
                  )}
                </div>
              </div>

              <div className="bg-amber-600 p-10 rounded-[50px] text-white relative overflow-hidden group shadow-2xl shadow-amber-100">
                <div className="relative z-10">
                  <h3 className="text-[10px] font-black uppercase italic mb-4 text-white/80 tracking-widest">Sfatul Chronos AI</h3>
                  <p className="text-sm font-black italic leading-tight uppercase tracking-tighter">
                    {report?.recomandare_ai || "Continuă să monitorizezi fluxul de clienți pentru a optimiza intervalele orare aglomerate."}
                  </p>
                </div>
                <div className="absolute -right-6 -bottom-6 text-[120px] opacity-10 font-black italic group-hover:scale-110 group-hover:-rotate-6 transition-all duration-700 pointer-events-none">AI</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function RapoartePage() {
  return <Suspense fallback={null}><RapoarteContent /></Suspense>;
}