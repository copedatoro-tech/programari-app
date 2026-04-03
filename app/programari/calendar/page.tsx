"use client";

import React, { useState, useEffect, useMemo, Suspense, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// --- Utilități Dată ---
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
const dayNamesLong = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];
const monthNames = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];

// --- Tipuri ---
type Programare = {
  id: any;
  nume: string;
  email?: string;
  data: string;
  ora: string;
  telefon?: string;
  motiv?: string;
  poza?: string;
  user_id?: string;
  expert?: string;
  serviciu?: string;
  expertId?: string;
  serviciuId?: string;
};
type ViewMode = "day" | "week" | "month";
type Subscription = { plan: 'free' | 'pro' | 'business'; max_appointments: number; max_experts: number; is_trial?: boolean; };

interface StaffRow { id: string; name: string; services: string[]; }
interface ServiceRow { id: string; nume_serviciu: string; price: number; duration: number; }

function CalendarContent() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const modalRef = useRef<HTMLDivElement>(null);

  const [programari, setProgramari] = useState<Programare[]>([]);
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

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && !isDemo) { setLoading(false); return; }
      const userId = session?.user?.id;

      if (userId) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('plan_type, trial_started_at')
          .eq('id', userId)
          .single();

        if (profileData) {
          const rawPlan = (profileData.plan_type || 'free').toLowerCase();
          let planFinal = rawPlan;
          if (profileData.trial_started_at) {
            const start = new Date(profileData.trial_started_at).getTime();
            const acum = new Date().getTime();
            if (acum - start < 10 * 24 * 60 * 60 * 1000) planFinal = 'chronos team';
          }
          setUserSubscription({
            plan: planFinal as any,
            max_appointments: planFinal === 'chronos free' ? 50 : 500,
            max_experts: planFinal === 'chronos free' ? 2 : 20
          });
        }

        const { data: staffData } = await supabase.from('staff').select('*').eq('user_id', userId);
        const { data: servicesData } = await supabase.from('services').select('*').eq('user_id', userId);
        if (staffData) setRawStaff(staffData);
        if (servicesData) setRawServices(servicesData);
      }

      let apptsQuery = supabase.from('appointments').select('*');
      if (!isDemo && userId) apptsQuery = apptsQuery.eq('user_id', userId);
      const { data: appts } = await apptsQuery;

      if (appts) {
        setProgramari(appts.map((item: any) => ({
          id: item.id,
          // Folosim 'prenume' sau 'nume' conform structurii din Supabase
          nume: item.prenume || item.nume || "Client",
          email: item.email,
          data: item.date || item.data || "",
          ora: item.time || item.ora || "",
          telefon: item.phone || item.telefon || "",
          motiv: item.details || item.motiv || "",
          poza: item.poza,
          expertId: item.angajat_id || "",
          serviciuId: item.serviciu_id || ""
        })));
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [isDemo]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  useEffect(() => {
    if (editForm) {
      const srvName = rawServices.find(s => s.id === editForm.serviciuId)?.nume_serviciu;
      setCustomMessage(`Bună, ${editForm.nume}! Te așteptăm la programarea din ${editForm.data}, ora ${editForm.ora}${srvName ? ` pentru ${srvName}` : ""}. O zi bună!`);
    }
  }, [editForm, rawServices]);

  // Click outside modal logic
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        handleCloseModal();
      }
    }
    if (editForm) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editForm]);

  // Filtrare angajati bazat pe serviciu
  const angajatiFiltrati = useMemo(() => {
    if (!editForm?.serviciuId) return rawStaff;
    return rawStaff.filter(a => a.services?.includes(editForm.serviciuId!));
  }, [editForm?.serviciuId, rawStaff]);

  // Filtrare servicii bazat pe angajat
  const serviciiFiltrate = useMemo(() => {
    if (!editForm?.expertId) return rawServices;
    const angajat = rawStaff.find(a => a.id === editForm.expertId);
    if (!angajat) return rawServices;
    return rawServices.filter(s => angajat.services?.includes(s.id));
  }, [editForm?.expertId, rawStaff, rawServices]);

  const handleExpertChange = (val: string) => {
    setSelectedExpert(val);
    setSelectedServiciu(""); 
  };

  const handleOpenEdit = (p: Programare) => setEditForm({ ...p });
  const handleCloseModal = () => setEditForm(null);

  const handleUpdate = async () => {
    if (!editForm) return;

    // Actualizat pentru a folosi numele corecte ale coloanelor din baza de date
    const { error } = await supabase.from('appointments').update({
      prenume: editForm.nume, // Mapat la prenume conform screenshot-ului bazei de date
      email: editForm.email,
      date: editForm.data,
      time: editForm.ora,
      phone: editForm.telefon,
      details: editForm.motiv,
      angajat_id: editForm.expertId,
      serviciu_id: editForm.serviciuId,
      poza: editForm.poza
    }).eq('id', editForm.id);

    if (error) return alert(error.message);
    setProgramari(prev => prev.map(p => p.id === editForm.id ? editForm : p));
    handleCloseModal();
  };

  const handleDelete = async () => {
    if (!editForm || !confirm("Ștergi programarea?")) return;
    await supabase.from('appointments').delete().eq('id', editForm.id);
    setProgramari(prev => prev.filter(p => p.id !== editForm.id));
    handleCloseModal();
  };

  const sendWhatsAppReminder = () => {
    if (userSubscription?.plan === 'chronos free') return alert("Necesită plan PRO.");
    const clean = editForm?.telefon?.replace(/\D/g, "");
    window.open(`https://wa.me/${clean?.startsWith('0') ? '4' + clean : clean}?text=${encodeURIComponent(customMessage)}`, '_blank');
  };

  const filteredProgramari = useMemo(() => {
    return programari.filter(p => {
      const matchSearch = !searchTerm || p.nume.toLowerCase().includes(searchTerm.toLowerCase()) || p.telefon?.includes(searchTerm);
      const matchExpert = !selectedExpert || p.expertId === selectedExpert;
      const matchServiciu = !selectedServiciu || p.serviciuId === selectedServiciu;
      return matchSearch && matchExpert && matchServiciu;
    }).sort((a, b) => a.ora.localeCompare(b.ora));
  }, [programari, searchTerm, selectedExpert, selectedServiciu]);

  const programariByDate = useMemo(() => {
    const map: Record<string, Programare[]> = {};
    filteredProgramari.forEach(p => {
      if (!p.data) return;
      const key = p.data.includes('T') ? p.data.split('T')[0] : p.data;
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

  const goToDay = (day: Date) => {
    setSelectedDate(day);
    setViewMode("day");
  };

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

  const AppointmentChip = ({ p }: { p: Programare }) => {
    const expName = rawStaff.find(a => a.id === p.expertId)?.name || 'General';
    const srvName = rawServices.find(s => s.id === p.serviciuId)?.nume_serviciu || 'Procedură';
    
    return (
      <button 
        title={`Expert: ${expName} | Serviciu: ${srvName}`}
        onClick={e => { e.stopPropagation(); handleOpenEdit(p); }}
        className="w-full text-left cursor-pointer bg-slate-900 text-white rounded-xl truncate font-black uppercase italic shadow-sm border border-slate-700 hover:bg-amber-600 hover:scale-[1.02] active:scale-95 transition-all text-[9px] px-2 py-1.5">
        {p.ora} {p.nume}
      </button>
    );
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black italic text-slate-400 uppercase animate-pulse">Sincronizare Chronos...</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-2 md:p-8 flex flex-col items-center font-sans">
      {editForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div ref={modalRef} className="bg-white w-full max-w-lg rounded-[50px] overflow-hidden shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in duration-200">
            <button onClick={handleCloseModal} title="Închide detaliile" className="absolute top-8 right-8 w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all z-20 active:scale-90">✕</button>
            
            <div className="h-32 bg-slate-900 relative">
              <div className="absolute -bottom-12 left-10 w-24 h-24 rounded-[30px] bg-white p-2 shadow-xl border border-slate-50">
                <div className="w-full h-full rounded-[22px] bg-slate-50 overflow-hidden relative flex items-center justify-center">
                  {editForm.poza ? <img src={editForm.poza} className="w-full h-full object-cover" /> : <Image src="/logo-chronos.png" alt="logo" fill sizes="80px" style={{ objectFit: 'contain', padding: '8px' }} />}
                </div>
              </div>
            </div>

            <div className="pt-16 p-10 space-y-6 max-h-[75vh] overflow-y-auto scrollbar-hide">
              <div className="mb-2">
                <p className="text-amber-600 font-black text-[10px] uppercase italic tracking-widest mb-1">Editează Client</p>
                <input type="text" title="Nume Client" className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 leading-none w-full bg-slate-50 p-3 rounded-2xl outline-none focus:ring-2 ring-amber-500"
                  value={editForm.nume} onChange={e => setEditForm({ ...editForm, nume: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Data</p>
                  <input type="date" title="Selectează Data" className="w-full bg-transparent font-black text-xs text-slate-700 outline-none" value={editForm.data} onChange={e => setEditForm({ ...editForm, data: e.target.value })} />
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Ora</p>
                  <input type="time" title="Selectează Ora" className="w-full bg-transparent font-black text-xs text-slate-700 outline-none" value={editForm.ora} onChange={e => setEditForm({ ...editForm, ora: e.target.value })} />
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Telefon</p>
                  <input type="text" title="Număr Telefon" className="w-full bg-transparent font-black text-xs text-slate-700 outline-none" value={editForm.telefon || ""} onChange={e => setEditForm({ ...editForm, telefon: e.target.value })} />
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Email</p>
                  <input type="email" title="Adresă Email" className="w-full bg-transparent font-black text-xs text-slate-700 outline-none" value={editForm.email || ""} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Specialist</p>
                  <select title="Alege Specialist" className="w-full bg-transparent font-black text-xs text-slate-700 outline-none cursor-pointer" 
                    value={editForm.expertId || ""} 
                    onChange={e => setEditForm({ ...editForm, expertId: e.target.value })}>
                    <option value="">Alege Specialist...</option>
                    {angajatiFiltrati.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Serviciu</p>
                  <select title="Alege Serviciu" className="w-full bg-transparent font-black text-xs text-slate-700 outline-none cursor-pointer" 
                    value={editForm.serviciuId || ""} 
                    onChange={e => setEditForm({ ...editForm, serviciuId: e.target.value })}>
                    <option value="">Alege Serviciu...</option>
                    {serviciiFiltrate.map(s => <option key={s.id} value={s.id}>{s.nume_serviciu?.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-slate-900 p-6 rounded-[35px] text-white">
                <p className="text-[8px] font-black text-amber-500 uppercase italic mb-2">Notițe / Motiv</p>
                <textarea title="Observații programare" className="w-full bg-transparent text-xs font-medium italic opacity-90 outline-none resize-none" rows={2} 
                  value={editForm.motiv || ""} onChange={e => setEditForm({ ...editForm, motiv: e.target.value })} placeholder="Fără observații." />
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-green-600 uppercase italic tracking-widest">💬 Notificare WhatsApp</p>
                <textarea title="Previzualizare mesaj WhatsApp" className="w-full bg-slate-50 border border-green-100 rounded-2xl p-4 text-[11px] font-bold text-slate-700 outline-none italic" rows={2}
                  value={customMessage} onChange={e => setCustomMessage(e.target.value)} />
                <button title="Trimite reminder către client" onClick={sendWhatsAppReminder}
                  className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase italic transition shadow-lg ${userSubscription?.plan === 'chronos free' ? 'bg-slate-300 cursor-not-allowed text-slate-500' : 'bg-green-600 text-white hover:bg-green-700 active:scale-95'}`}>
                  Trimite pe WhatsApp
                </button>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <div className="flex gap-3">
                  <button title="Anulează editarea" onClick={handleCloseModal} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-[22px] font-black uppercase text-[10px] italic active:scale-95">Anulează</button>
                  <button title="Salvează datele în baza de date" onClick={handleUpdate} className="flex-[2] py-4 bg-amber-600 text-white rounded-[22px] font-black shadow-lg uppercase text-[10px] italic hover:bg-slate-900 transition active:scale-95">Salvează Modificări</button>
                </div>
                <button title="Șterge definitiv programarea" onClick={handleDelete} className="w-full py-4 bg-red-50 text-red-500 rounded-[22px] font-black uppercase text-[10px] italic hover:bg-red-500 hover:text-white transition-all active:scale-95">Elimină Programarea 🗑️</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-6xl flex flex-col items-center mb-6 px-6 py-6 mt-4 gap-6 bg-white rounded-[40px] shadow-sm border border-slate-100">
        <div className="w-full flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg"><span className="text-amber-500 font-black text-xl italic">C</span></div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Calendar <span className="text-amber-600">Chronos</span></h1>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic mt-1">Sincronizat cu servicii & echipa</p>
            </div>
          </div>
          <div className="flex-1 max-w-2xl w-full relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            <input type="text" title="Caută în calendar" placeholder="Caută Client sau Telefon..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-[25px] py-4 pl-12 pr-4 text-xs font-black text-slate-700 outline-none focus:border-amber-500 transition-all italic shadow-inner" />
          </div>
          <Link title="Mergi la lista de programări" href="/programari" className="px-8 py-4 rounded-[22px] text-[10px] font-black uppercase italic shadow-lg transition-all active:scale-95 bg-amber-500 text-white hover:bg-amber-600">Înapoi la Programări</Link>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-50">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase italic mb-1 ml-4">Filtrează după Specialist {selectedExpert && <button title="Resetează filtru" onClick={() => setSelectedExpert("")} className="ml-2 text-amber-600">✕</button>}</p>
            <select title="Filtrează calendarul după expert" value={selectedExpert} onChange={e => handleExpertChange(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[35px] py-3 px-6 text-[11px] font-black text-slate-700 uppercase italic shadow-inner outline-none focus:border-amber-500 cursor-pointer appearance-none">
              <option value="">Toți Specialiștii</option>
              {rawStaff.map(exp => <option key={exp.id} value={exp.id}>{exp.name}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase italic mb-1 ml-4">Filtrează după Serviciu {selectedServiciu && <button title="Resetează filtru" onClick={() => setSelectedServiciu("")} className="ml-2 text-amber-600">✕</button>}</p>
            <select title="Filtrează calendarul după serviciu" value={selectedServiciu} onChange={e => setSelectedServiciu(e.target.value)} className="w-full bg-amber-50 border-2 border-amber-100 rounded-[35px] py-3 px-6 text-[11px] font-black text-amber-700 uppercase italic shadow-inner outline-none focus:border-amber-500 cursor-pointer appearance-none">
              <option value="">Toate Serviciile</option>
              {rawServices.map(ser => <option key={ser.id} value={ser.id}>{ser.nume_serviciu?.toUpperCase()}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="w-full max-w-6xl bg-white rounded-[40px] shadow-2xl border border-slate-200 overflow-hidden mb-20">
        <div className="p-4 md:p-8 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-2 rounded-[22px]">
              <button title="Pagina anterioară" onClick={() => nav(-1)} className="p-3 hover:bg-white rounded-xl transition-colors">◀</button>
              <button title="Sari la data de azi" onClick={() => setSelectedDate(new Date())} className="px-5 text-[10px] font-black uppercase text-slate-500 italic hover:text-amber-600 transition-colors">Azi</button>
              <button title="Pagina următoare" onClick={() => nav(1)} className="p-3 hover:bg-white rounded-xl transition-colors">▶</button>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase italic tracking-tighter">
              {viewMode === "day" && `${dayNamesLong[selectedDate.getDay()]}, `} {monthNames[selectedDate.getMonth()]} <span className="text-amber-600">{selectedDate.getFullYear()}</span>
            </h2>
          </div>
          <div className="flex bg-slate-100 p-2 rounded-[22px]">
            {(["day", "week", "month"] as ViewMode[]).map(opt => (
              <button title={`Schimbă vizualizarea la ${opt}`} key={opt} onClick={() => setViewMode(opt)} className={`px-6 py-3 rounded-[18px] text-[10px] font-black uppercase transition-all ${viewMode === opt ? "bg-slate-900 text-white shadow-xl italic" : "text-slate-400 hover:text-slate-600"}`}>
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
                  <div key={idx} title={`Vezi programările pentru ${day.getDate()}`} onClick={() => goToDay(day)} className={`min-h-[140px] p-3 flex flex-col items-start hover:bg-amber-50/30 cursor-pointer border-r border-b border-slate-100 transition-colors ${isCurrentMonth ? "bg-white" : "bg-slate-50 opacity-40"}`}>
                    <span className={`text-[11px] font-black mb-3 px-3 py-1.5 rounded-[12px] ${sameDay(day, new Date()) ? "text-white bg-amber-600" : "text-slate-400"}`}>{day.getDate()}</span>
                    <div className="w-full space-y-1.5">
                      {list.slice(0, 3).map(p => <AppointmentChip key={p.id} p={p} />)}
                      {list.length > 3 && <p className="text-[8px] font-black text-amber-600 italic pl-1">+ încă {list.length - 3}</p>}
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
                        list.sort((a, b) => a.ora.localeCompare(b.ora)).map(p => {
                          const expName = rawStaff.find(a => a.id === p.expertId)?.name || 'General';
                          return (
                            <button title={`Editează programarea lui ${p.nume}`} key={p.id} onClick={() => handleOpenEdit(p)} className="w-full p-3 bg-slate-900 text-white rounded-2xl text-left hover:bg-amber-600 transition-all active:scale-95 shadow-sm border border-slate-700 group">
                              <p className="text-[10px] font-black italic text-amber-500 group-hover:text-white transition-colors">{p.ora}</p>
                              <p className="text-[11px] font-black uppercase truncate italic">{p.nume}</p>
                              <p className="text-[8px] font-bold text-slate-400 group-hover:text-amber-100 truncate italic">{expName}</p>
                            </button>
                          );
                        })
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
                  (programariByDate[formatDateKey(selectedDate)] || []).map(p => {
                    const expName = rawStaff.find(a => a.id === p.expertId)?.name || 'General';
                    const srvName = rawServices.find(s => s.id === p.serviciuId)?.nume_serviciu || 'Procedură';
                    return (
                      <button title="Vezi detalii complete" key={p.id} onClick={() => handleOpenEdit(p)} className="w-full flex items-center gap-8 p-8 bg-white border-2 border-slate-100 rounded-[35px] hover:border-amber-500 shadow-sm transition-all text-left group active:scale-[0.98]">
                        <span className="text-3xl font-black text-slate-900 italic w-24 group-hover:text-amber-600 transition-colors">{p.ora}</span>
                        <div className="flex flex-col flex-1">
                          <span className="text-slate-900 font-black text-2xl uppercase italic group-hover:text-amber-600 transition-colors">{p.nume}</span>
                          <div className="flex gap-4 text-xs font-black text-slate-500 uppercase italic mt-1">
                            <span className="text-amber-600">{expName}</span>
                            <span>• {srvName}</span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-amber-600 uppercase italic opacity-0 group-hover:opacity-100 transition-opacity">Detalii →</span>
                      </button>
                    );
                  })
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 font-black uppercase italic text-slate-400">Sincronizare Chronos...</div>}>
      <CalendarContent />
    </Suspense>
  );
}