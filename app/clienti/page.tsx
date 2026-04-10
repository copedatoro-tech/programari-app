"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function BazaDateClienti() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [dosare, setDosare] = useState<any[]>([]);
  const [incarcare, setIncarcare] = useState(true);
  const [cautare, setCautare] = useState("");
  const [dosarSelectat, setDosarSelectat] = useState<any | null>(null);

  // --- 1. Preluare date ---
  const incarcaDateClienti = useCallback(async (currentUserId: string) => {
    const { data, error } = await supabase
      .from('client_cases')
      .select('*')
      .eq('user_id', currentUserId)
      .order('client_name', { ascending: true });

    if (error) {
      console.error("❌ Eroare Supabase la citire:", error.message);
      return;
    }
    if (data) setDosare(data);
  }, []);

  // --- 2. Sincronizare Inteligentă (Protecție Nume + Evitare Duplicate) ---
  const sincronizareBackground = async (currentUserId: string) => {
    try {
      const [aptRes, casesRes] = await Promise.all([
        supabase.from('appointments').select('*').eq('user_id', currentUserId),
        supabase.from('client_cases').select('*').eq('user_id', currentUserId)
      ]);

      if (aptRes.error || !aptRes.data) return;

      const programari = aptRes.data;
      const existenteInDB = casesRes.data || [];

      // Creăm un map cu clienții existenți folosind numărul de telefon curățat ca cheie
      const mapDB = new Map();
      existenteInDB.forEach(d => {
        const telKey = d.phone_number?.replace(/\D/g, '');
        if (telKey) mapDB.set(telKey, d);
      });

      const deProcesat = new Map();

      for (const prog of programari) {
        // Curățăm numărul de telefon pentru comparație
        const tel = (prog.phone || "").replace(/\D/g, '');
        if (!tel) continue; // Dacă nu are telefon, nu îl putem unifica automat aici

        const dataProgr = prog.date ? new Date(prog.date).toLocaleDateString('ro-RO') : '---';
        const oraProgr = prog.time ? ` la ora ${prog.time}` : '';
        const linieIstoric = `• ${dataProgr}${oraProgr}: ${prog.nume_serviciu || 'Serviciu'}`;
        
        const numeDinProgr = prog.nume && prog.nume !== "Client Nou" && prog.nume.trim() !== "" ? prog.nume : null;
        const emailDinProgr = prog.email ? prog.email.toLowerCase().trim() : null;

        const existent = mapDB.get(tel);
        
        if (existent) {
          // Luăm datele actuale (fie din DB, fie ce am procesat deja în această buclă)
          const currentData = deProcesat.get(tel) || { ...existent };
          let modified = false;

          // REGULA DE PROTECȚIE: Nu suprascriem dacă numele e deja setat manual (diferit de "Client Nou")
          const numeActual = currentData.client_name?.trim();
          if ((!numeActual || numeActual === "Client Nou") && numeDinProgr) {
            currentData.client_name = numeDinProgr;
            modified = true;
          }

          if (!currentData.client_email && emailDinProgr) {
            currentData.client_email = emailDinProgr;
            modified = true;
          }

          // Verificăm dacă vizita e deja în descriere pentru a evita dublarea textului
          if (!currentData.description?.includes(dataProgr)) {
            currentData.description = `${currentData.description || ""}\n${linieIstoric}`;
            modified = true;
          }
          
          if (modified) deProcesat.set(tel, currentData);
        } else {
          // Client nou care nu există deloc în tabelul client_cases
          const inCurs = deProcesat.get(tel);
          if (inCurs) {
            if (numeDinProgr && (inCurs.client_name === "Client Nou" || !inCurs.client_name)) {
              inCurs.client_name = numeDinProgr;
            }
            if (!inCurs.description.includes(dataProgr)) {
              inCurs.description += `\n${linieIstoric}`;
            }
          } else {
            deProcesat.set(tel, {
              user_id: currentUserId,
              client_name: numeDinProgr || "Client Nou",
              client_email: emailDinProgr || "",
              phone_number: tel,
              case_type: "Dosar Client",
              status: "Activ",
              description: `ISTORIC:\n${linieIstoric}`,
              poza: prog.poza || null
            });
          }
        }
      }

      if (deProcesat.size > 0) {
        const { error: upsertErr } = await supabase
          .from('client_cases')
          .upsert(Array.from(deProcesat.values()), { 
            onConflict: 'user_id,phone_number' 
          });

        if (!upsertErr) {
          incarcaDateClienti(currentUserId);
        }
      }
    } catch (e) {
      console.error("🔥 Eroare critică la sincronizare:", e);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.push("/login"); return; }
      const uid = session.user.id;
      setUserId(uid);
      await incarcaDateClienti(uid);
      setIncarcare(false);
      sincronizareBackground(uid);
    };
    init();
  }, [router, incarcaDateClienti]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !dosarSelectat || !userId) return;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${dosarSelectat.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('appointment-photos').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('appointment-photos').getPublicUrl(fileName);
      await actualizeazaCampDosar('poza', publicUrl);
    } catch (err) { alert("Eroare la încărcare imagine."); }
  };

  const actualizeazaCampDosar = async (camp: string, valoare: string) => {
    if (!dosarSelectat || !userId) return;
    
    // Optimizare: Nu trimite update dacă valoarea este identică
    if (dosarSelectat[camp] === valoare) return;

    const { error } = await supabase
      .from('client_cases')
      .update({ [camp]: valoare })
      .eq('id', dosarSelectat.id);

    if (!error) {
      setDosarSelectat((prev: any) => ({ ...prev, [camp]: valoare }));
      setDosare(prev => prev.map(d => d.id === dosarSelectat.id ? { ...d, [camp]: valoare } : d));
    } else {
      console.error("Eroare la update:", error.message);
    }
  };

  const stergeDosar = async (id: string) => {
    if (!confirm("Ștergi acest client definitiv?")) return;
    const { error } = await supabase.from('client_cases').delete().eq('id', id);
    if (!error) {
      setDosare(prev => prev.filter(d => d.id !== id));
      setDosarSelectat(null);
    }
  };

  const filtrati = useMemo(() => {
    const t = cautare.toLowerCase().trim();
    if (!t) return dosare;
    return dosare.filter(d => 
      (d.client_name || "").toLowerCase().includes(t) || 
      (d.phone_number || "").includes(t)
    );
  }, [dosare, cautare]);

  return (
    <main className="min-h-screen bg-slate-50/50 p-4 md:p-12 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-12 bg-white p-10 rounded-[50px] shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900">
              Bază Date <span className="text-amber-500 underline decoration-4 underline-offset-8">Clienți</span>
            </h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase mt-4 tracking-[0.3em] flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              {dosare.length} Profile Identificate
            </p>
          </div>

          <div className="relative w-full md:w-96">
            <input
              type="text"
              placeholder="CAUTĂ CLIENT..."
              className="w-full p-6 pl-16 bg-slate-50 border-2 border-transparent focus:border-amber-500 rounded-[30px] outline-none font-black italic shadow-inner transition-all uppercase text-sm"
              value={cautare}
              onChange={(e) => setCautare(e.target.value)}
            />
            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl opacity-20">🔍</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {incarcare && dosare.length === 0 ? (
            <div className="col-span-full py-32 text-center font-black text-slate-200 text-3xl italic uppercase animate-pulse tracking-widest">
              Sincronizare bază date...
            </div>
          ) : filtrati.length === 0 ? (
            <div className="col-span-full py-32 text-center bg-white rounded-[50px] border-2 border-dashed border-slate-100">
                <span className="text-6xl block mb-4">📭</span>
                <p className="font-black text-slate-400 text-xl uppercase italic">Niciun client găsit</p>
            </div>
          ) : (
            filtrati.map((d) => (
              <div
                key={d.id}
                onClick={() => setDosarSelectat(d)}
                className="group bg-white p-6 rounded-[40px] border border-slate-100 hover:border-amber-400 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex items-center gap-6"
              >
                <div className="w-20 h-20 shrink-0 bg-slate-900 rounded-[25px] overflow-hidden flex items-center justify-center border-4 border-slate-50 group-hover:scale-105 transition-transform shadow-lg">
                  {d.poza ? (
                    <img src={d.poza} className="w-full h-full object-cover" alt="Client" />
                  ) : (
                    <span className="text-2xl font-black text-amber-500 italic">{(d.client_name || "C").charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-slate-900 uppercase italic truncate tracking-tight text-lg">{d.client_name}</h3>
                  <p className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md inline-block mt-1">{d.phone_number || "FĂRĂ TELEFON"}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {dosarSelectat && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setDosarSelectat(null)}>
            <div className="bg-white w-full max-w-4xl rounded-[60px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-8">
                  <label className="cursor-pointer group relative">
                    <div title="Schimbă Poza" className="w-24 h-24 bg-amber-500 rounded-[30px] flex items-center justify-center text-3xl font-black italic shadow-lg overflow-hidden border-2 border-amber-400 group-hover:opacity-80 transition-all">
                      {dosarSelectat.poza ? <img src={dosarSelectat.poza} className="w-full h-full object-cover" /> : (dosarSelectat.client_name || "C").charAt(0)}
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                  <div>
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">Dosar <span className="text-amber-500">Client</span></h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest">{dosarSelectat.status}</p>
                  </div>
                </div>
                <button title="Închide" onClick={() => setDosarSelectat(null)} className="w-14 h-14 flex items-center justify-center bg-white/10 rounded-2xl hover:bg-red-500 transition-all text-xl">✕</button>
              </div>
              
              <div className="p-10 overflow-y-auto bg-slate-50 flex-grow">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase italic mb-2">Nume Complet</p>
                    <input className="w-full bg-transparent font-black italic text-xl outline-none focus:text-amber-600 uppercase" value={dosarSelectat.client_name} onChange={e => setDosarSelectat({...dosarSelectat, client_name: e.target.value})} onBlur={e => actualizeazaCampDosar('client_name', e.target.value)} />
                  </div>
                  <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase italic mb-2">Status Vizibilitate</p>
                    <select className="w-full bg-transparent font-black italic text-amber-600 outline-none uppercase" value={dosarSelectat.status} onChange={e => actualizeazaCampDosar('status', e.target.value)}>
                      <option value="Activ">🟢 Profil Activ</option>
                      <option value="Inchis">🔴 Profil Arhivat</option>
                    </select>
                  </div>
                  <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase italic mb-2">Email Contact</p>
                    <input className="w-full bg-transparent font-bold italic outline-none text-slate-600" value={dosarSelectat.client_email || ""} readOnly />
                  </div>
                  <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase italic mb-2">Telefon</p>
                    <input className="w-full bg-transparent font-bold italic outline-none text-slate-600" value={dosarSelectat.phone_number || ""} readOnly />
                  </div>
                </div>

                <div className="px-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase italic mb-3 ml-2">Istoric Servicii & Note</p>
                  <textarea 
                    className="w-full p-8 bg-white border border-slate-100 rounded-[40px] min-h-[250px] outline-none font-medium italic text-slate-600 text-sm focus:border-amber-200 shadow-sm transition-all"
                    value={dosarSelectat.description || ""}
                    onChange={e => setDosarSelectat({...dosarSelectat, description: e.target.value})}
                    onBlur={e => actualizeazaCampDosar('description', e.target.value)}
                  />
                </div>

                <div className="mt-10 flex justify-between items-center px-6">
                  <button title="Atenție: Acțiunea este ireversibilă" onClick={() => stergeDosar(dosarSelectat.id)} className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase italic tracking-widest">Elimină Client</button>
                  <button onClick={() => setDosarSelectat(null)} className="px-12 py-5 bg-slate-900 text-white rounded-[25px] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-amber-600 transition-all shadow-lg">Finalizează</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}