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
    } catch (e) {
      console.error("Eroare la încărcare config:", e);
    } finally {
      setFetchingConfig(false);
    }
  }, [adminId, supabase]);

  useEffect(() => {
    fetchAdminConfig();
  }, [fetchAdminConfig]);

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
    } else {
      alert("Eroare la procesare: " + error.message);
    }
    setLoading(false);
  };

  if (fetchingConfig) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="font-black text-slate-900 italic uppercase animate-pulse tracking-[0.2em] text-xs">
        Se încarcă calendarul Chronos...
      </div>
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
        <button 
          title="Revino la formularul de rezervare" 
          onClick={() => window.location.reload()} 
          className="mt-10 px-10 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase italic text-[10px] tracking-widest hover:bg-amber-600 transition-all shadow-lg active:scale-95"
        >
          REZERVĂ DIN NOU
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-900 relative">
      <style jsx global>{`
        nav, header:not(.local-header), .menu-button, button[title="MENU"] {
          display: none !important;
        }
      `}</style>

      <div className="w-full max-w-lg bg-white rounded-[45px] shadow-2xl border border-slate-200 overflow-hidden z-10">
        <div className="bg-slate-900 p-10 text-white text-center local-header relative overflow-hidden flex flex-col items-center">
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
          
          {/* LOGO */}
          <div className="mb-4">
            <Image 
              src="/logo-chronos.png" 
              alt="Logo Chronos" 
              width={50} 
              height={50} 
              className="object-contain"
            />
          </div>

          <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter leading-none">
            PROGRAMARE <span className="text-amber-500 underline decoration-2 underline-offset-8">ONLINE</span>
          </h1>
          <p className="text-[9px] font-bold text-slate-400 mt-4 tracking-[0.4em] uppercase opacity-70">Sistem de gestiune Chronos</p>
        </div>

        <form onSubmit={trimiteRezervare} className="p-8 md:p-12 space-y-7">
          <div className="space-y-4">
            <div className="relative">
              <input 
                title="Introdu numele tău complet pentru identificare" 
                type="text" required 
                className="w-full p-6 bg-slate-50 rounded-[22px] border-2 border-slate-100 focus:border-amber-500 focus:bg-white outline-none font-black text-sm uppercase transition-all" 
                placeholder="NUME ȘI PRENUME" 
                value={form.nume} 
                onChange={e => setForm({...form, nume: e.target.value})} 
              />
            </div>
            <div className="relative">
              <input 
                title="Numărul de telefon este necesar pentru confirmarea programării" 
                type="tel" required 
                className="w-full p-6 bg-slate-50 rounded-[22px] border-2 border-slate-100 focus:border-amber-500 focus:bg-white outline-none font-black text-sm transition-all" 
                placeholder="TELEFON (EX: 0722...)" 
                value={form.telefon} 
                onChange={e => setForm({...form, telefon: e.target.value})} 
              />
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 ml-3 italic tracking-widest">Serviciu dorit</label>
              <select 
                title="Alege tipul de serviciu de care ai nevoie"
                required 
                className="w-full p-6 bg-slate-50 rounded-[22px] border-2 border-slate-100 focus:border-amber-500 outline-none font-black text-sm uppercase italic cursor-pointer appearance-none transition-all"
                value={form.serviciu}
                onChange={e => setForm({...form, serviciu: e.target.value})}
              >
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
              <select 
                title="Poți alege un specialist anume sau 'Oricine' pentru prima disponibilitate"
                required 
                className="w-full p-6 bg-slate-50 rounded-[22px] border-2 border-slate-100 focus:border-amber-500 outline-none font-black text-sm uppercase italic cursor-pointer appearance-none transition-all"
                value={form.specialist_id}
                onChange={e => setForm({...form, specialist_id: e.target.value})}
              >
                <option value="Oricine">Oricine (Disponibilitate maximă)</option>
                {specialistiFiltrati.map((sp, idx) => (
                  <option key={sp.id || idx} value={sp.nume}>
                    {(sp.nume || "Membru Staff").toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 ml-3 italic tracking-widest">Data</label>
              <input 
                title="Selectează ziua în care dorești să vii la noi" 
                type="date" min={today} required 
                className="w-full p-6 bg-slate-50 rounded-[22px] border-2 border-slate-100 focus:border-amber-500 outline-none font-black text-[12px] cursor-pointer transition-all" 
                value={form.data} 
                onChange={e => setForm({...form, data: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 ml-3 italic tracking-widest">Ora</label>
              <button 
                type="button" 
                title={`Interval selectat: ${form.ora}. Apasă pentru a schimba ora.`}
                onClick={() => setShowPicker(true)} 
                className="w-full p-6 bg-slate-900 text-amber-500 rounded-[22px] font-black text-base shadow-xl hover:bg-amber-600 hover:text-white transition-all border-b-4 border-slate-700 active:border-b-0 active:translate-y-1"
              >
                {form.ora}
              </button>
            </div>
          </div>

          <button 
            title="Finalizează și trimite solicitarea către recepție" 
            type="submit" 
            disabled={loading} 
            className="w-full py-7 mt-6 bg-slate-900 text-white rounded-[28px] font-black text-sm uppercase tracking-[0.3em] italic shadow-2xl hover:bg-amber-600 transition-all border-b-4 border-slate-800 disabled:opacity-50"
          >
            {loading ? "SE TRIMITE..." : "CONFIRMĂ REZERVAREA"}
          </button>
        </form>

        {showPicker && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div ref={pickerRef} className="bg-white w-full max-w-sm rounded-[45px] p-10 shadow-2xl relative border-t-8 border-amber-500">
              <h2 className="text-center font-black uppercase italic mb-8 text-slate-900 tracking-tighter">Alege Intervalul</h2>
              <div className="flex gap-4 h-72 bg-slate-50 p-6 rounded-[35px] mb-8 shadow-inner border border-slate-100">
                <div className="flex-1 overflow-y-auto space-y-2 text-center custom-scrollbar">
                  {Array.from({ length: 13 }, (_, i) => (i + 8).toString().padStart(2, '0')).map(h => (
                    <button 
                      key={h} 
                      type="button" 
                      title={`Ora ${h}`}
                      onClick={() => setSelectedHour(h)} 
                      className={`w-full py-4 rounded-2xl font-black text-xs transition-all ${selectedHour === h ? 'bg-amber-500 text-white scale-105 shadow-lg' : 'text-slate-300 hover:text-slate-600'}`}
                    >
                      {h}:00
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 text-center border-l-2 border-slate-200 pl-4 custom-scrollbar">
                  {["00", "15", "30", "45"].map(m => {
                    const blocked = isTimeBlocked(selectedHour, m);
                    return (
                      <button 
                        key={m} 
                        type="button" 
                        disabled={blocked} 
                        title={blocked ? "Interval ocupat" : `Minutul ${m}`}
                        onClick={() => setSelectedMinute(m)}
                        className={`w-full py-4 rounded-2xl font-black text-xs transition-all ${selectedMinute === m ? 'bg-slate-900 text-white scale-105' : blocked ? 'opacity-20 cursor-not-allowed' : 'text-slate-300 hover:text-slate-600'}`}
                      >
                        :{m}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button 
                title="Salvează ora selectată" 
                type="button" 
                onClick={() => setShowPicker(false)} 
                className="w-full py-5 bg-slate-900 text-amber-500 rounded-[22px] font-black uppercase text-xs italic tracking-[0.2em] hover:bg-amber-500 hover:text-white transition-all shadow-lg active:scale-95"
              >
                SELECTEAZĂ
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function RezervarePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white font-black text-slate-900 italic uppercase">
        Pregătim formularul...
      </div>
    }>
      <RezervareContent />
    </Suspense>
  );
}