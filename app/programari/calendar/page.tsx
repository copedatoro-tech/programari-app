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

  // Stări pentru editare
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Programare | null>(null);

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

  // --- LOGICĂ CRUD ---
  const handleEditClick = () => {
    setEditForm(selectedProg);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm(null);
  };

  const handleUpdate = async () => {
    if (!editForm) return;
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          title: editForm.nume,
          date: editForm.data,
          time: editForm.ora,
          phone: editForm.telefon,
          details: editForm.motiv
        })
        .eq('id', editForm.id);

      if (error) throw error;

      setProgramari(prev => prev.map(p => p.id === editForm.id ? editForm : p));
      setSelectedProg(editForm);
      setIsEditing(false);
    } catch (err) {
      console.error("Eroare la actualizare:", err);
      alert("Nu s-a putut salva modificarea.");
    }
  };

  const handleDelete = async () => {
    if (!selectedProg || !confirm("Ești sigur că vrei să ștergi această programare?")) return;
    try {
      const { error } = await supabase.from('appointments').delete().eq('id', selectedProg.id);
      if (error) throw error;
      setProgramari(prev => prev.filter(p => p.id !== selectedProg.id));
      setSelectedProg(null);
    } catch (err) {
      console.error("Eroare la ștergere:", err);
    }
  };

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

  const goToDay = (date: Date) => {
    setSelectedDate(date);
    setViewMode("day");
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

  const AppointmentChip = ({ p, isCompact = true }: { p: Programare, isCompact?: boolean }) => (
    <div className="relative group w-full">
      <div 
        onClick={(e) => { e.stopPropagation(); setSelectedProg(p); }}
        className={`w-full cursor-pointer bg-slate-900 text-white rounded-lg truncate font-black uppercase italic shadow-sm border border-slate-700 hover:bg-amber-600 transition-all ${isCompact ? 'text-[9px] px-2 py-1.5' : 'text-xs p-3'}`}
      >
        {p.ora} {p.nume}
      </div>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white p-3 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-[60] border border-amber-500/30 scale-95 group-hover:scale-100">
        <p className="text-amber-500 font-black text-[10px] uppercase mb-1 italic tracking-tighter">{p.ora} - {p.nume}</p>
        {p.telefon && <p className="text-[9px] text-slate-300 mb-1">📞 {p.telefon}</p>}
        {p.motiv && <p className="text-[9px] text-slate-400 italic line-clamp-2">"{p.motiv}"</p>}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black italic text-slate-400 uppercase tracking-widest animate-pulse">
      Sincronizare Calendar...
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col items-center">
      
      {/* MODAL DETALII ȘI EDITARE */}
      {selectedProg && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => { setSelectedProg(null); setIsEditing(false); }}>
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-900 p-8 text-white relative">
              <button onClick={() => { setSelectedProg(null); setIsEditing(false); }} className="absolute top-6 right-6 text-slate-400 hover:text-white text-2xl font-black">×</button>
              <h3 className="text-amber-500 font-black uppercase tracking-widest text-xs mb-2">
                {isEditing ? "Editare Detalii" : "Fișă Programare"}
              </h3>
              {isEditing ? (
                <input 
                  type="text" 
                  className="bg-slate-800 text-white text-3xl font-black italic uppercase w-full border-b-2 border-amber-500 outline-none p-1"
                  value={editForm?.nume}
                  onChange={e => setEditForm(prev => prev ? {...prev, nume: e.target.value} : null)}
                />
              ) : (
                <p className="text-3xl font-black italic uppercase">{selectedProg.nume}</p>
              )}
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <p className="text-xs font-black text-slate-400 uppercase">Data</p>
                  {isEditing ? (
                    <input type="date" className="w-full bg-transparent font-bold text-slate-800 outline-none" value={editForm?.data} onChange={e => setEditForm(prev => prev ? {...prev, data: e.target.value} : null)} />
                  ) : (
                    <p className="font-bold text-slate-800">{selectedProg.data}</p>
                  )}
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <p className="text-xs font-black text-slate-400 uppercase">Ora</p>
                  {isEditing ? (
                    <input type="time" className="w-full bg-transparent font-bold text-slate-800 outline-none" value={editForm?.ora} onChange={e => setEditForm(prev => prev ? {...prev, ora: e.target.value} : null)} />
                  ) : (
                    <p className="font-bold text-slate-800">{selectedProg.ora}</p>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                <p className="text-xs font-black text-slate-400 uppercase">Telefon</p>
                {isEditing ? (
                  <input type="text" className="w-full bg-transparent font-bold text-slate-800 outline-none" value={editForm?.telefon} onChange={e => setEditForm(prev => prev ? {...prev, telefon: e.target.value} : null)} />
                ) : (
                  <p className="font-bold text-slate-800">{selectedProg.telefon || "Nespecificat"}</p>
                )}
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner">
                <p className="text-xs font-black text-slate-400 uppercase mb-2">Motiv / Detalii</p>
                {isEditing ? (
                  <textarea 
                    className="w-full bg-transparent text-slate-700 font-medium italic outline-none"
                    rows={3}
                    value={editForm?.motiv}
                    onChange={e => setEditForm(prev => prev ? {...prev, motiv: e.target.value} : null)}
                  />
                ) : (
                  <p className="text-slate-700 font-medium italic">{selectedProg.motiv || "Fără detalii suplimentare."}</p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {isEditing ? (
                  <div className="flex gap-3">
                    <button onClick={handleCancelEdit} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest">Anulează</button>
                    <button onClick={handleUpdate} className="flex-[2] py-4 bg-green-600 text-white rounded-2xl font-black shadow-lg uppercase text-[10px] tracking-widest">Salvează</button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-3">
                      <button onClick={() => setSelectedProg(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition">Închide</button>
                      <button onClick={handleEditClick} className="flex-[2] py-4 bg-amber-600 text-white rounded-2xl font-black shadow-lg hover:bg-amber-700 transition active:scale-95 uppercase text-[10px] tracking-widest">Modifică Datele</button>
                    </div>
                    <button onClick={handleDelete} className="w-full py-3 text-red-500 font-black uppercase text-[9px] tracking-[0.2em] hover:text-red-700 transition">Șterge Programarea</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER PAGINĂ */}
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
                  <div key={idx} onClick={() => goToDay(day)} 
                    className={`min-h-[140px] p-3 flex flex-col items-start hover:bg-amber-50/50 transition-colors relative cursor-pointer ${isCurrentMonth ? "bg-white" : "bg-slate-100 opacity-40"}`}>
                    <span className={`text-xs font-black mb-2 px-2.5 py-1 rounded-lg ${sameDay(day, new Date()) ? "text-white bg-amber-600 shadow-lg" : "text-slate-400"}`}>{day.getDate()}</span>
                    <div className="w-full space-y-1.5">
                      {list.slice(0, 3).map(p => (
                        <AppointmentChip key={p.id} p={p} />
                      ))}
                      {list.length > 3 && (
                        <div className="text-[9px] font-black text-amber-600 uppercase italic px-1 pt-1 border-t border-slate-100 w-full text-left">
                          + încă {list.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === "week" && (
            <div className="overflow-x-auto bg-white">
              <div className="grid grid-cols-8 min-w-[1000px] gap-[1px] bg-slate-200">
                <div className="p-4 bg-slate-100 font-black text-[10px] text-slate-400 sticky left-0 z-20 uppercase italic flex items-center justify-center">Ora</div>
                {weekDays.map((d, i) => (
                  <button key={i} onClick={() => goToDay(d)} className={`p-4 text-center transition-colors hover:bg-amber-50 ${sameDay(d, new Date()) ? "bg-amber-50" : "bg-slate-50"}`}>
                    <div className="text-[10px] font-black text-slate-400 uppercase italic">{dayNamesShort[i]}</div>
                    <div className="text-xl font-black text-slate-800">{d.getDate()}</div>
                  </button>
                ))}
                {hours.map(h => (
                  <div key={h} className="contents">
                    <div className="p-4 bg-slate-50 text-[10px] font-black text-slate-500 text-center sticky left-0 z-20 border-r border-slate-200">{String(h).padStart(2, '0')}:00</div>
                    {weekDays.map((d, i) => {
                      const progs = (programariByDate[formatDateKey(d)] || []).filter(p => parseInt(p.ora) === h);
                      return (
                        <div key={i} onClick={() => goToDay(d)} className="min-h-[90px] bg-white p-2 hover:bg-slate-50/80 border-b border-slate-100 cursor-pointer transition-colors flex flex-col gap-1.5 relative">
                          {progs.slice(0, 2).map(p => (
                            <AppointmentChip key={p.id} p={p} />
                          ))}
                          {progs.length > 2 && (
                            <div className="text-[8px] font-black text-amber-600 uppercase italic px-1 mt-auto">
                              +{progs.length - 2} altele
                            </div>
                          )}
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
                    <div key={p.id} className="w-full relative group">
                      <button onClick={() => setSelectedProg(p)}
                        className="w-full flex items-center gap-6 p-7 bg-white border-2 border-slate-100 rounded-[30px] hover:border-amber-500 hover:shadow-xl transition-all text-left shadow-sm">
                        <span className="text-2xl font-black text-slate-900 group-hover:text-amber-600 w-24 italic">{p.ora}</span>
                        <div className="h-12 w-[3px] bg-slate-100 group-hover:bg-amber-500 rounded-full transition-colors"></div>
                        <span className="text-slate-800 font-black text-xl flex-1 uppercase italic tracking-tight">{p.nume}</span>
                        <span className="text-[10px] font-black text-amber-600 uppercase italic opacity-0 group-hover:opacity-100 transition-opacity tracking-widest">Detalii →</span>
                      </button>
                    </div>
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