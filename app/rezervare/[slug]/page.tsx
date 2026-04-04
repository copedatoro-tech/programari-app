"use client";

import { useState, useEffect, Suspense, useCallback, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import Image from "next/image";

interface StaffRow {
  id: string;
  name: string;
  services: string[];
}

interface ServiceRow {
  id: string;
  nume_serviciu: string;
  price: number;
  duration: number;
}

const LIMITE_ABONAMENTE: Record<string, number> = {
  "Free": 30,
  "Start": 30,
  "Pro": 150,
  "Elite": 500,
  "Team": 999999999,
};

function RezervareContent() {
  const params = useParams();
  const rawSlug = params?.slug as string | undefined;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const [adminId, setAdminId] = useState<string>("");
  const [adminIdReady, setAdminIdReady] = useState(false);
  const [showLimitPopup, setShowLimitPopup] = useState(false);

  const supabase = useMemo(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
  []);

  const fetchAdminIdBySlug = useCallback(async (slug: string) => {
    try {
      const { data, error } = await supabase.from("profiles").select("id").eq("slug", slug).single();
      if (error) {
        console.error("Eroare la căutarea slug-ului:", error);
        return null;
      }
      return data?.id || null;
    } catch (e) {
      console.error("Eroare la căutarea slug-ului:", e);
      return null;
    }
  }, [supabase]);

  useEffect(() => {
    async function init() {
      if (!rawSlug) {
        setAdminIdReady(true);
        return;
      }
      if (uuidRegex.test(rawSlug)) {
        setAdminId(rawSlug);
        setAdminIdReady(true);
      } else {
        const id = await fetchAdminIdBySlug(rawSlug);
        if (id) setAdminId(id);
        setAdminIdReady(true);
      }
    }
    init();
  }, [rawSlug, fetchAdminIdBySlug]);

  const [trimis, setTrimis] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingConfig, setFetchingConfig] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerStep, setPickerStep] = useState<"hours" | "minutes">("hours");

  const [specialisti, setSpecialisti] = useState<StaffRow[]>([]);
  const [servicii, setServicii] = useState<ServiceRow[]>([]);

  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [numeFeedback, setNumeFeedback] = useState("");
  const [mesajFeedback, setMesajFeedback] = useState("");
  const [incarcareFeedback, setIncarcareFeedback] = useState(false);
  const [feedbackTrimisSucces, setFeedbackTrimisSucces] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    nume: "",
    telefon: "",
    email: "",
    data: today,
    ora: "00:00",
    serviciu_id: "",
    specialist_id: "",
    detalii: ""
  });

  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const selectedHour = useRef(0);
  const selectedMinute = useRef(0);
  const [displayHour, setDisplayHour] = useState(0);
  const [displayMinute, setDisplayMinute] = useState(0);

  const pickerRef = useRef<HTMLDivElement>(null);
  const limitPopupRef = useRef<HTMLDivElement>(null);
  const feedbackSuccessPopupRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const fetchAdminConfig = useCallback(async () => {
    if (!adminIdReady || !adminId) {
      setFetchingConfig(false);
      return;
    }

    setFetchingConfig(true);
    try {
      const staffRes = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', adminId)
        .order('created_at', { ascending: false });

      const servicesRes = await supabase
        .from('services')
        .select('*')
        .eq('user_id', adminId)
        .order('created_at', { ascending: false });

      const feedbacksRes = await supabase
        .from("feedbacks")
        .select("*")
        .eq("admin_id", adminId)
        .order("created_at", { ascending: false });

      console.log("Specialiști:", staffRes.data);
      console.log("Servicii:", servicesRes.data);

      if (staffRes.data) setSpecialisti(staffRes.data);
      if (servicesRes.data) setServicii(servicesRes.data);
      setFeedbacks(feedbacksRes.data || []);

    } catch (e: any) {
      console.error("Eroare la încărcarea datelor:", e?.message);
    } finally {
      setFetchingConfig(false);
    }
  }, [adminId, adminIdReady, supabase]);

  useEffect(() => {
    if (adminIdReady && adminId) {
      console.log("Admin ID:", adminId);
      fetchAdminConfig();
    } else if (adminIdReady && !adminId) {
      setFetchingConfig(false);
    }
  }, [adminIdReady, adminId, fetchAdminConfig]);

  const filteredServicii = useMemo(() => {
    if (!form.specialist_id) return servicii;
    const expert = specialisti.find(s => s.id === form.specialist_id);
    if (!expert?.services?.length) return servicii;
    return servicii.filter(s => expert.services.includes(s.id));
  }, [form.specialist_id, servicii, specialisti]);

  const filteredSpecialisti = useMemo(() => {
    if (!form.serviciu_id) return specialisti;
    return specialisti.filter(e => e.services?.includes(form.serviciu_id));
  }, [form.serviciu_id, specialisti]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
        setPickerStep("hours");
      }
      if (limitPopupRef.current && !limitPopupRef.current.contains(event.target as Node)) {
        setShowLimitPopup(false);
      }
      if (feedbackSuccessPopupRef.current && !feedbackSuccessPopupRef.current.contains(event.target as Node)) {
        setFeedbackTrimisSucces(false);
      }
    };
    if (showPicker || showLimitPopup || feedbackTrimisSucces) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPicker, showLimitPopup, feedbackTrimisSucces]);

  const updateOra = () => {
    const hh = selectedHour.current.toString().padStart(2, "0");
    const mm = selectedMinute.current.toString().padStart(2, "0");
    setForm(prev => ({ ...prev, ora: `${hh}:${mm}` }));
    setDisplayHour(selectedHour.current);
    setDisplayMinute(selectedMinute.current);
    setErrors(prev => ({ ...prev, ora: false }));
  };

  const trimiteRezervare = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, boolean> = {};
    if (!form.nume.trim()) newErrors.nume = true;
    if (!form.telefon.trim()) newErrors.telefon = true;
    if (!form.email.trim()) newErrors.email = true;
    if (!form.serviciu_id) newErrors.serviciu_id = true;
    if (form.ora === "00:00") newErrors.ora = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.keys(newErrors)[0];
      const element = document.getElementsByName(firstError)[0] || document.getElementById(firstError);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!adminId || !uuidRegex.test(adminId)) {
      alert("Eroare: ID salon invalid. Verifică link-ul de rezervare.");
      return;
    }

    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("subscription_plan, trial_started_at, plan_type")
        .eq("id", adminId)
        .single();

      const subscriptionPlan = profileData?.subscription_plan || "";
      const planType = profileData?.plan_type || "";

      const isTeamPlan =
        subscriptionPlan.toLowerCase().includes("team") ||
        planType.toLowerCase().includes("team") ||
        subscriptionPlan === "Team" ||
        planType === "CHRONOS TEAM";

      let isTrialActive = false;
      if (profileData?.trial_started_at) {
        const start = new Date(profileData.trial_started_at).getTime();
        const acum = new Date().getTime();
        const zeceZileInMs = 10 * 24 * 60 * 60 * 1000;
        if (acum - start < zeceZileInMs) {
          isTrialActive = true;
        }
      }

      if (!isTeamPlan && !isTrialActive) {
        const planKey = subscriptionPlan || planType;
        let limit = 30;

        if (planKey.toLowerCase().includes("pro")) limit = 150;
        else if (planKey.toLowerCase().includes("elite")) limit = 500;
        else if (planKey === "Pro") limit = 150;
        else if (planKey === "Elite") limit = 500;
        else limit = LIMITE_ABONAMENTE[planKey] || 30;

        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        const firstDay = firstDayOfMonth.toISOString().split('T')[0];

        const { count } = await supabase
          .from("appointments")
          .select("*", { count: 'exact', head: true })
          .eq("user_id", adminId)
          .gte("date", firstDay);

        if ((count || 0) >= limit) {
          setShowLimitPopup(true);
          setLoading(false);
          return;
        }
      }

      const selectedService = servicii.find(s => s.id === form.serviciu_id);
      const selectedExpert = specialisti.find(s => s.id === form.specialist_id);

      const payload = {
        user_id: adminId,
        title: form.nume.trim(),
        phone: form.telefon,
        email: form.email.trim(),
        date: form.data,
        time: form.ora,
        duration: selectedService?.duration || 15,
        details: `Serviciu: ${selectedService?.nume_serviciu || form.serviciu_id}${form.detalii ? ` | Notă: ${form.detalii}` : ""}`,
        expert: selectedExpert?.name || "Prima Disponibilitate",
        status: "pending",
        is_client_booking: true,
        notifications: {
          angajat_id: form.specialist_id,
          serviciu_id: form.serviciu_id
        }
      };

      const { error } = await supabase.from("appointments").insert([payload]);

      if (!error) {
        setTrimis(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        console.error("Eroare Supabase:", error);
        alert(`Eroare Supabase:\n${error.message}`);
      }
    } catch (err: any) {
      console.error("Eroare necunoscută:", err);
    } finally {
      setLoading(false);
    }
  };

  const trimiteFeedback = async () => {
    if (!adminId || rating === 0 || !numeFeedback.trim() || !mesajFeedback.trim()) {
      alert("Completează toate câmpurile pentru recenzie.");
      return;
    }
    setIncarcareFeedback(true);
    try {
      const { error } = await supabase.from("feedbacks").insert([{
        nume_client: numeFeedback.trim(),
        stele: rating,
        comentariu: mesajFeedback.trim(),
        aprobat: false,
        admin_id: adminId
      }]);
      if (!error) {
        setNumeFeedback("");
        setMesajFeedback("");
        setRating(0);
        setFeedbackTrimisSucces(true);
        const { data: fbs } = await supabase.from("feedbacks").select("*")
          .eq("admin_id", adminId)
          .order("created_at", { ascending: false });
        setFeedbacks(fbs || []);
      }
    } catch (err: any) {
      alert(`Eroare: ${err.message}`);
    } finally {
      setIncarcareFeedback(false);
    }
  };

  if (adminIdReady && !adminId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-center p-8">
        <div className="text-6xl mb-6">❌</div>
        <h2 className="text-white font-black uppercase italic text-2xl mb-4">Link Invalid</h2>
        <p className="text-slate-400 font-bold">Acest link de rezervare nu există sau a expirat.</p>
      </div>
    );
  }

  if (fetchingConfig) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-black uppercase italic text-amber-500 tracking-widest">Sincronizare în timp real...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#fcfcfc] flex flex-col items-center p-4 md:p-12 font-sans text-slate-900">
      <style jsx global>{`
        nav, .menu-button, header:not(.local-header) { display: none !important; }
        select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23f59e0b' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 1.5rem center; background-size: 1.2rem; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
        .error-border { border-color: #ef4444 !important; background-color: #fef2f2 !important; }
        .custom-tooltip { position: relative; }
        .custom-tooltip:hover::after {
          content: attr(data-tooltip);
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #0f172a;
          color: #f59e0b;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          white-space: nowrap;
          z-index: 1000;
          border: 1px solid #f59e0b;
          margin-bottom: 8px;
        }
        .popup-scroll { max-height: 70vh; overflow-y: auto; }
      `}</style>

      {trimis ? (
        <div className="w-full max-w-2xl bg-white rounded-[55px] p-20 text-center shadow-2xl border-t-8 border-amber-500">
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-3xl font-black uppercase italic mb-4">Rezervare Trimisă!</h2>
          <p className="text-slate-500 font-bold mb-8 text-lg">Rezervarea a fost trimisă în calendar.</p>
          <button
            title="Efectuează altă rezervare"
            data-tooltip="Efectuează altă rezervare"
            onClick={() => {
              setTrimis(false);
              setForm({ nume: "", telefon: "", email: "", data: today, ora: "00:00", serviciu_id: "", specialist_id: "", detalii: "" });
              setErrors({});
            }}
            className="custom-tooltip w-full max-w-xs bg-slate-900 text-white px-10 py-5 rounded-2xl font-black uppercase italic hover:bg-amber-500 hover:text-black transition-all border-b-4 border-slate-700 active:translate-y-1 active:border-b-0">
            REÎNCEARCĂ
          </button>
        </div>
      ) : (
        <div className="w-full max-w-2xl bg-white rounded-[55px] shadow-2xl border border-slate-100 overflow-hidden mb-20">
          <div className="bg-slate-900 p-12 text-white text-center local-header relative flex flex-col items-center">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500"></div>
            <div className="mb-6 relative w-24 h-24">
              <Image src="/logo-chronos.png" alt="Logo" fill className="object-contain" priority />
            </div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter">CHRONOS <span className="text-amber-500">BOOKING</span></h1>
          </div>

          <form onSubmit={trimiteRezervare} className="p-8 md:p-14 space-y-10">
            <div className="space-y-6">
              <div className="relative">
                <input type="text" name="nume" placeholder="NUME COMPLET" autoComplete="name"
                  className={`w-full bg-slate-50 border-2 ${errors.nume ? 'error-border animate-shake' : 'border-amber-500'} rounded-[30px] py-6 px-8 text-[18px] uppercase italic font-black outline-none focus:bg-white transition-all`}
                  value={form.nume} onChange={e => { setForm({ ...form, nume: e.target.value }); setErrors({ ...errors, nume: false }); }} />
                {errors.nume && <p className="text-red-500 text-[10px] font-black uppercase mt-2 ml-6">Te rugăm să introduci numele</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <input type="tel" name="telefon" placeholder="TELEFON" autoComplete="tel"
                    className={`w-full bg-slate-50 border-2 ${errors.telefon ? 'error-border animate-shake' : 'border-amber-500'} rounded-[30px] py-6 px-8 text-[18px] font-black outline-none focus:bg-white transition-all`}
                    value={form.telefon} onChange={e => { setForm({ ...form, telefon: e.target.value }); setErrors({ ...errors, telefon: false }); }} />
                  {errors.telefon && <p className="text-red-500 text-[10px] font-black uppercase mt-2 ml-6">Telefon necesar</p>}
                </div>
                <div>
                  <input type="email" name="email" placeholder="EMAIL" autoComplete="email"
                    className={`w-full bg-slate-50 border-2 ${errors.email ? 'error-border animate-shake' : 'border-amber-500'} rounded-[30px] py-6 px-8 text-[18px] font-black outline-none focus:bg-white transition-all`}
                    value={form.email} onChange={e => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: false }); }} />
                  {errors.email && <p className="text-red-500 text-[10px] font-black uppercase mt-2 ml-6">Email necesar</p>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 p-8 bg-slate-50 rounded-[45px] border-2 border-slate-100">
              <div className="space-y-2" id="serviciu_id">
                <label className="text-[12px] font-black uppercase italic text-slate-400 ml-4">Serviciu</label>
                <select
                  className={`w-full bg-white border-2 ${errors.serviciu_id ? 'error-border animate-shake' : 'border-amber-500'} rounded-[25px] py-6 px-8 text-[16px] font-black uppercase italic outline-none cursor-pointer popup-scroll`}
                  value={form.serviciu_id}
                  onChange={e => { setForm({ ...form, serviciu_id: e.target.value, specialist_id: "" }); setErrors({ ...errors, serviciu_id: false }); }}>
                  <option value="">ALEGE SERVICIUL</option>
                  {servicii.length > 0 ? (
                    servicii.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nume_serviciu?.toUpperCase()}{s.price ? ` — ${s.price} RON` : ""}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>Nu există servicii disponibile</option>
                  )}
                </select>
                {errors.serviciu_id && <p className="text-red-500 text-[10px] font-black uppercase mt-1 ml-4">Selectează un serviciu</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-black uppercase italic text-slate-400 ml-4">Expert</label>
                <select
                  className="w-full bg-white border-2 border-amber-500 rounded-[25px] py-6 px-8 text-[16px] font-black uppercase italic outline-none cursor-pointer popup-scroll"
                  value={form.specialist_id}
                  onChange={e => setForm({ ...form, specialist_id: e.target.value })}>
                  <option value="">PRIMA DISPONIBILITATE</option>
                  {specialisti.length > 0 ? (
                    specialisti.map(sp => (
                      <option key={sp.id} value={sp.id}>{sp.name.toUpperCase()}</option>
                    ))
                  ) : (
                    <option value="" disabled>Nu există experți disponibili</option>
                  )}
                </select>
              </div>

              <div className="space-y-2 mt-4">
                <label className="text-[12px] font-black uppercase italic text-slate-400 ml-4">MENȚIUNI SPECIALE</label>
                <textarea placeholder="Ai vreo preferință?"
                  className="w-full bg-white border-2 border-amber-500 rounded-[25px] py-6 px-8 text-[16px] font-bold outline-none focus:bg-slate-50 transition-all min-h-[120px] resize-none"
                  value={form.detalii} onChange={e => setForm({ ...form, detalii: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div
                data-tooltip="Schimbă Data"
                className="custom-tooltip relative group flex items-center bg-slate-900 rounded-[35px] h-[100px] cursor-pointer"
                onClick={() => dateInputRef.current?.showPicker()}>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <span className="text-white group-hover:text-amber-500 font-black text-[22px] uppercase italic transition-colors">
                    {new Date(form.data).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </span>
                </div>
                <input ref={dateInputRef} type="date" min={today}
                  className="w-full h-full opacity-0 relative z-30 cursor-pointer"
                  value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
              </div>
              <button
                type="button"
                id="ora"
                data-tooltip="Selectează Ora"
                onClick={() => setShowPicker(true)}
                className={`custom-tooltip w-full h-[100px] bg-slate-900 text-white rounded-[35px] font-black text-[22px] uppercase italic hover:text-amber-500 transition-all border-4 ${errors.ora ? 'border-red-500 animate-shake' : 'border-transparent'}`}>
                {form.ora === "00:00" ? "ALEGE ORA" : form.ora}
              </button>
            </div>
            {errors.ora && <p className="text-red-500 text-center text-[10px] font-black uppercase -mt-4">Te rugăm să alegi ora programării</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-10 rounded-[35px] font-black text-[14px] uppercase tracking-[0.4em] italic shadow-2xl transition-all border-b-8 active:translate-y-2 active:border-b-0 bg-slate-900 text-white border-slate-800 hover:bg-amber-500 hover:text-black">
              {loading ? "SE PROCESEAZĂ..." : "CONFIRMĂ REZERVAREA"}
            </button>
          </form>
        </div>
      )}

      {/* POPUP LIMITĂ REZERVĂRI */}
      {showLimitPopup && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div ref={limitPopupRef} className="bg-white w-full max-w-[400px] rounded-[40px] p-10 text-center shadow-2xl border-[4px] border-amber-500 relative popup-scroll">
            <button onClick={() => setShowLimitPopup(false)}
              className="absolute top-4 right-6 text-slate-300 hover:text-red-500 text-xl font-black transition-colors" title="Închide">✕</button>
            <div className="text-5xl mb-4">⚠️</div>
            <h3 className="text-xl font-black uppercase italic mb-3 text-slate-900">Limită Atinsă</h3>
            <p className="text-slate-500 font-bold text-sm leading-relaxed mb-6 italic">
              Ne pare rău, acest salon a atins limita de rezervări disponibile pentru luna curentă conform planului tarifar.
            </p>
            <button onClick={() => setShowLimitPopup(false)}
              className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase italic text-[12px] hover:bg-amber-500 hover:text-black transition-all">
              AM ÎNȚELES
            </button>
          </div>
        </div>
      )}

      {showPicker && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4"
          onClick={() => { setShowPicker(false); setPickerStep("hours"); }}>
          <div ref={pickerRef} className="bg-white w-full max-w-[480px] rounded-[50px] p-10 relative shadow-[0_0_50px_rgba(245,158,11,0.2)] border-[6px] border-slate-900 flex flex-col animate-in fade-in zoom-in duration-300 popup-scroll"
            onClick={e => e.stopPropagation()}>
            <button onClick={() => { setShowPicker(false); setPickerStep("hours"); }}
              className="absolute top-6 right-8 text-slate-300 hover:text-red-500 text-2xl font-black transition-colors" title="Închide">✕</button>

            <div className="flex justify-between items-center mb-10">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-amber-500 tracking-[0.4em] uppercase">
                  {pickerStep === "hours" ? "Pasul 1: Selectează Ora" : "Pasul 2: Selectează Minutul"}
                </p>
                <h2 className="font-black uppercase italic text-3xl text-slate-900 tracking-tighter">
                  {pickerStep === "hours" ? "Ora" : "Minute"}
                </h2>
              </div>
              <div className="bg-slate-900 px-6 py-4 rounded-[25px] flex items-center gap-3 border-b-4 border-amber-500 shadow-lg">
                <span className={`text-3xl font-black ${pickerStep === "hours" ? "text-amber-500 animate-pulse" : "text-white"}`}>
                  {displayHour.toString().padStart(2, "0")}
                </span>
                <span className="text-amber-500 font-black text-2xl">:</span>
                <span className={`text-3xl font-black ${pickerStep === "minutes" ? "text-amber-500 animate-pulse" : "text-white"}`}>
                  {displayMinute.toString().padStart(2, "0")}
                </span>
              </div>
            </div>

            <div className="flex-1 bg-slate-50/50 rounded-[40px] border-2 border-slate-100 p-8">
              {pickerStep === "hours" ? (
                <div className="grid grid-cols-4 gap-4 max-h-[380px] overflow-y-auto pr-2 scrollbar-hide">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <button key={i}
                      data-tooltip={`Ora ${i}`}
                      onClick={() => { selectedHour.current = i; setDisplayHour(i); setPickerStep("minutes"); }}
                      className={`custom-tooltip relative aspect-square rounded-[22px] font-black text-lg flex items-center justify-center transition-all duration-200 ${
                        displayHour === i
                          ? "bg-amber-500 text-slate-900 shadow-[0_10px_20px_rgba(245,158,11,0.4)] scale-110 z-10"
                          : "text-slate-900 bg-white border-2 border-transparent hover:border-amber-500 hover:shadow-md active:scale-95"
                      }`}>
                      {i.toString().padStart(2, "0")}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {[0, 15, 30, 45].map(m => (
                    <button key={m}
                      data-tooltip={`Minutul ${m}`}
                      onClick={() => { selectedMinute.current = m; setShowPicker(false); setPickerStep("hours"); updateOra(); }}
                      className={`custom-tooltip w-full py-8 rounded-[30px] font-black text-4xl transition-all duration-300 border-4 flex items-center justify-center gap-4 ${
                        displayMinute === m
                          ? "bg-slate-900 text-amber-500 border-amber-500 shadow-2xl scale-[1.02]"
                          : "bg-white text-slate-300 border-slate-100 hover:border-amber-200 hover:text-slate-900 hover:translate-x-2"
                      }`}>
                      <span className="text-sm opacity-40 uppercase tracking-widest font-black">Minutul</span>
                      {m.toString().padStart(2, "0")}
                    </button>
                  ))}
                  <button onClick={() => setPickerStep("hours")}
                    className="mt-4 py-4 text-slate-400 font-black uppercase italic text-xs hover:text-amber-500 transition-colors flex items-center justify-center gap-2">
                    ← Înapoi la ore
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* POPUP FEEDBACK TRIMIS */}
      {feedbackTrimisSucces && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300"
          onClick={() => setFeedbackTrimisSucces(false)}
        >
          <div
            ref={feedbackSuccessPopupRef}
            className="bg-white w-full max-w-[380px] rounded-[40px] p-10 text-center shadow-2xl border-[4px] border-amber-500 relative popup-scroll"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setFeedbackTrimisSucces(false)}
              className="absolute top-4 right-6 text-slate-300 hover:text-red-500 text-xl font-black transition-colors"
              title="Închide"
            >✕</button>
            <div className="text-5xl mb-4">⭐</div>
            <h3 className="text-amber-500 font-black uppercase italic text-2xl mb-2">MULȚUMIM!</h3>
            <p className="text-slate-700 font-bold italic">Opinia ta a fost trimisă spre aprobare.</p>
            <button
              onClick={() => setFeedbackTrimisSucces(false)}
              className="mt-6 text-[10px] text-slate-400 uppercase font-black tracking-widest underline hover:text-amber-500 transition-colors"
            >
              Trimite alt review
            </button>
          </div>
        </div>
      )}

      {/* RECENZII */}
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 mb-10">
        <div className="bg-white p-12 rounded-[55px] shadow-xl border border-slate-100 relative overflow-hidden h-fit">
          <h3 className="text-2xl font-black uppercase italic mb-8 border-l-8 border-amber-500 pl-4">LASĂ O RECENZIE</h3>
          <div className="flex justify-center gap-2 mb-8">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} onClick={() => setRating(s)}
                data-tooltip={`${s} Stele`}
                className={`custom-tooltip text-4xl transition-transform hover:scale-125 ${s <= (hover || rating) ? "" : "grayscale opacity-20"}`}>⭐</button>
            ))}
          </div>
          <input type="text" placeholder="NUMELE TĂU" autoComplete="name"
            className="w-full p-6 bg-slate-50 rounded-2xl border-2 border-amber-500 mb-4 font-black uppercase outline-none focus:bg-white transition-all"
            value={numeFeedback} onChange={e => setNumeFeedback(e.target.value)} />
          <textarea placeholder="COMENTARIU SAU SUGESTIE"
            className="w-full p-6 bg-slate-50 rounded-2xl border-2 border-amber-500 mb-6 font-bold outline-none h-32 resize-none focus:bg-white transition-all"
            value={mesajFeedback} onChange={e => setMesajFeedback(e.target.value)} />
          <button
            onClick={trimiteFeedback}
            data-tooltip="Publică Recenzia"
            className="custom-tooltip w-full py-6 bg-slate-900 text-white rounded-2xl font-black uppercase hover:bg-amber-500 hover:text-black transition-all shadow-lg border-b-4 border-slate-700 active:translate-y-1 active:border-b-0">
            {incarcareFeedback ? "SE TRIMITE..." : "TRIMITE REVIEW"}
          </button>
        </div>

        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 scrollbar-hide flex flex-col">
          <h3 className="text-2xl font-black uppercase italic mb-8 border-l-8 border-amber-500 pl-4">RECENZII RECENTE</h3>
          {feedbacks.length > 0 ? feedbacks.map((f, idx) => (
            <div key={f.id || idx} className="bg-white p-8 rounded-[40px] shadow-md border border-slate-50 hover:border-amber-200 transition-all flex flex-col gap-4">
              <div>
                <div className="flex gap-1 mb-2">{Array.from({ length: Number(f.stele) || 5 }).map((_, i) => <span key={i} className="text-sm">⭐</span>)}</div>
                <p className="font-black text-[12px] text-amber-500 uppercase mb-2">{f.nume_client}</p>
                <p className="font-bold italic text-slate-700">"{f.comentariu}"</p>
              </div>
              {f.raspuns_admin && (
                <div className="ml-6 p-6 bg-slate-900 rounded-3xl border-l-4 border-amber-500">
                  <p className="text-[10px] font-black text-amber-500 uppercase mb-1 tracking-widest">Răspuns Proprietar:</p>
                  <p className="text-white text-sm font-bold italic">"{f.raspuns_admin}"</p>
                </div>
              )}
            </div>
          )) : (
            <div className="bg-slate-50 p-12 rounded-[40px] text-center border-2 border-dashed border-slate-200">
              <div className="text-4xl mb-4 opacity-20">💬</div>
              <p className="text-slate-400 italic font-bold">Fii primul care lasă o recenzie!</p>
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-2xl text-center py-10 opacity-30">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">Powered by Chronos Resource Management</p>
      </div>
    </main>
  );
}

export default function RezervarePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-black uppercase italic text-amber-500 tracking-widest">Se încarcă...</p>
      </div>
    }>
      <RezervareContent />
    </Suspense>
  );
}