"use client";

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";
import debounce from "lodash/debounce";
import MultiServiceBooking from "@/components/MultiServiceBooking";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, refetchOnWindowFocus: false } },
});

type DocumentAttachment = { id: number; name: string; url: string };
type StaffRow  = { id: string; name: string; services: string[] };
type ServiceRow = { id: string; nume_serviciu: string; price: number; duration: number };
type WorkingHourEntry = { day: string; start: string; end: string; closed: boolean };

const LIMITE_ABONAMENTE: Record<string, number> = {
  "chronos free": 30, "start (gratuit)": 30,
  "chronos pro": 150, "chronos elite": 500, "chronos team": 999999,
};

function parseWH(d: any): WorkingHourEntry[] {
  if (!d) return [];
  if (typeof d === "string") { try { return JSON.parse(d); } catch { return []; } }
  return Array.isArray(d) ? d : [];
}

// ─────────────────────────────────────────────────────────────────────────────
function ProgramariContent() {
  const today = new Date().toISOString().split("T")[0];

  // ── Date client (partajate cu MultiServiceBooking) ─────────────────────────
  const [clientData, setClientData] = useState({ nume: "", telefon: "", email: "", detalii: "" });
  const [clientErrors, setClientErrors] = useState<Record<string, boolean>>({});
  const [poza, setPoza] = useState<string | null>(null);

  // ── Fișiere ────────────────────────────────────────────────────────────────
  const [documente, setDocumente] = useState<DocumentAttachment[]>([]);

  // ── Succes multi ───────────────────────────────────────────────────────────
  const [multiSuccess, setMultiSuccess] = useState(false);

  // ── Popup programare ───────────────────────────────────────────────────────
  const [popupProgramare, setPopupProgramare] = useState<any | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [userId, setUserId] = useState("");

  const suggestionsRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  };

  useEffect(() => {
    getSession().then((s) => { if (s?.user?.id) setUserId(s.user.id); });
  }, []);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: programari } = useQuery({
    queryKey: ["programari"],
    queryFn: async () => {
      const s = await getSession(); if (!s) return [];
      const dl = new Date(); dl.setDate(dl.getDate() - 30);
      const { data } = await supabase.from("appointments")
        .select("id, title, date, time, details, phone, email, file_url, is_client_booking, angajat_id, serviciu_id, documente, nume_serviciu, duration")
        .eq("user_id", s.user.id).gte("date", dl.toISOString().split("T")[0]).order("date", { ascending: false });
      return data || [];
    },
  });

  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const s = await getSession(); if (!s) return null;
      const { data } = await supabase.from("profiles")
        .select("plan_type, trial_started_at, working_hours, manual_blocks").eq("id", s.user.id).single();
      return data;
    },
  });

  const { data: angajati } = useQuery({
    queryKey: ["angajati"],
    queryFn: async () => {
      const s = await getSession(); if (!s) return [];
      const { data } = await supabase.from("staff").select("id, name, services").eq("user_id", s.user.id);
      return data || [];
    },
  });

  const { data: servicii } = useQuery({
    queryKey: ["servicii"],
    queryFn: async () => {
      const s = await getSession(); if (!s) return [];
      const { data } = await supabase.from("services").select("id, nume_serviciu, price, duration").eq("user_id", s.user.id);
      return data || [];
    },
  });

  // ── Derived ────────────────────────────────────────────────────────────────
  const userPlan   = profileData?.plan_type?.toLowerCase() || "chronos free";
  const isTrialing = !!profileData?.trial_started_at;

  const daysLeft = useMemo(() => {
    if (!isTrialing || !profileData?.trial_started_at) return null;
    const start = new Date(profileData.trial_started_at).getTime();
    const ms10 = 10 * 24 * 60 * 60 * 1000;
    if (Date.now() - start < ms10) return Math.ceil((start + ms10 - Date.now()) / (1000 * 60 * 60 * 24));
    return null;
  }, [profileData, isTrialing]);

  const adminWorkingHours = useMemo<WorkingHourEntry[]>(() => parseWH(profileData?.working_hours), [profileData?.working_hours]);

  const adminManualBlocks = useMemo<Record<string, string[]>>(() => {
    const r = profileData?.manual_blocks;
    if (!r || typeof r !== "object" || Array.isArray(r)) return {};
    return r;
  }, [profileData?.manual_blocks]);

  const programariAzi = useMemo(() => (programari || []).filter((p: any) => p.date === today), [programari, today]);

  const statsAzi = useMemo(() => ({
    total: programariAzi.length,
    online: programariAzi.filter((p: any) => p.is_client_booking).length,
  }), [programariAzi]);

  const countLunaCurenta = useMemo(() => {
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
    return (programari || []).filter((p: any) => p.date >= firstDay).length;
  }, [programari]);

  const limitaCurenta = isTrialing ? 999999 : LIMITE_ABONAMENTE[userPlan] || 30;

  // ── Validare client ────────────────────────────────────────────────────────
  const validateClientData = useCallback((): boolean => {
    const e: Record<string, boolean> = {};
    if (!clientData.nume.trim())    e.nume = true;
    if (!clientData.telefon.trim()) e.telefon = true;
    if (!clientData.email.trim())   e.email = true;
    setClientErrors(e);
    return Object.keys(e).length === 0;
  }, [clientData]);

  // ── Autocomplete ───────────────────────────────────────────────────────────
  const handleNumeChange = useCallback(
    debounce((val: string) => {
      setClientData((prev) => ({ ...prev, nume: val }));
      setClientErrors((prev) => ({ ...prev, nume: false }));
      if (val.length > 1 && programari) {
        const unique = Array.from(
          new Map((programari as any[]).filter((x) => x.title).map((x) => [x.title.toLowerCase(), x])).values()
        );
        const filtered = unique.filter((c: any) => c.title.toLowerCase().includes(val.toLowerCase())).slice(0, 5);
        setFilteredClients(filtered);
        setShowSuggestions(filtered.length > 0);
      } else {
        setShowSuggestions(false);
      }
    }, 300),
    [programari]
  );

  const selecteazaClient = (c: any) => {
    setClientData((prev) => ({ ...prev, nume: c.title, telefon: c.phone || "", email: c.email || "" }));
    setPoza(c.file_url || null);
    setClientErrors({});
    setShowSuggestions(false);
  };

  // ── Upload fișiere ─────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const docs = [...documente];
    for (const file of Array.from(e.target.files)) {
      const name = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      const { error } = await supabase.storage.from("documente-programari").upload(name, file);
      if (!error) {
        const { data: u } = supabase.storage.from("documente-programari").getPublicUrl(name);
        docs.push({ id: Date.now() + Math.random(), name: file.name, url: u.publicUrl });
      }
    }
    setDocumente(docs);
  };

  const eliminaDoc = (id: number) => setDocumente((p) => p.filter((d) => d.id !== id));

  const eliminaProgramare = async (id: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Ștergi programarea?")) {
      await supabase.from("appointments").delete().eq("id", id);
      window.location.reload();
    }
  };

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (suggestionsRef.current && !suggestionsRef.current.contains(t)) setShowSuggestions(false);
      if (popupRef.current && !popupRef.current.contains(t)) setPopupProgramare(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Ecran succes ───────────────────────────────────────────────────────────
  if (multiSuccess) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white rounded-[55px] p-16 text-center shadow-2xl border-t-8 border-amber-500">
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-2xl font-black uppercase italic mb-4">Programări Salvate!</h2>
          <p className="text-slate-500 font-bold mb-8">Toate programările au fost înregistrate cu succes.</p>
          <button
            onClick={() => { setMultiSuccess(false); setClientData({ nume: "", telefon: "", email: "", detalii: "" }); setPoza(null); window.location.reload(); }}
            className="w-full max-w-xs bg-slate-900 text-white py-5 rounded-2xl font-black uppercase italic hover:bg-amber-500 hover:text-black transition-all">
            CONTINUĂ
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-12 text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto">

        {/* Banner Trial */}
        {isTrialing && daysLeft !== null && (
          <div className="mb-10 bg-slate-900 border-l-[10px] border-amber-500 p-6 rounded-[35px] shadow-xl flex flex-col md:flex-row items-center justify-between overflow-hidden relative border border-white/5">
            <div className="flex items-center gap-5 relative z-10">
              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg animate-pulse">🎁</div>
              <div>
                <h4 className="text-white font-black uppercase italic tracking-tighter text-xl">Trial Premium Activ</h4>
                <p className="text-amber-500 text-[9px] font-black uppercase tracking-[0.3em] mt-1">Acces Chronos Team — {daysLeft} zile rămase</p>
              </div>
            </div>
            <div className="mt-4 md:mt-0 px-6 py-2 bg-white/5 rounded-full border border-white/10 relative z-10">
              <p className="text-[10px] font-black text-slate-300 uppercase italic">
                <span className="text-white text-lg mr-2">{daysLeft}</span> zile rămase
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
              Gestiune <span className="text-amber-600">Programări</span>
            </h1>
            <p className="text-[10px] font-black uppercase italic text-slate-400 mt-2">
              Plan: <span className="text-amber-600">{userPlan.toUpperCase()}</span> •{" "}
              {countLunaCurenta} / {isTrialing ? "∞" : limitaCurenta} luna aceasta
            </p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-amber-100 flex items-center gap-3">
              <span className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></span>
              <p className="text-[11px] font-black uppercase italic text-slate-600">
                Azi: <span className="text-amber-600">{statsAzi.total} Total</span> •{" "}
                <span className="text-blue-500">{statsAzi.online} Online</span>
              </p>
            </div>
            <Link href="/programari/calendar"
              className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3 hover:bg-slate-50 transition-all active:scale-95">
              <span className="text-xs">📅</span>
              <p className="text-[11px] font-black uppercase italic text-slate-600">Calendar</p>
            </Link>
          </div>
        </div>

        {/* ── FORMULAR ────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-[50px] p-8 md:p-14 shadow-2xl border border-slate-100 mb-16">

          {/* ── SECȚIUNEA CLIENT (sus) ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-10">

            {/* Poza client */}
            <div className="lg:col-span-3 flex flex-col items-center">
              <div className="w-44 h-44 bg-slate-50 rounded-[45px] overflow-hidden border-8 border-white shadow-xl relative flex items-center justify-center mb-6">
                {poza
                  ? <img src={poza} className="w-full h-full object-cover" alt="Client" />
                  : <div className="w-full h-full relative flex items-center justify-center bg-slate-50">
                      <Image src="/logo-chronos.png" alt="Chronos" fill sizes="176px" style={{ objectFit: "contain", padding: "16px" }} priority />
                    </div>
                }
                <input type="file" id="f-pick" className="hidden" accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      const r = new FileReader();
                      r.onload = () => setPoza(r.result as string);
                      r.readAsDataURL(e.target.files![0]);
                    }
                  }} />
                <label htmlFor="f-pick" className="absolute inset-0 cursor-pointer z-10" />
              </div>
              <p className="text-[10px] font-black uppercase italic text-slate-400">Poza Profil Client</p>
            </div>

            {/* Câmpuri client */}
            <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Nume cu autocomplete */}
              <div className="md:col-span-2 flex flex-col gap-2 relative">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Nume Client</label>
                <input
                  type="text" placeholder="Nume..."
                  className={`p-5 bg-slate-50 rounded-[25px] border-2 ${clientErrors.nume ? "border-red-500" : "border-transparent focus:border-amber-500"} font-bold text-lg outline-none shadow-inner transition-all`}
                  value={clientData.nume}
                  onChange={(e) => handleNumeChange(e.target.value)}
                />
                {showSuggestions && (
                  <div ref={suggestionsRef} className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[20px] shadow-xl z-50 overflow-hidden">
                    {filteredClients.map((c, i) => (
                      <button key={i} onClick={() => selecteazaClient(c)}
                        className="w-full px-6 py-3 text-left hover:bg-amber-50 text-sm font-bold text-slate-700 transition-colors">
                        {c.title} — {c.phone}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">E-mail</label>
                <input type="email" placeholder="client@email.com"
                  className={`p-5 bg-slate-50 rounded-[25px] border-2 ${clientErrors.email ? "border-red-500" : "border-transparent focus:border-amber-500"} font-bold text-lg outline-none shadow-inner transition-all`}
                  value={clientData.email}
                  onChange={(e) => { setClientData({ ...clientData, email: e.target.value }); setClientErrors({ ...clientErrors, email: false }); }} />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Telefon</label>
                <input type="tel" placeholder="07xxxxxxxx"
                  className={`p-5 bg-slate-50 rounded-[25px] border-2 ${clientErrors.telefon ? "border-red-500" : "border-transparent focus:border-amber-500"} font-bold text-lg outline-none shadow-inner transition-all`}
                  value={clientData.telefon}
                  onChange={(e) => { setClientData({ ...clientData, telefon: e.target.value }); setClientErrors({ ...clientErrors, telefon: false }); }} />
              </div>

              <div className="md:col-span-2 flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Observații</label>
                <textarea placeholder="Detalii suplimentare..."
                  className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg h-16 resize-none outline-none shadow-inner"
                  value={clientData.detalii}
                  onChange={(e) => setClientData({ ...clientData, detalii: e.target.value })} />
              </div>
            </div>
          </div>

          {/* ── Separator ──────────────────────────────────────────────────── */}
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest bg-slate-50 px-4 py-2 rounded-full border border-slate-200">
              Servicii & Programare
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* ── MULTI SERVICE BOOKING ──────────────────────────────────────── */}
          {userId && (
            <MultiServiceBooking
              adminId={userId}
              servicii={(servicii as ServiceRow[]) || []}
              specialisti={(angajati as StaffRow[]) || []}
              adminWorkingHours={adminWorkingHours}
              adminManualBlocks={adminManualBlocks}
              clientData={clientData}
              validateClientData={validateClientData}
              onSuccess={() => setMultiSuccess(true)}
            />
          )}

          {/* ── Fișiere ────────────────────────────────────────────────────── */}
          <div className="mt-8 pt-8 border-t border-slate-100">
            <div className="flex-1 w-full bg-slate-100/50 p-4 rounded-[30px] border border-slate-200">
              <div className="flex items-center justify-between mb-3 px-2">
                <span className="text-[9px] font-black uppercase text-slate-500 italic">
                  Fișiere atașate ({documente.length})
                </span>
                <input type="file" id="doc-upload" className="hidden" multiple onChange={handleFileUpload} />
                <label htmlFor="doc-upload"
                  className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase italic cursor-pointer hover:bg-amber-600 transition-colors shadow-sm active:scale-95">
                  Adaugă Fișier +
                </label>
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                {documente.length === 0 && (
                  <p className="text-[9px] font-bold text-slate-300 italic uppercase px-2">Niciun fișier adăugat</p>
                )}
                {documente.map((doc) => (
                  <div key={doc.id} className="relative flex items-center gap-2 w-auto max-w-[180px] h-10 pr-8 pl-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <span className="text-[10px]">📄</span>
                    <span className="text-[8px] font-black text-slate-600 truncate uppercase italic">{doc.name}</span>
                    <button onClick={() => eliminaDoc(doc.id)}
                      className="absolute right-1.5 w-5 h-5 bg-red-50 text-red-500 rounded-lg flex items-center justify-center text-[10px] font-black hover:bg-red-500 hover:text-white transition-all active:scale-90">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Lista programări azi ──────────────────────────────────────────── */}
        <div className="mb-6">
          <h2 className="text-sm font-black uppercase italic tracking-tighter text-slate-400">Programări Azi</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-40">
          {programariAzi.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white rounded-[35px] border-2 border-dashed border-slate-100">
              <p className="text-[10px] font-black uppercase italic text-slate-300">Nicio programare pentru azi.</p>
            </div>
          ) : (
            programariAzi.map((p: any) => (
              <div key={p.id}
                className="relative bg-white p-5 rounded-[35px] shadow-sm border border-amber-200 ring-2 ring-amber-100 transition-all cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-95"
                onClick={() => setPopupProgramare(p)}>
                <button onClick={(e) => eliminaProgramare(p.id, e)}
                  className="absolute top-4 right-4 text-red-500 font-black text-[10px] z-10 hover:scale-125 transition-transform active:scale-90">✕</button>
                <div className="flex gap-3 items-center mb-4 pr-6">
                  <div className="w-12 h-12 rounded-[18px] bg-slate-50 overflow-hidden border-2 border-white shadow-inner flex items-center justify-center relative">
                    {p.file_url
                      ? <img src={p.file_url} className="w-full h-full object-cover" alt={p.title} />
                      : <Image src="/logo-chronos.png" alt="logo" fill sizes="48px" style={{ objectFit: "contain", padding: "4px" }} />}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <h4 className="font-black text-slate-800 uppercase text-[11px] truncate italic leading-tight">{p.title}</h4>
                    <p className="text-[9px] font-black text-amber-600 uppercase italic">
                      {p.time} • {(angajati as StaffRow[] | undefined)?.find((a) => a.id === p.angajat_id)?.name || "General"}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 italic uppercase">{p.nume_serviciu || "Procedură"}</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl">
                  <p className="text-[8px] font-black text-slate-400 uppercase italic truncate">{p.details || "Fără detalii"}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Popup detalii programare ─────────────────────────────────────────── */}
      {popupProgramare && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
          onClick={() => setPopupProgramare(null)}>
          <div ref={popupRef}
            className="bg-white w-full max-w-lg rounded-[50px] overflow-hidden shadow-2xl border border-slate-100 relative"
            onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPopupProgramare(null)}
              className="absolute top-8 right-8 w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all z-10 active:scale-90">✕</button>
            <div className="h-32 bg-slate-900 relative">
              <div className="absolute -bottom-12 left-10 w-24 h-24 rounded-[30px] bg-white p-2 shadow-xl border border-slate-50">
                <div className="w-full h-full rounded-[22px] bg-slate-50 overflow-hidden relative flex items-center justify-center">
                  {popupProgramare.file_url
                    ? <img src={popupProgramare.file_url} className="w-full h-full object-cover" alt={popupProgramare.title} />
                    : <Image src="/logo-chronos.png" alt="logo" fill sizes="80px" style={{ objectFit: "contain", padding: "8px" }} />}
                </div>
              </div>
            </div>
            <div className="pt-16 p-10">
              <div className="mb-6">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">{popupProgramare.title}</h3>
                <p className="text-amber-600 font-black text-[10px] uppercase italic mt-1 tracking-widest">
                  {popupProgramare.date} la ora {popupProgramare.time}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { label: "Telefon",    value: popupProgramare.phone || "N/A" },
                  { label: "Email",      value: popupProgramare.email || "-" },
                  { label: "Specialist", value: (angajati as StaffRow[] | undefined)?.find((a) => a.id === popupProgramare.angajat_id)?.name || "General" },
                  { label: "Serviciu",   value: popupProgramare.nume_serviciu || "Procedură" },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">{item.label}</p>
                    <p className="font-black text-xs text-slate-700 truncate">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-slate-900 p-6 rounded-[35px] text-white">
                <p className="text-[8px] font-black text-amber-500 uppercase italic mb-2">Motivul vizitei</p>
                <p className="text-xs font-medium italic opacity-90">{popupProgramare.details || "Fără observații."}</p>
              </div>
              {popupProgramare.documente?.length > 0 && (
                <div className="mt-6 bg-slate-50 p-6 rounded-[35px] border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase italic mb-3">Fișiere atașate</p>
                  <div className="grid grid-cols-1 gap-2">
                    {popupProgramare.documente.map((doc: any, idx: number) => (
                      <a key={idx} href={doc.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100 hover:border-amber-500 transition-all group">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className="text-lg">📄</span>
                          <p className="text-[10px] font-black text-slate-700 truncate italic uppercase">{doc.name || "Document"}</p>
                        </div>
                        <span className="text-[10px] font-black text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity italic">VEZI</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ProgramariPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-24 h-24 bg-slate-200 rounded-full mb-4"></div>
            <div className="h-4 w-48 bg-slate-200 rounded"></div>
          </div>
        </div>
      }>
        <ProgramariContent />
      </Suspense>
    </QueryClientProvider>
  );
}