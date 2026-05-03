"use client";

import { useState, useEffect, Suspense, useCallback, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { ChronosTimePicker, ChronosDatePicker } from "@/components/ChronosDateTimePickers";

interface StaffRow { id: string; name: string; services: string[] }
interface ServiceRow { id: string; nume_serviciu: string; price: number; duration: number }
interface ExistingAppointment { time: string; duration: number }
interface WorkingHourEntry { day: string; start: string; end: string; closed: boolean }

const DAY_NAMES_LONG = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];

type LimitReason = "plan_limit" | "hour_blocked" | "day_closed" | "outside_hours" | "service_overlap" | "already_booked";

const PLAN_LIMITS: Record<string, number> = {
  "START (GRATUIT)": 30,
  "CHRONOS PRO": 150,
  "CHRONOS ELITE": 500,
  "CHRONOS TEAM": Infinity,
};

function addMinutesToTime(timeStr: string, minutes: number): string {
  if (!timeStr || timeStr === "00:00") return "00:00";
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function timeToMinutes(t: string): number {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function parseWH(whData: any): WorkingHourEntry[] {
  if (!whData) return [];
  if (typeof whData === "string") {
    try { return JSON.parse(whData); } catch { return []; }
  }
  return Array.isArray(whData) ? whData : [];
}

// ─── POPUPS ──────────────────────────────────────────────────────────────────────
function ChronosPopup({ icon, title, message, onClose }: { icon: string; title: string; message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[800] flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white w-full max-w-[400px] rounded-[40px] p-10 text-center shadow-2xl border-[4px] border-amber-500 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-6 text-slate-300 hover:text-red-500 text-xl font-black transition-colors">✕</button>
        <div className="text-5xl mb-4">{icon}</div>
        <h3 className="text-xl font-black uppercase italic mb-3 text-slate-900">{title}</h3>
        <p className="text-slate-500 font-bold text-sm leading-relaxed mb-6 italic">{message}</p>
        <button onClick={onClose} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase italic text-[12px] hover:bg-amber-500 hover:text-black transition-all active:scale-95">AM ÎNȚELES</button>
      </div>
    </div>
  );
}

function SuccessPopup({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[800] flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white w-full max-w-[380px] rounded-[40px] p-10 text-center shadow-2xl border-[4px] border-amber-500 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-6 text-slate-300 hover:text-red-500 text-xl font-black transition-colors">✕</button>
        <div className="text-5xl mb-4">⭐</div>
        <h3 className="text-amber-500 font-black uppercase italic text-2xl mb-2">MULȚUMIM!</h3>
        <p className="text-slate-700 font-bold italic">Opinia ta a fost trimisă spre aprobare.</p>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────────
function RezervareContent() {
  const params = useParams();
  const rawSlug = params?.slug as string | undefined;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const [adminId, setAdminId] = useState("");
  const [adminIdReady, setAdminIdReady] = useState(false);
  const [popup, setPopup] = useState<{ icon: string; title: string; message: string } | null>(null);
  const [feedbackTrimisSucces, setFeedbackTrimisSucces] = useState(false);
  const configChannelRef = useRef<any>(null);

  const [adminWorkingHours, setAdminWorkingHours] = useState<WorkingHourEntry[]>([]);
  const [adminManualBlocks, setAdminManualBlocks] = useState<Record<string, string[]>>({});

  // FIX: appointmentsByDate — un cache per dată, nu un singur array global
  const [appointmentsByDate, setAppointmentsByDate] = useState<Record<string, ExistingAppointment[]>>({});

  const [savedUserProfiles, setSavedUserProfiles] = useState<{ nume: string; telefon: string; email: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const emptyBooking = () => ({
    id: Math.random().toString(36).substr(2, 9),
    serviciu_id: "",
    specialist_id: "",
    data: today,
    ora: "00:00",
    duration: 0,
  });

  const [clientInfo, setClientInfo] = useState({ nume: "", telefon: "", email: "", detalii: "" });
  const [bookings, setBookings] = useState([emptyBooking()]);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [trimis, setTrimis] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingConfig, setFetchingConfig] = useState(true);
  const [pickerControl, setPickerControl] = useState<{ type: "date" | "time"; bookingId: string } | null>(null);

  const [specialisti, setSpecialisti] = useState<StaffRow[]>([]);
  const [servicii, setServicii] = useState<ServiceRow[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [numeFeedback, setNumeFeedback] = useState("");
  const [mesajFeedback, setMesajFeedback] = useState("");
  const [incarcareFeedback, setIncarcareFeedback] = useState(false);

  // FIX: fetchAppointmentsForDate actualizează cache-ul per dată
  // useCallback cu dependență doar pe adminId — nu pe bookings (evită bucla)
  const fetchAppointmentsForDate = useCallback(async (date: string) => {
    if (!adminId || !date) return;
    const { data, error } = await supabase
      .from("appointments")
      .select("time, duration")
      .eq("user_id", adminId)
      .eq("date", date)
      .neq("status", "cancelled");
    if (!error && data) {
      setAppointmentsByDate(prev => ({ ...prev, [date]: data }));
    }
  }, [adminId]); // FIX: eliminat bookings din dependențe

  const isDateAvailable = useCallback((dateStr: string): boolean => {
    if (!dateStr) return false;
    const [y, mo, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, mo - 1, d);
    const dayName = DAY_NAMES_LONG[dateObj.getDay()];
    if (adminWorkingHours.length > 0) {
      const schedule = adminWorkingHours.find((h) => h.day === dayName);
      if (!schedule || schedule.closed) return false;
    }
    const dayBlocks = adminManualBlocks[dateStr] || [];
    if (dayBlocks.length >= 94) return false;
    return true;
  }, [adminWorkingHours, adminManualBlocks]);

  const fetchAdminIdBySlug = useCallback(async (slug: string) => {
    try {
      const { data, error } = await supabase.from("profiles").select("id").eq("slug", slug).single();
      if (error) return null;
      return data?.id || null;
    } catch { return null; }
  }, []);

  const fetchAdminConfig = useCallback(async () => {
    if (!adminIdReady || !adminId) { setFetchingConfig(false); return; }
    try {
      const [staffRes, servicesRes, feedbacksRes, profileRes] = await Promise.all([
        supabase.from("staff").select("*").eq("user_id", adminId).order("created_at", { ascending: false }),
        supabase.from("services").select("*").eq("user_id", adminId).order("created_at", { ascending: false }),
        supabase.from("feedbacks").select("*").eq("admin_id", adminId).eq("aprobat", true).order("created_at", { ascending: false }),
        supabase.from("profiles").select("working_hours, manual_blocks").eq("id", adminId).single(),
      ]);
      if (staffRes.data) setSpecialisti(staffRes.data);
      if (servicesRes.data) setServicii(servicesRes.data);
      if (feedbacksRes.data) setFeedbacks(feedbacksRes.data);
      if (profileRes.data) {
        setAdminWorkingHours(parseWH(profileRes.data.working_hours));
        if (profileRes.data.manual_blocks && typeof profileRes.data.manual_blocks === "object") {
          setAdminManualBlocks(profileRes.data.manual_blocks as Record<string, string[]>);
        }
      }
    } catch (e: any) {
      console.error("Eroare fetch config:", e?.message);
    } finally {
      setFetchingConfig(false);
    }
  }, [adminId, adminIdReady]);

  useEffect(() => {
    async function init() {
      if (!rawSlug) { setAdminIdReady(true); return; }
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
    const saved = localStorage.getItem("chronos_user_profiles");
    if (saved) { try { setSavedUserProfiles(JSON.parse(saved)); } catch {} }
  }, [rawSlug, fetchAdminIdBySlug]);

  useEffect(() => {
    if (adminIdReady && adminId) fetchAdminConfig();
    else if (adminIdReady && !adminId) setFetchingConfig(false);
  }, [adminIdReady, adminId, fetchAdminConfig]);

  // FIX: fetch programări pentru ziua de azi la inițializare
  useEffect(() => {
    if (adminId) fetchAppointmentsForDate(today);
  }, [adminId, today, fetchAppointmentsForDate]);

  // FIX: Realtime — la modificări în appointments, reîncarcă toate datele unice din carduri
  useEffect(() => {
    if (!adminId) return;
    configChannelRef.current = supabase
      .channel(`config-${adminId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${adminId}` },
        (payload) => {
          const newData = payload.new as any;
          if (newData?.working_hours) setAdminWorkingHours(parseWH(newData.working_hours));
          if (newData?.manual_blocks) setAdminManualBlocks(newData.manual_blocks as Record<string, string[]>);
        }
      )
      .on("postgres_changes",
        { event: "*", schema: "public", table: "appointments", filter: `user_id=eq.${adminId}` },
        () => {
          // FIX: citim datele direct din state prin callback functional — nu dependency pe bookings
          setAppointmentsByDate(prev => {
            const dates = Object.keys(prev);
            dates.forEach(d => fetchAppointmentsForDate(d));
            return prev;
          });
        }
      )
      .subscribe();
    return () => { if (configChannelRef.current) supabase.removeChannel(configChannelRef.current); };
  }, [adminId, fetchAppointmentsForDate]);

  const updateBooking = (id: string, fields: Partial<typeof bookings[0]>) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, ...fields } : b));
    // FIX: dacă se schimbă data, fetch programările pentru noua dată
    if (fields.data) {
      fetchAppointmentsForDate(fields.data);
    }
  };

  const addBookingCard = () => {
    const lastDate = bookings[bookings.length - 1]?.data || today;
    const newB = { ...emptyBooking(), data: lastDate };
    setBookings(prev => [...prev, newB]);
    // Asigură că avem programările pentru acea dată
    fetchAppointmentsForDate(lastDate);
  };

  const removeBookingCard = (id: string) => {
    if (bookings.length > 1) {
      setBookings(prev => prev.filter(b => b.id !== id));
    }
  };

  const getLimitPopupContent = (reason: LimitReason) => {
    switch (reason) {
      case "hour_blocked": return { icon: "🕐", title: "Oră Indisponibilă", message: "Această oră nu este disponibilă." };
      case "day_closed": return { icon: "🗓️", title: "Zi Închisă", message: "Unitatea este închisă în această zi." };
      case "outside_hours": return { icon: "⏰", title: "În Afara Programului", message: "Ora aleasă este în afara programului de lucru." };
      case "service_overlap": return { icon: "⏱️", title: "Durată Depășită", message: "Serviciul depășește ora de închidere." };
      case "plan_limit": return { icon: "🚀", title: "Capacitate Maximă", message: "S-a atins limita de programări pentru luna aceasta." };
      case "already_booked": return { icon: "🚫", title: "Interval Indisponibil", message: "Există deja o programare activă în această perioadă." };
      default: return { icon: "⚠️", title: "Limită Atinsă", message: "Intervalul ales nu poate fi rezervat." };
    }
  };

  const trimiteRezervare = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, boolean> = {};
    if (!clientInfo.nume.trim()) newErrors.nume = true;
    if (!clientInfo.telefon.trim()) newErrors.telefon = true;
    if (!clientInfo.email.trim()) newErrors.email = true;

    const invalidBookings = bookings.some(b => !b.serviciu_id || b.ora === "00:00");
    if (invalidBookings) {
      setPopup({ icon: "⚠️", title: "Incomplet", message: "Asigură-te că ai ales serviciul și ora pentru toate programările." });
      setErrors(newErrors);
      return;
    }

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setLoading(true);
    try {
      const { data: profileData } = await supabase.from("profiles").select("plan_type").eq("id", adminId).single();
      const plan = profileData?.plan_type || "START (GRATUIT)";
      const maxAppointments = PLAN_LIMITS[plan] ?? 30;

      if (maxAppointments !== Infinity) {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { data: apptData } = await supabase.from("appointments").select("id").eq("user_id", adminId).gte("created_at", startOfMonth);
        if (apptData && (apptData.length + bookings.length) > maxAppointments) {
          setPopup(getLimitPopupContent("plan_limit"));
          setLoading(false);
          return;
        }
      }

      for (const b of bookings) {
        const svc = servicii.find(s => s.id === b.serviciu_id);
        const duration = svc?.duration || 30;
        const payload = {
          user_id: adminId,
          title: clientInfo.nume.trim(),
          prenume: clientInfo.nume.trim(),
          nume: clientInfo.nume.trim(),
          phone: clientInfo.telefon,
          email: clientInfo.email.trim(),
          date: b.data,
          time: b.ora,
          duration: duration,
          details: `Serviciu: ${svc?.nume_serviciu}${clientInfo.detalii ? ` | Notă: ${clientInfo.detalii}` : ""}`,
          specialist: specialisti.find(s => s.id === b.specialist_id)?.name || "Prima Disponibilitate",
          angajat_id: b.specialist_id || null,
          serviciu_id: b.serviciu_id,
          status: "pending",
          is_client_booking: true,
        };
        const { error } = await supabase.from("appointments").insert([payload]);
        if (error) throw error;
      }

      const newProfile = { nume: clientInfo.nume.trim(), telefon: clientInfo.telefon.trim(), email: clientInfo.email.trim() };
      const updated = [newProfile, ...savedUserProfiles.filter((p) => p.email !== newProfile.email)].slice(0, 3);
      localStorage.setItem("chronos_user_profiles", JSON.stringify(updated));
      setSavedUserProfiles(updated);
      setTrimis(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setPopup({ icon: "❌", title: "Eroare", message: err?.message || "Eroare neașteptată." });
    } finally {
      setLoading(false);
    }
  };

  const trimiteFeedback = async () => {
    if (!adminId || rating === 0 || !numeFeedback.trim() || !mesajFeedback.trim()) {
      setPopup({ icon: "⚠️", title: "Câmpuri incomplete", message: "Completează toate câmpurile pentru recenzie." });
      return;
    }
    setIncarcareFeedback(true);
    try {
      const { error } = await supabase.from("feedbacks").insert([{
        nume_client: numeFeedback.trim(), stele: rating,
        comentariu: mesajFeedback.trim(), aprobat: false, admin_id: adminId,
      }]);
      if (!error) { setNumeFeedback(""); setMesajFeedback(""); setRating(0); setFeedbackTrimisSucces(true); }
    } finally { setIncarcareFeedback(false); }
  };

  // Calculează programările existente pentru cardul activ în picker
  const activeBooking = pickerControl ? bookings.find(b => b.id === pickerControl.bookingId) : null;
  const activeBookingAppts: ExistingAppointment[] = activeBooking
    ? (appointmentsByDate[activeBooking.data] || [])
    : [];

  if (adminIdReady && !adminId) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div><div className="text-6xl mb-4">❌</div><h2 className="text-2xl font-black uppercase italic">Link Invalid</h2></div>
      </main>
    );
  }

  if (fetchingConfig) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse font-black uppercase italic text-slate-400">Sincronizare în timp real...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center p-4 md:p-10 text-slate-900" onClick={() => setShowSuggestions(false)}>

      {/* FIX: Date Picker cu workingHours și manualBlocks corecte */}
      {pickerControl?.type === "date" && activeBooking && (
        <div className="fixed inset-0 z-[800] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPickerControl(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <ChronosDatePicker
              value={activeBooking.data}
              onChange={(val) => {
                updateBooking(pickerControl.bookingId, { data: val, ora: "00:00" });
                setPickerControl(null);
              }}
              minDate={today}
              onClose={() => setPickerControl(null)}
              workingHours={adminWorkingHours}
              manualBlocks={adminManualBlocks}
              isDateAvailable={isDateAvailable}
            />
          </div>
        </div>
      )}

      {/* FIX: Time Picker cu existingAppointments din cache-ul per dată + workingHours */}
      {pickerControl?.type === "time" && activeBooking && (
        <div className="fixed inset-0 z-[800] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPickerControl(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <ChronosTimePicker
              value={activeBooking.ora === "00:00" ? "09:00" : activeBooking.ora}
              onChange={(val) => {
                updateBooking(pickerControl.bookingId, { ora: val });
                setPickerControl(null);
              }}
              onClose={() => setPickerControl(null)}
              workingHours={adminWorkingHours}
              existingAppointments={activeBookingAppts}
              selectedDate={activeBooking.data}
              serviceDuration={servicii.find(s => s.id === activeBooking.serviciu_id)?.duration || 30}
              manualBlocks={adminManualBlocks}
            />
          </div>
        </div>
      )}

      {popup && <ChronosPopup {...popup} onClose={() => setPopup(null)} />}
      {feedbackTrimisSucces && <SuccessPopup onClose={() => setFeedbackTrimisSucces(false)} />}

      {trimis ? (
        <div className="w-full max-w-2xl bg-white rounded-[55px] p-20 text-center shadow-2xl border-t-8 border-amber-500">
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-3xl font-black uppercase italic mb-4">Rezervări Trimise!</h2>
          <p className="text-slate-500 font-bold mb-8">Toate programările tale au fost înregistrate.</p>
          <button onClick={() => window.location.reload()} className="w-full max-w-xs bg-slate-900 text-white py-5 rounded-2xl font-black uppercase italic hover:bg-amber-500 hover:text-black transition-all">REÎNCEARCĂ</button>
        </div>
      ) : (
        <div className="w-full max-w-2xl mb-20">
          <div className="bg-white rounded-[55px] shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-900 p-12 text-white text-center flex flex-col items-center relative">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500"></div>
              <div className="mb-6 relative w-24 h-24">
                <Image src="/logo-chronos.png" alt="Logo" fill className="object-contain" priority />
              </div>
              <h1 className="text-4xl font-black uppercase italic tracking-tighter">
                CHRONOS <span className="text-amber-500">BOOKING</span>
              </h1>
            </div>

            <form onSubmit={trimiteRezervare} className="p-8 md:p-14 space-y-10">
              {/* DATE CONTACT */}
              <div className="space-y-6">
                <h3 className="text-center font-black uppercase italic text-slate-400 text-xs tracking-widest">Datele tale de contact</h3>
                <div className="relative">
                  <input
                    type="text" placeholder="NUME COMPLET"
                    className={`w-full bg-slate-50 border-2 ${errors.nume ? "border-red-500" : "border-amber-500"} rounded-[30px] py-6 px-8 text-[18px] uppercase italic font-black outline-none transition-all`}
                    value={clientInfo.nume}
                    onFocus={() => setShowSuggestions(true)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => { setClientInfo({ ...clientInfo, nume: e.target.value }); setErrors({ ...errors, nume: false }); }}
                  />
                  {showSuggestions && savedUserProfiles.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-white mt-2 rounded-[30px] shadow-2xl border-2 border-amber-500 z-50 overflow-hidden">
                      {savedUserProfiles.map((p, i) => (
                        <button key={i} type="button"
                          onClick={() => { setClientInfo({ nume: p.nume, telefon: p.telefon, email: p.email, detalii: clientInfo.detalii }); setErrors({ ...errors, nume: false, telefon: false, email: false }); setShowSuggestions(false); }}
                          className="w-full p-6 text-left font-black uppercase italic text-sm hover:bg-amber-500 hover:text-white border-b border-slate-100">
                          ⚡ {p.nume}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input type="tel" placeholder="TELEFON"
                    className={`w-full bg-slate-50 border-2 ${errors.telefon ? "border-red-500" : "border-amber-500"} rounded-[30px] py-6 px-8 text-[18px] font-black outline-none transition-all`}
                    value={clientInfo.telefon} onChange={(e) => { setClientInfo({ ...clientInfo, telefon: e.target.value }); setErrors({ ...errors, telefon: false }); }} />
                  <input type="email" placeholder="EMAIL"
                    className={`w-full bg-slate-50 border-2 ${errors.email ? "border-red-500" : "border-amber-500"} rounded-[30px] py-6 px-8 text-[18px] font-black outline-none transition-all`}
                    value={clientInfo.email} onChange={(e) => { setClientInfo({ ...clientInfo, email: e.target.value }); setErrors({ ...errors, email: false }); }} />
                </div>
              </div>

              <div className="h-px bg-slate-100 w-full"></div>

              {/* CARDURI PROGRAMARE */}
              <div className="space-y-12">
                {bookings.map((b, index) => (
                  <div key={b.id} className="relative p-8 bg-slate-50 rounded-[45px] border-2 border-slate-200 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="absolute -top-4 left-8 bg-amber-500 text-black px-4 py-1 rounded-full font-black italic text-[10px] uppercase">
                      Serviciul {index + 1}
                    </div>
                    {index > 0 && (
                      <button type="button" onClick={() => removeBookingCard(b.id)} className="absolute -top-4 -right-4 bg-red-500 text-white w-10 h-10 rounded-full font-black hover:bg-slate-900 transition-colors shadow-lg">✕</button>
                    )}
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase italic text-slate-400 ml-4">Serviciu</label>
                          <select
                            className="w-full bg-white border-2 border-amber-500 rounded-[25px] py-4 px-6 text-[14px] font-black uppercase italic outline-none cursor-pointer"
                            value={b.serviciu_id}
                            onChange={(e) => updateBooking(b.id, { serviciu_id: e.target.value, ora: "00:00" })}>
                            <option value="">ALEGE SERVICIUL</option>
                            {servicii
                              .filter(s => !b.specialist_id || specialisti.find(sp => sp.id === b.specialist_id)?.services.includes(s.id))
                              .map((s) => (
                                <option key={s.id} value={s.id}>{s.nume_serviciu.toUpperCase()}</option>
                              ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase italic text-slate-400 ml-4">Expert</label>
                          <select
                            className="w-full bg-white border-2 border-amber-500 rounded-[25px] py-4 px-6 text-[14px] font-black uppercase italic outline-none cursor-pointer"
                            value={b.specialist_id}
                            onChange={(e) => updateBooking(b.id, { specialist_id: e.target.value })}>
                            <option value="">PRIMA DISPONIBILITATE</option>
                            {specialisti
                              .filter(s => !b.serviciu_id || s.services.includes(b.serviciu_id))
                              .map((sp) => (
                                <option key={sp.id} value={sp.id}>{sp.name.toUpperCase()}</option>
                              ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase italic text-slate-400 ml-4">Data</label>
                          <button type="button" onClick={() => setPickerControl({ type: "date", bookingId: b.id })}
                            className="w-full bg-slate-900 text-white rounded-[25px] py-4 px-6 font-black text-[15px] uppercase italic hover:text-amber-500 transition-all text-center">
                            📅 {new Date(b.data + "T00:00:00").toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, ".")}
                          </button>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase italic text-slate-400 ml-4">Ora</label>
                          <button type="button"
                            onClick={() => {
                              if (!b.serviciu_id) {
                                setPopup({ icon: "⚠️", title: "Atenție", message: "Alege mai întâi serviciul pentru acest card." });
                                return;
                              }
                              fetchAppointmentsForDate(b.data); // refresh înainte de a deschide
                              setPickerControl({ type: "time", bookingId: b.id });
                            }}
                            className={`w-full rounded-[25px] py-4 px-6 font-black text-[15px] uppercase italic transition-all text-center ${
                              b.ora !== "00:00"
                                ? "bg-amber-500 text-white hover:bg-amber-600"
                                : "bg-slate-900 text-white hover:text-amber-500"
                            }`}>
                            🕒 {b.ora === "00:00" ? "ALEGE ORA" : b.ora}
                          </button>
                        </div>
                      </div>

                      {/* Preview interval dacă ora e setată */}
                      {b.ora !== "00:00" && b.serviciu_id && (() => {
                        const svc = servicii.find(s => s.id === b.serviciu_id);
                        if (!svc?.duration) return null;
                        return (
                          <div className="bg-slate-900 rounded-[20px] px-6 py-3 flex items-center justify-between">
                            <p className="text-[10px] font-black text-amber-500 uppercase italic">Interval rezervat</p>
                            <p className="text-white font-black text-sm italic">{b.ora} → {addMinutesToTime(b.ora, svc.duration)}</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))}

                <button type="button" onClick={addBookingCard}
                  className="w-full py-6 border-4 border-dashed border-slate-200 rounded-[35px] text-slate-300 font-black uppercase italic hover:border-amber-500 hover:text-amber-500 transition-all flex items-center justify-center gap-3">
                  <span className="text-2xl">+</span> ADAUGĂ SERVICIU NOU
                </button>
              </div>

              <div className="space-y-2 mt-4">
                <label className="text-[12px] font-black uppercase italic text-slate-400 ml-4">MENȚIUNI SPECIALE (OPȚIONAL)</label>
                <textarea placeholder="Ai vreo preferință?"
                  className="w-full bg-white border-2 border-amber-500 rounded-[25px] py-6 px-8 text-[16px] font-bold outline-none min-h-[100px] resize-none focus:bg-slate-50 transition-all"
                  value={clientInfo.detalii} onChange={(e) => setClientInfo({ ...clientInfo, detalii: e.target.value })} />
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-10 rounded-[35px] font-black text-[14px] uppercase tracking-[0.4em] italic shadow-2xl transition-all border-b-8 bg-slate-900 text-white border-slate-800 hover:bg-amber-500 hover:text-black active:translate-y-2 disabled:opacity-50">
                {loading ? "SE PROCESEAZĂ..." : "CONFIRMĂ TOATE REZERVĂRILE"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SECTIUNE FEEDBACK */}
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 mb-10">
        <div className="bg-white p-12 rounded-[55px] shadow-xl border border-slate-100 h-fit">
          <h3 className="text-2xl font-black uppercase italic mb-8 border-l-8 border-amber-500 pl-4">LASĂ O RECENZIE</h3>
          <div className="flex justify-center gap-2 mb-8">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} onClick={() => setRating(s)}
                className={`text-4xl transition-transform hover:scale-125 ${s <= (hover || rating) ? "" : "grayscale opacity-20"}`}>⭐</button>
            ))}
          </div>
          <input type="text" placeholder="NUMELE TĂU"
            className="w-full p-6 bg-slate-50 rounded-2xl border-2 border-amber-500 mb-4 font-black uppercase outline-none focus:bg-white"
            value={numeFeedback} onChange={(e) => setNumeFeedback(e.target.value)} />
          <textarea placeholder="COMENTARIU"
            className="w-full p-6 bg-slate-50 rounded-2xl border-2 border-amber-500 mb-6 font-bold outline-none h-32 resize-none focus:bg-white"
            value={mesajFeedback} onChange={(e) => setMesajFeedback(e.target.value)} />
          <button onClick={trimiteFeedback} disabled={incarcareFeedback}
            className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black uppercase hover:bg-amber-500 hover:text-black transition-all shadow-lg border-b-4 border-slate-700 active:translate-y-1 disabled:opacity-50">
            {incarcareFeedback ? "SE TRIMITE..." : "TRIMITE REVIEW"}
          </button>
        </div>

        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 flex flex-col">
          <h3 className="text-2xl font-black uppercase italic mb-8 border-l-8 border-amber-500 pl-4">RECENZII RECENTE</h3>
          {feedbacks.length > 0 ? (
            feedbacks.map((f) => (
              <div key={f.id} className="bg-white p-8 rounded-[40px] shadow-md border border-slate-50 hover:border-amber-200 transition-all flex flex-col gap-4">
                <div>
                  <div className="flex gap-1 mb-2">{Array.from({ length: f.stele }).map((_, i) => <span key={i}>⭐</span>)}</div>
                  <p className="font-black text-[12px] text-amber-500 uppercase mb-2">{f.nume_client}</p>
                  <p className="font-bold italic text-slate-700">"{f.comentariu}"</p>
                </div>
                {f.raspuns_admin && (
                  <div className="ml-6 p-6 bg-slate-900 rounded-3xl border-l-4 border-amber-500">
                    <p className="text-[10px] font-black text-amber-500 uppercase mb-1 tracking-widest italic">Răspuns Salon:</p>
                    <p className="text-white text-sm font-bold italic">"{f.raspuns_admin}"</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-slate-50 p-12 rounded-[40px] text-center border-2 border-dashed border-slate-200">
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-black italic">Se încarcă...</div>}>
      <RezervareContent />
    </Suspense>
  );
}