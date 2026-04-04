"use client";

import { useState, useEffect, Suspense, useRef, useMemo } from "react";
import { createBrowserClient } from '@supabase/ssr';
import Image from "next/image";
import Link from "next/link";

// --- TIPURI FLEXIBILE ---
type Appointment = {
  id: string;
  date?: string;
  data?: string;
  nume?: string;
  prenume?: string;
  serviciu_id?: string;
  user_id: string;
};

type Service = {
  id: string;
  nume_serviciu: string;
  price: number;
  user_id: string;
};

function RapoarteContent() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [planType, setPlanType] = useState("START (GRATUIT)");
  const [loading, setLoading] = useState(true);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRealData();
  }, []);

  async function fetchRealData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, apptsRes, srvRes] = await Promise.all([
        supabase.from('profiles').select('plan_type').eq('id', user.id).single(),
        supabase.from('appointments').select('*').eq('user_id', user.id),
        supabase.from('services').select('*').eq('user_id', user.id)
      ]);

      if (profileRes.data) setPlanType(profileRes.data.plan_type);
      if (apptsRes.data) setAppointments(apptsRes.data);
      if (srvRes.data) setServices(srvRes.data);

    } catch (err) {
      console.error("Eroare sincronizare:", err);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    // 1. Analiză Loialitate & Revenire
    const clientMap: Record<string, number> = {};
    let totalRevenue = 0;

    appointments.forEach(a => {
      const nume_complet = `${a.prenume || ""} ${a.nume || ""}`.trim() || "Client";
      clientMap[nume_complet] = (clientMap[nume_complet] || 0) + 1;
      
      const srv = services.find(s => s.id === a.serviciu_id);
      if (srv) totalRevenue += (Number(srv.price) || 0);
    });

    const topClients = Object.entries(clientMap)
      .map(([n, v]) => ({ n, v }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 5);

    const clientiCareAuRevenit = Object.values(clientMap).filter(v => v > 1).length;
    const totalClientiUnici = Object.keys(clientMap).length || 1;
    const rataRevenire = Math.round((clientiCareAuRevenit / totalClientiUnici) * 100);

    // 2. Flux Săptămânal
    const zile: Record<string, number> = { "Luni": 0, "Marți": 0, "Miercuri": 0, "Joi": 0, "Vineri": 0, "Sâmbătă": 0, "Duminică": 0 };
    const numeZile = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];
    
    appointments.forEach(a => {
      const rawDate = a.date || a.data;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          const zi = numeZile[d.getDay()];
          if (zile[zi] !== undefined) zile[zi]++;
        }
      }
    });
    const maxDay = Math.max(...Object.values(zile), 1);
    const mediePeZi = (appointments.length / 7).toFixed(1);

    // 3. Rentabilitate Servicii
    const serviceRevenue: Record<string, { nume: string; total: number }> = {};
    appointments.forEach(a => {
      const srv = services.find(s => s.id === a.serviciu_id);
      if (srv) {
        if (!serviceRevenue[srv.id]) serviceRevenue[srv.id] = { nume: srv.nume_serviciu, total: 0 };
        serviceRevenue[srv.id].total += (Number(srv.price) || 0);
      }
    });
    const topServices = Object.values(serviceRevenue).sort((a, b) => b.total - a.total).slice(0, 5);
    const ocupare = Math.min(Math.round((appointments.length / 35) * 100), 100);

    return { topClients, zile, maxDay, topServices, totalCount: appointments.length, ocupare, totalRevenue, mediePeZi, rataRevenire };
  }, [appointments, services]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfcfc]">
      <div className="font-black italic animate-pulse text-slate-900 uppercase text-[10px] tracking-widest">
        GENERARE RAPORT SPECIFIC...
      </div>
    </div>
  );

  return (
    <main ref={contentRef} className="min-h-screen bg-[#fcfcfc] p-6 md:p-12 text-slate-900 font-sans pb-32">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER SIMPLIFICAT */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-6 border-b pb-8 border-slate-100">
          <div className="flex items-center gap-6">
            <Image src="/logo-chronos.png" alt="Logo" width={50} height={50} priority className="rounded-xl" />
            <div>
              <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter leading-none">
                Rapoarte <span className="text-amber-600">Business</span>
              </h1>
              <div className="flex items-center gap-2 mt-2">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                 <p className="text-slate-400 font-bold uppercase text-[8px] tracking-widest italic">Conexiune Securizată • Date Live</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/calendar" className="bg-slate-100 text-slate-900 px-6 py-3 rounded-[15px] font-black text-[9px] uppercase italic hover:bg-slate-200 transition-all">Înapoi</Link>
            <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 py-3 rounded-[15px] font-black text-[9px] uppercase italic border-b-4 border-slate-700 hover:scale-105 transition-all">Exportă PDF</button>
          </div>
        </div>

        {/* CIFRE CHEIE COMPACTE ȘI MAI MULTE DATE */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
          <div className="bg-white p-5 rounded-[30px] shadow-sm border border-slate-100">
            <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Total Job-uri</p>
            <h2 className="text-3xl font-black italic">{stats.totalCount}</h2>
          </div>
          <div className="bg-white p-5 rounded-[30px] shadow-sm border border-slate-100">
            <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Venit Est.</p>
            <h2 className="text-3xl font-black italic text-emerald-600">{stats.totalRevenue}<span className="text-sm">RON</span></h2>
          </div>
          <div className="bg-white p-5 rounded-[30px] shadow-sm border border-slate-100">
            <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Ocupare</p>
            <h2 className="text-3xl font-black italic text-amber-600">{stats.ocupare}%</h2>
          </div>
          <div className="bg-white p-5 rounded-[30px] shadow-sm border border-slate-100">
            <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Medie/Zi</p>
            <h2 className="text-3xl font-black italic">{stats.mediePeZi}</h2>
          </div>
          <div className="bg-white p-5 rounded-[30px] shadow-sm border border-slate-100">
            <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Retenție</p>
            <h2 className="text-3xl font-black italic text-blue-600">{stats.rataRevenire}%</h2>
          </div>
        </div>

        {/* RANDUL 1: FLUX ȘI PROFIT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white p-8 rounded-[40px] shadow-md border border-slate-50 flex flex-col min-h-[350px]">
            <h3 className="text-[10px] font-black uppercase italic mb-8 tracking-tighter border-l-4 border-amber-500 pl-4">Analiză Săptămânală Volum</h3>
            <div className="flex items-end justify-between h-40 gap-2 px-2 mt-auto">
              {Object.entries(stats.zile).map(([zi, val], i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  <span className="text-xs font-black text-slate-400 mb-2">{val}</span>
                  <div 
                    className="w-full bg-slate-100 rounded-t-lg transition-all duration-500 hover:bg-amber-500" 
                    style={{ height: `${(val / stats.maxDay) * 100 + 10}%` }}
                  />
                  <span className="text-[8px] font-black uppercase mt-3 italic text-slate-400">{zi.substring(0, 3)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] shadow-md border border-slate-100 min-h-[350px]">
            <h3 className="text-[10px] font-black uppercase italic mb-8 tracking-tighter border-l-4 border-emerald-500 pl-4">Performanță Servicii</h3>
            <div className="space-y-5">
              {stats.topServices.map((s, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-black uppercase italic text-slate-600">{s.nume}</span>
                    <span className="text-[11px] font-black text-emerald-600">{s.total} RON</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min((s.total / (stats.topServices[0]?.total || 1)) * 100, 100)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RANDUL 2: CLIENȚI FIDELI */}
        <div className="bg-white p-8 rounded-[40px] shadow-md border border-slate-50 mb-8">
            <h3 className="text-[10px] font-black uppercase italic mb-6 tracking-tighter border-l-4 border-slate-900 pl-4">Top Clienți (Fidelitate)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {stats.topClients.map((c, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-[20px] flex flex-col gap-2 hover:bg-white transition-all border border-transparent hover:border-slate-100">
                  <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-[10px] italic">{c.n.charAt(0)}</div>
                  <span className="font-black text-[10px] uppercase italic text-slate-700 truncate">{c.n}</span>
                  <span className="text-amber-600 font-black text-[9px] uppercase">{c.v} Programări</span>
                </div>
              ))}
            </div>
        </div>

        {/* RANDUL 3: CHRONOS AI (FULL WIDTH) */}
        <div className="bg-slate-900 p-10 rounded-[45px] text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center">
            <div className="flex-1">
              <h3 className="text-[9px] font-black uppercase italic mb-4 text-amber-500 tracking-[0.3em]">Chronos AI Mentor Personal</h3>
              <p className="text-2xl font-black italic leading-tight uppercase tracking-tighter">
                {stats.totalCount > 5 
                  ? `Dan, ai o rată de revenire de ${stats.rataRevenire}%. Asta înseamnă că ofertele tale de loialitate funcționează. Pentru a crește venitul, încearcă să crești media de ${stats.mediePeZi} clienți pe zi prin campanii în weekend.`
                  : "Date insuficiente pentru un sfat strategic complet. Continuă să adaugi programări!"}
              </p>
            </div>
            <div className="w-full md:w-1/3 bg-white/5 p-6 rounded-[30px] border border-white/10">
               <p className="text-[10px] font-bold italic text-slate-400 mb-2 uppercase">💡 Sfat Operativ</p>
               <p className="text-[12px] font-medium leading-relaxed italic">
                 Analizând fluxul, ziua de <span className="text-amber-500 font-black uppercase">{Object.entries(stats.zile).sort((a,b) => a[1]-b[1])[0][0]}</span> are cel mai mic volum. Poți muta programările complexe aici.
               </p>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 text-[120px] font-black italic text-white/5 select-none uppercase pointer-events-none">GROWTH</div>
        </div>

      </div>
    </main>
  );
}

export default function RapoartePage() {
  return <Suspense fallback={null}><RapoarteContent /></Suspense>;
}