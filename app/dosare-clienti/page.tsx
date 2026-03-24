"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

export default function IstoricPage() {
  const [clientiGrupati, setClientiGrupati] = useState<any[]>([]);
  const [incarcare, setIncarcare] = useState(true);
  const [cautare, setCautare] = useState("");
  const [userPlan, setUserPlan] = useState("START (GRATUIT)");
  const [dosarSelectat, setDosarSelectat] = useState<any | null>(null);
  const [notaNoua, setNotaNoua] = useState("");
  const [notaDeVizualizat, setNotaDeVizualizat] = useState<any | null>(null);

  const getSupabase = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
  };

  useEffect(() => {
    const plan = localStorage.getItem("user_plan") || "START (GRATUIT)";
    setUserPlan(plan);
    preiaProgramariDinSupabase();
  }, []);

  const preiaProgramariDinSupabase = async () => {
    const supabase = getSupabase();
    if (!supabase) { setIncarcare(false); return; }
    setIncarcare(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
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
    } catch (e) { console.error(e); } finally { setIncarcare(false); }
  };

  const adaugaNotaInBaza = async () => {
    if (!notaNoua.trim() || !dosarSelectat) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from('appointments')
      .update({ details: notaNoua })
      .eq('id', dosarSelectat.vizite[0].id);

    if (!error) {
      setNotaNoua("");
      preiaProgramariDinSupabase();
      const updatedVizite = [...dosarSelectat.vizite];
      updatedVizite[0].details = notaNoua;
      setDosarSelectat({ ...dosarSelectat, vizite: updatedVizite });
    }
  };

  const actualizeazaNotaExistenta = async () => {
    if (!notaDeVizualizat) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from('appointments')
      .update({ details: notaDeVizualizat.details })
      .eq('id', notaDeVizualizat.id);

    if (!error) {
      preiaProgramariDinSupabase();
      // Update local în dosarul selectat
      const updatedVizite = dosarSelectat.vizite.map((v: any) =>
        v.id === notaDeVizualizat.id ? { ...v, details: notaDeVizualizat.details } : v
      );
      setDosarSelectat({ ...dosarSelectat, vizite: updatedVizite });
      setNotaDeVizualizat(null);
    }
  };

  const stergeNota = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Sigur vrei să ștergi această notă?")) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from('appointments')
      .update({ details: null })
      .eq('id', id);

    if (!error) {
      preiaProgramariDinSupabase();
      const updatedVizite = dosarSelectat.vizite.map((v: any) =>
        v.id === id ? { ...v, details: null } : v
      );
      setDosarSelectat({ ...dosarSelectat, vizite: updatedVizite });
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
      <div className="max-w-6xl mx-auto">

        <div className="mb-10 text-center md:text-left">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
            Dosare <span className="text-amber-600">Clienți</span>
          </h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-3 italic">
            Database • {clientiGrupati.length} Profile unice
          </p>
        </div>

        <div className="relative mb-10">
          <input
            type="text"
            placeholder="Caută în dosarele clienților..."
            className="w-full p-5 pl-14 bg-white border-2 border-slate-100 rounded-[25px] outline-none focus:border-amber-500 font-bold shadow-sm transition-all"
            value={cautare}
            onChange={(e) => setCautare(e.target.value)}
          />
          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl opacity-30">🔍</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {incarcare ? (
            <p className="text-center col-span-3 font-black text-slate-300 animate-pulse uppercase italic">Se încarcă baza de date...</p>
          ) : rezultateFiltrate.map((client, index) => (
            <div key={index} onClick={() => setDosarSelectat(client)} className="bg-white p-6 rounded-[35px] border-2 border-slate-100 hover:border-amber-400 hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 text-amber-500 rounded-[15px] flex items-center justify-center text-lg font-black italic">{client.nume.charAt(0)}</div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter group-hover:text-amber-600 transition-colors leading-none">{client.nume}</h3>
                  <p className="text-[8px] font-black text-slate-400 uppercase mt-1 tracking-widest italic">Ultima vizită: {client.ultimaVizita}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* MODAL DOSAR CLIENT */}
        {dosarSelectat && (
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setDosarSelectat(null)}>
            <div className="bg-white w-full max-w-5xl rounded-[40px] overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

              <div className="p-8 bg-slate-900 text-white flex justify-between items-center border-b border-white/5">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-amber-500 font-black text-[9px] uppercase tracking-[0.3em] mb-1">Fișă Client</p>
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">{dosarSelectat.nume}</h2>
                  </div>
                  {dosarSelectat.telefon && (
                    <a href={`https://wa.me/${dosarSelectat.telefon.replace(/\D/g, '')}`} target="_blank" className="bg-[#25D366] hover:scale-105 p-3 rounded-2xl transition-all shadow-lg flex items-center gap-2">
                      <span className="text-xl">💬</span>
                      <span className="text-[10px] font-black uppercase hidden md:inline">WhatsApp</span>
                    </a>
                  )}
                </div>
                <button onClick={() => setDosarSelectat(null)} className="bg-white/10 hover:bg-white/20 w-10 h-10 rounded-full flex items-center justify-center transition-all text-white font-bold">✕</button>
              </div>

              <div className="flex flex-col md:flex-row flex-grow overflow-hidden bg-slate-50">

                <div className="w-full md:w-2/3 p-8 overflow-y-auto border-r border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 italic flex items-center gap-2">
                    <span className="text-lg">📅</span> Istoric Activitate
                  </p>
                  <div className="space-y-4">
                    {dosarSelectat.vizite.map((v: any, i: number) => {
                      const areAcces = verificaAcces(v.date);
                      return (
                        <div key={i} className={`p-5 rounded-[25px] border-2 bg-white flex flex-col gap-2 ${areAcces ? 'border-slate-100' : 'border-dashed opacity-50'}`}>
                          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                            <p className="text-[10px] font-black text-amber-600 uppercase italic">{v.date} — {v.time || "Ora nespecificată"}</p>
                            {areAcces && <span className="text-xs">📋</span>}
                          </div>
                          <p className="text-xs font-bold text-slate-800 uppercase italic">{v.service || "Fără titlu serviciu"}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="w-full md:w-1/3 p-8 bg-white overflow-y-auto">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 italic flex items-center gap-2">
                    <span className="text-lg">📝</span> Note Dosar
                  </p>

                  <div className="space-y-4 mb-8">
                    <textarea
                      className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-[20px] font-bold text-slate-900 text-sm outline-none focus:border-amber-400 transition-all resize-none"
                      rows={4}
                      placeholder="Adaugă o notă nouă..."
                      value={notaNoua}
                      onChange={(e) => setNotaNoua(e.target.value)}
                    />
                    <button onClick={adaugaNotaInBaza} className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-amber-500 hover:text-slate-900 transition-all shadow-md">
                      Salvează în dosar
                    </button>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-100 pb-2">Însemnări</p>
                    {dosarSelectat.vizite.filter((v: any) => v.details).map((v: any, idx: number) => (
                      <div
                        key={idx}
                        onClick={() => setNotaDeVizualizat({ ...v })}
                        className="bg-amber-50/50 p-4 rounded-2xl border-l-4 border-amber-400 group relative cursor-pointer hover:bg-amber-100 transition-colors"
                      >
                        <button
                          onClick={(e) => stergeNota(e, v.id)}
                          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-white/50 text-slate-400 hover:bg-red-500 hover:text-white transition-all text-[10px] font-bold"
                        >
                          ✕
                        </button>

                        <p className="text-[8px] font-black text-slate-400 mb-1 uppercase tracking-tighter">{v.date}</p>
                        <p className="text-xs font-bold text-slate-700 italic leading-relaxed line-clamp-3">
                          {v.details}
                        </p>
                        <p className="mt-2 text-[8px] font-black uppercase text-amber-600 opacity-60 italic">Editează ➔</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 text-center bg-white">
                <button onClick={() => setDosarSelectat(null)} className="px-10 py-3 bg-slate-100 text-slate-500 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Închide Fișa</button>
              </div>
            </div>
          </div>
        )}

        {/* POP-UP EDITOR PENTRU NOTĂ (EDITABIL) */}
        {notaDeVizualizat && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[120] flex items-center justify-center p-6" onClick={() => setNotaDeVizualizat(null)}>
            <div className="bg-white w-full max-w-lg rounded-[40px] p-8 shadow-2xl relative border-4 border-amber-400" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <p className="text-[11px] font-black text-amber-600 uppercase tracking-[0.2em] italic">Editează Notă • {notaDeVizualizat.date}</p>
                <button onClick={() => setNotaDeVizualizat(null)} className="text-slate-300 hover:text-slate-900 text-xl font-bold transition-colors">✕</button>
              </div>
              
              <div className="max-h-[50vh] overflow-y-auto pr-2">
                <textarea
                  className="w-full min-h-[200px] bg-slate-50 border-2 border-slate-100 p-6 rounded-[25px] font-bold text-slate-800 text-lg leading-relaxed italic outline-none focus:border-amber-400 transition-all resize-none"
                  value={notaDeVizualizat.details}
                  onChange={(e) => setNotaDeVizualizat({ ...notaDeVizualizat, details: e.target.value })}
                  placeholder="Modifică detaliile notei aici..."
                  autoFocus
                />
              </div>
              
              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setNotaDeVizualizat(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-[20px] font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Anulează
                </button>
                <button
                  onClick={actualizeazaNotaExistenta}
                  className="flex-[2] py-4 bg-slate-900 text-white rounded-[20px] font-black text-[11px] uppercase tracking-widest hover:bg-amber-500 hover:text-slate-900 transition-all shadow-lg"
                >
                  Salvează Modificările
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}