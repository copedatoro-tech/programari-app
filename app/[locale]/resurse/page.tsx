'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { showToast } from "@/lib/toast";

const LIMITE = {
  STAFF: {
    "chronos free":  1,
    "chronos pro":   1,
    "chronos elite": 5,
    "chronos team":  50,
  },
  SERVICII: {
    "chronos free":  5,
    "chronos pro":   15,
    "chronos elite": 999,
    "chronos team":  999,
  },
};

const PLAN_LABELS: Record<string, string> = {
  "chronos free":  "CHRONOS FREE",
  "chronos pro":   "CHRONOS PRO",
  "chronos elite": "CHRONOS ELITE",
  "chronos team":  "CHRONOS TEAM",
};

// Zilele stocate in baza de date (working_hours.day) sunt salvate intotdeauna
// in romana, indiferent de limba interfetei - la fel ca la profilul general
// (adminWorkingHours), pentru consecventa cu tot restul aplicatiei.
const RO_DAY_NAMES = ["Duminică","Luni","Marți","Miercuri","Joi","Vineri","Sâmbătă"];
// Ordinea de afisare in interfata: Luni -> Duminica (mai naturala pentru un program de lucru)
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface ScheduleDay { day: string; start: string; end: string; closed: boolean }

function normalizeazaPlan(plan: string): string {
  const p = (plan || "").toLowerCase().trim();
  if (p.includes("team"))  return "chronos team";
  if (p.includes("elite")) return "chronos elite";
  if (p.includes("pro"))   return "chronos pro";
  return "chronos free";
}

function parseStaffWH(raw: any): ScheduleDay[] {
  if (!raw) return [];
  if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return []; } }
  return Array.isArray(raw) ? raw : [];
}

function defaultSchedule(): ScheduleDay[] {
  return RO_DAY_NAMES.map((day) => ({ day, start: "09:00", end: "18:00", closed: false }));
}

export default function ResursePage() {
  const t = useTranslations("resurse");
  const router = useRouter();
  const [services, setServices]   = useState<any[]>([]);
  const [staff, setStaff]         = useState<any[]>([]);
  const [userPlan, setUserPlan]   = useState("chronos free");
  const [businessCurrency, setBusinessCurrency] = useState("RON");
  const [loading, setLoading]     = useState(true);
  const [userId, setUserId]       = useState<string | null>(null);
  const [isDemo, setIsDemo]       = useState(false);
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);

  const [newService, setNewService] = useState({ name: '', price: '', hour: '0', minute: '30' });
  const [newStaff, setNewStaff]     = useState({ name: '', phone: '', email: '' });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm]   = useState<any>(null);

  // Program individual per specialist
  const [scheduleStaffId, setScheduleStaffId] = useState<string | null>(null);
  const [scheduleByDay, setScheduleByDay] = useState<Record<string, { start: string; end: string }[]>>({});
  const [savingSchedule, setSavingSchedule] = useState(false);
  const scheduleModalRef = useRef<HTMLDivElement>(null);

  const supabase = useMemo(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ), []);

  const editServiciuRef = useRef<HTMLDivElement>(null);
  const editStaffRef    = useRef<HTMLDivElement>(null);
  const oreOptiuni      = Array.from({ length: 25 }, (_, i) => i);
  const minuteOptiuni   = [0, 15, 30, 45];
  const scheduleDayNames = t.raw("scheduleDayNames") as string[];

  const fetchResurse = useCallback(async (uid: string) => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('plan_type, currency')
        .eq('id', uid);

      if (profileError) console.error("Eroare profil:", profileError.message);

      const profile = profiles && profiles.length > 0 ? profiles[0] : null;
      const planNormalizat = normalizeazaPlan(profile?.plan_type || "");
      setUserPlan(planNormalizat);
      setBusinessCurrency(profile?.currency || "RON");

      const { data: svs, error: errSvs } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      const { data: stf, error: errStf } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (errSvs) setErrorMsg(`${t("dbErrorPrefix")}${errSvs.message}`);
      setServices(svs ?? []);
      setStaff(stf ?? []);
    } catch (err) {
      console.error("Eroare la preluarea datelor:", err);
      setErrorMsg("Eroare la incarcarea datelor.");
    } finally {
      setLoading(false);
    }
  }, [supabase, t]);

  useEffect(() => {
    let mounted = true;
    async function initAuth() {
      const demoActive = typeof window !== 'undefined' && localStorage.getItem("chronos_demo") === "true";
      if (demoActive) {
        if (!mounted) return;
        setUserId("demo_user");
        setIsDemo(true);
        setServices([
          { id: 'd1', nume_serviciu: 'Tuns (Exemplu)', price: '50', duration: '30' },
          { id: 'd2', nume_serviciu: 'Barba (Exemplu)', price: '30', duration: '15' }
        ]);
        setStaff([{ id: 's1', name: 'ECHIPĂ EXPERȚI CHRONOS', phone: '0700000000', email: 'expert@chronos.ro', services: [] }]);
        setLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        if (!mounted) return;
        setUserId(session.user.id);
        setIsDemo(false);
        await fetchResurse(session.user.id);
      } else {
        if (mounted) router.replace("/login");
      }
    }
    initAuth();
    return () => { mounted = false; };
  }, [router, supabase, fetchResurse]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (editingId && !editServiciuRef.current?.contains(target) && !editStaffRef.current?.contains(target)) {
        setEditingId(null);
        setEditForm(null);
      }
      if (scheduleStaffId && scheduleModalRef.current && !scheduleModalRef.current.contains(target)) {
        setScheduleStaffId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editingId, scheduleStaffId]);

  const getLimitaServicii = () => LIMITE.SERVICII[userPlan as keyof typeof LIMITE.SERVICII] ?? LIMITE.SERVICII["chronos free"];
  const getLimitaStaff     = () => LIMITE.STAFF[userPlan as keyof typeof LIMITE.STAFF]       ?? LIMITE.STAFF["chronos free"];
  const getPlanLabel      = () => PLAN_LABELS[userPlan] ?? userPlan.toUpperCase();

  async function handleAddService() {
    if (!newService.name.trim() || !userId || isDemo) return;
    if (services.length >= getLimitaServicii()) {
      alert(t("serviceLimitReached", { limit: getLimitaServicii() }));
      return;
    }
    const durataTotala = (parseInt(newService.hour) * 60) + parseInt(newService.minute);
    const { error } = await supabase.from('services').insert([{
      nume_serviciu: newService.name.trim(),
      price: parseFloat(newService.price) || 0,
      duration: durataTotala,
      user_id: userId
    }]);
    if (error) { alert(`${t("errorPrefix")}${error.message}`); return; }
    setNewService({ name: '', price: '', hour: '0', minute: '30' });
    await fetchResurse(userId);
  }

  async function handleAddStaff() {
    if (!newStaff.name.trim() || !userId || isDemo) return;
    if (staff.length >= getLimitaStaff()) {
      alert(t("staffLimitReached", { limit: getLimitaStaff() }));
      return;
    }
    const { error } = await supabase.from('staff').insert([{
      name: newStaff.name.trim(),
      phone: newStaff.phone.trim() || null,
      email: newStaff.email.trim() || null,
      services: [],
      user_id: userId
    }]);
    if (error) { alert(`${t("errorPrefix")}${error.message}`); return; }
    setNewStaff({ name: '', phone: '', email: '' });
    await fetchResurse(userId);
  }

  async function handleDelete(id: string, type: 'services' | 'staff') {
    if (isDemo || !userId) return;
    if (!confirm(t("confirmDeleteResource"))) return;
    const { error } = await supabase.from(type).delete().eq('id', id);
    if (error) alert(error.message);
    await fetchResurse(userId);
  }

  const activeazaEditare = (item: any, tip: 'service' | 'staff') => {
    if (isDemo) return;
    let editData = {
      ...item, tip,
      name: tip === 'service' ? (item.nume_serviciu || "") : (item.name || ""),
      price: item.price || "0",
      duration: item.duration || "0"
    };
    if (tip === 'service') {
      const d = parseInt(editData.duration) || 0;
      editData.hour = Math.floor(d / 60).toString();
      editData.minute = (d % 60).toString();
    } else {
      editData.services = Array.isArray(item.services) ? item.services : [];
      editData.phone = item.phone || "";
      editData.email = item.email || "";
    }
    setEditForm(editData);
    setEditingId(item.id);
  };

  const salveazaEditare = async () => {
    if (isDemo || !editForm || !editingId || !userId) return;
    const tabela = editForm.tip === 'service' ? 'services' : 'staff';
    let payload: any = {};
    if (editForm.tip === 'service') {
      payload.nume_serviciu = editForm.name;
      payload.price = parseFloat(editForm.price) || 0;
      payload.duration = (parseInt(editForm.hour) * 60) + parseInt(editForm.minute);
    } else {
      payload.name = editForm.name;
      payload.phone = editForm.phone || null;
      payload.email = editForm.email || null;
      payload.services = editForm.services ?? [];
    }
    const { error } = await supabase.from(tabela).update(payload).eq('id', editingId);
    if (error) alert(error.message);
    setEditingId(null); setEditForm(null);
    await fetchResurse(userId);
  };

  const toggleServiciuStaff = (serviceId: string) => {
    if (!editForm) return;
    const lista = [...(editForm.services || [])];
    const idx = lista.indexOf(serviceId);
    if (idx > -1) lista.splice(idx, 1); else lista.push(serviceId);
    setEditForm({ ...editForm, services: lista });
  };

  // Deschide modalul de program pentru un specialist — grupăm intrările existente pe zi,
  // ca să suportăm mai multe intervale separate în aceeași zi (ex: 02-03, 14-15, 20-21)
  const openScheduleModal = (staffMember: any) => {
    if (isDemo) return;
    const existing = parseStaffWH(staffMember.working_hours);
    const grouped: Record<string, { start: string; end: string }[]> = {};
    existing.forEach((entry) => {
      if (entry.closed) return; // zilele închise explicit rămân fără intervale (= închise)
      if (!grouped[entry.day]) grouped[entry.day] = [];
      grouped[entry.day].push({ start: entry.start, end: entry.end });
    });
    setScheduleByDay(grouped);
    setScheduleStaffId(staffMember.id);
  };

  const setDefaultSchedule = () => {
    const grouped: Record<string, { start: string; end: string }[]> = {};
    RO_DAY_NAMES.forEach((day) => { grouped[day] = [{ start: "09:00", end: "18:00" }]; });
    setScheduleByDay(grouped);
  };

  const addInterval = (day: string) => {
    setScheduleByDay(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), { start: "09:00", end: "18:00" }],
    }));
  };

  const removeInterval = (day: string, idx: number) => {
    setScheduleByDay(prev => {
      const updated = (prev[day] || []).filter((_, i) => i !== idx);
      return { ...prev, [day]: updated };
    });
  };

  const updateInterval = (day: string, idx: number, field: "start" | "end", value: string) => {
    setScheduleByDay(prev => ({
      ...prev,
      [day]: (prev[day] || []).map((iv, i) => i === idx ? { ...iv, [field]: value } : iv),
    }));
  };

  const clearSchedule = () => {
    setScheduleByDay({});
  };

  const hasAnySchedule = Object.values(scheduleByDay).some(intervals => intervals.length > 0);

  const saveSchedule = async () => {
    if (!scheduleStaffId || !userId || isDemo) return;
    setSavingSchedule(true);
    // Transformăm în formatul plat, salvat în baza de date — o zi poate apărea
    // de mai multe ori, o dată per interval; zilele fără intervale = închise
    const flat: ScheduleDay[] = [];
    RO_DAY_NAMES.forEach((day) => {
      const intervals = scheduleByDay[day] || [];
      if (intervals.length === 0) {
        flat.push({ day, start: "00:00", end: "00:00", closed: true });
      } else {
        intervals.forEach((iv) => flat.push({ day, start: iv.start, end: iv.end, closed: false }));
      }
    });
    const { error } = await supabase
      .from('staff')
      .update({ working_hours: flat })
      .eq('id', scheduleStaffId);
    setSavingSchedule(false);
    if (error) { alert(error.message); return; }
    await showToast({ message: t("scheduleSavedToast"), type: "success" });
    setScheduleStaffId(null);
    await fetchResurse(userId);
  };

  const scheduleStaffMember = staff.find(s => s.id === scheduleStaffId);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center font-black italic text-amber-600 animate-pulse uppercase tracking-[0.3em] text-[10px]">{t("loading")}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fcfcfc] p-4 md:p-16 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-slate-900 border-l-8 border-amber-500 pl-6 leading-tight">
              {t("headingLine1")} <span className="text-amber-600">{t("headingHighlight")}</span><br/>
              {t("headingLine2")} <span className="text-slate-500">{t("headingHighlight2")}</span>
            </h1>
            <div className="flex items-center gap-2 ml-8 mt-4">
              <span className={`w-2 h-2 rounded-full animate-pulse ${isDemo ? 'bg-blue-500' : 'bg-amber-500'}`}></span>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                {isDemo ? t("demoMode") : `${t("activePlanPrefix")}${getPlanLabel()}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/programari')}
            className="px-8 py-4 bg-white border-2 border-slate-900 rounded-[20px] font-black uppercase text-[10px] italic hover:bg-slate-900 hover:text-white transition-all shadow-lg border-b-4 active:translate-y-1 active:border-b-0 active:scale-95"
            title={t("backBtn")}
          >
            {t("backBtn")}
          </button>
        </header>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-[11px] font-black uppercase italic">{errorMsg}</div>
        )}

        {/* SECTIUNI ADAUGARE */}
        <div className="space-y-6 mb-16">

          {/* Formular SERVICIU */}
          <div className={`bg-white p-8 rounded-[35px] shadow-xl border border-slate-100 transition-all ${isDemo ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
            <h3 className="text-[10px] font-black uppercase italic text-amber-600 mb-6 tracking-widest">{t("addServiceTitle")}</h3>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px] flex flex-col gap-1">
                <span className="text-[8px] font-black text-slate-400 ml-3 uppercase">{t("serviceNameLabel")}</span>
                <input
                  className="bg-slate-50 p-5 rounded-2xl font-black uppercase italic text-[11px] outline-none border-2 border-transparent focus:border-amber-500 transition-all shadow-inner"
                  placeholder={t("serviceNamePlaceholder")}
                  value={newService.name}
                  onChange={e => setNewService({ ...newService, name: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[8px] font-black text-slate-400 ml-3 uppercase">{t("durationLabel")}</span>
                <div className="flex gap-1 bg-slate-50 p-2 rounded-2xl border border-slate-100 shadow-inner">
                  <select
                    className="bg-white px-3 py-3 rounded-xl font-black text-[11px] outline-none shadow-sm"
                    value={newService.hour}
                    onChange={e => setNewService({ ...newService, hour: e.target.value })}
                  >
                    {oreOptiuni.map(h => <option key={h} value={h}>{h} {t("hourUnit")}</option>)}
                  </select>
                  <select
                    className="bg-white px-3 py-3 rounded-xl font-black text-[11px] outline-none shadow-sm"
                    value={newService.minute}
                    onChange={e => setNewService({ ...newService, minute: e.target.value })}
                  >
                    {minuteOptiuni.map(m => <option key={m} value={m}>{m} {t("minuteUnit")}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[8px] font-black text-slate-400 ml-3 uppercase">{t("priceLabel")} <span className="text-amber-600">({businessCurrency})</span></span>
                <div className="relative">
                  <input
                    type="number"
                    className="w-32 bg-slate-50 p-5 pr-12 rounded-2xl font-black uppercase italic text-[11px] outline-none border-2 border-transparent focus:border-amber-500 transition-all shadow-inner"
                    placeholder={businessCurrency}
                    value={newService.price}
                    onChange={e => setNewService({ ...newService, price: e.target.value })}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">{businessCurrency}</span>
                </div>
              </div>
              <button
                onClick={handleAddService}
                disabled={services.length >= getLimitaServicii()}
                className="px-8 py-5 rounded-2xl font-black uppercase italic text-[11px] bg-slate-900 text-amber-500 border-b-4 border-slate-800 hover:bg-amber-500 hover:text-black transition-all active:translate-y-1 active:border-b-0 shadow-lg"
                title={t("addServiceBtn")}
              >
                {t("addServiceBtn")}
              </button>
            </div>
          </div>

          {/* Formular EXPERT */}
          <div className={`bg-white p-8 rounded-[35px] shadow-xl border border-slate-100 transition-all ${isDemo ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
            <h3 className="text-[10px] font-black uppercase italic text-amber-600 mb-6 tracking-widest">{t("addStaffTitle")}</h3>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px] flex flex-col gap-1">
                <span className="text-[8px] font-black text-slate-400 ml-3 uppercase">{t("staffNameLabel")}</span>
                <input
                  className="bg-slate-50 p-5 rounded-2xl font-black uppercase italic text-[11px] outline-none border-2 border-transparent focus:border-amber-500 transition-all shadow-inner"
                  placeholder={t("staffNamePlaceholder")}
                  value={newStaff.name}
                  onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                />
              </div>
              <div className="min-w-[180px] flex-1 flex flex-col gap-1">
                <span className="text-[8px] font-black text-slate-400 ml-3 uppercase">{t("phoneLabel")}</span>
                <input
                  type="tel"
                  className="bg-slate-50 p-5 rounded-2xl font-black uppercase italic text-[11px] outline-none border-2 border-transparent focus:border-amber-500 transition-all shadow-inner"
                  placeholder={t("phonePlaceholder")}
                  value={newStaff.phone}
                  onChange={e => setNewStaff({ ...newStaff, phone: e.target.value.replace(/[^0-9+]/g, "") })}
                />
              </div>
              <div className="min-w-[220px] flex-1 flex flex-col gap-1">
                <span className="text-[8px] font-black text-slate-400 ml-3 uppercase">{t("emailLabel")}</span>
                <input
                  type="email"
                  className="bg-slate-50 p-5 rounded-2xl font-black uppercase italic text-[11px] outline-none border-2 border-transparent focus:border-amber-500 transition-all shadow-inner"
                  placeholder={t("emailPlaceholder")}
                  value={newStaff.email}
                  onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                />
              </div>
              <button
                onClick={handleAddStaff}
                disabled={staff.length >= getLimitaStaff()}
                className="px-8 py-5 rounded-2xl font-black uppercase italic text-[11px] bg-slate-900 text-amber-500 border-b-4 border-slate-800 hover:bg-amber-500 hover:text-black transition-all active:translate-y-1 active:border-b-0 shadow-lg"
                title={t("addStaffBtn")}
              >
                {t("addStaffBtn")}
              </button>
            </div>
          </div>

        </div>

        {/* GRID AFISARE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* Servicii Lista */}
          <div className="bg-white p-10 rounded-[50px] shadow-xl border border-slate-50 relative">
            <h2 className="text-[11px] font-black uppercase italic text-slate-400 mb-10 tracking-[0.3em] border-b pb-6">
              {t("activeServicesTitle")} ({services.length} / {getLimitaServicii() >= 999 ? '∞' : getLimitaServicii()})
            </h2>
            <div className="space-y-4">
              {services.map(s => (
                <div key={s.id} className="group bg-slate-50 rounded-[28px] border-l-8 border-amber-500 hover:bg-white transition-all border border-transparent hover:border-slate-100 overflow-hidden relative shadow-sm">
                  {editingId === s.id ? (
                    <div ref={editServiciuRef} className="p-8 space-y-4 bg-white animate-in slide-in-from-top-2 duration-200">
                      <input className="w-full p-4 rounded-xl border-2 border-slate-100 font-black uppercase italic text-[11px]"
                        value={editForm?.name || ""} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                      <div className="flex gap-2">
                         <input className="flex-1 p-4 rounded-xl border-2 border-slate-100 font-black text-[11px]"
                          placeholder={businessCurrency}
                          value={editForm?.price || ""} onChange={e => setEditForm({ ...editForm, price: e.target.value })} />
                         <select className="flex-1 p-4 rounded-xl border-2 border-slate-100 font-black text-[11px]"
                          value={editForm?.hour || "0"} onChange={e => setEditForm({ ...editForm, hour: e.target.value })}>
                            {oreOptiuni.map(h => <option key={h} value={h}>{h} {t("hourUnit")}</option>)}
                         </select>
                         <select className="flex-1 p-4 rounded-xl border-2 border-slate-100 font-black text-[11px]"
                          value={editForm?.minute || "0"} onChange={e => setEditForm({ ...editForm, minute: e.target.value })}>
                            {minuteOptiuni.map(m => <option key={m} value={m}>{m} {t("minuteUnit")}</option>)}
                         </select>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={salveazaEditare} className="flex-1 bg-slate-900 text-amber-500 p-4 rounded-xl text-[10px] font-black uppercase italic">{t("save")}</button>
                        <button onClick={() => { setEditingId(null); setEditForm(null); }} className="flex-1 bg-slate-100 p-4 rounded-xl text-[10px] font-black uppercase italic text-slate-400">{t("cancel")}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 flex justify-between items-center cursor-pointer" onClick={() => activeazaEditare(s, 'service')}>
                      <div>
                        <p className="font-black uppercase italic text-[13px] text-slate-900 group-hover:text-amber-600 transition-colors">{s.nume_serviciu}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase italic tracking-widest">
                          {s.price} {businessCurrency} — {Math.floor(s.duration / 60) > 0 ? `${Math.floor(s.duration / 60)}${t("hourUnit")} ` : ''}{s.duration % 60} {t("minuteUnit")}
                        </p>
                      </div>
                      {!isDemo && (
                        <button onClick={e => { e.stopPropagation(); handleDelete(s.id, 'services'); }} className="bg-white text-red-500 w-10 h-10 flex items-center justify-center rounded-xl shadow-md border border-red-100 hover:bg-red-500 hover:text-white transition-all">✕</button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Experti Lista */}
          <div className="bg-white p-10 rounded-[50px] shadow-xl border border-slate-50 relative">
            <h2 className="text-[11px] font-black uppercase italic text-slate-400 mb-10 tracking-[0.3em] border-b pb-6 text-right">
              {t("teamTitle")} ({staff.length} / {getLimitaStaff() >= 999 ? '∞' : getLimitaStaff()})
            </h2>
            <div className="space-y-4">
              {staff.map(p => (
                <div key={p.id} className="group bg-slate-900 rounded-[28px] border-l-8 border-slate-700 hover:border-amber-500 transition-all overflow-hidden relative shadow-lg">
                  {editingId === p.id ? (
                    <div ref={editStaffRef} className="p-8 space-y-6 bg-slate-800 animate-in slide-in-from-bottom-2 duration-200">
                      <input className="w-full p-4 rounded-xl border-2 border-slate-700 bg-slate-900 text-white font-black uppercase italic text-[11px]"
                        value={editForm?.name || ""} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input className="w-full p-4 rounded-xl border-2 border-slate-700 bg-slate-900 text-white font-black uppercase italic text-[11px]"
                          placeholder={t("phoneLabel")}
                          value={editForm?.phone || ""}
                          onChange={e => setEditForm({ ...editForm, phone: e.target.value.replace(/[^0-9+]/g, "") })} />
                        <input className="w-full p-4 rounded-xl border-2 border-slate-700 bg-slate-900 text-white font-black uppercase italic text-[11px]"
                          placeholder={t("emailLabel")}
                          value={editForm?.email || ""}
                          onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2">
                        {services.map(s => (
                          <button key={s.id} onClick={() => toggleServiciuStaff(s.id)}
                            className={`p-3 rounded-xl text-[9px] font-black uppercase italic transition-all border-2 ${(editForm?.services || []).includes(s.id) ? 'bg-amber-500 border-amber-500 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
                            {s.nume_serviciu}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-3">
                        <button onClick={salveazaEditare} className="flex-1 bg-amber-500 text-slate-900 p-4 rounded-xl text-[10px] font-black uppercase italic">{t("save")}</button>
                        <button onClick={() => { setEditingId(null); setEditForm(null); }} className="flex-1 bg-slate-700 p-4 rounded-xl text-[10px] font-black uppercase italic text-slate-300">{t("close")}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 flex justify-between items-center cursor-pointer" onClick={() => activeazaEditare(p, 'staff')}>
                      <div className="flex-1">
                        <p className="font-black uppercase italic text-[13px] text-white group-hover:text-amber-500 transition-colors">{p.name}</p>
                        {(p.phone || p.email) && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {p.phone && <span className="text-[8px] bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700 uppercase font-black">{p.phone}</span>}
                            {p.email && <span className="text-[8px] bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700 uppercase font-black">{p.email}</span>}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {(p.services || []).map((servId: string, idx: number) => {
                            const service = services.find(s => s.id === servId);
                            return (
                              <span key={idx} className="text-[8px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700 uppercase font-black">
                                {service ? service.nume_serviciu : t("deletedService")}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        {!isDemo && (
                          <button
                            onClick={e => { e.stopPropagation(); openScheduleModal(p); }}
                            className="bg-slate-800 text-amber-500 px-3 py-2 flex items-center justify-center rounded-xl border border-slate-700 hover:bg-amber-500 hover:text-slate-900 transition-all text-[9px] font-black uppercase italic whitespace-nowrap"
                          >
                            🗓️ {t("scheduleBtn")}
                          </button>
                        )}
                        {!isDemo && (
                          <button onClick={e => { e.stopPropagation(); handleDelete(p.id, 'staff'); }} className="bg-slate-800 text-red-400 w-10 h-10 flex items-center justify-center rounded-xl border border-slate-700 hover:bg-red-500 hover:text-white transition-all">✕</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* MODAL PROGRAM INDIVIDUAL PER SPECIALIST */}
      {scheduleStaffId && scheduleStaffMember && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div ref={scheduleModalRef} className="bg-white w-full max-w-2xl rounded-[45px] p-8 md:p-10 shadow-2xl border-t-[10px] border-amber-500 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest italic mb-1 block">{t("scheduleModalTitle")}</span>
                <h3 className="text-2xl font-black uppercase italic text-slate-900 tracking-tighter">
                  {t("scheduleModalSubtitle")} {scheduleStaffMember.name}
                </h3>
              </div>
              <button onClick={() => setScheduleStaffId(null)} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl font-black text-slate-400 hover:bg-red-500 hover:text-white transition-all">✕</button>
            </div>

            {!hasAnySchedule ? (
              <div className="my-8 p-8 bg-amber-50 border-2 border-dashed border-amber-200 rounded-[30px] text-center">
                <p className="text-[11px] font-bold text-amber-800 italic mb-4">{t("noScheduleHint")}</p>
                <button
                  onClick={setDefaultSchedule}
                  className="px-6 py-3 bg-slate-900 text-amber-500 rounded-xl font-black text-[10px] uppercase italic hover:bg-amber-500 hover:text-slate-900 transition-all"
                >
                  {t("openDayLabel")} 09:00-18:00 →
                </button>
              </div>
            ) : (
              <div className="space-y-3 my-6">
                {DISPLAY_ORDER.map((dayIdx) => {
                  const dayRo = RO_DAY_NAMES[dayIdx];
                  const intervals = scheduleByDay[dayRo] || [];
                  const isClosed = intervals.length === 0;
                  return (
                    <div key={dayRo} className={`flex flex-col gap-3 p-4 rounded-2xl border-2 transition-all ${isClosed ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-black uppercase italic text-slate-700">{scheduleDayNames[dayIdx]}</span>
                        <div className="flex items-center gap-2">
                          {isClosed ? (
                            <span className="px-4 py-2 rounded-xl text-[9px] font-black uppercase italic bg-red-500 text-white">{t("closedDayLabel")}</span>
                          ) : (
                            <span className="px-4 py-2 rounded-xl text-[9px] font-black uppercase italic bg-green-500 text-white">{t("openDayLabel")}</span>
                          )}
                          <button
                            onClick={() => addInterval(dayRo)}
                            className="px-3 py-2 rounded-xl text-[9px] font-black uppercase italic bg-slate-900 text-amber-500 hover:bg-amber-500 hover:text-slate-900 transition-all"
                          >
                            {t("addIntervalBtn")}
                          </button>
                        </div>
                      </div>
                      {intervals.map((iv, idx) => (
                        <div key={idx} className="flex items-center gap-2 pl-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase">{t("fromLabel")}</span>
                          <input type="time" value={iv.start}
                            onChange={e => updateInterval(dayRo, idx, "start", e.target.value)}
                            className="p-2 rounded-lg border-2 border-slate-200 font-black text-[12px] outline-none focus:border-amber-500" />
                          <span className="text-[9px] font-black text-slate-400 uppercase">{t("toLabel")}</span>
                          <input type="time" value={iv.end}
                            onChange={e => updateInterval(dayRo, idx, "end", e.target.value)}
                            className="p-2 rounded-lg border-2 border-slate-200 font-black text-[12px] outline-none focus:border-amber-500" />
                          <button
                            onClick={() => removeInterval(dayRo, idx)}
                            className="ml-auto px-3 py-1.5 rounded-lg text-[9px] font-black uppercase italic text-red-400 hover:bg-red-50 transition-all"
                          >
                            ✕ {t("removeIntervalBtn")}
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3 mt-6 pt-6 border-t border-slate-100">
              {hasAnySchedule && (
                <button onClick={clearSchedule} className="px-5 py-4 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase italic hover:bg-slate-200 transition-all">
                  ↺
                </button>
              )}
              <button onClick={() => setScheduleStaffId(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-xl font-black text-[11px] uppercase italic hover:bg-slate-200 transition-all">
                {t("closeBtn")}
              </button>
              <button
                onClick={saveSchedule}
                disabled={savingSchedule}
                className="flex-1 py-4 bg-slate-900 text-amber-500 rounded-xl font-black text-[11px] uppercase italic hover:bg-amber-500 hover:text-slate-900 transition-all shadow-lg disabled:opacity-50"
              >
                {savingSchedule ? "..." : t("saveScheduleBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}