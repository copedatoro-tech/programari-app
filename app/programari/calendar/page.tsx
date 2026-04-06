"use client";

import React, { useState, useEffect, useMemo, Suspense, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { showToast, showConfirm } from "@/lib/toast";

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
  expertId?: string;
  serviciuId?: string;
  duration?: number;
};
type ViewMode = "day" | "week" | "month";
type Subscription = { plan: string; max_appointments: number; max_experts: number; };

interface StaffRow { id: string; name: string; services: string[]; }
interface ServiceRow { id: string; nume_serviciu: string; price: number; duration: number; }
type ManualBlocksMap = Record<string, string[]>;
interface WorkingHour { day: string; start: string; end: string; closed: boolean; }

const TOTAL_SLOTS_PER_DAY = 96;

function addMinutesToTime(timeStr: string, minutes: number): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(':').map(Number);
  const totalMin = h * 60 + m + minutes;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
}

// --- Componente UI Noi (Chronos Time Picker) ---

function ChronosTimePicker({ value, onChange, onClose }: { value: string, onChange: (val: string) => void, onClose: () => void }) {
  const [step, setStep] = useState<"hour" | "minute">("hour");
  const [selectedHour, setSelectedHour] = useState(value.split(":")[0] || "09");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function clickOut(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, [onClose]);

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = ["00", "15", "30", "45"];

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div ref={containerRef} className="bg-white border-4 border-slate-900 rounded-[40px] shadow-2xl p-8 w-full max-w-xs animate-in zoom-in duration-300">
        <div className="text-center mb-6">
          <p className="text-[10px] font-black uppercase italic text-amber-600 tracking-widest">Selectează {step === "hour" ? "Ora" : "Minutele"}</p>
          <p className="text-3xl font-black italic text-slate-900">{selectedHour}:{step === "minute" ? "--" : value.split(":")[1] || "00"}</p>
        </div>

        <div className="grid grid-cols-4 gap-2 h-64 overflow-y-auto pr-2 scrollbar-hide">
          {step === "hour" ? (
            hours.map(h => (
              <button key={h} onClick={() => { setSelectedHour(h); setStep("minute"); }}
                className={`py-4 rounded-2xl font-black italic transition-all ${selectedHour === h ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-400 hover:bg-amber-100"}`}>
                {h}
              </button>
            ))
          ) : (
            minutes.map(m => (
              <button key={m} onClick={() => { onChange(`${selectedHour}:${m}`); onClose(); }}
                className="col-span-2 py-6 bg-slate-50 rounded-3xl font-black italic text-slate-900 hover:bg-amber-500 hover:text-white transition-all text-lg">
                :{m}
              </button>
            ))
          )}
        </div>
        
        {step === "minute" && (
          <button onClick={() => setStep("hour")} className="w-full mt-4 py-3 text-[10px] font-black uppercase italic text-slate-400 hover:text-slate-900 transition-all">
            ← Înapoi la ore
          </button>
        )}
      </div>
    </div>
  );
}

function CalendarContent() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const modalRef = useRef<HTMLDivElement>(null);
  const dateModalRef = useRef<HTMLDivElement>(null);

  const [programari, setProgramari] = useState<Programare[]>([]);
  const [rawStaff, setRawStaff] = useState<StaffRow[]>([]);
  const [rawServices, setRawServices] = useState<ServiceRow[]>([]);
  const [userSubscription, setUserSubscription] = useState<Subscription | null>(null);
  const [manualBlocks, setManualBlocks] = useState<ManualBlocksMap>({});
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExpert, setSelectedExpert] = useState<string>("");
  const [selectedServiciu, setSelectedServiciu] = useState<string>("");

  const [editForm, setEditForm] = useState<Programare | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  
  // Stări pentru Pop-up-uri Chronos
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);

  const isDateBlocked = useCallback((dateStr: string, timeStr?: string, serviceDuration?: number) => {
    const daySlots: string[] = manualBlocks[dateStr] || [];
    if (daySlots.length >= TOTAL_SLOTS_PER_DAY - 2) return { blocked: true, reason: "Zi Blocată Manual" };

    const dateObj = new Date(dateStr + 'T00:00:00');
    const dayName = dayNamesLong[dateObj.getDay()];
    const safeWorkingHours = Array.isArray(workingHours) ? workingHours : [];
    const daySchedule = safeWorkingHours.find(h => h.day === dayName);

    if (daySchedule?.closed) return { blocked: true, reason: "Închis (Weekend/Sărbătoare)" };

    if (timeStr && daySchedule) {
      if (timeStr < daySchedule.start || timeStr > daySchedule.end) {
        return { blocked: true, reason: `În afara programului (${daySchedule.start}-${daySchedule.end})` };
      }
      if (serviceDuration && serviceDuration > 0) {
        const endTime = addMinutesToTime(timeStr, serviceDuration);
        if (endTime > daySchedule.end) return { blocked: true, reason: `Serviciul depășește programul (${daySchedule.end})` };
      }
    }

    if (timeStr && daySlots.length > 0) {
      const [h, m] = timeStr.split(':').map(Number);
      const subSlots: string[] = [];
      const checkMinutes = serviceDuration && serviceDuration > 0 ? serviceDuration : 60;
      for (let i = 0; i < checkMinutes; i += 15) {
        const totalMin = m + i;
        const sH = h + Math.floor(totalMin / 60);
        const sM = totalMin % 60;
        if (sH < 24) subSlots.push(`${sH.toString().padStart(2, '0')}:${sM.toString().padStart(2, '0')}`);
      }
      if (subSlots.some(slot => daySlots.includes(slot))) return { blocked: true, reason: "Oră blocată" };
    }
    return { blocked: false };
  }, [manualBlocks, workingHours]);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && !isDemo) { setLoading(false); return; }
      const userId = session?.user?.id;

      if (userId) {
        const { data: profileData } = await supabase.from('profiles').select('plan_type, trial_started_at, manual_blocks, working_hours').eq('id', userId).single();
        if (profileData) {
          const rawPlan = (profileData.plan_type || 'CHRONOS FREE').toUpperCase();
          let planFinal = rawPlan;
          if (profileData.trial_started_at) {
            const start = new Date(profileData.trial_started_at).getTime();
            if (new Date().getTime() - start < 10 * 24 * 60 * 60 * 1000) planFinal = 'CHRONOS TEAM';
          }
          setUserSubscription({
            plan: planFinal,
            max_appointments: planFinal.includes('TEAM') ? 99999 : planFinal.includes('ELITE') ? 500 : planFinal.includes('PRO') ? 150 : 30,
            max_experts: planFinal.includes('TEAM') ? 50 : planFinal.includes('ELITE') ? 5 : 1
          });
          setManualBlocks(profileData.manual_blocks || {});
          setWorkingHours(Array.isArray(profileData.working_hours) ? profileData.working_hours : []);
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
          nume: item.title || item.prenume || item.nume || "Client",
          email: item.email,
          data: item.date || "",
          ora: item.time || "",
          telefon: item.phone || "",
          motiv: item.details || "",
          poza: item.poza,
          expertId: item.angajat_id || "",
          serviciuId: item.serviciu_id || "",
          duration: item.duration || 0
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) handleCloseModal();
      if (dateModalRef.current && !dateModalRef.current.contains(event.target as Node)) setShowDatePickerModal(false);
    }
    if (editForm || showDatePickerModal) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editForm, showDatePickerModal]);

  const angajatiFiltratiInModal = useMemo(() => {
    if (!editForm?.serviciuId) return rawStaff;
    return rawStaff.filter(a => a.services?.includes(editForm.serviciuId!));
  }, [editForm?.serviciuId, rawStaff]);

  const serviciiFiltrateInModal = useMemo(() => {
    if (!editForm?.expertId) return rawServices;
    const angajat = rawStaff.find(a => a.id === editForm.expertId);
    if (!angajat) return rawServices;
    return rawServices.filter(s => angajat.services?.includes(s.id));
  }, [editForm?.expertId, rawStaff, rawServices]);

  const handleOpenEdit = (p: Programare) => setEditForm({ ...p });
  const handleCloseModal = () => { setEditForm(null); setShowTimePicker(false); };

  const handleUpdate = async () => {
    if (!editForm) return;
    const service = rawServices.find(s => s.id === editForm.serviciuId);
    const duration = service?.duration || 0;

    const check = isDateBlocked(editForm.data, editForm.ora, duration);
    if (check.blocked) {
      await showToast({ message: `Indisponibil: ${check.reason}`, type: "error", title: "Eroare" });
      return;
    }

    const { error } = await supabase.from('appointments').update({
      title: editForm.nume, prenume: editForm.nume, nume: editForm.nume,
      email: editForm.email || null, date: editForm.data, time: editForm.ora,
      duration: duration || editForm.duration || 0, phone: editForm.telefon || null,
      details: editForm.motiv || null, angajat_id: editForm.expertId || null,
      serviciu_id: editForm.serviciuId || null, poza: editForm.poza || null
    }).eq('id', editForm.id);

    if (error) { await showToast({ message: error.message, type: "error" }); return; }
    setProgramari(prev => prev.map(p => p.id === editForm.id ? { ...editForm, duration } : p));
    await showToast({ message: "Actualizat!", type: "success" });
    handleCloseModal();
  };

  const handleDelete = async () => {
    if (!editForm) return;
    const confirmed = await showConfirm({
      title: "Șterge Programarea",
      message: `Sigur ștergi programarea lui ${editForm.nume}?`,
      confirmText: "Da, Șterge",
      type: "danger"
    });
    if (!confirmed) return;
    await supabase.from('appointments').delete().eq('id', editForm.id);
    setProgramari(prev => prev.filter(p => p.id !== editForm.id));
    handleCloseModal();
  };

  const sendWhatsAppReminder = async () => {
    if (userSubscription && (userSubscription.plan.includes("FREE") || userSubscription.plan.includes("PRO"))) {
      await showToast({ message: "Necesită plan ELITE", type: "warning" });
      return;
    }
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
      const key = p.data.includes('T') ? p.data.split('T')[0] : p.data;
      if (key) { if (!map[key]) map[key] = []; map[key].push(p); }
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

  const goToDay = (day: Date) => { setSelectedDate(day); setViewMode("day"); setShowDatePickerModal(false); };

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
    const svc = rawServices.find(s => s.id === p.serviciuId);
    const endTime = svc?.duration ? addMinutesToTime(p.ora, svc.duration) : null;
    return (
      <button onClick={e => { e.stopPropagation(); handleOpenEdit(p); }}
        className="w-full text-left bg-slate-900 text-white rounded-xl truncate font-black uppercase italic border border-slate-700 hover:bg-amber-600 transition-all text-[9px] px-2 py-1.5">
        {p.ora}{endTime ? `→${endTime}` : ''} {p.nume}
      </button>
    );
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black italic text-slate-400 uppercase animate-pulse">Sincronizare Chronos...</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-2 md:p-8 flex flex-col items-center font-sans">
      
      {/* Pop-up Selector Dată (Pop-up Calendar) */}
      {showDatePickerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[550] flex items-center justify-center p-4">
          <div ref={dateModalRef} className="bg-white w-full max-w-md rounded-[45px] border-4 border-slate-900 shadow-2xl overflow-hidden animate-in zoom-in duration-300">
             <div className="bg-slate-900 p-6 text-center">
                <p className="text-[10px] font-black text-amber-500 uppercase italic tracking-[0.3em]">Chronos Navigation</p>
                <h3 className="text-xl font-black text-white uppercase italic">Alege o Dată</h3>
             </div>
             <div className="p-6">
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {dayNamesShort.map(d => <div key={d} className="text-center text-[9px] font-black text-slate-400 uppercase italic">{d}</div>)}
                  {monthGrid.map((day, idx) => (
                    <button key={idx} onClick={() => goToDay(day)}
                      className={`aspect-square rounded-xl text-[10px] font-black flex items-center justify-center transition-all
                        ${day.getMonth() !== selectedDate.getMonth() ? "opacity-20" : "opacity-100"}
                        ${sameDay(day, selectedDate) ? "bg-amber-500 text-white" : "hover:bg-slate-100 text-slate-900"}`}>
                      {day.getDate()}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowDatePickerModal(false)} className="w-full py-4 bg-slate-100 text-slate-900 rounded-[20px] font-black uppercase italic text-[10px]">Închide</button>
             </div>
          </div>
        </div>
      )}

      {editForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[500] flex items-center justify-center p-4">
          <div ref={modalRef} className="bg-white w-full max-w-xl rounded-[50px] overflow-hidden shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in duration-300">
            {/* Close Button Elegant */}
            <button onClick={handleCloseModal} title="Închide" className="absolute top-8 right-8 w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center font-black text-white hover:bg-red-500 transition-all z-30 shadow-xl border border-white/20">✕</button>

            {/* Header Profil Elegant */}
            <div className="h-44 bg-slate-900 relative flex items-end p-10">
              <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
              </div>
              <div className="flex items-center gap-6 z-10">
                <div className="w-24 h-24 rounded-[32px] bg-white p-1.5 shadow-2xl rotate-3">
                  <div className="w-full h-full rounded-[25px] bg-slate-100 overflow-hidden relative flex items-center justify-center">
                    {editForm.poza ? <img src={editForm.poza} className="w-full h-full object-cover" /> : <div className="text-3xl">👤</div>}
                  </div>
                </div>
                <div>
                  <p className="text-amber-500 font-black text-[10px] uppercase italic tracking-[0.3em] mb-1">Detalii Rezervare</p>
                  <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">{editForm.nume || "Client"}</h2>
                </div>
              </div>
            </div>

            {/* Content Elegant */}
            <div className="p-10 space-y-6 max-h-[65vh] overflow-y-auto scrollbar-hide bg-white">
              
              {/* Secțiune Input Nume */}
              <div className="bg-slate-50 p-6 rounded-[35px] border border-slate-100 group focus-within:border-amber-500 transition-all">
                <p className="text-[9px] font-black text-slate-400 uppercase italic mb-2 ml-1">Nume Complet Client</p>
                <input type="text" className="w-full bg-transparent text-xl font-black uppercase italic tracking-tight text-slate-900 outline-none" 
                  value={editForm.nume} onChange={e => setEditForm({ ...editForm, nume: e.target.value })} />
              </div>

              {/* Grid Data & Ora */}
              <div className="grid grid-cols-2 gap-4">
                <div onClick={() => setShowDatePickerModal(true)} className="bg-slate-50 p-5 rounded-[30px] border border-slate-100 cursor-pointer hover:border-amber-500 transition-all">
                  <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Data Programării</p>
                  <p className="font-black text-sm text-slate-800 uppercase italic">{editForm.data}</p>
                </div>
                
                {/* Chronos Time Selector Trigger */}
                <div onClick={() => setShowTimePicker(true)} className="bg-slate-50 p-5 rounded-[30px] border border-slate-100 cursor-pointer hover:border-amber-500 transition-all">
                  <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Ora Start</p>
                  <div className="flex items-center justify-between">
                     <p className="font-black text-sm text-slate-800 italic">{editForm.ora}</p>
                     <span className="text-amber-500 text-xs">🕒</span>
                  </div>
                </div>
              </div>

              {/* Chronos Time Picker Render */}
              {showTimePicker && (
                <ChronosTimePicker 
                  value={editForm.ora} 
                  onChange={(val) => setEditForm({ ...editForm, ora: val })} 
                  onClose={() => setShowTimePicker(false)} 
                />
              )}

              {/* Indicator Durată Serviciu (Elegant) */}
              {editForm.serviciuId && (() => {
                const svc = rawServices.find(s => s.id === editForm.serviciuId);
                if (!svc?.duration) return null;
                const endTime = addMinutesToTime(editForm.ora, svc.duration);
                return (
                  <div className="bg-amber-50/50 border-2 border-dashed border-amber-200 rounded-[30px] p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white text-lg shadow-lg shadow-amber-200">⏱️</div>
                      <div>
                        <p className="text-[9px] font-black text-amber-700 uppercase italic">Interval Ocupat</p>
                        <p className="text-sm font-black text-slate-900 italic">{editForm.ora} — {endTime}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-amber-600 uppercase italic">Durată</p>
                      <p className="text-[11px] font-black text-slate-900 uppercase italic">{svc.duration} min</p>
                    </div>
                  </div>
                );
              })()}

              {/* Contact Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-5 rounded-[30px] border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Telefon</p>
                  <input type="text" className="w-full bg-transparent font-black text-sm text-slate-800 outline-none italic" 
                    value={editForm.telefon || ""} onChange={e => setEditForm({ ...editForm, telefon: e.target.value })} placeholder="07xx..." />
                </div>
                <div className="bg-slate-50 p-5 rounded-[30px] border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Email</p>
                  <input type="email" className="w-full bg-transparent font-black text-sm text-slate-800 outline-none italic" 
                    value={editForm.email || ""} onChange={e => setEditForm({ ...editForm, email: e.target.value })} placeholder="client@email.com" />
                </div>
              </div>

              {/* Specialist & Serviciu */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 p-5 rounded-[30px] shadow-xl">
                  <p className="text-[8px] font-black text-amber-500 uppercase italic mb-1">Specialist</p>
                  <select className="w-full bg-transparent font-black text-xs text-white outline-none cursor-pointer uppercase italic"
                    value={editForm.expertId || ""} onChange={e => setEditForm({ ...editForm, expertId: e.target.value })}>
                    <option value="" className="text-slate-900">Alege...</option>
                    {angajatiFiltratiInModal.map(a => <option key={a.id} value={a.id} className="text-slate-900">{a.name}</option>)}
                  </select>
                </div>
                <div className="bg-amber-500 p-5 rounded-[30px] shadow-xl shadow-amber-100">
                  <p className="text-[8px] font-black text-white uppercase italic mb-1 opacity-80">Serviciu</p>
                  <select className="w-full bg-transparent font-black text-xs text-white outline-none cursor-pointer uppercase italic"
                    value={editForm.serviciuId || ""} onChange={e => setEditForm({ ...editForm, serviciuId: e.target.value })}>
                    <option value="" className="text-amber-700">Alege...</option>
                    {serviciiFiltrateInModal.map(s => <option key={s.id} value={s.id} className="text-slate-900">{s.nume_serviciu?.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>

              {/* Observații */}
              <div className="bg-slate-50 p-6 rounded-[35px] border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase italic mb-2">Notițe Suplimentare</p>
                <textarea className="w-full bg-transparent text-xs font-bold italic text-slate-700 outline-none resize-none" rows={2}
                  value={editForm.motiv || ""} onChange={e => setEditForm({ ...editForm, motiv: e.target.value })} placeholder="Adaugă detalii..." />
              </div>

              {/* WhatsApp Box */}
              <div className="bg-green-50 border border-green-100 p-6 rounded-[35px] space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black text-green-700 uppercase italic tracking-widest">💬 Mesaj WhatsApp</p>
                  {userSubscription?.plan.includes("FREE") && <span className="text-[7px] bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-black uppercase">Elite Only</span>}
                </div>
                <textarea className="w-full bg-white/50 rounded-2xl p-4 text-[11px] font-bold text-slate-700 outline-none italic border border-green-200" rows={2}
                  value={customMessage} onChange={e => setCustomMessage(e.target.value)} />
                <button onClick={sendWhatsAppReminder} className="w-full py-4 bg-green-600 text-white rounded-2xl text-[10px] font-black uppercase italic shadow-lg shadow-green-200 hover:bg-green-700 active:scale-95 transition-all">
                  Trimite Notificare WhatsApp
                </button>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
                <div className="flex gap-4">
                  <button onClick={handleCloseModal} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-[25px] font-black uppercase text-[10px] italic hover:bg-slate-200 transition-all">Anulează</button>
                  <button onClick={handleUpdate} className="flex-[2] py-5 bg-slate-900 text-white rounded-[25px] font-black shadow-2xl uppercase text-[10px] italic hover:bg-amber-600 transition-all active:scale-95">Salvează Modificările</button>
                </div>
                <button onClick={handleDelete} className="w-full py-5 text-red-500 font-black uppercase text-[9px] italic hover:bg-red-50 rounded-[25px] transition-all">Șterge Definitiv 🗑️</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Calendar */}
      <div className="w-full max-w-6xl flex flex-col items-center mb-6 px-6 py-6 mt-4 gap-6 bg-white rounded-[40px] shadow-sm border border-slate-100">
        <div className="w-full flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg"><span className="text-amber-500 font-black text-xl italic">C</span></div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Calendar <span className="text-amber-600">Chronos</span></h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Sincronizat</p>
                {userSubscription && <span className="text-[8px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold uppercase">{userSubscription.plan}</span>}
              </div>
            </div>
          </div>
          <div className="flex-1 max-w-2xl w-full relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            <input type="text" placeholder="Caută Client sau Telefon..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-[25px] py-4 pl-12 pr-4 text-xs font-black text-slate-700 outline-none focus:border-amber-500 transition-all italic shadow-inner" />
          </div>
          <Link href="/programari" className="px-8 py-4 rounded-[22px] text-[10px] font-black uppercase italic shadow-lg transition-all active:scale-95 bg-amber-500 text-white hover:bg-amber-600">Înapoi la Programări</Link>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-50">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase italic mb-1 ml-4">Filtrează după Specialist {selectedExpert && <button onClick={() => setSelectedExpert("")} className="ml-2 text-amber-600">✕</button>}</p>
            <select value={selectedExpert} onChange={e => setSelectedExpert(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[35px] py-3 px-6 text-[11px] font-black text-slate-700 uppercase italic shadow-inner outline-none focus:border-amber-500 cursor-pointer appearance-none">
              <option value="">Toți Specialiștii</option>
              {rawStaff.map(exp => <option key={exp.id} value={exp.id}>{exp.name}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase italic mb-1 ml-4">Filtrează după Serviciu {selectedServiciu && <button onClick={() => setSelectedServiciu("")} className="ml-2 text-amber-600">✕</button>}</p>
            <select value={selectedServiciu} onChange={e => setSelectedServiciu(e.target.value)} className="w-full bg-amber-50 border-2 border-amber-100 rounded-[35px] py-3 px-6 text-[11px] font-black text-amber-700 uppercase italic shadow-inner outline-none focus:border-amber-500 cursor-pointer appearance-none">
              <option value="">Toate Serviciile</option>
              {rawServices.map(ser => <option key={ser.id} value={ser.id}>{ser.nume_serviciu?.toUpperCase()}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Calendar Grid Section */}
      <div className="w-full max-w-6xl bg-white rounded-[40px] shadow-2xl border border-slate-200 overflow-hidden mb-20">
        <div className="p-4 md:p-8 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-2 rounded-[22px]">
              <button onClick={() => nav(-1)} className="p-3 hover:bg-white rounded-xl transition-colors">◀</button>
              <button onClick={() => setSelectedDate(new Date())} className="px-5 text-[10px] font-black uppercase text-slate-500 italic hover:text-amber-600 transition-colors">Azi</button>
              <button onClick={() => nav(1)} className="p-3 hover:bg-white rounded-xl transition-colors">▶</button>
            </div>
            {/* Pop-up Date Trigger */}
            <h2 onClick={() => setShowDatePickerModal(true)} className="text-xl md:text-2xl font-black text-slate-900 uppercase italic tracking-tighter cursor-pointer hover:text-amber-600 transition-all flex items-center gap-2">
              {viewMode === "day" && `${dayNamesLong[selectedDate.getDay()]}, `}{monthNames[selectedDate.getMonth()]} <span className="text-amber-600">{selectedDate.getFullYear()}</span>
              <span className="text-xs">📅</span>
            </h2>
          </div>
          <div className="flex bg-slate-100 p-2 rounded-[22px]">
            {(["day", "week", "month"] as ViewMode[]).map(opt => (
              <button key={opt} onClick={() => setViewMode(opt)} className={`px-6 py-3 rounded-[18px] text-[10px] font-black uppercase transition-all ${viewMode === opt ? "bg-slate-900 text-white shadow-xl italic" : "text-slate-400 hover:text-slate-600"}`}>
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
                const blockStatus = isDateBlocked(key);
                const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                return (
                  <div key={idx} onClick={() => !blockStatus.blocked && goToDay(day)}
                    className={`min-h-[140px] p-3 flex flex-col items-start border-r border-b border-slate-100 transition-colors relative
                      ${!isCurrentMonth ? "bg-slate-50 opacity-40" : "bg-white"}
                      ${blockStatus.blocked ? "bg-red-50/30 cursor-not-allowed" : "hover:bg-amber-50/30 cursor-pointer"}`}>
                    <span className={`text-[11px] font-black mb-3 px-3 py-1.5 rounded-[12px] ${sameDay(day, new Date()) ? "text-white bg-amber-600" : "text-slate-400"}`}>{day.getDate()}</span>
                    {blockStatus.blocked && <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20"><span className="text-[10px] font-black uppercase italic rotate-45 border-2 border-red-500 text-red-600 px-2 rounded-lg">Închis</span></div>}
                    <div className="w-full space-y-1.5 z-10">
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
                const blockStatus = isDateBlocked(key);
                return (
                  <div key={i} className={`min-h-[600px] flex flex-col border-r border-slate-100 ${blockStatus.blocked ? "bg-slate-50" : "bg-white"}`}>
                    <div className={`p-4 text-center border-b-2 ${sameDay(day, new Date()) ? "border-amber-500 bg-amber-50/50" : "border-slate-50"}`}>
                      <p className="text-[10px] font-black text-slate-400 uppercase italic">{dayNamesShort[i]}</p>
                      <p className={`text-xl font-black italic ${sameDay(day, new Date()) ? "text-amber-600" : "text-slate-900"}`}>{day.getDate()}</p>
                    </div>
                    <div className="p-2 space-y-2 overflow-y-auto">
                      {blockStatus.blocked ? <div className="mt-10 text-center px-4"><p className="text-[8px] font-black text-red-400 uppercase italic">{blockStatus.reason}</p></div> :
                        list.length > 0 ? list.sort((a,b)=>a.ora.localeCompare(b.ora)).map(p => {
                          const expName = rawStaff.find(a=>a.id===p.expertId)?.name || 'General';
                          const svc = rawServices.find(s=>s.id===p.serviciuId);
                          const endTime = svc?.duration ? addMinutesToTime(p.ora, svc.duration) : null;
                          return (
                            <button key={p.id} onClick={() => handleOpenEdit(p)} className="w-full p-3 bg-slate-900 text-white rounded-2xl text-left hover:bg-amber-600 transition-all active:scale-95 shadow-sm border border-slate-700 group">
                              <p className="text-[10px] font-black italic text-amber-500 group-hover:text-white">{p.ora}{endTime ? ` → ${endTime}` : ''}</p>
                              <p className="text-[11px] font-black uppercase truncate italic">{p.nume}</p>
                              <p className="text-[8px] font-bold text-slate-400 group-hover:text-amber-100 truncate italic">{expName}</p>
                            </button>
                          );
                        }) : <p className="text-[9px] text-center text-slate-300 font-black italic mt-4 uppercase">Liber</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === "day" && (
            <div className="bg-white min-h-[500px] py-12 px-6">
              <div className="max-w-3xl mx-auto space-y-4">
                {isDateBlocked(formatDateKey(selectedDate)).blocked ? (
                  <div className="text-center py-20 bg-red-50 rounded-[40px] border-2 border-dashed border-red-200">
                    <p className="text-xl font-black text-red-500 uppercase italic mb-2">Locație Închisă</p>
                    <p className="text-xs font-bold text-red-400 uppercase italic">{isDateBlocked(formatDateKey(selectedDate)).reason}</p>
                  </div>
                ) : (programariByDate[formatDateKey(selectedDate)] || []).length > 0 ? (
                  (programariByDate[formatDateKey(selectedDate)] || []).sort((a, b) => a.ora.localeCompare(b.ora)).map(p => {
                    const svc = rawServices.find(s => s.id === p.serviciuId);
                    const endTime = svc?.duration ? addMinutesToTime(p.ora, svc.duration) : null;
                    return (
                      <div key={p.id} className="flex items-center gap-6 p-6 bg-slate-50 rounded-[35px] border border-slate-100 group hover:bg-slate-900 transition-all cursor-pointer shadow-sm" onClick={() => handleOpenEdit(p)}>
                        <div className="w-28 text-center border-r border-slate-200 pr-6 group-hover:border-slate-700">
                          <p className="text-sm font-black italic text-amber-600">{p.ora}</p>
                          {endTime && <p className="text-[9px] font-bold text-slate-400 group-hover:text-slate-500">→ {endTime}</p>}
                        </div>
                        <div className="flex-1">
                          <p className="text-lg font-black uppercase italic text-slate-900 group-hover:text-white leading-none mb-1">{p.nume}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase italic tracking-widest">{svc?.nume_serviciu || 'Serviciu Nesetat'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 group-hover:text-amber-500 uppercase italic">{rawStaff.find(a => a.id === p.expertId)?.name || 'Nesetat'}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-100">
                    <p className="text-xs font-black text-slate-300 uppercase italic">Nicio programare pentru această zi.</p>
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-black italic text-slate-300 animate-pulse uppercase">Se încarcă Chronos...</div>}>
      <CalendarContent />
    </Suspense>
  );
}