"use client";

import { useState, useEffect, Suspense, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import Image from "next/image";

function RezervareContent() {
  const searchParams = useSearchParams();
  const adminId = searchParams.get("id") || "ed9cd915-6684-422c-a214-4ac5c25e98f3";

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [trimis, setTrimis] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingConfig, setFetchingConfig] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  
  const [specialisti, setSpecialisti] = useState<any[]>([]);
  const [servicii, setServicii] = useState<any[]>([]);
  const [manualBlocks, setManualBlocks] = useState<any>({});

  // State-uri pentru Feedback
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [numeFeedback, setNumeFeedback] = useState("");
  const [mesajFeedback, setMesajFeedback] = useState("");
  const [trimisFeedback, setTrimisFeedback] = useState(false);
  const [incarcareFeedback, setIncarcareFeedback] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({ 
    nume: "", 
    telefon: "", 
    email: "", 
    data: today, 
    ora: "09:00", 
    motiv: "",
    serviciu: "",
    specialist_id: "Oricine" 
  });

  const [selectedHour, setSelectedHour] = useState("09");
  const [selectedMinute, setSelectedMinute] = useState("00");

  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };
    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPicker]);

  useEffect(() => {
    setForm(prev => ({ ...prev, ora: `${selectedHour}:${selectedMinute}` }));
  }, [selectedHour, selectedMinute]);

  const preiaFeedback = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("feedbacks")
        .select("*")
        .eq("aprobat", true)
        .order("created_at", { ascending: false });
      if (!error && data) setFeedbacks(data);
    } catch (err) {
      console.error("Eroare preluare feedback:", err);
    }
  }, [supabase]);

  const fetchAdminConfig = useCallback(async () => {
    setFetchingConfig(true);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('services, staff, manual_blocks')
        .eq('id', adminId)
        .single();

      if (profile) {
        const proceseaza = (val: any) => {
          if (!val) return [];
          let curat = typeof val === 'string' ? JSON.parse(val) : val;
          if (typeof curat === 'string') curat = JSON.parse(curat);
          return Array.isArray(curat) ? curat : [];
        };

        setServicii(proceseaza(profile.services));
        setSpecialisti(proceseaza(profile.staff));
        setManualBlocks(profile.manual_blocks || {});
      }
      await preiaFeedback();
    } catch (e) {
      console.error("Eroare la încărcare config:", e);
    } finally {
      setFetchingConfig(false);
    }
  }, [adminId, supabase, preiaFeedback]);

  useEffect(() => {
    fetchAdminConfig();
  }, [fetchAdminConfig]);

  // LOGICA DE TRIMITERE FEEDBACK DIRECT CĂTRE PAGINA DE ADMIN
  const trimiteFeedback = async () => {
    if (rating === 0) return alert("Te rugăm să alegi numărul de stele!");
    if (!numeFeedback.trim() || !mesajFeedback.trim()) return alert("Te rugăm să completezi numele și mesajul!");

    setIncarcareFeedback(true);
    try {
      const { error } = await supabase.from("feedbacks").insert([
        { 
          nume_client: numeFeedback.trim(), 
          stele: rating, 
          comentariu: mesajFeedback.trim(), 
          aprobat: false // Se trimite către admin pentru verificare
        }
      ]);

      if (!error) {
        setTrimisFeedback(true);
        setNumeFeedback("");
        setMesajFeedback("");
        setRating(0);
        // Notificare de succes temporară
        setTimeout(() => setTrimisFeedback(false), 5000);
      } else {
        alert("Eroare: " + error.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIncarcareFeedback(false);
    }
  };

  const specialistiFiltrati = useMemo(() => {
    if (!form.serviciu) return specialisti;
    return specialisti.filter(sp => (sp.servicii || []).includes(form.serviciu));
  }, [form.serviciu, specialisti]);

  const serviciiFiltrate = useMemo(() => {
    if (form.specialist_id === "Oricine") return servicii;
    const specialistSelectat = specialisti.find(s => s.nume === form.specialist_id);
    if (!specialistSelectat || !specialistSelectat.servicii) return [];
    return servicii.filter(s => specialistSelectat.servicii.includes(s.nume || s.name));
  }, [form.specialist_id, servicii, specialisti]);

  useEffect(() => {
    if (form.serviciu && !serviciiFiltrate.some(s => (s.nume || s.name) === form.serviciu)) {
      setForm(prev => ({ ...prev, serviciu: "" }));
    }
    if (form.specialist_id !== "Oricine" && !specialistiFiltrati.some(s => s.nume === form.specialist_id)) {
      setForm(prev => ({ ...prev, specialist_id: "Oricine" }));
    }
  }, [serviciiFiltrate, specialistiFiltrati, form.serviciu, form.specialist_id]);

  const isTimeBlocked = (h: string, m: string) => {
    const timeStr = `${h}:${m}`;
    const blockedForDay = manualBlocks[form.data] || [];
    return blockedForDay.includes(timeStr);
  };

  const trimiteRezervare = async (e: React.FormEvent) => {
    e.preventDefault();

    const confirmare = window.confirm("Ești sigur că datele introduse sunt corecte?");
    if (!confirmare) return;

    const telefonCurat = form.telefon.replace(/\s/g, "");
    
    if (telefonCurat.length < 10) {
      alert("⚠️ Te rugăm să introduci un număr de telefon valid.");
      return;
    }

    const ultimaRezervare = localStorage.getItem("last_booking_timestamp");
    const acum = Date.now();
    if (ultimaRezervare && acum - parseInt(ultimaRezervare) < 60000) {
      alert("⚠️ Securitate: Te rugăm să aștepți un minut între rezervări.");
      return;
    }

    if (!form.nume || !form.telefon || !form.serviciu) {
      alert("⚠️ Te rugăm să completezi toate datele obligatorii.");
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.from('appointments').insert([{
      user_id: adminId,
      full_name: form.nume.trim(),
      phone: telefonCurat,
      date: form.data,
      time: form.ora,
      service: form.serviciu,
      staff_member: form.specialist_id,
      status: "pending",
      is_client_booking: true
    }]);

    if (!error) {
      localStorage.setItem("last_booking_timestamp", acum.toString());
      setTrimis(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      alert("Eroare la procesare: " + error.message);
    }
    setLoading(false);
  };

  if (fetchingConfig) return (
    <div className="min-h-screen flex items-center justify-center bg-white font-black text-slate-900 italic uppercase animate-pulse tracking-[0.2em] text-xs">
      Se încarcă calendarul Chronos...
    </div>
  );

  if (trimis) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
        <div className="w-24 h-24 bg-slate-900 text-amber-500 rounded-[35px] flex items-center justify-center text-4xl shadow-2xl mb-8 border-b-4 border-amber-600">✓</div>
        <h1 className="text-3xl font-black uppercase italic text-slate-900 tracking-tighter">SOLICITARE TRIMISĂ!</h1>
        <p className="mt-4 text-slate-500 font-bold text-xs uppercase italic tracking-widest max-w-xs">
          Verifică telefonul. Vei primi un apel sau mesaj pentru confirmarea intervalului.
        </p>
        <button onClick={() => window.location.reload()} className="mt-10 px-10 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase italic text-[10px] tracking-widest hover:bg-amber-600 transition-all shadow-lg active:scale-95">REZERVĂ DIN NOU</button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col items-center p-4 md:p-12 font-sans text-slate-900 relative">
      <style jsx global>{`
        nav, header:not(.local-header), .menu-button, button[title="MENU"] {
          display: none !important;
        }
      `}</style>

      {/* SECȚIUNE REZERVARE */}
      <div className="w-full max-w-lg bg-white rounded-[45px] shadow-2xl border border-slate-200 overflow-hidden z-10 mb-20">
        <div className="bg-slate-900 p-10 text-white text-center local-header relative overflow-hidden flex flex-col items-center">
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
          <div className="mb-4">
            <Image src="/logo-chronos.png" alt="Logo Chronos" width={50} height={50} className="object-contain" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter leading-none">
            PROGRAMARE <span className="text-amber-500 underline decoration-2 underline-offset-8">ONLINE</span>
          </h1>
          <p className="text-[9px] font-bold text-slate-400 mt-4 tracking-[0.4em] uppercase opacity-70">Sistem de gestiune Chronos</p>
        </div>

        <form onSubmit={trimiteRezervare} className="p-8 md:p-12 space-y-7">
          <div className="space-y-4">
            <input type="text" required className="w-full p-6 bg-slate-50 rounded-[22px] border-2 border-slate-100 focus:border-amber-500 focus:bg-white outline-none font-black text-sm uppercase transition-all" placeholder="NUME ȘI PRENUME" value={form.nume} onChange={e => setForm({...form, nume: e.target.value})} />
            <input type="tel" required className="w-full p-6 bg-slate-50 rounded-[22px] border-2 border-slate-100 focus:border-amber-500 focus:bg-white outline-none font-black text-sm transition-all" placeholder="TELEFON (EX: 0722...)" value={form.telefon} onChange={e => setForm({...form, telefon: e.target.value})} />
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 ml-3 italic tracking-widest">Serviciu dorit</label>
              <select required className="w-full p-6 bg-slate-50 rounded-[22px] border-2 border-slate-100 focus:border-amber-500 outline-none font-black text-sm uppercase italic cursor-pointer appearance-none transition-all" value={form.serviciu} onChange={e => setForm({...form, serviciu: e.target.value})}>
                <option value="">Apasă pentru selecție...</option>
                {serviciiFiltrate.map((s, idx) => (
                  <option key={s.id || idx} value={s.nume || s.name}>
                    {((s.nume || s.name) || "Serviciu").toUpperCase()} — {s.pret || s.price || 0} RON
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 ml-3 italic tracking-widest">Specialist</label>
              <select required className="w-full p-6 bg-slate-50 rounded-[22px] border-2 border-slate-100 focus:border-amber-500 outline-none font-black text-sm uppercase italic cursor-pointer appearance-none transition-all" value={form.specialist_id} onChange={e => setForm({...form, specialist_id: e.target.value})}>
                <option value="Oricine">Oricine (Disponibilitate maximă)</option>
                {specialistiFiltrati.map((sp, idx) => (
                  <option key={sp.id || idx} value={sp.nume}>{(sp.nume || "Membru Staff").toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 ml-3 italic tracking-widest">Data</label>
              <input type="date" min={today} required className="w-full p-6 bg-slate-50 rounded-[22px] border-2 border-slate-100 focus:border-amber-500 outline-none font-black text-[12px] cursor-pointer transition-all" value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 ml-3 italic tracking-widest">Ora</label>
              <button type="button" onClick={() => setShowPicker(true)} className="w-full p-6 bg-slate-900 text-amber-500 rounded-[22px] font-black text-base shadow-xl hover:bg-amber-600 hover:text-white transition-all border-b-4 border-slate-700">{form.ora}</button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full py-7 mt-6 bg-slate-900 text-white rounded-[28px] font-black text-sm uppercase tracking-[0.3em] italic shadow-2xl hover:bg-amber-600 transition-all border-b-4 border-slate-800 disabled:opacity-50">
            {loading ? "SE TRIMITE..." : "CONFIRMĂ REZERVAREA"}
          </button>
        </form>
      </div>

      {/* SECȚIUNE FEEDBACK & SUGESTII */}
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-slate-900">
            Păreri și <span className="text-amber-600">Sugestii</span>
          </h2>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Comunitatea Chronos</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Formular Feedback */}
          <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-xl border-2 border-slate-50 relative overflow-hidden">
            {trimisFeedback && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-6 animate-in fade-in">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl mb-4">✓</div>
                <h3 className="text-xl font-black uppercase italic">Mulțumim!</h3>
                <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mt-2">Mesajul tău va fi vizibil după aprobarea adminului.</p>
              </div>
            )}
            
            <div className="flex justify-center gap-2 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" className={`text-3xl transition-all ${star <= (hover || rating) ? "scale-110 filter-none" : "grayscale opacity-20"}`} onClick={() => setRating(star)} onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(0)}>⭐</button>
              ))}
            </div>

            <div className="space-y-4">
              <input type="text" placeholder="NUMELE TĂU" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-[10px] uppercase outline-none focus:border-amber-500 transition-all" value={numeFeedback} onChange={(e) => setNumeFeedback(e.target.value)} />
              <textarea placeholder="CE SUGESTII AI PENTRU NOI?" rows={3} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-[10px] outline-none focus:border-amber-500 transition-all resize-none" value={mesajFeedback} onChange={(e) => setMesajFeedback(e.target.value)} />
              <button onClick={trimiteFeedback} disabled={incarcareFeedback} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase italic tracking-widest text-[10px] border-b-4 border-slate-700 hover:bg-amber-600 hover:border-amber-700 transition-all">
                {incarcareFeedback ? "SE TRIMITE..." : "Trimite Recenzia"}
              </button>
            </div>
          </div>

          {/* Listă Feedbacks */}
          <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
            {feedbacks.length > 0 ? feedbacks.map((f) => (
              <div key={f.id} className="bg-white p-8 rounded-[35px] shadow-md border-2 border-slate-50 group hover:border-amber-200 transition-all">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <span key={idx} className={`text-xs ${idx < f.stele ? 'filter-none' : 'grayscale opacity-20'}`}>⭐</span>
                  ))}
                </div>
                <p className="text-slate-700 font-bold italic text-xs leading-relaxed mb-6">"{f.comentariu}"</p>
                
                {f.raspuns_admin && (
                  <div className="mb-6 p-4 bg-slate-900 rounded-2xl border-l-4 border-amber-500">
                    <p className="text-amber-500 font-black uppercase text-[7px] tracking-widest mb-1 italic">Răspuns Chronos:</p>
                    <p className="text-white text-[10px] italic leading-tight">{f.raspuns_admin}</p>
                  </div>
                )}

                <div className="flex items-center gap-3 border-t border-slate-50 pt-4">
                  <div className="w-8 h-8 bg-slate-900 text-amber-500 flex items-center justify-center rounded-lg font-black italic text-xs">
                    {f.nume_client?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black uppercase text-[9px] tracking-widest text-slate-900 italic">{f.nume_client}</p>
                    <p className="text-[7px] font-black text-slate-300 uppercase">{new Date(f.created_at).toLocaleDateString('ro-RO')}</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 opacity-30 font-black uppercase italic text-xs tracking-widest">Încă nu avem recenzii afișate.</div>
            )}
          </div>
        </div>
      </div>

      {/* TIME PICKER MODAL */}
      {showPicker && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div ref={pickerRef} className="bg-white w-full max-w-sm rounded-[45px] p-10 shadow-2xl relative border-t-8 border-amber-500">
            <h2 className="text-center font-black uppercase italic mb-8 text-slate-900 tracking-tighter">Alege Intervalul</h2>
            <div className="flex gap-4 h-72 bg-slate-50 p-6 rounded-[35px] mb-8 shadow-inner border border-slate-100">
              <div className="flex-1 overflow-y-auto space-y-2 text-center custom-scrollbar">
                {Array.from({ length: 13 }, (_, i) => (i + 8).toString().padStart(2, '0')).map(h => (
                  <button key={h} type="button" onClick={() => setSelectedHour(h)} className={`w-full py-4 rounded-2xl font-black text-xs transition-all ${selectedHour === h ? 'bg-amber-500 text-white scale-105 shadow-lg' : 'text-slate-300 hover:text-slate-600'}`}>{h}:00</button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 text-center border-l-2 border-slate-200 pl-4 custom-scrollbar">
                {["00", "15", "30", "45"].map(m => {
                  const blocked = isTimeBlocked(selectedHour, m);
                  return (
                    <button key={m} type="button" disabled={blocked} onClick={() => setSelectedMinute(m)} className={`w-full py-4 rounded-2xl font-black text-xs transition-all ${selectedMinute === m ? 'bg-slate-900 text-white scale-105' : blocked ? 'opacity-20 cursor-not-allowed' : 'text-slate-300 hover:text-slate-600'}`}>:{m}</button>
                  );
                })}
              </div>
            </div>
            <button type="button" onClick={() => setShowPicker(false)} className="w-full py-5 bg-slate-900 text-amber-500 rounded-[22px] font-black uppercase text-xs italic tracking-[0.2em] hover:bg-amber-500 hover:text-white transition-all shadow-lg active:scale-95">SELECTEAZĂ</button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function RezervarePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white font-black text-slate-900 italic uppercase">Pregătim formularul...</div>}>
      <RezervareContent />
    </Suspense>
  );
}