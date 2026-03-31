"use client";

import { useState, useEffect, useMemo, Suspense, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const dayNamesShort = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"];
const monthNames = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];

type Programare = { id: any; nume: string; data: string; ora: string; telefon?: string; motiv?: string; user_id?: string; expert?: string; serviciu?: string; };
type ViewMode = "day" | "week" | "month";
type Subscription = { plan: 'free' | 'pro' | 'business'; max_appointments: number; max_experts: number; is_trial?: boolean; };

// ✅ Tipuri aliniate cu tabelele services și staff
interface StaffRow { id: string; name: string; services: string[]; }
interface ServiceRow { id: string; name: string; price: number; duration: number; }

function CalendarContent() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";

  const [programari, setProgramari] = useState<Programare[]>([]);
  // ✅ Acum vin din tabelele services și staff, nu din profiles
  const [rawStaff, setRawStaff] = useState<StaffRow[]>([]);
  const [rawServices, setRawServices] = useState<ServiceRow[]>([]);
  const [userSubscription, setUserSubscription] = useState<Subscription | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExpert, setSelectedExpert] = useState<string>("");
  const [selectedServiciu, setSelectedServiciu] = useState<string>("");

  const [editForm, setEditForm] = useState<Programare | null>(null);
  const [customMessage, setCustomMessage] = useState("");

  // ✅ Fetch date din tabelele dedicate
  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const sessionResponse = await supabase?.auth?.getSession();
      const session = sessionResponse?.data?.session;
      if (!session && !isDemo) { setLoading(false); return; }
      const userId = session?.user?.id;

      if (userId) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('plan_type, trial_activated, trial_expiry')
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
        }

        // ✅ Fetch din tabelele services și staff
        const { data: staffData } = await supabase
          .from('staff').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        const { data: servicesData } = await supabase
          .from('services').select('*').eq('user_id', userId).order('created_at', { ascending: false });

        if (staffData) setRawStaff(staffData);
        if (servicesData) setRawServices(servicesData);
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
  }, [isDemo]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  useEffect(() => {
    if (editForm) {
      setCustomMessage(`Bună, ${editForm.nume}! Te așteptăm la programarea din ${editForm.data}, ora ${editForm.ora}${editForm.serviciu ? ` pentru ${editForm.serviciu}` : ""}. O zi bună!`);
    }
  }, [editForm]);

  useEffect(() => {
    if (searchTerm.trim() !== "" || selectedExpert !== "" || selectedServiciu !== "") setViewMode("day");
  }, [searchTerm, selectedExpert, selectedServiciu]);

  // ✅ Filtre sincronizate folosind name din tabelele services/staff
  const filteredServicesForHeader = useMemo(() => {
    if (!selectedExpert) return rawServices;
    const expert = rawStaff.find(e => e.name === selectedExpert);
    if (!expert?.services?.length) return rawServices;
    return rawServices.filter(s => expert.services.includes(s.id));
  }, [selectedExpert, rawStaff, rawServices]);

  const filteredExpertsForHeader = useMemo(() => {
    if (!selectedServiciu) return rawStaff;
    const serviciu = rawServices.find(s => s.name === selectedServiciu);
    if (!serviciu) return rawStaff;
    return rawStaff.filter(e => e.services?.includes(serviciu.id));
  }, [selectedServiciu, rawStaff, rawServices]);

  const filteredServicesForModal = useMemo(() => {
    if (!editForm?.expert || editForm.expert === "Nespecificat") return rawServices;
    const expert = rawStaff.find(e => e.name === editForm.expert);
    if (!expert?.services?.length) return rawServices;
    return rawServices.filter(s => expert.services.includes(s.id));
  }, [editForm?.expert, rawStaff, rawServices]);

  const filteredExpertsForModal = useMemo(() => {
    if (!editForm?.serviciu || editForm.serviciu === "Nespecificat") return rawStaff;
    const serviciu = rawServices.find(s => s.name === editForm.serviciu);
    if (!serviciu) return rawStaff;
    return rawStaff.filter(e => e.services?.includes(serviciu.id));
  }, [editForm?.serviciu, rawStaff, rawServices]);

  const checkSubscriptionLimits = () => {
    if (!userSubscription) return true;
    if (userSubscription.plan === 'free' && programari.length >= userSubscription.max_appointments) {
      alert(`⚠️ Limită atinsă: maxim ${userSubscription.max_appointments} programări.`);
      return false;
    }
    return true;
  };

  const handleOpenEdit = (p: Programare) => setEditForm({ ...p });
  const handleCloseModal = () => setEditForm(null);

  const handleUpdate = async () => {
    if (!editForm) return;
    const { error } = await supabase.from('appointments').update({
      title: editForm.nume, date: editForm.data, time: editForm.ora,
      phone: editForm.telefon, details: editForm.serviciu, expert: editForm.expert
    }).eq('id', editForm.id);
    if (error) { alert(`Eroare: ${error.message}`); return; }
    setProgramari(prev => prev.map(p => p.id === editForm.id ? editForm : p));
    handleCloseModal();
    alert("✅ Programare actualizată!");
  };

  const handleDelete = async () => {
    if (!editForm || !confirm("Ștergi programarea?")) return;
    const { error } = await supabase.from('appointments').delete().eq('id', editForm.id);
    if (error) { alert(`Eroare: ${error.message}`); return; }
    setProgramari(prev => prev.filter(p => p.id !== editForm.id));
    handleCloseModal();
  };

  const sendWhatsAppReminder = () => {
    if (userSubscription?.plan === 'free') return alert("Necesită plan PRO.");
    if (!editForm?.telefon) return alert("Lipsă telefon.");
    const clean = editForm.telefon.replace(/\D/g, "");
    const phone = clean.startsWith('0') ? '4' + clean : clean;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(customMessage)}`, '_blank');
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
      const key = formatDateKey(new Date(p.data));
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [filteredProgramari]);

  const nav = (dir: number) => {
    let d = new Date(selectedDate);
    if (viewMode === "month") d.setMonth(d.getMonth() + dir);
    else if (viewMode === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setSelectedDate(d);
  };

  const goToDay = (date: Date) => { setSelectedDate(date); setViewMode("day"); };

  const monthGrid = useMemo(() => {
    const year = selectedDate.getFullYear(), month = selectedDate.getMonth();
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

  const AppointmentChip = ({ p }: { p: Programare }) => (
    <button onClick={e => { e.stopPropagation(); handleOpenEdit(p); }}
      className="w-full text-left cursor-pointer bg-slate-900 text-white rounded-xl truncate font-black uppercase italic shadow-sm border border-slate-700 hover:bg-amber-600 hover:scale-[1.02] active:scale-95 transition-all text-[9px] px-2 py-1.5">
      {p.ora} {p.nume}
    </button>
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black italic text-slate-400 uppercase animate-pulse">Sincronizare Chronos...</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-2 md:p-8 flex flex-col items-center font-sans">

      {editForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4" onClick={handleCloseModal}>
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-900 p-8 text-white relative">
              <button onClick={handleCloseModal} className="absolute top-6 right-6 text-slate-400 hover:text-white text-2xl font-black">×</button>
              <h3 className="text-amber-500 font-black uppercase tracking-widest text-xs mb-2 italic">Gestionare Programare</h3>
              <input type="text" className="bg-slate-800 text-white text-3xl font-black italic uppercase w-full border-b-2 border-amber-500 outline-none p-1 rounded-t-lg"
                value={editForm.nume} onChange={e => setEditForm({ ...editForm, nume: e.target.value })} />
            </div>
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-[25px] border-2 border-slate-100 shadow-inner">
                  <p className="text-[10px] font-black text-slate-400 uppercase italic">Data</p>
                  <input type="date" className="w-full bg-transparent font-bold text-slate-800 outline-none"
                    value={editForm.data} onChange={e => setEditForm({ ...editForm, data: e.target.value })} />
                </div>
                <div className="bg-slate-50 p-4 rounded-[25px] border-2 border-slate-100 shadow-inner">
                  <p className="text-[10px] font-black text-slate-400 uppercase italic">Ora</p>
                  <input type="time" className="w-full bg-transparent font-bold text-slate-800 outline-none"
                    value={editForm.ora} onChange={e => setEditForm({ ...editForm, ora: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-[25px] border-2 border-slate-100 shadow-inner">
                  <p className="text-[10px] font-black text-slate-400 uppercase italic">Telefon</p>
                  <input type="text" className="w-full bg-transparent font-bold text-slate-800 outline-none"
                    value={editForm.telefon || ""} onChange={e => setEditForm({ ...editForm, telefon: e.target.value })} />
                </div>
                <div className="bg-slate-50 p-4 rounded-[25px] border-2 border-slate-100 shadow-inner">
                  <p className="text-[10px] font-black text-slate-400 uppercase italic">Expert</p>
                  {/* ✅ Lista vine din tabela staff */}
                  <select className="w-full bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                    value={editForm.expert || ""}
                    onChange={e => setEditForm({ ...editForm, expert: e.target.value, serviciu: "Nespecificat" })}>
                    <option value="Nespecificat">Alege Expert...</option>
                    {filteredExpertsForModal.map(exp => <option key={exp.id} value={exp.name}>{exp.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-[25px] border-2 border-slate-100 shadow-inner">
                <p className="text-[10px] font-black text-slate-400 uppercase italic">Serviciu</p>
                {/* ✅ Lista vine din tabela services */}
                <select className="w-full bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                  value={editForm.serviciu || ""}
                  onChange={e => setEditForm({ ...editForm, serviciu: e.target.value })}>
                  <option value="Nespecificat">Alege Serviciu...</option>
                  {filteredServicesForModal.map(ser => <option key={ser.id} value={ser.name}>{ser.name}</option>)}
                </select>
              </div>
              <div className="bg-green-50/50 p-6 rounded-[30px] border border-green-100 space-y-3">
                <p className="text-[10px] font-black text-green-600 uppercase italic tracking-widest">💬 Notificare WhatsApp</p>
                <textarea className="w-full bg-white border border-green-200 rounded-2xl p-4 text-[11px] font-bold text-slate-700 outline-none italic" rows={3}
                  value={customMessage} onChange={e => setCustomMessage(e.target.value)} />
                <button onClick={sendWhatsAppReminder}
                  className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase italic transition shadow-lg ${userSubscription?.plan === 'free' ? 'bg-slate-300 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700 active:scale-95'}`}>
                  Trimite pe WhatsApp
                </button>
              </div>
              <div className="flex flex-col gap-3 pb-4">
                <div className="flex gap-3">
                  <button onClick={handleCloseModal} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-[22px] font-black uppercase text-[10px] italic border border-slate-200 active:scale-95">Închide</button>
                  <button onClick={handleUpdate} className="flex-[2] py-4 bg-slate-900 text-white rounded-[22px] font-black shadow-lg uppercase text-[10px] italic hover:bg-black transition active:scale-95">Salvează</button>
                </div>
                <button onClick={handleDelete} className="w-full py-4 bg-red-50 text-red-500 rounded-[22px] font-black uppercase text-[10px] italic hover:bg-red-500 hover:text-white transition-all border border-red-100 active:scale-95">Elimină Programarea 🗑️</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="w-full max-w-6xl flex flex-col items-center mb-6 px-6 py-6 mt-4 gap-6 bg-white rounded-[40px] shadow-sm border border-slate-100">
        <div className="w-full flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg"><span className="text-amber-500 font-black text-xl italic">C</span></div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Calendar <span className="text-amber-600">Chronos</span></h1>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic mt-1">Sincronizat cu tabelele services & staff</p>
            </div>
          </div>
          <div className="flex-1 max-w-2xl w-full relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input type="text" placeholder="Caută Client..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-[25px] py-4 pl-12 pr-4 text-xs font-black text-slate-700 outline-none focus:border-amber-500 transition-all italic shadow-inner" />
          </div>
          <Link href="/programari" className="px-8 py-4 rounded-[22px] text-[10px] font-black uppercase italic shadow-lg transition-all active:scale-95 bg-amber-500 text-white hover:bg-amber-600">+ Nouă</Link>
        </div>
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-50">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase italic mb-1 ml-4">Expert</p>
            {/* ✅ Lista din tabela staff */}
            <select value={selectedExpert}
              onChange={e => { setSelectedExpert(e.target.value); setSelectedServiciu(""); }}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-[35px] py-3 px-6 text-[11px] font-black text-slate-700 uppercase italic appearance-none shadow-inner outline-none focus:border-amber-500 cursor-pointer">
              <option value="">Toți Experții</option>
              {filteredExpertsForHeader.map(exp => <option key={exp.id} value={exp.name}>{exp.name}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase italic mb-1 ml-4">Serviciu</p>
            {/* ✅ Lista din tabela services */}
            <select value={selectedServiciu} onChange={e => setSelectedServiciu(e.target.value)}
              className="w-full bg-amber-50 border-2 border-amber-100 rounded-[35px] py-3 px-6 text-[11px] font-black text-amber-700 uppercase italic appearance-none shadow-inner outline-none focus:border-amber-500 cursor-pointer">
              <option value="">Toate Serviciile</option>
              {filteredServicesForHeader.map(ser => <option key={ser.id} value={ser.name}>{ser.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* CALENDAR */}
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
            {(["day", "week", "month"] as ViewMode[]).map(opt => (
              <button key={opt} onClick={() => setViewMode(opt)}
                className={`px-6 py-3 rounded-[18px] text-[10px] font-black uppercase transition-all ${viewMode === opt ? "bg-slate-900 text-white shadow-xl italic" : "text-slate-400"}`}>
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
                  <div key={idx} onClick={() => goToDay(day)}
                    className={`min-h-[140px] p-3 flex flex-col items-start hover:bg-amber-50/30 transition-colors cursor-pointer border-r border-b border-slate-100 ${isCurrentMonth ? "bg-white" : "bg-slate-50 opacity-40"}`}>
                    <span className={`text-[11px] font-black mb-3 px-3 py-1.5 rounded-[12px] ${sameDay(day, new Date()) ? "text-white bg-amber-600" : "text-slate-400"}`}>{day.getDate()}</span>
                    <div className="w-full space-y-1.5">
                      {list.slice(0, 3).map(p => <AppointmentChip key={p.id} p={p} />)}
                      {list.length > 3 && <p className="text-[8px] font-black text-amber-600 italic mt-1 ml-1">+ încă {list.length - 3}</p>}
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
                      {list.length > 0 ? list.sort((a, b) => a.ora.localeCompare(b.ora)).map(p => (
                        <button key={p.id} onClick={() => handleOpenEdit(p)}
                          className="w-full p-3 bg-slate-900 text-white rounded-2xl text-left hover:bg-amber-600 transition-all active:scale-95 shadow-sm border border-slate-700">
                          <p className="text-[10px] font-black italic text-amber-500">{p.ora}</p>
                          <p className="text-[11px] font-black uppercase truncate italic">{p.nume}</p>
                          <p className="text-[8px] font-bold text-slate-400 truncate italic">{p.serviciu}</p>
                        </button>
                      )) : <p className="text-[9px] text-center text-slate-300 font-black italic mt-4 uppercase">Liber</p>}
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
                      <button key={p.id} onClick={() => handleOpenEdit(p)}
                        className="w-full flex items-center gap-8 p-8 bg-white border-2 border-slate-100 rounded-[35px] hover:border-amber-500 shadow-sm transition-all text-left group active:scale-[0.98]">
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
                  <div className="text-center py-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-100">
                    <p className="text-slate-300 font-black italic uppercase text-sm">Nicio programare găsită.</p>
                  </div>
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 font-black italic text-slate-400 uppercase">Încărcare...</div>}>
      <CalendarContent />
    </Suspense>
  );
}