"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

// Componenta care conține logica ce folosește useSearchParams
function CalendarContent() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";

  const [programari, setProgramari] = useState<Programare[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedProg, setSelectedProg] = useState<Programare | null>(null);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Programare | null>(null);
  const [customMessage, setCustomMessage] = useState("");

  useEffect(() => {
    fetchProgramari();
  }, []);

  useEffect(() => {
    if (selectedProg) {
      setCustomMessage(`Bună, ${selectedProg.nume}! Te așteptăm la programarea de azi, ora ${selectedProg.ora}. Te rugăm să ne anunți dacă intervine ceva. O zi bună!`);
    }
  }, [selectedProg]);

  async function fetchProgramari() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || isDemo) {
        const demoData: Programare[] = [
          { id: "demo-1", nume: "Client Test Demo", data: formatDateKey(new Date()), ora: "10:00", telefon: "0722000000", motiv: "Consultatție inițială (Mod Demo)" },
          { id: "demo-2", nume: "Programare Test", data: formatDateKey(addDays(new Date(), 1)), ora: "14:30", telefon: "0733000000", motiv: "Procedură estetică" },
        ];
        setProgramari(demoData);
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
      if (String(editForm.id).includes("demo")) {
        setProgramari(prev => prev.map(p => p.id === editForm.id ? editForm : p));
        setSelectedProg(editForm);
        setIsEditing(false);
        return;
      }

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
      if (String(selectedProg.id).includes("demo")) {
        setProgramari(prev => prev.filter(p => p.id !== selectedProg.id));
        setSelectedProg(null);
        return;
      }

      const { error } = await supabase.from('appointments').delete().eq('id', selectedProg.id);
      if (error) throw error;
      setProgramari(prev => prev.filter(p => p.id !== selectedProg.id));
      setSelectedProg(null);
    } catch (err) {
      console.error("Eroare la ștergere:", err);
    }
  };

  const sendWhatsAppReminder = (p: Programare) => {
    if (!p.telefon) return;
    const cleanPhone = p.telefon.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith('0') ? '4' + cleanPhone : cleanPhone;
    const message = encodeURIComponent(customMessage);
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
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
    <div className="relative group w-full" title={`${p.ora} - ${p.nume}`}>
      <div 
        onClick={(e) => { e.stopPropagation(); setSelectedProg(p); }}
        className={`w-full cursor-pointer bg-slate-900 text-white rounded-lg truncate font-black uppercase italic shadow-sm border border-slate-700 hover:bg-amber-600 hover:scale-[1.02] active:scale-95 transition-all ${isCompact ? 'text-[9px] px-2 py-1.5' : 'text-xs p-3'}`}
      >
        {p.ora} {p.nume}
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black italic text-slate-400 uppercase tracking-widest animate-pulse">
      Sincronizare Calendar...
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 p-2 md:p-8 flex flex-col items-center font-sans">
      
      {/* MODAL DETALII ȘI EDITARE */}
      {selectedProg && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" 
          onClick={() => { setSelectedProg(null); setIsEditing(false); }}
        >
          <div 
            className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" 
            onClick={e => e.stopPropagation()}
          >
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
            
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
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

              {!isEditing && selectedProg.telefon && (
                <div className="bg-green-50/50 p-6 rounded-3xl border border-green-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-black text-green-600 uppercase italic tracking-widest">Mesaj Reminder WhatsApp</p>
                    <span className="text-[10px] text-green-400 font-bold uppercase italic">Editabil</span>
                  </div>
                  <textarea 
                    className="w-full bg-white border border-green-200 rounded-2xl p-4 text-xs font-medium text-slate-700 outline-none focus:ring-2 ring-green-500/20 transition-all italic"
                    rows={3}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                  />
                  <button 
                    onClick={() => sendWhatsAppReminder(selectedProg)}
                    className="w-full bg-green-600 text-white py-3 rounded-2xl text-[10px] font-black uppercase italic tracking-widest hover:bg-green-700 transition shadow-lg active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span>Trimite pe WhatsApp</span>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.435 5.663 1.436h.008c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </button>
                </div>
              )}

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

              <div className="flex flex-col gap-3 pb-4">
                {isEditing ? (
                  <div className="flex gap-3">
                    <button onClick={handleCancelEdit} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition">Anulează</button>
                    <button onClick={handleUpdate} className="flex-[2] py-4 bg-green-600 text-white rounded-2xl font-black shadow-lg uppercase text-[10px] tracking-widest hover:bg-green-700 transition">Salvează</button>
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
      <div className="w-full max-w-6xl flex justify-between items-center mb-6 px-4 mt-4">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Calendar <span className="text-amber-600">Chronos</span></h1>
        <div className="flex gap-4">
            <Link 
              href={isDemo ? "/programari?demo=true" : "/programari"} 
              className="px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-50 transition shadow-sm active:scale-95 italic"
            >
              ⬅ Înapoi la Programări
            </Link>
        </div>
      </div>

      <div className="w-full max-w-6xl bg-white rounded-[32px] shadow-2xl border border-slate-300 overflow-hidden mb-20">
        <div className="p-4 md:p-6 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 bg-white">
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button onClick={() => nav(-1)} className="p-2 hover:bg-white rounded-xl transition text-slate-600 font-bold" title="Anterior">◀</button>
              <button onClick={() => setSelectedDate(new Date())} className="px-4 text-[10px] font-black uppercase text-slate-500 hover:text-amber-600 italic">Azi</button>
              <button onClick={() => nav(1)} className="p-2 hover:bg-white rounded-xl transition text-slate-600 font-bold" title="Următor">▶</button>
            </div>
            <h2 className="text-lg md:text-xl font-black text-slate-800 uppercase italic tracking-tighter">{monthNames[selectedDate.getMonth()]} <span className="text-amber-600">{selectedDate.getFullYear()}</span></h2>
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
            {(["day", "week", "month"] as ViewMode[]).map((opt) => (
              <button key={opt} onClick={() => setViewMode(opt)} className={`px-4 md:px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === opt ? "bg-slate-900 text-white shadow-xl italic" : "text-slate-400 hover:text-slate-600"}`}>
                {opt === "day" ? "Zi" : opt === "week" ? "Săpt" : "Lună"}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-200 w-full overflow-x-auto">
          {viewMode === "month" && (
            <div className="grid grid-cols-7 gap-[1px] min-w-[700px] w-full">
              {dayNamesShort.map(d => (
                <div key={d} className="text-center font-black text-slate-400 text-[10px] py-4 bg-slate-50 uppercase italic tracking-widest border-b border-slate-200">{d}</div>
              ))}
              {monthGrid.map((day, idx) => {
                const key = formatDateKey(day);
                const list = programariByDate[key] || [];
                const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                return (
                  <div key={idx} onClick={() => goToDay(day)} 
                    className={`min-h-[120px] md:min-h-[140px] p-2 md:p-3 flex flex-col items-start hover:bg-amber-50/50 transition-colors relative cursor-pointer ${isCurrentMonth ? "bg-white" : "bg-slate-100 opacity-40"}`}>
                    <span className={`text-[10px] md:text-xs font-black mb-2 px-2 py-1 rounded-lg ${sameDay(day, new Date()) ? "text-white bg-amber-600 shadow-lg" : "text-slate-400"}`}>{day.getDate()}</span>
                    <div className="w-full space-y-1">
                      {list.slice(0, 3).map(p => (
                        <AppointmentChip key={p.id} p={p} />
                      ))}
                      {list.length > 3 && (
                        <div className="text-[8px] font-black text-amber-600 uppercase italic px-1 pt-1 w-full">
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
              <div className="grid grid-cols-[80px_repeat(7,1fr)] min-w-[1000px] gap-[1px] bg-slate-200">
                <div className="p-4 bg-slate-100 font-black text-[10px] text-slate-400 sticky left-0 z-20 uppercase italic flex items-center justify-center border-r border-slate-200">Ora</div>
                {weekDays.map((d, i) => (
                  <button key={i} onClick={() => goToDay(d)} className={`p-4 text-center transition-colors hover:bg-amber-50 ${sameDay(d, new Date()) ? "bg-amber-50" : "bg-slate-50"}`}>
                    <div className="text-[10px] font-black text-slate-400 uppercase italic">{dayNamesShort[i]}</div>
                    <div className="text-xl font-black text-slate-800">{d.getDate()}</div>
                  </button>
                ))}
                
                {hours.map(h => (
                  <div key={h} className="contents">
                    <div className="p-4 bg-slate-50 text-[10px] font-black text-slate-500 text-center sticky left-0 z-20 border-r border-slate-200 border-b border-slate-100">
                      {String(h).padStart(2, '0')}:00
                    </div>
                    {weekDays.map((d, i) => {
                      const progs = (programariByDate[formatDateKey(d)] || []).filter(p => parseInt(p.ora) === h);
                      return (
                        <div key={i} onClick={() => goToDay(d)} className="min-h-[80px] bg-white p-1 hover:bg-slate-50/80 border-b border-slate-100 cursor-pointer transition-colors flex flex-col gap-1 relative">
                          {progs.map(p => (
                            <AppointmentChip key={p.id} p={p} />
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
            <div className="bg-white min-h-[600px] py-8 md:py-12 px-4 md:px-6">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-4 md:gap-8 mb-8 md:mb-12 p-6 md:p-10 bg-slate-900 rounded-[35px] md:rounded-[45px] text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 text-white/5 text-6xl md:text-8xl font-black italic uppercase">Agenda</div>
                  <div className="text-4xl md:text-5xl font-black text-amber-500 border-r border-slate-700 pr-6 md:pr-8 italic">{selectedDate.getDate()}</div>
                  <div>
                    <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic">{monthNames[selectedDate.getMonth()]}</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Planificare Zilnică</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {programariByDate[formatDateKey(selectedDate)]?.sort((a,b) => a.ora.localeCompare(b.ora)).map(p => (
                    <div key={p.id} className="w-full relative group">
                      <button onClick={() => setSelectedProg(p)}
                        className="w-full flex items-center gap-4 md:gap-6 p-5 md:p-7 bg-white border-2 border-slate-100 rounded-[25px] md:rounded-[30px] hover:border-amber-500 hover:shadow-xl transition-all text-left shadow-sm">
                        <span className="text-xl md:text-2xl font-black text-slate-900 group-hover:text-amber-600 w-20 md:w-24 italic">{p.ora}</span>
                        <div className="h-10 md:h-12 w-[3px] bg-slate-100 group-hover:bg-amber-500 rounded-full transition-colors"></div>
                        <span className="text-slate-800 font-black text-lg md:text-xl flex-1 uppercase italic tracking-tight">{p.nume}</span>
                        <span className="text-[10px] font-black text-amber-600 uppercase italic opacity-0 group-hover:opacity-100 transition-opacity tracking-widest">Detalii →</span>
                      </button>
                    </div>
                  )) || (
                    <div className="text-center py-20 border-4 border-dashed border-slate-100 rounded-[40px]">
                      <p className="text-slate-300 font-black uppercase italic tracking-tighter">Nicio programare pentru azi.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </main>
  );
}

// Pagina principală exportată care include Suspense
export default function CalendarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black italic text-slate-400 uppercase tracking-widest animate-pulse">
        Pregătire Calendar...
      </div>
    }>
      <CalendarContent />
    </Suspense>
  );
}