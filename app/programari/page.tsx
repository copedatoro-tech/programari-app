"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

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

const MY_DIRECT_ID = "ed9cd915-6684-422c-a214-4ac5c25e98f3";

function ProgramariContent() {
  const [programari, setProgramari] = useState<Programare[]>([]);
  const [loadingDB, setLoadingDB] = useState(true);
  const [popupProgramare, setPopupProgramare] = useState<Programare | null>(null);
  
  // Inițializăm cu liste goale pentru a evita orice date reziduale (ex: Coafor)
  const [angajati, setAngajati] = useState<Angajat[]>([]);
  const [servicii, setServicii] = useState<Serviciu[]>([]);
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    setFormular(prev => ({ ...prev, ora: `${tempHour}:${tempMin}` }));
  }, [tempHour, tempMin]);

  useEffect(() => {
    fetchProgramari();
    fetchResurseProfile();
    
    const handleClickOutside = (e: MouseEvent) => {
      // 1. Închidere sugestii clienți
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      // 2. Închidere popup programare la click în afara conținutului
      const popupContainer = document.getElementById('popup-content');
      if (popupProgramare && popupContainer && !popupContainer.contains(e.target as Node)) {
        setPopupProgramare(null);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popupProgramare]);

  async function fetchResurseProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('services, staff')
      .eq('id', MY_DIRECT_ID)
      .single();

    if (data) {
      const parseData = (val: any) => {
        if (!val) return [];
        let curat = typeof val === 'string' ? JSON.parse(val) : val;
        if (typeof curat === 'string') curat = JSON.parse(curat);
        if (!Array.isArray(curat)) return [];
        
        return curat.map((item: any) => ({
          ...item,
          nume: item.nume || item.name || "Nespecificat",
          pret: item.pret || item.price || "0",
          durata: item.durata || item.duration || "0"
        }));
      };
      
      const serviciiNoi = parseData(data.services);
      const staffNou = parseData(data.staff);
      
      setServicii(serviciiNoi);
      setAngajati(staffNou);
    }
  }

  async function fetchProgramari() {
    setLoadingDB(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', session.user.id)
        .order('date', { ascending: false });

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
    } finally {
      setLoadingDB(false);
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
          const newDoc = {
            id: Date.now() + Math.random(),
            name: file.name,
            url: reader.result as string
          };
          setFormular(prev => ({
            ...prev,
            documente: [...prev.documente, newDoc]
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const eliminaDocument = (id: number) => {
    setFormular(prev => ({
      ...prev,
      documente: prev.documente.filter(doc => doc.id !== id)
    }));
  };

  const salveazaInCloud = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    if (!formular.nume || !formular.telefon) {
      alert("⚠️ Numele și Telefonul sunt obligatorii!");
      return;
    }
    const payload = {
      user_id: session.user.id,
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
    if (!error) {
        window.location.reload();
    } else {
      console.error(error);
      alert("Eroare la salvare.");
    }
  };

  const eliminaProgramare = async (id: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Ștergi programarea?")) {
      await supabase.from('appointments').delete().eq('id', id);
      setProgramari(prev => prev.filter(p => p.id !== id));
    }
  };

  const azi = new Date().toISOString().split('T')[0];
  const programariAzi = programari.filter(p => p.data === azi);
  const totalAzi = programariAzi.length;
  const onlineAzi = programariAzi.filter(p => p.created_by_client).length;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-12 text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
                <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
                    Gestiune <span className="text-amber-600">Programări</span>
                </h1>
            </div>
            <div className="flex flex-col gap-2 self-start md:self-auto items-end">
                <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-amber-100 flex items-center gap-3">
                    <span className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></span>
                    <p className="text-[11px] font-black uppercase italic text-slate-600">
                        Activitate Azi: <span className="text-amber-600">{totalAzi} Total</span> • <span className="text-blue-500">{onlineAzi} Online</span>
                    </p>
                </div>
                <div className="flex gap-2">
                  <Link href="/programari/calendar" className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3 hover:bg-slate-50 transition-all group">
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
                        <img src="/logo-chronos.png" alt="Chronos" className="w-full h-full object-contain p-4" />
                    </div>
                  )}
                  <input type="file" id="f-pick" className="hidden" accept="image/*" onChange={(e) => {
                    if(e.target.files?.[0]) {
                        const r = new FileReader();
                        r.onload = () => setFormular({...formular, poza: r.result as string});
                        r.readAsDataURL(e.target.files[0]);
                    }
                  }} />
                  <label htmlFor="f-pick" className="absolute inset-0 cursor-pointer z-10"></label>
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
                      <button key={idx} onClick={() => selecteazaClient(c)} className="w-full flex items-center gap-4 p-4 hover:bg-amber-50 border-b border-slate-50 last:border-0 text-left">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center">
                            {c.poza ? <img src={c.poza} className="w-full h-full object-cover" /> : <img src="/logo-chronos.png" className="w-[80%] h-[80%] object-contain" />}
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
                <select 
                  className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner appearance-none cursor-pointer"
                  value={formular.angajat_id}
                  onChange={(e) => setFormular({...formular, angajat_id: e.target.value})}
                >
                  <option value="">Alege Specialist...</option>
                  {angajati.map(a => <option key={a.id} value={a.id}>{a.nume}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Alege Serviciu</label>
                <select 
                  className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner appearance-none cursor-pointer"
                  value={formular.serviciu_id}
                  onChange={(e) => setFormular({...formular, serviciu_id: e.target.value})}
                >
                  <option value="">Alege Serviciu...</option>
                  {servicii.map(s => <option key={s.id} value={s.id}>{s.nume} - {s.pret} RON</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Data</label>
                <input type="date" className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner" value={formular.data} onChange={(e)=>setFormular({...formular, data: e.target.value})} />
              </div>

              <div className="flex flex-col gap-2 relative">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Ora</label>
                <button type="button" onClick={() => setShowHourPicker(!showHourPicker)} className="w-full p-5 bg-slate-50 rounded-[25px] font-bold text-lg shadow-inner text-left flex justify-between items-center">
                  {formular.ora} <span className="text-amber-600 text-[10px]">🕒</span>
                </button>
                {showHourPicker && (
                  <div className="absolute top-full left-0 right-0 mt-3 bg-white z-[100] p-6 rounded-[35px] shadow-2xl border-2 border-slate-100">
                    <div className="flex gap-4 h-44">
                      <div className="flex-1 overflow-y-auto scrollbar-hide text-center">
                        {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(h => (
                          <button key={h} onClick={() => setTempHour(h)} className={`w-full py-2 rounded-xl font-black ${tempHour === h ? 'bg-amber-600 text-white' : 'text-slate-400'}`}>{h}</button>
                        ))}
                      </div>
                      <div className="flex-1 overflow-y-auto text-center">
                        {["00", "15", "30", "45"].map(m => (
                          <button key={m} onClick={() => setTempMin(m)} className={`w-full py-2 rounded-xl font-black ${tempMin === m ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>{m}</button>
                        ))}
                      </div>
                    </div>
                    <button type="button" onClick={() => setShowHourPicker(false)} className="w-full mt-4 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase italic">Confirmă Ora</button>
                  </div>
                )}
              </div>

              <div className="md:col-span-2 flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Observații</label>
                <textarea placeholder="De ce vine clientul?" className="p-5 bg-slate-50 rounded-[25px] font-bold text-lg h-16 resize-none outline-none shadow-inner" value={formular.motiv} onChange={(e)=>setFormular({...formular, motiv: e.target.value})} />
              </div>
            </div>
          </div>
          
          <div className="mt-12 flex flex-col lg:flex-row gap-8 items-start border-t pt-10">
            <div className="flex-1 w-full space-y-4">
              <input type="file" id="doc-upload" className="hidden" multiple onChange={handleFileUpload} />
              <label htmlFor="doc-upload" className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase italic tracking-widest shadow-lg hover:bg-amber-600 transition-colors cursor-pointer text-center inline-flex items-center">
                + Fișă Client / Documente
              </label>

              <div className="flex flex-wrap gap-3 mt-4">
                {formular.documente.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 bg-slate-100 p-2 pr-3 rounded-xl border border-slate-200 group">
                    <div className="w-8 h-8 rounded-lg bg-white overflow-hidden flex items-center justify-center border border-slate-200 shadow-sm">
                      {doc.url.startsWith("data:image") ? <img src={doc.url} className="w-full h-full object-cover" /> : <span className="text-[10px]">📄</span>}
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 max-w-[100px] truncate">{doc.name}</span>
                    <button onClick={() => eliminaDocument(doc.id)} className="ml-2 text-red-500 hover:text-red-700 font-black text-xs">✕</button>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={salveazaInCloud} className="w-full lg:w-auto bg-amber-600 text-white px-16 py-6 rounded-[30px] font-black text-sm uppercase shadow-2xl hover:bg-slate-900 transition-all italic tracking-tighter">
              Salvează Programarea
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
                  <div key={p.id} className="relative bg-white p-5 rounded-[35px] shadow-sm border border-amber-200 ring-2 ring-amber-100 transition-all cursor-pointer hover:shadow-lg" onClick={() => setPopupProgramare(p)}>
                      <button onClick={(e) => { e.stopPropagation(); eliminaProgramare(p.id, e); }} className="absolute top-4 right-4 text-red-500 font-black text-[10px] z-10 hover:scale-125 transition-transform">✕</button>
                      <div className="flex gap-3 items-center mb-4 pr-6">
                          <div className={`w-12 h-12 rounded-[18px] bg-slate-50 overflow-hidden border-2 border-white shadow-inner flex items-center justify-center`} style={{ backgroundColor: spec?.culoare }}>
                              {p.poza ? <img src={p.poza} className="w-full h-full object-cover" /> : <img src="/logo-chronos.png" className="w-full h-full object-contain p-1" />}
                          </div>
                          <div className="overflow-hidden flex-1">
                              <h4 className="font-black text-slate-800 uppercase text-[11px] truncate italic leading-tight">{p.nume}</h4>
                              <p className="text-[9px] font-black text-amber-600 uppercase italic">{p.ora} • {spec?.nume || 'Nespecificat'}</p>
                              <p className="text-[9px] font-bold text-slate-400 italic uppercase">{serv?.nume || 'Procedură'}</p>
                          </div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl">
                          <p className="text-[9px] text-slate-600 italic line-clamp-2">"{p.motiv || 'Fără motiv specificat'}"</p>
                      </div>
                  </div>
              )
            })
          )}
        </div>
      </div>

      {/* --- POPUP DETALII PROGRAMARE --- */}
      {popupProgramare && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[99999]">
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md"></div>
          <div id="popup-content" className="bg-white w-full max-w-lg rounded-[55px] p-10 relative animate-in zoom-in duration-200 shadow-2xl">
            <div className="text-center">
              <div className="w-32 h-32 bg-slate-50 rounded-[40px] mx-auto mb-6 overflow-hidden border-4 border-white shadow-xl flex items-center justify-center">
                {popupProgramare.poza ? <img src={popupProgramare.poza} className="w-full h-full object-cover" /> : <img src="/logo-chronos.png" className="w-full h-full object-contain p-2" />}
              </div>
              <h3 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">{popupProgramare.nume}</h3>
              <p className="text-amber-600 font-black text-[10px] uppercase mt-2 italic tracking-widest">
                {popupProgramare.data} | ORA {popupProgramare.ora} | {angajati.find(a => a.id === popupProgramare.angajat_id)?.nume || ' Nespecificat'}
              </p>
              <div className="mt-8 space-y-4">
                  <div className="bg-slate-50 p-6 rounded-[35px] text-left border border-slate-100">
                      <p className="text-[8px] font-black uppercase text-slate-400 mb-2 italic">Procedură:</p>
                      <p className="text-xs font-black text-slate-900 italic uppercase">{servicii.find(s => s.id === popupProgramare.serviciu_id)?.nume || "Serviciu General"}</p>
                      <p className="text-[8px] font-black uppercase text-slate-400 mt-4 mb-2 italic">Motiv:</p>
                      <p className="text-sm font-bold text-slate-700 italic">{popupProgramare.motiv || "Fără observații."}</p>
                  </div>
              </div>
            </div>
            <div className="mt-10 flex gap-4">
                <button onClick={() => window.open(`tel:${popupProgramare.telefon}`)} className="flex-1 py-5 bg-amber-600 text-white rounded-[25px] font-black text-[10px] uppercase italic tracking-widest active:scale-95 transition-all">Suna Client</button>
                <button onClick={() => setPopupProgramare(null)} className="flex-1 py-5 bg-slate-900 text-white rounded-[25px] font-black text-[10px] uppercase italic tracking-widest active:scale-95 transition-all">Închide</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ProgramariPage() {
  return <Suspense fallback={null}><ProgramariContent /></Suspense>;
}