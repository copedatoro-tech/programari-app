"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";

// --- TIPURI ---
type DocumentAttachment = { id: number; name: string; url: string; };
type Angajat = { id: string; nume: string; specializare: string; culoare: string; };
type Serviciu = { id: string; nume: string; durata: string; pret: string; };

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
  "start (gratuit)": 50,
  "chronos pro": 200,
  "chronos elite": 1000,
  "chronos team": 999999 
};

function ProgramariContent() {
  const [programari, setProgramari] = useState<Programare[]>([]);
  const [loadingDB, setLoadingDB] = useState(true);
  const [popupProgramare, setPopupProgramare] = useState<Programare | null>(null);
  const [userPlan, setUserPlan] = useState<string>("start (gratuit)");
  const [countLunaCurenta, setCountLunaCurenta] = useState(0);
  const [isTrialing, setIsTrialing] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  
  const [angajati, setAngajati] = useState<Angajat[]>([]);
  const [servicii, setServicii] = useState<Serviciu[]>([]);
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const hourPickerRef = useRef<HTMLDivElement>(null);

  const [showHourPicker, setShowHourPicker] = useState(false);
  const [tempHour, setTempHour] = useState("09");
  const [tempMin, setTempMin] = useState("00");

  const [formular, setFormular] = useState<Programare>({
    id: 0, nume: "", email: "", data: new Date().toISOString().split('T')[0], ora: "09:00", motiv: "", telefon: "", poza: null,
    reminderMinutes: 10, reminderSound: true, reminderVibration: true,
    reminderVolume: 70, sendToClient: true, documente: [],
    angajat_id: "",
    serviciu_id: "" 
  });

  const limitaCurenta = isTrialing ? 1000 : (LIMITE_ABONAMENTE[userPlan] || 50);
  const esteLimitat = countLunaCurenta >= limitaCurenta;

  const resetAllData = () => {
    setProgramari([]);
    setAngajati([]);
    setServicii([]);
    setCountLunaCurenta(0);
  };

  useEffect(() => {
    setFormular(prev => ({ ...prev, ora: `${tempHour}:${tempMin}` }));
  }, [tempHour, tempMin]);

  useEffect(() => {
    if (!supabase || !supabase.auth) return;

    fetchInitialData();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") resetAllData();
    });

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (suggestionsRef.current && !suggestionsRef.current.contains(target)) setShowSuggestions(false);
      if (popupProgramare && popupRef.current && !popupRef.current.contains(target)) setPopupProgramare(null);
      if (showHourPicker && hourPickerRef.current && !hourPickerRef.current.contains(target)) setShowHourPicker(false);
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (subscription) subscription.unsubscribe();
    };
  }, [popupProgramare, showHourPicker]);

  async function fetchInitialData() {
    if (!supabase) return;
    setLoadingDB(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/login";
        return;
      }

      const user = session.user;
      const createdDate = new Date(user.created_at);
      const today = new Date();
      const diffDays = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 3600 * 24));
      const remaining = 10 - diffDays;

      if (remaining > 0) {
        setIsTrialing(true);
        setDaysLeft(remaining);
      }

      await Promise.all([
        fetchProgramari(user.id),
        fetchResurseProfile(user.id),
        checkSubscriptionLimit(user.id)
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDB(false);
    }
  }

  async function fetchResurseProfile(userId: string) {
    if (!supabase) return;
    const { data } = await supabase.from('profiles').select('services, staff, plan_type').eq('id', userId).single();
    if (data) {
      setUserPlan(data.plan_type?.toLowerCase() || "start (gratuit)");
      const parseData = (val: any) => {
        if (!val) return [];
        let curat = typeof val === 'string' ? JSON.parse(val) : val;
        return Array.isArray(curat) ? curat : [];
      };
      setServicii(parseData(data.services));
      setAngajati(parseData(data.staff));
    }
  }

  async function checkSubscriptionLimit(userId: string) {
    if (!supabase) return;
    const inceputLuna = new Date();
    inceputLuna.setDate(1);
    const inceputLunaISO = inceputLuna.toISOString().split('T')[0];
    const { count } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('date', inceputLunaISO);
    setCountLunaCurenta(count || 0);
  }

  async function fetchProgramari(userId: string) {
    if (!supabase) return;
    const { data } = await supabase.from('appointments').select('*').eq('user_id', userId).order('date', { ascending: false });
    if (data) {
      setProgramari(data.map((item: any) => ({
        id: item.id,
        nume: item.title || item.nume || "",
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
        angajat_id: item.notifications?.angajat_id || "",
        serviciu_id: item.notifications?.serviciu_id || "",
        created_by_client: item.is_client_booking ?? false 
      })));
    }
  }

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
    setFormular({
      ...formular,
      nume: client.nume,
      email: client.email || "", 
      telefon: client.telefon || "",
      poza: client.poza || null
    });
    setShowSuggestions(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      filesArray.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          const newDoc = { id: Date.now() + Math.random(), name: file.name, url: reader.result as string };
          setFormular(prev => ({ ...prev, documente: [...prev.documente, newDoc] }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const eliminaDocument = (id: number) => {
    setFormular(prev => ({ ...prev, documente: prev.documente.filter(doc => doc.id !== id) }));
  };

  const salveazaInCloud = async () => {
    if (!supabase) return;
    if (esteLimitat) {
      alert(`⚠️ Limita atinsă! Planul tău permite doar ${limitaCurenta} programări pe lună.`);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    if (!formular.nume || !formular.telefon) {
      alert("⚠️ Numele și Telefonul sunt obligatorii!");
      return;
    }

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
      notifications: { 
        sound: formular.reminderSound, 
        vibration: formular.reminderVibration, 
        sendToClient: formular.sendToClient, 
        docs: formular.documente,
        minutes: formular.reminderMinutes,
        volume: formular.reminderVolume,
        angajat_id: formular.angajat_id,
        serviciu_id: formular.serviciu_id
      }
    };

    const { error } = await supabase.from('appointments').insert([payload]);
    if (!error) window.location.reload();
  };

  const eliminaProgramare = async (id: any, e: React.MouseEvent) => {
    if (!supabase) return;
    e.stopPropagation();
    if (confirm("Ștergi programarea?")) {
      await supabase.from('appointments').delete().eq('id', id);
      setProgramari(prev => prev.filter(p => p.id !== id));
      setCountLunaCurenta(prev => prev - 1);
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
      <div className="max-w-6xl mx-auto">
        
        {isTrialing && (
          <div className="mb-10 bg-slate-900 border-l-[10px] border-amber-500 p-6 rounded-[35px] shadow-xl flex flex-col md:flex-row items-center justify-between overflow-hidden relative border border-white/5">
            <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/5 rounded-full -mr-32 -mt-32 blur-[80px]"></div>
            <div className="flex items-center gap-5 relative z-10">
              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg animate-pulse">🎁</div>
              <div>
                <h4 className="text-white font-black uppercase italic tracking-tighter text-xl">Trial Premium Activ</h4>
                <p className="text-amber-500 text-[9px] font-black uppercase tracking-[0.3em] mt-1">Acces nelimitat timp de {daysLeft} zile</p>
              </div>
            </div>
            <div className="mt-4 md:mt-0 px-6 py-2 bg-white/5 rounded-full border border-white/10 relative z-10">
              <p className="text-[10px] font-black text-slate-300 uppercase italic">
                <span className="text-white text-lg mr-2 tabular-nums">{daysLeft}</span> zile rămase
              </p>
            </div>
          </div>
        )}

        {/* HEADER UNIFORMIZAT */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
                <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
                    Gestiune <span className="text-amber-600">Programări</span>
                </h1>
                <p className="text-[10px] font-black uppercase italic text-slate-400 mt-2">
                    Plan actual: <span className="text-amber-600 font-bold">{userPlan.toUpperCase()}</span> • {countLunaCurenta} / {limitaCurenta} luna aceasta
                </p>
            </div>
            <div className="flex flex-col gap-2 self-start md:self-auto items-end">
                <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-amber-100 flex items-center gap-3">
                    <span className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></span>
                    <p className="text-[11px] font-black uppercase italic text-slate-600">
                        Activitate Azi: <span className="text-amber-600">{totalAzi} Total</span> • <span className="text-blue-500">{onlineAzi} Online</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link 
                      href="/programari/calendar" 
                      className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3 hover:bg-slate-50 transition-all group"
                      title="Vezi Calendarul complet al programărilor pentru o vizualizare de ansamblu"
                    >
                        <span className="text-xs group-hover:scale-110 transition-transform">📅</span>
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
                        <Image src="/logo-chronos.png" alt="Chronos" fill sizes="(max-width: 176px) 100vw, 176px" style={{ objectFit: 'contain', padding: '16px' }} />
                    </div>
                  )}
                  <input type="file" id="f-pick" className="hidden" accept="image/*" onChange={(e) => {
                    if(e.target.files?.[0]) {
                        const r = new FileReader();
                        r.onload = () => setFormular({...formular, poza: r.result as string});
                        r.readAsDataURL(e.target.files[0]);
                    }
                  }} />
                  <label htmlFor="f-pick" className="absolute inset-0 cursor-pointer z-10" title="Încarcă o poză pentru profilul clientului"></label>
                </div>
                <div className="text-center">
                    <p className="text-[10px] font-black uppercase italic text-slate-400">Poza Profil Client</p>
                </div>
            </div>

            <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 flex flex-col gap-2 relative" ref={suggestionsRef}>
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Nume Client</label>
                <input type="text" placeholder="Nume..." className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner" value={formular.nume} onChange={(e) => handleNumeChange(e.target.value)} />
                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 z-[110] bg-white mt-2 rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                    {filteredClients.map((c, idx) => (
                      <button key={idx} onClick={() => selecteazaClient(c)} className="w-full flex items-center gap-4 p-4 hover:bg-amber-50 border-b border-slate-50 last:border-0 text-left transition-colors" title={`Selectează clientul existent ${c.nume}`}>
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
                <input type="email" placeholder="client@email.com" className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner" value={formular.email} onChange={(e)=>setFormular({...formular, email: e.target.value})} />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Telefon</label>
                <input type="tel" placeholder="07xxxxxxxx" className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner" value={formular.telefon} onChange={(e)=>setFormular({...formular, telefon: e.target.value})} />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Alege Specialist</label>
                <select className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner cursor-pointer" value={formular.angajat_id} onChange={(e) => setFormular({...formular, angajat_id: e.target.value})} title="Selectează specialistul care va efectua serviciul">
                  <option value="">Alege Specialist...</option>
                  {angajati.map(a => <option key={a.id} value={a.id}>{a.nume}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Alege Serviciu</label>
                <select className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner cursor-pointer" value={formular.serviciu_id} onChange={(e) => setFormular({...formular, serviciu_id: e.target.value})} title="Selectează serviciul solicitat de client">
                  <option value="">Alege Serviciu...</option>
                  {servicii.map(s => <option key={s.id} value={s.id}>{s.nume} - {s.pret} RON</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Data</label>
                <input type="date" className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner" value={formular.data} onChange={(e)=>setFormular({...formular, data: e.target.value})} />
              </div>

              <div className="flex flex-col gap-2 relative" ref={hourPickerRef}>
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Ora</label>
                <button 
                  type="button" 
                  onClick={() => setShowHourPicker(!showHourPicker)} 
                  className="w-full p-5 bg-slate-50 rounded-[25px] font-bold text-lg shadow-inner text-left flex justify-between items-center border-2 border-transparent hover:border-amber-500 transition-all"
                  title="Selectează ora exactă a programării dintr-un selector rapid"
                >
                  {formular.ora} <span className="text-amber-600 text-[10px]">🕒</span>
                </button>
                {showHourPicker && (
                  <div className="absolute top-full left-0 right-0 mt-3 bg-white z-[100] p-6 rounded-[35px] shadow-2xl border-2 border-slate-100 animate-in fade-in zoom-in duration-200">
                    <div className="flex gap-4 h-44">
                      <div className="flex-1 overflow-y-auto scrollbar-hide text-center">
                        {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(h => (
                          <button key={h} onClick={() => setTempHour(h)} className={`w-full py-2 rounded-xl font-black transition-colors ${tempHour === h ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>{h}</button>
                        ))}
                      </div>
                      <div className="flex-1 overflow-y-auto text-center scrollbar-hide">
                        {["00", "15", "30", "45"].map(m => (
                          <button key={m} onClick={() => setTempMin(m)} className={`w-full py-2 rounded-xl font-black transition-colors ${tempMin === m ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>{m}</button>
                        ))}
                      </div>
                    </div>
                    <button type="button" onClick={() => setShowHourPicker(false)} className="w-full mt-4 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase italic hover:bg-amber-600 transition-colors" title="Confirmă ora selectată pentru programare">Confirmă Ora</button>
                  </div>
                )}
              </div>

              <div className="md:col-span-2 flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Observații</label>
                <textarea placeholder="De ce vine clientul?" className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg h-16 resize-none outline-none shadow-inner" value={formular.motiv} onChange={(e)=>setFormular({...formular, motiv: e.target.value})} />
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex-1 w-full bg-slate-100/50 p-4 rounded-[30px] border border-slate-200">
                <div className="flex items-center justify-between mb-3 px-2">
                  <span className="text-[9px] font-black uppercase text-slate-500 italic">Fișiere atașate</span>
                  <input type="file" id="doc-upload" className="hidden" multiple onChange={handleFileUpload} />
                  <label htmlFor="doc-upload" className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase italic cursor-pointer hover:bg-amber-600 transition-colors shadow-sm" title="Atașează documente, analize sau poze suplimentare pentru fișa clientului">
                    Adaugă Fișier +
                  </label>
                </div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 scrollbar-thin">
                  {formular.documente.map((doc) => (
                    <div key={doc.id} className="relative flex items-center gap-2 w-auto max-w-[180px] h-10 pr-8 pl-2 bg-white border border-slate-200 rounded-xl shadow-sm group">
                      <div className="w-6 h-6 rounded-md bg-slate-50 flex-shrink-0 overflow-hidden">
                        {doc.url.startsWith("data:image") ? (
                           <img src={doc.url} className="w-full h-full object-cover" alt="prev" />
                        ) : (
                           <span className="flex items-center justify-center h-full text-[10px]">📄</span>
                        )}
                      </div>
                      <span className="text-[8px] font-black text-slate-600 truncate uppercase italic">{doc.name}</span>
                      <button onClick={() => eliminaDocument(doc.id)} className="absolute right-1.5 w-5 h-5 bg-red-50 text-red-500 rounded-lg flex items-center justify-center text-[10px] font-black hover:bg-red-500 hover:text-white transition-all" title="Elimină definitiv acest fișier atașat">✕</button>
                    </div>
                  ))}
                </div>
            </div>

            <button 
              onClick={salveazaInCloud} 
              disabled={esteLimitat}
              className={`w-full lg:w-[280px] h-[85px] rounded-[30px] font-black uppercase shadow-xl transition-all italic flex flex-col items-center justify-center gap-0.5 group ${esteLimitat ? 'bg-slate-300 cursor-not-allowed text-slate-500 opacity-60' : 'bg-amber-600 text-white hover:bg-slate-900'}`}
              title={esteLimitat ? "Ai atins limita maximă de programări pentru planul tău" : "Salvează programarea definitiv în sistem și actualizează calendarul"}
            >
              <span className="text-[10px] opacity-70">
                {esteLimitat ? "⚠️ LIMITĂ ATINSĂ" : "✓ FINALIZARE"}
              </span>
              <span className="text-sm tracking-tighter">
                {esteLimitat ? "Actualizează Planul" : "Salvează Programarea"}
              </span>
            </button>
          </div>
        </section>

        <div className="mb-6"><h2 className="text-sm font-black uppercase italic tracking-tighter text-slate-400">Programări Azi</h2></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-40">
          {programariAzi.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white rounded-[35px] border-2 border-dashed border-slate-100">
                <p className="text-[10px] font-black uppercase italic text-slate-300">Nicio programare pentru azi.</p>
            </div>
          ) : (
            programariAzi.map((p) => {
              const spec = angajati.find(a => a.id === p.angajat_id);
              const serv = servicii.find(s => s.id === p.serviciu_id);
              return (
                  <div key={p.id} className="relative bg-white p-5 rounded-[35px] shadow-sm border border-amber-200 ring-2 ring-amber-100 transition-all cursor-pointer hover:shadow-lg hover:scale-[1.02]" onClick={() => setPopupProgramare(p)} title={`Click pentru a vedea detaliile complete pentru ${p.nume}`}>
                      <button onClick={(e) => { e.stopPropagation(); eliminaProgramare(p.id, e); }} className="absolute top-4 right-4 text-red-500 font-black text-[10px] z-10 hover:scale-125 transition-transform" title="Șterge definitiv această programare din baza de date">✕</button>
                      <div className="flex gap-3 items-center mb-4 pr-6">
                          <div className="w-12 h-12 rounded-[18px] bg-slate-50 overflow-hidden border-2 border-white shadow-inner flex items-center justify-center relative" style={{ backgroundColor: spec?.culoare }}>
                              {p.poza ? <img src={p.poza} className="w-full h-full object-cover" alt="client" /> : <Image src="/logo-chronos.png" alt="logo" fill sizes="48px" style={{ objectFit: 'contain', padding: '4px' }} />}
                          </div>
                          <div className="overflow-hidden flex-1">
                              <h4 className="font-black text-slate-800 uppercase text-[11px] truncate italic leading-tight">{p.nume}</h4>
                              <p className="text-[9px] font-black text-amber-600 uppercase italic">{p.ora} • {spec?.nume || 'General'}</p>
                              <p className="text-[9px] font-bold text-slate-400 italic uppercase">{serv?.nume || 'Procedură'}</p>
                          </div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl">
                          <p className="text-[8px] font-black text-slate-400 uppercase italic truncate">{p.motiv || "Fără detalii suplimentare"}</p>
                      </div>
                  </div>
              );
            })
          )}
        </div>
      </div>

      <Suspense fallback={null}>
        {popupProgramare && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div ref={popupRef} className="bg-white w-full max-w-lg rounded-[50px] overflow-hidden shadow-2xl border border-slate-100 relative animate-in zoom-in duration-300">
                    <button onClick={() => setPopupProgramare(null)} className="absolute top-8 right-8 w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all z-10" title="Închide fereastra cu detaliile programării">✕</button>
                    
                    <div className="h-32 bg-slate-900 relative">
                        <div className="absolute -bottom-12 left-10 w-24 h-24 rounded-[30px] bg-white p-2 shadow-xl border border-slate-50">
                            <div className="w-full h-full rounded-[22px] bg-slate-50 overflow-hidden relative flex items-center justify-center">
                                {popupProgramare.poza ? <img src={popupProgramare.poza} className="w-full h-full object-cover" /> : <Image src="/logo-chronos.png" alt="logo" fill sizes="80px" style={{ objectFit: 'contain', padding: '8px' }} />}
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
                                <p className="font-black text-xs text-slate-700">{angajati.find(a => a.id === popupProgramare.angajat_id)?.nume || 'General'}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Serviciu</p>
                                <p className="font-black text-xs text-slate-700">{servicii.find(s => s.id === popupProgramare.serviciu_id)?.nume || 'Procedură'}</p>
                            </div>
                        </div>

                        {popupProgramare.documente.length > 0 && (
                             <div className="mb-8">
                                <p className="text-[9px] font-black text-slate-400 uppercase italic mb-3">Documente atașate</p>
                                <div className="flex flex-wrap gap-2">
                                    {popupProgramare.documente.map(doc => (
                                        <a key={doc.id} href={doc.url} download={doc.name} className="flex items-center gap-2 bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl group hover:bg-amber-600 transition-all" title={`Descarcă fișierul: ${doc.name}`}>
                                            <span className="text-xs group-hover:filter group-hover:invert">📄</span>
                                            <span className="text-[8px] font-black text-amber-800 uppercase italic group-hover:text-white truncate max-w-[100px]">{doc.name}</span>
                                        </a>
                                    ))}
                                </div>
                             </div>
                        )}

                        <div className="bg-slate-900 p-6 rounded-[35px] text-white">
                            <p className="text-[8px] font-black text-amber-500 uppercase italic mb-2">Motivul vizitei / Observații</p>
                            <p className="text-xs font-medium italic opacity-90 leading-relaxed">{popupProgramare.motiv || "Nu au fost adăugate observații pentru această programare."}</p>
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