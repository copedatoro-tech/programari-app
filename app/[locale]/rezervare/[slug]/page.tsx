"use client";

import { useState, useEffect, Suspense, useCallback, useMemo, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { useTranslations } from "next-intl";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { ChronosTimePicker, ChronosDatePicker } from "@/components/ChronosDateTimePickers";
import { CalendarDays, Clock3, Star } from "lucide-react";

interface StaffRow { id: string; name: string; services: string[]; working_hours?: any }
interface ServiceRow { id: string; nume_serviciu: string; price: number; duration: number }
interface ExistingAppointment { time: string; duration: number }
interface WorkingHourEntry { day: string; start: string; end: string; closed: boolean }
interface AdminProfile { full_name: string | null; avatar_url: string | null; phone: string | null; email: string | null }

// FIX (nu tradus): zilele stocate in baza de date (working_hours.day) sunt salvate
// intotdeauna in romana, indiferent de limba interfetei. Acest array e folosit DOAR
// pentru a verifica disponibilitatea din baza de date, deci trebuie sa ramana fix.
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

// ✅ Normalizează numărul de telefon pentru link-uri wa.me (fără spații, fără "+",
// cu prefix de țară — presupunem România dacă numărul începe cu "0")
function toWaLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountryCode = digits.startsWith("0") ? "4" + digits : digits;
  return `https://wa.me/${withCountryCode}`;
}

function parseWH(whData: any): WorkingHourEntry[] {
  if (!whData) return [];
  if (typeof whData === "string") {
    try { return JSON.parse(whData); } catch { return []; }
  }
  return Array.isArray(whData) ? whData : [];
}
// Cheie compusa data+specialist - ca sa blocam orele DOAR pentru specialistul ales,
// nu pentru toti specialistii (specialisti diferiti pot fi ocupati la ore diferite)
function mkKey(date: string, specialistId: string) {
  return `${date}|${specialistId || ""}`;
}

// ─── POPUPS ────────────────────────────────────────────────────────────────
function ChronosPopup({ icon, title, message, onClose }: { icon: string; title: string; message: string; onClose: () => void }) {
  const t = useTranslations("rezervare");
  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[800] flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white w-full max-w-[400px] rounded-[40px] p-10 text-center shadow-2xl border-[4px] border-amber-500 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-6 text-slate-300 hover:text-red-500 text-xl font-black transition-colors">✕</button>
        <div className="text-5xl mb-4">{icon}</div>
        <h3 className="text-xl font-black uppercase italic mb-3 text-slate-900">{title}</h3>
        <p className="text-slate-500 font-bold text-sm leading-relaxed mb-6 italic">{message}</p>
        <button onClick={onClose} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase italic text-[12px] hover:bg-amber-500 hover:text-black transition-all active:scale-95">{t("understoodBtn")}</button>
      </div>
    </div>
  );
}

function SuccessPopup({ onClose }: { onClose: () => void }) {
  const t = useTranslations("rezervare");
  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[800] flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white w-full max-w-[380px] rounded-[40px] p-10 text-center shadow-2xl border-[4px] border-amber-500 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-6 text-slate-300 hover:text-red-500 text-xl font-black transition-colors">✕</button>
        <Star className="w-12 h-12 mx-auto mb-4 text-amber-500" fill="currentColor" strokeWidth={2.5} />
        <h3 className="text-amber-500 font-black uppercase italic text-2xl mb-2">{t("thanksTitle")}</h3>
        <p className="text-slate-700 font-bold italic">{t("thanksText")}</p>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
function RezervareContent() {
  const t = useTranslations("rezervare");
  const tWaitlist = useTranslations("waitlist");
  const localeCode = t("localeCode");
  const params = useParams();
  const searchParams = useSearchParams();
  const rawSlug = params?.slug as string | undefined;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const [adminId, setAdminId] = useState("");
  const [adminIdReady, setAdminIdReady] = useState(false);
  const [popup, setPopup] = useState<{ icon: string; title: string; message: string } | null>(null);
  const [feedbackTrimisSucces, setFeedbackTrimisSucces] = useState(false);
  const configChannelRef = useRef<any>(null);

  const [adminWorkingHours, setAdminWorkingHours] = useState<WorkingHourEntry[]>([]);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [adminManualBlocks, setAdminManualBlocks] = useState<Record<string, string[]>>({});
  const [paymentConfig, setPaymentConfig] = useState<{ required: boolean; onboarded: boolean; slug: string | null }>({
    required: false, onboarded: false, slug: null,
  });

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
  const [technicalError, setTechnicalError] = useState(false);
  const [pickerControl, setPickerControl] = useState<{ type: "date" | "time"; bookingId: string } | null>(null);
  const [waitlistModal, setWaitlistModal] = useState<{ bookingId: string } | null>(null);
  const [waitlistSaving, setWaitlistSaving] = useState(false);
  const [waitlistJoined, setWaitlistJoined] = useState(false);

  const [specialisti, setSpecialisti] = useState<StaffRow[]>([]);
  const [servicii, setServicii] = useState<ServiceRow[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [numeFeedback, setNumeFeedback] = useState("");
  const [mesajFeedback, setMesajFeedback] = useState("");
  const [incarcareFeedback, setIncarcareFeedback] = useState(false);

  const fetchAppointmentsForDate = useCallback(async (date: string, specialistId?: string) => {
    if (!adminId || !date) return;
    const key = mkKey(date, specialistId || "");
    if (!specialistId) {
      setAppointmentsByDate(prev => ({ ...prev, [key]: [] }));
      return;
    }
    const { data, error } = await supabase
      .from("appointments")
      .select("time, duration")
      .eq("user_id", adminId)
      .eq("date", date)
      .eq("angajat_id", specialistId)
      .neq("status", "cancelled");
    if (!error && data) {
      setAppointmentsByDate(prev => ({ ...prev, [key]: data }));
    }
  }, [adminId]);

  const fetchFeedbacks = useCallback(async (id: string) => {
    if (!id) return;
    const { data, error } = await supabase
      .from("feedbacks")
      .select("*")
      .eq("admin_id", id)
      .eq("aprobat", true)
      .order("created_at", { ascending: false });
    if (!error) {
      setFeedbacks(data || []);
    } else {
      console.error("Eroare fetch feedbacks:", error.message);
    }
  }, []);

  const isDateAvailable = useCallback((dateStr: string, whToUse: WorkingHourEntry[] = adminWorkingHours): boolean => {
    if (!dateStr) return false;
    const [y, mo, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, mo - 1, d);
    const dayName = DAY_NAMES_LONG[dateObj.getDay()];
    if (whToUse.length > 0) {
      const schedule = whToUse.find((h) => h.day === dayName);
      if (!schedule || schedule.closed) return false;
    }
    const dayBlocks = adminManualBlocks[dateStr] || [];
    if (dayBlocks.length >= 94) return false;
    return true;
  }, [adminWorkingHours, adminManualBlocks]);

  const fetchAdminIdBySlug = useCallback(async (slug: string) => {
    try {
      const { data, error } = await supabase.from("profiles").select("id").eq("slug", slug).single();
      if (error) {
        if (error.code !== "PGRST116") setTechnicalError(true);
        return null;
      }
      return data?.id || null;
    } catch {
      setTechnicalError(true);
      return null;
    }
  }, []);

  const fetchAdminConfig = useCallback(async () => {
    if (!adminIdReady || !adminId) { setFetchingConfig(false); return; }
    setTechnicalError(false);
    try {
      const [staffRes, servicesRes, profileRes] = await Promise.all([
        supabase.from("staff").select("*").eq("user_id", adminId).order("created_at", { ascending: false }),
        supabase.from("services").select("*").eq("user_id", adminId).order("created_at", { ascending: false }),
        supabase.from("profiles").select("working_hours, manual_blocks, stripe_account_id, stripe_onboarded, currency, require_payment_at_booking, slug, avatar_url, full_name, phone, email").eq("id", adminId).single(),
      ]);
      const hasTechnicalIssue =
        (staffRes.error && staffRes.error.code !== "PGRST116") ||
        (servicesRes.error && servicesRes.error.code !== "PGRST116") ||
        (profileRes.error && profileRes.error.code !== "PGRST116");
      if (hasTechnicalIssue) {
        setTechnicalError(true);
        setFetchingConfig(false);
        return;
      }
      if (staffRes.data) setSpecialisti(staffRes.data);
      if (servicesRes.data) setServicii(servicesRes.data);
      if (profileRes.data) {
        setAdminProfile({
          full_name: profileRes.data.full_name || null,
          avatar_url: profileRes.data.avatar_url || null,
          phone: profileRes.data.phone || null,
          email: profileRes.data.email || null,
        });
        setAdminWorkingHours(parseWH(profileRes.data.working_hours));
        if (profileRes.data.manual_blocks && typeof profileRes.data.manual_blocks === "object") {
          setAdminManualBlocks(profileRes.data.manual_blocks as Record<string, string[]>);
        }
        setPaymentConfig({
          required: !!profileRes.data.require_payment_at_booking,
          onboarded: !!profileRes.data.stripe_onboarded && !!profileRes.data.stripe_account_id,
          slug: profileRes.data.slug || null,
        });
      }
      await fetchFeedbacks(adminId);
    } catch (e: any) {
      console.error("Eroare fetch config:", e?.message);
      setTechnicalError(true);
    } finally {
      setFetchingConfig(false);
    }
  }, [adminId, adminIdReady, fetchFeedbacks]);

  const initSlug = useCallback(async () => {
    if (!rawSlug) { setAdminIdReady(true); return; }
    setTechnicalError(false);
    if (uuidRegex.test(rawSlug)) {
      setAdminId(rawSlug);
      setAdminIdReady(true);
    } else {
      const id = await fetchAdminIdBySlug(rawSlug);
      if (id) setAdminId(id);
      setAdminIdReady(true);
    }
  }, [rawSlug, fetchAdminIdBySlug]);

  useEffect(() => {
    initSlug();
    const saved = localStorage.getItem("chronos_user_profiles");
    if (saved) { try { setSavedUserProfiles(JSON.parse(saved)); } catch {} }
  }, [initSlug]);

  useEffect(() => {
    if (!technicalError) return;
    const retryInterval = setInterval(() => {
      if (!adminId) initSlug();
      else fetchAdminConfig();
    }, 8000);
    return () => clearInterval(retryInterval);
  }, [technicalError, adminId, initSlug, fetchAdminConfig]);

  useEffect(() => {
    if (adminIdReady && adminId) fetchAdminConfig();
    else if (adminIdReady && !adminId) setFetchingConfig(false);
  }, [adminIdReady, adminId, fetchAdminConfig]);

  useEffect(() => {
    if (adminId) fetchAppointmentsForDate(today, "");
  }, [adminId, today, fetchAppointmentsForDate]);

  // ✅ Cod QR / link personal de specialist — dacă URL-ul conține ?specialist=ID,
  // preselectăm automat acel specialist la primul serviciu, imediat ce lista de
  // specialiști e încărcată. Clientul alege doar data și ora.
  useEffect(() => {
    const presetSpecialistId = searchParams.get("specialist");
    if (!presetSpecialistId || specialisti.length === 0) return;
    const exists = specialisti.some((sp) => sp.id === presetSpecialistId);
    if (!exists) return;
    setBookings((prev) => {
      if (prev[0]?.specialist_id === presetSpecialistId) return prev;
      const updated = [...prev];
      updated[0] = { ...updated[0], specialist_id: presetSpecialistId };
      return updated;
    });
    fetchAppointmentsForDate(today, presetSpecialistId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialisti]);

  useEffect(() => {
    const platit = searchParams.get("platit");
    if (platit === "success") {
      setPopup({ icon: "✅", title: t("successTitle"), message: t("successText") });
      window.history.replaceState(null, "", window.location.pathname);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setPopup(null), 3500);
    } else if (platit === "anulat") {
      setPopup({ icon: "⚠️", title: t("attentionTitle"), message: t("errorDefaultMsg") });
      window.history.replaceState(null, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
          setAdminProfile((prev) => ({
            full_name: newData?.full_name ?? prev?.full_name ?? null,
            avatar_url: newData?.avatar_url ?? prev?.avatar_url ?? null,
            phone: newData?.phone ?? prev?.phone ?? null,
            email: newData?.email ?? prev?.email ?? null,
          }));
        }
      )
      .on("postgres_changes",
        { event: "*", schema: "public", table: "appointments", filter: `user_id=eq.${adminId}` },
        () => {
          setAppointmentsByDate(prev => {
            Object.keys(prev).forEach(key => {
              const [d, sp] = key.split("|");
              fetchAppointmentsForDate(d, sp);
            });
            return prev;
          });
        }
      )
      .on("postgres_changes",
        { event: "*", schema: "public", table: "feedbacks", filter: `admin_id=eq.${adminId}` },
        () => {
          fetchFeedbacks(adminId);
        }
      )
      .subscribe();
    return () => { if (configChannelRef.current) supabase.removeChannel(configChannelRef.current); };
  }, [adminId, fetchAppointmentsForDate, fetchFeedbacks]);

  const updateBooking = (id: string, fields: Partial<typeof bookings[0]>) => {
    setBookings(prev => {
      const updated = prev.map(b => b.id === id ? { ...b, ...fields } : b);
      if (fields.data !== undefined || fields.specialist_id !== undefined) {
        const b = updated.find(x => x.id === id);
        if (b) fetchAppointmentsForDate(b.data, b.specialist_id);
      }
      return updated;
    });
  };

  const addBookingCard = () => {
    const lastDate = bookings[bookings.length - 1]?.data || today;
    const newB = { ...emptyBooking(), data: lastDate };
    setBookings(prev => [...prev, newB]);
    fetchAppointmentsForDate(lastDate, newB.specialist_id);
  };

  const removeBookingCard = (id: string) => {
    if (bookings.length > 1) {
      setBookings(prev => prev.filter(b => b.id !== id));
    }
  };

  const getLimitPopupContent = (reason: LimitReason) => {
    switch (reason) {
      case "hour_blocked": return { icon: "🕐", title: t("popupHourBlockedTitle"), message: t("popupHourBlockedMsg") };
      case "day_closed": return { icon: "🗓️", title: t("popupDayClosedTitle"), message: t("popupDayClosedMsg") };
      case "outside_hours": return { icon: "⏰", title: t("popupOutsideHoursTitle"), message: t("popupOutsideHoursMsg") };
      case "service_overlap": return { icon: "⏱️", title: t("popupOverlapTitle"), message: t("popupOverlapMsg") };
      case "plan_limit": return { icon: "🚀", title: t("popupPlanLimitTitle"), message: t("popupPlanLimitMsg") };
      case "already_booked": return { icon: "🚫", title: t("popupAlreadyBookedTitle"), message: t("popupAlreadyBookedMsg") };
      default: return { icon: "⚠️", title: t("popupDefaultTitle"), message: t("popupDefaultMsg") };
    }
  };

  const handleJoinWaitlist = async () => {
    if (!waitlistModal || !adminId) return;
    const b = bookings.find((x) => x.id === waitlistModal.bookingId);
    if (!b || !clientInfo.nume.trim() || !clientInfo.email.trim()) {
      setPopup({ icon: "⚠️", title: t("attentionTitle"), message: t("attentionMsg") });
      return;
    }
    setWaitlistSaving(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId,
          specialistId: b.specialist_id || null,
          serviciuId: b.serviciu_id || null,
          date: b.data,
          clientName: clientInfo.nume.trim(),
          clientPhone: clientInfo.telefon,
          clientEmail: clientInfo.email.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      setWaitlistJoined(true);
    } catch {
      setPopup({ icon: "❌", title: t("errorTitle"), message: t("errorDefaultMsg") });
    } finally {
      setWaitlistSaving(false);
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
      setPopup({ icon: "⚠️", title: t("incompleteTitle"), message: t("incompleteMsg") });
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

      if (paymentConfig.required && paymentConfig.onboarded) {
        const res = await fetch("/api/stripe/create-booking-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adminId,
            clientInfo: {
              nume: clientInfo.nume.trim(),
              telefon: clientInfo.telefon,
              email: clientInfo.email.trim(),
              detalii: clientInfo.detalii,
            },
            bookings: bookings.map(b => ({
              serviciu_id: b.serviciu_id,
              specialist_id: b.specialist_id || null,
              data: b.data,
              ora: b.ora,
            })),
          }),
        });
        const checkoutData = await res.json();
        if (!res.ok || !checkoutData.url) {
          setPopup({ icon: "❌", title: t("errorTitle"), message: checkoutData.error || t("errorDefaultMsg") });
          setLoading(false);
          return;
        }
        window.location.href = checkoutData.url;
        return;
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
          specialist: specialisti.find(s => s.id === b.specialist_id)?.name || t("firstAvailOpt"),
          angajat_id: b.specialist_id || null,
          serviciu_id: b.serviciu_id,
          status: "pending",
          is_client_booking: true,
        };
        const { data: inserted, error } = await supabase.from("appointments").insert([payload]).select("id").single();
        if (error) throw error;
        if (inserted?.id) {
          fetch("/api/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: clientInfo.email.trim(),
              nume: clientInfo.nume.trim(),
              data: b.data,
              ora: b.ora,
              appointmentId: inserted.id,
            }),
          }).catch(() => {});
        }
        // Trimitem si confirmare pe WhatsApp, in paralel - foloseste sablonul
        // "confirmare_programare" aprobat de Meta. Esecul nu blocheaza rezervarea.
        if (clientInfo.telefon) {
          fetch("/api/send-whatsapp-confirmation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: clientInfo.telefon,
              nume: clientInfo.nume.trim(),
              data: b.data,
              ora: b.ora,
              adminId,
            }),
          }).catch(() => {});
        }
      }

      const newProfile = { nume: clientInfo.nume.trim(), telefon: clientInfo.telefon.trim(), email: clientInfo.email.trim() };
      const updated = [newProfile, ...savedUserProfiles.filter((p) => p.email !== newProfile.email)].slice(0, 3);
      localStorage.setItem("chronos_user_profiles", JSON.stringify(updated));
      setSavedUserProfiles(updated);
      setTrimis(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setPopup({ icon: "❌", title: t("errorTitle"), message: err?.message || t("errorDefaultMsg") });
    } finally {
      setLoading(false);
    }
  };

  const trimiteFeedback = async () => {
    if (!adminId || rating === 0 || !numeFeedback.trim() || !mesajFeedback.trim()) {
      setPopup({ icon: "⚠️", title: t("incompleteFieldsTitle"), message: t("incompleteFieldsMsg") });
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

  const activeBooking = pickerControl ? bookings.find(b => b.id === pickerControl.bookingId) : null;
  const activeBookingAppts: ExistingAppointment[] = activeBooking
    ? (appointmentsByDate[mkKey(activeBooking.data, activeBooking.specialist_id)] || [])
    : [];
  const effectiveWorkingHours = useMemo(() => {
    if (!activeBooking?.specialist_id) return adminWorkingHours;
    const staffMember = specialisti.find(s => s.id === activeBooking.specialist_id);
    const staffWH = parseWH(staffMember?.working_hours);
    return staffWH.length > 0 ? staffWH : adminWorkingHours;
  }, [activeBooking?.specialist_id, specialisti, adminWorkingHours]);

  const avgRating = feedbacks.length > 0
    ? (feedbacks.reduce((sum, f) => sum + (f.stele || 0), 0) / feedbacks.length)
    : 0;
  const starAriaBase = localeCode.startsWith("ro") ? "stele" : "stars";

  if (technicalError) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="fixed top-4 right-4 z-[700]"><LocaleSwitcher /></div>
        <div className="max-w-md">
          <div className="text-6xl mb-4">🔧</div>
          <h2 className="text-2xl font-black uppercase italic text-slate-900 mb-3">{t("techErrorTitle")}</h2>
          <p className="text-slate-500 font-medium mb-6">{t("techErrorMsg")}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase italic text-sm hover:bg-amber-500 hover:text-black transition-all shadow-lg"
          >
            {t("techErrorRetryBtn")}
          </button>
        </div>
      </main>
    );
  }

  if (adminIdReady && !adminId) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="fixed top-4 right-4 z-[700]"><LocaleSwitcher /></div>
        <div><div className="text-6xl mb-4">❌</div><h2 className="text-2xl font-black uppercase italic">{t("invalidLink")}</h2></div>
      </main>
    );
  }

  if (fetchingConfig) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="fixed top-4 right-4 z-[700]"><LocaleSwitcher /></div>
        <div className="animate-pulse font-black uppercase italic text-slate-400">{t("syncing")}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative bg-gradient-to-br from-slate-50 via-white to-amber-50/40 flex flex-col items-center p-4 md:p-10 text-slate-900 overflow-x-hidden" onClick={() => setShowSuggestions(false)}>

      <div className="fixed -top-40 -left-40 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/3 -right-40 w-[500px] h-[500px] bg-slate-300/20 rounded-full blur-3xl pointer-events-none" />

      <div className="fixed top-4 left-4 z-[700] flex items-center gap-2 rounded-2xl bg-white/85 px-3 py-2 shadow-lg border border-white/70 backdrop-blur" onClick={(e) => e.stopPropagation()}>
        <div className="relative h-7 w-7">
          <Image src="/logo-chronos.png" alt="Chronos" fill className="object-contain" priority />
        </div>
        <span className="hidden sm:inline text-[9px] font-black uppercase italic tracking-widest text-slate-700">Chronos</span>
      </div>

      <div className="fixed top-4 right-4 z-[700]" onClick={(e) => e.stopPropagation()}>
        <LocaleSwitcher />
      </div>

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
              workingHours={effectiveWorkingHours}
              manualBlocks={adminManualBlocks}
              isDateAvailable={(d) => isDateAvailable(d, effectiveWorkingHours)}
            />
          </div>
        </div>
      )}

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
              workingHours={effectiveWorkingHours}
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

      {waitlistModal && (
        <div className="fixed inset-0 z-[850] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => { setWaitlistModal(null); setWaitlistJoined(false); }}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-sm rounded-[35px] p-8 shadow-2xl text-center">
            {waitlistJoined ? (
              <>
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-3xl">✓</div>
                <h3 className="text-lg font-black uppercase italic text-slate-900 mb-2">{tWaitlist("joinedTitle")}</h3>
                <p className="text-slate-500 text-sm mb-6">{tWaitlist("joinedMsg")}</p>
                <button onClick={() => { setWaitlistModal(null); setWaitlistJoined(false); }}
                  className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase italic text-sm hover:bg-slate-200 transition-all">
                  {tWaitlist("closeBtn")}
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-black uppercase italic text-slate-900 mb-2">{tWaitlist("joinModalTitle")}</h3>
                <p className="text-slate-500 text-sm mb-6">{tWaitlist("joinModalSubtitle")}</p>
                <button
                  onClick={handleJoinWaitlist}
                  disabled={waitlistSaving}
                  className="w-full py-4 bg-amber-500 text-black rounded-2xl font-black uppercase italic text-sm hover:bg-amber-600 transition-all disabled:opacity-50 mb-3"
                >
                  {waitlistSaving ? "..." : tWaitlist("submitBtn")}
                </button>
                <button onClick={() => setWaitlistModal(null)}
                  className="w-full py-3 text-slate-400 font-black uppercase italic text-[11px] hover:text-red-500 transition-colors">
                  {tWaitlist("closeBtn")}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {trimis ? (
        <div className="w-full max-w-2xl bg-white rounded-[55px] p-20 text-center shadow-2xl border-t-8 border-amber-500 relative z-10">
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-3xl font-black uppercase italic mb-4">{t("successTitle")}</h2>
          <p className="text-slate-500 font-bold mb-8">{t("successText")}</p>
          <button onClick={() => { window.location.href = window.location.origin + window.location.pathname; }} className="w-full max-w-xs bg-slate-900 text-white py-5 rounded-2xl font-black uppercase italic hover:bg-amber-500 hover:text-black transition-all">{t("retryBtn")}</button>
        </div>
      ) : (
        <div className="w-full max-w-6xl mb-14 relative z-10">
          <div className="grid lg:grid-cols-[1.35fr_1fr] gap-8 items-start">

            <div className="bg-white rounded-[55px] shadow-2xl border border-slate-100 overflow-hidden">
              <div className="bg-slate-900 p-12 text-white text-center flex flex-col items-center relative">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500"></div>
                <div className="mb-6 relative w-32 h-32 rounded-[36px] overflow-hidden bg-white/10 border border-white/10 shadow-2xl flex items-center justify-center">
                  {adminProfile?.avatar_url
                    ? <Image src={adminProfile.avatar_url} alt={adminProfile.full_name || "Logo"} fill className="object-cover" priority />
                    : <span className="text-5xl font-black text-amber-500 uppercase italic">{(adminProfile?.full_name || t("brandLine1") || "C").slice(0, 1)}</span>}
                </div>
                <h1 className="text-4xl font-black uppercase italic tracking-tighter">
                  {adminProfile?.full_name || <>{t("brandLine1")} <span className="text-amber-500">{t("brandLine2")}</span></>}
                </h1>
                {(adminProfile?.phone || adminProfile?.email) && (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    {adminProfile?.phone && (
                      <a href={toWaLink(adminProfile.phone)} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white/10 hover:bg-[#25D366] hover:text-white rounded-full text-[10px] font-black uppercase italic transition-colors flex items-center gap-1.5">
                        <span>💬</span> {adminProfile.phone}
                      </a>
                    )}
                    {adminProfile?.email && (
                      <a href={`mailto:${adminProfile.email}`} className="px-4 py-2 bg-white/10 hover:bg-amber-500 hover:text-slate-900 rounded-full text-[10px] font-black uppercase italic transition-colors">{adminProfile.email}</a>
                    )}
                  </div>
                )}
                {feedbacks.length > 0 ? (
                  <div className="mt-4 flex items-center gap-2 bg-white/10 px-5 py-2 rounded-full">
                    <Star className="w-4 h-4 text-amber-500" fill="currentColor" strokeWidth={2.5} />
                    <span className="text-white font-black text-sm">{avgRating.toFixed(1)}</span>
                    <span className="text-white/40 text-[10px] font-bold uppercase">
                      · {feedbacks.length}{t("reviewsCountSuffix")}
                    </span>
                  </div>
                ) : (
                  <div className="mt-4 bg-white/10 px-5 py-2 rounded-full">
                    <span className="text-white/50 text-[10px] font-bold uppercase italic">{t("noRatingYet")}</span>
                  </div>
                )}
              </div>

              <form onSubmit={trimiteRezervare} className="p-8 md:p-14 space-y-10">
                <div className="space-y-6">
                  <h3 className="text-center font-black uppercase italic text-slate-400 text-xs tracking-widest">{t("contactSectionTitle")}</h3>
                  <div className="relative">
                    <input
                      type="text" placeholder={t("namePlaceholder")}
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
                          {t("suggestionPrefix")}{p.nume}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input type="tel" placeholder={t("phonePlaceholder")}
                    className={`w-full bg-slate-50 border-2 ${errors.telefon ? "border-red-500" : "border-amber-500"} rounded-[30px] py-6 px-8 text-[18px] font-black outline-none transition-all`}
                    value={clientInfo.telefon} onChange={(e) => { setClientInfo({ ...clientInfo, telefon: e.target.value }); setErrors({ ...errors, telefon: false }); }} />
                  <input type="email" placeholder={t("emailPlaceholder")}
                    className={`w-full bg-slate-50 border-2 ${errors.email ? "border-red-500" : "border-amber-500"} rounded-[30px] py-6 px-8 text-[18px] font-black outline-none transition-all`}
                    value={clientInfo.email} onChange={(e) => { setClientInfo({ ...clientInfo, email: e.target.value }); setErrors({ ...errors, email: false }); }} />
                </div>
              </div>

              <div className="h-px bg-slate-100 w-full"></div>

              <div className="space-y-12">
                {bookings.map((b, index) => (
                  <div key={b.id} className="relative p-8 bg-slate-50 rounded-[45px] border-2 border-slate-200 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="absolute -top-4 left-8 bg-amber-500 text-black px-4 py-1 rounded-full font-black italic text-[10px] uppercase">
                      {t("serviceCardLabel", { n: index + 1 })}
                    </div>
                    {index > 0 && (
                      <button type="button" onClick={() => removeBookingCard(b.id)} className="absolute -top-4 -right-4 bg-red-500 text-white w-10 h-10 rounded-full font-black hover:bg-slate-900 transition-colors shadow-lg">✕</button>
                    )}
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase italic text-slate-400 ml-4">{t("serviceLabel")}</label>
                          <select
                            className="w-full bg-white border-2 border-amber-500 rounded-[25px] py-4 px-6 text-[14px] font-black uppercase italic outline-none cursor-pointer"
                            value={b.serviciu_id}
                            onChange={(e) => updateBooking(b.id, { serviciu_id: e.target.value, ora: "00:00" })}>
                            <option value="">{t("chooseServiceOpt")}</option>
                            {servicii
                              .filter(s => !b.specialist_id || specialisti.find(sp => sp.id === b.specialist_id)?.services.includes(s.id))
                              .map((s) => (
                                <option key={s.id} value={s.id}>{s.nume_serviciu.toUpperCase()}</option>
                              ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase italic text-slate-400 ml-4">{t("expertLabel")}</label>
                          <select
                            className="w-full bg-white border-2 border-amber-500 rounded-[25px] py-4 px-6 text-[14px] font-black uppercase italic outline-none cursor-pointer"
                            value={b.specialist_id}
                            onChange={(e) => updateBooking(b.id, { specialist_id: e.target.value })}>
                            <option value="">{t("firstAvailOpt")}</option>
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
                          <label className="text-[10px] font-black uppercase italic text-slate-400 ml-4">{t("dateLabel")}</label>
                          <button type="button" onClick={() => setPickerControl({ type: "date", bookingId: b.id })}
                            className="w-full bg-slate-900 text-white rounded-[25px] py-4 px-6 font-black text-[15px] uppercase italic hover:text-amber-500 transition-all flex items-center justify-center gap-2">
                            <CalendarDays className="w-4 h-4 shrink-0" strokeWidth={2.6} />
                            <span>{new Date(b.data + "T00:00:00").toLocaleDateString(localeCode, { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                          </button>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase italic text-slate-400 ml-4">{t("timeLabel")}</label>
                          <button type="button"
                            onClick={() => {
                              if (!b.serviciu_id) {
                                setPopup({ icon: "⚠️", title: t("attentionTitle"), message: t("attentionMsg") });
                                return;
                              }
                              fetchAppointmentsForDate(b.data, b.specialist_id);
                              setPickerControl({ type: "time", bookingId: b.id });
                            }}
                            className={`w-full rounded-[25px] py-4 px-6 font-black text-[15px] uppercase italic transition-all text-center ${
                              b.ora !== "00:00"
                                ? "bg-amber-500 text-white hover:bg-amber-600"
                                : "bg-slate-900 text-white hover:text-amber-500"
                            } flex items-center justify-center gap-2`}>
                            <Clock3 className="w-4 h-4 shrink-0" strokeWidth={2.6} />
                            <span>{b.ora === "00:00" ? t("chooseTimeOpt") : b.ora}</span>
                          </button>
                        </div>
                      </div>

                      {b.serviciu_id && (
                        <div className="text-center mt-1">
                          <button
                            type="button"
                            onClick={() => setWaitlistModal({ bookingId: b.id })}
                            className="text-[10px] font-black uppercase italic text-slate-400 hover:text-amber-600 underline decoration-dotted transition-colors"
                          >
                            {tWaitlist("joinBtn")}
                          </button>
                        </div>
                      )}

                      {b.ora !== "00:00" && b.serviciu_id && (() => {
                        const svc = servicii.find(s => s.id === b.serviciu_id);
                        if (!svc?.duration) return null;
                        return (
                          <div className="bg-slate-900 rounded-[20px] px-6 py-3 flex items-center justify-between">
                            <p className="text-[10px] font-black text-amber-500 uppercase italic">{t("reservedIntervalLabel")}</p>
                            <p className="text-white font-black text-sm italic">{b.ora} → {addMinutesToTime(b.ora, svc.duration)}</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))}

                <button type="button" onClick={addBookingCard}
                  className="w-full py-6 border-4 border-dashed border-slate-200 rounded-[35px] text-slate-300 font-black uppercase italic hover:border-amber-500 hover:text-amber-500 transition-all flex items-center justify-center gap-3">
                  <span className="text-2xl">+</span> {t("addServiceBtn")}
                </button>
              </div>

              <div className="space-y-2 mt-4">
                <label className="text-[12px] font-black uppercase italic text-slate-400 ml-4">{t("notesLabel")}</label>
                <textarea placeholder={t("notesPlaceholder")}
                  className="w-full bg-white border-2 border-amber-500 rounded-[25px] py-6 px-8 text-[16px] font-bold outline-none min-h-[100px] resize-none focus:bg-slate-50 transition-all"
                  value={clientInfo.detalii} onChange={(e) => setClientInfo({ ...clientInfo, detalii: e.target.value })} />
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-10 rounded-[35px] font-black text-[14px] uppercase tracking-[0.4em] italic shadow-2xl transition-all border-b-8 bg-slate-900 text-white border-slate-800 hover:bg-amber-500 hover:text-black active:translate-y-2 disabled:opacity-50">
                {loading ? t("processingBtn") : t("confirmAllBtn")}
              </button>
            </form>
          </div>
          <div className="bg-white p-10 rounded-[45px] shadow-xl border border-slate-100 lg:sticky lg:top-6">
            <h3 className="text-xl font-black uppercase italic mb-6 border-l-8 border-amber-500 pl-4">{t("leaveReviewTitle")}</h3>
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} onClick={() => setRating(s)}
                  className={`transition-transform hover:scale-125 ${s <= (hover || rating) ? "text-amber-500" : "text-slate-300"}`} aria-label={`${s} ${starAriaBase}`}>
                  <Star className="w-8 h-8" fill="currentColor" strokeWidth={2.5} />
                </button>
              ))}
            </div>
            <input type="text" placeholder={t("yourNamePlaceholder")}
              className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-amber-500 mb-3 font-black uppercase outline-none focus:bg-white text-sm"
              value={numeFeedback} onChange={(e) => setNumeFeedback(e.target.value)} />
            <textarea placeholder={t("commentPlaceholder")}
              className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-amber-500 mb-4 font-bold outline-none h-28 resize-none focus:bg-white text-sm"
              value={mesajFeedback} onChange={(e) => setMesajFeedback(e.target.value)} />
            <button onClick={trimiteFeedback} disabled={incarcareFeedback}
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase hover:bg-amber-500 hover:text-black transition-all shadow-lg border-b-4 border-slate-700 active:translate-y-1 disabled:opacity-50 text-sm">
              {incarcareFeedback ? t("sendingBtn") : t("sendReviewBtn")}
            </button>
          </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-6xl mb-10 relative z-10">
        <h3 className="text-2xl font-black uppercase italic mb-8 border-l-8 border-amber-500 pl-4">{t("recentReviewsTitle")}</h3>
        {feedbacks.length > 0 ? (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {feedbacks.map((f) => (
              <div key={f.id} className="break-inside-avoid bg-white p-8 rounded-[40px] shadow-md border border-slate-50 hover:border-amber-200 hover:shadow-lg transition-all flex flex-col gap-4">
                <div>
                  <div className="flex gap-1 mb-2">{Array.from({ length: f.stele }).map((_, i) => <Star key={i} className="w-4 h-4 text-amber-500" fill="currentColor" strokeWidth={2.5} />)}</div>
                  <p className="font-black text-[12px] text-amber-500 uppercase mb-2">{f.nume_client}</p>
                  <p className="font-bold italic text-slate-700">"{f.comentariu}"</p>
                </div>
                {f.raspuns_admin && (
                  <div className="ml-2 p-6 bg-slate-900 rounded-3xl border-l-4 border-amber-500">
                    <p className="text-[10px] font-black text-amber-500 uppercase mb-1 tracking-widest italic">{t("salonReplyLabel")}</p>
                    <p className="text-white text-sm font-bold italic">"{f.raspuns_admin}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 p-12 rounded-[40px] text-center border-2 border-dashed border-slate-200">
            <p className="text-slate-400 italic font-bold">{t("noReviewsYet")}</p>
          </div>
        )}
      </div>

      <div className="w-full max-w-2xl text-center py-10 opacity-30 relative z-10">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">{t("footerText")}</p>
      </div>
    </main>
  );
}

export default function RezervarePage() {
  const t = useTranslations("rezervare");
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-black italic">{t("syncing")}</div>}>
      <RezervareContent />
    </Suspense>
  );
}