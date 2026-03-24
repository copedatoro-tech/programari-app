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
  created_by_client?: boolean;
};

function ProgramariContent() {
  const [programari, setProgramari] = useState<Programare[]>([]);
  const [loadingDB, setLoadingDB] = useState(true);
  const [popupProgramare, setPopupProgramare] = useState<Programare | null>(null);
  
  // --- STATE-URI MODALE ---
  const [showEchipaModal, setShowEchipaModal] = useState(false);
  const [showServiciiModal, setShowServiciiModal] = useState(false);
  const [showSpecialistPicker, setShowSpecialistPicker] = useState(false);
  const [showAddSpecialistModal, setShowAddSpecialistModal] = useState(false);
  const [showAddServiciuModal, setShowAddServiciuModal] = useState(false);

  // --- CONFIGURARE ECHIPĂ & SERVICII ---
  const [angajati, setAngajati] = useState<Angajat[]>([]);
  const [servicii, setServicii] = useState<Serviciu[]>([]);
  
  const [nouSpecialist, setNouSpecialist] = useState({
    nume: "", prenume: "", functie: "", culoare: "bg-slate-900"
  });

  const [nouServiciu, setNouServiciu] = useState({
    nume: "", durata: "30", pret: ""
  });

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
    angajat_id: "" 
  });

  useEffect(() => {
    setFormular(prev => ({ ...prev, ora: `${tempHour}:${tempMin}` }));
  }, [tempHour, tempMin]);

  useEffect(() => {
    fetchProgramari();
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          created_by_client: item.is_client_booking ?? false 
        })));
      }
    } finally {
      setLoadingDB(false);
    }
  }

  const handleAddSpecialist = () => {
    if(!nouSpecialist.nume || !nouSpecialist.functie) return alert("Completează datele!");
    const specialistFinal: Angajat = {
        id: Math.random().toString(36).substr(2, 9),
        nume: `${nouSpecialist.prenume} ${nouSpecialist.nume}`.trim(),
        specializare: nouSpecialist.functie,
        culoare: nouSpecialist.culoare
    };
    setAngajati([...angajati, specialistFinal]);
    setNouSpecialist({ nume: "", prenume: "", functie: "", culoare: "bg-slate-900" });
    setShowAddSpecialistModal(false);
  };

  const handleAddServiciu = () => {
    if(!nouServiciu.nume || !nouServiciu.pret) return alert("Completează datele serviciului!");
    const serviciuFinal: Serviciu = {
        id: Math.random().toString(36).substr(2, 9),
        nume: nouServiciu.nume,
        durata: nouServiciu.durata,
        pret: nouServiciu.pret
    };
    setServicii([...servicii, serviciuFinal]);
    setNouServiciu({ nume: "", durata: "30", pret: "" });
    setShowAddServiciuModal(false);
  };

  const cautaSiCompleteazaClient = (val: string, tip: 'nume' | 'telefon') => {
    if (val.length < 3) return;
    const clientGasit = programari.find(p => 
      tip === 'nume' 
        ? p.nume.toLowerCase() === val.toLowerCase()
        : p.telefon === val
    );
    if (clientGasit) {
      setFormular(prev => ({
        ...prev,
        nume: clientGasit.nume,
        email: clientGasit.email,
        telefon: clientGasit.telefon,
        poza: clientGasit.poza
      }));
    }
  };

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
        angajat_id: formular.angajat_id
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
  const specialistSelectat = angajati.find(a => a.id === formular.angajat_id);

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
                <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-amber-100 flex items-center gap-3" title="Statistici activitate pentru ziua curentă">
                    <span className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></span>
                    <p className="text-[11px] font-black uppercase italic text-slate-600">
                        Activitate Azi: <span className="text-amber-600">{totalAzi} Total</span> • <span className="text-blue-500">{onlineAzi} Online</span>
                    </p>
                </div>
                {/* MODIFICARE: Calea Link-ului a fost actualizată la /programari/calendar conform structurii proiectului */}
                <Link href="/programari/calendar" className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3 hover:bg-slate-50 transition-all group" title="Deschide calendarul general pentru vizualizarea tuturor programărilor">
                    <span className="text-xs group-hover:scale-110 transition-transform">📅</span>
                    <p className="text-[11px] font-black uppercase italic text-slate-600">
                        Vezi Calendar General
                    </p>
                </Link>
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
                        <img src="/logo-chronos.png" alt="Chronos Placeholder" className="w-full h-full object-contain opacity-100 p-4" />
                    </div>
                  )}
                  <input type="file" id="f-pick" className="hidden" accept="image/*" onChange={(e) => {
                    if(e.target.files?.[0]) {
                        const r = new FileReader();
                        r.onload = () => setFormular({...formular, poza: r.result as string});
                        r.readAsDataURL(e.target.files[0]);
                    }
                  }} />
                  <label htmlFor="f-pick" className="absolute inset-0 cursor-pointer z-10" title="Încarcă sau schimbă poza de profil a clientului"></label>
                </div>
                <div className="text-center">
                    <p className="text-[10px] font-black uppercase italic text-slate-400">Poza Profil Client</p>
                </div>
            </div>

            <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* NUME CLIENT - FULL WIDTH */}
              <div className="md:col-span-2 flex flex-col gap-2 relative" ref={suggestionsRef}>
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Nume Client</label>
                <input type="text" placeholder="Nume..." className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner" value={formular.nume} onChange={(e) => handleNumeChange(e.target.value)} onBlur={() => cautaSiCompleteazaClient(formular.nume, 'nume')} title="Introdu numele clientului pentru căutare sau adăugare" />
                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 z-[110] bg-white mt-2 rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                    {filteredClients.map((c, idx) => (
                      <button key={idx} onClick={() => selecteazaClient(c)} className="w-full flex items-center gap-4 p-4 hover:bg-amber-50 border-b border-slate-50 last:border-0 text-left" title={`Selectează clientul ${c.nume}`}>
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

              {/* EMAIL & TELEFON PE ACELAȘI NIVEL */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">E-mail</label>
                <input type="email" placeholder="client@email.com" className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner" value={formular.email} onChange={(e)=>setFormular({...formular, email: e.target.value})} title="Adresa de email a clientului pentru confirmări" />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Telefon</label>
                <input type="tel" placeholder="07xxxxxxxx" className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner" value={formular.telefon} onChange={(e)=>setFormular({...formular, telefon: e.target.value})} onBlur={() => cautaSiCompleteazaClient(formular.telefon, 'telefon')} title="Numărul de telefon al clientului pentru contact rapid" />
              </div>

              {/* DATA & ORA PE ACELAȘI NIVEL */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Data</label>
                <input type="date" className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner" value={formular.data} onChange={(e)=>setFormular({...formular, data: e.target.value})} title="Alege data pentru programare" />
              </div>

              <div className="flex flex-col gap-2 relative">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Ora</label>
                <button type="button" onClick={() => setShowHourPicker(!showHourPicker)} className="w-full p-5 bg-slate-50 rounded-[25px] font-bold text-lg shadow-inner text-left flex justify-between items-center" title="Selectează ora și minutul programării">
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
                    <button type="button" onClick={() => setShowHourPicker(false)} className="w-full mt-4 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase italic" title="Confirmă selecția orei">Gata</button>
                  </div>
                )}
              </div>

              <div className="md:col-span-2 flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Observații</label>
                <textarea placeholder="De ce vine clientul?" className="p-5 bg-slate-50 rounded-[25px] font-bold text-lg h-16 resize-none outline-none shadow-inner" value={formular.motiv} onChange={(e)=>setFormular({...formular, motiv: e.target.value})} title="Adaugă detalii suplimentare sau motivul vizitei" />
              </div>
            </div>
          </div>
          
          <div className="mt-12 flex flex-col lg:flex-row gap-8 items-start border-t pt-10">
            <div className="flex-1 w-full space-y-4">
              <input type="file" id="doc-upload" className="hidden" multiple onChange={handleFileUpload} />
              <label htmlFor="doc-upload" className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase italic tracking-widest shadow-lg hover:bg-amber-600 transition-colors cursor-pointer text-center inline-flex items-center" title="Încarcă documente scanate, fișe sau poze relevante pentru client">
                + Fișă Client / Documente
              </label>

              <div className="flex flex-wrap gap-3 mt-4">
                {formular.documente.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 bg-slate-100 p-2 pr-3 rounded-xl border border-slate-200 group">
                    <div className="w-8 h-8 rounded-lg bg-white overflow-hidden flex items-center justify-center border border-slate-200 shadow-sm">
                      {doc.url.startsWith("data:image") ? (
                         <img src={doc.url} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px]">📄</span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 max-w-[100px] truncate">{doc.name}</span>
                    <button 
                      onClick={() => eliminaDocument(doc.id)}
                      className="ml-2 text-red-500 hover:text-red-700 font-black text-xs transition-colors"
                      title="Șterge acest document din listă"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={salveazaInCloud} className="w-full lg:w-auto bg-amber-600 text-white px-16 py-6 rounded-[30px] font-black text-sm uppercase shadow-2xl hover:bg-slate-900 transition-all italic tracking-tighter" title="Salvează definitiv programarea în baza de date Supabase">
              Salvează Programarea
            </button>
          </div>
        </section>

        <div className="mb-6">
            <h2 className="text-sm font-black uppercase italic tracking-tighter text-slate-400">Programări Azi</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-40">
          {programariAzi.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white rounded-[35px] border-2 border-dashed border-slate-100">
                <p className="text-[10px] font-black uppercase italic text-slate-300">Nicio programare pentru ziua de azi.</p>
            </div>
          ) : (
            programariAzi.map((p) => {
              const spec = angajati.find(a => a.id === p.angajat_id);
              return (
                  <div key={p.id} className="relative bg-white p-5 rounded-[35px] shadow-sm border border-amber-200 ring-2 ring-amber-100 transition-all cursor-pointer hover:shadow-lg" onClick={() => setPopupProgramare(p)} title="Vizualizează detaliile complete ale acestei programări">
                      <button onClick={(e) => eliminaProgramare(p.id, e)} className="absolute top-4 right-4 text-red-500 font-black text-[10px] z-10 hover:scale-125 transition-transform" title="Șterge programarea">✕</button>
                      
                      <div className="flex gap-3 items-center mb-4 pr-6">
                          <div className={`w-12 h-12 rounded-[18px] ${spec?.culoare || 'bg-slate-50'} overflow-hidden border-2 border-white shadow-inner flex items-center justify-center`}>
                              {p.poza ? (
                                  <img src={p.poza} className="w-full h-full object-cover" />
                              ) : (
                                  <img src="/logo-chronos.png" className="w-full h-full object-contain opacity-100 p-1" />
                              )}
                          </div>
                          <div className="overflow-hidden flex-1">
                              <h4 className="font-black text-slate-800 uppercase text-[11px] truncate italic leading-tight">{p.nume}</h4>
                              <p className="text-[9px] font-black text-amber-600 uppercase italic">{p.ora} • {spec?.nume || 'Nespecificat'}</p>
                              <p className="text-[9px] font-bold text-slate-400 italic">{p.data}</p>
                          </div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl">
                              <p className="text-[9px] text-slate-600 italic line-clamp-2">"{p.motiv || 'Niciun motiv specificat'}"</p>
                      </div>
                  </div>
              )
            })
          )}
        </div>
      </div>

      {/* --- MODALE --- */}
      {popupProgramare && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[99999]">
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md" onClick={() => setPopupProgramare(null)}></div>
          <div className="bg-white w-full max-w-lg rounded-[55px] p-10 relative animate-in zoom-in duration-200 shadow-2xl">
            <div className="text-center">
              <div className="w-32 h-32 bg-slate-50 rounded-[40px] mx-auto mb-6 overflow-hidden border-4 border-white shadow-xl flex items-center justify-center">
                {popupProgramare.poza ? (
                    <img src={popupProgramare.poza} className="w-full h-full object-cover" />
                ) : (
                    <img src="/logo-chronos.png" className="w-full h-full object-contain p-2" />
                )}
              </div>
              <h3 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">{popupProgramare.nume}</h3>
              <p className="text-amber-600 font-black text-[10px] uppercase mt-2 italic tracking-widest">
                {popupProgramare.data} | ORA {popupProgramare.ora} | {angajati.find(a => a.id === popupProgramare.angajat_id)?.nume || ' Nespecificat'}
              </p>
              
              <div className="mt-8 space-y-4">
                  <div className="bg-slate-50 p-6 rounded-[35px] text-left border border-slate-100">
                      <p className="text-[8px] font-black uppercase text-slate-400 mb-2 italic">Motiv și Detalii:</p>
                      <p className="text-sm font-bold text-slate-700 italic leading-relaxed">
                          {popupProgramare.motiv || "Nu au fost adăugate observații pentru această programare."}
                      </p>
                  </div>
              </div>
            </div>
            
            <div className="mt-10 flex gap-4">
                <button onClick={() => window.open(`tel:${popupProgramare.telefon}`)} className="flex-1 py-5 bg-amber-600 text-white rounded-[25px] font-black text-[10px] uppercase italic tracking-widest shadow-lg shadow-amber-200 active:scale-95 transition-all" title="Inițiază apel telefonic către acest client">Suna Client</button>
                <button onClick={() => setPopupProgramare(null)} className="flex-1 py-5 bg-slate-900 text-white rounded-[25px] font-black text-[10px] uppercase italic tracking-widest active:scale-95 transition-all" title="Închide fereastra de detalii">Închide Fișa</button>
            </div>
          </div>
        </div>
      )}

      {showEchipaModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[99999]">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={() => setShowEchipaModal(false)}></div>
          <div className="bg-white w-full max-w-2xl rounded-[50px] p-10 relative animate-in slide-in-from-bottom-10 shadow-2xl">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-6">Gestiune <span className="text-amber-600">Echipă</span></h2>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {angajati.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <p className="text-[10px] font-black uppercase text-slate-400 italic">Niciun membru în echipă.</p>
                    </div>
                ) : (
                    angajati.map(a => (
                        <div key={a.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl ${a.culoare}`}></div>
                                <div>
                                    <p className="font-black text-xs uppercase italic">{a.nume}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{a.specializare}</p>
                                </div>
                            </div>
                            <button className="text-[10px] font-black uppercase italic text-amber-600" title="Editează datele specialistului">Editează</button>
                        </div>
                    ))
                )}
            </div>
            <button onClick={() => setShowAddSpecialistModal(true)} className="w-full mt-8 py-5 bg-slate-900 text-white rounded-[25px] font-black text-[10px] uppercase italic tracking-widest" title="Deschide formularul pentru un nou membru">Adaugă Specialist Nou</button>
          </div>
        </div>
      )}

      {showServiciiModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[99999]">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={() => setShowServiciiModal(false)}></div>
          <div className="bg-white w-full max-w-2xl rounded-[50px] p-10 relative animate-in slide-in-from-bottom-10 shadow-2xl">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-6">Gestiune <span className="text-amber-600">Servicii</span></h2>
            <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
                {servicii.length === 0 ? (
                    <div className="col-span-2 text-center py-10 bg-slate-50 rounded-[35px] border-2 border-dashed border-slate-200">
                         <p className="text-[10px] font-black uppercase text-slate-400 italic">Nu există servicii adăugate.</p>
                    </div>
                ) : (
                    servicii.map(serv => (
                        <div key={serv.id} className="p-6 bg-slate-50 rounded-[30px] border border-slate-100 group hover:border-amber-500 cursor-pointer transition-all" title="Serviciu configurat">
                            <p className="font-black text-xs uppercase italic group-hover:text-amber-600">{serv.nume}</p>
                            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase italic">{serv.durata} MIN • {serv.pret} RON</p>
                        </div>
                    ))
                )}
            </div>
            <button onClick={() => setShowAddServiciuModal(true)} className="w-full mt-8 py-5 bg-amber-600 text-white rounded-[25px] font-black text-[10px] uppercase italic tracking-widest" title="Adaugă o nouă procedură sau serviciu">Adaugă Serviciu Nou</button>
          </div>
        </div>
      )}

      {showAddServiciuModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[100000]">
            <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md" onClick={() => setShowAddServiciuModal(false)}></div>
            <div className="bg-white w-full max-w-md rounded-[50px] p-10 relative animate-in zoom-in duration-200">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-center mb-8">Date <span className="text-amber-600">Serviciu</span></h3>
                <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Nume Serviciu</label>
                        <input type="text" placeholder="ex: Manichiură Clasică" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-amber-500 shadow-inner" 
                            value={nouServiciu.nume} onChange={(e) => setNouServiciu({...nouServiciu, nume: e.target.value})} title="Introdu numele serviciului oferit" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Durată (Minute)</label>
                        <input type="number" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-amber-500 shadow-inner" 
                            value={nouServiciu.durata} onChange={(e) => setNouServiciu({...nouServiciu, durata: e.target.value})} title="Timpul estimat pentru acest serviciu" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Preț (RON)</label>
                        <input type="text" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-amber-500 shadow-inner" 
                            value={nouServiciu.pret} onChange={(e) => setNouServiciu({...nouServiciu, pret: e.target.value})} title="Tariful serviciului în lei" />
                    </div>
                </div>
                <button onClick={handleAddServiciu} className="w-full mt-10 py-5 bg-amber-600 text-white rounded-[25px] font-black text-[10px] uppercase italic tracking-widest" title="Salvează serviciul în listă">Salvează Serviciul</button>
            </div>
        </div>
      )}

      {showAddSpecialistModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[100000]">
            <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md" onClick={() => setShowAddSpecialistModal(false)}></div>
            <div className="bg-white w-full max-w-md rounded-[50px] p-10 relative animate-in zoom-in duration-200">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-center mb-8">Date <span className="text-amber-600">Specialist</span></h3>
                <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Prenume</label>
                        <input type="text" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none shadow-inner border-2 border-transparent focus:border-amber-500" 
                            value={nouSpecialist.prenume} onChange={(e) => setNouSpecialist({...nouSpecialist, prenume: e.target.value})} title="Prenumele specialistului" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Nume</label>
                        <input type="text" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none shadow-inner border-2 border-transparent focus:border-amber-500" 
                            value={nouSpecialist.nume} onChange={(e) => setNouSpecialist({...nouSpecialist, nume: e.target.value})} title="Numele de familie al specialistului" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Specializare / Serviciu</label>
                        <select 
                            className="p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-amber-500"
                            value={nouSpecialist.functie}
                            onChange={(e) => setNouSpecialist({...nouSpecialist, functie: e.target.value})}
                            title="Alege specializarea principală"
                        >
                            <option value="">Selectează Serviciul...</option>
                            {servicii.map(s => <option key={s.id} value={s.nume}>{s.nume}</option>)}
                            <option value="General">General/Admin</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Culoare</label>
                        <div className="flex gap-2">
                            {["bg-pink-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-slate-900"].map(c => (
                                <button key={c} onClick={() => setNouSpecialist({...nouSpecialist, culoare: c})} className={`w-8 h-8 rounded-full ${c} ${nouSpecialist.culoare === c ? 'ring-2 ring-amber-500 ring-offset-2' : ''}`} title="Culoare reprezentativă în calendar"></button>
                            ))}
                        </div>
                    </div>
                </div>
                <button onClick={handleAddSpecialist} className="w-full mt-10 py-5 bg-slate-900 text-white rounded-[25px] font-black text-[10px] uppercase italic tracking-widest shadow-xl" title="Finalizează adăugarea membrului echipei">Salvează Membru Echipă</button>
            </div>
        </div>
      )}

      {showSpecialistPicker && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[99999]">
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md" onClick={() => setShowSpecialistPicker(false)}></div>
          <div className="bg-white w-full max-w-md rounded-[50px] p-10 relative animate-in zoom-in duration-200">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-center mb-8">Selectează <span className="text-amber-600">Specialistul</span></h3>
            {angajati.length === 0 ? (
                <div className="text-center py-6">
                    <p className="text-xs font-bold text-slate-400 italic mb-4">Nu ai adăugat specialiști încă.</p>
                    <button onClick={() => {setShowSpecialistPicker(false); setShowEchipaModal(true);}} className="text-[10px] font-black uppercase text-amber-600 underline" title="Mergi la setările de echipă">Mergi la Gestiune Echipă</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {angajati.map(a => (
                        <button key={a.id} onClick={() => { setFormular({...formular, angajat_id: a.id}); setShowSpecialistPicker(false); }}
                            className={`flex items-center gap-4 p-5 rounded-[25px] border-2 transition-all ${formular.angajat_id === a.id ? 'border-amber-500 bg-amber-50 shadow-md' : 'border-slate-50 bg-slate-50 hover:border-slate-200'}`} title={`Selectează pe ${a.nume}`}>
                            <div className={`w-12 h-12 rounded-2xl ${a.culoare} shadow-sm`}></div>
                            <div className="text-left">
                                <p className="font-black text-xs uppercase italic text-slate-900">{a.nume}</p>
                                <p className="text-[9px] font-black text-amber-600 uppercase italic leading-none mt-1">{a.specializare}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
          </div>
        </div>
      )}

    </main>
  );
}

export default function ProgramariPage() {
  return <Suspense fallback={null}><ProgramariContent /></Suspense>;
}