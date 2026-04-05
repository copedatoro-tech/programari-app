"use client";

import { useState, useEffect, Suspense, useRef, useMemo } from "react";
import { createBrowserClient } from '@supabase/ssr';
import Image from "next/image";
import Link from "next/link";

// CORECȚIE: tipuri flexibile care acoperă TOATE câmpurile posibile din DB
type Appointment = {
  id: string;
  date?: string;
  data?: string;
  // CORECȚIE: title e câmpul principal inserat de pagina Programări și Rezervare
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

      const [profileRes, apptsRes, srvRes, staffRes] = await Promise.all([
        supabase.from('profiles').select('plan_type').eq('id', user.id).single(),
        // CORECȚIE: selectăm explicit toate câmpurile de nume pentru compatibilitate
        supabase.from('appointments').select('id, date, time, title, prenume, nume, serviciu_id, angajat_id, phone, user_id').eq('user_id', user.id),
        supabase.from('services').select('*').eq('user_id', user.id),
        supabase.from('staff').select('*').eq('user_id', user.id)
      ]);

      if (profileRes.data) setPlanType(profileRes.data.plan_type);
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
    // CORECȚIE: funcție helper pentru a extrage numele corect din orice sursă
    const getClientName = (a: Appointment): string => {
      // Prioritate: title (inserat de ambele pagini) → prenume → nume → fallback
      return (a.title || a.prenume || a.nume || "").trim() || "Client Necunoscut";
    };

    // CORECȚIE: funcție helper pentru data
    const getDate = (a: Appointment): string => {
      return a.date || a.data || "";
    };

    // CORECȚIE: funcție helper pentru oră
    const getTime = (a: Appointment): string => {
      return a.time || a.ora || "";
    };

    // 1. Analiză Loialitate & Revenire
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

    const clientiCareAuRevenit = Object.values(clientMap).filter(v => v > 1).length;
    const totalClientiUnici = Object.keys(clientMap).length || 1;
    const rataRevenire = Math.round((clientiCareAuRevenit / totalClientiUnici) * 100);

    // 2. Flux Săptămânal
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
    const mediePeZi = appointments.length > 0 ? (appointments.length / 7).toFixed(1) : "0";

    // 3. Rentabilitate Servicii
    const serviceRevenue: Record<string, { nume: string; total: number; count: number }> = {};
    appointments.forEach(a => {
      const srv = services.find(s => s.id === a.serviciu_id);
      if (srv) {
        if (!serviceRevenue[srv.id]) serviceRevenue[srv.id] = { nume: srv.nume_serviciu, total: 0, count: 0 };
        serviceRevenue[srv.id].total += (Number(srv.price) || 0);
        serviceRevenue[srv.id].count += 1;
      }
    });
    const topServices = Object.values(serviceRevenue).sort((a, b) => b.total - a.total).slice(0, 5);

    // 4. Statistici ore de vârf
    const oreCounts: Record<string, number> = {};
    appointments.forEach(a => {
      const t = getTime(a);
      if (t) {
        const ora = t.substring(0, 2) + ":00";
        oreCounts[ora] = (oreCounts[ora] || 0) + 1;
      }
    });
    const oraVarf = Object.entries(oreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

    // 5. Performanță specialiști
    const staffRevenue: Record<string, { name: string; count: number }> = {};
    appointments.forEach(a => {
      if (a.angajat_id) {
        const specialist = staff.find(s => s.id === a.angajat_id);
        if (specialist) {
          if (!staffRevenue[a.angajat_id]) staffRevenue[a.angajat_id] = { name: specialist.name, count: 0 };
          staffRevenue[a.angajat_id].count += 1;
        }
      }
    });
    const topStaff = Object.values(staffRevenue).sort((a, b) => b.count - a.count).slice(0, 3);

    const ocupare = Math.min(Math.round((appointments.length / 35) * 100), 100);
    const ziMinima = Object.entries(zile).sort((a, b) => a[1] - b[1])[0];

    return {
      topClients,
      zile,
      maxDay,
      topServices,
      totalCount: appointments.length,
      ocupare,
      totalRevenue,
      mediePeZi,
      rataRevenire,
      oraVarf,
      topStaff,
      ziMinima: ziMinima ? ziMinima[0] : "N/A",
      totalClientiUnici
    };
  }, [appointments, services, staff]);

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

        {/* HEADER */}
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
            <Link href="/programari" className="bg-slate-100 text-slate-900 px-6 py-3 rounded-[15px] font-black text-[9px] uppercase italic hover:bg-slate-200 transition-all">Înapoi</Link>
            <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 py-3 rounded-[15px] font-black text-[9px] uppercase italic border-b-4 border-slate-700 hover:scale-105 transition-all">Exportă PDF</button>
          </div>
        </div>

        {/* CIFRE CHEIE - CORECȚIE: adăugăm clienți unici și oră de vârf */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-10">
          <div className="bg-white p-5 rounded-[30px] shadow-sm border border-slate-100">
            <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Total Programări</p>
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
          {/* CORECȚIE: câmp nou - clienți unici */}
          <div className="bg-white p-5 rounded-[30px] shadow-sm border border-slate-100">
            <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Clienți Unici</p>
            <h2 className="text-3xl font-black italic text-purple-600">{stats.totalClientiUnici}</h2>
          </div>
        </div>

        {/* RANDUL 1: FLUX ȘI SERVICII */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white p-8 rounded-[40px] shadow-md border border-slate-50 flex flex-col min-h-[350px]">
            <h3 className="text-[10px] font-black uppercase italic mb-8 tracking-tighter border-l-4 border-amber-500 pl-4">Analiză Săptămânală Volum</h3>
            <div className="flex items-end justify-between h-40 gap-2 px-2 mt-auto">
              {Object.entries(stats.zile).map(([zi, val], i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  <span className="text-xs font-black text-slate-400 mb-2">{val}</span>
                  <div
                    className="w-full bg-slate-100 rounded-t-lg transition-all duration-500 hover:bg-amber-500"
                    style={{ height: `${Math.max((val / stats.maxDay) * 100, 5)}%` }}
                  />
                  <span className="text-[8px] font-black uppercase mt-3 italic text-slate-400">{zi.substring(0, 3)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] shadow-md border border-slate-100 min-h-[350px]">
            <h3 className="text-[10px] font-black uppercase italic mb-8 tracking-tighter border-l-4 border-emerald-500 pl-4">Performanță Servicii</h3>
            {stats.topServices.length > 0 ? (
              <div className="space-y-5">
                {stats.topServices.map((s, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex justify-between items-end">
                      <span className="text-[9px] font-black uppercase italic text-slate-600">{s.nume}</span>
                      <div className="text-right">
                        <span className="text-[11px] font-black text-emerald-600">{s.total} RON</span>
                        <span className="text-[8px] text-slate-400 ml-2 italic">({s.count} prog.)</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${Math.min((s.total / (stats.topServices[0]?.total || 1)) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40">
                <p className="text-[9px] font-black text-slate-300 uppercase italic">Niciun serviciu cu date complete</p>
              </div>
            )}
          </div>
        </div>

        {/* RANDUL 2: CLIENȚI FIDELI + SPECIALIȘTI */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 bg-white p-8 rounded-[40px] shadow-md border border-slate-50">
            <h3 className="text-[10px] font-black uppercase italic mb-6 tracking-tighter border-l-4 border-slate-900 pl-4">Top Clienți (Fidelitate)</h3>
            {stats.topClients.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {stats.topClients.map((c, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-[20px] flex flex-col gap-2 hover:bg-white transition-all border border-transparent hover:border-slate-100">
                    <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-[10px] italic">
                      {c.n.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-black text-[10px] uppercase italic text-slate-700 truncate">{c.n}</span>
                    <span className="text-amber-600 font-black text-[9px] uppercase">{c.v} Programări</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-20">
                <p className="text-[9px] font-black text-slate-300 uppercase italic">Adaugă programări pentru statistici</p>
              </div>
            )}
          </div>

          {/* CORECȚIE: secțiune nouă - top specialiști */}
          <div className="bg-white p-8 rounded-[40px] shadow-md border border-slate-50">
            <h3 className="text-[10px] font-black uppercase italic mb-6 tracking-tighter border-l-4 border-purple-500 pl-4">Top Specialiști</h3>
            {stats.topStaff.length > 0 ? (
              <div className="space-y-4">
                {stats.topStaff.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-600' : 'bg-slate-400'}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-black text-[10px] uppercase italic text-slate-700 truncate">{s.name}</p>
                      <p className="text-[8px] font-bold text-slate-400">{s.count} programări</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-20">
                <p className="text-[9px] font-black text-slate-300 uppercase italic text-center">Niciun specialist asociat cu programări</p>
              </div>
            )}
          </div>
        </div>

        {/* RANDUL 3: CHRONOS AI */}
        <div className="bg-slate-900 p-10 rounded-[45px] text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center">
            <div className="flex-1">
              <h3 className="text-[9px] font-black uppercase italic mb-4 text-amber-500 tracking-[0.3em]">Chronos AI Mentor Personal</h3>
              <p className="text-2xl font-black italic leading-tight uppercase tracking-tighter">
                {stats.totalCount > 5
                  ? `Ai ${stats.totalClientiUnici} clienți unici și o rată de revenire de ${stats.rataRevenire}%. ${stats.oraVarf !== "N/A" ? `Ora de vârf este ${stats.oraVarf}.` : ""} ${stats.rataRevenire > 30 ? "Ofertele tale de loialitate funcționează excelent!" : "Concentrează-te pe fidelizarea clienților existenți."}`
                  : "Date insuficiente pentru un sfat strategic complet. Continuă să adaugi programări!"}
              </p>
            </div>
            <div className="w-full md:w-1/3 bg-white/5 p-6 rounded-[30px] border border-white/10">
              <p className="text-[10px] font-bold italic text-slate-400 mb-2 uppercase">💡 Sfat Operativ</p>
              <p className="text-[12px] font-medium leading-relaxed italic">
                {stats.ziMinima !== "N/A"
                  ? `Analizând fluxul, ziua de `
                  : "Adaugă mai multe programări pentru a obține sfaturi operaționale personalizate."}
                {stats.ziMinima !== "N/A" && (
                  <>
                    <span className="text-amber-500 font-black uppercase">{stats.ziMinima}</span>
                    {` are cel mai mic volum. Poți muta programările complexe sau de durată mai lungă în această zi.`}
                  </>
                )}
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