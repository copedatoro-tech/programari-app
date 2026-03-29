"use client";

import { useState, useEffect, Suspense, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function RezervareContent() {
  const searchParams = useSearchParams();
  const adminId = searchParams.get("id") || "ed9cd915-6684-422c-a214-4ac5c25e98f3";

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [trimis, setTrimis] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingConfig, setFetchingConfig] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  
  const [specialisti, setSpecialisti] = useState<any[]>([]);
  const [servicii, setServicii] = useState<any[]>([]);
  const [manualBlocks, setManualBlocks] = useState<any>({});
  const [workingHours, setWorkingHours] = useState<any>({});
  const [subData, setSubData] = useState<{ tier: string; status: string }>({ tier: "trial", status: "active" });

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
        .select('services, staff, manual_blocks, working_hours, subscription_tier, subscription_status')
        .eq('id', adminId)
        .single();

      if (profile) {
        const proceseazaDate = (val: any) => {
          if (!val) return [];
          if (Array.isArray(val)) return val;
          try {
            let curat = typeof val === 'string' ? JSON.parse(val) : val;
            if (typeof curat === 'string') curat = JSON.parse(curat);
            return Array.isArray(curat) ? curat : [];
          } catch (e) { return []; }
        };

        setServicii(proceseazaDate(profile.services));
        setSpecialisti(proceseazaDate(profile.staff));
        setManualBlocks(profile.manual_blocks || {});
        setWorkingHours(profile.working_hours || {});
        setSubData({
          tier: profile.subscription_tier || "trial",
          status: profile.subscription_status || "trialing"
        });
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

  const trimiteFeedback = async () => {
    if (rating === 0) return alert("Te rugăm să alegi numărul de stele!");
    if (!numeFeedback.trim() || !mesajFeedback.trim()) return alert("Te rugăm să completezi numele și mesajul!");
    setIncarcareFeedback(true);
    try {
      const { error } = await supabase.from("feedbacks").insert([{ 
        nume_client: numeFeedback.trim(), 
        stele: rating, 
        comentariu: mesajFeedback.trim(), 
        aprobat: false 
      }]);
      if (!error) {
        setTrimisFeedback(true);
        setNumeFeedback("");
        setMesajFeedback("");
        setRating(0);
        setTimeout(() => setTrimisFeedback(false), 5000);
      }
    } catch (err) { console.error(err); } finally { setIncarcareFeedback(false); }
  };

  const specialistiFiltrati = useMemo(() => {
    if (!form.serviciu) return specialisti;
    return specialisti.filter(sp => {
      const serviciiSp = Array.isArray(sp.servicii) ? sp.servicii : [];
      return serviciiSp.includes(form.serviciu);
    });
  }, [form.serviciu, specialisti]);

  const serviciiFiltrate = useMemo(() => {
    if (form.specialist_id === "Oricine") return servicii;
    const specialistSelectat = specialisti.find(s => (s.nume || s.name) === form.specialist_id);
    if (!specialistSelectat || !specialistSelectat.servicii) return [];
    return servicii.filter(s => specialistSelectat.servicii.includes(s.nume || s.name || ""));
  }, [form.specialist_id, servicii, specialisti]);

  // Calculăm durata serviciului selectat
  const durataServiciuSelectat = useMemo(() => {
    const s = servicii.find(s => (s.nume || s.name) === form.serviciu);
    return s ? parseInt(s.durata || s.duration || "30") : 30;
  }, [form.serviciu, servicii]);

  const isTimeBlocked = (h: string, m: string) => {
    const timeStr = `${h}:${m}`;
    
    // 1. Verificare Blocări Manuale
    const blockedForDay = manualBlocks[form.data] || [];
    if (blockedForDay.includes(timeStr)) return true;

    // 2. Verificare Orar de Lucru (Working Hours) din Settings
    const zileSaptamana = ["duminica", "luni", "marti", "miercuri", "joi", "vineri", "sambata"];
    const ziSelectata = zileSaptamana[new Date(form.data).getDay()];
    const programZi = workingHours[ziSelectata];

    if (!programZi || !programZi.active) return true; // Închis dacă nu e activă ziua

    const [startH, startM] = programZi.start.split(':').map(Number);
    const [endH, endM] = programZi.end.split(':').map(Number);
    const oraCurentaMin = parseInt(h) * 60 + parseInt(m);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    // Verificăm dacă ora e în intervalul de lucru ȘI dacă serviciul are loc să se termine până la închidere
    if (oraCurentaMin < startMin || (oraCurentaMin + durataServiciuSelectat) > endMin) {
      return true;
    }

    return false;
  };

  const trimiteRezervare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subData.status === "expired") {
      alert("⚠️ Ne pare rău, dar serviciul este momentan indisponibil.");
      return;
    }
    if (!form.serviciu) {
      alert("⚠️ Te rugăm să selectezi un serviciu.");
      return;
    }

    const confirmare = window.confirm("Ești sigur că datele introduse sunt corecte?");
    if (!confirmare) return;

    setLoading(true);
    try {
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0,0,0,0);

      const { count } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', adminId)
        .gte('created_at', firstDayOfMonth.toISOString());

      const limits: Record<string, number> = { trial: 50, pro: 500, ultra: 10000 };
      const currentLimit = limits[subData.tier] || 50;

      if (count !== null && count >= currentLimit) {
        alert("⚠️ Limita de programări a fost atinsă.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('appointments').insert([{
        user_id: adminId,
        full_name: form.nume.trim(),
        phone: form.telefon.replace(/\s/g, ""),
        date: form.data,
        time: form.ora,
        service: form.serviciu,
        staff_member: form.specialist_id,
        status: "pending",
        is_client_booking: true
      }]);

      if (!error) {
        setTrimis(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  if (fetchingConfig) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfcfc] font-black text-slate-900 italic uppercase animate-pulse tracking-[0.2em] text-[10px]">
      Sincronizare Chronos Booking...
    </div>
  );

  if (trimis) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#fcfcfc]">
        <div className="w-24 h-24 bg-slate-900 text-amber-500 rounded-[35px] flex items-center justify-center text-4xl shadow-2xl mb-8 border-b-4 border-amber-500">✓</div>
        <h1 className="text-4xl font-black uppercase italic text-slate-900 tracking-tighter">REZERVAT!</h1>
        <button onClick={() => window.location.reload()} className="mt-10 px-12 py-6 bg-slate-900 text-white rounded-[25px] font-black uppercase italic text-[10px] tracking-widest hover:bg-amber-500 hover:text-black transition-all shadow-xl">Înapoi la Calendar</button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#fcfcfc] flex flex-col items-center p-4 md:p-12 font-sans text-slate-900 relative">
      <style jsx global>{`
        nav, header:not(.local-header), .menu-button, button[title="MENU"] { display: none !important; }
      `}</style>

      <div className="w-full max-w-lg bg-white rounded-[55px] shadow-2xl border border-slate-100 overflow-hidden z-10 mb-20">
        <div className="bg-slate-900 p-12 text-white text-center local-header relative flex flex-col items-center">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500"></div>
          <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter leading-none mb-2">
            CHRONOS <span className="text-amber-500">BOOKING</span>
          </h1>
          <p className="text-[9px] font-black text-slate-400 tracking-[0.4em] uppercase opacity-70 italic">Programare Rapidă Online</p>
        </div>

        <form onSubmit={trimiteRezervare} className="p-8 md:p-14 space-y-8">
          <div className="space-y-4">
            <input type="text" title="Nume" required className="w-full p-6 bg-slate-50 rounded-[25px] border-2 border-slate-100 focus:border-amber-500 outline-none font-black text-xs uppercase transition-all" placeholder="NUME ȘI PRENUME" value={form.nume} onChange={e => setForm({...form, nume: e.target.value})} />
            <input type="tel" title="Telefon" required className="w-full p-6 bg-slate-50 rounded-[25px] border-2 border-slate-100 focus:border-amber-500 outline-none font-black text-xs transition-all" placeholder="TELEFON" value={form.telefon} onChange={e => setForm({...form, telefon: e.target.value})} />
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-4 italic tracking-widest">Selectează Serviciul</label>
              <select required className="w-full p-6 bg-slate-50 rounded-[25px] border-2 border-slate-100 focus:border-amber-500 outline-none font-black text-[14px] uppercase italic cursor-pointer appearance-none transition-all shadow-sm" value={form.serviciu} onChange={e => setForm({...form, serviciu: e.target.value})}>
                <option value="">Alege serviciul...</option>
                {serviciiFiltrate.map((s, idx) => (
                  <option key={s.id || idx} value={s.nume || s.name}>
                    {(s.nume || s.name || "Serviciu").toUpperCase()} — {s.pret || s.price || 0} RON ({s.durata || s.duration || 30} MIN)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-4 italic tracking-widest">Alege Specialistul</label>
              <select required className="w-full p-6 bg-slate-50 rounded-[25px] border-2 border-slate-100 focus:border-amber-500 outline-none font-black text-[14px] uppercase italic cursor-pointer appearance-none transition-all shadow-sm" value={form.specialist_id} onChange={e => setForm({...form, specialist_id: e.target.value})}>
                <option value="Oricine">Oricine (Disponibilitate Maximă)</option>
                {specialistiFiltrati.map((sp, idx) => (
                  <option key={sp.id || idx} value={sp.nume || sp.name}>{(sp.nume || sp.name || "Staff").toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-4 italic tracking-widest">Data</label>
              <input type="date" min={today} required className="w-full p-6 bg-slate-50 rounded-[25px] border-2 border-slate-100 focus:border-amber-500 outline-none font-black text-[18px] cursor-pointer transition-all shadow-sm" value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-4 italic tracking-widest">Ora</label>
              <button type="button" onClick={() => setShowPicker(true)} className="w-full p-6 bg-slate-900 text-amber-500 rounded-[25px] font-black text-[22px] shadow-xl hover:bg-amber-500 hover:text-black transition-all border-b-4 border-slate-700">{form.ora}</button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full py-8 mt-6 bg-slate-900 text-white rounded-[30px] font-black text-xs uppercase tracking-[0.3em] italic shadow-2xl hover:bg-amber-500 hover:text-black transition-all border-b-4 border-slate-800 disabled:opacity-50">
            {loading ? "SE PROCESEAZĂ..." : "TRIMITE CEREREA"}
          </button>
        </form>
      </div>

      {/* FEEDBACK SECTION */}
      <div className="w-full max-w-4xl pb-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-slate-900 border-l-8 border-amber-500 pl-6 inline-block">
            REVIEW <span className="text-amber-500">CLIENTI</span>
          </h2>
        </div>
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div className="bg-white p-10 rounded-[50px] shadow-xl border border-slate-100 relative overflow-hidden">
            {trimisFeedback && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mb-4">✓</div>
                <h3 className="text-2xl font-black">Mulțumim!</h3>
              </div>
            )}
            <div className="flex justify-center gap-3 mb-10">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" className={`text-4xl transition-all ${star <= (hover || rating) ? "scale-125" : "grayscale opacity-20"}`} onClick={() => setRating(star)} onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(0)}>⭐</button>
              ))}
            </div>
            <div className="space-y-5">
              <input type="text" placeholder="NUMELE TĂU" className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[22px] font-black text-[10px] uppercase outline-none focus:border-amber-500 transition-all" value={numeFeedback} onChange={(e) => setNumeFeedback(e.target.value)} />
              <textarea placeholder="PĂREREA TA..." rows={3} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[22px] font-bold text-[11px] outline-none focus:border-amber-500 transition-all resize-none" value={mesajFeedback} onChange={(e) => setMesajFeedback(e.target.value)} />
              <button onClick={trimiteFeedback} disabled={incarcareFeedback} className="w-full py-6 bg-slate-900 text-white rounded-[22px] font-black uppercase italic tracking-widest text-[10px] border-b-4 border-slate-700 hover:bg-amber-500 hover:text-black transition-all">
                {incarcareFeedback ? "SE TRIMITE..." : "PUBLICĂ RECENZIA"}
              </button>
            </div>
          </div>
          <div className="space-y-8 max-h-[700px] overflow-y-auto pr-6">
            {feedbacks.length > 0 ? feedbacks.map((f) => (
              <div key={f.id} className="bg-white p-10 rounded-[45px] shadow-lg border border-slate-100 group hover:border-amber-400 transition-all">
                <div className="flex gap-1.5 mb-5">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <span key={idx} className={`text-sm ${idx < f.stele ? '' : 'grayscale opacity-10'}`}>⭐</span>
                  ))}
                </div>
                <p className="text-slate-800 font-bold italic text-xs leading-relaxed mb-8">"{f.comentariu}"</p>
                <div className="flex items-center gap-4 pt-6 border-t border-slate-50">
                  <div className="w-10 h-10 bg-slate-900 text-amber-500 flex items-center justify-center rounded-[15px] font-black italic text-sm">
                    {f.nume_client?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black uppercase text-[10px] tracking-widest text-slate-900">{f.nume_client}</p>
                    <p className="text-[8px] font-black text-slate-300 uppercase italic">Client Verificat</p>
                  </div>
                </div>
              </div>
            )) : <div className="text-center py-20 opacity-20 font-black uppercase italic text-xs tracking-[0.3em]">Fără recenzii.</div>}
          </div>
        </div>
      </div>

      {/* TIME PICKER MODAL */}
      {showPicker && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div ref={pickerRef} className="bg-white w-full max-w-sm rounded-[55px] p-10 shadow-2xl relative border-t-[12px] border-amber-500">
            <h2 className="text-center font-black uppercase italic mb-8 text-slate-900 tracking-tighter text-xl">INTERVAL ORAR</h2>
            <div className="flex gap-5 h-80 bg-slate-50 p-6 rounded-[35px] mb-10 shadow-inner border border-slate-100">
              <div className="flex-1 overflow-y-auto space-y-3 text-center">
                {Array.from({ length: 15 }, (_, i) => (i + 7).toString().padStart(2, '0')).map(h => (
                  <button key={h} type="button" onClick={() => setSelectedHour(h)} className={`w-full py-5 rounded-[20px] font-black text-sm transition-all ${selectedHour === h ? 'bg-amber-500 text-black scale-105 shadow-lg' : 'text-slate-300 hover:text-slate-600'}`}>{h}:00</button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 text-center border-l-2 border-slate-200 pl-5">
                {["00", "15", "30", "45"].map(m => {
                  const blocked = isTimeBlocked(selectedHour, m);
                  return (
                    <button key={m} type="button" disabled={blocked} onClick={() => setSelectedMinute(m)} className={`w-full py-5 rounded-[20px] font-black text-sm transition-all ${selectedMinute === m ? 'bg-slate-900 text-white scale-105 shadow-xl' : blocked ? 'opacity-10 cursor-not-allowed line-through' : 'text-slate-300 hover:text-slate-600'}`}>:{m}</button>
                  );
                })}
              </div>
            </div>
            <button type="button" onClick={() => setShowPicker(false)} className="w-full py-6 bg-slate-900 text-amber-500 rounded-[25px] font-black uppercase text-[11px] italic tracking-[0.2em] hover:bg-amber-500 hover:text-black transition-all shadow-xl">CONFIRMĂ ORA</button>
          </div>
        </div>
      )}
      
      <footer className="mt-auto py-12 text-center opacity-30">
        <p className="text-[9px] font-black uppercase italic tracking-widest">© 2026 Chronos Management Ecosystem. Powering Performance.</p>
      </footer>
    </main>
  );
}

export default function RezervarePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#fcfcfc] font-black text-slate-900 italic uppercase text-[10px] tracking-widest">Sincronizare Hub...</div>}>
      <RezervareContent />
    </Suspense>
  );
}