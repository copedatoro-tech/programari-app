"use client";

import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

type Programare = {
  id: any;
  nume: string;
  data: string; 
  ora: string;
  telefon?: string; // Am adăugat câmpul telefon
  motiv?: string;
};

type ViewMode = "day" | "week" | "month";

const dayNamesShort = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"];
const monthNames = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"
];

export default function Calendar({ programari }: { programari: Programare[] }) {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // --- MODIFICARE NOUĂ: State pentru Pop-up ---
  const [selectedProg, setSelectedProg] = useState<Programare | null>(null);
  const [mesajWhatsApp, setMesajWhatsApp] = useState("");

  // Actualizăm mesajul automat când selectăm o programare
  useEffect(() => {
    if (selectedProg) {
      setMesajWhatsApp(`Bună ziua, ${selectedProg.nume}! Vă confirmăm programarea din data de ${selectedProg.data}, ora ${selectedProg.ora}. Vă așteptăm!`);
    }
  }, [selectedProg]);

  const trimiteWhatsApp = () => {
    if (!selectedProg?.telefon) {
        alert("Acest client nu are număr de telefon salvat.");
        return;
    }
    const nrCurat = selectedProg.telefon.replace(/\D/g, "");
    const nrFinal = nrCurat.startsWith('0') ? '4' + nrCurat : nrCurat;
    window.open(`https://wa.me/${nrFinal}?text=${encodeURIComponent(mesajWhatsApp)}`, '_blank');
  };
  // --- SFÂRȘIT MODIFICARE NOUĂ ---

  const programariByDate = useMemo(() => {
    const map: Record<string, Programare[]> = {};
    programari.forEach(p => {
      if (!map[p.data]) map[p.data] = [];
      map[p.data].push(p);
    });
    return map;
  }, [programari]);

  const eliminaProgramare = async (id: any) => {
    if (confirm("Sigur dorești să ștergi această programare?")) {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (!error) {
        window.location.reload(); 
      } else {
        alert("Eroare la ștergere.");
      }
    }
  };

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const calendarDays = [];
    for (let i = 0; i < offset; i++) calendarDays.push(null);
    for (let i = 1; i <= days; i++) calendarDays.push(i);
    return calendarDays;
  }, [currentDate]);

  const handleNext = () => {
    const d = new Date(currentDate);
    viewMode === "month" ? d.setMonth(d.getMonth() + 1) : d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const handlePrev = () => {
    const d = new Date(currentDate);
    viewMode === "month" ? d.setMonth(d.getMonth() - 1) : d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
  };

  return (
    <div className="w-full max-w-6xl mx-auto mt-8 bg-white rounded-[50px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden font-sans transform transition-all">
      
      {/* --- POP-UP (MODAL) PENTRU WHATSAPP ȘI DETALII --- */}
      {selectedProg && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4"
          onClick={() => setSelectedProg(null)}
        >
          <div 
            className="bg-white rounded-[40px] w-full max-w-md shadow-2xl p-8 border border-slate-100 animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black italic uppercase text-slate-900">Detalii <span className="text-amber-500">Programare</span></h3>
                <button onClick={() => setSelectedProg(null)} className="text-slate-300 hover:text-red-500 text-2xl font-black">×</button>
            </div>
            
            <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-[25px] border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Client</p>
                    <p className="font-black text-slate-900 uppercase italic">{selectedProg.nume}</p>
                </div>
                
                <div className="bg-green-50 p-5 rounded-[30px] border border-green-100">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">💬</span>
                        <p className="text-[10px] font-black text-green-600 uppercase italic">Notificare WhatsApp</p>
                    </div>
                    <textarea 
                        className="w-full bg-white border border-green-100 rounded-2xl p-3 text-[11px] font-bold text-slate-600 outline-none italic"
                        rows={3}
                        value={mesajWhatsApp}
                        onChange={(e) => setMesajWhatsApp(e.target.value)}
                    />
                    <button 
                        onClick={trimiteWhatsApp}
                        className="w-full mt-3 bg-green-600 text-white py-3 rounded-[20px] text-[10px] font-black uppercase italic hover:bg-green-700 transition-all active:scale-95 shadow-lg shadow-green-100"
                    >
                        Trimite pe WhatsApp
                    </button>
                </div>

                <button 
                    onClick={() => { eliminaProgramare(selectedProg.id); setSelectedProg(null); }}
                    className="w-full py-3 bg-red-50 text-red-500 rounded-[20px] text-[9px] font-black uppercase italic border border-red-100 hover:bg-red-500 hover:text-white transition-all"
                >
                    Șterge Programarea
                </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER CALENDAR */}
      <div className="p-8 md:p-12 border-b border-slate-50 flex flex-col md:flex-row items-center justify-between gap-6 bg-white">
        <div className="flex items-center gap-8">
          <div className="flex bg-slate-50 p-2 rounded-[25px] border border-slate-100 shadow-inner">
            <button 
              title="Luna anterioară"
              onClick={handlePrev} 
              className="p-4 bg-white hover:bg-slate-900 hover:text-white rounded-[20px] transition-all shadow-sm border border-slate-100 text-slate-600 active:scale-90"
            >
              ◀
            </button>
            <button 
              title="Revino la data de astăzi"
              onClick={() => {setCurrentDate(new Date()); setSelectedDate(new Date());}} 
              className="px-8 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-amber-600 transition-colors italic"
            >
              Astăzi
            </button>
            <button 
              title="Luna următoare"
              onClick={handleNext} 
              className="p-4 bg-white hover:bg-slate-900 hover:text-white rounded-[20px] transition-all shadow-sm border border-slate-100 text-slate-600 active:scale-90"
            >
              ▶
            </button>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
            {monthNames[currentDate.getMonth()]} <span className="text-amber-500">.</span> <span className="text-slate-300">{currentDate.getFullYear()}</span>
          </h2>
        </div>

        {/* SELECTOR MOD VIZUALIZARE */}
        <div className="flex bg-slate-50 p-2 rounded-[28px] border border-slate-100 shadow-inner">
          {[
            { label: "Zi", value: "day", hint: "Vizualizare detaliată a programărilor pentru astăzi" },
            { label: "Săptămână", value: "week", hint: "Planificarea săptămânală a activității" },
            { label: "Lună", value: "month", hint: "Imaginea de ansamblu a lunii curente" },
          ].map((opt) => (
            <button
              key={opt.value}
              title={opt.hint}
              onClick={() => setViewMode(opt.value as ViewMode)}
              className={`px-10 py-4 rounded-[22px] text-[10px] font-black uppercase tracking-[0.2em] transition-all italic ${
                viewMode === opt.value 
                ? "bg-slate-900 text-white shadow-xl scale-105" 
                : "text-slate-400 hover:text-slate-900 hover:bg-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* GRID CALENDAR */}
      <div className="p-8 md:p-12 bg-white">
        {viewMode === "month" && (
          <div className="grid grid-cols-7 gap-6">
            {dayNamesShort.map(d => (
              <div key={d} className="text-center font-black text-slate-300 text-[10px] uppercase py-2 italic tracking-[0.4em]">{d}</div>
            ))}
            
            {daysInMonth.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} className="min-h-[160px] bg-slate-50/30 rounded-[40px] border border-transparent opacity-40"></div>;
              
              const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const progs = programariByDate[dateStr] || [];

              return (
                <div 
                  key={day} 
                  className={`min-h-[160px] p-6 rounded-[45px] border-2 transition-all relative group flex flex-col ${
                    isToday(day) 
                    ? "border-amber-500 bg-amber-50/30 shadow-2xl shadow-amber-100 ring-2 ring-amber-200" 
                    : "border-slate-50 hover:border-amber-200 hover:bg-slate-50/50 hover:shadow-xl hover:-translate-y-1"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-2xl font-black italic ${isToday(day) ? "text-amber-600" : "text-slate-900 opacity-80"}`}>{day}</span>
                    {progs.length > 0 && (
                      <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,1)]"></span>
                    )}
                  </div>
                  
                  <div className="mt-4 space-y-2 overflow-y-auto max-h-[90px] pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                    {progs.map((p) => (
                      <div 
                        key={p.id} 
                        onClick={() => setSelectedProg(p)} // DESCHIDE POP-UP LA CLICK
                        className="bg-slate-900 text-[9px] text-white p-2.5 rounded-[15px] font-black truncate relative group/item italic uppercase cursor-pointer transition-all hover:bg-amber-500 hover:pl-4 border-b-2 border-slate-800"
                        title={`Apasă pentru detalii și WhatsApp: ${p.ora} - ${p.nume}`}
                      >
                        {p.ora} · {p.nume}
                        <button 
                          title="Elimină definitiv această programare"
                          onClick={(e) => { e.stopPropagation(); eliminaProgramare(p.id); }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 bg-red-500 text-white w-5 h-5 rounded-xl opacity-0 group-hover/item:opacity-100 transition-all flex items-center justify-center text-[8px] shadow-lg border border-red-400 hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MOD VIZUALIZARE ZI */}
        {viewMode === "day" && (
          <div className="max-w-3xl mx-auto py-12">
            <div className="flex items-center gap-10 mb-16 p-10 bg-slate-900 rounded-[45px] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div className="w-28 h-28 bg-amber-500 rounded-[35px] flex flex-col items-center justify-center text-slate-900 shadow-2xl shadow-amber-500/20 transform -rotate-3 border-4 border-white">
                   <span className="text-[10px] font-black uppercase opacity-70 italic tracking-widest">Azi</span>
                   <span className="text-5xl font-black italic">{new Date().getDate()}</span>
                </div>
                <div className="z-10">
                   <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter">Programări <span className="text-amber-500">Zilnice</span></h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic mt-2">Sincronizat cu serverul Chronos</p>
                </div>
            </div>

            <div className="space-y-6">
              {programariByDate[new Date().toISOString().split('T')[0]]?.length ? (
                programariByDate[new Date().toISOString().split('T')[0]].map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => setSelectedProg(p)}
                    className="flex items-center justify-between p-8 bg-slate-50 rounded-[35px] border-2 border-slate-100 group hover:bg-white hover:border-amber-500 hover:shadow-2xl transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex items-center gap-8">
                      <span className="text-xl font-black text-amber-500 italic bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100">{p.ora}</span>
                      <div>
                        <p className="font-black text-slate-900 uppercase italic text-base tracking-tight">{p.nume}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{p.motiv || "Fără detalii suplimentare"}</p>
                      </div>
                    </div>
                    <button 
                      title="Elimină această programare din sistem"
                      onClick={(e) => { e.stopPropagation(); eliminaProgramare(p.id); }}
                      className="px-8 py-4 bg-white text-red-500 rounded-[20px] font-black text-[10px] uppercase italic hover:bg-red-500 hover:text-white transition-all shadow-sm border border-slate-200 hover:border-red-600 active:scale-95 active:shadow-none"
                    >
                      Elimină
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-24 bg-slate-50 rounded-[50px] border-4 border-dashed border-slate-100 flex flex-col items-center">
                  <span className="text-5xl mb-6 grayscale opacity-20">📅</span>
                  <p className="text-[11px] font-black uppercase italic text-slate-300 tracking-[0.5em]">Nicio programare pentru această zi.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-8 bg-slate-50/50 border-t border-slate-100 text-center">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em] italic">Chronos Visual Calendar Engine • v2.0</p>
      </div>
    </div>
  );
}