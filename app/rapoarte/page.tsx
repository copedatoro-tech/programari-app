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
  const [planType, setPlanType] = useState<string>("CHRONOS FREE");
  
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
        supabase.from('profiles').select('full_name, email, plan_type').eq('id', user.id).maybeSingle(),
      ]);

      if (apptsRes.data) setAppointments(apptsRes.data);
      if (srvRes.data) setServices(srvRes.data);
      if (staffRes.data) setStaff(staffRes.data);
      if (profileRes.data) {
        setUserName(profileRes.data.full_name || user.email || "");
        setPlanType((profileRes.data.plan_type || "CHRONOS FREE").toUpperCase());
      }
    } catch (err) {
      console.error("Eroare sincronizare:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;
    let activeChannel: any = null;

    const initApp = async () => {
      setLoading(true);
      await fetchRealData();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;

      // Generăm un ID unic pentru canal ca să evităm eroarea de coliziune în Strict Mode
      const channelName = `rapoarte_realtime_${user.id}_${Math.random().toString(36).substring(2, 7)}`;

      // Pasul 1: Configurăm canalul și atașăm callback-urile (ÎNAINTE de subscribe)
      activeChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'appointments', 
            filter: `user_id=eq.${user.id}` 
          }, 
          () => {
            if (isMounted) fetchRealData();
          }
        );

      // Pasul 2: Apelăm subscribe DOAR după ce toate callback-urile au fost înregistrate
      activeChannel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = activeChannel;
        }
      });
    };

    initApp();

    return () => { 
      isMounted = false;
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [supabase]);

  const stats = useMemo(() => {
    const getClientName = (a: Appointment): string => (a.title || a.prenume || a.nume || "").trim() || "Client Necunoscut";
    const getDate = (a: Appointment): string => a.date || a.data || "";
    
    const clientMap: Record<string, number> = {};
    let totalRevenue = 0;

    const staffPerformance: Record<string, { name: string, count: number, revenue: number }> = {};
    staff.forEach(s => staffPerformance[s.id] = { name: s.name, count: 0, revenue: 0 });

    appointments.forEach(a => {
      const numeClient = getClientName(a);
      clientMap[numeClient] = (clientMap[numeClient] || 0) + 1;
      
      const srv = services.find(s => s.id === a.serviciu_id);
      const price = Number(srv?.price) || 0;
      totalRevenue += price;

      if (a.angajat_id && staffPerformance[a.angajat_id]) {
        staffPerformance[a.angajat_id].count++;
        staffPerformance[a.angajat_id].revenue += price;
      }
    });

    const totalClientiUnici = Object.keys(clientMap).length || 0;
    const rataRevenire = totalClientiUnici > 0 ? Math.round((Object.values(clientMap).filter(v => v > 1).length / totalClientiUnici) * 100) : 0;
    const valoareMedie = appointments.length > 0 ? Math.round(totalRevenue / appointments.length) : 0;

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
    const displayMax = actualMax <= 5 ? 5 : Math.ceil(actualMax / 10) * 10;
    const yThresholds = [displayMax, Math.round(displayMax * 0.5), 0];

    const serviceRevenue: Record<string, { nume: string; total: number }> = {};
    appointments.forEach(a => {
      const srv = services.find(s => s.id === a.serviciu_id);
      if (srv) {
        if (!serviceRevenue[srv.id]) serviceRevenue[srv.id] = { nume: srv.nume_serviciu, total: 0 };
        serviceRevenue[srv.id].total += (Number(srv.price) || 0);
      }
    });

    return {
      zile,
      displayMax,
      yThresholds,
      topServices: Object.values(serviceRevenue).sort((a, b) => b.total - a.total).slice(0, 5),
      staffStats: Object.values(staffPerformance).sort((a, b) => b.revenue - a.revenue),
      totalCount: appointments.length,
      totalRevenue,
      mediePeZi: appointments.length > 0 ? (appointments.length / 7).toFixed(1) : "0",
      rataRevenire,
      totalClientiUnici,
      valoareMedie,
    };
  }, [appointments, services, staff]);

  const handleExport = () => window.print();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfcfc]">
      <div className="font-black italic animate-pulse text-slate-900 uppercase text-[10px] tracking-widest">GENERARE ANALITICE...</div>
    </div>
  );

  const isFree = planType.includes("FREE");
  const isPro = planType.includes("PRO");
  const isElite = planType.includes("ELITE");
  const isTeam = planType.includes("TEAM");

  if (isFree) {
    return (
      <main className="min-h-screen bg-[#fcfcfc] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-10 rounded-[45px] shadow-xl border border-slate-100 text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-4xl">🔒</div>
          </div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 mb-4">Rapoarte Blocate</h2>
          <p className="text-slate-500 font-bold text-sm leading-relaxed mb-8">
            Planul <span className="text-amber-600">FREE</span> nu include acces la rapoarte. Alege un plan superior pentru a vedea performanța afacerii tale.
          </p>
          <Link href="/abonamente" className="block w-full bg-slate-900 text-white py-4 rounded-[20px] font-black text-[12px] uppercase italic border-b-4 border-slate-700 hover:scale-105 transition-all text-center">Vezi Planuri</Link>
        </div>
      </main>
    );
  }

  const dashboardStats = [
    { label: "Total Programări", val: stats.totalCount, color: "text-slate-900", access: isPro || isElite || isTeam },
    { label: "Venit Estimat", val: `${stats.totalRevenue} RON`, color: "text-emerald-600", access: isPro || isElite || isTeam },
    { label: "Medie pe Zi", val: stats.mediePeZi, color: "text-slate-900", access: isPro || isElite || isTeam },
    { label: "Valoare Medie", val: `${stats.valoareMedie} RON`, color: "text-amber-600", access: isElite || isTeam },
    { label: "Clienți Unici", val: stats.totalClientiUnici, color: "text-slate-900", access: isElite || isTeam },
    { label: "Rată Retenție", val: `${stats.rataRevenire}%`, color: "text-blue-600", access: isElite || isTeam },
  ];

  return (
    <>
      <style jsx global>{`
        @media print {
          nav, .no-print, button, a, .menu-btn { display: none !important; }
          @page { margin: 10mm; size: auto; }
          body { 
            background: white !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          main { padding: 0 !important; }
          .bg-slate-900 { 
            background-color: #0f172a !important; 
            color: white !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          .bg-emerald-500 { background-color: #10b981 !important; -webkit-print-color-adjust: exact !important; }
          .bg-blue-500 { background-color: #3b82f6 !important; -webkit-print-color-adjust: exact !important; }
          .bg-amber-500 { background-color: #f59e0b !important; -webkit-print-color-adjust: exact !important; }
          .shadow-md, .shadow-xl, .shadow-2xl { box-shadow: none !important; border: 1px solid #f1f5f9 !important; }
          .chart-bar { 
            display: block !important;
            background-color: #0f172a !important; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <main className="min-h-screen bg-[#fcfcfc] p-6 md:p-12 text-slate-900 font-sans pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-6 border-b pb-8 border-slate-100">
            <div className="flex items-center gap-6">
              <Image src="/logo-chronos.png" alt="Logo" width={60} height={60} priority className="rounded-xl" style={{ height: 'auto' }} />
              <div>
                <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
                  Raport <span className="text-amber-600">{isTeam ? "Echipă" : isElite ? "Detaliat" : "Sumar"}</span>
                </h1>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest italic mt-2">
                  Admin: {userName} | Plan: {planType} | {new Date().toLocaleDateString('ro-RO')}
                </p>
              </div>
            </div>
            <div className="flex gap-3 no-print">
              <Link href="/programari" className="bg-slate-100 text-slate-900 px-8 py-4 rounded-[15px] font-black text-[10px] uppercase italic hover:bg-slate-200 transition-all">Înapoi</Link>
              <button onClick={handleExport} className="bg-slate-900 text-white px-8 py-4 rounded-[15px] font-black text-[10px] uppercase italic border-b-4 border-slate-700 hover:scale-105 transition-all">Exportă PDF</button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
            {dashboardStats.map((stat, i) => (
              <div key={i} className={`bg-white p-5 rounded-[30px] shadow-sm border border-slate-100 transition-all ${!stat.access ? 'opacity-40 grayscale' : ''}`}>
                <p className="text-[9px] font-black text-slate-400 uppercase italic mb-2 tracking-widest">{stat.label}</p>
                <h2 className={`text-xl md:text-2xl font-black italic tracking-tighter ${stat.access ? stat.color : 'text-slate-300'}`}>
                  {stat.access ? stat.val : "LOCKED"}
                </h2>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-white p-10 rounded-[45px] shadow-md border border-slate-50 flex flex-col h-[450px]">
              <h3 className="text-lg font-black uppercase italic tracking-tighter border-l-8 border-amber-500 pl-4 mb-12">Distribuție Săptămânală</h3>
              <div className="flex-1 flex gap-6">
                <div className="flex flex-col justify-between text-[11px] font-black text-slate-300 pb-10 italic">
                  {stats.yThresholds.map((val, i) => <span key={i}>{val}</span>)}
                </div>
                <div className="flex-1 flex items-end justify-around px-6 border-l border-b border-slate-100">
                  {Object.entries(stats.zile).map(([zi, val], i) => (
                    <div key={i} className="flex flex-col items-center w-full max-w-[40px] group relative h-full justify-end">
                      <div 
                        className="chart-bar w-full bg-slate-900 rounded-t-lg transition-all duration-500 group-hover:bg-amber-500" 
                        style={{ height: `${(val / (stats.displayMax || 1)) * 100}%`, minHeight: '4px' }} 
                      />
                      <span className="absolute -bottom-8 text-[9px] font-black uppercase italic text-slate-400">{zi.substring(0, 3)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={`bg-white p-10 rounded-[45px] shadow-md border border-slate-100 flex flex-col ${(!isElite && !isTeam) ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              <h3 className="text-lg font-black uppercase italic mb-10 tracking-tighter border-l-8 border-emerald-500 pl-4">Servicii Top</h3>
              {(!isElite && !isTeam) ? (
                <div className="flex-1 flex items-center justify-center text-center p-4">
                  <p className="text-[10px] font-black uppercase italic text-slate-400">Disponibil în planurile ELITE & TEAM</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {stats.topServices.map((s, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-[11px] font-black uppercase italic">
                        <span className="truncate max-w-[150px]">{s.nume}</span>
                        <span className="text-emerald-600">{s.total} RON</span>
                      </div>
                      <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                        <div className="h-full bg-emerald-500" style={{ width: `${(s.total / (stats.topServices[0]?.total || 1)) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {isTeam && (
            <div className="mt-10 bg-white p-10 rounded-[45px] shadow-md border border-slate-100">
              <h3 className="text-lg font-black uppercase italic mb-8 tracking-tighter border-l-8 border-blue-600 pl-4">Performanță Membri Echipă</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black uppercase italic text-slate-400 border-b border-slate-100">
                      <th className="pb-4">Membru Echipă</th>
                      <th className="pb-4">Programări</th>
                      <th className="pb-4">Venit Generat</th>
                      <th className="pb-4">Eficiență Volum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {stats.staffStats.map((s, i) => (
                      <tr key={i} className="text-sm font-bold">
                        <td className="py-4 italic uppercase">{s.name}</td>
                        <td className="py-4">{s.count}</td>
                        <td className="py-4 text-emerald-600">{s.revenue} RON</td>
                        <td className="py-4">
                            <div className="w-32 h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                              <div className="h-full bg-blue-500" style={{ width: `${(s.count / (stats.totalCount || 1)) * 100}%` }} />
                            </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(isElite || isTeam) && (
            <div className="bg-slate-900 p-10 rounded-[45px] text-white relative overflow-hidden mt-10 shadow-2xl">
              <div className="relative z-10">
                <h3 className="text-[10px] font-black uppercase italic mb-4 text-amber-500 tracking-widest">Chronos AI Insights</h3>
                <p className="text-xl md:text-2xl font-black italic leading-tight uppercase tracking-tighter max-w-3xl">
                  {stats.totalCount > 20 
                    ? `Afacerea are un momentum excelent. Cu o rată de revenire de ${stats.rataRevenire}%, baza de clienți este stabilă.` 
                    : "Analiza sugerează că sunteți în faza de colectare date. Continuați procesarea pentru prognoze financiare."}
                </p>
              </div>
              <div className="absolute -right-10 -bottom-10 text-[100px] font-black italic text-white/5 uppercase select-none no-print">STRATEGY</div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default function RapoartePage() {
  return <Suspense fallback={null}><RapoarteContent /></Suspense>;
}