"use client";

import { useMemo, useState } from "react";

type Programare = {
  id: number;
  nume: string;
  data: string; 
  ora: string;
};

type ViewMode = "day" | "week" | "month";

const dayNamesShort = ["L", "M", "M", "J", "V", "S", "D"];
const monthNames = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"
];

export default function Calendar({ programari }: { programari: Programare[] }) {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const programariByDate = useMemo(() => {
    const map: Record<string, Programare[]> = {};
    programari.forEach(p => {
      if (!map[p.data]) map[p.data] = [];
      map[p.data].push(p);
    });
    return map;
  }, [programari]);

  // Logica de navigare
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

  return (
    <div className="w-full max-w-6xl mx-auto mt-8 bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden font-sans">
      
      {/* HEADER CALENDAR ACTUALIZAT */}
      <div className="p-6 md:p-8 border-b border-slate-50 flex flex-col md:flex-row items-center justify-between gap-6 bg-white">
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button onClick={handlePrev} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition text-slate-600">◀</button>
            <button onClick={() => {setCurrentDate(new Date()); setSelectedDate(new Date());}} className="px-4 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-amber-600">Azi</button>
            <button onClick={handleNext} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition text-slate-600">▶</button>
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {monthNames[currentDate.getMonth()]} <span className="text-amber-600">{currentDate.getFullYear()}</span>
          </h2>
        </div>

        {/* SELECTOR MOD VIZUALIZARE */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          {[
            { label: "Zi", value: "day" },
            { label: "Săptămână", value: "week" },
            { label: "Lună", value: "month" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setViewMode(opt.value as ViewMode)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all ${
                viewMode === opt.value 
                ? "bg-slate-900 text-white shadow-lg" 
                : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* GRID CALENDAR - FĂRĂ CREM */}
      <div className="p-4 md:p-8 bg-white">
        {viewMode === "month" && (
          <div className="grid grid-cols-7 gap-3">
            {dayNamesShort.map(d => (
              <div key={d} className="text-center font-black text-slate-300 text-[10px] uppercase py-2">{d}</div>
            ))}
            {/* Aici vine maparea zilelor (monthGrid) similar cu codul anterior, dar folosind:
                bg-slate-50 pentru zilele din alte luni
                bg-white pentru zilele curente
                text-amber-600 pentru ziua de azi
            */}
            {/* Exemplu stil celulă zi: */}
            <div className="min-h-[120px] p-4 rounded-[28px] border border-slate-50 bg-white hover:border-amber-200 transition-all cursor-pointer group">
               <span className="text-lg font-black text-slate-700 group-hover:text-amber-600">17</span>
               <div className="mt-2 space-y-1">
                  <div className="bg-slate-900 text-[9px] text-white p-1.5 rounded-lg font-bold truncate">09:00 - Service Auto</div>
               </div>
            </div>
          </div>
        )}

        {/* Dacă e vizualizarea pe ZI */}
        {viewMode === "day" && (
          <div className="max-w-2xl mx-auto py-10">
             <div className="flex items-center gap-6 mb-12">
                <div className="w-20 h-20 bg-amber-500 rounded-[30px] flex flex-col items-center justify-center text-white shadow-xl shadow-amber-200">
                   <span className="text-[10px] font-black uppercase opacity-60">Mar</span>
                   <span className="text-3xl font-black">17</span>
                </div>
                <h3 className="text-3xl font-black text-slate-800">Programări Astăzi</h3>
             </div>
             {/* Lista de ore... */}
          </div>
        )}
      </div>
    </div>
  );
}