"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

type Programare = { 
  id: any; 
  nume: string; 
  data: string; 
  ora: string; 
  telefon?: string; 
  motiv?: string; 
  user_id?: string;
  expert?: string;
  serviciu?: string;
};
type ViewMode = "day" | "week" | "month";

function CalendarContent() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";

  const [programari, setProgramari] = useState<Programare[]>([]);
  const [listaExperti, setListaExperti] = useState<string[]>([]);
  const [listaServicii, setListaServicii] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExpert, setSelectedExpert] = useState<string>("");
  const [selectedServiciu, setSelectedServiciu] = useState<string>("");

  const [editForm, setEditForm] = useState<Programare | null>(null);
  const [customMessage, setCustomMessage] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (editForm) {
      setCustomMessage(`Bună, ${editForm.nume}! Te așteptăm la programarea din data de ${editForm.data}, ora ${editForm.ora}${editForm.serviciu ? ` pentru ${editForm.serviciu}` : ""}. Te rugăm să ne anunți dacă intervine ceva. O zi bună!`);
    }
  }, [editForm]);

  useEffect(() => {
    if (searchTerm.trim() !== "" || selectedExpert !== "" || selectedServiciu !== "") {
      setViewMode("day");
    }
  }, [searchTerm, selectedExpert, selectedServiciu]);

  async function fetchInitialData() {
    setLoading(true);
    try {
      const sessionResponse = await supabase?.auth?.getSession();
      const session = sessionResponse?.data?.session;

      if (!session && !isDemo) {
        setLoading(false);
        return;
      }

      const userId = session?.user?.id;

      // 1. Fetch Programări
      let apptsQuery = supabase.from('appointments').select('*');
      if (!isDemo && userId) apptsQuery = apptsQuery.eq('user_id', userId);
      
      const { data: appts } = await apptsQuery;

      if (appts) {
        const formatted: Programare[] = appts.map((item: any) => ({
          id: item.id,
          nume: item.title || "Client",
          data: item.date,
          ora: item.time,
          telefon: item.phone,
          motiv: item.details,
          user_id: item.user_id,
          expert: item.specialist || item.expert || "Nespecificat",
          serviciu: item.service || "Nespecificat"
        }));
        setProgramari(formatted);
      }

      // --- CONEXIUNEA TA CU LISTA DE EXPERȚI ---
      const { data: resData } = await supabase.from('resurse').select('name');
      if (resData) {
        setListaExperti(resData.map((r: any) => r.name).filter(Boolean));
      }

      // --- CONEXIUNEA TA CU LISTA DE SERVICII ---
      const { data: servData } = await supabase.from('servicii').select('nume');
      if (servData) {
        setListaServicii(servData.map((s: any) => s.nume).filter(Boolean));
      }

    } catch (err) {
      console.error("Eroare la sincronizare date:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenEdit = (p: Programare) => setEditForm({ ...p });
  const handleCloseModal = () => setEditForm(null);

  const handleUpdate = async () => {
    if (!editForm) return;
    try {
      const { error } = await supabase.from('appointments').update({
        title: editForm.nume, date: editForm.data, time: editForm.ora, phone: editForm.telefon,
        details: editForm.motiv, specialist: editForm.expert, service: editForm.serviciu
      }).eq('id', editForm.id);
      if (error) throw error;
      setProgramari(prev => prev.map(p => p.id === editForm.id ? editForm : p));
      handleCloseModal();
    } catch (err) { alert("Eroare la salvare."); }
  };

  const handleDelete = async () => {
    if (!editForm || !confirm("Ștergi programarea?")) return;
    try {
      await supabase.from('appointments').delete().eq('id', editForm.id);
      setProgramari(prev => prev.filter(p => p.id !== editForm.id));
      handleCloseModal();
    } catch (err) { alert("Eroare la ștergere."); }
  };

  const sendWhatsAppReminder = () => {
    if (!editForm?.telefon) return alert("Lipsă telefon.");
    const cleanPhone = editForm.telefon.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith('0') ? '4' + cleanPhone : cleanPhone;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(customMessage)}`, '_blank');
  };

  const filteredProgramari = useMemo(() => {
    return programari.filter(p => {
      const matchSearch = !searchTerm || 
        p.nume.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.telefon && p.telefon.includes(searchTerm));
      
      const matchExpert = !selectedExpert || p.expert === selectedExpert;
      const matchServiciu = !selectedServiciu || p.serviciu === selectedServiciu;

      return matchSearch && matchExpert && matchServiciu;
    });
  }, [programari, searchTerm, selectedExpert, selectedServiciu]);

  const programariByDate = useMemo(() => {
    const map: Record<string, Programare[]> = {};
    filteredProgramari.forEach(p => {
      if (!map[p.data]) map[p.data] = [];
      map[p.data].push(p);
    });
    return map;
  }, [filteredProgramari]);

  const nav = (dir: number) => {
    let nextDate = new Date(selectedDate);
    if (viewMode === "month") nextDate.setMonth(selectedDate.getMonth() + dir);
    else if (viewMode === "week") nextDate.setDate(selectedDate.getDate() + (dir * 7));
    else nextDate.setDate(selectedDate.getDate() + dir);
    setSelectedDate(nextDate);
  };

  const goToDay = (date: Date) => { setSelectedDate(date); setViewMode("day"); };

  const monthGrid = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const first = new Date(year, month, 1);
    const start = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Date[] = [];
    for (let i = 0; i < start; i++) cells.push(addDays(first, i - start));
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
        onClick={(e) => { e.stopPropagation(); handleOpenEdit(p); }}
        className={`w-full text-left cursor-pointer bg-slate-900 text-white rounded-xl truncate font-black uppercase italic shadow-sm border border-slate-700 hover:bg-amber-600 hover:scale-[1.02] active:scale-95 transition-all ${isCompact ? 'text-[9px] px-2 py-1.5' : 'text-xs p-3'}`}
      >
        {p.ora} {p.nume}
      </button>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-[110] w-48 bg-slate-800 text-white text-[10px] p-2 rounded-lg shadow-xl pointer-events-none border border-amber-500/30 text-center">
        <p className="font-black text-amber-500">{p.nume}</p>
        <p className="text-white font-bold">{p.serviciu}</p>
        <p className="italic text-slate-300">{p.expert}</p>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
      </div>
    </div>
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black italic text-slate-400 uppercase animate-pulse">Sincronizare Chronos...</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-2 md:p-8 flex flex-col items-center font-sans">
      
      {editForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={handleCloseModal}>
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-900 p-8 text-white relative">
              <button onClick={handleCloseModal} className="absolute top-6 right-6 text-slate-400 hover:text-white text-2xl font-black">×</button>
              <h3 className="text-amber-500 font-black uppercase tracking-widest text-xs mb-2 italic">Gestionare Programare</h3>
              <input type="text" className="bg-slate-800 text-white text-3xl font-black italic uppercase w-full border-b-2 border-amber-500 outline-none p-1 rounded-t-lg" value={editForm.nume} onChange={e => setEditForm({...editForm, nume: e.target.value})} />
            </div>
            
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-[25px] border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase italic">Data</p>
                  <input type="date" className="w-full bg-transparent font-bold text-slate-800 outline-none" value={editForm.data} onChange={e => setEditForm({...editForm, data: e.target.value})} />
                </div>
                <div className="bg-slate-50 p-4 rounded-[25px] border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase italic">Ora</p>
                  <input type="time" className="w-full bg-transparent font-bold text-slate-800 outline-none" value={editForm.ora} onChange={e => setEditForm({...editForm, ora: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-[25px] border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase italic">Telefon</p>
                  <input type="text" className="w-full bg-transparent font-bold text-slate-800 outline-none" value={editForm.telefon || ""} onChange={e => setEditForm({...editForm, telefon: e.target.value})} />
                </div>
                <div className="bg-slate-50 p-4 rounded-[25px] border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase italic">Expert Responsabil</p>
                  <select className="w-full bg-transparent font-bold text-slate-800 outline-none" value={editForm.expert || ""} onChange={e => setEditForm({...editForm, expert: e.target.value})}>
                    <option value="">Nespecificat</option>
                    {listaExperti.map(exp => <option key={exp} value={exp}>{exp}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-[25px] border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase italic">Serviciu Solicitat</p>
                <select className="w-full bg-transparent font-bold text-slate-800 outline-none" value={editForm.serviciu || ""} onChange={e => setEditForm({...editForm, serviciu: e.target.value})}>
                  <option value="">Nespecificat</option>
                  {listaServicii.map(ser => <option key={ser} value={ser}>{ser}</option>)}
                </select>
              </div>

              <div className="bg-green-50/50 p-6 rounded-[30px] border border-green-100 space-y-3">
                <p className="text-[10px] font-black text-green-600 uppercase italic tracking-widest flex items-center gap-2"><span>💬</span> Notificare WhatsApp</p>
                <textarea className="w-full bg-white border border-green-200 rounded-2xl p-4 text-[11px] font-bold text-slate-700 outline-none italic" rows={3} value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} />
                <button onClick={sendWhatsAppReminder} className="w-full bg-green-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase italic hover:bg-green-700 transition shadow-lg active:scale-95">Trimite pe WhatsApp</button>
              </div>

              <div className="flex flex-col gap-3 pb-4">
                <div className="flex gap-3">
                  <button onClick={handleCloseModal} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-[22px] font-black uppercase text-[10px] italic border border-slate-200">Închide</button>
                  <button onClick={handleUpdate} className="flex-[2] py-4 bg-slate-900 text-white rounded-[22px] font-black shadow-lg uppercase text-[10px] italic hover:bg-black transition active:scale-95">Salvează Modificările</button>
                </div>
                <button onClick={handleDelete} className="w-full py-4 bg-red-50 text-red-500 rounded-[22px] font-black uppercase text-[10px] italic hover:bg-red-500 hover:text-white transition-all border border-red-100 active:scale-95">Elimină Programarea 🗑️</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER CU FILTRE CONECTATE LA SUPABASE */}
      <div className="w-full max-w-6xl flex flex-col items-center mb-6 px-6 py-6 mt-4 gap-6 bg-white rounded-[40px] shadow-sm border border-slate-100">
        <div className="w-full flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg border border-amber-500/20 overflow-hidden">
               <span className="text-amber-500 font-black text-xl italic">C</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Calendar <span className="text-amber-600">Chronos</span></h1>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic mt-1">Conectat la Supabase</p>
            </div>
          </div>

          <div className="flex-1 max-w-2xl w-full">
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input 
                type="text" 
                placeholder="Caută Client sau Telefon..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[25px] py-4 pl-12 pr-4 text-xs font-black text-slate-700 outline-none focus:border-amber-500 focus:bg-white transition-all italic shadow-inner" 
              />
            </div>
          </div>

          <nav className="flex items-center">
            <Link href="/programari" className="px-8 py-4 bg-amber-500 text-white rounded-[22px] text-[10px] font-black uppercase italic transition-all hover:bg-amber-600 shadow-lg active:scale-95">+ Programare Nouă</Link>
          </nav>
        </div>

        {/* BUTOANE FILTRU CONECTATE LA LISTELE DIN SUPABASE */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-50">
          <div className="relative">
            <p className="text-[9px] font-black text-slate-400 uppercase italic mb-1 ml-4">Selectează Expertul</p>
            <select 
              value={selectedExpert} 
              onChange={(e) => setSelectedExpert(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-[22px] py-3 px-6 text-[11px] font-black text-slate-700 uppercase italic outline-none focus:border-slate-900 transition-all appearance-none cursor-pointer"
            >
              <option value="">Caută după Expert</option>
              {listaExperti.map(exp => (
                <option key={exp} value={exp}>{exp}</option>
              ))}
            </select>
            <span className="absolute right-6 bottom-3.5 text-slate-400 pointer-events-none">▼</span>
          </div>

          <div className="relative">
            <p className="text-[9px] font-black text-slate-400 uppercase italic mb-1 ml-4">Selectează Serviciul</p>
            <select 
              value={selectedServiciu} 
              onChange={(e) => setSelectedServiciu(e.target.value)}
              className="w-full bg-amber-50 border-2 border-amber-100 rounded-[22px] py-3 px-6 text-[11px] font-black text-amber-700 uppercase italic outline-none focus:border-amber-500 transition-all appearance-none cursor-pointer"
            >
              <option value="">Caută după Serviciu</option>
              {listaServicii.map(ser => (
                <option key={ser} value={ser}>{ser}</option>
              ))}
            </select>
            <span className="absolute right-6 bottom-3.5 text-amber-400 pointer-events-none">▼</span>
          </div>
          
          {(searchTerm || selectedExpert || selectedServiciu) && (
            <button 
              onClick={() => {setSearchTerm(""); setSelectedExpert(""); setSelectedServiciu("");}} 
              className="md:col-span-2 self-center text-[9px] font-black text-red-500 uppercase italic underline hover:text-red-700"
            >
              Resetează toate filtrele ×
            </button>
          )}
        </div>
      </div>

      <div className="w-full max-w-6xl bg-white rounded-[40px] shadow-2xl border border-slate-200 overflow-hidden mb-20">
        <div className="p-4 md:p-8 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 bg-white">
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-2 rounded-[22px] border border-slate-200">
              <button onClick={() => nav(-1)} className="p-3 hover:bg-white rounded-xl transition text-slate-600 font-bold active:scale-90">◀</button>
              <button onClick={() => {setSelectedDate(new Date()); setSelectedExpert(""); setSelectedServiciu(""); setSearchTerm("");}} className="px-5 text-[10px] font-black uppercase text-slate-500 hover:text-amber-600 italic transition-colors">Azi</button>
              <button onClick={() => nav(1)} className="p-3 hover:bg-white rounded-xl transition text-slate-600 font-bold active:scale-90">▶</button>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{monthNames[selectedDate.getMonth()]} <span className="text-amber-600">{selectedDate.getFullYear()}</span></h2>
          </div>
          <div className="flex bg-slate-100 p-2 rounded-[22px] border border-slate-200">
            {(["day", "week", "month"] as ViewMode[]).map((opt) => (
              <button key={opt} onClick={() => setViewMode(opt)} className={`px-6 py-3 rounded-[18px] text-[10px] font-black uppercase transition-all active:scale-95 ${viewMode === opt ? "bg-slate-900 text-white shadow-xl italic" : "text-slate-400 hover:text-slate-600"}`}>
                {opt === "day" ? "Zi" : opt === "week" ? "Săpt" : "Lună"}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-200 w-full overflow-x-auto">
          {viewMode === "month" && (
            <div className="grid grid-cols-7 gap-[1px] min-w-[700px] w-full">
              {dayNamesShort.map(d => <div key={d} className="text-center font-black text-slate-400 text-[10px] py-5 bg-white uppercase italic tracking-widest border-b border-slate-100">{d}</div>)}
              {monthGrid.map((day, idx) => {
                const key = formatDateKey(day);
                const list = programariByDate[key] || [];
                const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                return (
                  <div key={idx} onClick={() => goToDay(day)} className={`min-h-[140px] p-3 flex flex-col items-start hover:bg-amber-50/30 transition-colors relative cursor-pointer border-r border-b border-slate-100 ${isCurrentMonth ? "bg-white" : "bg-slate-50 opacity-40"}`}>
                    <span className={`text-[11px] font-black mb-3 px-3 py-1.5 rounded-[12px] ${sameDay(day, new Date()) ? "text-white bg-amber-600 shadow-lg" : "text-slate-400"}`}>{day.getDate()}</span>
                    <div className="w-full space-y-1.5">
                      {list.slice(0, 3).map(p => <AppointmentChip key={p.id} p={p} />)}
                      {list.length > 3 && <div className="text-[9px] font-black text-amber-600 uppercase italic px-1 pt-1 text-center">+ încă {list.length - 3}</div>}
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
                  <button key={i} onClick={() => goToDay(d)} className={`p-5 text-center transition-colors hover:bg-amber-50 ${sameDay(d, new Date()) ? "bg-amber-50" : "bg-white"}`}>
                    <div className="text-[10px] font-black text-slate-400 uppercase italic">{dayNamesShort[i]}</div>
                    <div className="text-2xl font-black text-slate-900">{d.getDate()}</div>
                  </button>
                ))}
                {hours.map(h => (
                  <div key={h} className="contents">
                    <div className="p-4 bg-slate-50 text-[10px] font-black text-slate-500 text-center sticky left-0 z-20 border-r border-slate-200 border-b border-slate-100">{String(h).padStart(2, '0')}:00</div>
                    {weekDays.map((d, i) => {
                      const progs = (programariByDate[formatDateKey(d)] || []).filter(p => parseInt(p.ora) === h);
                      return (
                        <div key={i} onClick={() => goToDay(d)} className="min-h-[85px] bg-white p-2 hover:bg-slate-50/80 border-b border-slate-100 cursor-pointer transition-colors flex flex-col gap-1.5">
                          {progs.map(p => <AppointmentChip key={p.id} p={p} />)}
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
                <div className="flex items-center gap-8 mb-12 p-10 bg-slate-900 rounded-[45px] text-white shadow-2xl relative border border-amber-500/20">
                  <div className="text-6xl font-black text-amber-500 border-r border-slate-700 pr-10 italic leading-none">{selectedDate.getDate()}</div>
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center justify-between w-full">
                      <h3 className="text-4xl font-black uppercase tracking-tighter italic leading-none">{monthNames[selectedDate.getMonth()]}</h3>
                      {(searchTerm || selectedExpert || selectedServiciu) && (
                        <div className="bg-amber-500 text-slate-900 px-6 py-3 rounded-full text-base font-black uppercase italic animate-pulse">🔍 Filtru Activ</div>
                      )}
                    </div>
                    <p className="text-slate-400 text-xs font-black uppercase tracking-[0.3em] mt-2 italic">
                      {selectedExpert ? `Expert: ${selectedExpert}` : selectedServiciu ? `Serviciu: ${selectedServiciu}` : "Agenda Zilnică"}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  {(searchTerm.trim() !== "" || selectedExpert || selectedServiciu ? filteredProgramari : programariByDate[formatDateKey(selectedDate)])?.sort((a,b) => a.ora.localeCompare(b.ora)).map(p => (
                    <button key={p.id} onClick={() => handleOpenEdit(p)} className="w-full flex items-center gap-8 p-8 bg-white border-2 border-slate-100 rounded-[35px] hover:border-amber-500 hover:shadow-2xl transition-all text-left group active:scale-[0.98] shadow-sm">
                      <div className="flex flex-col items-center w-28">
                        <span className="text-3xl font-black text-slate-900 group-hover:text-amber-600 italic tracking-tighter">{p.ora}</span>
                        {(searchTerm || selectedExpert || selectedServiciu) && <span className="text-[10px] font-black text-slate-400 uppercase mt-1 px-2 py-0.5 bg-slate-50 rounded-md border border-slate-100">{p.data}</span>}
                      </div>
                      <div className="h-16 w-[4px] bg-slate-100 group-hover:bg-amber-500 rounded-full transition-colors"></div>
                      <div className="flex flex-col flex-1">
                        <span className="text-slate-900 font-black text-2xl uppercase italic tracking-tight group-hover:text-amber-600 transition-colors">{p.nume}</span>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 items-center mt-2">
                          <span className="text-xs font-black text-amber-600 uppercase italic tracking-widest">{p.expert}</span>
                          <span className="text-xs font-black text-slate-500 uppercase italic">• {p.serviciu}</span>
                          {p.telefon && <span className="text-xs font-black text-green-600 uppercase italic">• 📞 {p.telefon}</span>}
                        </div>
                      </div>
                      <span className="text-xs font-black text-amber-600 uppercase italic opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0 tracking-widest">Detalii →</span>
                    </button>
                  )) || (
                    <div className="text-center py-24 border-4 border-dashed border-slate-100 rounded-[50px]">
                      <p className="text-slate-300 font-black uppercase italic tracking-tighter text-xl">Nicio programare găsită.</p>
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