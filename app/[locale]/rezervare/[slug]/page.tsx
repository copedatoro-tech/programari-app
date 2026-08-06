"use client";

import { useState, useEffect, Suspense, useCallback, useMemo, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import Script from "next/script";
import { supabase } from "@/lib/supabaseClient";
import { useTranslations } from "next-intl";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { ChronosTimePicker, ChronosDatePicker } from "@/components/ChronosDateTimePickers";
import { CalendarDays, Clock3, Star, X, Check } from "lucide-react";

interface StaffRow { id: string; name: string; services: string[]; working_hours?: any; photo_url?: string | null }
interface ServiceRow { id: string; nume_serviciu: string; price: number; duration: number }
interface ExistingAppointment { time: string; duration: number }
interface WorkingHourEntry { day: string; start: string; end: string; closed: boolean; work_location_id?: string }
type WorkLocation = { id: string; name: string; address: string };
interface AdminProfile { full_name: string | null; avatar_url: string | null; phone: string | null; email: string | null; work_locations: WorkLocation[] }

const DAY_NAMES_LONG = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];

type LimitReason = "plan_limit" | "hour_blocked" | "day_closed" | "outside_hours" | "service_overlap" | "already_booked";

const MAX_SERVICES_PER_BOOKING = 5;

function addMinutesToTime(timeStr: string, minutes: number): string {
  if (!timeStr || timeStr === "00:00") return "00:00";
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function toWaLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountryCode = digits.startsWith("0") ? "4" + digits : digits;
  return `https://wa.me/${withCountryCode}`;
}
function toMapsLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function parseWH(whData: any): WorkingHourEntry[] {
  if (!whData) return [];
  if (typeof whData === "string") {
    try { return JSON.parse(whData); } catch { return []; }
  }
  return Array.isArray(whData) ? whData : [];
}

function mkKey(date: string, specialistId: string) {
  return `${date}|${specialistId || ""}`;
}

declare global {
  interface Window {
    onTurnstileSuccess?: (token: string) => void;
    onTurnstileExpired?: () => void;
  }
}

// --- POPUPS ----------------------------------------------------------------
function ChronosPopup({ icon, title, message, onClose }: { icon: string; title: string; message: string; onClose: () => void }) {
  const t = useTranslations("rezervare");
  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[800] flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white w-full max-w-[400px] rounded-[40px] p-10 text-center shadow-2xl border-[4px] border-amber-500 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-6 text-slate-300 hover:text-red-500 transition-colors">
          <X className="w-6 h-6" strokeWidth={3} />
        </button>
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
        <button onClick={onClose} className="absolute top-4 right-6 text-slate-300 hover:text-red-500 transition-colors">
          <X className="w-6 h-6" strokeWidth={3} />
        </button>
        <Star className="w-12 h-12 mx-auto mb-4 text-amber-500" fill="currentColor" strokeWidth={2.5} />
        <h3 className="text-amber-500 font-black uppercase italic text-2xl mb-2">{t("thanksTitle")}</h3>
        <p className="text-slate-700 font-bold italic">{t("thanksText")}</p>
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ----------------------------------------------------------
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
  const [selectedWorkLocationId, setSelectedWorkLocationId] = useState("");
  const [showWorkLocationPicker, setShowWorkLocationPicker] = useState(false);
  const [adminManualBlocks, setAdminManualBlocks] = useState<Record<string, string[]>>({});
  const [paymentConfig, setPaymentConfig] = useState<{ required:boolean; onboarded: boolean; slug: string | null }>({
    required: false, onboarded: false, slug: null,
  });
  const [allowDocuments, setAllowDocuments] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<{name:string;url:string}[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [appointmentsByDate, setAppointmentsByDate] = useState<Record<string, ExistingAppointment[]>>({});

  const [savedUserProfiles, setSavedUserProfiles] = useState<{ nume: string; telefon: string; email: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 🔒 Token Cloudflare Turnstile — confirmă că cel ce trimite formularul e om, nu bot
  const [turnstileToken, setTurnstileToken] = useState<string>("");

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
  const [specialistPickerBookingId, setSpecialistPickerBookingId] = useState<string | null>(null);
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

  // 🔒 Înregistrăm callback-urile globale pentru widget-ul Turnstile
  useEffect(() => {
    window.onTurnstileSuccess = (token: string) => setTurnstileToken(token);
    window.onTurnstileExpired = () => setTurnstileToken("");
    return () => {
      window.onTurnstileSuccess = undefined;
      window.onTurnstileExpired = undefined;
    };
  }, []);

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
      const { data, error } = await supabase.from("profiles_public").select("id").eq("slug", slug).single();
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
        supabase.from("profiles_public").select("working_hours, manual_blocks, has_stripe_account, stripe_onboarded, currency, require_payment_at_booking, slug, avatar_url, full_name, phone, email, work_locations, allow_client_documents").eq("id", adminId).single(),
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
          work_locations: Array.isArray(profileRes.data.work_locations) ? profileRes.data.work_locations : [],
        });
        setAdminWorkingHours(parseWH(profileRes.data.working_hours));
        if (profileRes.data.manual_blocks && typeof profileRes.data.manual_blocks === "object") {
          setAdminManualBlocks(profileRes.data.manual_blocks as Record<string, string[]>);
        }
        setPaymentConfig({
          required: !!profileRes.data.require_payment_at_booking,
          onboarded: !!profileRes.data.stripe_onboarded && !!profileRes.data.has_stripe_account,
          slug: profileRes.data.slug || null,
        });
        setAllowDocuments(!!profileRes.data.allow_client_documents);
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
    const locations = adminProfile?.work_locations || [];
    if (locations.length === 0) {
      setSelectedWorkLocationId("");
      return;
    }
    if (!selectedWorkLocationId || !locations.some((loc) => loc.id === selectedWorkLocationId)) {
      setSelectedWorkLocationId(locations[0].id);
    }
  }, [adminProfile?.work_locations, selectedWorkLocationId]);

  const selectedWorkLocation = useMemo(() => {
    const locations = adminProfile?.work_locations || [];
    return locations.find((loc) => loc.id === selectedWorkLocationId) || locations[0] || null;
  }, [adminProfile?.work_locations, selectedWorkLocationId]);

  // Available services and staff should be filtered by the selected work location
  const availableServicii = useMemo(() => {
    const loc = selectedWorkLocation as any;
    if (!loc) return servicii;
    if (Array.isArray(loc.service_ids) && loc.service_ids.length > 0) {
      return servicii.filter((s) => loc.service_ids.includes(s.id));
    }
    return servicii;
  }, [servicii, selectedWorkLocation]);

  const availableSpecialisti = useMemo(() => {
    const loc = selectedWorkLocation as any;
    if (!loc) return specialisti;
    if (Array.isArray(loc.staff_ids) && loc.staff_ids.length > 0) {
      return specialisti.filter((s) => loc.staff_ids.includes(s.id));
    }
    return specialisti;
  }, [specialisti, selectedWorkLocation]);

  useEffect(() => {
    if (adminId) fetchAppointmentsForDate(today, "");
  }, [adminId, today, fetchAppointmentsForDate]);

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

  // 🔒 Notă securitate: canalul realtime de mai jos NU mai ascultă tabelul "profiles"
  // direct (RLS blochează acum accesul public la tabelul original). Configurarea
  // salonului se reîmprospătează printr-un polling ușor la fiecare 60s, în useEffect-ul
  // separat de mai jos. Rămâne neschimbat doar realtime-ul pentru "appointments" și
  // "feedbacks", care nu sunt afectate.
  useEffect(() => {
    if (!adminId) return;
    configChannelRef.current = supabase
      .channel(`config-${adminId}`)
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

  useEffect(() => {
    if (!adminId) return;
    const interval = setInterval(() => {
      fetchAdminConfig();
    }, 60000);
    return () => clearInterval(interval);
  }, [adminId, fetchAdminConfig]);

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

  // ⚠️ Limita de maxim 5 servicii per rezervare — previne spam-ul de programări
  // multiple nelimitate într-o singură trimitere.
  const addBookingCard = () => {
    if (bookings.length >= MAX_SERVICES_PER_BOOKING) {
      setPopup({
        icon: "⚠️",
        title: t("attentionTitle"),
        message: `Poți adăuga maxim ${MAX_SERVICES_PER_BOOKING} servicii într-o singură rezervare.`,
      });
      return;
    }
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
      case "hour_blocked": return { icon: "⏰", title: t("popupHourBlockedTitle"), message: t("popupHourBlockedMsg") };
      case "day_closed": return { icon: "🚫", title: t("popupDayClosedTitle"), message: t("popupDayClosedMsg") };
      case "outside_hours": return { icon: "🕐", title: t("popupOutsideHoursTitle"), message: t("popupOutsideHoursMsg") };
      case "service_overlap": return { icon: "⚠️", title: t("popupOverlapTitle"), message: t("popupOverlapMsg") };
      case "plan_limit": return { icon: "🚫", title: t("popupPlanLimitTitle"), message: t("popupPlanLimitMsg") };
      case "already_booked": return { icon: "⚠️", title: t("popupAlreadyBookedTitle"), message: t("popupAlreadyBookedMsg") };
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
    // ⚠️ FIX: /api/waitlist cere acum și turnstileToken (la fel ca la
    // create-booking) — fără el, ruta respinge cererea cu eroare de
    // securitate. Verificăm aici, înainte de a trimite, ca să dăm un mesaj
    // clar userului în loc de o eroare seacă din backend.
    if (!turnstileToken) {
      setPopup({ icon: "⏳", title: t("attentionTitle"), message: "Te rugăm să aștepți finalizarea verificării de securitate, apoi încearcă din nou." });
      return;
    }
    setWaitlistSaving(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turnstileToken,
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (uploadedDocs.length + files.length > 5) {
      setPopup({ icon: "⚠️", title: t("attentionTitle"), message: t("maxDocumentsMsg") });
      e.target.value = "";
      return;
    }
    setUploadingDoc(true);
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setPopup({ icon: "⚠️", title: t("attentionTitle"), message: t("fileTooLargeMsg") });
        continue;
      }
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("adminId", adminId);
        const res = await fetch("/api/upload-booking-document", { method: "POST", body: fd });
        const json = await res.json();
        if (res.ok && json.url) {
          setUploadedDocs((prev) => [...prev, { name: json.name, url: json.url }]);
        } else {
          setPopup({ icon: "❌", title: t("errorTitle"), message: json.error || t("errorDefaultMsg") });
        }
      } catch {
        setPopup({ icon: "❌", title: t("errorTitle"), message: t("errorDefaultMsg") });
      }
    }
    setUploadingDoc(false);
    e.target.value = "";
  };

  const removeUploadedDoc = (idx: number) => {
    setUploadedDocs((prev) => prev.filter((_, i) => i !== idx));
  };
  const trimiteRezervare = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, boolean> = {};
    if (!clientInfo.nume.trim()) newErrors.nume = true;
    if (!clientInfo.telefon.trim()) newErrors.telefon = true;
    if (!clientInfo.email.trim()) newErrors.email = true;

    const invalidBookings = bookings.some(b => !b.serviciu_id || b.ora === "00:00");
    const needsLocation = (adminProfile?.work_locations || []).length > 1 && !selectedWorkLocation;
    if (invalidBookings || needsLocation) {
      setPopup({ icon: "⚠️", title: t("incompleteTitle"), message: needsLocation ? t("chooseWorkLocationMsg") : t("incompleteMsg") });
      setErrors(newErrors);
      return;
    }

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    // 🔒 Verificăm că widget-ul Turnstile a confirmat că nu e bot, înainte să trimitem orice
    if (!turnstileToken) {
      setPopup({ icon: "⏳", title: t("attentionTitle"), message: "Te rugăm să aștepți finalizarea verificării de securitate, apoi încearcă din nou." });
      return;
    }

    setLoading(true);
    try {
      if (paymentConfig.required && paymentConfig.onboarded) {
        // Fluxul cu plata online rămâne pe ruta Stripe existentă
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
            workLocation: selectedWorkLocation ? {
              id: selectedWorkLocation.id,
              name: selectedWorkLocation.name,
              address: selectedWorkLocation.address,
              mapsUrl: toMapsLink(selectedWorkLocation.address),
            } : null,
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

      // 🔒 Fluxul fără plată trece acum prin API-ul securizat /api/create-booking,
      // care verifică Turnstile, limita de servicii, rate limiting per IP și
      // limita de plan a salonului, pe server (nu se mai poate ocoli din browser).
      const res = await fetch("/api/create-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turnstileToken,
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
          documente: uploadedDocs,
          workLocation: selectedWorkLocation ? {
            id: selectedWorkLocation.id,
            name: selectedWorkLocation.name,
            address: selectedWorkLocation.address,
            mapsUrl: toMapsLink(selectedWorkLocation.address),
          } : null,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.code === "plan_limit") {
          setPopup(getLimitPopupContent("plan_limit"));
        } else {
          setPopup({ icon: "❌", title: t("errorTitle"), message: result.error || t("errorDefaultMsg") });
        }
        setLoading(false);
        return;
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
    const locationFilteredStaffWH = selectedWorkLocationId
      ? staffWH.filter((h) => !h.work_location_id || h.work_location_id === selectedWorkLocationId)
      : staffWH;
    return locationFilteredStaffWH.length > 0 ? locationFilteredStaffWH : adminWorkingHours;
  }, [activeBooking?.specialist_id, specialisti, adminWorkingHours, selectedWorkLocationId]);

  const avgRating = feedbacks.length > 0
    ? (feedbacks.reduce((sum, f) => sum + (f.stele || 0), 0) / feedbacks.length)
    : 0;
  const starAriaBase = localeCode.startsWith("ro") ? "stele" : "stars";

  if (technicalError) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="fixed top-4 right-4 z-[700]"><LocaleSwitcher /></div>
        <div className="max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
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

      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />

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
              onClose={() => setPickerControl(null)}
              workingHours={effectiveWorkingHours}
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

      {showWorkLocationPicker && (adminProfile?.work_locations?.length || 0) > 1 && (
        <div
          className="fixed inset-0 z-[835] bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowWorkLocationPicker(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-2xl rounded-[36px] p-6 md:p-8 shadow-2xl border-t-[8px] border-amber-500 max-h-[82vh] flex flex-col"
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-[10px] font-black uppercase italic text-slate-400 tracking-widest">{t("workLocationTitle")}</p>
                <h3 className="text-2xl font-black uppercase italic text-slate-900 tracking-tighter">{t("workLocationHint")}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWorkLocationPicker(false)}
                className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
              >
                <X className="w-5 h-5" strokeWidth={3} />
              </button>
            </div>

            <div className="overflow-y-auto pr-2 space-y-3">
              {adminProfile?.work_locations.map((loc) => {
                const selected = selectedWorkLocationId === loc.id;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      setSelectedWorkLocationId(loc.id);
                      setShowWorkLocationPicker(false);
                    }}
                    className={`w-full text-left rounded-[24px] border-2 p-5 transition-all ${selected ? "border-amber-500 bg-amber-50 shadow-lg" : "border-slate-200 bg-white hover:border-amber-300"}`}
                  >
                    <p className="text-sm font-black text-slate-900 uppercase italic">{loc.name || t("defaultWorkLocationName")}</p>
                    <p className="text-xs font-bold text-slate-500 mt-1">{loc.address}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {specialistPickerBookingId && (() => {
        const bookingForPicker = bookings.find((b) => b.id === specialistPickerBookingId);
        if (!bookingForPicker) return null;
        const availableSpecialists = availableSpecialisti.filter(s => !bookingForPicker.serviciu_id || s.services.includes(bookingForPicker.serviciu_id));
        return (
          <div className="fixed inset-0 z-[840] bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSpecialistPickerBookingId(null)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-2xl rounded-[36px] p-6 md:p-8 shadow-2xl border-t-[8px] border-amber-500 max-h-[82vh] flex flex-col">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <span className="text-[9px] font-black uppercase italic text-amber-500 tracking-widest">{t("expertLabel")}</span>
                  <h3 className="text-xl md:text-2xl font-black uppercase italic text-slate-900 tracking-tighter">{t("chooseSpecialistBtn")}</h3>
                </div>
                <button type="button" onClick={() => setSpecialistPickerBookingId(null)} className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                  <X className="w-5 h-5" strokeWidth={3} />
                </button>
              </div>
              <div className="overflow-y-auto pr-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-1">
                  <button
                    type="button"
                    onClick={() => { updateBooking(specialistPickerBookingId, { specialist_id: "" }); setSpecialistPickerBookingId(null); }}
                    className={`min-h-[132px] rounded-[26px] border-2 p-3 flex flex-col items-center justify-center gap-2 transition-all ${!bookingForPicker.specialist_id ? "border-amber-500 bg-amber-50 shadow-lg" : "border-slate-200 bg-white hover:border-amber-300"}`}
                  >
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-md border-2 ${!bookingForPicker.specialist_id ? "bg-amber-500 border-amber-500 text-slate-950" : "bg-slate-100 border-white text-slate-500"}`}>
                      <span className="relative w-9 h-9 block">
                        <span className="absolute left-1/2 top-1 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-[3px] border-current"></span>
                        <span className="absolute left-1/2 bottom-1 -translate-x-1/2 w-7 h-4 rounded-t-full border-[3px] border-current border-b-0"></span>
                        <span className="absolute -right-1 bottom-0 w-4 h-4 rounded-full bg-white text-amber-500 flex items-center justify-center shadow-sm">
                          <Check className="w-2.5 h-2.5" strokeWidth={4} />
                        </span>
                      </span>
                    </div>
                    <span className="text-[9px] font-black uppercase italic text-slate-700 text-center leading-tight">{t("firstAvailOpt")}</span>
                  </button>
                  {availableSpecialists.map((sp) => {
                    const selected = bookingForPicker.specialist_id === sp.id;
                    return (
                      <button
                        type="button"
                        key={sp.id}
                        onClick={() => { updateBooking(specialistPickerBookingId, { specialist_id: sp.id }); setSpecialistPickerBookingId(null); }}
                        className={`min-h-[132px] rounded-[26px] border-2 p-3 flex flex-col items-center justify-center gap-2 transition-all ${selected ? "border-amber-500 bg-amber-50 shadow-lg" : "border-slate-200 bg-white hover:border-amber-300"}`}
                      >
                        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-slate-100 border-[3px] border-white shadow-md flex items-center justify-center">
                          {sp.photo_url ? (
                            <Image src={sp.photo_url} alt={sp.name} fill className="object-cover" />
                          ) : (
                            <span className="text-2xl font-black text-amber-500 uppercase italic">{(sp.name || "?").slice(0, 1)}</span>
                          )}
                        </div>
                        <span className="text-[9px] font-black uppercase italic text-slate-700 text-center leading-tight line-clamp-2">{sp.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {waitlistModal && (
        <div className="fixed inset-0 z-[850] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => { setWaitlistModal(null); setWaitlistJoined(false); }}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-sm rounded-[35px] p-8 shadow-2xl text-center">
            {waitlistJoined ? (
              <>
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white">
                  <Check className="w-8 h-8" strokeWidth={3} />
                </div>
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
                        <span>📱</span> {adminProfile.phone}
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

              {(adminProfile?.work_locations?.length || 0) > 0 && (
                <div className="bg-slate-50 border-2 border-slate-100 rounded-[35px] p-6 space-y-4">
                  <div>
                    <p className="text-[10px] font-black uppercase italic text-slate-400 tracking-widest">{t("workLocationTitle")}</p>
                    <p className="text-xs font-bold text-slate-500 italic">{t("workLocationHint")}</p>
                  </div>

                  <div className="bg-white rounded-[25px] border-2 border-amber-200 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 uppercase italic">{selectedWorkLocation?.name || t("defaultWorkLocationName")}</p>
                      <p className="text-xs font-bold text-slate-500 mt-1">{selectedWorkLocation?.address || ""}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                      {(adminProfile?.work_locations?.length || 0) > 1 && (
                        <button
                          type="button"
                          onClick={() => setShowWorkLocationPicker(true)}
                          className="bg-amber-500 text-slate-950 px-5 py-3 rounded-2xl text-[10px] font-black uppercase italic hover:bg-slate-900 hover:text-amber-500 transition-all"
                        >
                          {t("workLocationTitle")}
                        </button>
                      )}
                      {selectedWorkLocation?.address && (
                        <a href={toMapsLink(selectedWorkLocation.address)} target="_blank" rel="noopener noreferrer" className="bg-slate-900 text-amber-500 px-5 py-3 rounded-2xl text-[10px] font-black uppercase italic hover:bg-amber-500 hover:text-slate-900 transition-all text-center">
                          {t("openMapsBtn")}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="h-px bg-slate-100 w-full"></div>

              <div className="space-y-12">
                {bookings.map((b, index) => (
                  <div key={b.id} className="relative p-8 bg-slate-50 rounded-[45px] border-2 border-slate-200 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="absolute -top-4 left-8 bg-amber-500 text-black px-4 py-1 rounded-full font-black italic text-[10px] uppercase">
                      {t("serviceCardLabel", { n: index + 1 })}
                    </div>
                    {index > 0 && (
                      <button type="button" onClick={() => removeBookingCard(b.id)} className="absolute -top-4 -right-4 bg-red-500 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-900 transition-colors shadow-lg">
                        <X className="w-5 h-5" strokeWidth={3} />
                      </button>
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
                            {availableServicii
                              .filter(s => !b.specialist_id || specialisti.find(sp => sp.id === b.specialist_id)?.services.includes(s.id))
                              .map((s) => (
                                <option key={s.id} value={s.id}>{s.nume_serviciu.toUpperCase()}</option>
                              ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase italic text-slate-400 ml-4">{t("expertLabel")}</label>
                          {(() => {
                            const selectedSpecialist = specialisti.find(sp => sp.id === b.specialist_id);
                            return (
                              <button
                                type="button"
                                onClick={() => setSpecialistPickerBookingId(b.id)}
                                className="w-full bg-white border-2 border-amber-500 rounded-[25px] py-4 px-6 text-[14px] font-black uppercase italic text-slate-900 text-left outline-none cursor-pointer hover:shadow-lg transition-all flex items-center justify-between gap-4"
                              >
                                <span className="truncate">{selectedSpecialist?.name || t("chooseSpecialistBtn")}</span>
                                <span className="text-amber-500 text-xl font-black leading-none shrink-0">›</span>
                              </button>
                            );
                          })()}
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
                        const svc = availableServicii.find(s => s.id === b.serviciu_id) || servicii.find(s => s.id === b.serviciu_id);
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

                {bookings.length < MAX_SERVICES_PER_BOOKING ? (
                  <button type="button" onClick={addBookingCard}
                    className="w-full py-6 border-4 border-dashed border-slate-200 rounded-[35px] text-slate-300 font-black uppercase italic hover:border-amber-500 hover:text-amber-500 transition-all flex items-center justify-center gap-3">
                    <span className="text-2xl">+</span> {t("addServiceBtn")}
                  </button>
                ) : (
                  <p className="text-center text-[10px] font-black uppercase italic text-slate-300">
                    Limita maximă: {MAX_SERVICES_PER_BOOKING} servicii per rezervare
                  </p>
                )}
              </div>

              <div className="space-y-2 mt-4">
                <label className="text-[12px] font-black uppercase italic text-slate-400 ml-4">{t("notesLabel")}</label>
                <textarea placeholder={t("notesPlaceholder")}
                  className="w-full bg-white border-2 border-amber-500 rounded-[25px] py-6 px-8 text-[16px] font-bold outline-none min-h-[100px] resize-none focus:bg-slate-50 transition-all"
                  value={clientInfo.detalii} onChange={(e) => setClientInfo({ ...clientInfo, detalii: e.target.value })} />
              </div>
              {allowDocuments && (
                <div className="space-y-3 mt-4">
                  <label className="text-[12px] font-black uppercase italic text-slate-400 ml-4">{t("documentsLabel")}</label>
                  <label className="flex items-center justify-center gap-2 w-full bg-white border-2 border-dashed border-amber-400 rounded-[25px] py-6 px-8 cursor-pointer hover:bg-amber-50 transition-all">
                    <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={uploadingDoc || uploadedDocs.length >= 5} />
                    <span className="text-[13px] font-black uppercase italic text-amber-600">
                      {uploadingDoc ? t("uploadingLabel") : t("addDocumentsBtn")}
                    </span>
                  </label>
                  {uploadedDocs.length > 0 && (
                    <div className="space-y-2">
                      {uploadedDocs.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-50 rounded-2xl px-5 py-3">
                          <span className="text-[12px] font-bold text-slate-700 truncate">{doc.name}</span>
                          <button type="button" onClick={() => removeUploadedDoc(idx)} className="text-red-500 ml-3 shrink-0 flex items-center">
                            <X className="w-4 h-4" strokeWidth={3} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[9px] font-bold text-slate-400 italic ml-4">{t("documentsHint")}</p>
                </div>
              )}

              {/* 🔒 Widget Cloudflare Turnstile — verificare silențioasă anti-bot */}
              <div className="flex justify-center">
                <div
                  className="cf-turnstile"
                  data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                  data-callback="onTurnstileSuccess"
                  data-expired-callback="onTurnstileExpired"
                />
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
                  <p className="font-bold italic text-slate-700">&ldquo;{f.comentariu}&rdquo;</p>
                </div>
                {f.raspuns_admin && (
                  <div className="ml-2 p-6 bg-slate-900 rounded-3xl border-l-4 border-amber-500">
                    <p className="text-[10px] font-black text-amber-500 uppercase mb-1 tracking-widest italic">{t("salonReplyLabel")}</p>
                    <p className="text-white text-sm font-bold italic">&ldquo;{f.raspuns_admin}&rdquo;</p>
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