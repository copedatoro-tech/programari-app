"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function RezervareContent() {
  const searchParams = useSearchParams();
  const adminId = searchParams.get("id") || "ed9cd915-6684-422c-a214-4ac5c25e98f3";

  const [trimis, setTrimis] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingConfig, setFetchingConfig] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  
  const [specialisti, setSpecialisti] = useState<any[]>([]);
  const [servicii, setServicii] = useState<any[]>([]);
  const [manualBlocks, setManualBlocks] = useState<any>({});

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

  useEffect(() => {
    setForm(prev => ({ ...prev, ora: `${selectedHour}:${selectedMinute}` }));
  }, [selectedHour, selectedMinute]);

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

        const listaServicii = proceseaza(profile.services);
        const listaStaff = proceseaza(profile.staff);
        
        setServicii(listaServicii);
        setSpecialisti(listaStaff);
        setManualBlocks(profile.manual_blocks || {});
      }
    } catch (e) {
      console.error("Eroare la încărcare:", e);
    } finally {
      setFetchingConfig(false);
    }
  }, [adminId]);

  useEffect(() => {
    fetchAdminConfig();
  }, [fetchAdminConfig]);

  const isTimeBlocked = (h: string, m: string) => {
    const timeStr = `${h}:${m}`;
    const blockedForDay = manualBlocks[form.data] || [];
    return blockedForDay.includes(timeStr);
  };

  const trimiteRezervare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nume || !form.telefon || !form.serviciu || !form.specialist_id) {
      alert("⚠️ Te rugăm să completezi toate câmpurile.");
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.from('appointments').insert([{
      user_id: adminId,
      full_name: form.nume,
      phone: form.telefon,
      date: form.data,
      time: form.ora,
      service: form.serviciu,
      staff_member: form.specialist_id,
      status: "pending",
      is_client_booking: true
    }]);

    if (!error) {
      setTrimis(true);
    } else {
      alert("Eroare: " + error.message);
    }
    setLoading(false);
  };

  if (fetchingConfig) return <div className="min-h-screen flex items-center justify-center font-black text-slate-900 italic uppercase animate-pulse">Sincronizare date...</div>;

  if (trimis) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-white">
        <div className="w-24 h-24 bg-slate-900 text-amber-500 rounded-[35px] flex items-center justify-center text-4xl shadow-2xl mb-8 border-b-4 border-amber-600">✓</div>
        <h1 className="text-3xl font-black uppercase italic text-slate-900 tracking-tighter">REZERVARE TRIMISĂ</h1>
        <button title="Reîncarcă pentru o nouă rezervare" onClick={() => window.location.reload()} className="mt-10 px-10 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase italic text-[10px] tracking-widest hover:bg-amber-600 transition-colors">Înapoi</button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="w-full max-w-lg bg-white rounded-[40px] shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 p-10 text-white text-center">
          <h1 className="text-2xl font-black uppercase italic tracking-tighter">
            CHRONOS <span className="text-amber-500">BOOKING</span>
          </h1>
        </div>

        <form onSubmit={trimiteRezervare} className="p-10 space-y-6">
          <div className="space-y-3">
             <input title="Introdu numele tău complet" type="text" required className="w-full p-5 bg-slate-50 rounded-[22px] border-2 border-slate-100 focus:border-amber-500 outline-none font-bold text-sm" placeholder="NUME ȘI PRENUME" value={form.nume} onChange={e => setForm({...form, nume: e.target.value})} />
             <input title="Introdu numărul tău de telefon pentru confirmare" type="tel" required className="w-full p-5 bg-slate-50 rounded-[22px] border-2 border-slate-100 focus:border-amber-500 outline-none font-bold text-sm" placeholder="TELEFON" value={form.telefon} onChange={e => setForm({...form, telefon: e.target.value})} />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">1. Alege Specialistul</label>
              <select 
                title="Selectează membrul echipei preferat sau oricine disponibil"
                required 
                className="w-full p-5 bg-slate-50 rounded-[22px] border-2 border-slate-100 focus:border-amber-500 outline-none font-black text-xs uppercase italic cursor-pointer"
                value={form.specialist_id}
                onChange={e => setForm({...form, specialist_id: e.target.value})}
              >
                <option value="Oricine">Oricine (Primul disponibil)</option>
                {specialisti.map((sp, idx) => (
                  <option key={sp.id || idx} value={sp.nume}>
                    {(sp.nume || "Fără nume").toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">2. Alege Serviciul</label>
              <select 
                title="Alege serviciul pe care dorești să îl rezervi"
                required 
                className="w-full p-5 bg-slate-50 rounded-[22px] border-2 border-slate-100 focus:border-amber-500 outline-none font-black text-xs uppercase italic cursor-pointer"
                value={form.serviciu}
                onChange={e => setForm({...form, serviciu: e.target.value})}
              >
                <option value="">Selectează serviciul...</option>
                {servicii.map((s, idx) => (
                  <option key={s.id || idx} value={s.nume}>
                    {(s.nume || "Serviciu").toUpperCase()} — {s.pret || 0} RON
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Data</label>
              <input title="Alege ziua programării din calendar" type="date" min={today} required className="w-full p-5 bg-slate-50 rounded-[22px] border-2 border-slate-100 focus:border-amber-500 outline-none font-black text-xs cursor-pointer" value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Ora</label>
              <button 
                type="button" 
                title={`Ora selectată este ${form.ora}. Click pentru a deschide selectorul.`}
                onClick={() => setShowPicker(true)} 
                className="w-full p-5 bg-slate-900 text-amber-500 rounded-[22px] font-black text-sm shadow-xl hover:bg-slate-800 transition-colors"
              >
                {form.ora}
              </button>
            </div>
          </div>

          <button title="Apasă pentru a trimite cererea ta de rezervare" type="submit" disabled={loading} className="w-full py-6 mt-4 bg-slate-900 text-white rounded-[25px] font-black text-xs uppercase tracking-[0.3em] italic shadow-2xl hover:bg-amber-600 transition-all">
            {loading ? "SE PROCESEAZĂ..." : "FINALIZEAZĂ REZERVAREA"}
          </button>
        </form>

        {showPicker && (
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-50 flex items-center justify-center p-6" onClick={() => setShowPicker(false)}>
            <div className="bg-white w-full max-w-sm rounded-[40px] p-10 shadow-2xl relative" onClick={e => e.stopPropagation()}>
              <h2 className="text-center font-black uppercase italic mb-8 text-slate-900">Alege Ora</h2>
              <div className="flex gap-4 h-72 bg-slate-50 p-5 rounded-[30px] mb-8 shadow-inner">
                <div className="flex-1 overflow-y-auto space-y-2 text-center pr-2">
                  {Array.from({ length: 13 }, (_, i) => (i + 8).toString().padStart(2, '0')).map(h => (
                    <button 
                      key={h} 
                      type="button" 
                      title={`Alege ora ${h}`}
                      onClick={() => setSelectedHour(h)} 
                      className={`w-full py-4 rounded-2xl font-black text-sm transition-all ${selectedHour === h ? 'bg-amber-500 text-white scale-105 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 text-center border-l-2 border-slate-200 pl-4">
                  {["00", "15", "30", "45"].map(m => {
                    const blocked = isTimeBlocked(selectedHour, m);
                    return (
                      <button 
                        key={m} 
                        type="button" 
                        disabled={blocked} 
                        title={blocked ? "Acest interval este deja ocupat" : `Alege minutul ${m}`}
                        onClick={() => setSelectedMinute(m)} 
                        className={`w-full py-4 rounded-2xl font-black text-sm transition-all ${selectedMinute === m ? 'bg-slate-900 text-white scale-105' : blocked ? 'opacity-10 cursor-not-allowed grayscale' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button title="Confirmă ora selectată și închide fereastra" type="button" onClick={() => setShowPicker(false)} className="w-full py-5 bg-slate-900 text-white rounded-[22px] font-black uppercase text-xs italic tracking-widest hover:bg-amber-600 transition-colors">GATA</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function RezervarePage() {
  return <Suspense fallback={null}><RezervareContent /></Suspense>;
}