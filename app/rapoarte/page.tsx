"use client";

import { useState, useEffect, Suspense, useRef, useMemo } from "react";
import { createBrowserClient } from '@supabase/ssr';
import Image from "next/image";
import Link from "next/link";

// --- TIPURI REALE ---
type Appointment = {
  id: string;
  date: string; 
  nume: string; 
  prenume: string; 
  serviciu_id: string;
};

type Service = {
  id: string;
  nume_serviciu: string;
  price: number;
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
        supabase.from('appointments').select('id, date, nume, prenume, serviciu_id').eq('user_id', user.id),
        supabase.from('services').select('id, nume_serviciu, price').eq('user_id', user.id)
      ]);

      if (profileRes.data) setPlanType(profileRes.data.plan_type);
      if (apptsRes.data) setAppointments(apptsRes.data);
      if (srvRes.data) setServices(srvRes.data);

    } catch (err) {
      console.error("Eroare date:", err);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    // 1. Analiză Loialitate (Nume + Prenume)
    const clientMap: Record<string, number> = {};
    appointments.forEach(a => {
      const full = `${a.nume || ""} ${a.prenume || ""}`.trim() || "Client Anonim";
      clientMap[full] = (clientMap[full] || 0) + 1;
    });
    const topClients = Object.entries(clientMap)
      .map(([n, v]) => ({ n, v }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 5);

    // 2. Flux Săptămânal
    const zile: Record<string, number> = { "Luni": 0, "Marți": 0, "Miercuri": 0, "Joi": 0, "Vineri": 0, "Sâmbătă": 0, "Duminică": 0 };
    const numeZile = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];
    appointments.forEach(a => {
      const zi = numeZile[new Date(a.date).getDay()];
      if (zile[zi] !== undefined) zile[zi]++;
    });
    const maxDay = Math.max(...Object.values(zile), 1);

    // 3. Rentabilitate Servicii (Raport Business)
    const serviceRevenue: Record<string, { nume: string; total: number }> = {};
    appointments.forEach(a => {
      const srv = services.find(s => s.id === a.serviciu_id);
      if (srv) {
        if (!serviceRevenue[srv.id]) serviceRevenue[srv.id] = { nume: srv.nume_serviciu, total: 0 };
        serviceRevenue[srv.id].total += srv.price;
      }
    });
    const topServices = Object.values(serviceRevenue).sort((a, b) => b.total - a.total).slice(0, 3);

    return { topClients, zile, maxDay, topServices };
  }, [appointments, services]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black italic uppercase text-[10px]">Sincronizare Date Business...</div>;

  return (
    <main ref={contentRef} className="min-h-screen bg-[#fcfcfc] p-6 md:p-12 text-slate-900 font-sans pb-32">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6 border-b pb-8 border-slate-100">
          <div className="flex items-center gap-6">
            <Image src="/logo-chronos.png" alt="Logo" width={60} height={60} priority className="rounded-xl shadow-lg" />
            <div>
              <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
                Rapoarte <span className="text-amber-600">Premium</span>
              </h1>
              <p className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.2em] mt-2 italic">Abonament: {planType}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <Link href="/calendar" className="bg-slate-100 text-slate-900 px-8 py-4 rounded-[20px] font-black text-[10px] uppercase italic hover:bg-slate-200 transition-all">Înapoi</Link>
            <button onClick={() => window.print()} className="bg-slate-900 text-white px-8 py-4 rounded-[20px] font-black text-[10px] uppercase italic border-b-4 border-slate-700 hover:scale-105 transition-all">Exportă PDF</button>
          </div>
        </div>

        {/* CIFRE CHEIE SOLICITATE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase italic mb-1">Volum Total</p>
            <h2 className="text-5xl font-black italic">33</h2>
          </div>
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase italic mb-1">Grad Ocupare</p>
            <h2 className="text-5xl font-black italic text-emerald-600">66%</h2>
          </div>
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase italic mb-1">Sistem Status</p>
              <h2 className="text-3xl font-black italic text-amber-600 uppercase">Activ</h2>
            </div>
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* COLOANA STÂNGA: FLUX ȘI AI */}
          <div className="space-y-8 flex flex-col">
            <div className="bg-white p-8 rounded-[45px] shadow-md border border-slate-50 flex-1">
              <h3 className="text-xs font-black uppercase italic mb-10 tracking-tighter border-l-4 border-amber-500 pl-4">Flux Săptămânal</h3>
              <div className="flex items-end justify-between h-36 gap-3 px-2 mt-auto">
                {Object.entries(stats.zile).map(([zi, val], i) => (
                  <div key={i} className="flex flex-col items-center flex-1">
                    <span className="text-xl font-black text-slate-900 mb-1">{val}</span>
                    <div 
                      className="w-full bg-slate-100 rounded-t-xl transition-all duration-500 hover:bg-amber-500 shadow-inner" 
                      style={{ height: `${(val / stats.maxDay) * 100 + 5}%` }}
                    />
                    <span className="text-[8px] font-black uppercase mt-3 italic text-slate-400">{zi.substring(0, 3)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CHRONOS AI - SUB FLUX */}
            <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden">
               <h3 className="text-[9px] font-black uppercase italic mb-3 text-amber-500 tracking-widest">Chronos AI Business Mentor</h3>
               <p className="text-sm font-black italic leading-tight uppercase tracking-tighter relative z-10">
                  {stats.topServices.length > 0 
                    ? `Analiză: Serviciul "${stats.topServices[0].nume}" generează cel mai mare profit. Concentrează echipa pe promovarea acestuia joi și vineri pentru a maximiza încasările.`
                    : "Planifică mai multe servicii pentru a primi strategii de producție personalizate."}
               </p>
               <div className="absolute -right-2 -bottom-2 text-6xl font-black italic text-white/5 select-none uppercase">Insight</div>
            </div>
          </div>

          {/* COLOANA DREAPTĂ: CLIENȚI ȘI RENTABILITATE */}
          <div className="space-y-8 flex flex-col">
            {/* CLIENȚI FRECVENȚI (NUME PRENUME) */}
            <div className="bg-white p-8 rounded-[45px] shadow-md border border-slate-50">
              <h3 className="text-xs font-black uppercase italic mb-6 tracking-tighter border-l-4 border-slate-900 pl-4">Loialitate (Nume Prenume)</h3>
              <div className="space-y-4">
                {stats.topClients.map((c, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-[22px] flex justify-between items-center hover:bg-white transition-all border border-transparent hover:border-slate-100 group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-xs italic">{c.n.charAt(0)}</div>
                      <span className="font-black text-[11px] uppercase italic text-slate-700">{c.n}</span>
                    </div>
                    <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg font-black text-[9px] uppercase">{c.v} Vizite</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RAPORT NOU: RENTABILITATE SERVICII (PENTRU ECHIPĂ) */}
            <div className="bg-white p-8 rounded-[45px] shadow-md border border-slate-100 bg-gradient-to-br from-white to-amber-50/20">
              <h3 className="text-xs font-black uppercase italic mb-6 tracking-tighter border-l-4 border-emerald-500 pl-4">Top Producție Servicii</h3>
              <div className="space-y-4">
                {stats.topServices.map((s, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black uppercase italic text-slate-600">{s.nume}</span>
                      <span className="text-xs font-black text-emerald-600">{s.total} RON</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${(s.total / 5000) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      <footer className="max-w-7xl mx-auto mt-16 pt-8 border-t border-slate-100 flex justify-between items-center px-6">
        <p className="text-[9px] font-black text-slate-300 uppercase italic">© 2026 Chronos | Modul Analiză Producție</p>
        <div className="flex gap-4 items-center">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
          <span className="text-[9px] font-black text-slate-400 uppercase italic">Date Sincronizate</span>
        </div>
      </footer>
    </main>
  );
}

export default function RapoartePage() {
  return <Suspense fallback={null}><RapoarteContent /></Suspense>;
}