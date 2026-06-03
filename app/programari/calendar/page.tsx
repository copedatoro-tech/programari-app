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

// ─── Constants ────────────────────────────────────────────────────────────────
const SLOT_H = 28;
const TIME_COL_W = 52;
const SPECIALIST_MIN_W = 160;

// ─── Utils ────────────────────────────────────────────────────────────────────
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
  return `${Math.floor(totalMin / 60) % 24}`.padStart(2, "0") + ":" + `${totalMin % 60}`.padStart(2, "0");
}
function timeToMinutes(t: string): number {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}
function parseWH(whData: any): WorkingHour[] {
  if (!whData) return [];
  if (typeof whData === "string") { try { return JSON.parse(whData); } catch { return []; } }
  return Array.isArray(whData) ? whData : [];
}
function isWorkingSlot(slot: string, start: string, end: string): boolean {
  const s = timeToMinutes(slot);
  const ws = timeToMinutes(start);
  const we = timeToMinutes(end === "00:00" ? "24:00" : end);
  return s >= ws && s < we;
}

const ALL_DAY_SLOTS: string[] = [];
for (let m = 0; m < 24 * 60; m += 15) {
  ALL_DAY_SLOTS.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
}

// ─── Strings ──────────────────────────────────────────────────────────────────
const TXT = {
  dayShort: ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"],
  dayLong: ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"],
  months: ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"],
  monthsShort: ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Noi", "Dec"],
};

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Colors ───────────────────────────────────────────────────────────────────
const SPECIALIST_COLORS = [
  { bg: "bg-blue-100",   border: "border-blue-300",   text: "text-blue-900",   avatar: "bg-blue-500",   col: "#bfdbfe", colBorder: "#3b82f6",  colWork: "#eff6ff", colOff: "#f8fafc" },
  { bg: "bg-green-100",  border: "border-green-300",  text: "text-green-900",  avatar: "bg-green-500",  col: "#bbf7d0", colBorder: "#22c55e",  colWork: "#f0fdf4", colOff: "#f8fafc" },
  { bg: "bg-purple-100", border: "border-purple-300", text: "text-purple-900", avatar: "bg-purple-500", col: "#ddd6fe", colBorder: "#8b5cf6",  colWork: "#faf5ff", colOff: "#f8fafc" },
  { bg: "bg-amber-100",  border: "border-amber-300",  text: "text-amber-900",  avatar: "bg-amber-500",  col: "#fde68a", colBorder: "#f59e0b",  colWork: "#fffbeb", colOff: "#f8fafc" },
  { bg: "bg-rose-100",   border: "border-rose-300",   text: "text-rose-900",   avatar: "bg-rose-500",   col: "#fecdd3", colBorder: "#f43f5e",  colWork: "#fff1f2", colOff: "#f8fafc" },
  { bg: "bg-cyan-100",   border: "border-cyan-300",   text: "text-cyan-900",   avatar: "bg-cyan-500",   col: "#a5f3fc", colBorder: "#06b6d4",  colWork: "#ecfeff", colOff: "#f8fafc" },
  { bg: "bg-indigo-100", border: "border-indigo-300", text: "text-indigo-900", avatar: "bg-indigo-500", col: "#c7d2fe", colBorder: "#6366f1",  colWork: "#eef2ff", colOff: "#f8fafc" },
  { bg: "bg-teal-100",   border: "border-teal-300",   text: "text-teal-900",   avatar: "bg-teal-500",   col: "#99f6e4", colBorder: "#14b8a6",  colWork: "#f0fdfa", colOff: "#f8fafc" },
];

const SERVICE_CHIP_COLORS = [
  { chip: "bg-sky-50 border-sky-200 text-sky-800",     active: "bg-sky-100 border-sky-400 text-sky-900"     },
  { chip: "bg-orange-50 border-orange-200 text-orange-800", active: "bg-orange-100 border-orange-400 text-orange-900" },
  { chip: "bg-pink-50 border-pink-200 text-pink-800",   active: "bg-pink-100 border-pink-400 text-pink-900"  },
  { chip: "bg-emerald-50 border-emerald-200 text-emerald-800", active: "bg-emerald-100 border-emerald-400 text-emerald-900" },
  { chip: "bg-violet-50 border-violet-200 text-violet-800", active: "bg-violet-100 border-violet-400 text-violet-900" },
  { chip: "bg-lime-50 border-lime-200 text-lime-800",   active: "bg-lime-100 border-lime-400 text-lime-900"  },
  { chip: "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800", active: "bg-fuchsia-100 border-fuchsia-400 text-fuchsia-900" },
  { chip: "bg-teal-50 border-teal-200 text-teal-800",   active: "bg-teal-100 border-teal-400 text-teal-900"  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
    id: item.id, nume: item.title || item.prenume || item.nume || "Client",
    email: item.email ?? "", data: dataStr, ora: item.time ?? "",
    telefon: item.phone ?? "", motiv: item.details ?? "",
    poza: item.poza ?? item.file_url ?? null,
    documente: normalizeDocuments(item.documente),
    expertId: item.angajat_id ?? "", serviciuId: item.serviciu_id ?? "",
    duration: item.duration ?? 0,
  };
}

// ─── WeekStrip Navigator ───────────────────────────────────────────────────────
function WeekStrip({ selectedDate, onSelectDate, programariByDate, adminWorkingHours }: {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  programariByDate: Record<string, Programare[]>;
  adminWorkingHours: WorkingHour[];
}) {
  const today = new Date();
  const weekStart = getWeekStart(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const whByDay = useMemo(() => {
    const m: Record<string, WorkingHour> = {};
    adminWorkingHours.forEach(h => { m[h.day] = h; });
    return m;
  }, [adminWorkingHours]);

  const monthLabel = useMemo(() => {
    const firstMonth = weekDays[0].getMonth();
    const lastMonth = weekDays[6].getMonth();
    const year = weekDays[0].getFullYear();
    if (firstMonth === lastMonth) {
      return `${TXT.months[firstMonth]} ${year}`;
    }
    return `${TXT.monthsShort[firstMonth]} – ${TXT.monthsShort[lastMonth]} ${year}`;
  }, [weekDays]);

  return (
    <div className="flex-shrink-0 bg-white border-b border-slate-200 select-none">
      <div className="flex items-stretch" style={{ height: 56 }}>
        {/* Luna + an + navigare săptămână */}
        <div className="flex items-center gap-1 px-3 border-r border-slate-200 flex-shrink-0" style={{ minWidth: 160 }}>
          <button
            onClick={() => onSelectDate(addDays(weekStart, -7))}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-all text-slate-400 text-xs flex-shrink-0"
          >◀</button>
          <div className="flex-1 text-center">
            <p className="text-[10px] font-bold text-slate-500 leading-none">{monthLabel}</p>
            <button
              onClick={() => onSelectDate(today)}
              className="text-[9px] font-bold text-amber-500 hover:text-amber-700 transition-colors mt-0.5 leading-none"
            >
              Azi
            </button>
          </div>
          <button
            onClick={() => onSelectDate(addDays(weekStart, 7))}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-all text-slate-400 text-xs flex-shrink-0"
          >▶</button>
        </div>

        {/* Zilele săptămânii */}
        <div className="flex flex-1 divide-x divide-slate-100">
          {weekDays.map((day, i) => {
            const key = formatDateKey(day);
            const isSelected = sameDay(day, selectedDate);
            const isToday = sameDay(day, today);
            const hasAppts = (programariByDate[key] || []).length > 0;
            const dow = (day.getDay() + 6) % 7;
            const isWeekend = dow >= 5;
            const dayName = TXT.dayLong[day.getDay()];
            const wh = whByDay[dayName];
            const isClosed = !!wh?.closed;

            return (
              <button
                key={i}
                onClick={() => onSelectDate(day)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all relative ${
                  isSelected
                    ? "bg-slate-900"
                    : isToday
                    ? "bg-amber-50"
                    : isClosed
                    ? "bg-red-50/50"
                    : isWeekend
                    ? "bg-slate-50/80"
                    : "hover:bg-slate-50"
                }`}
              >
                <span className={`text-[9px] font-bold uppercase leading-none ${
                  isSelected ? "text-amber-400" : isToday ? "text-amber-600" : isClosed ? "text-red-300" : isWeekend ? "text-slate-300" : "text-slate-400"
                }`}>
                  {TXT.dayShort[dow]}
                </span>
                <span className={`text-sm font-bold leading-tight ${
                  isSelected ? "text-white" : isToday ? "text-amber-700" : isClosed ? "text-red-300" : isWeekend ? "text-slate-300" : "text-slate-700"
                }`}>
                  {day.getDate()}
                </span>
                {hasAppts && (
                  <span className={`w-1 h-1 rounded-full ${isSelected ? "bg-amber-400" : "bg-amber-400"}`} />
                )}
                {isClosed && !isSelected && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-300" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── FilterBar ────────────────────────────────────────────────────────────────
function FilterBar({
  rawStaff, rawServices, programari,
  selectedExpert, onSelectExpert,
  selectedServiciu, onSelectServiciu,
  selectedDate,
}: {
  rawStaff: StaffRow[];
  rawServices: ServiceRow[];
  programari: Programare[];
  selectedExpert: string;
  onSelectExpert: (id: string) => void;
  selectedServiciu: string;
  onSelectServiciu: (id: string) => void;
  selectedDate: Date;
}) {
  const dateKey = formatDateKey(selectedDate);

  const apptCountByExpert = useMemo(() => {
    const m: Record<string, number> = {};
    programari.forEach(p => {
      if (p.data === dateKey && p.expertId) {
        m[p.expertId] = (m[p.expertId] || 0) + 1;
      }
    });
    return m;
  }, [programari, dateKey]);

  const apptCountByService = useMemo(() => {
    const m: Record<string, number> = {};
    programari.forEach(p => {
      if (p.data === dateKey && p.serviciuId) {
        const matchExpert = !selectedExpert || p.expertId === selectedExpert;
        if (matchExpert) m[p.serviciuId] = (m[p.serviciuId] || 0) + 1;
      }
    });
    return m;
  }, [programari, dateKey, selectedExpert]);

  const visibleServices = useMemo(() => {
    if (!selectedExpert) return rawServices;
    const staff = rawStaff.find(s => s.id === selectedExpert);
    if (!staff?.services?.length) return rawServices;
    return rawServices.filter(s => staff.services.includes(s.id));
  }, [selectedExpert, rawStaff, rawServices]);

  const handleSelectExpert = (id: string) => {
    const next = selectedExpert === id ? "" : id;
    onSelectExpert(next);
    if (next && selectedServiciu) {
      const staff = rawStaff.find(s => s.id === next);
      if (staff?.services?.length && !staff.services.includes(selectedServiciu)) {
        onSelectServiciu("");
      }
    }
  };

  const handleSelectServiciu = (id: string) => {
    onSelectServiciu(selectedServiciu === id ? "" : id);
  };

  if (rawStaff.length === 0 && rawServices.length === 0) return null;

  return (
    <div className="flex-shrink-0 bg-white border-b border-slate-200">
      {/* Rând 1 — Specialiști */}
      {rawStaff.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide flex-shrink-0 w-16">Specialiști</span>
          <button
            onClick={() => { onSelectExpert(""); onSelectServiciu(""); }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all flex-shrink-0 ${
              !selectedExpert ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            Toți
          </button>
          {rawStaff.map((staff, i) => {
            const color = SPECIALIST_COLORS[i % SPECIALIST_COLORS.length];
            const isSelected = selectedExpert === staff.id;
            const count = apptCountByExpert[staff.id] || 0;
            return (
              <button
                key={staff.id}
                onClick={() => handleSelectExpert(staff.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all flex-shrink-0 ${
                  isSelected
                    ? `${color.bg} ${color.border} ${color.text}`
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0 ${color.avatar}`}>
                  {staff.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="truncate max-w-[80px]">{staff.name}</span>
                {count > 0 && (
                  <span className={`text-[8px] font-bold px-1 py-px rounded-full ${isSelected ? "bg-white/50" : "bg-slate-100 text-slate-500"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Rând 2 — Servicii */}
      {rawServices.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide flex-shrink-0 w-16">Servicii</span>
          <button
            onClick={() => onSelectServiciu("")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all flex-shrink-0 ${
              !selectedServiciu ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            Toate
          </button>
          {visibleServices.map((svc, i) => {
            const chipColor = SERVICE_CHIP_COLORS[i % SERVICE_CHIP_COLORS.length];
            const isSelected = selectedServiciu === svc.id;
            const count = apptCountByService[svc.id] || 0;
            return (
              <button
                key={svc.id}
                onClick={() => handleSelectServiciu(svc.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all flex-shrink-0 ${
                  isSelected ? chipColor.active : `${chipColor.chip} hover:opacity-80`
                }`}
              >
                <span className="truncate max-w-[100px]">{svc.nume_serviciu}</span>
                {svc.duration > 0 && (
                  <span className="opacity-60 text-[8px]">{svc.duration}min</span>
                )}
                {count > 0 && (
                  <span className="text-[8px] font-bold px-1 py-px rounded-full bg-white/60">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ServiceSummaryBar ────────────────────────────────────────────────────────
function ServiceSummaryBar({
  programari, rawServices, selectedDate, selectedExpert, selectedServiciu, onSelectServiciu,
}: {
  programari: Programare[];
  rawServices: ServiceRow[];
  selectedDate: Date;
  selectedExpert: string;
  selectedServiciu: string;
  onSelectServiciu: (id: string) => void;
}) {
  const dateKey = formatDateKey(selectedDate);

  const summaryItems = useMemo(() => {
    const m: Record<string, number> = {};
    programari.forEach(p => {
      if (p.data !== dateKey) return;
      if (selectedExpert && p.expertId !== selectedExpert) return;
      if (p.serviciuId) m[p.serviciuId] = (m[p.serviciuId] || 0) + 1;
    });
    return rawServices
      .filter(s => m[s.id] > 0)
      .map((s, i) => ({ ...s, count: m[s.id], colorIdx: i }));
  }, [programari, dateKey, selectedExpert, rawServices]);

  if (summaryItems.length === 0) return null;

  return (
    <div className="flex-shrink-0 bg-slate-50 border-t border-slate-200 flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide flex-shrink-0">Azi:</span>
      {summaryItems.map(item => {
        const chipColor = SERVICE_CHIP_COLORS[item.colorIdx % SERVICE_CHIP_COLORS.length];
        const isSelected = selectedServiciu === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectServiciu(isSelected ? "" : item.id)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold transition-all flex-shrink-0 ${
              isSelected ? chipColor.active : `${chipColor.chip} hover:opacity-80`
            }`}
          >
            <span>{item.nume_serviciu}</span>
            <span className="font-bold opacity-80">×{item.count}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── DayView ──────────────────────────────────────────────────────────────────
// FIX: eliminat header-ul cu specialiști duplicat (cel din interiorul grilei)
function DayView({
  selectedDate, programari, rawStaff, rawServices, serviceById,
  onEdit, adminWorkingHours, selectedExpert, selectedServiciu,
  onSelectServiciu, onAddNewAppointment,
}: {
  selectedDate: Date; programari: Programare[]; rawStaff: StaffRow[];
  rawServices: ServiceRow[]; serviceById: Record<string, ServiceRow>;
  onEdit: (p: Programare) => void; onAddNewAppointment: (time: string, date: string) => void;
  adminWorkingHours: WorkingHour[]; selectedExpert: string; selectedServiciu: string;
  onSelectServiciu: (id: string) => void;
}) {
  const dateKey = formatDateKey(selectedDate);
  const dayName = TXT.dayLong[selectedDate.getDay()];
  const daySchedule = adminWorkingHours.find(h => h.day === dayName);
  const isClosed = !!daySchedule?.closed;
  const whStart = daySchedule?.start || "";
  const whEnd = daySchedule?.end || "";

  const bodyRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  const visibleSlots = useMemo(() => {
    if (isClosed || !whStart || !whEnd) return ALL_DAY_SLOTS;
    const startMin = Math.max(0, timeToMinutes(whStart) - 60);
    const endMin = Math.min(24 * 60, timeToMinutes(whEnd === "00:00" ? "24:00" : whEnd) + 60);
    return ALL_DAY_SLOTS.filter(slot => {
      const m = timeToMinutes(slot);
      return m >= startMin && m < endMin;
    });
  }, [isClosed, whStart, whEnd]);

  const gridHeight = visibleSlots.length * SLOT_H;
  const firstSlotMin = visibleSlots.length > 0 ? timeToMinutes(visibleSlots[0]) : 0;

  const syncScroll = useCallback((source: "body" | "header") => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    requestAnimationFrame(() => {
      if (source === "body" && bodyRef.current && headerScrollRef.current)
        headerScrollRef.current.scrollLeft = bodyRef.current.scrollLeft;
      isSyncing.current = false;
    });
  }, []);

  const dateAppts = programari.filter(p => p.data === dateKey);

  const allStaffColumns = useMemo(() => {
    if (rawStaff.length === 0) return [{
      id: "general", name: "Programări", services: [] as string[],
      appts: dateAppts, colorIdx: 0,
    }];
    return rawStaff.map((staff, i) => ({
      id: staff.id, name: staff.name, services: staff.services,
      appts: dateAppts.filter(p => p.expertId === staff.id),
      colorIdx: i % SPECIALIST_COLORS.length,
    }));
  }, [rawStaff, dateAppts]);

  const visibleColumns = useMemo(() => {
    const cols = selectedExpert
      ? allStaffColumns.filter(c => c.id === selectedExpert)
      : allStaffColumns;
    return cols.map(col => ({
      ...col,
      appts: selectedServiciu
        ? col.appts.filter(p => p.serviciuId === selectedServiciu)
        : col.appts,
    }));
  }, [allStaffColumns, selectedExpert, selectedServiciu]);

  // Scroll la ora de start a programului
  useEffect(() => {
    const targetTime = whStart || `${new Date().getHours().toString().padStart(2, "0")}:00`;
    const targetMin = timeToMinutes(targetTime);
    const offset = Math.max(0, ((targetMin - firstSlotMin) / 15) * SLOT_H - 60);
    setTimeout(() => { bodyRef.current?.scrollTo({ top: offset }); }, 50);
  }, []);

  const colWidth = visibleColumns.length === 1
    ? Math.max(SPECIALIST_MIN_W, 320)
    : SPECIALIST_MIN_W;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* FIX: eliminat header-ul duplicat cu specialiști — acesta era al doilea rând cu specialiști */}

      {isClosed && (
        <div className="flex-shrink-0 bg-red-50 border-b border-red-200 px-4 py-1.5 flex items-center gap-2">
          <span className="text-red-500 text-xs">🚫</span>
          <span className="text-[10px] font-bold text-red-600">Zi închisă — poți adăuga programări manual</span>
        </div>
      )}

      <div
        ref={bodyRef}
        onScroll={() => syncScroll("body")}
        className="flex flex-1 overflow-auto"
      >
        <div
          className="flex"
          style={{ minWidth: visibleColumns.length * colWidth + TIME_COL_W, height: gridHeight, position: "relative" }}
        >
          {/* Coloana de ore */}
          <div
            className="flex-shrink-0 border-r border-slate-200 bg-white/90 sticky left-0 z-20"
            style={{ width: TIME_COL_W }}
          >
            {visibleSlots.map((slot) => {
              const isHour = slot.endsWith(":00");
              const isHalfHour = slot.endsWith(":30");
              const isWorking = !isClosed && whStart && whEnd && isWorkingSlot(slot, whStart, whEnd);
              const borderColor = isHour
                ? "rgba(30,41,59,0.2)"
                : isHalfHour
                ? "rgba(30,41,59,0.08)"
                : "rgba(30,41,59,0.03)";
              const bgColor = isClosed
                ? "rgba(239,68,68,0.03)"
                : isWorking
                ? "rgba(251,191,36,0.06)"
                : "rgba(15,23,42,0.015)";
              return (
                <div
                  key={slot}
                  className="flex items-start justify-end pr-2"
                  style={{ height: SLOT_H, backgroundColor: bgColor, borderTop: `1px solid ${borderColor}` }}
                >
                  {isHour && (
                    <span className={`text-[9px] font-bold mt-0.5 select-none ${isWorking && !isClosed ? "text-slate-500" : "text-slate-300"}`}>
                      {slot}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Coloane specialiști */}
          {visibleColumns.map(col => {
            const color = SPECIALIST_COLORS[col.colorIdx];
            return (
              <div key={col.id} className="relative flex-shrink-0" style={{ width: colWidth }}>
                {/* Fundaluri sloturi */}
                {visibleSlots.map((slot, i) => {
                  const isHour = slot.endsWith(":00");
                  const isHalfHour = slot.endsWith(":30");
                  const isWorking = !isClosed && whStart && whEnd && isWorkingSlot(slot, whStart, whEnd);
                  const bgColor = isClosed
                    ? "rgba(239,68,68,0.05)"
                    : isWorking
                    ? color.colWork
                    : color.colOff;
                  const borderColor = isHour
                    ? "rgba(30,41,59,0.15)"
                    : isHalfHour
                    ? "rgba(30,41,59,0.07)"
                    : "rgba(30,41,59,0.03)";
                  return (
                    <div
                      key={slot}
                      className="absolute left-0 right-0"
                      style={{ top: i * SLOT_H, height: SLOT_H, backgroundColor: bgColor, borderTop: `1px solid ${borderColor}` }}
                    />
                  );
                })}

                {/* Linii delimitare orar de lucru */}
                {!isClosed && whStart && whEnd && (() => {
                  const startOffset = ((timeToMinutes(whStart) - firstSlotMin) / 15) * SLOT_H;
                  const endOffset = ((timeToMinutes(whEnd === "00:00" ? "24:00" : whEnd) - firstSlotMin) / 15) * SLOT_H;
                  return (
                    <div className="absolute left-0 right-0 pointer-events-none" style={{ zIndex: 2 }}>
                      <div className="absolute left-0 right-0" style={{ top: startOffset, height: 2, backgroundColor: color.colBorder, opacity: 0.5 }} />
                      <div className="absolute left-0 right-0" style={{ top: endOffset, height: 2, backgroundColor: color.colBorder, opacity: 0.5 }} />
                    </div>
                  );
                })()}

                {/* Bordură dreapta */}
                <div className="absolute top-0 right-0 bottom-0 w-px" style={{ backgroundColor: color.colBorder, opacity: 0.3 }} />

                {/* Programări */}
                {col.appts.sort((a, b) => a.ora.localeCompare(b.ora)).map(p => {
                  const svc = serviceById[p.serviciuId || ""];
                  const endTime = svc?.duration ? addMinutesToTime(p.ora, svc.duration) : null;
                  const startMin = timeToMinutes(p.ora) - firstSlotMin;
                  const topPx = (startMin / 15) * SLOT_H;
                  const durMin = svc?.duration || 15;
                  const heightPx = Math.max((durMin / 15) * SLOT_H - 3, 24);
                  return (
                    <button
                      key={p.id}
                      onClick={() => onEdit(p)}
                      className="absolute rounded-lg px-2 py-1 text-left overflow-hidden hover:brightness-95 hover:shadow-md transition-all"
                      style={{
                        top: topPx + 2, height: heightPx, left: 4, right: 4, zIndex: 10,
                        backgroundColor: "white",
                        border: "1px solid rgba(0,0,0,0.08)",
                        borderLeft: `3px solid ${color.colBorder}`,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                      }}
                    >
                      <p className={`text-[8px] font-bold leading-tight ${color.text}`}>{p.ora}{endTime ? ` → ${endTime}` : ""}</p>
                      <p className={`text-[10px] font-bold truncate leading-tight ${color.text}`}>{p.nume}</p>
                      {svc && heightPx > 42 && (
                        <p className={`text-[8px] truncate opacity-60 ${color.text}`}>{svc.nume_serviciu}</p>
                      )}
                    </button>
                  );
                })}

                {/* Sloturi goale clicabile */}
                {visibleSlots.map((slot, i) => {
                  const slotMin = timeToMinutes(slot);
                  const isOccupied = col.appts.some(p => {
                    const pMin = timeToMinutes(p.ora);
                    const svc = serviceById[p.serviciuId || ""];
                    const dur = svc?.duration || 15;
                    return pMin <= slotMin && slotMin < pMin + dur;
                  });
                  if (isOccupied) return null;
                  return (
                    <button
                      key={`e-${col.id}-${slot}`}
                      onClick={() => onAddNewAppointment(slot, dateKey)}
                      className="absolute left-0 right-0 hover:bg-black/5 transition-all"
                      style={{ top: i * SLOT_H, height: SLOT_H, zIndex: 5 }}
                    />
                  );
                })}
              </div>
            );
          })}

          {visibleColumns.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-slate-300 font-bold">Niciun rezultat pentru filtrele selectate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── WeekView ─────────────────────────────────────────────────────────────────
function WeekView({
  selectedDate, programari, rawStaff, rawServices, serviceById,
  onEdit, selectedExpert, selectedServiciu, programariByDate, adminWorkingHours,
}: {
  selectedDate: Date; programari: Programare[]; rawStaff: StaffRow[];
  rawServices: ServiceRow[]; serviceById: Record<string, ServiceRow>;
  onEdit: (p: Programare) => void; selectedExpert: string; selectedServiciu: string;
  programariByDate: Record<string, Programare[]>; adminWorkingHours: WorkingHour[];
}) {
  const today = useMemo(() => new Date(), []);
  const weekDays = useMemo(() => {
    const start = getWeekStart(selectedDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const bodyRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  const syncScroll = useCallback((from: "body" | "header") => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    requestAnimationFrame(() => {
      if (from === "body" && headerRef.current && bodyRef.current)
        headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
      if (from === "header" && bodyRef.current && headerRef.current)
        bodyRef.current.scrollLeft = headerRef.current.scrollLeft;
      isSyncing.current = false;
    });
  }, []);

  const whByDay = useMemo(() => {
    const m: Record<string, WorkingHour> = {};
    adminWorkingHours.forEach(h => { m[h.day] = h; });
    return m;
  }, [adminWorkingHours]);

  const visibleSlots = useMemo(() => {
    let minStart = 24 * 60;
    let maxEnd = 0;
    let hasAny = false;
    weekDays.forEach(day => {
      const dn = TXT.dayLong[day.getDay()];
      const wh = whByDay[dn];
      if (wh && !wh.closed && wh.start && wh.end) {
        hasAny = true;
        minStart = Math.min(minStart, timeToMinutes(wh.start));
        maxEnd = Math.max(maxEnd, timeToMinutes(wh.end === "00:00" ? "24:00" : wh.end));
      }
    });
    if (!hasAny) return ALL_DAY_SLOTS;
    const startMin = Math.max(0, minStart - 60);
    const endMin = Math.min(24 * 60, maxEnd + 60);
    return ALL_DAY_SLOTS.filter(slot => {
      const m = timeToMinutes(slot);
      return m >= startMin && m < endMin;
    });
  }, [weekDays, whByDay]);

  const gridHeight = visibleSlots.length * SLOT_H;
  const firstSlotMin = visibleSlots.length > 0 ? timeToMinutes(visibleSlots[0]) : 0;

  useEffect(() => {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const offset = Math.max(0, ((nowMin - firstSlotMin) / 15) * SLOT_H - 120);
    setTimeout(() => { bodyRef.current?.scrollTo({ top: offset }); }, 50);
  }, []);

  const staffColorMap = useMemo(() => {
    const m: Record<string, number> = {};
    rawStaff.forEach((s, i) => { m[s.id] = i % SPECIALIST_COLORS.length; });
    return m;
  }, [rawStaff]);

  const dayColData = useMemo(() => {
    return weekDays.map(day => {
      const key = formatDateKey(day);
      const allForDay = programariByDate[key] || [];
      const filtered = allForDay.filter(p => {
        const matchExpert = !selectedExpert || p.expertId === selectedExpert;
        const matchService = !selectedServiciu || p.serviciuId === selectedServiciu;
        return matchExpert && matchService;
      });
      return { day, key, appts: filtered };
    });
  }, [weekDays, programariByDate, selectedExpert, selectedServiciu]);

  const COL_W = 160;
  const totalBodyW = 7 * COL_W + TIME_COL_W;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header zile */}
        <div
          ref={headerRef}
          onScroll={() => syncScroll("header")}
          className="flex flex-shrink-0 border-b border-slate-200 bg-white overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          <div className="flex" style={{ minWidth: totalBodyW }}>
            <div className="flex-shrink-0" style={{ width: TIME_COL_W }} />
            {weekDays.map((day, di) => {
              const dayName = TXT.dayLong[day.getDay()];
              const wh = whByDay[dayName];
              const isClosed = !!wh?.closed;
              const isToday = sameDay(day, today);
              const dow = (day.getDay() + 6) % 7;
              const isWeekend = dow >= 5;
              const apptCount = dayColData[di]?.appts.length || 0;
              return (
                <div
                  key={di}
                  className="flex flex-col items-center justify-center py-2 border-r border-slate-200 text-center flex-shrink-0"
                  style={{
                    width: COL_W,
                    backgroundColor: isClosed
                      ? "rgba(239,68,68,0.05)"
                      : isToday
                      ? "rgba(251,191,36,0.08)"
                      : isWeekend
                      ? "rgba(248,250,252,0.9)"
                      : "white",
                  }}
                >
                  <span className={`text-[9px] font-bold uppercase ${isToday ? "text-amber-600" : isClosed ? "text-red-400" : isWeekend ? "text-slate-300" : "text-slate-400"}`}>
                    {TXT.dayShort[dow]}
                  </span>
                  <span className={`text-base font-bold leading-tight ${isToday ? "text-amber-600" : isClosed ? "text-red-300" : "text-slate-700"}`}>
                    {day.getDate()}
                  </span>
                  {isClosed
                    ? <span className="text-[7px] font-bold text-red-400">Închis</span>
                    : wh?.start
                    ? <span className="text-[7px] text-slate-400">{wh.start}–{wh.end}</span>
                    : null
                  }
                  {apptCount > 0 && (
                    <span className={`text-[7px] font-bold px-1.5 py-px rounded-full mt-0.5 ${isToday ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                      {apptCount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Grid body */}
        <div ref={bodyRef} onScroll={() => syncScroll("body")} className="flex-1 overflow-auto">
          <div className="relative flex" style={{ minWidth: totalBodyW, height: gridHeight }}>
            {/* Coloana de ore sticky */}
            <div className="sticky left-0 z-20 bg-white/90 border-r border-slate-200 flex-shrink-0" style={{ width: TIME_COL_W }}>
              {visibleSlots.map((slot, i) => {
                const isHour = slot.endsWith(":00");
                const isHalfHour = slot.endsWith(":30");
                const borderColor = isHour ? "rgba(30,41,59,0.2)" : isHalfHour ? "rgba(30,41,59,0.08)" : "rgba(30,41,59,0.03)";
                return (
                  <div
                    key={slot}
                    className="flex items-start justify-end pr-2"
                    style={{ height: SLOT_H, borderTop: `1px solid ${borderColor}`, backgroundColor: i % 2 === 0 ? "white" : "rgba(248,250,252,0.6)" }}
                  >
                    {isHour && <span className="text-[9px] font-bold text-slate-400 mt-0.5 select-none">{slot}</span>}
                  </div>
                );
              })}
            </div>

            {/* Coloane zile */}
            {weekDays.map((day, di) => {
              const dayName = TXT.dayLong[day.getDay()];
              const wh = whByDay[dayName];
              const isClosed = !!wh?.closed;
              const whStart = wh?.start || "";
              const whEnd = wh?.end || "";
              const isToday = sameDay(day, today);
              const isWeekend = (day.getDay() + 6) % 7 >= 5;
              const { appts } = dayColData[di];

              return (
                <div
                  key={di}
                  className="absolute top-0 flex-shrink-0 border-r border-slate-200"
                  style={{ left: di * COL_W + TIME_COL_W, width: COL_W, height: gridHeight }}
                >
                  {visibleSlots.map((slot, i) => {
                    const isHour = slot.endsWith(":00");
                    const isHalfHour = slot.endsWith(":30");
                    const isWorking = !isClosed && isWorkingSlot(slot, whStart, whEnd);
                    const borderColor = isHour ? "rgba(30,41,59,0.15)" : isHalfHour ? "rgba(30,41,59,0.07)" : "rgba(30,41,59,0.02)";
                    let bgColor: string;
                    if (isClosed) bgColor = "rgba(239,68,68,0.04)";
                    else if (isToday) bgColor = isWorking ? "rgba(251,191,36,0.10)" : "rgba(251,191,36,0.02)";
                    else if (isWeekend) bgColor = isWorking ? "rgba(248,250,252,0.9)" : "rgba(248,250,252,0.5)";
                    else bgColor = isWorking ? "white" : "rgba(241,245,249,0.5)";
                    return (
                      <div
                        key={slot}
                        className="absolute left-0 right-0"
                        style={{ top: i * SLOT_H, height: SLOT_H, backgroundColor: bgColor, borderTop: `1px solid ${borderColor}` }}
                      />
                    );
                  })}

                  {!isClosed && whStart && whEnd && (() => {
                    const startOffset = ((timeToMinutes(whStart) - firstSlotMin) / 15) * SLOT_H;
                    const endOffset = ((timeToMinutes(whEnd === "00:00" ? "24:00" : whEnd) - firstSlotMin) / 15) * SLOT_H;
                    return (
                      <>
                        <div className="absolute left-0 right-0 pointer-events-none" style={{ top: startOffset, height: 1.5, backgroundColor: "rgba(30,41,59,0.12)", zIndex: 2 }} />
                        <div className="absolute left-0 right-0 pointer-events-none" style={{ top: endOffset, height: 1.5, backgroundColor: "rgba(30,41,59,0.12)", zIndex: 2 }} />
                      </>
                    );
                  })()}

                  {appts.sort((a, b) => a.ora.localeCompare(b.ora)).map(p => {
                    const svc = serviceById[p.serviciuId || ""];
                    const endTime = svc?.duration ? addMinutesToTime(p.ora, svc.duration) : null;
                    const startMin = timeToMinutes(p.ora) - firstSlotMin;
                    const topPx = (startMin / 15) * SLOT_H;
                    const durMin = svc?.duration || 30;
                    const heightPx = Math.max((durMin / 15) * SLOT_H - 3, 22);
                    const colorIdx = rawStaff.length === 0 ? 0 : (staffColorMap[p.expertId || ""] ?? 0);
                    const color = SPECIALIST_COLORS[colorIdx];
                    return (
                      <button
                        key={p.id}
                        onClick={() => onEdit(p)}
                        className="absolute rounded overflow-hidden hover:brightness-95 hover:shadow-sm transition-all text-left px-1.5 py-0.5"
                        style={{
                          top: topPx + 1, height: heightPx, left: 3, right: 3, zIndex: 10,
                          backgroundColor: "white",
                          border: "1px solid rgba(0,0,0,0.07)",
                          borderLeft: `3px solid ${color.colBorder}`,
                          boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                        }}
                      >
                        <p className={`text-[8px] font-bold leading-none opacity-60 ${color.text}`}>{p.ora}{endTime ? ` → ${endTime}` : ""}</p>
                        <p className={`text-[9px] font-bold truncate leading-tight ${color.text}`}>{p.nume}</p>
                        {svc && heightPx > 36 && <p className={`text-[7px] truncate opacity-50 ${color.text}`}>{svc.nume_serviciu}</p>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MonthView ────────────────────────────────────────────────────────────────
function MonthView({
  selectedDate, programariByDate, rawStaff, serviceById,
  onEdit, onDayClick, selectedExpert, selectedServiciu, programari, adminWorkingHours,
}: {
  selectedDate: Date; programariByDate: Record<string, Programare[]>; rawStaff: StaffRow[];
  serviceById: Record<string, ServiceRow>; onEdit: (p: Programare) => void;
  onDayClick: (d: Date) => void; selectedExpert: string; selectedServiciu: string;
  programari: Programare[]; adminWorkingHours: WorkingHour[];
}) {
  const today = useMemo(() => new Date(), []);
  const whByDay = useMemo(() => {
    const m: Record<string, WorkingHour> = {};
    adminWorkingHours.forEach(h => { m[h.day] = h; });
    return m;
  }, [adminWorkingHours]);

  const monthGrid = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const first = new Date(year, month, 1);
    const start = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Date[] = [];
    for (let i = 0; i < start; i++) cells.push(addDays(first, i - start));
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(addDays(cells[cells.length - 1], 1));
    return cells;
  }, [selectedDate]);

  const staffColorMap = useMemo(() => {
    const m: Record<string, number> = {};
    rawStaff.forEach((s, i) => { m[s.id] = i % SPECIALIST_COLORS.length; });
    return m;
  }, [rawStaff]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-white sticky top-0 z-10">
          {TXT.dayShort.map((d, i) => (
            <div
              key={d}
              className={`text-center font-bold text-[9px] py-2 uppercase tracking-widest border-r last:border-r-0 border-slate-200 ${i >= 5 ? "text-slate-300" : "text-slate-400"}`}
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7" style={{ minWidth: 700 }}>
          {monthGrid.map((day, idx) => {
            const key = formatDateKey(day);
            const allList = programariByDate[key] || [];
            const list = allList.filter(p =>
              (!selectedExpert || p.expertId === selectedExpert) &&
              (!selectedServiciu || p.serviciuId === selectedServiciu)
            );
            const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
            const isToday = sameDay(day, today);
            const dow = (day.getDay() + 6) % 7;
            const isWeekend = dow >= 5;
            const dayName = TXT.dayLong[day.getDay()];
            const wh = whByDay[dayName];
            const isClosed = !!wh?.closed;

            return (
              <div
                key={idx}
                onClick={() => onDayClick(day)}
                className={`min-h-[100px] p-1.5 flex flex-col cursor-pointer transition-colors border-b border-r border-slate-200 ${!isCurrentMonth ? "opacity-25" : ""}`}
                style={{
                  backgroundColor: !isCurrentMonth
                    ? "#f8fafc"
                    : isClosed
                    ? "rgba(239,68,68,0.04)"
                    : isToday
                    ? "rgba(251,191,36,0.06)"
                    : isWeekend
                    ? "#f8fafc"
                    : "white",
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-lg ${
                      isToday
                        ? "bg-amber-500 text-white"
                        : isClosed
                        ? "text-red-300"
                        : isWeekend && isCurrentMonth
                        ? "text-slate-300"
                        : "text-slate-500"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {isClosed && isCurrentMonth && (
                    <span className="text-[7px] font-bold text-red-400 uppercase">Închis</span>
                  )}
                </div>
                <div className="space-y-0.5 flex-1 overflow-hidden">
                  {list.slice(0, 4).map(p => {
                    const colorIdx = staffColorMap[p.expertId || ""] ?? 0;
                    const color = SPECIALIST_COLORS[colorIdx];
                    return (
                      <button
                        key={p.id}
                        onClick={e => { e.stopPropagation(); onEdit(p); }}
                        className={`w-full text-left px-1.5 py-0.5 rounded border ${color.bg} ${color.border} hover:brightness-95 transition-all flex items-center gap-1`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color.avatar}`} />
                        <span className={`text-[7px] font-bold flex-shrink-0 opacity-60 ${color.text}`}>{p.ora}</span>
                        <span className={`text-[8px] font-bold truncate ${color.text}`}>{p.nume}</span>
                      </button>
                    );
                  })}
                  {list.length > 4 && (
                    <p className="text-[7px] font-bold text-amber-600 pl-1">+{list.length - 4} mai multe</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── PeriodLabel ──────────────────────────────────────────────────────────────
// FIX: afișează perioada corectă în funcție de modul de vizualizare
function PeriodLabel({ viewMode, selectedDate }: { viewMode: ViewMode; selectedDate: Date }) {
  const label = useMemo(() => {
    if (viewMode === "day") {
      const dow = TXT.dayLong[selectedDate.getDay()];
      const day = selectedDate.getDate();
      const month = TXT.months[selectedDate.getMonth()];
      const year = selectedDate.getFullYear();
      return `${dow}, ${day} ${month} ${year}`;
    }
    if (viewMode === "week") {
      const start = getWeekStart(selectedDate);
      const end = addDays(start, 6);
      const sDay = start.getDate();
      const eDay = end.getDate();
      const sMonth = TXT.monthsShort[start.getMonth()];
      const eMonth = TXT.monthsShort[end.getMonth()];
      const year = end.getFullYear();
      if (start.getMonth() === end.getMonth()) {
        return `${sDay} – ${eDay} ${eMonth} ${year}`;
      }
      return `${sDay} ${sMonth} – ${eDay} ${eMonth} ${year}`;
    }
    // month
    return `${TXT.months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  }, [viewMode, selectedDate]);

  return (
    <span className="text-[10px] font-bold text-slate-600 truncate max-w-[140px] hidden sm:block">
      {label}
    </span>
  );
}

// ─── CalendarContent ──────────────────────────────────────────────────────────
function CalendarContent() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const modalRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);       // FIX: ref pentru search dropdown
  const qClient = useQueryClient();

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExpert, setSelectedExpert] = useState("");
  const [selectedServiciu, setSelectedServiciu] = useState("");
  const [editForm, setEditForm] = useState<Programare | null>(null);
  const [newAppointmentForm, setNewAppointmentForm] = useState<{
    date: string; time: string; nume: string; telefon: string;
    email: string; serviciuId: string; expertId: string; motiv: string;
  } | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);
  const [searchResults, setSearchResults] = useState<Programare[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // FIX: închide search dropdown la click în afara lui
  useEffect(() => {
    function handleClickOutsideSearch(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutsideSearch);
    return () => document.removeEventListener("mousedown", handleClickOutsideSearch);
  }, []);

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
    staleTime: 1000 * 60 * 5,
  });
  const userId = session?.user?.id;

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["profile", userId], enabled: !!userId, staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data } = await supabase.from("profiles")
        .select("plan_type, trial_started_at, manual_blocks, working_hours")
        .eq("id", userId!).single();
      return data;
    },
  });

  const { data: rawStaff = [] } = useQuery<StaffRow[]>({
    queryKey: ["staff", userId], enabled: !!userId, staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data } = await supabase.from("staff").select("id, name, services").eq("user_id", userId!);
      return data ?? [];
    },
  });

  const { data: rawServices = [] } = useQuery<ServiceRow[]>({
    queryKey: ["services", userId], enabled: !!userId, staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data } = await supabase.from("services").select("id, nume_serviciu, price, duration").eq("user_id", userId!);
      return data ?? [];
    },
  });

  const dateRange = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    return {
      start: new Date(year, month - 2, 1).toISOString().split("T")[0],
      end: new Date(year, month + 3, 0).toISOString().split("T")[0],
    };
  }, [selectedDate.getFullYear(), selectedDate.getMonth()]);

  const { data: programari = [], isLoading, refetch: refetchAppts } = useQuery<Programare[]>({
    queryKey: ["appointments", userId, dateRange.start, dateRange.end], enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments")
        .select("id, title, prenume, nume, email, date, time, details, phone, poza, file_url, documente, angajat_id, serviciu_id, duration")
        .eq("user_id", userId!)
        .gte("date", dateRange.start)
        .lte("date", dateRange.end)
        .order("date", { ascending: true });
      if (error) return [];
      return (data ?? []).map(mapRow);
    },
  });

  // FIX: working_hours se sincronizează în timp real din Supabase (settings)
  useEffect(() => {
    if (!userId) return;
    const ch1 = supabase.channel(`cal-profile-${userId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` }, () => refetchProfile())
      .subscribe();
    const ch2 = supabase.channel(`cal-appts-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `user_id=eq.${userId}` }, () => refetchAppts())
      .subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [userId]);

  // FIX: staleTime 0 pentru profile — astfel la orice refetch se actualizează imediat
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
    return { userSubscription: { plan: planFinal } };
  }, [profile]);

  const hasWhatsAppAccess = userSubscription?.plan.includes("ELITE") || userSubscription?.plan.includes("TEAM");

  useEffect(() => {
    if (!editForm) return;
    const srvName = rawServices.find(s => s.id === editForm.serviciuId)?.nume_serviciu;
    setCustomMessage(`Bună, ${editForm.nume}! Te așteptăm la programarea din ${editForm.data}, ora ${editForm.ora}${srvName ? ` pentru ${srvName}` : ""}. O zi bună!`);
  }, [editForm?.id]);

  // FIX: modal se închide la click în afară, dar nu când sunt deschise picker-ele
  useEffect(() => {
    function handleClickOutsideModal(event: MouseEvent) {
      if (showEditDatePicker || showEditTimePicker) return; // picker-ele au overlay propriu
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        handleCloseModal();
      }
    }
    if (editForm) document.addEventListener("mousedown", handleClickOutsideModal);
    return () => document.removeEventListener("mousedown", handleClickOutsideModal);
  }, [editForm, showEditDatePicker, showEditTimePicker]);

  const handleSearch = useCallback((query: string) => {
    if (!query.trim()) { setSearchResults([]); setShowSearchDropdown(false); return; }
    const results = programari.filter(p =>
      p.nume.toLowerCase().includes(query.toLowerCase()) ||
      p.telefon?.includes(query) ||
      p.email?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);
    setSearchResults(results);
    setShowSearchDropdown(results.length > 0);
  }, [programari]);

  const handleOpenEdit = useCallback((p: Programare) => {
    setEditForm({ ...p });
    setShowEditDatePicker(false);
    setShowEditTimePicker(false);
    setShowSearchDropdown(false);   // FIX: închide dropdown-ul la selectare
    setSearchTerm("");               // FIX: curăță search-ul după selectare
    setSearchResults([]);
  }, []);

  const handleCloseModal = useCallback(() => {
    setEditForm(null);
    setNewAppointmentForm(null);
    setShowEditDatePicker(false);
    setShowEditTimePicker(false);
    setShowSearchDropdown(false);
  }, []);

  const handleUpdate = async () => {
    if (!editForm) return;
    const service = rawServices.find(s => s.id === editForm.serviciuId);
    const duration = service?.duration || editForm.duration || 0;
    const { error } = await supabase.from("appointments").update({
      title: editForm.nume, prenume: editForm.nume, nume: editForm.nume,
      email: editForm.email || null, date: editForm.data, time: editForm.ora, duration,
      phone: editForm.telefon || null, details: editForm.motiv || null,
      angajat_id: editForm.expertId || null, serviciu_id: editForm.serviciuId || null,
    }).eq("id", editForm.id);
    if (error) { await showToast({ message: error.message, type: "error" }); return; }
    qClient.invalidateQueries({ queryKey: ["appointments", userId] });
    await showToast({ message: "Programare actualizată cu succes!", type: "success" });
    handleCloseModal();
  };

  const handleDelete = async () => {
    if (!editForm) return;
    const confirmed = await showConfirm({
      title: "Ștergere Programare",
      message: `Sigur ștergi programarea lui ${editForm.nume}?`,
      confirmText: "Da, Șterge", type: "danger",
    });
    if (!confirmed) return;
    await supabase.from("appointments").delete().eq("id", editForm.id);
    qClient.invalidateQueries({ queryKey: ["appointments", userId] });
    handleCloseModal();
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 250);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const filteredProgramari = useMemo(
    () => programari.filter(p => {
      const matchSearch = !debouncedSearch ||
        p.nume.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.telefon?.includes(debouncedSearch);
      const matchExpert = !selectedExpert || p.expertId === selectedExpert;
      const matchService = !selectedServiciu || p.serviciuId === selectedServiciu;
      return matchSearch && matchExpert && matchService;
    }).sort((a, b) => a.ora.localeCompare(b.ora)),
    [programari, debouncedSearch, selectedExpert, selectedServiciu]
  );

  const programariByDate = useMemo(() => {
    const map: Record<string, Programare[]> = {};
    programari.forEach(p => {
      if (!p.data) return;
      if (!map[p.data]) map[p.data] = [];
      map[p.data].push(p);
    });
    return map;
  }, [programari]);

  const serviceById = useMemo(() => {
    const m: Record<string, ServiceRow> = {};
    rawServices.forEach(s => { m[s.id] = s; });
    return m;
  }, [rawServices]);

  const nav = useCallback((dir: number) => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      if (viewMode === "month") d.setMonth(d.getMonth() + dir);
      else if (viewMode === "week") d.setDate(d.getDate() + dir * 7);
      else d.setDate(d.getDate() + dir);
      return d;
    });
  }, [viewMode]);

  const handleSelectExpert = useCallback((expertId: string) => {
    setSelectedExpert(expertId);
    if (expertId && selectedServiciu) {
      const staff = rawStaff.find(s => s.id === expertId);
      if (staff?.services?.length && !staff.services.includes(selectedServiciu)) setSelectedServiciu("");
    }
  }, [selectedServiciu, rawStaff]);

  const handleSelectServiciu = useCallback((serviciuId: string) => {
    setSelectedServiciu(serviciuId);
    if (serviciuId && selectedExpert) {
      const staff = rawStaff.find(s => s.id === selectedExpert);
      if (staff?.services?.length && !staff.services.includes(serviciuId)) setSelectedExpert("");
    }
  }, [selectedExpert, rawStaff]);

  const angajatiFiltratiInModal = useMemo(() => {
    if (!editForm?.serviciuId) return rawStaff;
    return rawStaff.filter(a => a.services?.includes(editForm.serviciuId!));
  }, [editForm?.serviciuId, rawStaff]);

  const serviciiFiltrateInModal = useMemo(() => {
    if (!editForm?.expertId) return rawServices;
    const angajat = rawStaff.find(a => a.id === editForm.expertId);
    if (!angajat || !angajat.services?.length) return rawServices;
    return rawServices.filter(s => angajat.services.includes(s.id));
  }, [editForm?.expertId, rawStaff, rawServices]);

  const editExistingAppointments = useMemo(() => {
    if (!editForm) return [];
    return programari
      .filter(p => p.data === editForm.data && String(p.id) !== String(editForm.id))
      .map(p => ({ time: p.ora, duration: p.duration || 30 }));
  }, [programari, editForm?.data, editForm?.id]);

  const editServiceDuration = useMemo(() => {
    if (!editForm?.serviciuId) return 0;
    return rawServices.find(s => s.id === editForm.serviciuId)?.duration || 0;
  }, [editForm?.serviciuId, rawServices]);

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center animate-pulse">
            <span className="text-amber-500 font-bold text-sm">C</span>
          </div>
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Se încarcă Chronos...</span>
        </div>
      </div>
    );
  }

  if (!userId && !isDemo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-bold text-slate-300 uppercase text-sm">
        Autentificare necesară...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">

      {/* ── Modal editare programare ─────────────────────────────────────────── */}
      {editForm && (
        <>
          {showEditDatePicker && (
            <div className="fixed inset-0 z-[900] bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowEditDatePicker(false)}>
              <div onClick={e => e.stopPropagation()}>
                <ChronosDatePicker
                  value={editForm.data}
                  onChange={val => { setEditForm(prev => prev ? { ...prev, data: val, ora: "" } : null); setShowEditDatePicker(false); }}
                  minDate={today}
                  onClose={() => setShowEditDatePicker(false)}
                  workingHours={adminWorkingHours}
                  manualBlocks={adminManualBlocks}
                />
              </div>
            </div>
          )}
          {showEditTimePicker && (
            <div className="fixed inset-0 z-[900] bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowEditTimePicker(false)}>
              <div onClick={e => e.stopPropagation()}>
                <ChronosTimePicker
                  value={editForm.ora || "09:00"}
                  onChange={val => { setEditForm(prev => prev ? { ...prev, ora: val } : null); setShowEditTimePicker(false); }}
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

          {/* FIX: overlay modal — stopPropagation pe modalRef, restul închide */}
          <div
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[500] flex items-center justify-center p-4"
            onMouseDown={e => {
              // Dacă click-ul e direct pe overlay (nu pe modal), închidem
              if (e.target === e.currentTarget) handleCloseModal();
            }}
          >
            <div
              ref={modalRef}
              onMouseDown={e => e.stopPropagation()}
              className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-100 relative"
            >
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:bg-red-500 hover:text-white transition-all z-30 text-sm font-bold"
              >✕</button>

              {/* Header modal */}
              <div className="bg-slate-900 px-6 py-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 overflow-hidden flex items-center justify-center text-2xl flex-shrink-0">
                  {editForm.poza
                    ? <img src={editForm.poza} className="w-full h-full object-cover" alt="" />
                    : "👤"
                  }
                </div>
                <div>
                  <p className="text-amber-500 text-[9px] font-bold uppercase tracking-widest mb-0.5">Detalii programare</p>
                  <h2 className="text-xl font-bold text-white leading-tight">{editForm.nume}</h2>
                  <p className="text-slate-400 text-xs">{editForm.data} · {editForm.ora}</p>
                </div>
              </div>

              <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
                {/* Nume */}
                <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                  <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Nume complet</p>
                  <input
                    className="w-full bg-transparent text-base font-bold text-slate-900 outline-none"
                    value={editForm.nume}
                    onChange={e => setEditForm(prev => prev ? { ...prev, nume: e.target.value } : null)}
                  />
                </div>

                {/* Dată + Oră */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setShowEditDatePicker(true); setShowEditTimePicker(false); }}
                    className="bg-slate-900 text-white rounded-2xl py-3 px-4 flex flex-col items-center gap-0.5 hover:bg-slate-800 transition-all"
                  >
                    <span className="text-[8px] text-slate-400 font-bold uppercase">Data</span>
                    <span className="text-sm font-bold">📅 {editForm.data}</span>
                  </button>
                  <button
                    onClick={() => { setShowEditTimePicker(true); setShowEditDatePicker(false); }}
                    className="bg-slate-900 text-white rounded-2xl py-3 px-4 flex flex-col items-center gap-0.5 hover:bg-slate-800 transition-all"
                  >
                    <span className="text-[8px] text-slate-400 font-bold uppercase">Ora</span>
                    <span className="text-sm font-bold">🕐 {editForm.ora || "Alege..."}</span>
                  </button>
                </div>

                {/* Telefon + Email */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Telefon</p>
                    <input
                      className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none"
                      value={editForm.telefon || ""}
                      onChange={e => setEditForm(prev => prev ? { ...prev, telefon: e.target.value } : null)}
                    />
                  </div>
                  <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Email</p>
                    <input
                      className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none"
                      value={editForm.email || ""}
                      onChange={e => setEditForm(prev => prev ? { ...prev, email: e.target.value } : null)}
                    />
                  </div>
                </div>

                {/* Specialist + Serviciu */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-900 px-4 py-3 rounded-2xl">
                    <p className="text-[8px] font-bold text-amber-500 uppercase mb-1">Specialist</p>
                    <select
                      className="w-full bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
                      value={editForm.expertId || ""}
                      onChange={e => setEditForm(prev => prev ? { ...prev, expertId: e.target.value } : null)}
                    >
                      <option value="" className="bg-slate-900">Alege...</option>
                      {angajatiFiltratiInModal.map(a => (
                        <option key={a.id} value={a.id} className="bg-slate-900">{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-slate-900 px-4 py-3 rounded-2xl">
                    <p className="text-[8px] font-bold text-amber-500 uppercase mb-1">Serviciu</p>
                    <select
                      className="w-full bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
                      value={editForm.serviciuId || ""}
                      onChange={e => setEditForm(prev => prev ? { ...prev, serviciuId: e.target.value } : null)}
                    >
                      <option value="" className="bg-slate-900">Alege...</option>
                      {serviciiFiltrateInModal.map(s => (
                        <option key={s.id} value={s.id} className="bg-slate-900">{s.nume_serviciu}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Notițe */}
                <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                  <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Notițe</p>
                  <textarea
                    className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none resize-none"
                    rows={2}
                    value={editForm.motiv || ""}
                    onChange={e => setEditForm(prev => prev ? { ...prev, motiv: e.target.value } : null)}
                  />
                </div>

                {/* Documente atașate */}
                {editForm.documente && editForm.documente.length > 0 && (
                  <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-bold text-slate-400 uppercase mb-2">
                      Documente atașate ({editForm.documente.length})
                    </p>
                    <div className="space-y-1.5">
                      {editForm.documente.map(doc => {
                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.name || doc.url);
                        const isPdf = /\.pdf$/i.test(doc.name || doc.url);
                        return (
                          <a
                            key={doc.id}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl px-3 py-2 hover:border-amber-300 hover:bg-amber-50 transition-all group"
                          >
                            <span className="text-base flex-shrink-0">
                              {isImage ? "🖼️" : isPdf ? "📄" : "📎"}
                            </span>
                            <span className="text-xs font-bold text-slate-700 truncate flex-1 group-hover:text-amber-800">
                              {doc.name}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold flex-shrink-0 group-hover:text-amber-600">
                              Deschide ↗
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* WhatsApp */}
                <div className={`border px-4 py-3 rounded-2xl space-y-2 ${hasWhatsAppAccess ? "bg-green-50 border-green-100" : "bg-slate-50 border-slate-100 opacity-60"}`}>
                  <p className={`text-[8px] font-bold uppercase ${hasWhatsAppAccess ? "text-green-700" : "text-slate-400"}`}>
                    💬 Mesaj WhatsApp
                  </p>
                  <textarea
                    className={`w-full rounded-xl p-2.5 text-xs font-bold outline-none border resize-none ${
                      hasWhatsAppAccess
                        ? "bg-white/50 border-green-200 text-slate-700"
                        : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                    rows={2}
                    value={hasWhatsAppAccess ? customMessage : "Disponibil în planul ELITE sau TEAM..."}
                    onChange={e => { if (hasWhatsAppAccess) setCustomMessage(e.target.value); }}
                    readOnly={!hasWhatsAppAccess}
                  />
                  {hasWhatsAppAccess ? (
                    <button
                      onClick={() => {
                        const c = editForm.telefon?.replace(/\D/g, "");
                        window.open(`https://wa.me/${c?.startsWith("0") ? "4" + c : c}?text=${encodeURIComponent(customMessage)}`, "_blank");
                      }}
                      className="w-full py-2.5 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-all"
                    >
                      Trimite pe WhatsApp
                    </button>
                  ) : (
                    <div className="w-full py-2.5 bg-slate-200 text-slate-400 rounded-xl text-xs font-bold text-center cursor-not-allowed">
                      🔒 Necesită plan ELITE sau TEAM
                    </div>
                  )}
                </div>

                {/* Acțiuni */}
                <div className="flex flex-col gap-2 pt-1 border-t border-slate-100">
                  <div className="flex gap-2">
                    <button
                      onClick={handleCloseModal}
                      className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold text-xs hover:bg-slate-200 transition-all"
                    >
                      Anulează
                    </button>
                    <button
                      onClick={handleUpdate}
                      className="flex-[2] py-3 bg-slate-900 text-white rounded-2xl font-bold text-xs hover:bg-amber-600 transition-all"
                    >
                      Salvează modificările
                    </button>
                  </div>
                  <button
                    onClick={handleDelete}
                    className="w-full py-3 text-red-400 font-bold text-xs hover:bg-red-50 rounded-2xl transition-all"
                  >
                    Șterge definitiv 🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Modal programare nouă ────────────────────────────────────────────── */}
      {newAppointmentForm && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[500] flex items-center justify-center p-4"
          onMouseDown={e => { if (e.target === e.currentTarget) setNewAppointmentForm(null); }}
        >
          <div
            className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-100 p-5"
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Programare nouă</h2>
              <button
                onClick={() => setNewAppointmentForm(null)}
                className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:bg-red-500 hover:text-white transition-all font-bold text-sm"
              >✕</button>
            </div>
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-2xl flex items-center gap-3">
                <span className="text-amber-600 font-bold text-sm">📅</span>
                <div>
                  <p className="text-xs font-bold text-amber-800">{newAppointmentForm.date}</p>
                  <p className="text-[10px] text-amber-600 font-bold">ora {newAppointmentForm.time}</p>
                </div>
              </div>
              <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Nume complet</p>
                <input
                  className="w-full bg-transparent text-base font-bold text-slate-900 outline-none"
                  placeholder="Numele clientului..."
                  value={newAppointmentForm.nume}
                  onChange={e => setNewAppointmentForm(prev => prev ? { ...prev, nume: e.target.value } : null)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                  <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Telefon</p>
                  <input
                    className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none"
                    value={newAppointmentForm.telefon}
                    onChange={e => setNewAppointmentForm(prev => prev ? { ...prev, telefon: e.target.value } : null)}
                  />
                </div>
                <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                  <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Email</p>
                  <input
                    className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none"
                    value={newAppointmentForm.email}
                    onChange={e => setNewAppointmentForm(prev => prev ? { ...prev, email: e.target.value } : null)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-900 px-4 py-3 rounded-2xl">
                  <p className="text-[8px] font-bold text-amber-500 uppercase mb-1">Specialist</p>
                  <select
                    className="w-full bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
                    value={newAppointmentForm.expertId}
                    onChange={e => setNewAppointmentForm(prev => prev ? { ...prev, expertId: e.target.value } : null)}
                  >
                    <option value="" className="bg-slate-900">Alege...</option>
                    {rawStaff.map(a => (
                      <option key={a.id} value={a.id} className="bg-slate-900">{a.name}</option>
                    ))}
                  </select>
                </div>
                <div className="bg-slate-900 px-4 py-3 rounded-2xl">
                  <p className="text-[8px] font-bold text-amber-500 uppercase mb-1">Serviciu</p>
                  <select
                    className="w-full bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
                    value={newAppointmentForm.serviciuId}
                    onChange={e => setNewAppointmentForm(prev => prev ? { ...prev, serviciuId: e.target.value } : null)}
                  >
                    <option value="" className="bg-slate-900">Alege...</option>
                    {rawServices.map(s => (
                      <option key={s.id} value={s.id} className="bg-slate-900">{s.nume_serviciu}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Notițe</p>
                <textarea
                  className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none resize-none"
                  rows={2}
                  value={newAppointmentForm.motiv}
                  onChange={e => setNewAppointmentForm(prev => prev ? { ...prev, motiv: e.target.value } : null)}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setNewAppointmentForm(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold text-xs hover:bg-slate-200 transition-all"
                >
                  Anulează
                </button>
                <button
                  onClick={async () => {
                    if (!newAppointmentForm) return;
                    const { error } = await supabase.from("appointments").insert({
                      title: newAppointmentForm.nume, prenume: newAppointmentForm.nume,
                      nume: newAppointmentForm.nume, email: newAppointmentForm.email || null,
                      date: newAppointmentForm.date, time: newAppointmentForm.time,
                      phone: newAppointmentForm.telefon || null, details: newAppointmentForm.motiv || null,
                      angajat_id: newAppointmentForm.expertId || null,
                      serviciu_id: newAppointmentForm.serviciuId || null,
                      user_id: userId,
                      duration: rawServices.find(s => s.id === newAppointmentForm.serviciuId)?.duration || 15,
                    });
                    if (error) { await showToast({ message: error.message, type: "error" }); return; }
                    qClient.invalidateQueries({ queryKey: ["appointments", userId] });
                    await showToast({ message: "Programare adăugată cu succes!", type: "success" });
                    setNewAppointmentForm(null);
                  }}
                  className="flex-[2] py-3 bg-slate-900 text-white rounded-2xl font-bold text-xs hover:bg-amber-600 transition-all"
                >
                  Salvează
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Header principal ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2 flex-shrink-0">
        <Link href="/programari" className="group flex-shrink-0">
          <div className="w-8 h-8 bg-slate-100 group-hover:bg-slate-900 rounded-xl flex items-center justify-center transition-all">
            <span className="text-slate-500 group-hover:text-white text-xs font-bold">←</span>
          </div>
        </Link>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center">
            <span className="text-amber-500 font-bold text-xs">C</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-slate-900 leading-none">
              Calendar <span className="text-amber-600">Chronos</span>
            </h1>
            <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest leading-none">
              {isLoading ? "Se sincronizează..." : "Sincronizat"}
            </p>
          </div>
        </div>

        {/* Search — FIX: wrapat în ref pentru click outside */}
        <div ref={searchRef} className="flex-1 max-w-xs relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Caută client..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); handleSearch(e.target.value); }}
            onFocus={() => { if (searchResults.length > 0) setShowSearchDropdown(true); }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-8 pr-10 text-xs font-bold text-slate-700 outline-none focus:border-amber-400 transition-all"
          />
          <button
            onClick={() => { handleSearch(searchTerm); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-900 text-white px-2 py-0.5 rounded-lg text-[8px] font-bold hover:bg-amber-600 transition-all"
          >
            Caută
          </button>
          {/* FIX: dropdown se închide la click pe orice item sau la click în afară (via searchRef) */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto">
              {searchResults.map(p => (
                <button
                  key={p.id}
                  onMouseDown={e => {
                    e.preventDefault(); // previne blur înainte de click
                    setSearchTerm(p.nume);
                    setShowSearchDropdown(false);
                    handleOpenEdit(p);
                  }}
                  className="w-full px-4 py-2.5 border-b border-slate-100 last:border-b-0 text-left hover:bg-slate-50 transition-all"
                >
                  <span className="text-xs font-bold text-slate-800 block">{p.nume}</span>
                  {p.telefon && <span className="text-[9px] text-slate-400">📞 {p.telefon}</span>}
                  <span className="text-[9px] text-slate-300 ml-2">{p.data} · {p.ora}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View mode selector */}
        <div className="flex bg-slate-100 p-0.5 rounded-xl gap-0.5 ml-auto flex-shrink-0">
          {(["day", "week", "month"] as ViewMode[]).map(opt => (
            <button
              key={opt}
              onClick={() => setViewMode(opt)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${
                viewMode === opt ? "bg-slate-900 text-white shadow" : "text-slate-400 hover:text-slate-700"
              }`}
            >
              {opt === "day" ? "Zi" : opt === "week" ? "Săpt." : "Lună"}
            </button>
          ))}
        </div>

        {/* FIX: PeriodLabel — afișează perioada curentă în funcție de view mode */}
        <PeriodLabel viewMode={viewMode} selectedDate={selectedDate} />

        {/* Navigare dată */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => nav(-1)}
            className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl transition-all text-slate-500 text-xs font-bold"
          >◀</button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="px-2 py-1.5 text-[9px] font-bold text-slate-500 hover:text-amber-600 transition-colors"
          >
            Azi
          </button>
          <button
            onClick={() => nav(1)}
            className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl transition-all text-slate-500 text-xs font-bold"
          >▶</button>
        </div>

        {userSubscription && (
          <span className="text-[7px] bg-slate-100 text-slate-400 px-2 py-1 rounded-lg font-bold uppercase hidden lg:block flex-shrink-0">
            {userSubscription.plan}
          </span>
        )}
      </div>

      {/* ── WeekStrip navigator ───────────────────────────────────────────────── */}
      <WeekStrip
        selectedDate={selectedDate}
        onSelectDate={d => { setSelectedDate(d); if (viewMode !== "day") setViewMode("day"); }}
        programariByDate={programariByDate}
        adminWorkingHours={adminWorkingHours}
      />

      {/* ── Filter bar — specialiști + servicii ──────────────────────────────── */}
      <FilterBar
        rawStaff={rawStaff}
        rawServices={rawServices}
        programari={programari}
        selectedExpert={selectedExpert}
        onSelectExpert={handleSelectExpert}
        selectedServiciu={selectedServiciu}
        onSelectServiciu={handleSelectServiciu}
        selectedDate={selectedDate}
      />

      {/* ── Body principal ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {isLoading && (
          <div className="w-full h-0.5 bg-amber-100 overflow-hidden flex-shrink-0">
            <div className="h-full w-1/3 bg-amber-500 animate-pulse" />
          </div>
        )}

        {viewMode === "day" && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <DayView
              selectedDate={selectedDate}
              programari={filteredProgramari}
              rawStaff={rawStaff}
              rawServices={rawServices}
              serviceById={serviceById}
              onEdit={handleOpenEdit}
              adminWorkingHours={adminWorkingHours}
              selectedExpert={selectedExpert}
              selectedServiciu={selectedServiciu}
              onSelectServiciu={handleSelectServiciu}
              onAddNewAppointment={(time, date) => setNewAppointmentForm({
                date, time, nume: "", telefon: "", email: "",
                serviciuId: "", expertId: selectedExpert || rawStaff[0]?.id || "", motiv: "",
              })}
            />
            <ServiceSummaryBar
              programari={programari}
              rawServices={rawServices}
              selectedDate={selectedDate}
              selectedExpert={selectedExpert}
              selectedServiciu={selectedServiciu}
              onSelectServiciu={handleSelectServiciu}
            />
          </div>
        )}

        {viewMode === "week" && (
          <div className="flex-1 overflow-hidden">
            <WeekView
              selectedDate={selectedDate}
              programari={programari}
              rawStaff={rawStaff}
              rawServices={rawServices}
              serviceById={serviceById}
              onEdit={handleOpenEdit}
              selectedExpert={selectedExpert}
              selectedServiciu={selectedServiciu}
              programariByDate={programariByDate}
              adminWorkingHours={adminWorkingHours}
            />
          </div>
        )}

        {viewMode === "month" && (
          <div className="flex-1 overflow-hidden">
            <MonthView
              selectedDate={selectedDate}
              programariByDate={programariByDate}
              rawStaff={rawStaff}
              serviceById={serviceById}
              onEdit={handleOpenEdit}
              onDayClick={d => { setSelectedDate(d); setViewMode("day"); }}
              selectedExpert={selectedExpert}
              selectedServiciu={selectedServiciu}
              programari={filteredProgramari}
              adminWorkingHours={adminWorkingHours}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 1000 * 60 * 5, refetchOnWindowFocus: false, retry: 1 } },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center animate-pulse">
              <span className="text-amber-500 font-bold text-sm">C</span>
            </div>
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Se încarcă Chronos...</span>
          </div>
        </div>
      }>
        <CalendarContent />
      </Suspense>
    </QueryClientProvider>
  );
}