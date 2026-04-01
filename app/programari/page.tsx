"use client";

import { useState, useEffect, Suspense, useRef, useMemo, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";

type DocumentAttachment = { id: number; name: string; url: string };

type StaffRow = { id: string; name: string; services: string[]; };
type ServiceRow = { id: string; name: string; price: number; duration: number; };

type Programare = {
  id: any;
  nume: string;
  email: string;
  data: string;
  ora: string;
  motiv: string;
  telefon: string;
  poza: string | null;
  reminderMinutes: number;
  reminderSound: boolean;
  reminderVibration: boolean;
  reminderVolume: number;
  sendToClient: boolean;
  documente: DocumentAttachment[];
  angajat_id: string;
  serviciu_id: string;
  created_by_client?: boolean;
};

const LIMITE_ABONAMENTE: Record<string, number> = {
  "chronos free": 30,
  "start (gratuit)": 30,
  "chronos pro": 150,
  "chronos elite": 500,
  "chronos team": 999999
};

function ProgramariContent() {
  const [programari, setProgramari] = useState<Programare[]>([]);
  const [loadingDB, setLoadingDB] = useState(true);
  const [popupProgramare, setPopupProgramare] = useState<Programare | null>(null);
  const [userPlan, setUserPlan] = useState<string>("chronos free");
  const [countLunaCurenta, setCountLunaCurenta] = useState(0);
  // FIX: isTrialing și daysLeft sunt setate din trial_started_at din profiles
  const [isTrialing, setIsTrialing] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  const [angajati, setAngajati] = useState<StaffRow[]>([]);
  const [servicii, setServicii] = useState<ServiceRow[]>([]);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerStep, setPickerStep] = useState<"hours" | "minutes">("hours");
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);

  const [formular, setFormular] = useState<Programare>({
    id: 0,
    nume: "",
    email: "",
    data: new Date().toISOString().split('T')[0],
    ora: "09:00",
    motiv: "",
    telefon: "",
    poza: null,
    reminderMinutes: 10,
    reminderSound: true,
    reminderVibration: true,
    reminderVolume: 70,
    sendToClient: true,
    documente: [],
    angajat_id: "",
    serviciu_id: ""
  });

  const limitaCurenta = isTrialing ? 999999 : (LIMITE_ABONAMENTE[userPlan] || 30);
  const esteLimitat = countLunaCurenta >= limitaCurenta;

  const fetchProgramari = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (data) {
      setProgramari(data.map((item: any) => ({
        id: item.id,
        nume: item.title || "",
        email: item.email || "",
        data: item.date || "",
        ora: item.time || "",
        motiv: item.details || "",
        telefon: item.phone || "",
        poza: item.file_url || null,
        reminderMinutes: item.notifications?.minutes || 10,
        reminderSound: item.notifications?.sound ?? true,
        reminderVibration: item.notifications?.vibration ?? true,
        reminderVolume: item.notifications?.volume || 70,
        sendToClient: item.notifications?.sendToClient ?? true,
        documente: item.notifications?.docs || [],
        angajat_id: item.angajat_id || "",
        serviciu_id: item.serviciu_id || "",
        created_by_client: item.is_client_booking ?? false
      })));
    }
  }, []);

  // FIX MAJOR: fetchResurse folosește trial_started_at din profiles
  // în loc de created_at al userului — consistență cu celelalte pagini
  const fetchResurse = useCallback(async (userId: string) => {
    if (!supabase) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('plan_type, trial_started_at')
      .eq('id', userId)
      .single();

    if (profileData) {
      let plan = profileData.plan_type?.toLowerCase() || "chronos free";

      // FIX: detecție trial din trial_started_at, nu din user.created_at
      if (profileData.trial_started_at) {
        const start = new Date(profileData.trial_started_at).getTime();
        const acum = new Date().getTime();
        const zeceZileInMs = 10 * 24 * 60 * 60 * 1000;
        if (acum - start < zeceZileInMs) {
          const daysRemaining = Math.ceil((start + zeceZileInMs - acum) / (1000 * 60 * 60 * 24));
          setIsTrialing(true);
          setDaysLeft(daysRemaining);
          plan = "chronos team";
        } else {
          setIsTrialing(false);
          setDaysLeft(null);
        }
      } else {
        setIsTrialing(false);
        setDaysLeft(null);
      }

      setUserPlan(plan);
    }

    // FIX: filtrăm după user_id
    const { data: staffData } = await supabase
      .from('staff')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const { data: servicesData } = await supabase
      .from('services')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (staffData) setAngajati(staffData);
    if (servicesData) setServicii(servicesData);
  }, []);

  const checkSubscriptionLimit = useCallback(async (userId: string) => {
    if (!supabase) return;
    const inceputLuna = new Date();
    inceputLuna.setDate(1);
    const { count } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('date', inceputLuna.toISOString().split('T')[0]);
    setCountLunaCurenta(count || 0);
  }, []);

  const fetchInitialData = useCallback(async () => {
    if (!supabase) return;
    setLoadingDB(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = "/login"; return; }
      const user = session.user;

      // FIX: eliminat calculul cu user.created_at — trial-ul vine din fetchResurse
      await Promise.all([
        fetchProgramari(user.id),
        fetchResurse(user.id),
        checkSubscriptionLimit(user.id)
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDB(false);
    }
  }, [fetchProgramari, fetchResurse, checkSubscriptionLimit]);

  // FIX: filtrăm serviciile disponibile în funcție de specialistul ales
  const serviciiFiltrate = useMemo(() => {
    if (!formular.angajat_id) return servicii;
    const specialist = angajati.find(a => a.id === formular.angajat_id);
    if (!specialist?.services?.length) return servicii;
    return servicii.filter(s => specialist.services.includes(s.id));
  }, [formular.angajat_id, servicii, angajati]);

  // FIX: filtrăm specialiștii disponibili în funcție de serviciul ales
  const angajatiFiltrati = useMemo(() => {
    if (!formular.serviciu_id) return angajati;
    return angajati.filter(a => a.services?.includes(formular.serviciu_id));
  }, [formular.serviciu_id, angajati]);

  useEffect(() => {
    const hh = selectedHour.toString().padStart(2, "0");
    const mm = selectedMinute.toString().padStart(2, "0");
    setFormular(prev => ({ ...prev, ora: `${hh}:${mm}` }));
  }, [selectedHour, selectedMinute]);

  useEffect(() => {
    if (!supabase || !supabase.auth) return;
    fetchInitialData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setProgramari([]);
        setAngajati([]);
        setServicii([]);
        setCountLunaCurenta(0);
      }
    });

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (suggestionsRef.current && !suggestionsRef.current.contains(target)) {
        setShowSuggestions(false);
      }
      if (pickerRef.current && !pickerRef.current.contains(target)) {
        setShowPicker(false);
        setPickerStep("hours");
      }
      if (popupRef.current && !popupRef.current.contains(target)) {
        setPopupProgramare(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (subscription) subscription.unsubscribe();
    };
  }, [fetchInitialData]);

  const handleNumeChange = (val: string) => {
    setFormular({ ...formular, nume: val });
    if (val.length > 1) {
      const unique = Array.from(new Map(programari.map(item => [item.nume.toLowerCase(), item])).values());
      const filtered = unique.filter(c => c.nume.toLowerCase().includes(val.toLowerCase())).slice(0, 5);
      setFilteredClients(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selecteazaClient = (client: any) => {
    setFormular({ ...formular, nume: client.nume, email: client.email || "", telefon: client.telefon || "", poza: client.poza || null });
    setShowSuggestions(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          setFormular(prev => ({
            ...prev,
            documente: [...prev.documente, { id: Date.now() + Math.random(), name: file.name, url: reader.result as string }]
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const eliminaDocument = (id: number) => setFormular(prev => ({ ...prev, documente: prev.documente.filter(d => d.id !== id) }));

  const salveazaInCloud = async () => {
    if (!supabase) return;
    if (esteLimitat) { alert("Atenționare: Limita lunară de programări a fost atinsă!"); return; }
    if (!formular.nume || !formular.telefon) { alert("Atenționare: Completează Numele și Telefonul."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      title: formular.nume,
      email: formular.email,
      date: formular.data,
      time: formular.ora,
      details: formular.motiv,
      phone: formular.telefon,
      file_url: formular.poza,
      is_client_booking: false,
      angajat_id: formular.angajat_id || null,
      serviciu_id: formular.serviciu_id || null,
      // FIX: salvăm și name-urile pentru a putea face matching în calendar
      expert: angajati.find(a => a.id === formular.angajat_id)?.name || null,
      notifications: {
        sound: formular.reminderSound,
        vibration: formular.reminderVibration,
        sendToClient: formular.sendToClient,
        docs: formular.documente,
        minutes: formular.reminderMinutes,
        volume: formular.reminderVolume,
        angajat_id: formular.angajat_id,
        serviciu_id: formular.serviciu_id,
      }
    };

    const { error } = await supabase.from('appointments').insert([payload]);
    if (!error) {
      window.location.reload();
    } else {
      alert("Eroare: " + error.message);
    }
  };

  const eliminaProgramare = async (id: any, e: React.MouseEvent) => {
    if (!supabase) return;
    e.stopPropagation();
    if (confirm("Ștergi programarea?")) {
      await supabase.from('appointments').delete().eq('id', id);
      setProgramari(prev => prev.filter(p => p.id !== id));
      setCountLunaCurenta(prev => Math.max(0, prev - 1));
    }
  };

  const azi = new Date().toISOString().split('T')[0];
  const programariAzi = programari.filter(p => p.data === azi);
  const totalAzi = programariAzi.length;
  const onlineAzi = programariAzi.filter(p => p.created_by_client).length;

  if (loadingDB) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <Image src="/logo-chronos.png" alt="Chronos" width={100} height={100} className="animate-pulse mb-4" />
      <p className="text-[10px] font-black uppercase italic text-slate-400 tracking-widest">Se încarcă datele...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-12 text-slate-900 font-sans">
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="max-w-6xl mx-auto">
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

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
              Gestiune <span className="text-amber-600">Programări</span>
            </h1>
            <p className="text-[10px] font-black uppercase italic text-slate-400 mt-2">
              Plan: <span className="text-amber-600">{userPlan.toUpperCase()}</span> • {countLunaCurenta} / {isTrialing ? '∞' : limitaCurenta} luna aceasta
            </p>
          </div>
          <div className="flex flex-col gap-2 self-start md:self-auto items-end">
            <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-amber-100 flex items-center gap-3">
              <span className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></span>
              <p className="text-[11px] font-black uppercase italic text-slate-600">
                Azi: <span className="text-amber-600">{totalAzi} Total</span> • <span className="text-blue-500">{onlineAzi} Online</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/programari/calendar"
                title="Deschide calendarul complet"
                className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3 hover:bg-slate-50 transition-all active:scale-95 group"
              >
                <span className="text-xs">📅</span>
                <p className="text-[11px] font-black uppercase italic text-slate-600">Calendar</p>
              </Link>
            </div>
          </div>
        </div>

        <section className="bg-white rounded-[50px] p-8 md:p-14 shadow-2xl border border-slate-100 mb-16 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-3 flex flex-col items-center">
              <div className="w-44 h-44 bg-slate-50 rounded-[45px] overflow-hidden border-8 border-white shadow-xl relative group flex items-center justify-center mb-6">
                {formular.poza ? (
                  <img src={formular.poza} className="w-full h-full object-cover" alt="Client" />
                ) : (
                  <div className="w-full h-full relative flex items-center justify-center bg-slate-50">
                    <Image src="/logo-chronos.png" alt="Chronos" fill sizes="176px" style={{ objectFit: 'contain', padding: '16px' }} />
                  </div>
                )}
                <input type="file" id="f-pick" className="hidden" accept="image/*" onChange={e => {
                  if (e.target.files?.[0]) {
                    const r = new FileReader();
                    r.onload = () => setFormular({ ...formular, poza: r.result as string });
                    r.readAsDataURL(e.target.files[0]);
                  }
                }} />
                <label htmlFor="f-pick" title="Încarcă poza client" className="absolute inset-0 cursor-pointer z-10"></label>
              </div>
              <p className="text-[10px] font-black uppercase italic text-slate-400">Poza Profil Client</p>
            </div>

            <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 flex flex-col gap-2 relative" ref={suggestionsRef}>
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Nume Client</label>
                <input
                  type="text"
                  placeholder="Nume..."
                  className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner"
                  value={formular.nume}
                  onChange={e => handleNumeChange(e.target.value)}
                />
                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 z-[110] bg-white mt-2 rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                    {filteredClients.map((c, idx) => (
                      <button key={idx} onClick={() => selecteazaClient(c)} className="w-full flex items-center gap-4 p-4 hover:bg-amber-50 border-b border-slate-50 last:border-0 text-left transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center relative">
                          {c.poza ? <img src={c.poza} className="w-full h-full object-cover" /> : <Image src="/logo-chronos.png" alt="logo" fill sizes="40px" style={{ objectFit: 'contain', padding: '4px' }} />}
                        </div>
                        <div>
                          <p className="font-black text-xs uppercase italic">{c.nume}</p>
                          <p className="text-[9px] font-bold text-slate-400">{c.telefon}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">E-mail</label>
                <input
                  type="email"
                  placeholder="client@email.com"
                  className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner"
                  value={formular.email}
                  onChange={e => setFormular({ ...formular, email: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Telefon</label>
                <input
                  type="tel"
                  placeholder="07xxxxxxxx"
                  className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner"
                  value={formular.telefon}
                  onChange={e => setFormular({ ...formular, telefon: e.target.value })}
                />
              </div>

              {/* FIX: Specialist cu filtrare după serviciu selectat */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">
                  Alege Specialist
                  {formular.serviciu_id && <span className="text-amber-500 ml-1">(filtrat după serviciu)</span>}
                </label>
                <select
                  className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner cursor-pointer"
                  value={formular.angajat_id}
                  onChange={e => setFormular({ ...formular, angajat_id: e.target.value, serviciu_id: "" })}
                >
                  <option value="">Alege Specialist...</option>
                  {angajatiFiltrati.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              {/* FIX: Serviciu cu filtrare după specialist selectat */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">
                  Alege Serviciu
                  {formular.angajat_id && <span className="text-amber-500 ml-1">(filtrat după specialist)</span>}
                </label>
                <select
                  className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner cursor-pointer"
                  value={formular.serviciu_id}
                  onChange={e => setFormular({ ...formular, serviciu_id: e.target.value })}
                >
                  <option value="">Alege Serviciu...</option>
                  {serviciiFiltrate.map(s => <option key={s.id} value={s.id}>{s.name} — {s.price} RON</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Data</label>
                <input
                  type="date"
                  className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner"
                  value={formular.data}
                  onChange={e => setFormular({ ...formular, data: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Ora</label>
                <button
                  type="button"
                  title="Alege ora programării"
                  onClick={() => setShowPicker(true)}
                  className="w-full p-5 bg-slate-50 rounded-[25px] font-bold text-lg shadow-inner text-left flex justify-between items-center border-2 border-transparent hover:border-amber-500 transition-all active:scale-95"
                >
                  {formular.ora} <span className="text-amber-600 text-[10px]">🕒</span>
                </button>
              </div>

              <div className="md:col-span-2 flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Observații</label>
                <textarea
                  placeholder="De ce vine clientul?"
                  className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg h-16 resize-none outline-none shadow-inner"
                  value={formular.motiv}
                  onChange={e => setFormular({ ...formular, motiv: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex-1 w-full bg-slate-100/50 p-4 rounded-[30px] border border-slate-200">
              <div className="flex items-center justify-between mb-3 px-2">
                <span className="text-[9px] font-black uppercase text-slate-500 italic">Fișiere atașate</span>
                <input type="file" id="doc-upload" className="hidden" multiple onChange={handleFileUpload} />
                <label
                  htmlFor="doc-upload"
                  title="Adaugă documente sau imagini"
                  className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase italic cursor-pointer hover:bg-amber-600 transition-colors shadow-sm active:scale-95"
                >
                  Adaugă Fișier +
                </label>
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                {formular.documente.map(doc => (
                  <div key={doc.id} className="relative flex items-center gap-2 w-auto max-w-[180px] h-10 pr-8 pl-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <div className="w-6 h-6 rounded-md bg-slate-50 flex-shrink-0 overflow-hidden">
                      {doc.url.startsWith("data:image") ? (
                        <img src={doc.url} className="w-full h-full object-cover" alt="prev" />
                      ) : (
                        <span className="flex items-center justify-center h-full text-[10px]">📄</span>
                      )}
                    </div>
                    <span className="text-[8px] font-black text-slate-600 truncate uppercase italic">{doc.name}</span>
                    <button
                      onClick={() => eliminaDocument(doc.id)}
                      title="Șterge fișier"
                      className="absolute right-1.5 w-5 h-5 bg-red-50 text-red-500 rounded-lg flex items-center justify-center text-[10px] font-black hover:bg-red-500 hover:text-white transition-all active:scale-90"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={salveazaInCloud}
              disabled={esteLimitat}
              title={esteLimitat ? "Limita de programări a fost atinsă" : "Salvează programarea în sistem"}
              className={`w-full lg:w-[280px] h-[85px] rounded-[30px] font-black uppercase shadow-xl transition-all italic flex flex-col items-center justify-center gap-0.5 group active:scale-95 ${esteLimitat ? 'bg-slate-300 cursor-not-allowed text-slate-500 opacity-60' : 'bg-amber-600 text-white hover:bg-slate-900'}`}
            >
              <span className="text-[10px] opacity-70">{esteLimitat ? "LIMITA ATINSĂ" : "✓ FINALIZARE"}</span>
              <span className="text-sm tracking-tighter">{esteLimitat ? "Actualizează Planul" : "Salvează Programarea"}</span>
            </button>
          </div>
        </section>

        <div className="mb-6">
          <h2 className="text-sm font-black uppercase italic tracking-tighter text-slate-400">Programări Azi</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-40">
          {programariAzi.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white rounded-[35px] border-2 border-dashed border-slate-100">
              <p className="text-[10px] font-black uppercase italic text-slate-300">Nicio programare pentru azi.</p>
            </div>
          ) : (
            programariAzi.map(p => {
              const spec = angajati.find(a => a.id === p.angajat_id);
              const serv = servicii.find(s => s.id === p.serviciu_id);
              return (
                <div
                  key={p.id}
                  title="Click pentru detalii"
                  className="relative bg-white p-5 rounded-[35px] shadow-sm border border-amber-200 ring-2 ring-amber-100 transition-all cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-95"
                  onClick={() => setPopupProgramare(p)}
                >
                  <button
                    onClick={e => { e.stopPropagation(); eliminaProgramare(p.id, e); }}
                    title="Șterge programarea"
                    className="absolute top-4 right-4 text-red-500 font-black text-[10px] z-10 hover:scale-125 transition-transform active:scale-90"
                  >
                    ✕
                  </button>
                  <div className="flex gap-3 items-center mb-4 pr-6">
                    <div className="w-12 h-12 rounded-[18px] bg-slate-50 overflow-hidden border-2 border-white shadow-inner flex items-center justify-center relative">
                      {p.poza ? (
                        <img src={p.poza} className="w-full h-full object-cover" alt="client" />
                      ) : (
                        <Image src="/logo-chronos.png" alt="logo" fill sizes="48px" style={{ objectFit: 'contain', padding: '4px' }} />
                      )}
                    </div>
                    <div className="overflow-hidden flex-1">
                      <h4 className="font-black text-slate-800 uppercase text-[11px] truncate italic leading-tight">{p.nume}</h4>
                      <p className="text-[9px] font-black text-amber-600 uppercase italic">{p.ora} • {spec?.name || 'General'}</p>
                      <p className="text-[9px] font-bold text-slate-400 italic uppercase">{serv?.name || 'Procedură'}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <p className="text-[8px] font-black text-slate-400 uppercase italic truncate">{p.motiv || "Fără detalii"}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showPicker && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6"
          onClick={() => { setShowPicker(false); setPickerStep("hours"); }}
        >
          <div
            ref={pickerRef}
            className="bg-white w-full max-w-[420px] rounded-[45px] p-8 relative shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in duration-200"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => { setShowPicker(false); setPickerStep("hours"); }}
              className="absolute top-6 right-6 text-slate-300 hover:text-red-500 text-xl font-black transition-colors"
              title="Închide"
            >✕</button>
            <div className="flex flex-col gap-1 mb-8">
              <p className="text-[9px] font-black text-amber-500 tracking-[0.3em] uppercase">
                {pickerStep === "hours" ? "Pasul 1: Alege Ora" : "Pasul 2: Alege Minutele"}
              </p>
              <h2 className="font-black uppercase italic text-2xl text-slate-900 tracking-tighter">Selectează Timpul</h2>
            </div>
            <div className="bg-slate-900 mb-6 p-5 rounded-[30px] flex items-center justify-center gap-4 border-b-4 border-amber-500 shadow-inner">
              <span className={`text-4xl font-black ${pickerStep === "hours" ? "text-amber-500 animate-pulse" : "text-white"}`}>
                {selectedHour.toString().padStart(2, "0")}
              </span>
              <span className="text-amber-500 font-black text-3xl">:</span>
              <span className={`text-4xl font-black ${pickerStep === "minutes" ? "text-amber-500 animate-pulse" : "text-white"}`}>
                {selectedMinute.toString().padStart(2, "0")}
              </span>
            </div>
            <div className="flex-1 bg-slate-50 p-6 rounded-[35px] border border-slate-100">
              {pickerStep === "hours" ? (
                <div className="grid grid-cols-4 gap-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setSelectedHour(i); setPickerStep("minutes"); }}
                      className={`aspect-square rounded-[20px] font-black text-base flex items-center justify-center transition-all ${selectedHour === i ? "bg-amber-500 text-slate-900 shadow-lg scale-105" : "text-slate-900 bg-white hover:border-amber-500 border-2 border-transparent active:scale-95"}`}
                    >
                      {i.toString().padStart(2, "0")}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {[0, 15, 30, 45].map(m => (
                    <button
                      key={m}
                      onClick={() => { setSelectedMinute(m); setShowPicker(false); setPickerStep("hours"); }}
                      className={`w-full py-6 rounded-[25px] font-black text-2xl transition-all border-2 flex items-center justify-center gap-3 ${selectedMinute === m ? "bg-slate-900 text-amber-500 border-amber-500 shadow-xl" : "bg-white text-slate-400 border-slate-100 hover:text-slate-900 active:scale-95"}`}
                    >
                      <span className="text-[10px] opacity-40 uppercase font-black">Minutul</span>
                      {m.toString().padStart(2, "0")}
                    </button>
                  ))}
                  <button
                    onClick={() => setPickerStep("hours")}
                    className="mt-2 py-2 text-slate-400 font-black uppercase italic text-[10px] hover:text-amber-600 transition-colors"
                  >
                    ← Înapoi la ore
                  </button>
                </div>
              )}
            </div>
            <p className="mt-6 text-center text-[9px] font-black uppercase tracking-widest text-slate-300 italic">Click afară pentru a anula</p>
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        {popupProgramare && (
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
            onClick={() => setPopupProgramare(null)}
          >
            <div
              ref={popupRef}
              className="bg-white w-full max-w-lg rounded-[50px] overflow-hidden shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in duration-200"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setPopupProgramare(null)}
                title="Închide detaliile"
                className="absolute top-8 right-8 w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all z-10 active:scale-90"
              >✕</button>
              <div className="h-32 bg-slate-900 relative">
                <div className="absolute -bottom-12 left-10 w-24 h-24 rounded-[30px] bg-white p-2 shadow-xl border border-slate-50">
                  <div className="w-full h-full rounded-[22px] bg-slate-50 overflow-hidden relative flex items-center justify-center">
                    {popupProgramare.poza ? (
                      <img src={popupProgramare.poza} className="w-full h-full object-cover" alt="client" />
                    ) : (
                      <Image src="/logo-chronos.png" alt="logo" fill sizes="80px" style={{ objectFit: 'contain', padding: '8px' }} />
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-16 p-10">
                <div className="mb-6">
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">{popupProgramare.nume}</h3>
                  <p className="text-amber-600 font-black text-[10px] uppercase italic mt-1 tracking-widest">{popupProgramare.data} la ora {popupProgramare.ora}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Telefon</p>
                    <p className="font-black text-xs text-slate-700">{popupProgramare.telefon}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Email</p>
                    <p className="font-black text-xs text-slate-700 truncate">{popupProgramare.email || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Specialist</p>
                    <p className="font-black text-xs text-slate-700">{angajati.find(a => a.id === popupProgramare.angajat_id)?.name || 'General'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Serviciu</p>
                    <p className="font-black text-xs text-slate-700">{servicii.find(s => s.id === popupProgramare.serviciu_id)?.name || 'Procedură'}</p>
                  </div>
                </div>
                <div className="bg-slate-900 p-6 rounded-[35px] text-white">
                  <p className="text-[8px] font-black text-amber-500 uppercase italic mb-2">Motivul vizitei</p>
                  <p className="text-xs font-medium italic opacity-90">{popupProgramare.motiv || "Fără observații."}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Suspense>
    </main>
  );
}

export default function ProgramariPage() {
  return (
    <Suspense fallback={null}>
      <ProgramariContent />
    </Suspense>
  );
}