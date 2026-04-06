"use client";

import { useState, useEffect, Suspense, useCallback, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import Image from "next/image";
import { ChronosTimePicker, ChronosDatePicker } from "@/components/ChronosDateTimePickers";

interface StaffRow { id: string; name: string; services: string[] }
interface ServiceRow { id: string; nume_serviciu: string; price: number; duration: number }
type ManualBlocksMap = Record<string, string[]>;

const DAY_NAMES_LONG = ["Duminică","Luni","Marți","Miercuri","Joi","Vineri","Sâmbătă"];

type LimitReason = "plan_limit" | "hour_blocked" | "day_closed" | "outside_hours" | "service_overlap";

function addMinutesToTime(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const totalMin = h * 60 + m + minutes;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${newH.toString().padStart(2, "0")}:${newM.toString().padStart(2, "0")}`;
}

function ChronosPopup({
  icon, title, message, onClose,
}: {
  icon: string; title: string; message: string; onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[110] flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-[400px] rounded-[40px] p-10 text-center shadow-2xl border-[4px] border-amber-500 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-6 text-slate-300 hover:text-red-500 text-xl font-black transition-colors"
        >
          ✕
        </button>
        <div className="text-5xl mb-4">{icon}</div>
        <h3 className="text-xl font-black uppercase italic mb-3 text-slate-900">{title}</h3>
        <p className="text-slate-500 font-bold text-sm leading-relaxed mb-6 italic">{message}</p>
        <button
          onClick={onClose}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase italic text-[12px] hover:bg-amber-500 hover:text-black transition-all active:scale-95"
        >
          AM ÎNȚELES
        </button>
      </div>
    </div>
  );
}

function SuccessPopup({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[110] flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-[380px] rounded-[40px] p-10 text-center shadow-2xl border-[4px] border-amber-500 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-6 text-slate-300 hover:text-red-500 text-xl font-black transition-colors"
        >
          ✕
        </button>
        <div className="text-5xl mb-4">⭐</div>
        <h3 className="text-amber-500 font-black uppercase italic text-2xl mb-2">MULȚUMIM!</h3>
        <p className="text-slate-700 font-bold italic">Opinia ta a fost trimisă spre aprobare.</p>
      </div>
    </div>
  );
}

function RezervareContent() {
  const params = useParams();
  const rawSlug = params?.slug as string | undefined;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const [adminId, setAdminId] = useState("");
  const [adminIdReady, setAdminIdReady] = useState(false);

  const [popup, setPopup] = useState<{ icon: string; title: string; message: string } | null>(null);
  const [feedbackTrimisSucces, setFeedbackTrimisSucces] = useState(false);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const fetchAdminIdBySlug = useCallback(
    async (slug: string) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("slug", slug)
          .single();
        if (error) return null;
        return data?.id || null;
      } catch { return null; }
    },
    [supabase]
  );

  useEffect(() => {
    async function init() {
      if (!rawSlug) { setAdminIdReady(true); return; }
      if (uuidRegex.test(rawSlug)) {
        setAdminId(rawSlug); setAdminIdReady(true);
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

  // Chronos pickers state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [specialisti, setSpecialisti] = useState<StaffRow[]>([]);
  const [servicii, setServicii] = useState<ServiceRow[]>([]);

  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [numeFeedback, setNumeFeedback] = useState("");
  const [mesajFeedback, setMesajFeedback] = useState("");
  const [incarcareFeedback, setIncarcareFeedback] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    nume: "",
    telefon: "",
    email: "",
    data: today,
    ora: "00:00",
    serviciu_id: "",
    specialist_id: "",
    detalii: "",
  });
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const serviceDuration = useMemo(() => {
    const svc = servicii.find((s) => s.id === form.serviciu_id);
    return svc?.duration || 0;
  }, [form.serviciu_id, servicii]);

  const endTimeDisplay = useMemo(() => {
    if (!serviceDuration || !form.ora || form.ora === "00:00") return null;
    return addMinutesToTime(form.ora, serviceDuration);
  }, [serviceDuration, form.ora]);

  const fetchAdminConfig = useCallback(async () => {
    if (!adminIdReady || !adminId) { setFetchingConfig(false); return; }
    setFetchingConfig(true);
    try {
      const [staffRes, servicesRes, feedbacksRes] = await Promise.all([
        supabase.from("staff").select("*").eq("user_id", adminId).order("created_at", { ascending: false }),
        supabase.from("services").select("*").eq("user_id", adminId).order("created_at", { ascending: false }),
        supabase.from("feedbacks").select("*").eq("admin_id", adminId).order("created_at", { ascending: false }),
      ]);
      if (staffRes.data) setSpecialisti(staffRes.data);
      if (servicesRes.data) setServicii(servicesRes.data);
      setFeedbacks(feedbacksRes.data || []);
    } catch (e: any) {
      console.error("Eroare la încărcarea datelor:", e?.message);
    } finally { setFetchingConfig(false); }
  }, [adminId, adminIdReady, supabase]);

  useEffect(() => {
    if (adminIdReady && adminId) fetchAdminConfig();
    else if (adminIdReady && !adminId) setFetchingConfig(false);
  }, [adminIdReady, adminId, fetchAdminConfig]);

  const filteredServicii = useMemo(() => {
    if (!form.specialist_id) return servicii;
    const expert = specialisti.find((s) => s.id === form.specialist_id);
    if (!expert?.services?.length) return servicii;
    return servicii.filter((s) => expert.services.includes(s.id));
  }, [form.specialist_id, servicii, specialisti]);

  const filteredSpecialisti = useMemo(() => {
    if (!form.serviciu_id) return specialisti;
    return specialisti.filter((e) => e.services?.includes(form.serviciu_id));
  }, [form.serviciu_id, specialisti]);

  const getLimitPopupContent = (
    reason: LimitReason
  ): { icon: string; title: string; message: string } => {
    switch (reason) {
      case "hour_blocked":
        return { icon: "🕐", title: "Oră Indisponibilă", message: "Această oră nu este disponibilă pentru programări. Te rugăm să alegi un alt interval orar." };
      case "day_closed":
        return { icon: "🗓️", title: "Zi Închisă", message: "Această zi nu este disponibilă pentru programări. Te rugăm să alegi o altă dată." };
      case "outside_hours":
        return { icon: "⏰", title: "În Afara Programului", message: "Ora aleasă este în afara programului de lucru. Te rugăm să alegi o oră în intervalul disponibil." };
      case "service_overlap":
        return { icon: "⏱️", title: "Durată Depășită", message: "Serviciul ales se termină în afara programului de lucru sau se suprapune cu o oră blocată. Alege un interval mai devreme." };
      case "plan_limit":
      default:
        return { icon: "⚠️", title: "Limită Atinsă", message: "Ne pare rău, acest salon a atins limita de rezervări disponibile pentru luna curentă conform planului tarifar." };
    }
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
      return;
    }

    if (!adminId || !uuidRegex.test(adminId)) {
      setPopup({ icon: "❌", title: "Link Invalid", message: "Eroare: ID salon invalid. Verifică link-ul de rezervare." });
      return;
    }

    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("plan_type, trial_started_at, manual_blocks, working_hours")
        .eq("id", adminId)
        .single();

      const planType = (profileData?.plan_type || "CHRONOS FREE").toUpperCase();
      const isTeamPlan = planType.includes("TEAM");

      let isTrialActive = false;
      if (profileData?.trial_started_at) {
        const start = new Date(profileData.trial_started_at).getTime();
        if (new Date().getTime() - start < 10 * 24 * 60 * 60 * 1000)
          isTrialActive = true;
      }

      if (profileData?.working_hours) {
        const workingHours: any[] = profileData.working_hours;
        const dateObj = new Date(form.data + "T00:00:00");
        const dayName = DAY_NAMES_LONG[dateObj.getDay()];
        const schedule = workingHours.find((h: any) => h.day === dayName);
        if (schedule?.closed) { setPopup(getLimitPopupContent("day_closed")); setLoading(false); return; }
        if (schedule) {
          if (form.ora < schedule.start || form.ora > schedule.end) {
            setPopup(getLimitPopupContent("outside_hours")); setLoading(false); return;
          }
          if (serviceDuration > 0) {
            const endTime = addMinutesToTime(form.ora, serviceDuration);
            if (endTime > schedule.end) {
              setPopup(getLimitPopupContent("service_overlap")); setLoading(false); return;
            }
          }
        }
      }

      if (profileData?.manual_blocks) {
        const blocks = profileData.manual_blocks as ManualBlocksMap;
        const daySlots: string[] = blocks[form.data] || [];
        if (daySlots.length > 0) {
          if (daySlots.length >= 94) { setPopup(getLimitPopupContent("day_closed")); setLoading(false); return; }
          const [h, m] = form.ora.split(":").map(Number);
          const checkMinutes = serviceDuration > 0 ? serviceDuration : 60;
          const subSlots: string[] = [];
          for (let i = 0; i < checkMinutes; i += 15) {
            const totalMin = m + i;
            const sH = h + Math.floor(totalMin / 60);
            const sM = totalMin % 60;
            if (sH < 24)
              subSlots.push(`${sH.toString().padStart(2, "0")}:${sM.toString().padStart(2, "0")}`);
          }
          if (subSlots.some((slot) => daySlots.includes(slot))) {
            setPopup(getLimitPopupContent("hour_blocked")); setLoading(false); return;
          }
        }
      }

      if (!isTeamPlan && !isTrialActive) {
        let limit = 30;
        if (planType.includes("ELITE")) limit = 500;
        else if (planType.includes("PRO")) limit = 150;
        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        const firstDay = firstDayOfMonth.toISOString().split("T")[0];
        const { count } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("user_id", adminId)
          .gte("date", firstDay);
        if ((count || 0) >= limit) {
          setPopup(getLimitPopupContent("plan_limit")); setLoading(false); return;
        }
      }

      const selectedService = servicii.find((s) => s.id === form.serviciu_id);
      const selectedExpert = specialisti.find((s) => s.id === form.specialist_id);

      const payload = {
        user_id: adminId,
        title: form.nume.trim(),
        prenume: form.nume.trim(),
        nume: form.nume.trim(),
        phone: form.telefon,
        email: form.email.trim(),
        date: form.data,
        time: form.ora,
        duration: selectedService?.duration || 0,
        details: `Serviciu: ${selectedService?.nume_serviciu || form.serviciu_id}${form.detalii ? ` | Notă: ${form.detalii}` : ""}`,
        specialist: selectedExpert?.name || "Prima Disponibilitate",
        angajat_id: form.specialist_id || null,
        serviciu_id: form.serviciu_id || null,
        status: "pending",
        is_client_booking: true,
        notifications: { angajat_id: form.specialist_id, serviciu_id: form.serviciu_id },
      };

      const { error } = await supabase.from("appointments").insert([payload]);
      if (!error) {
        setTrimis(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setPopup({ icon: "❌", title: "Eroare", message: `Eroare la trimitere: ${error.message}` });
      }
    } catch (err: any) {
      console.error("Eroare necunoscută:", err);
      setPopup({ icon: "❌", title: "Eroare", message: "A apărut o eroare necunoscută. Încearcă din nou." });
    } finally { setLoading(false); }
  };

  const trimiteFeedback = async () => {
    if (!adminId || rating === 0 || !numeFeedback.trim() || !mesajFeedback.trim()) {
      setPopup({ icon: "⚠️", title: "Câmpuri incomplete", message: "Completează toate câmpurile: numele, stele și comentariul." });
      return;
    }
    setIncarcareFeedback(true);
    try {
      const { error } = await supabase.from("feedbacks").insert([{
        nume_client: numeFeedback.trim(),
        stele: rating,
        comentariu: mesajFeedback.trim(),
        aprobat: false,
        admin_id: adminId,
      }]);
      if (!error) {
        setNumeFeedback(""); setMesajFeedback(""); setRating(0);
        setFeedbackTrimisSucces(true);
        const { data: fbs } = await supabase
          .from("feedbacks")
          .select("*")
          .eq("admin_id", adminId)
          .order("created_at", { ascending: false });
        setFeedbacks(fbs || []);
      }
    } catch (err: any) {
      setPopup({ icon: "❌", title: "Eroare", message: err.message });
    } finally { setIncarcareFeedback(false); }
  };

  if (adminIdReady && !adminId) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-black uppercase italic">Link Invalid</h2>
          <p className="text-slate-500">Acest link de rezervare nu există sau a expirat.</p>
        </div>
      </main>
    );
  }

  if (fetchingConfig) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="animate-pulse font-black uppercase italic text-slate-400">
          Sincronizare în timp real...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center p-4 md:p-10 font-sans text-slate-900">

      {/* Chronos Date Picker */}
      {showDatePicker && (
        <ChronosDatePicker
          value={form.data}
          onChange={(val) => { setForm({ ...form, data: val }); }}
          onClose={() => setShowDatePicker(false)}
          minDate={today}
        />
      )}

      {/* Chronos Time Picker */}
      {showTimePicker && (
        <ChronosTimePicker
          value={form.ora}
          onChange={(val) => { setForm({ ...form, ora: val }); setErrors({ ...errors, ora: false }); }}
          onClose={() => setShowTimePicker(false)}
        />
      )}

      {popup && <ChronosPopup {...popup} onClose={() => setPopup(null)} />}
      {feedbackTrimisSucces && <SuccessPopup onClose={() => setFeedbackTrimisSucces(false)} />}

      {trimis ? (
        <div className="w-full max-w-2xl bg-white rounded-[55px] p-20 text-center shadow-2xl border-t-8 border-amber-500">
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-3xl font-black uppercase italic mb-4">Rezervare Trimisă!</h2>
          <p className="text-slate-500 font-bold mb-8 text-lg">
            Rezervarea a fost trimisă în calendar.
          </p>
          <button
            onClick={() => {
              setTrimis(false);
              setForm({ nume: "", telefon: "", email: "", data: today, ora: "00:00", serviciu_id: "", specialist_id: "", detalii: "" });
              setErrors({});
            }}
            className="w-full max-w-xs bg-slate-900 text-white px-10 py-5 rounded-2xl font-black uppercase italic hover:bg-amber-500 hover:text-black transition-all border-b-4 border-slate-700 active:translate-y-1 active:border-b-0"
          >
            REÎNCEARCĂ
          </button>
        </div>
      ) : (
        <div className="w-full max-w-2xl bg-white rounded-[55px] shadow-2xl border border-slate-100 overflow-hidden mb-20">
          <div className="bg-slate-900 p-12 text-white text-center relative flex flex-col items-center">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500"></div>
            <div className="mb-6 relative w-24 h-24">
              <Image src="/logo-chronos.png" alt="Logo" fill className="object-contain" priority />
            </div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter">
              CHRONOS <span className="text-amber-500">BOOKING</span>
            </h1>
          </div>

          <form onSubmit={trimiteRezervare} className="p-8 md:p-14 space-y-10">
            <div className="space-y-6">
              <div className="relative">
                <input
                  type="text"
                  name="nume"
                  placeholder="NUME COMPLET"
                  autoComplete="name"
                  className={`w-full bg-slate-50 border-2 ${errors.nume ? "border-red-500" : "border-amber-500"} rounded-[30px] py-6 px-8 text-[18px] uppercase italic font-black outline-none focus:bg-white transition-all`}
                  value={form.nume}
                  onChange={(e) => { setForm({ ...form, nume: e.target.value }); setErrors({ ...errors, nume: false }); }}
                />
                {errors.nume && (
                  <p className="text-red-500 text-[10px] font-black uppercase mt-2 ml-6">
                    Te rugăm să introduci numele
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <input
                    type="tel"
                    name="telefon"
                    placeholder="TELEFON"
                    autoComplete="tel"
                    className={`w-full bg-slate-50 border-2 ${errors.telefon ? "border-red-500" : "border-amber-500"} rounded-[30px] py-6 px-8 text-[18px] font-black outline-none focus:bg-white transition-all`}
                    value={form.telefon}
                    onChange={(e) => { setForm({ ...form, telefon: e.target.value }); setErrors({ ...errors, telefon: false }); }}
                  />
                  {errors.telefon && (
                    <p className="text-red-500 text-[10px] font-black uppercase mt-2 ml-6">
                      Telefon necesar
                    </p>
                  )}
                </div>
                <div>
                  <input
                    type="email"
                    name="email"
                    placeholder="EMAIL"
                    autoComplete="email"
                    className={`w-full bg-slate-50 border-2 ${errors.email ? "border-red-500" : "border-amber-500"} rounded-[30px] py-6 px-8 text-[18px] font-black outline-none focus:bg-white transition-all`}
                    value={form.email}
                    onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: false }); }}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-[10px] font-black uppercase mt-2 ml-6">
                      Email necesar
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 p-8 bg-slate-50 rounded-[45px] border-2 border-slate-100">
              <div className="space-y-2" id="serviciu_id">
                <label className="text-[12px] font-black uppercase italic text-slate-400 ml-4">
                  Serviciu
                </label>
                <select
                  className={`w-full bg-white border-2 ${errors.serviciu_id ? "border-red-500" : "border-amber-500"} rounded-[25px] py-6 px-8 text-[16px] font-black uppercase italic outline-none cursor-pointer`}
                  value={form.serviciu_id}
                  onChange={(e) => { setForm({ ...form, serviciu_id: e.target.value }); setErrors({ ...errors, serviciu_id: false }); }}
                >
                  <option value="">ALEGE SERVICIUL</option>
                  {filteredServicii.map((s) => {
                    const dur =
                      s.duration >= 60
                        ? `${Math.floor(s.duration / 60)}h${s.duration % 60 > 0 ? s.duration % 60 + "m" : ""}`
                        : `${s.duration}m`;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.nume_serviciu?.toUpperCase()}{s.price ? ` — ${s.price} RON` : ""} ({dur})
                      </option>
                    );
                  })}
                </select>
                {errors.serviciu_id && (
                  <p className="text-red-500 text-[10px] font-black uppercase mt-1 ml-4">
                    Selectează un serviciu
                  </p>
                )}
                {serviceDuration > 0 && form.ora !== "00:00" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-3 mt-2">
                    <span className="text-amber-600 text-xl">⏱️</span>
                    <div>
                      <p className="text-[9px] font-black text-amber-700 uppercase italic">
                        Durată serviciu
                      </p>
                      <p className="text-xs font-black text-amber-900">
                        {serviceDuration >= 60
                          ? `${Math.floor(serviceDuration / 60)}h ${serviceDuration % 60 > 0 ? serviceDuration % 60 + "min" : ""}`
                          : `${serviceDuration} min`}
                        {endTimeDisplay && ` → se termină la ${endTimeDisplay}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-black uppercase italic text-slate-400 ml-4">
                  Expert
                </label>
                <select
                  className="w-full bg-white border-2 border-amber-500 rounded-[25px] py-6 px-8 text-[16px] font-black uppercase italic outline-none cursor-pointer"
                  value={form.specialist_id}
                  onChange={(e) => setForm({ ...form, specialist_id: e.target.value })}
                >
                  <option value="">PRIMA DISPONIBILITATE</option>
                  {filteredSpecialisti.map((sp) => (
                    <option key={sp.id} value={sp.id}>{sp.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 mt-4">
                <label className="text-[12px] font-black uppercase italic text-slate-400 ml-4">
                  MENȚIUNI SPECIALE
                </label>
                <textarea
                  placeholder="Ai vreo preferință?"
                  className="w-full bg-white border-2 border-amber-500 rounded-[25px] py-6 px-8 text-[16px] font-bold outline-none focus:bg-slate-50 transition-all min-h-[120px] resize-none"
                  value={form.detalii}
                  onChange={(e) => setForm({ ...form, detalii: e.target.value })}
                />
              </div>
            </div>

            {/* ── DATA — buton Chronos (înlocuiește div-ul vechi) ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <button
                type="button"
                onClick={() => setShowDatePicker(true)}
                className="w-full h-[100px] bg-slate-900 text-white rounded-[35px] font-black text-[22px] uppercase italic hover:text-amber-500 transition-all"
              >
                {form.data
                  ? new Date(form.data).toLocaleDateString("ro-RO", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                    })
                  : "ALEGE DATA"}
              </button>

              {/* ── ORA — buton Chronos ── */}
              <button
                type="button"
                id="ora"
                onClick={() => setShowTimePicker(true)}
                className={`w-full h-[100px] bg-slate-900 text-white rounded-[35px] font-black text-[22px] uppercase italic hover:text-amber-500 transition-all border-4 ${
                  errors.ora ? "border-red-500" : "border-transparent"
                }`}
              >
                {form.ora === "00:00" ? "ALEGE ORA" : form.ora}
                {endTimeDisplay && form.ora !== "00:00" && (
                  <span className="block text-[12px] text-amber-500 font-bold">
                    → {endTimeDisplay}
                  </span>
                )}
              </button>
            </div>
            {errors.ora && (
              <p className="text-red-500 text-center text-[10px] font-black uppercase -mt-4">
                Te rugăm să alegi ora programării
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-10 rounded-[35px] font-black text-[14px] uppercase tracking-[0.4em] italic shadow-2xl transition-all border-b-8 active:translate-y-2 active:border-b-0 bg-slate-900 text-white border-slate-800 hover:bg-amber-500 hover:text-black"
            >
              {loading ? "SE PROCESEAZĂ..." : "CONFIRMĂ REZERVAREA"}
            </button>
          </form>
        </div>
      )}

      {/* Secțiune Recenzii */}
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 mb-10">
        <div className="bg-white p-12 rounded-[55px] shadow-xl border border-slate-100 relative overflow-hidden h-fit">
          <h3 className="text-2xl font-black uppercase italic mb-8 border-l-8 border-amber-500 pl-4">
            LASĂ O RECENZIE
          </h3>
          <div className="flex justify-center gap-2 mb-8">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(s)}
                className={`text-4xl transition-transform hover:scale-125 ${
                  s <= (hover || rating) ? "" : "grayscale opacity-20"
                }`}
              >
                ⭐
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="NUMELE TĂU"
            autoComplete="name"
            className="w-full p-6 bg-slate-50 rounded-2xl border-2 border-amber-500 mb-4 font-black uppercase outline-none focus:bg-white transition-all"
            value={numeFeedback}
            onChange={(e) => setNumeFeedback(e.target.value)}
          />
          <textarea
            placeholder="COMENTARIU SAU SUGESTIE"
            className="w-full p-6 bg-slate-50 rounded-2xl border-2 border-amber-500 mb-6 font-bold outline-none h-32 resize-none focus:bg-white transition-all"
            value={mesajFeedback}
            onChange={(e) => setMesajFeedback(e.target.value)}
          />
          <button
            onClick={trimiteFeedback}
            className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black uppercase hover:bg-amber-500 hover:text-black transition-all shadow-lg border-b-4 border-slate-700 active:translate-y-1 active:border-b-0"
          >
            {incarcareFeedback ? "SE TRIMITE..." : "TRIMITE REVIEW"}
          </button>
        </div>

        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 flex flex-col">
          <h3 className="text-2xl font-black uppercase italic mb-8 border-l-8 border-amber-500 pl-4">
            RECENZII RECENTE
          </h3>
          {feedbacks.length > 0 ? (
            feedbacks.map((f, idx) => (
              <div
                key={f.id || idx}
                className="bg-white p-8 rounded-[40px] shadow-md border border-slate-50 hover:border-amber-200 transition-all flex flex-col gap-4"
              >
                <div>
                  <div className="flex gap-1 mb-2">
                    {Array.from({ length: Number(f.stele) || 5 }).map((_, i) => (
                      <span key={i} className="text-sm">⭐</span>
                    ))}
                  </div>
                  <p className="font-black text-[12px] text-amber-500 uppercase mb-2">{f.nume_client}</p>
                  <p className="font-bold italic text-slate-700">"{f.comentariu}"</p>
                </div>
                {f.raspuns_admin && (
                  <div className="ml-6 p-6 bg-slate-900 rounded-3xl border-l-4 border-amber-500">
                    <p className="text-[10px] font-black text-amber-500 uppercase mb-1 tracking-widest">
                      Răspuns Proprietar:
                    </p>
                    <p className="text-white text-sm font-bold italic">"{f.raspuns_admin}"</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-slate-50 p-12 rounded-[40px] text-center border-2 border-dashed border-slate-200">
              <div className="text-4xl mb-4 opacity-20">💬</div>
              <p className="text-slate-400 italic font-bold">Fii primul care lasă o recenzie!</p>
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-2xl text-center py-10 opacity-30">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">
          Powered by Chronos Resource Management
        </p>
      </div>
    </main>
  );
}

export default function RezervarePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Se încarcă...</div>}>
      <RezervareContent />
    </Suspense>
  );
}