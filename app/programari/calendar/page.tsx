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

type Subscription = {
  plan: 'free' | 'pro' | 'business';
  max_appointments: number;
  max_experts: number;
  is_trial?: boolean;
};

interface Expert {
  nume: string;
  servicii?: string[];
}

interface Serviciu {
  nume: string;
}

function CalendarContent() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";

  const [programari, setProgramari] = useState<Programare[]>([]);
  const [rawExperti, setRawExperti] = useState<Expert[]>([]);
  const [rawServicii, setRawServicii] = useState<Serviciu[]>([]);
  const [userSubscription, setUserSubscription] = useState<Subscription | null>(null);
  
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
      if (!session && !isDemo) { setLoading(false); return; }
      const userId = session?.user?.id;

      if (userId) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('plan_type, staff, services, trial_activated, trial_expiry')
            .eq('id', userId)
            .single();

          if (profileData) {
            const rawPlan = (profileData.plan_type || 'free').toLowerCase();
            const isTrialActive = profileData.trial_activated && new Date(profileData.trial_expiry) > new Date();
            const planFinal = isTrialActive ? 'pro' : rawPlan;
            setUserSubscription({
                plan: planFinal,
                max_appointments: planFinal === 'free' ? 50 : planFinal === 'pro' ? 500 : 9999,
                max_experts: planFinal === 'free' ? 2 : 20,
                is_trial: isTrialActive
            });
            if (Array.isArray(profileData.staff)) setRawExperti(profileData.staff);
            if (Array.isArray(profileData.services)) setRawServicii(profileData.services);
          }
      }

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
          expert: item.expert || "Nespecificat",
          serviciu: item.details || "Nespecificat"
        }));
        setProgramari(formatted);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  const availableServices = useMemo(() => {
    if (!selectedExpert) return rawServicii.map(s => s.nume);
    const expertData = rawExperti.find(e => e.nume === selectedExpert);
    return expertData?.servicii || rawServicii.map(s => s.nume);
  }, [selectedExpert, rawExperti, rawServicii]);

  const availableExperts = useMemo(() => {
    if (!selectedServiciu) return rawExperti.map(e => e.nume);
    return rawExperti.filter(e => e.servicii?.includes(selectedServiciu)).map(e => e.nume);
  }, [selectedServiciu, rawExperti]);

  const checkSubscriptionLimits = () => {
      if (!userSubscription) return true;
      if (userSubscription.plan === 'free' && programari.length >= userSubscription.max_appointments) {
        alert(`⚠️ Limită atinsă: Planul FREE permite maxim ${userSubscription.max_appointments} programări.`);
        return false;
      }
      return true;
  };

  const handleOpenEdit = (p: Programare) => setEditForm({ ...p });
  const handleCloseModal = () => setEditForm(null);

  const handleUpdate = async () => {
    if (!editForm) return;
    try {
      if (!editForm.id) {
          alert("Eroare: Programarea nu are un ID valid.");
          return;
      }

      // Am eliminat 'expert' și am mapat 'serviciu' la coloana 'details' existentă în DB
      const { error } = await supabase
        .from('appointments')
        .update({
          title: editForm.nume,
          date: editForm.data,
          time: editForm.ora,
          phone: editForm.telefon,
          details: editForm.serviciu 
        })
        .eq('id', editForm.id);

      if (error) {
          console.error("Supabase Error:", error);
          alert(`Eroare la salvare: ${error.message}`);
          return;
      }

      setProgramari(prev => prev.map(p => p.id === editForm.id ? editForm : p));
      handleCloseModal();
      alert("✅ Programare actualizată!");
    } catch (err: any) { 
      alert("Eroare neașteptată: " + err.message); 
    }
  };

  const handleDelete = async () => {
    if (!editForm || !confirm("Ștergi programarea?")) return;
    try {
      const { error } = await supabase.from('appointments').delete().eq('id', editForm.id);
      if (error) {
          alert(`Eroare la ștergere: ${error.message}`);
          return;
      }
      setProgramari(prev => prev.filter(p => p.id !== editForm.id));
      handleCloseModal();
    } catch (err: any) { 
        alert("Eroare la ștergere: " + err.message); 
    }
  };

  const sendWhatsAppReminder = () => {
    if (userSubscription?.plan === 'free') return alert("Necesită plan PRO.");
    if (!editForm?.telefon) return alert("Lipsă telefon.");
    const cleanPhone = editForm.telefon.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith('0') ? '4' + cleanPhone : cleanPhone;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(customMessage)}`, '_blank');
  };

  const filteredProgramari = useMemo(() => {
    return programari.filter(p => {
      const matchSearch = !searchTerm || p.nume.toLowerCase().includes(searchTerm.toLowerCase()) || (p.telefon && p.telefon.includes(searchTerm));
      const matchExpert = !selectedExpert || p.expert?.trim().toLowerCase() === selectedExpert.trim().toLowerCase();
      const matchServiciu = !selectedServiciu || p.serviciu?.trim().toLowerCase() === selectedServiciu.trim().toLowerCase();
      return matchSearch && matchExpert && matchServiciu;
    });
  }, [programari, searchTerm, selectedExpert, selectedServiciu]);

  const programariByDate = useMemo(() => {
    const map: Record<string, Programare[]> = {};
    filteredProgramari.forEach(p => {
      const normalizedDate = formatDateKey(new Date(p.data));
      if (!map[normalizedDate]) map[normalizedDate] = [];
      map[normalizedDate].push(p);
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

  const AppointmentChip = ({ p, isCompact = true }: { p: Programare, isCompact?: boolean }) => (
    <div className="relative group w-full">
      <button 
        onClick={(e) => { e.stopPropagation(); handleOpenEdit(p); }}
        className={`w-full text-left cursor-pointer bg-slate-900 text-white rounded-xl truncate font-black uppercase italic shadow-sm border border-slate-700 hover:bg-amber-600 hover:scale-[1.02] active:scale-95 transition-all ${isCompact ? 'text-[9px] px-2 py-1.5' : 'text-xs p-3'}`}
      >
        {p.ora} {p.nume}
      </button>
    </div>
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black italic text-slate-400 uppercase animate-pulse">Sincronizare Chronos...</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-2 md:p-8 flex flex-col items-center font-sans">
      
      {editForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4" onClick={handleCloseModal}>
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-900 p-8 text-white relative">
              <button onClick={handleCloseModal} className="absolute top-6 right-6 text-slate-400 hover:text-white text-2xl font-black">×</button>
              <h3 className="text-amber-500 font-black uppercase tracking-widest text-xs mb-2 italic">Gestionare Programare</h3>
              <input type="text" className="bg-slate-800 text-white text-3xl font-black italic uppercase w-full border-b-2 border-amber-500 outline-none p-1 rounded-t-lg" value={editForm.nume} onChange={e => setEditForm({...editForm, nume: e.target.value})} />
            </div>
            
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-[25px] border-2 border-slate-100 shadow-inner">
                  <p className="text-[10px] font-black text-slate-400 uppercase italic">Data</p>
                  <input type="date" className="w-full bg-transparent font-bold text-slate-800 outline-none" value={editForm.data} onChange={e => setEditForm({...editForm, data: e.target.value})} />
                </div>
                <div className="bg-slate-50 p-4 rounded-[25px] border-2 border-slate-100 shadow-inner">
                  <p className="text-[10px] font-black text-slate-400 uppercase italic">Ora</p>
                  <input type="time" className="w-full bg-transparent font-bold text-slate-800 outline-none" value={editForm.ora} onChange={e => setEditForm({...editForm, ora: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-[25px] border-2 border-slate-100 shadow-inner">
                  <p className="text-[10px] font-black text-slate-400 uppercase italic">Telefon</p>
                  <input type="text" className="w-full bg-transparent font-bold text-slate-800 outline-none" value={editForm.telefon || ""} onChange={e => setEditForm({...editForm, telefon: e.target.value})} />
                </div>
                <div className="bg-slate-50 p-4 rounded-[25px] border-2 border-slate-100 shadow-inner">
                  <p className="text-[10px] font-black text-slate-400 uppercase italic">Expert Responsabil</p>
                  <select className="w-full bg-transparent font-bold text-slate-800 outline-none" value={editForm.expert || ""} onChange={e => setEditForm({...editForm, expert: e.target.value})}>
                    <option value="Nespecificat">Nespecificat</option>
                    {rawExperti.map(exp => <option key={exp.nume} value={exp.nume}>{exp.nume}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-[25px] border-2 border-slate-100 shadow-inner">
                <p className="text-[10px] font-black text-slate-400 uppercase italic">Serviciu Solicitat</p>
                <select className="w-full bg-transparent font-bold text-slate-800 outline-none" value={editForm.serviciu || ""} onChange={e => setEditForm({...editForm, serviciu: e.target.value})}>
                  <option value="Nespecificat">Nespecificat</option>
                  {rawServicii.map(ser => <option key={ser.nume} value={ser.nume}>{ser.nume}</option>)}
                </select>
              </div>

              <div className="bg-green-50/50 p-6 rounded-[30px] border border-green-100 space-y-3">
                <p className="text-[10px] font-black text-green-600 uppercase italic tracking-widest flex items-center gap-2">💬 Notificare WhatsApp</p>
                <textarea className="w-full bg-white border border-green-200 rounded-2xl p-4 text-[11px] font-bold text-slate-700 outline-none italic" rows={3} value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} />
                <button onClick={sendWhatsAppReminder} className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase italic transition shadow-lg ${userSubscription?.plan === 'free' ? 'bg-slate-300 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700 active:scale-95'}`}>Trimite pe WhatsApp</button>
              </div>

              <div className="flex flex-col gap-3 pb-4">
                <div className="flex gap-3">
                  <button onClick={handleCloseModal} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-[22px] font-black uppercase text-[10px] italic border border-slate-200 active:scale-95">Închide</button>
                  <button onClick={handleUpdate} className="flex-[2] py-4 bg-slate-900 text-white rounded-[22px] font-black shadow-lg uppercase text-[10px] italic hover:bg-black transition active:scale-95">Salvează Modificările</button>
                </div>
                <button onClick={handleDelete} className="w-full py-4 bg-red-50 text-red-500 rounded-[22px] font-black uppercase text-[10px] italic hover:bg-red-500 hover:text-white transition-all border border-red-100 active:scale-95">Elimină Programarea 🗑️</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER CU FILTRE */}
      <div className="w-full max-w-6xl flex flex-col items-center mb-6 px-6 py-6 mt-4 gap-6 bg-white rounded-[40px] shadow-sm border border-slate-100">
        <div className="w-full flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg border border-amber-500/20"><span className="text-amber-500 font-black text-xl italic">C</span></div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Calendar <span className="text-amber-600">Chronos</span></h1>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic mt-1">Conectat la Supabase</p>
            </div>
          </div>
          <div className="flex-1 max-w-2xl w-full relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input type="text" placeholder="Caută Client..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[25px] py-4 pl-12 pr-4 text-xs font-black text-slate-700 outline-none focus:border-amber-500 transition-all italic shadow-inner" />
          </div>
          <Link href={checkSubscriptionLimits() ? "/programari" : "#"} className={`px-8 py-4 rounded-[22px] text-[10px] font-black uppercase italic shadow-lg transition-all active:scale-95 ${checkSubscriptionLimits() ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>+ Nouă</Link>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-50">
          <div className="relative">
            <p className="text-[9px] font-black text-slate-400 uppercase italic mb-1 ml-4">Expert</p>
            <select value={selectedExpert} onChange={(e) => setSelectedExpert(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[35px] py-3 px-6 text-[11px] font-black text-slate-700 uppercase italic appearance-none shadow-inner outline-none focus:border-amber-500 cursor-pointer">
              <option value="">Toți Experții</option>
              {availableExperts.map(exp => <option key={exp} value={exp}>{exp}</option>)}
            </select>
          </div>
          <div className="relative">
            <p className="text-[9px] font-black text-slate-400 uppercase italic mb-1 ml-4">Serviciu</p>
            <select value={selectedServiciu} onChange={(e) => setSelectedServiciu(e.target.value)} className="w-full bg-amber-50 border-2 border-amber-100 rounded-[35px] py-3 px-6 text-[11px] font-black text-amber-700 uppercase italic appearance-none shadow-inner outline-none focus:border-amber-500 cursor-pointer">
              <option value="">Toate Serviciile</option>
              {availableServices.map(ser => <option key={ser} value={ser}>{ser}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ZONA CALENDAR */}
      <div className="w-full max-w-6xl bg-white rounded-[40px] shadow-2xl border border-slate-200 overflow-hidden mb-20">
        <div className="p-4 md:p-8 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-2 rounded-[22px]">
              <button onClick={() => nav(-1)} className="p-3 hover:bg-white rounded-xl font-bold active:scale-90 transition-all">◀</button>
              <button onClick={() => setSelectedDate(new Date())} className="px-5 text-[10px] font-black uppercase text-slate-500 hover:text-amber-600 italic">Azi</button>
              <button onClick={() => nav(1)} className="p-3 hover:bg-white rounded-xl font-bold active:scale-90 transition-all">▶</button>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase italic">{monthNames[selectedDate.getMonth()]} <span className="text-amber-600">{selectedDate.getFullYear()}</span></h2>
          </div>
          <div className="flex bg-slate-100 p-2 rounded-[22px]">
            {(["day", "week", "month"] as ViewMode[]).map((opt) => (
              <button key={opt} onClick={() => setViewMode(opt)} className={`px-6 py-3 rounded-[18px] text-[10px] font-black uppercase transition-all ${viewMode === opt ? "bg-slate-900 text-white shadow-xl italic" : "text-slate-400"}`}>
                {opt === "day" ? "Zi" : opt === "week" ? "Săpt" : "Lună"}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-200 w-full overflow-x-auto">
          {viewMode === "month" && (
            <div className="grid grid-cols-7 gap-[1px] min-w-[700px] w-full">
              {dayNamesShort.map(d => <div key={d} className="text-center font-black text-slate-400 text-[10px] py-5 bg-white uppercase italic tracking-widest">{d}</div>)}
              {monthGrid.map((day, idx) => {
                const key = formatDateKey(day);
                const list = programariByDate[key] || [];
                const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                return (
                  <div key={idx} onClick={() => goToDay(day)} className={`min-h-[140px] p-3 flex flex-col items-start hover:bg-amber-50/30 transition-colors relative cursor-pointer border-r border-b border-slate-100 ${isCurrentMonth ? "bg-white" : "bg-slate-50 opacity-40"}`}>
                    <span className={`text-[11px] font-black mb-3 px-3 py-1.5 rounded-[12px] ${sameDay(day, new Date()) ? "text-white bg-amber-600" : "text-slate-400"}`}>{day.getDate()}</span>
                    <div className="w-full space-y-1.5">
                      {list.slice(0, 3).map(p => <AppointmentChip key={p.id} p={p} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === "week" && (
            <div className="grid grid-cols-7 gap-[1px] min-w-[1000px] w-full bg-slate-100">
              {weekDays.map((day, i) => {
                const key = formatDateKey(day);
                const list = programariByDate[key] || [];
                return (
                  <div key={i} className="bg-white min-h-[600px] flex flex-col border-r border-slate-100">
                    <div className={`p-4 text-center border-b-2 ${sameDay(day, new Date()) ? "border-amber-500 bg-amber-50/50" : "border-slate-50"}`}>
                      <p className="text-[10px] font-black text-slate-400 uppercase italic">{dayNamesShort[i]}</p>
                      <p className={`text-xl font-black italic ${sameDay(day, new Date()) ? "text-amber-600" : "text-slate-900"}`}>{day.getDate()}</p>
                    </div>
                    <div className="p-2 space-y-2 overflow-y-auto">
                      {list.length > 0 ? (
                        list.sort((a, b) => a.ora.localeCompare(b.ora)).map(p => (
                          <button key={p.id} onClick={() => handleOpenEdit(p)} className="w-full p-3 bg-slate-900 text-white rounded-2xl text-left hover:bg-amber-600 transition-all active:scale-95 shadow-sm border border-slate-700">
                            <p className="text-[10px] font-black italic text-amber-500">{p.ora}</p>
                            <p className="text-[11px] font-black uppercase truncate italic">{p.nume}</p>
                            <p className="text-[8px] font-bold text-slate-400 truncate italic">{p.serviciu}</p>
                          </button>
                        ))
                      ) : (
                        <p className="text-[9px] text-center text-slate-300 font-black italic mt-4 uppercase">Liber</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === "day" && (
            <div className="bg-white min-h-[500px] py-12 px-6">
              <div className="max-w-3xl mx-auto space-y-4">
                {(programariByDate[formatDateKey(selectedDate)] || []).length > 0 ? (
                  (programariByDate[formatDateKey(selectedDate)] || [])
                    .sort((a, b) => a.ora.localeCompare(b.ora))
                    .map(p => (
                      <button key={p.id} onClick={() => handleOpenEdit(p)} className="w-full flex items-center gap-8 p-8 bg-white border-2 border-slate-100 rounded-[35px] hover:border-amber-500 shadow-sm transition-all text-left group active:scale-[0.98]">
                        <span className="text-3xl font-black text-slate-900 italic w-24">{p.ora}</span>
                        <div className="flex flex-col flex-1">
                          <span className="text-slate-900 font-black text-2xl uppercase italic group-hover:text-amber-600 transition-colors">{p.nume}</span>
                          <div className="flex gap-4 text-xs font-black text-slate-500 uppercase italic mt-1">
                            <span className="text-amber-600">{p.expert}</span>
                            <span>• {p.serviciu}</span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-amber-600 uppercase italic">Detalii →</span>
                      </button>
                    ))
                ) : (
                  <p className="text-center text-slate-300 font-black italic py-12">Nicio programare pentru această zi.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="animate-pulse p-12 text-center font-black">Încărcare...</div>}>
      <CalendarContent />
    </Suspense>
  );
}