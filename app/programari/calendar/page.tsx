"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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

type Programare = { id: any; nume: string; data: string; ora: string; telefon?: string; motiv?: string; user_id?: string; };
type ViewMode = "day" | "week" | "month";

function CalendarContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname(); // Pentru a detecta pagina curentă
  const isDemo = searchParams.get("demo") === "true";

  const [programari, setProgramari] = useState<Programare[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const [editForm, setEditForm] = useState<Programare | null>(null);
  const [customMessage, setCustomMessage] = useState("");

  useEffect(() => {
    fetchProgramari();
  }, []);

  useEffect(() => {
    if (editForm) {
      setCustomMessage(`Bună, ${editForm.nume}! Te așteptăm la programarea din data de ${editForm.data}, ora ${editForm.ora}. Te rugăm să ne anunți dacă intervine ceva. O zi bună!`);
    }
  }, [editForm]);

  async function fetchProgramari() {
    setLoading(true);
    try {
      const sessionResponse = await supabase?.auth?.getSession();
      const session = sessionResponse?.data?.session;
      
      if (!session || isDemo) {
        const demoData: Programare[] = [
          { id: "demo-1", nume: "Client Test Demo", data: formatDateKey(new Date()), ora: "10:00", telefon: "0722000000", motiv: "Consultație inițială (Mod Demo)" },
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
          motiv: item.details,
          user_id: item.user_id
        }));
        setProgramari(formatted);
      }
    } catch (err) {
      console.error("Eroare la încărcarea datelor:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenEdit = (p: Programare) => {
    setEditForm({ ...p });
  };

  const handleCloseModal = () => {
    setEditForm(null);
  };

  const handleUpdate = async () => {
    if (!editForm) return;
    try {
      if (String(editForm.id).includes("demo")) {
        setProgramari(prev => prev.map(p => p.id === editForm.id ? editForm : p));
        handleCloseModal();
        return;
      }

      const sessionResponse = await supabase?.auth?.getSession();
      const session = sessionResponse?.data?.session;
      if (!session) return;

      const { error } = await supabase
        .from('appointments')
        .update({
          title: editForm.nume,
          date: editForm.data,
          time: editForm.ora,
          phone: editForm.telefon,
          details: editForm.motiv
        })
        .eq('id', editForm.id)
        .eq('user_id', session.user.id);

      if (error) throw error;

      setProgramari(prev => prev.map(p => p.id === editForm.id ? editForm : p));
      handleCloseModal();
    } catch (err) {
      console.error("Eroare la actualizare:", err);
      alert("Nu s-a putut salva modificarea.");
    }
  };

  const handleDelete = async () => {
    if (!editForm || !confirm("Ești sigur că vrei să ștergi definitiv această programare?")) return;
    try {
      if (String(editForm.id).includes("demo")) {
        setProgramari(prev => prev.filter(p => p.id !== editForm.id));
        handleCloseModal();
        return;
      }

      const sessionResponse = await supabase?.auth?.getSession();
      const session = sessionResponse?.data?.session;
      if (!session) return;

      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', editForm.id)
        .eq('user_id', session.user.id);

      if (error) throw error;

      setProgramari(prev => prev.filter(p => p.id !== editForm.id));
      handleCloseModal();
    } catch (err) {
      console.error("Eroare la ștergere:", err);
      alert("Nu s-a putut șterge programarea.");
    }
  };

  const sendWhatsAppReminder = () => {
    if (!editForm?.telefon) {
        alert("Clientul nu are număr de telefon.");
        return;
    }
    const cleanPhone = editForm.telefon.replace(/\D/g, "");
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
    <div className="relative group w-full">
      <button 
        title={`Editare programare: ${p.ora} - ${p.nume}`}
        onClick={(e) => { e.stopPropagation(); handleOpenEdit(p); }}
        className={`w-full text-left cursor-pointer bg-slate-900 text-white rounded-xl truncate font-black uppercase italic shadow-sm border border-slate-700 hover:bg-amber-600 hover:scale-[1.02] active:scale-95 transition-all ${isCompact ? 'text-[9px] px-2 py-1.5' : 'text-xs p-3'}`}
      >
        {p.ora} {p.nume}
      </button>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-[110] w-48 bg-slate-800 text-white text-[10px] p-2 rounded-lg shadow-xl pointer-events-none border border-amber-500/30 text-center">
        <p className="font-black text-amber-500">Click pentru editare & WhatsApp</p>
        <p className="italic text-slate-300">{p.ora} - {p.nume}</p>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
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
      
      {/* MODAL EDITARE ȘI ELIMINARE */}
      {editForm && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" 
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200" 
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-slate-900 p-8 text-white relative">
              <button 
                title="Închide fără să salvezi" 
                onClick={handleCloseModal} 
                className="absolute top-6 right-6 text-slate-400 hover:text-white text-2xl font-black transition-transform hover:scale-110"
              >
                ×
              </button>
              <h3 className="text-amber-500 font-black uppercase tracking-widest text-xs mb-2 italic">
                Gestionare Programare
              </h3>
              <input 
                title="Numele clientului"
                type="text" 
                className="bg-slate-800 text-white text-3xl font-black italic uppercase w-full border-b-2 border-amber-500 outline-none p-1 rounded-t-lg"
                value={editForm.nume}
                onChange={e => setEditForm({...editForm, nume: e.target.value})}
              />
            </div>
            
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-[25px] border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase italic">Data</p>
                  <input title="Schimbă data programării" type="date" className="w-full bg-transparent font-bold text-slate-800 outline-none" value={editForm.data} onChange={e => setEditForm({...editForm, data: e.target.value})} />
                </div>
                <div className="bg-slate-50 p-4 rounded-[25px] border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase italic">Ora</p>
                  <input title="Schimbă ora programării" type="time" className="w-full bg-transparent font-bold text-slate-800 outline-none" value={editForm.ora} onChange={e => setEditForm({...editForm, ora: e.target.value})} />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-[25px] border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase italic">Telefon</p>
                <input title="Numărul de telefon al clientului" type="text" className="w-full bg-transparent font-bold text-slate-800 outline-none" value={editForm.telefon || ""} onChange={e => setEditForm({...editForm, telefon: e.target.value})} />
              </div>

              <div className="bg-green-50/50 p-6 rounded-[30px] border border-green-100 space-y-3">
                <p className="text-[10px] font-black text-green-600 uppercase italic tracking-widest flex items-center gap-2">
                  <span className="text-lg">💬</span> Notificare WhatsApp
                </p>
                <textarea 
                  title="Mesajul care va fi trimis pe WhatsApp"
                  className="w-full bg-white border border-green-200 rounded-2xl p-4 text-[11px] font-bold text-slate-700 outline-none italic"
                  rows={3}
                  placeholder="Mesaj pentru client..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                />
                <button 
                  title="Trimite mesajul pe WhatsApp"
                  onClick={sendWhatsAppReminder}
                  className="w-full bg-green-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase italic tracking-widest hover:bg-green-700 transition shadow-lg flex items-center justify-center gap-2 active:scale-95"
                >
                  Trimite pe WhatsApp
                </button>
              </div>

              <div className="bg-slate-50 p-6 rounded-[30px] border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase italic mb-2">Motiv / Detalii</p>
                <textarea 
                  title="Note suplimentare despre programare"
                  className="w-full bg-transparent text-slate-700 font-bold italic outline-none"
                  rows={3}
                  value={editForm.motiv || ""}
                  onChange={e => setEditForm({...editForm, motiv: e.target.value})}
                />
              </div>

              <div className="flex flex-col gap-3 pb-4">
                <div className="flex gap-3">
                  <button title="Anulează modificările" onClick={handleCloseModal} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-[22px] font-black uppercase text-[10px] italic hover:bg-slate-200 transition active:scale-95 border border-slate-200">Închide</button>
                  <button title="Confirmă și salvează modificările" onClick={handleUpdate} className="flex-[2] py-4 bg-slate-900 text-white rounded-[22px] font-black shadow-lg uppercase text-[10px] italic hover:bg-black transition active:scale-95">Salvează Modificările</button>
                </div>
                <button 
                  title="Șterge definitiv programarea din sistem"
                  onClick={handleDelete} 
                  className="w-full py-4 bg-red-50 text-red-500 rounded-[22px] font-black uppercase text-[10px] italic hover:bg-red-500 hover:text-white transition-all border border-red-100 active:scale-95"
                >
                  Elimină Programarea 🗑️
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER PAGINĂ ACTUALIZAT */}
      <div className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center mb-6 px-6 py-4 mt-4 gap-6 bg-white rounded-[30px] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg border border-amber-500/20">
            <span className="text-amber-500 text-2xl font-black italic">C</span>
          </div>
          <div className="flex flex-col">
            <h1 title="Sistemul de Calendar Chronos" className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
              Calendar <span className="text-amber-600">Chronos</span>
            </h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic mt-1">
              {pathname === "/calendar" ? "Panou Control Calendar" : "Gestionare Programări"}
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-[22px] border border-slate-200">
          <Link 
            href="/calendar" 
            className={`px-6 py-2.5 rounded-[18px] text-[10px] font-black uppercase italic transition-all ${pathname === "/calendar" ? "bg-white text-slate-900 shadow-md border border-slate-200/50" : "text-slate-400 hover:text-slate-600"}`}
          >
            Calendar
          </Link>
          <Link 
            href="/programari" 
            className={`px-6 py-2.5 rounded-[18px] text-[10px] font-black uppercase italic transition-all ${pathname === "/programari" ? "bg-white text-slate-900 shadow-md border border-slate-200/50" : "text-slate-400 hover:text-slate-600"}`}
          >
            + Programare Nouă
          </Link>
        </nav>
      </div>

      {/* CONTAINER CALENDAR */}
      <div className="w-full max-w-6xl bg-white rounded-[40px] shadow-2xl border border-slate-200 overflow-hidden mb-20">
        <div className="p-4 md:p-8 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 bg-white">
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-2 rounded-[22px] border border-slate-200">
              <button title="Pagina anterioară" onClick={() => nav(-1)} className="p-3 hover:bg-white rounded-xl transition text-slate-600 font-bold active:scale-90">◀</button>
              <button title="Sari la data de azi" onClick={() => setSelectedDate(new Date())} className="px-5 text-[10px] font-black uppercase text-slate-500 hover:text-amber-600 italic transition-colors">Azi</button>
              <button title="Pagina următoare" onClick={() => nav(1)} className="p-3 hover:bg-white rounded-xl transition text-slate-600 font-bold active:scale-90">▶</button>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{monthNames[selectedDate.getMonth()]} <span className="text-amber-600">{selectedDate.getFullYear()}</span></h2>
          </div>
          <div className="flex bg-slate-100 p-2 rounded-[22px] border border-slate-200">
            {(["day", "week", "month"] as ViewMode[]).map((opt) => (
              <button 
                key={opt} 
                title={`Vizualizare per ${opt === "day" ? "zi" : opt === "week" ? "săptămână" : "lună"}`}
                onClick={() => setViewMode(opt)} 
                className={`px-6 py-3 rounded-[18px] text-[10px] font-black uppercase transition-all active:scale-95 ${viewMode === opt ? "bg-slate-900 text-white shadow-xl italic" : "text-slate-400 hover:text-slate-600"}`}
              >
                {opt === "day" ? "Zi" : opt === "week" ? "Săpt" : "Lună"}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-200 w-full overflow-x-auto">
          {viewMode === "month" && (
            <div className="grid grid-cols-7 gap-[1px] min-w-[700px] w-full">
              {dayNamesShort.map(d => (
                <div key={d} className="text-center font-black text-slate-400 text-[10px] py-5 bg-white uppercase italic tracking-widest border-b border-slate-100">{d}</div>
              ))}
              {monthGrid.map((day, idx) => {
                const key = formatDateKey(day);
                const list = programariByDate[key] || [];
                const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                return (
                  <div key={idx} 
                    title={`Vezi programările din ${day.getDate()} ${monthNames[day.getMonth()]}`}
                    onClick={() => goToDay(day)} 
                    className={`min-h-[140px] p-3 flex flex-col items-start hover:bg-amber-50/30 transition-colors relative cursor-pointer border-r border-b border-slate-100 ${isCurrentMonth ? "bg-white" : "bg-slate-50 opacity-40"}`}>
                    <span className={`text-[11px] font-black mb-3 px-3 py-1.5 rounded-[12px] ${sameDay(day, new Date()) ? "text-white bg-amber-600 shadow-lg shadow-amber-200" : "text-slate-400"}`}>{day.getDate()}</span>
                    <div className="w-full space-y-1.5">
                      {list.slice(0, 3).map(p => (
                        <AppointmentChip key={p.id} p={p} />
                      ))}
                      {list.length > 3 && (
                        <div className="text-[9px] font-black text-amber-600 uppercase italic px-1 pt-1 text-center">
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
              <div className="grid grid-cols-[80px_repeat(7,1fr)] min-w-[1000px] gap-[1px] bg-slate-100">
                <div className="p-4 bg-slate-50 font-black text-[10px] text-slate-400 uppercase italic flex items-center justify-center border-r border-slate-200">Ora</div>
                {weekDays.map((d, i) => (
                  <button key={i} title={`Vezi ziua ${d.getDate()}`} onClick={() => goToDay(d)} className={`p-5 text-center transition-colors hover:bg-amber-50 ${sameDay(d, new Date()) ? "bg-amber-50" : "bg-white"}`}>
                    <div className="text-[10px] font-black text-slate-400 uppercase italic">{dayNamesShort[i]}</div>
                    <div className="text-2xl font-black text-slate-900">{d.getDate()}</div>
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
                        <div key={i} onClick={() => goToDay(d)} className="min-h-[85px] bg-white p-2 hover:bg-slate-50/80 border-b border-slate-100 cursor-pointer transition-colors flex flex-col gap-1.5">
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
            <div className="bg-white min-h-[600px] py-12 px-6">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-8 mb-12 p-10 bg-slate-900 rounded-[45px] text-white shadow-2xl relative overflow-hidden">
                  <div className="text-5xl font-black text-amber-500 border-r border-slate-700 pr-8 italic">{selectedDate.getDate()}</div>
                  <div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter italic">{monthNames[selectedDate.getMonth()]}</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1 italic">Agenda Zilnică</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {programariByDate[formatDateKey(selectedDate)]?.sort((a,b) => a.ora.localeCompare(b.ora)).map(p => (
                    <button key={p.id} 
                      title={`Editează programarea lui ${p.nume}`}
                      onClick={() => handleOpenEdit(p)}
                      className="w-full flex items-center gap-6 p-7 bg-white border-2 border-slate-100 rounded-[35px] hover:border-amber-500 hover:shadow-xl transition-all text-left group active:scale-[0.98]">
                      <span className="text-2xl font-black text-slate-900 group-hover:text-amber-600 w-24 italic">{p.ora}</span>
                      <div className="h-12 w-[3px] bg-slate-100 group-hover:bg-amber-500 rounded-full"></div>
                      <span className="text-slate-800 font-black text-xl flex-1 uppercase italic tracking-tight">{p.nume}</span>
                      <span className="text-[10px] font-black text-amber-600 uppercase italic opacity-0 group-hover:opacity-100 transition-opacity tracking-widest">Editează →</span>
                    </button>
                  )) || (
                    <div className="text-center py-24 border-4 border-dashed border-slate-100 rounded-[50px]">
                      <p className="text-slate-300 font-black uppercase italic tracking-tighter">Nicio programare planificată.</p>
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
      `}</style>
    </main>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 font-black italic text-slate-400 animate-pulse uppercase">Pregătire Calendar...</div>}>
      <CalendarContent />
    </Suspense>
  );
}