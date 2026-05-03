"use client";

import React, {
  useState, useEffect, useMemo, Suspense, useCallback, useRef,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { showToast, showConfirm } from "@/lib/toast";
import { ChronosTimePicker, ChronosDatePicker } from "@/components/ChronosDateTimePickers";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

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

function addMinutesToTime(timeStr: string, minutes: number): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const totalMin = h * 60 + m + minutes;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${newH.toString().padStart(2, "0")}:${newM.toString().padStart(2, "0")}`;
}

function timeToMinutes(t: string): number {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function parseWH(whData: any): WorkingHour[] {
  if (!whData) return [];
  if (typeof whData === "string") {
    try { return JSON.parse(whData); } catch { return []; }
  }
  return Array.isArray(whData) ? whData : [];
}

const dayNamesShort = ["Lun", "Mar", "Mie", "Joi", "Vin", "S\u00e2m", "Dum"];
const dayNamesLong = ["Duminic\u0103", "Luni", "Mar\u021bi", "Miercuri", "Joi", "Vineri", "S\u00e2mb\u0103t\u0103"];
const monthNames = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

type DocumentAttachment = { id: number | string; name: string; url: string };

type Programare = {
  id: any; nume: string; email?: string; data: string; ora: string;
  telefon?: string; motiv?: string; poza?: string; documente: DocumentAttachment[];
  user_id?: string; expertId?: string; serviciuId?: string; duration?: number;
};

type ViewMode = "day" | "week" | "month";
type ManualBlocksMap = Record<string, string[]>;

interface StaffRow { id: string; name: string; services: string[] }
interface ServiceRow { id: string; nume_serviciu: string; price: number; duration: number }
interface WorkingHour { day: string; start: string; end: string; closed: boolean }

const TOTAL_SLOTS_PER_DAY = 96;

function normalizeDocuments(raw: any): DocumentAttachment[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((item: any, idx: number) => {
    if (typeof item === "string") return { id: idx, name: `Document ${idx + 1}`, url: item };
    return { id: item.id ?? idx, name: item.name ?? `Document ${idx + 1}`, url: item.url ?? item };
  });
}

function mapRow(item: any): Programare {
  const rawDate: string = item.date ?? "";
  const dataStr = rawDate.includes("T") ? rawDate.split("T")[0] : rawDate;
  return {
    id: item.id,
    nume: item.title || item.prenume || item.nume || "Client",
    email: item.email ?? "",
    data: dataStr,
    ora: item.time ?? "",
    telefon: item.phone ?? "",
    motiv: item.details ?? "",
    poza: item.poza ?? item.file_url ?? null,
    documente: normalizeDocuments(item.documente),
    expertId: item.angajat_id ?? "",
    serviciuId: item.serviciu_id ?? "",
    duration: item.duration ?? 0,
  };
}

// ─── Date Picker Modal pentru navigare calendar ──────────────────────────────
function DatePickerModal({ currentDate, onSelectDate, onClose }: {
  currentDate: Date;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pickerMonth, setPickerMonth] = useState(new Date(currentDate));

  useEffect(() => {
    function clickOut(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, [onClose]);

  const navPickerMonth = (dir: number) => {
    const d = new Date(pickerMonth);
    d.setMonth(d.getMonth() + dir);
    setPickerMonth(d);
  };

  const pickerGrid = useMemo(() => {
    const year = pickerMonth.getFullYear();
    const month = pickerMonth.getMonth();
    const first = new Date(year, month, 1);
    const start = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Date[] = [];
    for (let i = 0; i < start; i++) cells.push(addDays(first, i - start));
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(addDays(cells[cells.length - 1], 1));
    return cells;
  }, [pickerMonth]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[550] flex items-center justify-center p-4" onClick={onClose}>
      <div ref={containerRef} onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-md rounded-[45px] border-4 border-slate-900 shadow-2xl overflow-hidden">
        <div className="bg-slate-900 p-6 text-center">
          <p className="text-[10px] font-black text-amber-500 uppercase italic tracking-[0.3em]">Chronos Navigation</p>
          <h3 className="text-xl font-black text-white uppercase italic">Alege o dat\u0103</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navPickerMonth(-1)} className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-amber-500 hover:text-white rounded-2xl font-black transition-all">&#9664;</button>
            <p className="text-sm font-black uppercase italic text-slate-900">
              {monthNames[pickerMonth.getMonth()]} <span className="text-amber-600">{pickerMonth.getFullYear()}</span>
            </p>
            <button onClick={() => navPickerMonth(1)} className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-amber-500 hover:text-white rounded-2xl font-black transition-all">&#9654;</button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {dayNamesShort.map((d) => (
              <div key={d} className="text-center text-[9px] font-black text-slate-400 uppercase italic">{d}</div>
            ))}
            {pickerGrid.map((day, idx) => (
              <button key={idx} onClick={() => { onSelectDate(day); onClose(); }}
                className={`aspect-square rounded-xl text-[10px] font-black flex items-center justify-center transition-all
                  ${day.getMonth() !== pickerMonth.getMonth() ? "opacity-20" : "opacity-100"}
                  ${sameDay(day, currentDate) ? "bg-amber-500 text-white" : "hover:bg-slate-100 text-slate-900"}`}>
                {day.getDate()}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="w-full py-4 bg-slate-100 text-slate-900 rounded-[20px] font-black uppercase italic text-[10px]">
            \u00cenchi\u00f9e
          </button>
        </div>
      </div>
    </div>
  );
}

function CalendarContent() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const modalRef = useRef<HTMLDivElement>(null);
  const qClient = useQueryClient();

  const today = new Date().toISOString().split("T")[0];
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExpert, setSelectedExpert] = useState("");
  const [selectedServiciu, setSelectedServiciu] = useState("");
  const [editForm, setEditForm] = useState<Programare | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
    staleTime: Infinity,
  });

  const userId = session?.user?.id;

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("plan_type, trial_started_at, manual_blocks, working_hours")
        .eq("id", userId!)
        .single();
      return data;
    },
  });

  const { data: rawStaff = [] } = useQuery<StaffRow[]>({
    queryKey: ["staff", userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data } = await supabase.from("staff").select("id, name, services").eq("user_id", userId!);
      return data ?? [];
    },
  });

  const { data: rawServices = [] } = useQuery<ServiceRow[]>({
    queryKey: ["services", userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data } = await supabase.from("services").select("id, nume_serviciu, price, duration").eq("user_id", userId!);
      return data ?? [];
    },
  });

  const dateRange = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const start = new Date(year, month - 2, 1).toISOString().split("T")[0];
    const end = new Date(year, month + 3, 0).toISOString().split("T")[0];
    return { start, end };
  }, [selectedDate.getFullYear(), selectedDate.getMonth()]);

  const { data: programari = [], isLoading: loadingAppts, refetch: refetchAppts } = useQuery<Programare[]>({
    queryKey: ["appointments", userId, dateRange.start, dateRange.end],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, title, prenume, nume, email, date, time, details, phone, poza, file_url, documente, angajat_id, serviciu_id, duration")
        .eq("user_id", userId!)
        .gte("date", dateRange.start)
        .lte("date", dateRange.end)
        .order("date", { ascending: true });
      if (error) { console.error("[Calendar] Eroare fetch appointments:", error); return []; }
      return (data ?? []).map(mapRow);
    },
  });

  useEffect(() => {
    if (!userId) return;
    const profileChannel = supabase
      .channel(`calendar-profile-${userId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` }, () => { refetchProfile(); })
      .subscribe();
    const appointmentsChannel = supabase
      .channel(`calendar-appointments-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `user_id=eq.${userId}` }, () => { refetchAppts(); })
      .subscribe();
    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(appointmentsChannel);
    };
  }, [userId, refetchProfile, refetchAppts]);

  const adminWorkingHours = useMemo<WorkingHour[]>(() => parseWH(profile?.working_hours), [profile?.working_hours]);

  const adminManualBlocks = useMemo<ManualBlocksMap>(() => {
    const raw = profile?.manual_blocks;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return raw as ManualBlocksMap;
  }, [profile?.manual_blocks]);

  const { userSubscription } = useMemo(() => {
    if (!profile) return { userSubscription: null };
    const rawPlan = (profile.plan_type || "CHRONOS FREE").toUpperCase();
    let planFinal = rawPlan;
    if (profile.trial_started_at) {
      const start = new Date(profile.trial_started_at).getTime();
      if (Date.now() - start < 10 * 24 * 60 * 60 * 1000) planFinal = "CHRONOS TEAM";
    }
    return {
      userSubscription: {
        plan: planFinal,
        max_appointments: planFinal.includes("TEAM") ? 99999 : planFinal.includes("ELITE") ? 500 : planFinal.includes("PRO") ? 150 : 30,
        max_experts: planFinal.includes("TEAM") ? 50 : planFinal.includes("ELITE") ? 5 : 1,
      },
    };
  }, [profile]);

  // ─── isDateBlocked: verifică DOAR program + blocări manuale (fără suprapuneri programări) ──
  const isDateBlocked = useCallback((dateStr: string, timeStr?: string, serviceDuration?: number) => {
    const daySlots: string[] = adminManualBlocks[dateStr] || [];
    if (daySlots.length >= TOTAL_SLOTS_PER_DAY - 2) return { blocked: true, reason: "Zi blocat\u0103 manual" };

    const dateObj = new Date(dateStr + "T00:00:00");
    const dayName = dayNamesLong[dateObj.getDay()];
    const daySchedule = adminWorkingHours.find((h) => h.day === dayName);
    if (daySchedule?.closed) return { blocked: true, reason: "\u00cenchis (Weekend/S\u0103rb\u0103toare)" };

    if (timeStr && daySchedule) {
      if (timeStr < daySchedule.start || timeStr > daySchedule.end)
        return { blocked: true, reason: `\u00cen afara programului (${daySchedule.start}-${daySchedule.end})` };
      if (serviceDuration && serviceDuration > 0) {
        const endTime = addMinutesToTime(timeStr, serviceDuration);
        if (endTime > daySchedule.end) return { blocked: true, reason: `Serviciul dep\u0103\u015fe\u015fte programul (${daySchedule.end})` };
      }
    }

    if (timeStr && daySlots.length > 0) {
      const [h, m] = timeStr.split(":").map(Number);
      const checkMinutes = serviceDuration && serviceDuration > 0 ? serviceDuration : 60;
      const subSlots: string[] = [];
      for (let i = 0; i < checkMinutes; i += 15) {
        const totalMin = m + i;
        const sH = h + Math.floor(totalMin / 60);
        const sM = totalMin % 60;
        if (sH < 24) subSlots.push(`${sH.toString().padStart(2, "0")}:${sM.toString().padStart(2, "0")}`);
      }
      if (subSlots.some((slot) => daySlots.includes(slot))) return { blocked: true, reason: "Or\u0103 blocat\u0103" };
    }

    return { blocked: false };
  }, [adminManualBlocks, adminWorkingHours]);

  const isDayFullyOccupied = useCallback((dateStr: string): boolean => {
    const dateObj = new Date(dateStr + "T00:00:00");
    const dayName = dayNamesLong[dateObj.getDay()];
    const daySchedule = adminWorkingHours.find((h) => h.day === dayName);
    if (!daySchedule || daySchedule.closed) return true;
    const dayAppts = programari.filter((p) => p.data === dateStr);
    const dayBlocks = adminManualBlocks[dateStr] || [];
    if (dayBlocks.length >= TOTAL_SLOTS_PER_DAY - 2) return true;
    const startMin = timeToMinutes(daySchedule.start);
    const endMin = timeToMinutes(daySchedule.end);
    const totalWorkMinutes = endMin - startMin;
    const occupiedMinutes = dayAppts.reduce((acc, appt) => acc + (appt.duration && appt.duration > 0 ? appt.duration : 30), 0);
    return occupiedMinutes >= totalWorkMinutes;
  }, [adminWorkingHours, programari, adminManualBlocks]);

  // ─── Programările existente pt TimePicker — exclude programarea curentă cu String() ──
  const editExistingAppointments = useMemo(() => {
    if (!editForm) return [];
    return programari
      .filter((p) => p.data === editForm.data && String(p.id) !== String(editForm.id))
      .map((p) => ({ time: p.ora, duration: p.duration || 30 }));
  }, [programari, editForm?.data, editForm?.id]);

  const editServiceDuration = useMemo(() => {
    if (!editForm?.serviciuId) return 0;
    return rawServices.find((s) => s.id === editForm.serviciuId)?.duration || 0;
  }, [editForm?.serviciuId, rawServices]);

  useEffect(() => {
    if (editForm) {
      const srvName = rawServices.find((s) => s.id === editForm.serviciuId)?.nume_serviciu;
      setCustomMessage(
        `Bun\u0103, ${editForm.nume}! Te a\u015ftept\u0103m la programarea din ${editForm.data}, ora ${editForm.ora}${srvName ? ` pentru ${srvName}` : ""}. O zi bun\u0103!`
      );
    }
  }, [editForm?.id, editForm?.data, editForm?.ora, editForm?.serviciuId, rawServices]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node) &&
          !showEditDatePicker && !showEditTimePicker) {
        handleCloseModal();
      }
    }
    if (editForm) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editForm, showEditDatePicker, showEditTimePicker]);

  const handleOpenEdit = (p: Programare) => {
    setEditForm({ ...p });
    setShowEditDatePicker(false);
    setShowEditTimePicker(false);
  };

  const handleCloseModal = () => {
    setEditForm(null);
    setShowEditDatePicker(false);
    setShowEditTimePicker(false);
  };

  // ─── Filtre specialist/serviciu — independente, fără reset reciproc ──────────
  const angajatiFiltratiInModal = useMemo(() => {
    if (!editForm?.serviciuId) return rawStaff;
    return rawStaff.filter((a) => a.services?.includes(editForm.serviciuId!));
  }, [editForm?.serviciuId, rawStaff]);

  const serviciiFiltrateInModal = useMemo(() => {
    if (!editForm?.expertId) return rawServices;
    const angajat = rawStaff.find((a) => a.id === editForm.expertId);
    if (!angajat || !angajat.services?.length) return rawServices;
    return rawServices.filter((s) => angajat.services.includes(s.id));
  }, [editForm?.expertId, rawStaff, rawServices]);

  // ─── Handler schimbare specialist — păstrează serviciul dacă e compatibil ───
  const handleExpertChange = useCallback((expertId: string) => {
    if (!editForm) return;
    const angajat = rawStaff.find((a) => a.id === expertId);
    const currentServiceStillValid = editForm.serviciuId && angajat?.services?.includes(editForm.serviciuId);
    setEditForm((prev) => prev ? {
      ...prev,
      expertId,
      serviciuId: currentServiceStillValid ? prev.serviciuId : "",
    } : null);
  }, [editForm, rawStaff]);

  // ─── Handler schimbare serviciu — păstrează specialistul dacă e compatibil ─
  const handleServiciuChange = useCallback((serviciuId: string) => {
    if (!editForm) return;
    const angajat = rawStaff.find((a) => a.id === editForm.expertId);
    const currentExpertStillValid = editForm.expertId && angajat?.services?.includes(serviciuId);
    setEditForm((prev) => prev ? {
      ...prev,
      serviciuId,
      expertId: currentExpertStillValid ? prev.expertId : "",
    } : null);
  }, [editForm, rawStaff]);

  const handleUpdate = async () => {
    if (!editForm) return;
    const service = rawServices.find((s) => s.id === editForm.serviciuId);
    const duration = service?.duration || editForm.duration || 0;

    // Validare dată în trecut
    const nowDate = new Date();
    const todayStr = formatDateKey(nowDate);
    if (editForm.data < todayStr) {
      await showToast({ message: "Nu po\u021bi seta o programare \u00een trecut.", type: "error", title: "Data invalid\u0103" });
      return;
    }
    if (editForm.data === todayStr && editForm.ora) {
      const currentMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
      if (timeToMinutes(editForm.ora) < currentMinutes) {
        await showToast({ message: "Ora aleas\u0103 a trecut deja. Alege o or\u0103 viitoare.", type: "error", title: "Or\u0103 invalid\u0103" });
        return;
      }
    }

    // Validare program de lucru + blocări manuale
    const scheduleCheck = isDateBlocked(editForm.data, editForm.ora, duration);
    if (scheduleCheck.blocked) {
      await showToast({ message: `Indisponibil: ${scheduleCheck.reason}`, type: "error", title: "Eroare" });
      return;
    }

    // Verificare suprapunere cu ALTE programări (direct din DB, exclude ID-ul curent)
    if (editForm.ora && duration > 0) {
      const { data: aptsInZi } = await supabase
        .from("appointments")
        .select("id, time, duration")
        .eq("user_id", userId!)
        .eq("date", editForm.data)
        .neq("id", editForm.id);

      if (aptsInZi && aptsInZi.length > 0) {
        const newStart = timeToMinutes(editForm.ora);
        const newEnd = newStart + duration;
        const overlap = aptsInZi.some((a: any) => {
          const aStart = timeToMinutes(a.time);
          const aEnd = aStart + (a.duration > 0 ? a.duration : 30);
          return newStart < aEnd && newEnd > aStart;
        });
        if (overlap) {
          await showToast({ message: "Intervalul se suprapune cu o alt\u0103 programare.", type: "error", title: "Conflict" });
          return;
        }
      }
    }

    // Salvare
    const { error } = await supabase.from("appointments").update({
      title: editForm.nume, prenume: editForm.nume, nume: editForm.nume,
      email: editForm.email || null, date: editForm.data, time: editForm.ora,
      duration: duration, phone: editForm.telefon || null,
      details: editForm.motiv || null, angajat_id: editForm.expertId || null,
      serviciu_id: editForm.serviciuId || null, poza: editForm.poza || null,
      documente: editForm.documente,
    }).eq("id", editForm.id);

    if (error) { await showToast({ message: error.message, type: "error" }); return; }
    qClient.invalidateQueries({ queryKey: ["appointments", userId] });
    await showToast({ message: "Programare actualizat\u0103 cu succes!", type: "success" });
    handleCloseModal();
  };

  const handleDelete = async () => {
    if (!editForm) return;
    const confirmed = await showConfirm({
      title: "\u015etearger\u0103 Programare",
      message: `Sigur \u015ftergi programarea lui ${editForm.nume}?`,
      confirmText: "Da, \u015etearger\u0103",
      type: "danger",
    });
    if (!confirmed) return;
    await supabase.from("appointments").delete().eq("id", editForm.id);
    qClient.invalidateQueries({ queryKey: ["appointments", userId] });
    handleCloseModal();
  };

  const sendWhatsAppReminder = async () => {
    const clean = editForm?.telefon?.replace(/\D/g, "");
    window.open(`https://wa.me/${clean?.startsWith("0") ? "4" + clean : clean}?text=${encodeURIComponent(customMessage)}`, "_blank");
  };

  const filteredProgramari = useMemo(() =>
    programari.filter((p) => {
      const matchSearch = !searchTerm || p.nume.toLowerCase().includes(searchTerm.toLowerCase()) || p.telefon?.includes(searchTerm);
      const matchExpert = !selectedExpert || p.expertId === selectedExpert;
      const matchServiciu = !selectedServiciu || p.serviciuId === selectedServiciu;
      return matchSearch && matchExpert && matchServiciu;
    }).sort((a, b) => a.ora.localeCompare(b.ora)),
    [programari, searchTerm, selectedExpert, selectedServiciu]
  );

  const programariByDate = useMemo(() => {
    const map: Record<string, Programare[]> = {};
    filteredProgramari.forEach((p) => {
      const key = p.data;
      if (key) { if (!map[key]) map[key] = []; map[key].push(p); }
    });
    return map;
  }, [filteredProgramari]);

  const nav = (dir: number) => {
    const d = new Date(selectedDate);
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

  const hasWhatsAppAccess = userSubscription?.plan.includes("ELITE") || userSubscription?.plan.includes("TEAM");

  const AppointmentChip = ({ p }: { p: Programare }) => {
    const svc = rawServices.find((s) => s.id === p.serviciuId);
    const endTime = svc?.duration ? addMinutesToTime(p.ora, svc.duration) : null;
    return (
      <button
        onClick={(e) => { e.stopPropagation(); handleOpenEdit(p); }}
        className="w-full text-left bg-slate-900 text-white rounded-xl truncate font-black uppercase italic border border-slate-700 hover:bg-amber-600 transition-all text-[9px] px-2 py-1.5"
        title={`${p.ora}${endTime ? ` - ${endTime}` : ""} | ${p.nume} | ${svc?.nume_serviciu || "Expert"}`}>
        {p.ora}{endTime ? `\u2192${endTime}` : ""} {p.nume}
      </button>
    );
  };

  if (!userId && !isDemo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black italic text-slate-400 uppercase">
        Autentificare necesar\u0103...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-2 md:p-8 flex flex-col items-center font-sans">

      {showDatePickerModal && (
        <DatePickerModal
          currentDate={selectedDate}
          onSelectDate={goToDay}
          onClose={() => setShowDatePickerModal(false)}
        />
      )}

      {editForm && (
        <>
          {showEditDatePicker && (
            <div
              className="fixed inset-0 z-[900] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowEditDatePicker(false)}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <ChronosDatePicker
                  value={editForm.data}
                  onChange={(val) => {
                    setEditForm((prev) => prev ? { ...prev, data: val, ora: "" } : null);
                    setShowEditDatePicker(false);
                  }}
                  minDate={today}
                  onClose={() => setShowEditDatePicker(false)}
                  workingHours={adminWorkingHours}
                  manualBlocks={adminManualBlocks}
                />
              </div>
            </div>
          )}

          {showEditTimePicker && (
            <div
              className="fixed inset-0 z-[900] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowEditTimePicker(false)}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <ChronosTimePicker
                  value={editForm.ora || "09:00"}
                  onChange={(val) => {
                    setEditForm((prev) => prev ? { ...prev, ora: val } : null);
                    setShowEditTimePicker(false);
                  }}
                  onClose={() => setShowEditTimePicker(false)}
                  workingHours={adminWorkingHours}
                  existingAppointments={editExistingAppointments}
                  selectedDate={editForm.data}
                  serviceDuration={editServiceDuration}
                  manualBlocks={adminManualBlocks}
                />
              </div>
            </div>
          )}

          {/* ─── MODAL EDIT ──────────────────────────────────────────────────── */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[500] flex items-center justify-center p-4"
            onClick={handleCloseModal}
          >
            <div
              ref={modalRef}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-xl rounded-[50px] overflow-hidden shadow-2xl border border-slate-100 relative"
            >
              {/* Buton închidere — X simplu ASCII, nu emoji */}
              <button
                onClick={handleCloseModal}
                title="\u00cenchi\u00fee"
                className="absolute top-8 right-8 w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center font-black text-white text-xl hover:bg-red-500 transition-all z-30 shadow-xl border border-white/20"
              >
                &#x2715;
              </button>

              <div className="h-44 bg-slate-900 relative flex items-end p-10">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-20 pointer-events-none" />
                <div className="flex items-center gap-6 z-10">
                  <div className="w-24 h-24 rounded-[32px] bg-white p-1.5 shadow-2xl rotate-3">
                    <div className="w-full h-full rounded-[25px] bg-slate-100 overflow-hidden relative flex items-center justify-center text-3xl">
                      {editForm.poza
                        ? <img src={editForm.poza} className="w-full h-full object-cover" alt={editForm.nume} />
                        : <span>&#128100;</span>
                      }
                    </div>
                  </div>
                  <div>
                    <p className="text-amber-500 font-black text-[10px] uppercase italic tracking-[0.3em] mb-1">Detalii Rezervare</p>
                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">
                      {editForm.nume || "Client"}
                    </h2>
                  </div>
                </div>
              </div>

              <div className="p-10 space-y-6 max-h-[65vh] overflow-y-auto bg-white">

                {/* Nume */}
                <div className="bg-slate-50 p-6 rounded-[35px] border border-slate-100 focus-within:border-amber-500 transition-all">
                  <p className="text-[9px] font-black text-slate-400 uppercase italic mb-2 ml-1">Nume Complet Client</p>
                  <input
                    type="text"
                    className="w-full bg-transparent text-xl font-black uppercase italic tracking-tight text-slate-900 outline-none"
                    value={editForm.nume}
                    onChange={(e) => setEditForm((prev) => prev ? { ...prev, nume: e.target.value } : null)}
                  />
                </div>

                {/* Data + Ora */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => { setShowEditDatePicker(true); setShowEditTimePicker(false); }}
                    className="w-full h-[80px] bg-slate-900 text-white rounded-[25px] font-black uppercase italic hover:text-amber-500 transition-all flex flex-col items-center justify-center gap-1"
                  >
                    <span className="text-[9px] text-slate-400 font-black uppercase italic tracking-widest">Data Program\u0103rii</span>
                    <span className="text-sm">&#128197; {editForm.data}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowEditTimePicker(true); setShowEditDatePicker(false); }}
                    className="w-full h-[80px] bg-slate-900 text-white rounded-[25px] font-black uppercase italic hover:text-amber-500 transition-all flex flex-col items-center justify-center gap-1"
                  >
                    <span className="text-[9px] text-slate-400 font-black uppercase italic tracking-widest">Ora Start</span>
                    <span className="text-sm">&#128336; {editForm.ora || "Alege..."}</span>
                  </button>
                </div>

                {/* Interval ocupat */}
                {editForm.serviciuId && (() => {
                  const svc = rawServices.find((s) => s.id === editForm.serviciuId);
                  if (!svc?.duration || !editForm.ora) return null;
                  const endTime = addMinutesToTime(editForm.ora, svc.duration);
                  return (
                    <div className="bg-amber-50/50 border-2 border-dashed border-amber-200 rounded-[30px] p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white text-lg shadow-lg shadow-amber-200">
                          &#9201;
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-amber-700 uppercase italic">Interval Ocupat</p>
                          <p className="text-sm font-black text-slate-900 italic">{editForm.ora} &mdash; {endTime}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black text-amber-600 uppercase italic">Durat\u0103</p>
                        <p className="text-[11px] font-black text-slate-900 uppercase italic">{svc.duration} min</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Telefon + Email */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-5 rounded-[30px] border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Telefon</p>
                    <input
                      type="text"
                      className="w-full bg-transparent font-black text-sm text-slate-800 outline-none italic"
                      value={editForm.telefon || ""}
                      onChange={(e) => setEditForm((prev) => prev ? { ...prev, telefon: e.target.value } : null)}
                      placeholder="07xx..."
                    />
                  </div>
                  <div className="bg-slate-50 p-5 rounded-[30px] border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Email</p>
                    <input
                      type="email"
                      className="w-full bg-transparent font-black text-sm text-slate-800 outline-none italic"
                      value={editForm.email || ""}
                      onChange={(e) => setEditForm((prev) => prev ? { ...prev, email: e.target.value } : null)}
                      placeholder="client@email.com"
                    />
                  </div>
                </div>

                {/* Specialist + Serviciu */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900 p-5 rounded-[30px] shadow-xl">
                    <p className="text-[8px] font-black text-amber-500 uppercase italic mb-1">Specialist</p>
                    <select
                      className="w-full bg-transparent font-black text-xs text-white outline-none cursor-pointer uppercase italic"
                      value={editForm.expertId || ""}
                      onChange={(e) => handleExpertChange(e.target.value)}
                    >
                      <option value="" className="text-orange-500 bg-slate-900">Alege...</option>
                      {angajatiFiltratiInModal.map((a) => (
                        <option key={a.id} value={a.id} className="text-orange-500 bg-slate-900">{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-slate-900 p-5 rounded-[30px] shadow-xl">
                    <p className="text-[8px] font-black text-amber-500 uppercase italic mb-1">Serviciu</p>
                    <select
                      className="w-full bg-transparent font-black text-xs text-white outline-none cursor-pointer uppercase italic"
                      value={editForm.serviciuId || ""}
                      onChange={(e) => handleServiciuChange(e.target.value)}
                    >
                      <option value="" className="text-orange-500 bg-slate-900">Alege...</option>
                      {serviciiFiltrateInModal.map((s) => (
                        <option key={s.id} value={s.id} className="text-orange-500 bg-slate-900">
                          {s.nume_serviciu?.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Documente */}
                <div className="bg-slate-50 p-6 rounded-[35px] border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase italic mb-3">
                    Documente \u0219i Fi\u0219iere Ata\u0219ate
                  </p>
                  {editForm.documente.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {editForm.documente.map((doc) => (
                        <a
                          key={String(doc.id)}
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-2xl hover:border-amber-500 transition-all group"
                          title="Deschide Document"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <span className="text-lg">&#128196;</span>
                            <p className="text-[10px] font-black text-slate-700 uppercase italic truncate">{doc.name}</p>
                          </div>
                          <span className="text-[10px] font-black text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity italic">VEZI</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[9px] font-bold text-slate-400 italic">
                      Niciun document \u00eenc\u0103rcat pentru aceast\u0103 programare.
                    </p>
                  )}
                </div>

                {/* Notițe */}
                <div className="bg-slate-50 p-6 rounded-[35px] border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase italic mb-2">Noti\u021be Suplimentare</p>
                  <textarea
                    className="w-full bg-transparent text-xs font-bold italic text-slate-700 outline-none resize-none"
                    rows={2}
                    value={editForm.motiv || ""}
                    onChange={(e) => setEditForm((prev) => prev ? { ...prev, motiv: e.target.value } : null)}
                    placeholder="Adaug\u0103 detalii..."
                  />
                </div>

                {/* WhatsApp */}
                <div className={`border p-6 rounded-[35px] space-y-3 transition-all duration-300 ${
                  hasWhatsAppAccess ? "bg-green-50 border-green-100" : "bg-slate-50 border-slate-200 opacity-60"
                }`}>
                  <div className="flex justify-between items-center">
                    <p className={`text-[10px] font-black uppercase italic tracking-widest ${hasWhatsAppAccess ? "text-green-700" : "text-slate-400"}`}>
                      &#128172; Mesaj WhatsApp
                    </p>
                    {!hasWhatsAppAccess && (
                      <span className="text-[7px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-black uppercase tracking-widest border border-amber-200">
                        &#128274; ELITE &amp; TEAM
                      </span>
                    )}
                  </div>
                  <textarea
                    className={`w-full rounded-2xl p-4 text-[11px] font-bold outline-none italic border resize-none transition-all ${
                      hasWhatsAppAccess
                        ? "bg-white/50 border-green-200 text-slate-700"
                        : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                    rows={2}
                    value={hasWhatsAppAccess ? customMessage : "Disponibil doar \u00een planurile ELITE \u0219i TEAM..."}
                    onChange={(e) => { if (hasWhatsAppAccess) setCustomMessage(e.target.value); }}
                    readOnly={!hasWhatsAppAccess}
                  />
                  {hasWhatsAppAccess ? (
                    <button
                      onClick={sendWhatsAppReminder}
                      className="w-full py-4 bg-green-600 text-white rounded-2xl text-[10px] font-black uppercase italic shadow-lg shadow-green-200 hover:bg-green-700 active:scale-95 transition-all"
                    >
                      Trimite Notificare WhatsApp
                    </button>
                  ) : (
                    <>
                      <div className="w-full py-4 bg-slate-200 text-slate-400 rounded-2xl text-[10px] font-black uppercase italic text-center cursor-not-allowed select-none">
                        &#128274; Necesit\u0103 Plan ELITE sau TEAM
                      </div>
                      <p className="text-center text-[8px] font-black text-slate-400 uppercase italic leading-relaxed">
                        Upgrade la <span className="text-amber-600">ELITE</span> sau{" "}
                        <span className="text-amber-600">TEAM</span> pentru a trimite notific\u0103ri WhatsApp
                      </p>
                    </>
                  )}
                </div>

                {/* Butoane acțiuni */}
                <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
                  <div className="flex gap-4">
                    <button
                      onClick={handleCloseModal}
                      className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-[25px] font-black uppercase text-[10px] italic hover:bg-slate-200 transition-all"
                    >
                      Anuleaz\u0103
                    </button>
                    <button
                      onClick={handleUpdate}
                      className="flex-[2] py-5 bg-slate-900 text-white rounded-[25px] font-black shadow-2xl uppercase text-[10px] italic hover:bg-amber-600 transition-all active:scale-95"
                    >
                      Salveaz\u0103 Modific\u0103rile
                    </button>
                  </div>
                  <button
                    onClick={handleDelete}
                    className="w-full py-5 text-red-500 font-black uppercase text-[9px] italic hover:bg-red-50 rounded-[25px] transition-all"
                  >
                    \u015etearger\u0103 Definitiv\u0103 &#128465;
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="w-full max-w-6xl flex flex-col items-center mb-6 px-6 py-6 mt-4 gap-6 bg-white rounded-[40px] shadow-sm border border-slate-100">
        <div className="w-full flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-amber-500 font-black text-xl italic">C</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                Calendar <span className="text-amber-600">Chronos</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
                  {loadingAppts ? "Se sincronizeaz\u0103..." : "Sincronizat \u00een timp real"}
                </p>
                {userSubscription && (
                  <span className="text-[8px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold uppercase">
                    {userSubscription.plan}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex-1 max-w-2xl w-full relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">&#128269;</span>
            <input
              type="text"
              placeholder="Caut\u0103 Client sau Telefon..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-[25px] py-4 pl-12 pr-4 text-xs font-black text-slate-700 outline-none focus:border-amber-500 transition-all italic shadow-inner"
            />
          </div>
          <Link
            href="/programari"
            className="px-8 py-4 rounded-[22px] text-[10px] font-black uppercase italic shadow-lg transition-all active:scale-95 bg-amber-500 text-white hover:bg-amber-600"
          >
            \u00cenapoi la Program\u0103ri
          </Link>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-50">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase italic mb-1 ml-4">
              Filtreaz\u0103 dup\u0103 Specialist{" "}
              {selectedExpert && (
                <button onClick={() => setSelectedExpert("")} className="ml-2 text-amber-600">&#x2715;</button>
              )}
            </p>
            <select
              value={selectedExpert}
              onChange={(e) => setSelectedExpert(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-[35px] py-3 px-6 text-[11px] font-black text-slate-700 uppercase italic shadow-inner outline-none focus:border-amber-500 cursor-pointer appearance-none"
            >
              <option value="">To\u021bi Speciali\u015ftii</option>
              {rawStaff.map((exp) => <option key={exp.id} value={exp.id}>{exp.name}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase italic mb-1 ml-4">
              Filtreaz\u0103 dup\u0103 Serviciu{" "}
              {selectedServiciu && (
                <button onClick={() => setSelectedServiciu("")} className="ml-2 text-amber-600">&#x2715;</button>
              )}
            </p>
            <select
              value={selectedServiciu}
              onChange={(e) => setSelectedServiciu(e.target.value)}
              className="w-full bg-amber-50 border-2 border-amber-100 rounded-[35px] py-3 px-6 text-[11px] font-black text-amber-700 uppercase italic shadow-inner outline-none focus:border-amber-500 cursor-pointer appearance-none"
            >
              <option value="">Toate Serviciile</option>
              {rawServices.map((ser) => (
                <option key={ser.id} value={ser.id}>{ser.nume_serviciu?.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── CALENDAR ────────────────────────────────────────────────────────── */}
      <div className="w-full max-w-6xl bg-white rounded-[40px] shadow-2xl border border-slate-200 overflow-hidden mb-20">
        <div className="p-4 md:p-8 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-2 rounded-[22px]">
              <button onClick={() => nav(-1)} className="p-3 hover:bg-white rounded-xl transition-colors">&#9664;</button>
              <button onClick={() => setSelectedDate(new Date())} className="px-5 text-[10px] font-black uppercase text-slate-500 italic hover:text-amber-600 transition-colors">Azi</button>
              <button onClick={() => nav(1)} className="p-3 hover:bg-white rounded-xl transition-colors">&#9654;</button>
            </div>
            <h2
              onClick={() => setShowDatePickerModal(true)}
              className="text-xl md:text-2xl font-black text-slate-900 uppercase italic tracking-tighter cursor-pointer hover:text-amber-600 transition-all flex items-center gap-2"
            >
              {viewMode === "day" && `${dayNamesLong[selectedDate.getDay()]}, ${selectedDate.getDate()} `}
              {monthNames[selectedDate.getMonth()]} <span className="text-amber-600">{selectedDate.getFullYear()}</span>
              <span className="text-xs">&#128197;</span>
            </h2>
          </div>
          <div className="flex bg-slate-100 p-2 rounded-[22px]">
            {(["day", "week", "month"] as ViewMode[]).map((opt) => (
              <button
                key={opt}
                onClick={() => setViewMode(opt)}
                className={`px-6 py-3 rounded-[18px] text-[10px] font-black uppercase transition-all ${
                  viewMode === opt ? "bg-slate-900 text-white shadow-xl italic" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {opt === "day" ? "Zi" : opt === "week" ? "S\u0103pt" : "Lun\u0103"}
              </button>
            ))}
          </div>
        </div>

        {loadingAppts && (
          <div className="w-full h-1 bg-amber-100 overflow-hidden">
            <div className="h-full w-1/3 bg-amber-500 animate-pulse rounded-full" />
          </div>
        )}

        <div className="bg-slate-200 w-full overflow-x-auto">
          {viewMode === "month" && (
            <div className="grid grid-cols-7 gap-[1px] min-w-[700px] w-full">
              {dayNamesShort.map((d) => (
                <div key={d} className="text-center font-black text-slate-400 text-[10px] py-5 bg-white uppercase italic tracking-widest">{d}</div>
              ))}
              {monthGrid.map((day, idx) => {
                const key = formatDateKey(day);
                const list = programariByDate[key] || [];
                const blockStatus = isDateBlocked(key);
                const fullyOccupied = isDayFullyOccupied(key);
                const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                return (
                  <div
                    key={idx}
                    onClick={() => !blockStatus.blocked && goToDay(day)}
                    className={`min-h-[140px] p-3 flex flex-col items-start border-r border-b border-slate-100 transition-colors relative
                      ${!isCurrentMonth ? "bg-slate-50 opacity-40" : "bg-white"}
                      ${blockStatus.blocked ? "bg-red-50/30 cursor-not-allowed" : "hover:bg-amber-50/30 cursor-pointer"}`}
                  >
                    <span className={`text-[11px] font-black mb-3 px-3 py-1.5 rounded-[12px] ${sameDay(day, new Date()) ? "text-white bg-amber-600" : "text-slate-400"}`}>
                      {day.getDate()}
                    </span>
                    {blockStatus.blocked && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                        <span className="text-[10px] font-black uppercase italic rotate-45 border-2 border-red-500 text-red-600 px-2 rounded-lg">
                          \u00cenchis
                        </span>
                      </div>
                    )}
                    {!blockStatus.blocked && fullyOccupied && list.length > 0 && (
                      <div className="absolute top-2 right-2 w-2 h-2 bg-red-400 rounded-full" title="Zi complet ocupat\u0103" />
                    )}
                    <div className="w-full space-y-1.5 z-10">
                      {list.slice(0, 3).map((p) => <AppointmentChip key={p.id} p={p} />)}
                      {list.length > 3 && (
                        <p className="text-[8px] font-black text-amber-600 italic pl-1">+ \u00eenc\u0103 {list.length - 3}</p>
                      )}
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
                      {blockStatus.blocked ? (
                        <div className="mt-10 text-center px-4">
                          <p className="text-[8px] font-black text-red-400 uppercase italic">{blockStatus.reason}</p>
                        </div>
                      ) : list.length > 0 ? (
                        list.sort((a, b) => a.ora.localeCompare(b.ora)).map((p) => {
                          const expName = rawStaff.find((a) => a.id === p.expertId)?.name || "General";
                          const svc = rawServices.find((s) => s.id === p.serviciuId);
                          const endTime = svc?.duration ? addMinutesToTime(p.ora, svc.duration) : null;
                          return (
                            <button
                              key={p.id}
                              onClick={() => handleOpenEdit(p)}
                              className="w-full p-3 bg-slate-900 text-white rounded-2xl text-left hover:bg-amber-600 transition-all active:scale-95 shadow-sm border border-slate-700 group"
                            >
                              <p className="text-[10px] font-black italic text-amber-500 group-hover:text-white">
                                {p.ora}{endTime ? ` \u2192 ${endTime}` : ""}
                              </p>
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
                {isDateBlocked(formatDateKey(selectedDate)).blocked ? (
                  <div className="text-center py-20 bg-red-50 rounded-[40px] border-2 border-dashed border-red-200">
                    <p className="text-xl font-black text-red-500 uppercase italic mb-2">Loca\u021bie \u00cenchis\u0103</p>
                    <p className="text-xs font-bold text-red-400 uppercase italic">
                      {isDateBlocked(formatDateKey(selectedDate)).reason}
                    </p>
                  </div>
                ) : (programariByDate[formatDateKey(selectedDate)] || []).length > 0 ? (
                  (programariByDate[formatDateKey(selectedDate)] || [])
                    .sort((a, b) => a.ora.localeCompare(b.ora))
                    .map((p) => {
                      const svc = rawServices.find((s) => s.id === p.serviciuId);
                      const endTime = svc?.duration ? addMinutesToTime(p.ora, svc.duration) : null;
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleOpenEdit(p)}
                          className="flex items-center gap-6 p-6 bg-slate-50 rounded-[35px] border border-slate-100 group hover:bg-slate-900 transition-all cursor-pointer shadow-sm"
                        >
                          <div className="w-28 text-center border-r border-slate-200 pr-6 group-hover:border-slate-700">
                            <p className="text-sm font-black italic text-amber-600">{p.ora}</p>
                            {endTime && <p className="text-[9px] font-bold text-slate-400 group-hover:text-slate-500">\u2192 {endTime}</p>}
                          </div>
                          <div className="flex-1">
                            <p className="text-lg font-black uppercase italic text-slate-900 group-hover:text-white leading-none mb-1">{p.nume}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase italic tracking-widest">
                              {svc?.nume_serviciu || "Serviciu Nesetat"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 group-hover:text-amber-500 uppercase italic">
                              {rawStaff.find((a) => a.id === p.expertId)?.name || "Nesetat"}
                            </p>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="text-center py-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-100">
                    <p className="text-xs font-black text-slate-300 uppercase italic">
                      Nicio programare pentru aceast\u0103 zi.
                    </p>
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
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center font-black italic text-slate-300 animate-pulse uppercase">
          Se \u00eencarc\u0103 Chronos...
        </div>
      }>
        <CalendarContent />
      </Suspense>
    </QueryClientProvider>
  );
}