"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// --- UTILITARE ---
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const dayNamesShort = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"];
const monthNames = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];

type Programare = { id: any; nume: string; data: string; ora: string; telefon?: string; motiv?: string; };
type ViewMode = "day" | "week" | "month";

export default function CalendarPage() {
  const [programari, setProgramari] = useState<Programare[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedProg, setSelectedProg] = useState<Programare | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgramari();
  }, []);

  async function fetchProgramari() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setProgramari([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', session.user.id);

      if (data) {
        const formatted = data.map((item: any) => ({
          id: item.id,
          nume: item.title || "Client",
          data: item.date,
          ora: item.time,
          telefon: item.phone,
          motiv: item.details
        }));
        setProgramari(formatted);
      }
    } catch (err) {
      console.error("Eroare la încărcarea datelor:", err);
    } finally {
      setLoading(false);
    }
  }

  const programariByDate = useMemo(() => {
    const map: Record<string, Programare[]> = {};
    programari.forEach(p => {
      if (!map[p.data]) map[p.data] = [];
      map[p.data].push(p);
    });
    return map;
  }, [programari]);

  const nav = (direction: number) => {
    let nextDate = new Date(selectedDate);
    if (viewMode === "month") nextDate.setMonth(selectedDate.getMonth() + direction);
    else if (viewMode === "week") nextDate.setDate(selectedDate.getDate() + (direction * 7));
    else nextDate.setDate(selectedDate.getDate() + direction);
    setSelectedDate(nextDate);
  };

  const monthGrid = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startDay = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Date[] = [];
    for (let i = 0; i < startDay; i++) cells.push(addDays(firstOfMonth, i - startDay));
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(addDays(cells[cells.length - 1], 1));
    return cells;
  }, [selectedDate]);

  const weekDays = useMemo(() => {
    const start = getWeekStart(selectedDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black italic text-slate-400 uppercase tracking-widest animate-pulse">
      Sincronizare Calendar...
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col items-center">
      
      {/* MODAL DETALII */}
      {selectedProg && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedProg(null)}>
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-900 p-8 text-white relative">
              <button onClick={() => setSelectedProg(null)} className="absolute top-6 right-6 text-slate-400 hover:text-white text-2xl font-black">×</button>
              <h3 className="text-amber-500 font-black uppercase tracking-widest text-xs mb-2">Detalii Programare</h3>
              <p className="text-3xl font-black italic uppercase">{selectedProg.nume}</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl shadow-inner">🕒</div>
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase">Data și Ora</p>
                  <p className="font-bold text-slate-800">{selectedProg.data} | {selectedProg.ora}</p>
                </div>
              </div>
              {selectedProg.telefon && (
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl shadow-inner">📞</div>
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase">Telefon</p>
                    <p className="font-bold text-slate-800">{selectedProg.telefon}</p>
                  </div>
                </div>
              )}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner">
                <p className="text-xs font-black text-slate-400 uppercase mb-2">Motiv / Detalii</p>
                <p className="text-slate-700 font-medium italic">{selectedProg.motiv || "Fără detalii suplimentare."}</p>
              </div>
              <button onClick={() => setSelectedProg(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg hover:bg-slate-800 transition active:scale-95 uppercase text-xs tracking-widest">Închide Fișa</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER PAGINĂ - REINSTAURAT BUTONUL DE NAVIGARE */}
      <div className="w-full max-w-6xl flex justify-between items-center mb-6 px-4">
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Calendar <span className="text-amber-600">Chronos</span></h1>
        <div className="flex gap-4">
            <Link href="/programari" className="px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-50 transition shadow-sm active:scale-95 italic">⬅ Înapoi la Liste</Link>
        </div>
      </div>

      <div className="w-full max-w-6xl bg-white rounded-[32px] shadow-2xl border border-slate-300 overflow-hidden mb-20">
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 bg-white">
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button onClick={() => nav(-1)} className="p-2 hover:bg-white rounded-xl transition text-slate-600 font-bold">◀</button>
              <button onClick={() => setSelectedDate(new Date())} className="px-4 text-[10px] font-black uppercase text-slate-500 hover:text-amber-600 italic">Azi</button>
              <button onClick={() => nav(1)} className="p-2 hover:bg-white rounded-xl transition text-slate-600 font-bold">▶</button>
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">{monthNames[selectedDate.getMonth()]} <span className="text-amber-600">{selectedDate.getFullYear()}</span></h2>
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
            {(["day", "week", "month"] as ViewMode[]).map((opt) => (
              <button key={opt} onClick={() => setViewMode(opt)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === opt ? "bg-slate-900 text-white shadow-xl italic" : "text-slate-400 hover:text-slate-600"}`}>
                {opt === "day" ? "Zi" : opt === "week" ? "Săpt" : "Lună"}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-200">
          {viewMode === "month" && (
            <div className="grid grid-cols-7 gap-[1px]">
              {dayNamesShort.map(d => (
                <div key={d} className="text-center font-black text-slate-400 text-[10px] py-4 bg-slate-50 uppercase italic tracking-widest border-b border-slate-200">{d}</div>
              ))}
              {monthGrid.map((day, idx) => {
                const key = formatDateKey(day);
                const list = programariByDate[key] || [];
                const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                return (
                  <button key={idx} onClick={() => { setSelectedDate(day); setViewMode("day"); }} 
                    className={`min-h-[140px] p-3 flex flex-col items-start hover:bg-amber-50/50 transition-colors relative ${isCurrentMonth ? "bg-white" : "bg-slate-100 opacity-40"}`}>
                    <span className={`text-xs font-black mb-2 px-2.5 py-1 rounded-lg ${sameDay(day, new Date()) ? "text-white bg-amber-600 shadow-lg" : "text-slate-400"}`}>{day.getDate()}</span>
                    <div className="w-full space-y-1.5">
                      {list.slice(0, 4).map(p => (
                        <div key={p.id} className="text-[9px] bg-slate-900 text-white px-2 py-1.5 rounded-lg truncate font-black uppercase italic shadow-sm border border-slate-700">
                          {p.ora} {p.nume}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {viewMode === "week" && (
            <div className="overflow-x-auto bg-white">
              <div className="grid grid-cols-8 min-w-[1000px] gap-[1px] bg-slate-200">
                <div className="p-4 bg-slate-100 font-black text-[10px] text-slate-400 sticky left-0 z-20 uppercase italic flex items-center justify-center">Ora</div>
                {weekDays.map((d, i) => (
                  <div key={i} className={`p-4 text-center ${sameDay(d, new Date()) ? "bg-amber-50" : "bg-slate-50"}`}>
                    <div className="text-[10px] font-black text-slate-400 uppercase italic">{dayNamesShort[i]}</div>
                    <div className="text-xl font-black text-slate-800">{d.getDate()}</div>
                  </div>
                ))}
                {hours.map(h => (
                  <div key={h} className="contents">
                    <div className="p-4 bg-slate-50 text-[10px] font-black text-slate-500 text-center sticky left-0 z-20 border-r border-slate-200">{String(h).padStart(2, '0')}:00</div>
                    {weekDays.map((d, i) => {
                      const progs = (programariByDate[formatDateKey(d)] || []).filter(p => parseInt(p.ora) === h);
                      return (
                        <div key={i} className="min-h-[80px] bg-white p-1.5 hover:bg-slate-50/80 border-b border-slate-100">
                          {progs.map(p => (
                            <button key={p.id} onClick={() => setSelectedProg(p)} 
                              className="w-full text-[9px] bg-slate-900 text-white p-2 rounded-xl font-black uppercase italic truncate mb-1 shadow-md border border-slate-800 hover:scale-[1.02] transition-transform">
                              {p.nume}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === "day" && (
            <div className="bg-white min-h-[600px] py-12 px-6">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-8 mb-12 p-10 bg-slate-900 rounded-[45px] text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 text-white/5 text-8xl font-black italic uppercase">Agenda</div>
                  <div className="text-5xl font-black text-amber-500 border-r border-slate-700 pr-8 italic">{selectedDate.getDate()}</div>
                  <div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter italic">{monthNames[selectedDate.getMonth()]}</h3>
                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-1">Planificare Zilnică</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {programariByDate[formatDateKey(selectedDate)]?.sort((a,b) => a.ora.localeCompare(b.ora)).map(p => (
                    <button key={p.id} onClick={() => setSelectedProg(p)} 
                      className="w-full flex items-center gap-6 p-7 bg-white border-2 border-slate-100 rounded-[30px] hover:border-amber-500 hover:shadow-xl transition-all text-left shadow-sm group">
                      <span className="text-2xl font-black text-slate-900 group-hover:text-amber-600 w-24 italic">{p.ora}</span>
                      <div className="h-12 w-[3px] bg-slate-100 group-hover:bg-amber-500 rounded-full transition-colors"></div>
                      <span className="text-slate-800 font-black text-xl flex-1 uppercase italic tracking-tight">{p.nume}</span>
                      <span className="text-[10px] font-black text-amber-600 uppercase italic opacity-0 group-hover:opacity-100 transition-opacity tracking-widest">Detalii →</span>
                    </button>
                  )) || (
                    <div className="text-center py-24 border-4 border-dashed border-slate-100 rounded-[45px]">
                      <p className="text-slate-300 font-black uppercase italic tracking-tighter">Nicio programare pentru azi.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}