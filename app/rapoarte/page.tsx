"use client";

import { useState, useEffect, Suspense, useRef, useMemo } from "react";
import { createBrowserClient } from '@supabase/ssr';
import Image from "next/image";
import Link from "next/link";

type Appointment = {
  id: string;
  date?: string;
  data?: string;
  title?: string;
  nume?: string;
  prenume?: string;
  serviciu_id?: string;
  angajat_id?: string;
  time?: string;
  ora?: string;
  phone?: string;
  telefon?: string;
  user_id: string;
};

type Service = {
  id: string;
  nume_serviciu: string;
  price: number;
  user_id: string;
};

type Staff = {
  id: string;
  name: string;
  user_id: string;
};

function RapoarteContent() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");
  
  const channelRef = useRef<any>(null);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  async function fetchRealData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [apptsRes, srvRes, staffRes, profileRes] = await Promise.all([
        supabase.from('appointments').select('*').eq('user_id', user.id),
        supabase.from('services').select('*').eq('user_id', user.id),
        supabase.from('staff').select('*').eq('user_id', user.id),
        supabase.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle(),
      ]);

      if (apptsRes.data) setAppointments(apptsRes.data);
      if (srvRes.data) setServices(srvRes.data);
      if (staffRes.data) setStaff(staffRes.data);
      if (profileRes.data) setUserName(profileRes.data.full_name || user.email || "");
    } catch (err) {
      console.error("Eroare sincronizare:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      await fetchRealData();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const activeChannel = supabase
        .channel(`realtime_rapoarte_${user.id}`)
        .on(
          'postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'appointments', 
            filter: `user_id=eq.${user.id}` 
          }, 
          () => {
            fetchRealData();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log("Sincronizare rapoarte activă");
          }
        });

      channelRef.current = activeChannel;
    };

    initApp();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [supabase]);

  const stats = useMemo(() => {
    const getClientName = (a: Appointment): string => (a.title || a.prenume || a.nume || "").trim() || "Client Necunoscut";
    const getDate = (a: Appointment): string => a.date || a.data || "";
    const clientMap: Record<string, number> = {};
    let totalRevenue = 0;

    appointments.forEach(a => {
      const numeClient = getClientName(a);
      clientMap[numeClient] = (clientMap[numeClient] || 0) + 1;
      const srv = services.find(s => s.id === a.serviciu_id);
      if (srv) totalRevenue += (Number(srv.price) || 0);
    });

    const topClients = Object.entries(clientMap).map(([n, v]) => ({ n, v })).sort((a, b) => b.v - a.v).slice(0, 5);
    const totalClientiUnici = Object.keys(clientMap).length || 0;
    const rataRevenire = totalClientiUnici > 0 ? Math.round((Object.values(clientMap).filter(v => v > 1).length / totalClientiUnici) * 100) : 0;

    const zile: Record<string, number> = { "Luni": 0, "Marți": 0, "Miercuri": 0, "Joi": 0, "Vineri": 0, "Sâmbătă": 0, "Duminică": 0 };
    const numeZile = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];

    appointments.forEach(a => {
      let rawDate = getDate(a);
      if (rawDate) {
        if (rawDate.includes('.')) {
          const parts = rawDate.split('.');
          if (parts.length === 3) rawDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          const zi = numeZile[d.getDay()];
          if (zile[zi] !== undefined) zile[zi]++;
        }
      }
    });

    const actualMax = Math.max(...Object.values(zile), 0);
    const displayMax = actualMax <= 5 ? 5 : actualMax <= 10 ? 10 : Math.ceil(actualMax / 10) * 10;
    const yThresholds = [displayMax, Math.round(displayMax * 0.75), Math.round(displayMax * 0.5), Math.round(displayMax * 0.25), 0];

    const serviceRevenue: Record<string, { nume: string; total: number }> = {};
    appointments.forEach(a => {
      const srv = services.find(s => s.id === a.serviciu_id);
      if (srv) {
        if (!serviceRevenue[srv.id]) serviceRevenue[srv.id] = { nume: srv.nume_serviciu, total: 0 };
        serviceRevenue[srv.id].total += (Number(srv.price) || 0);
      }
    });

    return {
      topClients,
      zile,
      displayMax,
      yThresholds,
      topServices: Object.values(serviceRevenue).sort((a, b) => b.total - a.total).slice(0, 5),
      totalCount: appointments.length,
      totalRevenue,
      mediePeZi: appointments.length > 0 ? (appointments.length / 7).toFixed(1) : "0",
      rataRevenire,
      totalClientiUnici,
    };
  }, [appointments, services]);

  const handleExport = () => {
    window.print();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfcfc]">
      <div className="font-black italic animate-pulse text-slate-900 uppercase text-[10px] tracking-widest">GENERARE RAPORT...</div>
    </div>
  );

  return (
    <>
      <style jsx global>{`
        @media print {
          nav, .no-print, button, a, .menu-btn { display: none !important; }
          @page { margin: 10mm; size: auto; }
          body { background: white !important; color: black !important; }
          main { padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; }
          .max-w-7xl { max-width: 100% !important; width: 100% !important; }
          .bg-slate-900 { background: #f8fafc !important; color: black !important; border: 1px solid #e2e8f0 !important; }
          .text-white { color: #0f172a !important; }
          .absolute.pointer-events-none { display: none !important; }
          .grid { display: grid !important; gap: 1rem !important; }
          .bg-white { border: 1px solid #f1f5f9 !important; box-shadow: none !important; }
          .bg-white, .bg-slate-900 { page-break-inside: avoid; break-inside: avoid; }
        }
      `}</style>

      <main className="min-h-screen bg-[#fcfcfc] p-6 md:p-12 text-slate-900 font-sans pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-6 border-b pb-8 border-slate-100">
            <div className="flex items-center gap-6">
              <Image src="/logo-chronos.png" alt="Logo" width={60} height={60} priority className="rounded-xl" />
              <div>
                <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
                  Raport <span className="text-amber-600">Business</span>
                </h1>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest italic mt-2">
                  Admin: {userName} | Data: {new Date().toLocaleDateString('ro-RO')}
                </p>
              </div>
            </div>
            <div className="flex gap-3 no-print">
              <Link href="/programari" className="bg-slate-100 text-slate-900 px-8 py-4 rounded-[15px] font-black text-[10px] uppercase italic hover:bg-slate-200 transition-all">Înapoi</Link>
              <button onClick={handleExport} className="bg-slate-900 text-white px-8 py-4 rounded-[15px] font-black text-[10px] uppercase italic border-b-4 border-slate-700 hover:scale-105 transition-all">Exportă PDF</button>
            </div>
          </div>

          {/* Indicatori Principali - Text Mărit conform solicitării */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-12">
            {[
              { label: "Total Programări", val: stats.totalCount, color: "text-slate-900" },
              { label: "Venit Estimat", val: `${stats.totalRevenue} RON`, color: "text-emerald-600" },
              { label: "Medie pe Zi", val: stats.mediePeZi, color: "text-slate-900" },
              { label: "Rată Retenție", val: `${stats.rataRevenire}%`, color: "text-blue-600" },
              { label: "Clienți Unici", val: stats.totalClientiUnici, color: "text-purple-600" }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-7 rounded-[35px] shadow-sm border border-slate-100 flex flex-col justify-center">
                <p className="text-[10px] font-black text-slate-400 uppercase italic mb-2 tracking-widest">{stat.label}</p>
                <h2 className={`text-3xl md:text-4xl font-black italic tracking-tighter ${stat.color}`}>{stat.val}</h2>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-8">
            {/* Volum Săptămânal - Folosește mai mult spațiu */}
            <div className="lg:col-span-2 bg-white p-10 rounded-[45px] shadow-md border border-slate-50 flex flex-col h-[500px]">
              <div className="flex justify-between items-center mb-12">
                <h3 className="text-lg font-black uppercase italic tracking-tighter border-l-8 border-amber-500 pl-4">Volum Săptămânal</h3>
                <span className="text-[10px] font-black text-slate-300 uppercase italic">Distribuție activitate</span>
              </div>
              <div className="flex-1 flex gap-6">
                <div className="flex flex-col justify-between text-[11px] font-black text-slate-400 pb-12 italic w-8">
                  {stats.yThresholds.map((val, i) => <span key={i}>{val}</span>)}
                </div>
                <div className="flex-1 relative border-l-2 border-b-2 border-slate-100">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {stats.yThresholds.map((_, i) => <div key={i} className="w-full border-t border-slate-50 h-0" />)}
                  </div>
                  <div className="absolute inset-0 flex items-end justify-around px-6">
                    {Object.entries(stats.zile).map(([zi, val], i) => (
                      <div key={i} className="flex flex-col items-center w-full max-w-[50px] relative h-full justify-end group">
                        <span className="text-sm font-black italic text-slate-900 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">{val}</span>
                        <div 
                          className="w-full bg-slate-900 rounded-t-xl transition-all duration-500 group-hover:bg-amber-500 group-hover:shadow-lg group-hover:shadow-amber-100" 
                          style={{ height: `${(val / (stats.displayMax || 1)) * 100}%`, minHeight: '6px' }} 
                        />
                        <span className="absolute -bottom-10 text-[10px] font-black uppercase italic text-slate-500">{zi.substring(0, 3)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Profitabilitate Servicii - Text mărit și spațiu optimizat */}
            <div className="bg-white p-10 rounded-[45px] shadow-md border border-slate-100 flex flex-col">
              <h3 className="text-lg font-black uppercase italic mb-10 tracking-tighter border-l-8 border-emerald-500 pl-4">Profitabilitate</h3>
              <div className="space-y-8">
                {stats.topServices.map((s, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <div className="flex justify-between items-end">
                      <span className="text-[11px] font-black uppercase italic text-slate-700">{s.nume}</span>
                      <span className="text-lg font-black text-emerald-600 italic">{s.total} RON</span>
                    </div>
                    <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-1000" 
                        style={{ width: `${(s.total / (stats.topServices[0]?.total || 1)) * 100}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-10">
                 <div className="bg-slate-50 p-6 rounded-[30px] border border-dashed border-slate-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase italic mb-1">Total Încasări</p>
                    <p className="text-2xl font-black italic text-slate-900">{stats.totalRevenue} RON</p>
                 </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-10 rounded-[45px] text-white relative overflow-hidden mt-10 border border-slate-800 shadow-2xl">
            <div className="relative z-10">
              <h3 className="text-[10px] font-black uppercase italic mb-4 text-amber-500 tracking-widest">Chronos Business Intelligence</h3>
              <p className="text-2xl md:text-3xl font-black italic leading-tight uppercase tracking-tighter max-w-4xl">
                Analiza confirmă un volum de {stats.totalCount} unități. 
                {stats.totalCount > 10 ? ` Performanță ridicată în retenție la ${stats.rataRevenire}%.` : " Continuați colectarea datelor pentru o prognoză relevantă."}
              </p>
            </div>
            <div className="absolute -right-10 -bottom-10 text-[120px] font-black italic text-white/5 select-none uppercase pointer-events-none no-print">ANALYTICS</div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function RapoartePage() {
  return <Suspense fallback={null}><RapoarteContent /></Suspense>;
}