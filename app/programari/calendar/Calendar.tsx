"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Programare = {
  id: any;
  nume: string;
  data: string; 
  ora: string;
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

  // Grupăm programările pe zile pentru acces rapid
  const programariByDate = useMemo(() => {
    const map: Record<string, Programare[]> = {};
    programari.forEach(p => {
      if (!map[p.data]) map[p.data] = [];
      map[p.data].push(p);
    });
    return map;
  }, [programari]);

  // Funcție de eliminare programare
  const eliminaProgramare = async (id: any) => {
    if (confirm("Sigur dorești să ștergi această programare?")) {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (!error) {
        window.location.reload(); // Reîncărcăm pentru a actualiza lista
      } else {
        alert("Eroare la ștergere.");
      }
    }
  };

  // Logica pentru generarea zilelor lunii
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    
    // Ajustare pentru săptămâna care începe luni (JS are 0 pt Duminică)
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    
    const calendarDays = [];
    // Zilele goale de dinainte
    for (let i = 0; i < offset; i++) calendarDays.push(null);
    // Zilele lunii
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
    <div className="w-full max-w-6xl mx-auto mt-8 bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden font-sans">
      
      {/* HEADER CALENDAR */}
      <div className="p-6 md:p-10 border-b border-slate-50 flex flex-col md:flex-row items-center justify-between gap-6 bg-white">
        <div className="flex items-center gap-6">
          <div className="flex bg-slate-100 p-2 rounded-[22px]">
            <button onClick={handlePrev} className="p-3 hover:bg-white hover:shadow-sm rounded-xl transition text-slate-600">◀</button>
            <button onClick={() => {setCurrentDate(new Date()); setSelectedDate(new Date());}} className="px-5 py-1 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-amber-600 italic">Azi</button>
            <button onClick={handleNext} className="p-3 hover:bg-white hover:shadow-sm rounded-xl transition text-slate-600">▶</button>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">
            {monthNames[currentDate.getMonth()]} <span className="text-amber-600">{currentDate.getFullYear()}</span>
          </h2>
        </div>

        {/* SELECTOR MOD VIZUALIZARE */}
        <div className="flex bg-slate-100 p-2 rounded-[22px]">
          {[
            { label: "Zi", value: "day" },
            { label: "Săptămână", value: "week" },
            { label: "Lună", value: "month" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setViewMode(opt.value as ViewMode)}
              className={`px-8 py-3 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all italic ${
                viewMode === opt.value 
                ? "bg-slate-900 text-white shadow-xl scale-105" 
                : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* GRID CALENDAR */}
      <div className="p-6 md:p-10 bg-white">
        {viewMode === "month" && (
          <div className="grid grid-cols-7 gap-4">
            {dayNamesShort.map(d => (
              <div key={d} className="text-center font-black text-slate-400 text-[11px] uppercase py-4 italic tracking-widest">{d}</div>
            ))}
            
            {daysInMonth.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} className="min-h-[140px] bg-slate-50/50 rounded-[35px] border border-transparent"></div>;
              
              const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const progs = programariByDate[dateStr] || [];

              return (
                <div 
                  key={day} 
                  className={`min-h-[140px] p-5 rounded-[35px] border transition-all relative group flex flex-col ${
                    isToday(day) ? "border-amber-500 ring-2 ring-amber-100" : "border-slate-100 hover:border-amber-200"
                  }`}
                >
                  <span className={`text-xl font-black ${isToday(day) ? "text-amber-600" : "text-slate-800"}`}>{day}</span>
                  
                  <div className="mt-3 space-y-2 overflow-y-auto max-h-[80px] scrollbar-hide">
                    {progs.map((p) => (
                      <div 
                        key={p.id} 
                        className="bg-slate-900 text-[9px] text-white p-2 rounded-xl font-black truncate relative group/item italic uppercase"
                        title={`${p.ora} - ${p.nume}`}
                      >
                        {p.ora} - {p.nume}
                        {/* Buton ștergere rapidă la hover */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); eliminaProgramare(p.id); }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 bg-red-500 text-white w-4 h-4 rounded-md opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center text-[8px]"
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
          <div className="max-w-3xl mx-auto py-10">
             <div className="flex items-center gap-8 mb-16">
                <div className="w-24 h-24 bg-amber-600 rounded-[35px] flex flex-col items-center justify-center text-white shadow-2xl shadow-amber-200">
                   <span className="text-[10px] font-black uppercase opacity-70 italic">Azi</span>
                   <span className="text-4xl font-black">{new Date().getDate()}</span>
                </div>
                <h3 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter">Programări <span className="text-amber-600">Zilnice</span></h3>
             </div>

             <div className="space-y-4">
                {programariByDate[new Date().toISOString().split('T')[0]]?.length ? (
                  programariByDate[new Date().toISOString().split('T')[0]].map(p => (
                    <div key={p.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-[30px] border border-slate-100 group hover:bg-white hover:shadow-xl transition-all">
                      <div className="flex items-center gap-6">
                        <span className="text-lg font-black text-amber-600 italic">{p.ora}</span>
                        <div>
                          <p className="font-black text-slate-900 uppercase italic text-sm">{p.nume}</p>
                          <p className="text-xs text-slate-500 font-bold">{p.motiv || "Fără detalii"}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => eliminaProgramare(p.id)}
                        className="px-6 py-3 bg-red-50 text-red-500 rounded-2xl font-black text-[10px] uppercase italic hover:bg-red-500 hover:text-white transition-all shadow-sm"
                      >
                        Elimină
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
                    <p className="text-[11px] font-black uppercase italic text-slate-400">Nicio programare pentru această zi.</p>
                  </div>
                )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}