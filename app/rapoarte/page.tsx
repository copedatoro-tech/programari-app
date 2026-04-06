"use client";

import { useState, useEffect, Suspense, useRef, useMemo } from "react";
import { createBrowserClient } from '@supabase/ssr';
import Image from "next/image";
import Link from "next/link";

// --- TIPURI DATE ---
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

// --- COMPONENTĂ NOTIFICARE (POP-UP ELEGANT UNIFORM) ---
function ElegantNotification({ message, onClose }: { message: string, onClose: () => void }) {
  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-white p-8 rounded-[35px] shadow-2xl border border-slate-100 max-w-sm w-full mx-4 transform animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-black">✓</div>
          </div>
          <h3 className="text-xl font-black italic uppercase tracking-tighter mb-2">Notificare</h3>
          <p className="text-slate-500 font-medium italic text-sm mb-6">{message}</p>
          <button 
            onClick={onClose}
            className="w-full bg-slate-900 text-white py-4 rounded-[20px] font-black uppercase italic text-[10px] tracking-widest border-b-4 border-slate-700 hover:scale-[1.02] transition-all"
          >
            Am înțeles
          </button>
        </div>
      </div>
    </div>
  );
}

function RapoarteContent() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

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

      const [apptsRes, srvRes, staffRes] = await Promise.all([
        supabase.from('appointments').select('*').eq('user_id', user.id),
        supabase.from('services').select('*').eq('user_id', user.id),
        supabase.from('staff').select('*').eq('user_id', user.id)
      ]);

      if (apptsRes.data) setAppointments(apptsRes.data);
      if (srvRes.data) setServices(srvRes.data);
      if (staffRes.data) setStaff(staffRes.data);

    } catch (err) {
      console.error("Eroare sincronizare:", err);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const getClientName = (a: Appointment): string => (a.title || a.prenume || a.nume || "").trim() || "Client Necunoscut";
    const getDate = (a: Appointment): string => a.date || a.data || "";
    const getTime = (a: Appointment): string => a.time || a.ora || "";

    const clientMap: Record<string, number> = {};
    let totalRevenue = 0;

    appointments.forEach(a => {
      const numeClient = getClientName(a);
      clientMap[numeClient] = (clientMap[numeClient] || 0) + 1;
      const srv = services.find(s => s.id === a.serviciu_id);
      if (srv) totalRevenue += (Number(srv.price) || 0);
    });

    const topClients = Object.entries(clientMap)
      .map(([n, v]) => ({ n, v }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 5);

    const totalClientiUnici = Object.keys(clientMap).length || 0;
    const rataRevenire = totalClientiUnici > 0 
      ? Math.round((Object.values(clientMap).filter(v => v > 1).length / totalClientiUnici) * 100) 
      : 0;

    const zile: Record<string, number> = { "Luni": 0, "Marți": 0, "Miercuri": 0, "Joi": 0, "Vineri": 0, "Sâmbătă": 0, "Duminică": 0 };
    const numeZile = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];

    appointments.forEach(a => {
      const rawDate = getDate(a);
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          const zi = numeZile[d.getDay()];
          if (zile[zi] !== undefined) zile[zi]++;
        }
      }
    });

    const maxDay = Math.max(...Object.values(zile), 1);
    const serviceRevenue: Record<string, { nume: string; total: number; count: number }> = {};
    
    appointments.forEach(a => {
      const srv = services.find(s => s.id === a.serviciu_id);
      if (srv) {
        if (!serviceRevenue[srv.id]) serviceRevenue[srv.id] = { nume: srv.nume_serviciu, total: 0, count: 0 };
        serviceRevenue[srv.id].total += (Number(srv.price) || 0);
        serviceRevenue[srv.id].count += 1;
      }
    });

    const oreCounts: Record<string, number> = {};
    appointments.forEach(a => {
      const t = getTime(a);
      if (t) {
        const ora = t.substring(0, 2) + ":00";
        oreCounts[ora] = (oreCounts[ora] || 0) + 1;
      }
    });

    const staffCounts: Record<string, { name: string; count: number }> = {};
    appointments.forEach(a => {
      if (a.angajat_id) {
        const specialist = staff.find(s => s.id === a.angajat_id);
        if (specialist) {
          if (!staffCounts[a.angajat_id]) staffCounts[a.angajat_id] = { name: specialist.name, count: 0 };
          staffCounts[a.angajat_id].count += 1;
        }
      }
    });

    return {
      topClients,
      zile,
      maxDay,
      topServices: Object.values(serviceRevenue).sort((a, b) => b.total - a.total).slice(0, 5),
      totalCount: appointments.length,
      ocupare: Math.min(Math.round((appointments.length / 35) * 100), 100),
      totalRevenue,
      mediePeZi: appointments.length > 0 ? (appointments.length / 7).toFixed(1) : "0",
      rataRevenire,
      oraVarf: Object.entries(oreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A",
      topStaff: Object.values(staffCounts).sort((a, b) => b.count - a.count).slice(0, 3),
      ziMinima: Object.entries(zile).sort((a, b) => a[1] - b[1])[0]?.[0] || "N/A",
      totalClientiUnici
    };
  }, [appointments, services, staff]);

  const handleExport = () => {
    setNotification("Raportul a fost pregătit pentru export PDF.");
    setTimeout(() => window.print(), 500);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfcfc]">
      <div className="font-black italic animate-pulse text-slate-900 uppercase text-[10px] tracking-widest">
        GENERARE RAPORT SPECIFIC...
      </div>
    </div>
  );

  return (
    <main ref={contentRef} className="min-h-screen bg-[#fcfcfc] p-6 md:p-12 text-slate-900 font-sans pb-32">
      {notification && <ElegantNotification message={notification} onClose={() => setNotification(null)} />}
      
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-6 border-b pb-8 border-slate-100">
          <div className="flex items-center gap-6">
            <Image src="/logo-chronos.png" alt="Logo" width={50} height={50} priority className="rounded-xl shadow-sm" />
            <div>
              <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter leading-none">
                Rapoarte <span className="text-amber-600">Business</span>
              </h1>
              <p className="text-slate-400 font-bold uppercase text-[8px] tracking-widest italic mt-2">Conexiune Securizată • Date Live</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/programari" className="bg-slate-100 text-slate-900 px-6 py-3 rounded-[15px] font-black text-[9px] uppercase italic hover:bg-slate-200 transition-all">Înapoi</Link>
            <button onClick={handleExport} className="bg-slate-900 text-white px-6 py-3 rounded-[15px] font-black text-[9px] uppercase italic border-b-4 border-slate-700 hover:scale-105 transition-all">Exportă PDF</button>
          </div>
        </div>

        {/* CIFRE CHEIE */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-10">
          {[
            { label: "Total Programări", val: stats.totalCount, color: "text-slate-900" },
            { label: "Venit Est.", val: `${stats.totalRevenue} RON`, color: "text-emerald-600" },
            { label: "Ocupare", val: `${stats.ocupare}%`, color: "text-amber-600" },
            { label: "Medie/Zi", val: stats.mediePeZi, color: "text-slate-900" },
            { label: "Retenție", val: `${stats.rataRevenire}%`, color: "text-blue-600" },
            { label: "Clienți Unici", val: stats.totalClientiUnici, color: "text-purple-600" }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-5 rounded-[30px] shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">{stat.label}</p>
              <h2 className={`text-3xl font-black italic ${stat.color}`}>{stat.val}</h2>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* FLUX SĂPTĂMÂNAL */}
          <div className="bg-white p-8 rounded-[40px] shadow-md border border-slate-50 flex flex-col min-h-[350px]">
            <h3 className="text-[10px] font-black uppercase italic mb-8 tracking-tighter border-l-4 border-amber-500 pl-4">Analiză Săptămânală Volum</h3>
            <div className="flex items-end justify-between h-40 gap-2 px-2 mt-auto">
              {Object.entries(stats.zile).map(([zi, val], i) => (
                <div key={i} className="flex flex-col items-center flex-1 group">
                  <span className="text-[10px] font-black text-slate-400 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">{val}</span>
                  <div
                    className="w-full bg-slate-100 rounded-t-lg transition-all duration-500 group-hover:bg-amber-500"
                    style={{ height: `${Math.max((val / stats.maxDay) * 100, 5)}%` }}
                  />
                  <span className="text-[8px] font-black uppercase mt-3 italic text-slate-400">{zi.substring(0, 3)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* PERFORMANȚĂ SERVICII */}
          <div className="bg-white p-8 rounded-[40px] shadow-md border border-slate-100">
            <h3 className="text-[10px] font-black uppercase italic mb-8 tracking-tighter border-l-4 border-emerald-500 pl-4">Performanță Servicii</h3>
            <div className="space-y-5">
              {stats.topServices.length > 0 ? stats.topServices.map((s, i) => (
                <div key={i} className="flex flex-col gap-1 group">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-black uppercase italic text-slate-600 group-hover:text-emerald-600 transition-colors">{s.nume}</span>
                    <div className="text-right">
                      <span className="text-[11px] font-black text-emerald-600">{s.total} RON</span>
                      <span className="text-[8px] text-slate-400 ml-2 italic">({s.count} prog.)</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(s.total / (stats.topServices[0].total || 1)) * 100}%` }} />
                  </div>
                </div>
              )) : (
                <div className="flex items-center justify-center h-40 italic text-slate-300 text-[9px] uppercase font-black">Niciun serviciu cu date complete</div>
              )}
            </div>
          </div>
        </div>

        {/* CLIENȚI ȘI SPECIALIȘTI */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 bg-white p-8 rounded-[40px] shadow-md border border-slate-50">
            <h3 className="text-[10px] font-black uppercase italic mb-6 tracking-tighter border-l-4 border-slate-900 pl-4">Top Clienți (Fidelitate)</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {stats.topClients.map((c, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-[25px] flex flex-col gap-2 hover:bg-white transition-all border border-transparent hover:border-slate-100 group">
                  <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs italic group-hover:rotate-6 transition-transform">
                    {c.n.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-black text-[10px] uppercase italic text-slate-700 truncate">{c.n}</span>
                  <span className="text-amber-600 font-black text-[8px] uppercase">{c.v} Vizite</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] shadow-md border border-slate-50">
            <h3 className="text-[10px] font-black uppercase italic mb-6 tracking-tighter border-l-4 border-purple-500 pl-4">Top Specialiști</h3>
            <div className="space-y-4">
              {stats.topStaff.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl hover:bg-purple-50 transition-colors cursor-pointer">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] text-white ${i === 0 ? 'bg-amber-500' : 'bg-slate-400'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="font-black text-[10px] uppercase italic text-slate-700 truncate">{s.name}</p>
                    <p className="text-[8px] font-bold text-slate-400">{s.count} programări</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI INSIGHT */}
        <div className="bg-slate-900 p-10 rounded-[45px] text-white shadow-2xl relative overflow-hidden group">
          <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center">
            <div className="flex-1">
              <h3 className="text-[9px] font-black uppercase italic mb-4 text-amber-500 tracking-[0.3em]">Chronos AI Mentor</h3>
              <p className="text-2xl font-black italic leading-tight uppercase tracking-tighter">
                {stats.totalCount > 5
                  ? `Ai ${stats.totalClientiUnici} clienți și o rată de revenire de ${stats.rataRevenire}%. ${stats.oraVarf !== "N/A" ? `Ora de vârf: ${stats.oraVarf}.` : ""} ${stats.rataRevenire > 30 ? "Fidelizarea funcționează!" : "Concentrează-te pe retenție."}`
                  : "Adaugă mai multe programări pentru analize strategice AI."}
              </p>
            </div>
            <div className="w-full md:w-1/3 bg-white/5 p-6 rounded-[30px] border border-white/10 backdrop-blur-md">
              <p className="text-[10px] font-bold italic text-slate-400 mb-2 uppercase">💡 Sfat Operativ</p>
              <p className="text-[11px] font-medium leading-relaxed italic">
                {stats.ziMinima !== "N/A" 
                  ? <span>Ziua de <span className="text-amber-500 font-black uppercase">{stats.ziMinima}</span> este cea mai liberă. Încearcă să programezi clienții noi atunci.</span>
                  : "Analizăm datele pentru sfaturi personalizate."}
              </p>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 text-[120px] font-black italic text-white/5 select-none uppercase pointer-events-none group-hover:scale-110 transition-transform duration-700">GROWTH</div>
        </div>
      </div>
    </main>
  );
}

export default function RapoartePage() {
  return <Suspense fallback={null}><RapoarteContent /></Suspense>;
}