"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function RezervareContent() {
  const searchParams = useSearchParams();
  const adminId = searchParams.get("id");

  const [trimis, setTrimis] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingConfig, setFetchingConfig] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  
  // MODIFICARE: Obiecte în loc de string-uri pentru a stoca preț/durată
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
    specialist_id: ""
  });

  const [selectedHour, setSelectedHour] = useState("09");
  const [selectedMinute, setSelectedMinute] = useState("00");

  useEffect(() => {
    setForm(prev => ({ ...prev, ora: `${selectedHour}:${selectedMinute}` }));
  }, [selectedHour, selectedMinute]);

  const fetchAdminConfig = useCallback(async () => {
    if (!adminId) {
        setFetchingConfig(false);
        return;
    };
    
    setFetchingConfig(true);
    
    // Preluăm datele configurate în pagina /resurse
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('services, staff, manual_blocks')
      .eq('id', adminId)
      .single();

    if (profile) {
      // Filtrăm și setăm serviciile și staff-ul din JSONB-ul din Supabase
      setServicii(profile.services || []);
      setSpecialisti(profile.staff || []);
      setManualBlocks(profile.manual_blocks || {});
    }
    setFetchingConfig(false);
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
    
    if (!form.nume || !form.telefon || !form.data || !form.serviciu) {
      alert("⚠️ Te rugăm să completezi toate câmpurile obligatorii.");
      return;
    }
    
    setLoading(true);

    const { data: existenta } = await supabase
      .from('appointments')
      .select('id')
      .eq('user_id', adminId)
      .eq('date', form.data)
      .eq('time', form.ora)
      .maybeSingle();

    if (existenta || isTimeBlocked(selectedHour, selectedMinute)) {
      alert("❌ Această oră nu mai este disponibilă. Te rugăm să alegi alta.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('appointments').insert([{
      user_id: adminId,
      full_name: form.nume,
      phone: form.telefon,
      email: form.email,
      date: form.data,
      time: form.ora,
      service: form.serviciu,
      staff_member: form.specialist_id || "Oricine",
      details: form.motiv,
      status: "pending",
      is_client_booking: true
    }]);

    if (!error) {
      setTrimis(true);
    } else {
      alert("Eroare la salvare. Încearcă din nou.");
    }
    setLoading(false);
  };

  if (!adminId) return <div className="p-20 text-center font-black text-slate-300 uppercase italic">Link invalid</div>;
  
  if (fetchingConfig) return <div className="min-h-screen flex items-center justify-center font-black text-slate-400 italic uppercase">Se încarcă...</div>;

  if (trimis) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-white">
        <div className="w-20 h-20 bg-emerald-500 text-white rounded-[30px] flex items-center justify-center text-3xl shadow-xl mb-6">✓</div>
        <h1 className="text-2xl font-black uppercase italic text-slate-900">Programare <span className="text-emerald-600">Trimisă</span></h1>
        <p className="mt-4 text-slate-500 font-bold italic">Vei fi contactat în scurt timp pentru confirmare.</p>
        <button onClick={() => window.location.reload()} className="mt-8 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase italic text-[10px]">Înapoi</button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="w-full max-w-lg bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 p-8 text-white text-center">
          <h1 className="text-xl font-black uppercase italic tracking-tighter">
            Chronos <span className="text-amber-500">Booking</span>
          </h1>
        </div>

        <form onSubmit={trimiteRezervare} className="p-8 space-y-5">
          {/* IDENTITATE */}
          <div className="space-y-3">
            <input type="text" required className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none font-bold" placeholder="Nume Complet" value={form.nume} onChange={e => setForm({...form, nume: e.target.value})} />
            <input type="tel" required className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none font-bold" placeholder="Telefon" value={form.telefon} onChange={e => setForm({...form, telefon: e.target.value})} />
          </div>

          {/* SERVICIU */}
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-2 italic">Alege Serviciul</label>
            <select 
              required 
              className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none font-bold text-xs uppercase italic"
              value={form.serviciu}
              onChange={e => setForm({...form, serviciu: e.target.value})}
            >
              <option value="">Alege un serviciu...</option>
              {servicii.map((s, idx) => (
                <option key={idx} value={s.name}>
                  {s.name.toUpperCase()} — {s.price} RON ({s.duration} MIN)
                </option>
              ))}
            </select>
          </div>

          {/* SPECIALIST (STAFF) */}
          {specialisti.length > 0 && (
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-2 italic">Specialist Preferat</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({...form, specialist_id: "Oricine"})}
                  className={`p-3 rounded-xl border-2 font-black text-[9px] uppercase italic transition-all ${(!form.specialist_id || form.specialist_id === "Oricine") ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-100 text-slate-400'}`}
                >
                  Oricine
                </button>
                {specialisti.map((sp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setForm({...form, specialist_id: sp.name})}
                    className={`p-3 rounded-xl border-2 font-black text-[9px] uppercase italic transition-all ${form.specialist_id === sp.name ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-100 text-slate-400'}`}
                  >
                    {sp.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* DATA ȘI ORA */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-2 italic">Data</label>
              <input type="date" min={today} required className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none font-black text-xs" value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-2 italic">Ora</label>
              <button type="button" onClick={() => setShowPicker(true)} className="w-full p-4 bg-slate-900 text-amber-500 rounded-2xl font-black text-sm shadow-lg hover:bg-slate-800 transition-colors">
                {form.ora} 🕒
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full py-5 bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] italic shadow-xl hover:bg-slate-900 transition-all">
            {loading ? "SE TRIMITE..." : "REZERVĂ ACUM ✨"}
          </button>
        </form>

        {/* TIME PICKER MODAL CU ÎNCHIDERE LA CLICK EXTERIOR */}
        {showPicker && (
          <div 
            className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowPicker(false)}
          >
            <div 
              className="bg-white w-full max-w-sm rounded-[35px] p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-center font-black uppercase italic mb-6">Alege Ora</h2>
              <div className="flex gap-4 h-64 bg-slate-50 p-4 rounded-3xl mb-6">
                <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide text-center">
                  {Array.from({ length: 13 }, (_, i) => (i + 8).toString().padStart(2, '0')).map(h => (
                    <button key={h} type="button" onClick={() => setSelectedHour(h)} className={`w-full py-3 rounded-xl font-black text-sm ${selectedHour === h ? 'bg-amber-600 text-white' : 'text-slate-400'}`}>{h}</button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 text-center border-l-2 border-slate-100 pl-4">
                  {["00", "15", "30", "45"].map(m => {
                    const blocked = isTimeBlocked(selectedHour, m);
                    return (
                      <button key={m} type="button" disabled={blocked} onClick={() => setSelectedMinute(m)} className={`w-full py-3 rounded-xl font-black text-sm ${selectedMinute === m ? 'bg-slate-900 text-white' : blocked ? 'opacity-20 line-through' : 'text-slate-400'}`}>{m}</button>
                    );
                  })}
                </div>
              </div>
              <button type="button" onClick={() => setShowPicker(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs italic">Gata</button>
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