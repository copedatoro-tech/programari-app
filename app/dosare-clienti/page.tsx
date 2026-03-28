"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

// CONFIGURARE SUPABASE
// Verificăm existența variabilelor pentru a evita erori la inițializare
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function IstoricPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [clientiGrupati, setClientiGrupati] = useState<any[]>([]);
  const [incarcare, setIncarcare] = useState(true);
  const [cautare, setCautare] = useState("");
  const [userPlan, setUserPlan] = useState("START (GRATUIT)");
  const [dosarSelectat, setDosarSelectat] = useState<any | null>(null);
  const [notaNoua, setNotaNoua] = useState("");
  const [notaDeVizualizat, setNotaDeVizualizat] = useState<any | null>(null);
  
  // Stări pentru editarea vizitei
  const [vizitaDeEditat, setVizitaDeEditat] = useState<any | null>(null);

  useEffect(() => {
    const verificaSesiune = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          setUserId(null);
          setClientiGrupati([]);
          router.push("/");
          return;
        }

        setUserId(session.user.id);
        
        // Verificare sigură pentru localStorage (doar pe client)
        if (typeof window !== "undefined") {
          const plan = localStorage.getItem("user_plan") || "START (GRATUIT)";
          setUserPlan(plan);
        }
      } catch (err) {
        console.error("Eroare sesiune:", err);
        router.push("/");
      }
    };

    verificaSesiune();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUserId(null);
        setClientiGrupati([]);
        router.push("/");
      } else if (session) {
        setUserId(session.user.id);
      }
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (userId) {
      preiaProgramariDinSupabase(userId);
    }
  }, [userId]);

  const preiaProgramariDinSupabase = async (currentUserId: string) => {
    setIncarcare(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', currentUserId)
        .order('date', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const grupate = data.reduce((acc: any, curr: any) => {
          const numeClient = curr.title || "Client Necunoscut";
          if (!acc[numeClient]) {
            acc[numeClient] = {
              nume: numeClient,
              telefon: curr.phone || "",
              email: curr.email || "",
              vizite: [],
              ultimaVizita: curr.date
            };
          }
          acc[numeClient].vizite.push(curr);
          return acc;
        }, {});
        setClientiGrupati(Object.values(grupate));
      }
    } catch (e) { 
      console.error("Eroare la preluare date:", e); 
    } finally { 
      setIncarcare(false); 
    }
  };

  const adaugaNotaInBaza = async () => {
    if (!notaNoua.trim() || !dosarSelectat || !userId) return;

    const { error } = await supabase
      .from('appointments')
      .update({ details: notaNoua })
      .eq('id', dosarSelectat.vizite[0].id)
      .eq('user_id', userId);

    if (!error) {
      setNotaNoua("");
      preiaProgramariDinSupabase(userId);
      const updatedVizite = [...dosarSelectat.vizite];
      updatedVizite[0] = { ...updatedVizite[0], details: notaNoua };
      setDosarSelectat({ ...dosarSelectat, vizite: updatedVizite });
    }
  };

  const actualizeazaNotaExistenta = async () => {
    if (!notaDeVizualizat || !userId) return;

    const { error } = await supabase
      .from('appointments')
      .update({ details: notaDeVizualizat.details })
      .eq('id', notaDeVizualizat.id)
      .eq('user_id', userId);

    if (!error) {
      preiaProgramariDinSupabase(userId);
      const updatedVizite = dosarSelectat.vizite.map((v: any) =>
        v.id === notaDeVizualizat.id ? { ...v, details: notaDeVizualizat.details } : v
      );
      setDosarSelectat({ ...dosarSelectat, vizite: updatedVizite });
      setNotaDeVizualizat(null);
    }
  };

  const stergeNota = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!userId || !confirm("Sigur vrei să ștergi această notă?")) return;

    const { error } = await supabase
      .from('appointments')
      .update({ details: null })
      .eq('id', id)
      .eq('user_id', userId);

    if (!error) {
      preiaProgramariDinSupabase(userId);
      const updatedVizite = dosarSelectat.vizite.map((v: any) =>
        v.id === id ? { ...v, details: null } : v
      );
      setDosarSelectat({ ...dosarSelectat, vizite: updatedVizite });
    }
  };

  const stergeVizitaDefinitiv = async (idVizita: string) => {
    if (!userId || !confirm("Ești sigur că vrei să ștergi definitiv această vizită din istoric? Această acțiune nu poate fi anulată.")) return;

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', idVizita)
      .eq('user_id', userId);

    if (!error) {
      preiaProgramariDinSupabase(userId);
      const viziteRamase = dosarSelectat.vizite.filter((v: any) => v.id !== idVizita);
      if (viziteRamase.length === 0) {
        setDosarSelectat(null);
      } else {
        setDosarSelectat({ ...dosarSelectat, vizite: viziteRamase });
      }
    }
  };

  const salveazaEditareVizita = async () => {
    if (!vizitaDeEditat || !userId) return;

    const { error } = await supabase
      .from('appointments')
      .update({
        service: vizitaDeEditat.service,
        date: vizitaDeEditat.date,
        time: vizitaDeEditat.time
      })
      .eq('id', vizitaDeEditat.id)
      .eq('user_id', userId);

    if (!error) {
      preiaProgramariDinSupabase(userId);
      const updatedVizite = dosarSelectat.vizite.map((v: any) =>
        v.id === vizitaDeEditat.id ? { ...v, service: vizitaDeEditat.service, date: vizitaDeEditat.date, time: vizitaDeEditat.time } : v
      );
      setDosarSelectat({ ...dosarSelectat, vizite: updatedVizite });
      setVizitaDeEditat(null);
    }
  };

  const verificaAcces = (dataProgramare: string) => {
    const azi = new Date();
    const dataProg = new Date(dataProgramare);
    const diferentaZile = Math.ceil((azi.getTime() - dataProg.getTime()) / (1000 * 60 * 60 * 24));
    if (userPlan === "START (GRATUIT)" && diferentaZile > 90) return false;
    return true;
  };

  const rezultateFiltrate = clientiGrupati.filter(c =>
    c.nume.toLowerCase().includes(cautare.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">

        {/* HEADER PAGINĂ PREMIUM */}
        <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[50px] shadow-2xl shadow-slate-200/50 border-2 border-slate-50">
          <div>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
              DOSARE <span className="text-amber-600">CLIENȚI</span>
            </h1>
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mt-4 italic">
              MANAGEMENTUL BAZEI DE DATE • {clientiGrupati.length} PROFILE UNICE
            </p>
          </div>
          <div className="bg-slate-900 text-white px-10 py-5 rounded-[25px] shadow-2xl text-[12px] font-black uppercase tracking-widest italic border-b-4 border-slate-700">
              PLAN ACTIV: {userPlan}
          </div>
        </div>

        {/* SEARCH BAR STILIZAT */}
        <div className="relative mb-16 group">
          <input
            type="text"
            placeholder="CAUTĂ ÎN DOSARE DUPĂ NUME..."
            className="w-full p-8 pl-20 bg-white border-2 border-slate-100 rounded-[35px] outline-none focus:border-amber-500 font-black shadow-2xl shadow-slate-200/40 transition-all text-xl italic uppercase tracking-tight"
            value={cautare}
            onChange={(e) => setCautare(e.target.value)}
          />
          <span className="absolute left-8 top-1/2 -translate-y-1/2 text-3xl group-focus-within:rotate-12 transition-transform">🔍</span>
        </div>

        {/* GRID DOSARE */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {incarcare ? (
            <div className="col-span-full py-32 text-center">
                <div className="w-20 h-20 border-8 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <p className="font-black text-slate-300 uppercase italic tracking-[0.3em]">SINCRONIZARE CU SUPABASE...</p>
            </div>
          ) : rezultateFiltrate.map((client, index) => (
            <div 
              key={index} 
              onClick={() => setDosarSelectat(client)} 
              className="bg-white p-10 rounded-[45px] border-2 border-slate-50 hover:border-amber-400 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:scale-[1.03] transition-all cursor-pointer group relative overflow-hidden" 
              title={`Accesează istoricul complet pentru ${client.nume}`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[80px] -mr-10 -mt-10 group-hover:bg-amber-50 transition-colors"></div>
              <div className="flex items-center gap-6 relative z-10">
                <div className="w-20 h-20 bg-slate-900 text-amber-500 rounded-[22px] flex items-center justify-center text-3xl font-black italic shadow-xl group-hover:rotate-6 transition-transform">
                  {client.nume.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter group-hover:text-amber-600 transition-colors leading-none mb-3">{client.nume}</h3>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic">ULTIMA VIZITĂ:</span>
                    <span className="text-xs font-black text-slate-900 italic">{client.ultimaVizita}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* MODAL DOSAR CLIENT */}
        {dosarSelectat && (
          <div 
            className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 md:p-8" 
            onClick={() => setDosarSelectat(null)}
          >
            <div 
              className="bg-white w-full max-w-6xl rounded-[60px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.3)] relative flex flex-col max-h-[95vh] border-4 border-white/20" 
              onClick={e => e.stopPropagation()}
            >

              <div className="p-10 md:p-14 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-600/15 rounded-full -mr-20 -mt-20 blur-[100px]"></div>
                <div className="flex items-center gap-10 relative z-10">
                  <div className="hidden md:flex w-24 h-24 bg-amber-600 rounded-[30px] rotate-6 items-center justify-center text-4xl font-black italic shadow-2xl shadow-amber-900/40 border-4 border-amber-400/30">
                    {dosarSelectat.nume.charAt(0)}
                  </div>
                  <div>
                    <p className="text-amber-500 font-black text-[11px] uppercase tracking-[0.5em] mb-3 italic">DOSAR DIGITAL SECURIZAT</p>
                    <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">{dosarSelectat.nume}</h2>
                  </div>
                </div>
                
                <div className="flex items-center gap-5 relative z-10">
                  {dosarSelectat.telefon && (
                    <a 
                      href={`https://wa.me/${dosarSelectat.telefon.replace(/\D/g, '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-[#25D366] hover:bg-[#20ba5a] p-5 rounded-[22px] transition-all shadow-2xl flex items-center gap-4 group/wa hover:scale-105 active:scale-95" 
                      title="Deschide conversația WhatsApp"
                    >
                      <span className="text-3xl group-hover:scale-110 transition-transform">💬</span>
                      <span className="text-[12px] font-black uppercase hidden lg:inline tracking-widest">WhatsApp</span>
                    </a>
                  )}
                  <button 
                    onClick={() => setDosarSelectat(null)} 
                    className="bg-white/10 hover:bg-red-500 w-16 h-16 rounded-[22px] flex items-center justify-center transition-all text-white border-2 border-white/10 shadow-2xl hover:rotate-90" 
                    title="Închide fișa clientului"
                  >
                    <span className="text-3xl font-light">✕</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row flex-grow overflow-hidden bg-slate-50">

                <div className="w-full md:w-3/5 lg:w-2/3 p-10 md:p-16 overflow-y-auto border-r-2 border-slate-100 custom-scrollbar">
                  <div className="flex items-center justify-between mb-12">
                    <h4 className="text-[14px] font-black text-slate-400 uppercase tracking-[0.4em] italic flex items-center gap-4">
                      <span className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center text-lg shadow-sm">📅</span> CRONOLOGIE VIZITE
                    </h4>
                    <span className="text-[11px] font-black bg-slate-200 text-slate-600 px-5 py-2 rounded-full uppercase italic tracking-widest">{dosarSelectat.vizite.length} PROGRAMĂRI</span>
                  </div>

                  <div className="space-y-8">
                    {dosarSelectat.vizite.map((v: any, i: number) => {
                      const areAcces = verificaAcces(v.date);
                      return (
                        <div key={i} className={`group/item p-8 rounded-[40px] border-2 bg-white shadow-sm hover:shadow-2xl hover:border-amber-300 transition-all relative ${areAcces ? 'border-white' : 'border-dashed opacity-50 grayscale'}`}>
                          
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-2 border-slate-50 pb-6 mb-6">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-amber-50 rounded-[20px] border border-amber-100">
                                    <p className="text-[10px] font-black text-amber-600 uppercase italic tracking-widest mb-1">{v.date}</p>
                                    <p className="text-lg font-black text-slate-900 italic leading-none">{v.time || "--:--"}</p>
                                </div>
                                <div className="h-10 w-[2px] bg-slate-100 hidden md:block"></div>
                                <p className="text-lg font-black text-slate-800 uppercase italic tracking-tighter">{v.service || "SERVICIU NESPECIFICAT"}</p>
                            </div>
                            
                            <div className="flex gap-3 md:opacity-0 group-hover/item:opacity-100 transition-opacity">
                              {areAcces && (
                                <>
                                  <button 
                                    onClick={() => setVizitaDeEditat({ ...v })}
                                    className="w-12 h-12 flex items-center justify-center rounded-[18px] bg-slate-50 text-slate-600 hover:bg-amber-500 hover:text-white transition-all shadow-md hover:scale-110 active:scale-90"
                                    title="Modifică detaliile vizitei"
                                  >
                                    ✏️
                                  </button>
                                  <button 
                                    onClick={() => stergeVizitaDefinitiv(v.id)}
                                    className="w-12 h-12 flex items-center justify-center rounded-[18px] bg-slate-50 text-slate-600 hover:bg-red-500 hover:text-white transition-all shadow-md hover:scale-110 active:scale-90"
                                    title="Șterge definitiv programarea"
                                  >
                                    🗑️
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {v.details && (
                             <div className="bg-slate-50/80 p-6 rounded-[25px] italic text-sm font-black text-slate-500 border-2 border-white shadow-inner">
                               "{v.details}"
                             </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="w-full md:w-2/5 lg:w-1/3 p-10 md:p-16 bg-white overflow-y-auto custom-scrollbar">
                  <h4 className="text-[14px] font-black text-slate-400 uppercase tracking-[0.4em] italic mb-10 flex items-center gap-4">
                    <span className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-lg shadow-sm">📝</span> ÎNSEMNĂRI
                  </h4>

                  <div className="space-y-6 mb-12">
                    <textarea
                      className="w-full bg-slate-50 border-2 border-slate-100 p-8 rounded-[35px] font-black text-slate-900 text-sm outline-none focus:border-amber-400 transition-all resize-none italic shadow-inner uppercase tracking-tight"
                      rows={6}
                      placeholder="ADAUGĂ O OBSERVAȚIE..."
                      value={notaNoua}
                      onChange={(e) => setNotaNoua(e.target.value)}
                    />
                    <button 
                      onClick={adaugaNotaInBaza} 
                      className="w-full bg-slate-900 text-white py-6 rounded-[25px] font-black text-[12px] uppercase tracking-[0.3em] italic hover:bg-amber-600 transition-all shadow-2xl border-b-4 border-slate-700 active:border-b-0 active:translate-y-1"
                    >
                      SALVEAZĂ ÎN FIȘĂ
                    </button>
                  </div>

                  <div className="space-y-6">
                    <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em] border-b-2 border-slate-50 pb-4 italic">ARHIVĂ NOTE</p>
                    {dosarSelectat.vizite.filter((v: any) => v.details).length === 0 ? (
                        <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[40px]">
                            <p className="text-[11px] text-slate-300 italic font-black uppercase tracking-widest">Niciun istoric salvat.</p>
                        </div>
                    ) : (
                        dosarSelectat.vizite.filter((v: any) => v.details).map((v: any, idx: number) => (
                          <div
                            key={idx}
                            onClick={() => setNotaDeVizualizat({ ...v })}
                            className="bg-white p-7 rounded-[35px] border-2 border-slate-50 group relative cursor-pointer hover:shadow-2xl hover:border-amber-200 transition-all hover:-rotate-1"
                          >
                            <button
                              onClick={(e) => stergeNota(e, v.id)}
                              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-red-500 hover:text-white transition-all text-xs font-black shadow-sm"
                            >
                              ✕
                            </button>
                            <span className="text-[10px] font-black text-amber-600 mb-3 block uppercase tracking-widest italic">{v.date}</span>
                            <p className="text-[13px] font-black text-slate-700 italic leading-relaxed line-clamp-3 uppercase tracking-tight">"{v.details}"</p>
                            <div className="mt-5 flex items-center justify-end">
                                <span className="text-[9px] font-black uppercase text-slate-300 italic group-hover:text-amber-600 transition-colors">EDITEAZĂ ➔</span>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>

              <div className="p-10 border-t-2 border-slate-50 text-center bg-white flex justify-center">
                <button 
                  onClick={() => setDosarSelectat(null)} 
                  className="px-20 py-5 bg-slate-100 text-slate-500 rounded-full font-black text-[12px] uppercase tracking-[0.4em] italic hover:bg-slate-200 transition-all border-2 border-slate-200/50 shadow-xl shadow-slate-200/50"
                >
                  ÎNCHIDE DOSARUL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EDITOR VIZITĂ */}
        {vizitaDeEditat && (
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[150] flex items-center justify-center p-6" onClick={() => setVizitaDeEditat(null)}>
            <div className="bg-white w-full max-w-md rounded-[55px] p-12 shadow-[0_0_80px_rgba(0,0,0,0.4)] relative border-4 border-white/20" onClick={e => e.stopPropagation()}>
              <div className="text-center mb-10">
                <h3 className="text-3xl font-black uppercase italic text-slate-900 tracking-tighter">MODIFICĂ <span className="text-amber-600">VIZITA</span></h3>
                <div className="h-2 w-16 bg-amber-600 mx-auto mt-4 rounded-full"></div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-5 mb-3 block tracking-[0.2em] italic">SERVICIU PRESTAT</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border-2 border-slate-100 p-6 rounded-[25px] font-black outline-none focus:border-amber-400 transition-all italic uppercase"
                    value={vizitaDeEditat.service || ""}
                    onChange={e => setVizitaDeEditat({...vizitaDeEditat, service: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-400 ml-5 mb-3 block tracking-[0.2em] italic">DATĂ NOUĂ</label>
                    <input 
                      type="date" 
                      className="w-full bg-slate-50 border-2 border-slate-100 p-6 rounded-[25px] font-black outline-none focus:border-amber-400 transition-all italic"
                      value={vizitaDeEditat.date || ""}
                      onChange={e => setVizitaDeEditat({...vizitaDeEditat, date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-400 ml-5 mb-3 block tracking-[0.2em] italic">ORA</label>
                    <input 
                      type="time" 
                      className="w-full bg-slate-50 border-2 border-slate-100 p-6 rounded-[25px] font-black outline-none focus:border-amber-400 transition-all italic"
                      value={vizitaDeEditat.time || ""}
                      onChange={e => setVizitaDeEditat({...vizitaDeEditat, time: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 mt-12">
                <button 
                  onClick={salveazaEditareVizita} 
                  className="w-full py-6 bg-slate-900 text-white rounded-[25px] font-black text-[13px] uppercase tracking-[0.3em] italic hover:bg-amber-600 transition-all shadow-2xl border-b-4 border-slate-700 active:border-b-0 active:translate-y-1"
                >
                  ACTUALIZEAZĂ ACUM
                </button>
                <button 
                  onClick={() => setVizitaDeEditat(null)} 
                  className="w-full py-4 text-slate-300 font-black text-[11px] uppercase tracking-widest hover:text-red-500 transition-colors italic"
                >
                  ANULEAZĂ MODIFICĂRILE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EDITOR NOTĂ */}
        {notaDeVizualizat && (
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[120] flex items-center justify-center p-6" onClick={() => setNotaDeVizualizat(null)}>
            <div className="bg-white w-full max-w-2xl rounded-[60px] p-12 shadow-2xl relative border-4 border-amber-500/10" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-10 border-b-2 border-slate-50 pb-8">
                <div>
                    <p className="text-[12px] font-black text-amber-600 uppercase tracking-[0.4em] italic mb-2">EDITOR ÎNSEMNĂRI</p>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 italic uppercase tracking-tighter">VIZITA DIN {notaDeVizualizat.date}</h3>
                </div>
                <button onClick={() => setNotaDeVizualizat(null)} className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-red-500 transition-all shadow-sm border border-slate-100">✕</button>
              </div>
              <textarea
                className="w-full min-h-[300px] bg-slate-50 border-2 border-slate-100 p-10 rounded-[40px] font-black text-slate-800 text-xl leading-relaxed italic outline-none focus:border-amber-400 transition-all resize-none shadow-inner uppercase tracking-tight"
                value={notaDeVizualizat.details || ""}
                onChange={(e) => setNotaDeVizualizat({ ...notaDeVizualizat, details: e.target.value })}
                autoFocus
              />
              <div className="flex flex-col md:flex-row gap-5 mt-12">
                <button onClick={() => setNotaDeVizualizat(null)} className="flex-1 py-6 bg-slate-100 text-slate-400 rounded-[25px] font-black text-[12px] uppercase tracking-widest hover:bg-slate-200 transition-all italic">ABANDONEAZĂ</button>
                <button 
                  onClick={actualizeazaNotaExistenta} 
                  className="flex-[2] py-6 bg-slate-900 text-white rounded-[25px] font-black text-[12px] uppercase tracking-[0.3em] italic hover:bg-amber-600 transition-all shadow-2xl border-b-4 border-slate-700 active:border-b-0 active:translate-y-1"
                >
                  SALVEAZĂ MODIFICĂRILE
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; border: 3px solid #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </main>
  );
}