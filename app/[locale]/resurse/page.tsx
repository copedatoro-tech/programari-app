'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { showToast } from "@/lib/toast";
import SimpleTimePicker from "@/components/SimpleTimePicker";

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
    "chronos elite": 50,
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

// ✅ Generează o parolă temporară, ușor de citit/dictat, pentru contul specialistului
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let pass = "";
  for (let i = 0; i < 8; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
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
  const [technicalError, setTechnicalError] = useState(false);

  const [newService, setNewService] = useState({ name: '', price: '', hour: '0', minute: '30' });
  const [newStaff, setNewStaff]     = useState({ name: '', phone: '', email: '' });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm]   = useState<any>(null);

  // Program individual per specialist
  const [scheduleStaffId, setScheduleStaffId] = useState<string | null>(null);
  const [scheduleByDay, setScheduleByDay] = useState<Record<string, { start: string; end: string }[]>>({});
  const [savingSchedule, setSavingSchedule] = useState(false);
  const scheduleModalRef = useRef<HTMLDivElement>(null);

  // ✅ Invitare cont specialist
  const [inviteStaff, setInviteStaff] = useState<any | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteDone, setInviteDone] = useState(false);
  const inviteModalRef = useRef<HTMLDivElement>(null);

  // ✅ Gestionare cont existent (corectare email / resetare parolă / dezactivare)
  const [manageStaff, setManageStaff] = useState<any | null>(null);
  const [manageEmail, setManageEmail] = useState('');
  const [managePassword, setManagePassword] = useState('');
  const [manageLoading, setManageLoading] = useState(false);
  const [manageError, setManageError] = useState('');
  const [manageSuccessMsg, setManageSuccessMsg] = useState('');
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  const manageModalRef = useRef<HTMLDivElement>(null);

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
      // ✅ Dacă ambele interogări principale eșuează, e o problemă tehnică reală,
      // nu doar o listă goală (caz normal pentru un cont nou)
      if (errSvs && errStf) setTechnicalError(true);
      setServices(svs ?? []);
      setStaff(stf ?? []);
    } catch (err) {
      console.error("Eroare la preluarea datelor:", err);
      setTechnicalError(true);
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
      if (inviteStaff && inviteModalRef.current && !inviteModalRef.current.contains(target)) {
        setInviteStaff(null);
      }
      if (manageStaff && manageModalRef.current && !manageModalRef.current.contains(target)) {
        setManageStaff(null);
        setConfirmingDeactivate(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editingId, scheduleStaffId, inviteStaff, manageStaff]);

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

  // ✅ Comutare rapidă: un click transformă ziua din deschisă în închisă (sau invers)
  const toggleDayClosed = (day: string) => {
    setScheduleByDay(prev => {
      const isCurrentlyClosed = (prev[day] || []).length === 0;
      return { ...prev, [day]: isCurrentlyClosed ? [{ start: "09:00", end: "18:00" }] : [] };
    });
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

  // ✅ Deschide modalul de invitare cont pentru un specialist
  const openInviteModal = (staffMember: any) => {
    if (isDemo) return;
    setInviteStaff(staffMember);
    setInviteEmail(staffMember.email || '');
    setInvitePhone(staffMember.phone || '');
    setInvitePassword(generateTempPassword());
    setInviteError('');
    setInviteDone(false);
  };

  const handleCreateAccount = async () => {
    if (!inviteStaff || !inviteEmail.trim() || !invitePassword.trim()) return;
    setInviteLoading(true);
    setInviteError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setInviteError('Sesiune expirată. Reîncarcă pagina.'); setInviteLoading(false); return; }

      const res = await fetch('/api/staff/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          staffId: inviteStaff.id,
          email: inviteEmail.trim(),
          tempPassword: invitePassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setInviteError(json?.error || 'Eroare la crearea contului.');
        setInviteLoading(false);
        return;
      }
      // ✅ Salvăm și telefonul completat/corectat în modal, dacă diferă de cel existent —
      // ca linkul de WhatsApp să funcționeze corect data viitoare, fără să mai depindă
      // doar de ce era salvat inițial pe specialist
      if (invitePhone.trim() && invitePhone.trim() !== inviteStaff.phone) {
        await supabase.from('staff').update({ phone: invitePhone.trim() }).eq('id', inviteStaff.id);
      }
      setInviteDone(true);
      if (userId) await fetchResurse(userId);
    } catch (e: any) {
      setInviteError(e?.message || 'Eroare de conexiune.');
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInviteCredentials = async () => {
    const text = t("staffPortal.copyTemplate", {
      link: `${window.location.origin}/specialist/login`,
      email: inviteEmail,
      password: invitePassword,
    });
    try {
      await navigator.clipboard.writeText(text);
      await showToast({ message: t("staffPortal.copiedToast"), type: 'success' });
    } catch {}
  };

  // ✅ Trimite datele de acces direct pe WhatsApp, la numărul din modal
  const sendInviteOnWhatsApp = () => {
    const rawPhone = invitePhone || '';
    const digits = rawPhone.replace(/\D/g, '');
    const normalized = digits.startsWith('0') ? '4' + digits : digits;
    if (!normalized || normalized.length < 10) {
      showToast({ message: t("staffPortal.noPhoneError"), type: 'error' });
      return;
    }
    const text = t("staffPortal.waMessageTemplate", {
      name: inviteStaff?.name || '',
      link: `${window.location.origin}/specialist/login`,
      email: inviteEmail,
      password: invitePassword,
    });
    window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // ✅ Alternativă pe email — mereu disponibilă, indiferent dacă specialistul are telefon salvat sau nu
  const sendInviteOnEmail = () => {
    if (!inviteEmail.trim()) return;
    const subject = t("staffPortal.emailSubject");
    const body = t("staffPortal.emailBodyTemplate", {
      name: inviteStaff?.name || '',
      link: `${window.location.origin}/specialist/login`,
      email: inviteEmail,
      password: invitePassword,
    });
    window.location.href = `mailto:${inviteEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // ✅ Deschide modalul de gestionare pentru un specialist cu cont deja activ
  const openManageModal = (staffMember: any) => {
    if (isDemo) return;
    setManageStaff(staffMember);
    setManageEmail(staffMember.email || '');
    setManagePassword('');
    setManageError('');
    setManageSuccessMsg('');
    setConfirmingDeactivate(false);
  };

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session ? { Authorization: `Bearer ${session.access_token}` } : null;
  };

  // ✅ Corectează email-ul greșit și/sau resetează parola contului deja creat
  const handleUpdateAccount = async () => {
    if (!manageStaff) return;
    setManageLoading(true);
    setManageError('');
    setManageSuccessMsg('');
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) { setManageError(t("staffPortal.sessionExpiredError")); setManageLoading(false); return; }

      const payload: Record<string, any> = { staffId: manageStaff.id };
      if (manageEmail.trim() && manageEmail.trim() !== manageStaff.email) payload.newEmail = manageEmail.trim();
      if (managePassword.trim()) payload.newPassword = managePassword.trim();

      if (!payload.newEmail && !payload.newPassword) {
        setManageError(t("staffPortal.nothingChangedError"));
        setManageLoading(false);
        return;
      }

      const res = await fetch('/api/staff/update-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { setManageError(json?.error || t("staffPortal.updateError")); setManageLoading(false); return; }

      setManageSuccessMsg(t("staffPortal.updateSuccess"));
      setManagePassword('');
      if (userId) await fetchResurse(userId);
    } catch (e: any) {
      setManageError(e?.message || t("staffPortal.connectionError"));
    } finally {
      setManageLoading(false);
    }
  };

  // ✅ Dezactivează (șterge) contul unui specialist care a plecat din echipă
  const handleDeactivateAccount = async () => {
    if (!manageStaff) return;
    setManageLoading(true);
    setManageError('');
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) { setManageError(t("staffPortal.sessionExpiredError")); setManageLoading(false); return; }

      const res = await fetch('/api/staff/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ staffId: manageStaff.id }),
      });
      const json = await res.json();
      if (!res.ok) { setManageError(json?.error || t("staffPortal.deactivateError")); setManageLoading(false); return; }

      await showToast({ message: t("staffPortal.deactivatedToast"), type: 'success' });
      setManageStaff(null);
      if (userId) await fetchResurse(userId);
    } catch (e: any) {
      setManageError(e?.message || t("staffPortal.connectionError"));
    } finally {
      setManageLoading(false);
    }
  };

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

        {technicalError && (
          <div className="mb-6 p-5 bg-amber-50 border-2 border-amber-200 rounded-[25px] flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-[12px] font-bold text-amber-800">{t("techErrorBannerMsg")}</p>
            <button
              onClick={() => userId && fetchResurse(userId)}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase italic hover:bg-amber-500 hover:text-black transition-all shrink-0"
            >
              {t("techErrorRetryBtn")}
            </button>
          </div>
        )}

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
              <div id="onboarding-service-duration" className="flex flex-col gap-1">
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
              <div id="onboarding-service-price" className="flex flex-col gap-1">
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
                id="onboarding-add-staff-btn"
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
                          p.auth_user_id ? (
                            <button
                              onClick={e => { e.stopPropagation(); openManageModal(p); }}
                              className="bg-emerald-900/40 text-emerald-400 px-3 py-2 flex items-center justify-center rounded-xl border border-emerald-800 hover:bg-emerald-500 hover:text-white transition-all text-[9px] font-black uppercase italic whitespace-nowrap"
                            >
                              {t("staffPortal.activeAccountBadge")}
                            </button>
                          ) : (
                            <button
                              onClick={e => { e.stopPropagation(); openInviteModal(p); }}
                              className="bg-slate-800 text-blue-400 px-3 py-2 flex items-center justify-center rounded-xl border border-slate-700 hover:bg-blue-500 hover:text-white transition-all text-[9px] font-black uppercase italic whitespace-nowrap"
                            >
                              {t("staffPortal.inviteBtn")}
                            </button>
                          )
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
                            <button
                              onClick={() => toggleDayClosed(dayRo)}
                              className="px-4 py-2 rounded-xl text-[9px] font-black uppercase italic bg-red-500 text-white hover:bg-green-500 transition-all"
                            >
                              {t("closedDayLabel")}
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleDayClosed(dayRo)}
                              className="px-4 py-2 rounded-xl text-[9px] font-black uppercase italic bg-green-500 text-white hover:bg-red-500 transition-all"
                            >
                              {t("openDayLabel")}
                            </button>
                          )}
                          {!isClosed && (
                            <button
                              onClick={() => addInterval(dayRo)}
                              className="px-3 py-2 rounded-xl text-[9px] font-black uppercase italic bg-slate-900 text-amber-500 hover:bg-amber-500 hover:text-slate-900 transition-all"
                            >
                              {t("addIntervalBtn")}
                            </button>
                          )}
                        </div>
                      </div>
                      {intervals.map((iv, idx) => (
                        <div key={idx} className="flex items-center gap-2 pl-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase">{t("fromLabel")}</span>
                          <SimpleTimePicker value={iv.start} onChange={(v) => updateInterval(dayRo, idx, "start", v)} />
                          <span className="text-[9px] font-black text-slate-400 uppercase">{t("toLabel")}</span>
                          <SimpleTimePicker value={iv.end} onChange={(v) => updateInterval(dayRo, idx, "end", v)} />
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

      {/* MODAL GESTIONARE CONT EXISTENT (corectare email / resetare parolă / dezactivare) */}
      {manageStaff && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div ref={manageModalRef} className="bg-white w-full max-w-md rounded-[40px] p-8 md:p-10 shadow-2xl border-t-[10px] border-emerald-500 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest italic mb-1 block">{t("staffPortal.portalLabel")}</span>
                <h3 className="text-xl font-black uppercase italic text-slate-900 tracking-tighter">
                  {t("staffPortal.manageTitle", { name: manageStaff.name })}
                </h3>
              </div>
              <button onClick={() => { setManageStaff(null); setConfirmingDeactivate(false); }} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl font-black text-slate-400 hover:bg-red-500 hover:text-white transition-all">✕</button>
            </div>

            {!confirmingDeactivate ? (
              <>
                <div className="space-y-4 mb-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 ml-3 uppercase">{t("staffPortal.correctEmailLabel")}</span>
                    <input
                      type="email"
                      className="bg-slate-50 p-4 rounded-2xl font-bold text-[13px] outline-none border-2 border-transparent focus:border-emerald-400 transition-all"
                      value={manageEmail}
                      onChange={(e) => setManageEmail(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 ml-3 uppercase">{t("staffPortal.newPasswordOptionalLabel")}</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={t("staffPortal.newPasswordPlaceholder")}
                        className="flex-1 bg-slate-50 p-4 rounded-2xl font-black text-[13px] tracking-widest outline-none border-2 border-transparent focus:border-emerald-400 transition-all"
                        value={managePassword}
                        onChange={(e) => setManagePassword(e.target.value)}
                      />
                      <button
                        onClick={() => setManagePassword(generateTempPassword())}
                        title={t("staffPortal.generateNewPasswordTitle")}
                        className="px-4 bg-slate-100 rounded-2xl font-black text-slate-500 hover:bg-slate-200 transition-all"
                      >
                        🔄
                      </button>
                    </div>
                  </div>

                  {manageError && <p className="text-[11px] font-bold text-red-500 italic text-center">{manageError}</p>}
                  {manageSuccessMsg && <p className="text-[11px] font-bold text-emerald-600 italic text-center">{manageSuccessMsg}</p>}

                  <button
                    onClick={handleUpdateAccount}
                    disabled={manageLoading}
                    className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase italic text-[12px] hover:bg-slate-900 transition-all shadow-lg disabled:opacity-50"
                  >
                    {manageLoading ? t("staffPortal.savingBtn") : t("staffPortal.saveChangesBtn")}
                  </button>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 italic mb-3">{t("staffPortal.deactivateIntro")}</p>
                  <button
                    onClick={() => setConfirmingDeactivate(true)}
                    className="w-full py-4 bg-red-50 text-red-500 rounded-2xl font-black uppercase italic text-[11px] hover:bg-red-500 hover:text-white transition-all"
                  >
                    {t("staffPortal.deactivateBtn")}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">⚠️</div>
                <p className="font-black uppercase italic text-slate-900 mb-2">{t("staffPortal.confirmDeactivateTitle")}</p>
                <p className="text-[11px] font-bold text-slate-400 italic mb-6 leading-relaxed">
                  {t("staffPortal.confirmDeactivateText", { name: manageStaff.name })}
                </p>

                {manageError && <p className="text-[11px] font-bold text-red-500 italic mb-4">{manageError}</p>}

                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmingDeactivate(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[11px] uppercase italic hover:bg-slate-200 transition-all"
                  >
                    {t("staffPortal.cancelBtn")}
                  </button>
                  <button
                    onClick={handleDeactivateAccount}
                    disabled={manageLoading}
                    className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-[11px] uppercase italic hover:bg-red-600 transition-all disabled:opacity-50"
                  >
                    {manageLoading ? "..." : t("staffPortal.yesDeactivateBtn")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL INVITARE CONT SPECIALIST */}
      {inviteStaff && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div ref={inviteModalRef} className="bg-white w-full max-w-md rounded-[40px] p-8 md:p-10 shadow-2xl border-t-[10px] border-blue-500 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest italic mb-1 block">{t("staffPortal.portalLabel")}</span>
                <h3 className="text-xl font-black uppercase italic text-slate-900 tracking-tighter">
                  {t("staffPortal.inviteTitle", { name: inviteStaff.name })}
                </h3>
              </div>
              <button onClick={() => setInviteStaff(null)} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl font-black text-slate-400 hover:bg-red-500 hover:text-white transition-all">✕</button>
            </div>

            {inviteDone ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">✓</div>
                <p className="font-black uppercase italic text-slate-900 mb-2">{t("staffPortal.successTitle")}</p>
                <p className="text-[11px] font-bold text-slate-400 italic mb-6">{t("staffPortal.successSubtitle")}</p>

                <div className="bg-slate-50 rounded-2xl p-5 text-left space-y-2 mb-6 border-2 border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase">{t("staffPortal.linkLabel")}</p>
                  <p className="text-[11px] font-bold text-slate-700 break-all">{typeof window !== 'undefined' ? window.location.origin : ''}/specialist/login</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase mt-3">{t("staffPortal.emailFieldLabel")}</p>
                  <p className="text-[11px] font-bold text-slate-700">{inviteEmail}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase mt-3">{t("staffPortal.tempPasswordLabel")}</p>
                  <p className="text-[13px] font-black text-blue-600 tracking-widest">{invitePassword}</p>
                </div>

                {invitePhone && (
                  <button onClick={sendInviteOnWhatsApp}
                    className="w-full py-4 bg-[#25D366] text-white rounded-xl font-black text-[11px] uppercase italic hover:brightness-95 transition-all mb-3 flex items-center justify-center gap-2">
                    {t("staffPortal.sendWhatsappBtn")}
                  </button>
                )}
                <button onClick={sendInviteOnEmail}
                  className="w-full py-4 bg-amber-500 text-slate-900 rounded-xl font-black text-[11px] uppercase italic hover:bg-amber-600 transition-all mb-3">
                  {t("staffPortal.sendEmailBtn")}
                </button>
                <button onClick={copyInviteCredentials}
                  className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[11px] uppercase italic hover:bg-blue-500 transition-all mb-3">
                  {t("staffPortal.copyCredentialsBtn")}
                </button>
                <button onClick={() => setInviteStaff(null)}
                  className="w-full py-3 text-slate-400 font-black text-[10px] uppercase italic hover:text-slate-600">
                  {t("staffPortal.closeBtn")}
                </button>
              </div>
            ) : (
              <>
                <p className="text-[11px] font-bold text-slate-500 italic mb-6 leading-relaxed">
                  {t("staffPortal.inviteIntro")}
                </p>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 ml-3 uppercase">{t("staffPortal.emailLabel")}</span>
                    <input
                      type="email"
                      className="bg-slate-50 p-4 rounded-2xl font-bold text-[13px] outline-none border-2 border-transparent focus:border-blue-400 transition-all"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@exemplu.ro"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 ml-3 uppercase">{t("staffPortal.phoneLabel")}</span>
                    <input
                      type="tel"
                      className="bg-slate-50 p-4 rounded-2xl font-bold text-[13px] outline-none border-2 border-transparent focus:border-blue-400 transition-all"
                      value={invitePhone}
                      onChange={(e) => setInvitePhone(e.target.value.replace(/[^0-9+]/g, ""))}
                      placeholder="07XX XXX XXX"
                    />
                    <span className="text-[8px] font-bold text-slate-400 ml-3 italic">{t("staffPortal.phoneHint")}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 ml-3 uppercase">{t("staffPortal.passwordLabel")}</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 bg-slate-50 p-4 rounded-2xl font-black text-[13px] tracking-widest outline-none border-2 border-transparent focus:border-blue-400 transition-all"
                        value={invitePassword}
                        onChange={(e) => setInvitePassword(e.target.value)}
                      />
                      <button
                        onClick={() => setInvitePassword(generateTempPassword())}
                        title={t("staffPortal.regeneratePasswordTitle")}
                        className="px-4 bg-slate-100 rounded-2xl font-black text-slate-500 hover:bg-slate-200 transition-all"
                      >
                        🔄
                      </button>
                    </div>
                  </div>

                  {inviteError && (
                    <p className="text-[11px] font-bold text-red-500 italic text-center">{inviteError}</p>
                  )}

                  <button
                    onClick={handleCreateAccount}
                    disabled={inviteLoading || !inviteEmail.trim() || !invitePassword.trim()}
                    className="w-full py-5 bg-blue-500 text-white rounded-2xl font-black uppercase italic text-[12px] hover:bg-slate-900 transition-all shadow-lg disabled:opacity-50"
                  >
                    {inviteLoading ? t("staffPortal.creatingBtn") : t("staffPortal.createAccountBtn")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}