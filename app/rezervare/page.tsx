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
  
  const [specialisti, setSpecialisti] = useState<string[]>([]);
  const [servicii, setServicii] = useState<string[]>([]);
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
    
    // Luăm datele din profilul adminului (servicii și staff)
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('services, staff, manual_blocks')
      .eq('id', adminId)
      .single();

    if (profile) {
      // Dacă există servicii în baza de date, le punem. Dacă nu, punem un mesaj de eroare sau unul default.
      setServicii(profile.services && profile.services.length > 0 ? profile.services : ["Serviciu Standard"]);
      setSpecialisti(profile.staff && profile.staff.length > 0 ? profile.staff : []);
      setManualBlocks(profile.manual_blocks || {});
    } else {
      // Dacă profilul nu e configurat deloc
      setServicii(["Contactați administratorul pentru servicii"]);
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

    // Verificăm dacă ora e deja ocupată în 'appointments'
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
      staff_member: form.specialist_id || "Nespecificat",
      details: form.motiv,
      status: "pending",
      is_client_booking: true
    }]);

    if (!error) {
      setTrimis(true);
    } else {
      console.error(error);
      alert("Eroare la salvare. Încearcă din nou.");
    }
    setLoading(false);
  };

  if (!adminId) return <div className="p-20 text-center font-black text-slate-300 tracking-tighter uppercase italic">Link de rezervare invalid (Lipsă ID)</div>;
  
  if (fetchingConfig) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center font-black text-slate-400 italic animate-pulse uppercase tracking-widest">
            Se încarcă profilul...
        </div>
    </div>
  );

  if (trimis) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-white">
        <div className="w-24 h-24 bg-emerald-500 text-white rounded-[40px] flex items-center justify-center text-4xl shadow-2xl mb-8 animate-bounce">✓</div>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">Programare <span className="text-emerald-600">Trimisă</span></h1>
        <div className="mt-8 p-8 bg-slate-900 rounded-[40px] max-w-sm text-white shadow-xl">
          <p className="font-bold italic text-sm">
            Te așteptăm, <span className="text-amber-500 uppercase">{form.nume}</span>!<br/><br/>
            Serviciu: <span className="text-amber-500">{form.serviciu}</span><br/>
            Data: <span className="text-amber-500">{form.data}</span><br/>
            Ora: <span className="text-amber-500">{form.ora}</span>
          </p>
        </div>
        <button onClick={() => window.location.reload()} className="mt-10 px-10 py-5 bg-slate-100 rounded-2xl font-black uppercase italic text-[10px] tracking-widest border border-slate-200">Rezervare nouă</button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="w-full max-w-lg bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden relative">
        <div className="bg-slate-900 p-8 text-white text-center">
          <h1 className="text-2xl font-black uppercase italic tracking-tighter">
            Rezervare <span className="text-amber-500">Online</span>
          </h1>
        </div>

        <form onSubmit={trimiteRezervare} className="p-8 space-y-4">
          <div className="space-y-3">
            <input type="text" required className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none font-bold shadow-sm" placeholder="Numele tău" value={form.nume} onChange={e => setForm({...form, nume: e.target.value})} />
            <div className="grid grid-cols-2 gap-3">
               <input type="tel" required className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none font-bold shadow-sm" placeholder="Telefon" value={form.telefon} onChange={e => setForm({...form, telefon: e.target.value})} />
               <input type="email" className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none font-bold shadow-sm" placeholder="Email (opț)" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-2 italic">Alege Serviciul</label>
              <select 
                required 
                className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none font-bold text-sm"
                value={form.serviciu}
                onChange={e => setForm({...form, serviciu: e.target.value})}
              >
                <option value="">Ce serviciu dorești?</option>
                {servicii.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
              </select>
            </div>

            {specialisti.length > 0 && (
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2 italic">Specialist (Opțional)</label>
                <select 
                  className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none font-bold text-sm"
                  value={form.specialist_id}
                  onChange={e => setForm({...form, specialist_id: e.target.value})}
                >
                  <option value="">Oricine este disponibil</option>
                  {specialisti.map((sp, idx) => <option key={idx} value={sp}>{sp}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-2 italic">Data</label>
              <input type="date" min={today} required className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none font-black text-xs" value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-2 italic">Ora</label>
              <button type="button" onClick={() => setShowPicker(true)} className="w-full p-4 bg-slate-900 text-amber-500 rounded-2xl border-2 border-slate-800 font-black text-center shadow-lg text-sm">
                {form.ora} 🕒
              </button>
            </div>
          </div>

          <textarea 
            rows={2}
            className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none font-bold shadow-sm resize-none text-xs" 
            placeholder="Mesaj suplimentar (opțional)..." 
            value={form.motiv} 
            onChange={e => setForm({...form, motiv: e.target.value})}
          />

          <button type="submit" disabled={loading} className="w-full py-5 bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] italic shadow-xl hover:bg-slate-900 transition-all disabled:opacity-50">
            {loading ? "Se trimite..." : "Confirmă Programarea ✨"}
          </button>
        </form>

        {showPicker && (
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-sm rounded-[35px] p-8 shadow-2xl">
              <h2 className="text-center font-black uppercase italic text-slate-900 mb-6">Alege Ora</h2>
              
              <div className="flex gap-4 h-64 bg-slate-50 p-4 rounded-3xl border border-slate-100 mb-6">
                <div className="flex-1 flex flex-col overflow-hidden">
                  <span className="text-[8px] font-black uppercase text-center text-slate-400 mb-2">Ora</span>
                  <div className="overflow-y-auto space-y-2 scrollbar-hide">
                    {Array.from({ length: 13 }, (_, i) => (i + 8).toString().padStart(2, '0')).map(h => (
                      <button 
                        key={h} 
                        type="button" 
                        onClick={() => setSelectedHour(h)} 
                        className={`w-full py-3 rounded-xl font-black text-sm transition-all ${selectedHour === h ? 'bg-amber-600 text-white' : 'text-slate-900 hover:bg-slate-200'}`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 flex flex-col border-l-2 border-slate-100 pl-4 overflow-hidden">
                  <span className="text-[8px] font-black uppercase text-center text-slate-400 mb-2">Minut</span>
                  <div className="overflow-y-auto space-y-2">
                    {["00", "15", "30", "45"].map(m => {
                      const blocked = isTimeBlocked(selectedHour, m);
                      return (
                        <button 
                          key={m} 
                          type="button" 
                          disabled={blocked}
                          onClick={() => setSelectedMinute(m)} 
                          className={`w-full py-3 rounded-xl font-black text-sm transition-all ${selectedMinute === m ? 'bg-slate-900 text-white' : blocked ? 'opacity-20 bg-slate-200 line-through' : 'text-slate-900 hover:bg-slate-200'}`}
                        >
                          {m} {blocked ? '✕' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button type="button" onClick={() => setShowPicker(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest italic shadow-lg">
                Gata (Ora {selectedHour}:{selectedMinute})
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function RezervarePage() {
  return <Suspense fallback={<div className="p-20 text-center font-black italic">Se încarcă aplicația...</div>}><RezervareContent /></Suspense>;
}