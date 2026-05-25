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
const TIME_COL_W = 56;
const SPECIALIST_MIN_W = 160;

// ─── QueryClient ──────────────────────────────────────────────────────────────
// NOTE: Created inside component (useState) to fix hydration/reload issues

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

// Build slots only within working hours (or full day if no working hours set)
function buildSlotsForDay(whStart: string, whEnd: string, isClosed: boolean): string[] {
  // Always show full day but we'll use this to know working range
  const slots: string[] = [];
  for (let m = 0; m < 24 * 60; m += 15) {
    slots.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return slots;
}

const ALL_DAY_SLOTS: string[] = [];
for (let m = 0; m < 24 * 60; m += 15) {
  ALL_DAY_SLOTS.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
}
const TOTAL_HEIGHT = ALL_DAY_SLOTS.length * SLOT_H;

// ─── Strings ──────────────────────────────────────────────────────────────────
const TXT = {
  dayShort: ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"],
  dayLong: ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"],
  months: ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Noi", "Dec"],
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
  { bg: "bg-blue-200",   border: "border-blue-400",   text: "text-blue-900",   avatar: "bg-blue-500",   col: "#bfdbfe", colBorder: "#3b82f6",  colWork: "#bfdbfe", colOff: "#f0f7ff" },
  { bg: "bg-green-200",  border: "border-green-400",  text: "text-green-900",  avatar: "bg-green-500",  col: "#bbf7d0", colBorder: "#22c55e",  colWork: "#bbf7d0", colOff: "#f0fdf4" },
  { bg: "bg-purple-200", border: "border-purple-400", text: "text-purple-900", avatar: "bg-purple-500", col: "#ddd6fe", colBorder: "#8b5cf6",  colWork: "#ddd6fe", colOff: "#faf5ff" },
  { bg: "bg-amber-200",  border: "border-amber-400",  text: "text-amber-900",  avatar: "bg-amber-500",  col: "#fde68a", colBorder: "#f59e0b",  colWork: "#fde68a", colOff: "#fffbeb" },
  { bg: "bg-rose-200",   border: "border-rose-400",   text: "text-rose-900",   avatar: "bg-rose-500",   col: "#fecdd3", colBorder: "#f43f5e",  colWork: "#fecdd3", colOff: "#fff1f2" },
  { bg: "bg-cyan-200",   border: "border-cyan-400",   text: "text-cyan-900",   avatar: "bg-cyan-500",   col: "#a5f3fc", colBorder: "#06b6d4",  colWork: "#a5f3fc", colOff: "#ecfeff" },
  { bg: "bg-indigo-200", border: "border-indigo-400", text: "text-indigo-900", avatar: "bg-indigo-500", col: "#c7d2fe", colBorder: "#6366f1",  colWork: "#c7d2fe", colOff: "#eef2ff" },
  { bg: "bg-teal-200",   border: "border-teal-400",   text: "text-teal-900",   avatar: "bg-teal-500",   col: "#99f6e4", colBorder: "#14b8a6",  colWork: "#99f6e4", colOff: "#f0fdfa" },
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

// ─── Timeline Navigator ────────────────────────────────────────────────────────
// More compact version
function TimelineNavigator({ selectedDate, onSelectDate, programariByDate }: {
  selectedDate: Date; onSelectDate: (d: Date) => void; programariByDate: Record<string, Programare[]>;
}) {
  const today = new Date();
  const [displayYear, setDisplayYear] = useState(selectedDate.getFullYear());
  useEffect(() => { setDisplayYear(selectedDate.getFullYear()); }, [selectedDate.getFullYear()]);

  const monthHasAppts = useMemo(() => {
    const result: Record<number, boolean> = {};
    Object.entries(programariByDate).forEach(([k, v]) => {
      const parts = k.split("-");
      if (parts.length === 3 && parseInt(parts[0]) === displayYear && v.length > 0)
        result[parseInt(parts[1]) - 1] = true;
    });
    return result;
  }, [programariByDate, displayYear]);

  return (
    <div className="w-full bg-white border-b border-slate-200 select-none flex-shrink-0">
      {/* Month + Year row — more compact */}
      <div className="flex items-stretch border-b border-slate-100" style={{ height: 40 }}>
        <div className="flex items-center border-r border-slate-200 flex-shrink-0">
          <button onClick={() => setDisplayYear(y => y - 1)} className="w-7 h-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all text-[9px]">◀</button>
          <button
            onClick={() => onSelectDate(displayYear === today.getFullYear() ? today : new Date(displayYear, 0, 1))}
            className={`px-2 h-full flex flex-col items-center justify-center min-w-[48px] transition-all ${displayYear === selectedDate.getFullYear() ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <span className={`text-[7px] font-black uppercase tracking-widest leading-none ${displayYear === selectedDate.getFullYear() ? "text-amber-400" : "text-slate-400"}`}>AN</span>
            <span className="text-sm font-black italic leading-tight">{displayYear}</span>
          </button>
          <button onClick={() => setDisplayYear(y => y + 1)} className="w-7 h-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all text-[9px]">▶</button>
        </div>
        <div className="flex flex-1 divide-x divide-slate-100">
          {TXT.months.map((monthLabel, mIdx) => {
            const isSelectedMonth = selectedDate.getFullYear() === displayYear && selectedDate.getMonth() === mIdx;
            const isCurrentMonth = today.getFullYear() === displayYear && today.getMonth() === mIdx;
            const hasAppts = monthHasAppts[mIdx];
            return (
              <button key={mIdx}
                onClick={() => {
                  const day = (displayYear === selectedDate.getFullYear() && mIdx === selectedDate.getMonth()) ? selectedDate.getDate()
                    : (displayYear === today.getFullYear() && mIdx === today.getMonth()) ? today.getDate() : 1;
                  const maxDay = new Date(displayYear, mIdx + 1, 0).getDate();
                  onSelectDate(new Date(displayYear, mIdx, Math.min(day, maxDay)));
                }}
                className={`flex-1 flex flex-col items-center justify-center relative transition-all ${isSelectedMonth ? "bg-amber-500 text-white" : isCurrentMonth ? "bg-amber-50 text-amber-700" : "hover:bg-slate-50 text-slate-500"}`}
              >
                <span className={`text-[9px] font-black uppercase italic tracking-wide leading-none ${isSelectedMonth ? "text-white" : isCurrentMonth ? "text-amber-700" : "text-slate-600"}`}>{monthLabel}</span>
                {hasAppts ? <span className={`mt-0.5 w-1 h-1 rounded-full ${isSelectedMonth ? "bg-white/60" : "bg-amber-400"}`} /> : <span className="mt-0.5 w-1 h-1" />}
              </button>
            );
          })}
        </div>
      </div>
      {/* Day row — compact */}
      <div className="flex items-stretch" style={{ height: 32 }}>
        <div className="flex-shrink-0 border-r border-slate-100" style={{ width: `calc(28px + 48px + 28px)` }} />
        <div className="flex flex-1 divide-x divide-slate-100/60">
          {Array.from({ length: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate() }, (_, i) => {
            const day = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i + 1);
            const key = formatDateKey(day);
            const isSelected = sameDay(day, selectedDate);
            const isToday = sameDay(day, today);
            const hasAppts = (programariByDate[key] || []).length > 0;
            const dow = (day.getDay() + 6) % 7;
            const isWeekend = dow >= 5;
            return (
              <button key={i} onClick={() => onSelectDate(day)}
                className={`flex-1 flex flex-col items-center justify-center transition-all min-w-0 ${isSelected ? "bg-slate-900 text-white" : isToday ? "bg-amber-50 text-amber-700" : isWeekend ? "text-slate-300 hover:bg-slate-50" : "text-slate-500 hover:bg-slate-50"}`}
              >
                <span className={`text-[7px] font-black uppercase leading-none ${isSelected ? "text-amber-400" : "text-slate-300"}`}>{TXT.dayShort[dow].slice(0, 1)}</span>
                <span className={`text-[10px] font-black leading-tight ${isSelected ? "text-white" : ""}`}>{i + 1}</span>
                {hasAppts && <span className="w-1 h-1 rounded-full bg-amber-400" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── "TOȚI" Filter Panel ───────────────────────────────────────────────────────
// Replaces the hamburger + "TOȚI" button — shows experts (top half) + services (bottom half)
function TotiFilterPanel({ staffColumns, selectedExpert, onSelectExpert, rawServices, selectedServiciu, onSelectServiciu, rawStaff, onClose }: {
  staffColumns: Array<{ id: string; name: string; appts: Programare[]; colorIdx: number }>;
  selectedExpert: string; onSelectExpert: (id: string) => void;
  rawServices: ServiceRow[]; selectedServiciu: string; onSelectServiciu: (id: string) => void;
  rawStaff: StaffRow[]; onClose: () => void;
}) {
  const filteredServices = useMemo(() => {
    if (!selectedExpert) return rawServices;
    const selectedStaff = rawStaff.find(s => s.id === selectedExpert);
    if (!selectedStaff?.services?.length) return rawServices;
    return rawServices.filter(s => selectedStaff.services.includes(s.id));
  }, [selectedExpert, rawServices, rawStaff]);

  return (
    <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden" style={{ width: 280 }}>
      {/* Experts */}
      <div className="border-b border-slate-100">
        <div className="px-3 py-2 bg-slate-50 flex items-center justify-between">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 italic">Specialiști</span>
          {selectedExpert && (
            <button onClick={() => { onSelectExpert(""); onSelectServiciu(""); }} className="text-[7px] font-black text-amber-500 hover:text-amber-700 uppercase italic">Resetează</button>
          )}
        </div>
        <div className="p-2 flex flex-col gap-1 max-h-44 overflow-y-auto">
          {staffColumns.map(col => {
            const color = SPECIALIST_COLORS[col.colorIdx];
            const isSelected = selectedExpert === col.id;
            return (
              <button key={col.id}
                onClick={() => { onSelectExpert(isSelected ? "" : col.id); if (!isSelected) onSelectServiciu(""); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-left ${isSelected ? "bg-slate-900 text-white" : "hover:bg-slate-50"}`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 ${isSelected ? color.avatar + " text-white" : color.avatar + " text-white"}`}>
                  {col.name.slice(0, 1).toUpperCase()}
                </span>
                <span className={`text-[11px] font-black uppercase italic truncate ${isSelected ? "text-white" : "text-slate-700"}`}>{col.name}</span>
                {col.appts.length > 0 && (
                  <span className={`ml-auto text-[8px] font-black px-1.5 py-px rounded-full flex-shrink-0 ${isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{col.appts.length}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {/* Services */}
      <div>
        <div className="px-3 py-2 bg-slate-50 flex items-center justify-between">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 italic">Servicii</span>
          {selectedServiciu && (
            <button onClick={() => onSelectServiciu("")} className="text-[7px] font-black text-amber-500 hover:text-amber-700 uppercase italic">Resetează</button>
          )}
        </div>
        <div className="p-2 flex flex-col gap-1 max-h-44 overflow-y-auto">
          {filteredServices.map(s => {
            const isSelected = selectedServiciu === s.id;
            return (
              <button key={s.id}
                onClick={() => { onSelectServiciu(isSelected ? "" : s.id); onClose(); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-left ${isSelected ? "bg-amber-500 text-white" : "hover:bg-slate-50"}`}
              >
                <span className={`text-[11px] font-black uppercase italic truncate ${isSelected ? "text-white" : "text-slate-700"}`}>{s.nume_serviciu}</span>
                {s.duration > 0 && (
                  <span className={`ml-auto text-[8px] font-black flex-shrink-0 ${isSelected ? "text-white/70" : "text-slate-400"}`}>{s.duration} min</span>
                )}
              </button>
            );
          })}
          {filteredServices.length === 0 && (
            <p className="text-[9px] text-slate-300 font-black italic uppercase px-3 py-2">Niciun serviciu</p>
          )}
        </div>
      </div>
      {/* Close */}
      <div className="border-t border-slate-100 p-2">
        <button onClick={onClose} className="w-full py-2 text-[9px] font-black uppercase italic text-slate-400 hover:text-slate-700 transition-all">Închide</button>
      </div>
    </div>
  );
}

// ─── Specialist Header Bar ─────────────────────────────────────────────────────
// No hamburger, no selects — "TOȚI" button opens panel with experts+services
function SpecialistHeaderBar({ staffColumns, selectedExpert, onSelectExpert, rawServices, selectedServiciu, onSelectServiciu, rawStaff, headerScrollRef }: {
  staffColumns: Array<{ id: string; name: string; appts: Programare[]; colorIdx: number }>;
  selectedExpert: string; onSelectExpert: (id: string) => void;
  rawServices: ServiceRow[]; selectedServiciu: string; onSelectServiciu: (id: string) => void;
  rawStaff: StaffRow[]; headerScrollRef?: React.RefObject<HTMLDivElement>;
}) {
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!showPanel) return;
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPanel]);

  const hasFilter = !!selectedExpert || !!selectedServiciu;
  const filterLabel = useMemo(() => {
    const parts = [];
    if (selectedExpert) parts.push(rawStaff.find(s => s.id === selectedExpert)?.name ?? "");
    if (selectedServiciu) parts.push(rawServices.find(s => s.id === selectedServiciu)?.nume_serviciu ?? "");
    return parts.join(" · ");
  }, [selectedExpert, selectedServiciu, rawStaff, rawServices]);

  return (
    <div className="flex flex-shrink-0 border-b border-slate-700 bg-slate-900 z-10" style={{ minHeight: 52 }}>
      {/* TOȚI button — fixed, opens panel */}
      <div className="flex flex-shrink-0 border-r border-slate-700 relative" style={{ width: TIME_COL_W }}>
        <button
          ref={btnRef}
          onClick={() => setShowPanel(v => !v)}
          className={`flex-1 flex flex-col items-center justify-center transition-all ${showPanel ? "bg-amber-500" : hasFilter ? "bg-amber-600" : "bg-slate-800 hover:bg-slate-700"}`}
        >
          <span className={`text-[7px] font-black uppercase italic tracking-widest leading-none ${showPanel || hasFilter ? "text-white" : "text-slate-400"}`}>TOȚI</span>
          {hasFilter
            ? <span className="text-[6px] font-black text-white/70 mt-0.5 truncate max-w-full px-1 text-center leading-none">{filterLabel}</span>
            : <span className="text-[9px] font-black text-slate-500 mt-0.5">▼</span>
          }
        </button>
        {/* Dropdown panel */}
        {showPanel && (
          <div ref={panelRef} className="absolute top-full left-0 z-50">
            <TotiFilterPanel
              staffColumns={staffColumns}
              selectedExpert={selectedExpert}
              onSelectExpert={onSelectExpert}
              rawServices={rawServices}
              selectedServiciu={selectedServiciu}
              onSelectServiciu={onSelectServiciu}
              rawStaff={rawStaff}
              onClose={() => setShowPanel(false)}
            />
          </div>
        )}
      </div>

      {/* Specialist columns */}
      <div ref={headerScrollRef} className="flex flex-1 overflow-x-auto divide-x divide-slate-700" style={{ scrollbarWidth: "none" }}>
        {staffColumns.map(col => {
          const isSelected = selectedExpert === col.id;
          const color = SPECIALIST_COLORS[col.colorIdx];
          return (
            <button key={col.id}
              onClick={() => { onSelectExpert(isSelected ? "" : col.id); onSelectServiciu(""); }}
              className={`flex flex-col items-center justify-center px-3 py-2 transition-all flex-shrink-0 ${isSelected ? "bg-amber-500" : "bg-slate-800 hover:bg-slate-700"}`}
              style={{ minWidth: SPECIALIST_MIN_W }}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black mb-0.5 ${isSelected ? "bg-white text-amber-600" : color.avatar + " text-white"}`}>
                {col.name.slice(0, 1).toUpperCase()}
              </span>
              <span className={`text-[9px] font-black uppercase italic truncate max-w-full ${isSelected ? "text-white" : "text-slate-300"}`}>{col.name}</span>
              {col.appts.length > 0
                ? <span className={`text-[7px] font-black px-1 py-px rounded-full mt-0.5 ${isSelected ? "bg-white/20 text-white" : "bg-slate-700 text-slate-400"}`}>{col.appts.length} prog.</span>
                : <span className="text-[7px] font-black mt-0.5 text-slate-600">Liber</span>
              }
            </button>
          );
        })}
        {staffColumns.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-[10px] font-black text-slate-600 uppercase italic">Niciun specialist adăugat</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Day View ──────────────────────────────────────────────────────────────────
// No separate time column — time labels are rendered inside each specialist column's grid
function DayView({ selectedDate, programari, rawStaff, rawServices, serviceById, onEdit, adminWorkingHours, selectedExpert, selectedServiciu, onSelectExpert, onSelectServiciu, onAddNewAppointment }: {
  selectedDate: Date; programari: Programare[]; rawStaff: StaffRow[];
  rawServices: ServiceRow[]; serviceById: Record<string, ServiceRow>;
  onEdit: (p: Programare) => void; onAddNewAppointment: (time: string, date: string) => void;
  adminWorkingHours: WorkingHour[]; selectedExpert: string; selectedServiciu: string;
  onSelectExpert: (id: string) => void; onSelectServiciu: (id: string) => void;
}) {
  const dateKey = formatDateKey(selectedDate);
  const dayName = TXT.dayLong[selectedDate.getDay()];
  const daySchedule = adminWorkingHours.find(h => h.day === dayName);
  const isClosed = !!daySchedule?.closed;
  const whStart = daySchedule?.start || "";
  const whEnd = daySchedule?.end || "";

  const bodyColsRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  // Determine visible slots range based on working hours
  const visibleSlots = useMemo(() => {
    if (isClosed || !whStart || !whEnd) return ALL_DAY_SLOTS;
    // Show 1 hour before and after working hours, clamped to 00:00–24:00
    const startMin = Math.max(0, timeToMinutes(whStart) - 60);
    const endMin = Math.min(24 * 60, timeToMinutes(whEnd === "00:00" ? "24:00" : whEnd) + 60);
    return ALL_DAY_SLOTS.filter(slot => {
      const m = timeToMinutes(slot);
      return m >= startMin && m < endMin;
    });
  }, [isClosed, whStart, whEnd]);

  // Total height for visible range only
  const gridHeight = visibleSlots.length * SLOT_H;

  const syncScroll = useCallback((source: "body" | "header") => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    requestAnimationFrame(() => {
      if (source === "body" && bodyColsRef.current && headerScrollRef.current)
        headerScrollRef.current.scrollLeft = bodyColsRef.current.scrollLeft;
      isSyncing.current = false;
    });
  }, []);

  const dateAppts = programari.filter(p => p.data === dateKey);

  const allStaffColumns = useMemo(() => {
    if (rawStaff.length === 0) return [{ id: "general", name: "Programări", services: [] as string[], appts: dateAppts, colorIdx: 0 }];
    return rawStaff.map((staff, i) => ({
      id: staff.id, name: staff.name, services: staff.services,
      appts: dateAppts.filter(p => p.expertId === staff.id),
      colorIdx: i % SPECIALIST_COLORS.length,
    }));
  }, [rawStaff, dateAppts]);

  const visibleColumns = useMemo(() => {
    const cols = selectedExpert ? allStaffColumns.filter(c => c.id === selectedExpert) : allStaffColumns;
    return cols.map(col => ({
      ...col,
      appts: selectedServiciu ? col.appts.filter(p => p.serviciuId === selectedServiciu) : col.appts,
    }));
  }, [allStaffColumns, selectedExpert, selectedServiciu]);

  // Scroll to working hours start on mount
  useEffect(() => {
    const targetTime = whStart || `${new Date().getHours().toString().padStart(2, "0")}:00`;
    const targetMin = timeToMinutes(targetTime);
    const firstSlotMin = visibleSlots.length > 0 ? timeToMinutes(visibleSlots[0]) : 0;
    const offset = Math.max(0, ((targetMin - firstSlotMin) / 15) * SLOT_H - 60);
    setTimeout(() => { bodyColsRef.current?.scrollTo({ top: offset }); }, 50);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SpecialistHeaderBar staffColumns={allStaffColumns} selectedExpert={selectedExpert} onSelectExpert={onSelectExpert} rawServices={rawServices} selectedServiciu={selectedServiciu} onSelectServiciu={onSelectServiciu} rawStaff={rawStaff} headerScrollRef={headerScrollRef} />

      {isClosed && (
        <div className="flex-shrink-0 bg-red-50 border-b border-red-200 px-4 py-1.5 flex items-center gap-2">
          <span className="text-red-500 text-xs">🚫</span>
          <span className="text-[10px] font-black text-red-600 uppercase italic">Zi Închisă — Poți adăuga programări manual în afara orarului</span>
        </div>
      )}

      {/* Grid — no separate time column, time labels are inline */}
      <div ref={bodyColsRef} onScroll={() => syncScroll("body")} className="flex flex-1 overflow-auto">
        <div className="flex divide-x divide-slate-200" style={{ minWidth: visibleColumns.length * SPECIALIST_MIN_W + TIME_COL_W, height: gridHeight, position: "relative" }}>

          {/* Time label column — inside the scrollable area, not fixed */}
          <div className="flex-shrink-0 border-r border-slate-200 bg-white/80 sticky left-0 z-20" style={{ width: TIME_COL_W }}>
            {visibleSlots.map((slot, i) => {
              const isHour = slot.endsWith(":00");
              const isHalfHour = slot.endsWith(":30");
              const isWorking = !isClosed && whStart && whEnd && isWorkingSlot(slot, whStart, whEnd);
              const borderColor = isHour ? "rgba(30,41,59,0.28)" : isHalfHour ? "rgba(30,41,59,0.11)" : "rgba(30,41,59,0.04)";
              const bgColor = isClosed ? "rgba(239,68,68,0.04)" : isWorking ? "rgba(251,191,36,0.07)" : "rgba(15,23,42,0.025)";
              return (
                <div key={slot}
                  className="flex items-start justify-end pr-2"
                  style={{ height: SLOT_H, backgroundColor: bgColor, borderTop: `1px solid ${borderColor}` }}
                >
                  {isHour && (
                    <span className={`text-[9px] font-black mt-0.5 select-none ${isWorking && !isClosed ? "text-slate-600" : "text-slate-300"}`}>
                      {slot}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Specialist columns */}
          {visibleColumns.map(col => {
            const color = SPECIALIST_COLORS[col.colorIdx];
            return (
              <div key={col.id} className="relative flex-shrink-0" style={{ width: SPECIALIST_MIN_W }}>
                {/* Slot backgrounds */}
                {visibleSlots.map((slot, i) => {
                  const isHour = slot.endsWith(":00");
                  const isHalfHour = slot.endsWith(":30");
                  const isWorking = !isClosed && whStart && whEnd && isWorkingSlot(slot, whStart, whEnd);
                  const bgColor = isClosed ? "rgba(239,68,68,0.07)" : isWorking ? color.colWork : color.colOff;
                  const borderColor = isHour ? "rgba(30,41,59,0.25)" : isHalfHour ? "rgba(30,41,59,0.12)" : "rgba(30,41,59,0.05)";
                  return (
                    <div key={slot}
                      className="absolute left-0 right-0"
                      style={{ top: i * SLOT_H, height: SLOT_H, backgroundColor: bgColor, borderTop: `1px solid ${borderColor}` }}
                    />
                  );
                })}

                {/* Working hours boundary lines */}
                {!isClosed && whStart && whEnd && (() => {
                  const firstSlotMin = visibleSlots.length > 0 ? timeToMinutes(visibleSlots[0]) : 0;
                  const startOffset = ((timeToMinutes(whStart) - firstSlotMin) / 15) * SLOT_H;
                  const endOffset = ((timeToMinutes(whEnd === "00:00" ? "24:00" : whEnd) - firstSlotMin) / 15) * SLOT_H;
                  return (
                    <div className="absolute left-0 right-0 pointer-events-none" style={{ zIndex: 2 }}>
                      <div className="absolute left-0 right-0" style={{ top: startOffset, height: 2, backgroundColor: color.colBorder, opacity: 0.7 }} />
                      <div className="absolute left-0 right-0" style={{ top: endOffset, height: 2, backgroundColor: color.colBorder, opacity: 0.7 }} />
                    </div>
                  );
                })()}

                {/* Right border */}
                <div className="absolute top-0 right-0 bottom-0 w-px" style={{ backgroundColor: color.colBorder, opacity: 0.5 }} />

                {/* Appointments */}
                {col.appts.sort((a, b) => a.ora.localeCompare(b.ora)).map(p => {
                  const svc = serviceById[p.serviciuId || ""];
                  const endTime = svc?.duration ? addMinutesToTime(p.ora, svc.duration) : null;
                  const firstSlotMin = visibleSlots.length > 0 ? timeToMinutes(visibleSlots[0]) : 0;
                  const startMin = timeToMinutes(p.ora) - firstSlotMin;
                  const topPx = (startMin / 15) * SLOT_H;
                  const durMin = svc?.duration || 15;
                  const heightPx = Math.max((durMin / 15) * SLOT_H - 4, 24);
                  return (
                    <button key={p.id} onClick={() => onEdit(p)}
                      className="absolute rounded-lg px-2 py-1 text-left overflow-hidden hover:brightness-95 hover:shadow-lg transition-all"
                      style={{
                        top: topPx + 2, height: heightPx, left: 4, right: 4, zIndex: 10,
                        backgroundColor: "white", border: "1px solid rgba(0,0,0,0.10)",
                        borderLeft: `4px solid ${color.colBorder}`, boxShadow: "0 1px 3px rgba(0,0,0,0.10)",
                      }}
                    >
                      <p className={`text-[9px] font-black uppercase italic leading-tight ${color.text}`}>{p.ora}{endTime ? ` → ${endTime}` : ""}</p>
                      <p className={`text-[10px] font-black truncate leading-tight ${color.text}`}>{p.nume}</p>
                      {svc && heightPx > 44 && <p className={`text-[8px] font-bold truncate opacity-70 ${color.text}`}>{svc.nume_serviciu}</p>}
                    </button>
                  );
                })}

                {/* Clickable empty slots */}
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
                    <button key={`e-${col.id}-${slot}`} onClick={() => onAddNewAppointment(slot, dateKey)}
                      className="absolute left-0 right-0 hover:bg-white/20 transition-all" style={{ top: i * SLOT_H, height: SLOT_H, zIndex: 5 }}
                    />
                  );
                })}
              </div>
            );
          })}
          {visibleColumns.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[11px] font-black text-slate-300 uppercase italic">Niciun rezultat</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Week View ─────────────────────────────────────────────────────────────────
function WeekView({ selectedDate, programari, rawStaff, rawServices, serviceById, onEdit, selectedExpert, selectedServiciu, onSelectExpert, onSelectServiciu, programariByDate, adminWorkingHours }: {
  selectedDate: Date; programari: Programare[]; rawStaff: StaffRow[];
  rawServices: ServiceRow[]; serviceById: Record<string, ServiceRow>;
  onEdit: (p: Programare) => void; selectedExpert: string; selectedServiciu: string;
  onSelectExpert: (id: string) => void; onSelectServiciu: (id: string) => void;
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

  // Working hours for the week — use Monday's or first non-closed day
  const whByDay = useMemo(() => {
    const m: Record<string, WorkingHour> = {};
    adminWorkingHours.forEach(h => { m[h.day] = h; });
    return m;
  }, [adminWorkingHours]);

  // Global visible slots — union of all days' working hours ±1h
  const visibleSlots = useMemo(() => {
    let minStart = 24 * 60;
    let maxEnd = 0;
    let hasAnyWorkingHours = false;
    weekDays.forEach(day => {
      const dn = TXT.dayLong[day.getDay()];
      const wh = whByDay[dn];
      if (wh && !wh.closed && wh.start && wh.end) {
        hasAnyWorkingHours = true;
        minStart = Math.min(minStart, timeToMinutes(wh.start));
        maxEnd = Math.max(maxEnd, timeToMinutes(wh.end === "00:00" ? "24:00" : wh.end));
      }
    });
    if (!hasAnyWorkingHours) return ALL_DAY_SLOTS;
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

  const allStaffColumns = useMemo(() => {
    if (rawStaff.length === 0) return [{ id: "general", name: "Programări", services: [] as string[], appts: programari, colorIdx: 0 }];
    return rawStaff.map((staff, i) => ({
      id: staff.id, name: staff.name, services: staff.services,
      appts: programari.filter(p => p.expertId === staff.id),
      colorIdx: i % SPECIALIST_COLORS.length,
    }));
  }, [rawStaff, programari]);

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
      <SpecialistHeaderBar staffColumns={allStaffColumns} selectedExpert={selectedExpert} onSelectExpert={onSelectExpert} rawServices={rawServices} selectedServiciu={selectedServiciu} onSelectServiciu={onSelectServiciu} rawStaff={rawStaff} headerScrollRef={headerRef} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Day headers */}
        <div ref={headerRef} onScroll={() => syncScroll("header")} className="flex flex-shrink-0 border-b border-slate-200 bg-white overflow-x-auto" style={{ scrollbarWidth: "none", minWidth: 0 }}>
          <div className="flex" style={{ minWidth: totalBodyW }}>
            {/* Spacer for time column */}
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
                <div key={di}
                  className="flex flex-col items-center justify-center py-1.5 border-r border-slate-200 text-center flex-shrink-0"
                  style={{ width: COL_W, backgroundColor: isClosed ? "rgba(239,68,68,0.06)" : isToday ? "rgba(251,191,36,0.10)" : isWeekend ? "rgba(248,250,252,0.9)" : "white" }}
                >
                  <span className={`text-[9px] font-black uppercase italic tracking-wide ${isToday ? "text-amber-600" : isClosed ? "text-red-500" : isWeekend ? "text-slate-300" : "text-slate-500"}`}>{TXT.dayShort[dow]}</span>
                  <span className={`text-lg font-black italic leading-tight ${isToday ? "text-amber-600" : isClosed ? "text-red-400" : "text-slate-700"}`}>{day.getDate()}</span>
                  {isClosed
                    ? <span className="text-[7px] font-black text-red-400 uppercase italic">Închis</span>
                    : wh?.start ? <span className="text-[7px] font-black text-slate-400">{wh.start}–{wh.end}</span> : null
                  }
                  {apptCount > 0 && (
                    <span className={`text-[7px] font-black px-1.5 py-px rounded-full mt-0.5 ${isToday ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500"}`}>{apptCount}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Grid body */}
        <div ref={bodyRef} onScroll={() => syncScroll("body")} className="flex-1 overflow-auto">
          <div className="relative flex" style={{ minWidth: totalBodyW, height: gridHeight }}>
            {/* Sticky time labels column */}
            <div className="sticky left-0 z-20 bg-white/90 border-r border-slate-200 flex-shrink-0" style={{ width: TIME_COL_W }}>
              {visibleSlots.map((slot, i) => {
                const isHour = slot.endsWith(":00");
                const isHalfHour = slot.endsWith(":30");
                const borderColor = isHour ? "rgba(30,41,59,0.28)" : isHalfHour ? "rgba(30,41,59,0.11)" : "rgba(30,41,59,0.04)";
                return (
                  <div key={slot}
                    className="flex items-start justify-end pr-2"
                    style={{ height: SLOT_H, borderTop: `1px solid ${borderColor}`, backgroundColor: i % 2 === 0 ? "white" : "rgba(248,250,252,0.8)" }}
                  >
                    {isHour && <span className="text-[9px] font-black text-slate-500 mt-0.5 select-none">{slot}</span>}
                  </div>
                );
              })}
            </div>

            {/* Day columns */}
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
                <div key={di}
                  className="absolute top-0 flex-shrink-0 border-r border-slate-200"
                  style={{ left: di * COL_W + TIME_COL_W, width: COL_W, height: gridHeight }}
                >
                  {visibleSlots.map((slot, i) => {
                    const isHour = slot.endsWith(":00");
                    const isHalfHour = slot.endsWith(":30");
                    const isWorking = !isClosed && isWorkingSlot(slot, whStart, whEnd);
                    const borderColor = isHour ? "rgba(30,41,59,0.22)" : isHalfHour ? "rgba(30,41,59,0.09)" : "rgba(30,41,59,0.03)";
                    let bgColor: string;
                    if (isClosed) bgColor = "rgba(239,68,68,0.05)";
                    else if (isToday) bgColor = isWorking ? "rgba(251,191,36,0.12)" : "rgba(251,191,36,0.03)";
                    else if (isWeekend) bgColor = isWorking ? "rgba(248,250,252,0.95)" : "rgba(248,250,252,0.6)";
                    else bgColor = isWorking ? "white" : "rgba(241,245,249,0.6)";
                    return (
                      <div key={slot}
                        className="absolute left-0 right-0"
                        style={{ top: i * SLOT_H, height: SLOT_H, backgroundColor: bgColor, borderTop: `1px solid ${borderColor}` }}
                      />
                    );
                  })}

                  {/* Working hours boundaries */}
                  {!isClosed && whStart && whEnd && (() => {
                    const startOffset = ((timeToMinutes(whStart) - firstSlotMin) / 15) * SLOT_H;
                    const endOffset = ((timeToMinutes(whEnd === "00:00" ? "24:00" : whEnd) - firstSlotMin) / 15) * SLOT_H;
                    return (
                      <>
                        <div className="absolute left-0 right-0 pointer-events-none" style={{ top: startOffset, height: 2, backgroundColor: "rgba(30,41,59,0.15)", zIndex: 2 }} />
                        <div className="absolute left-0 right-0 pointer-events-none" style={{ top: endOffset, height: 2, backgroundColor: "rgba(30,41,59,0.15)", zIndex: 2 }} />
                      </>
                    );
                  })()}

                  {/* Appointments */}
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
                      <button key={p.id} onClick={() => onEdit(p)}
                        className="absolute rounded overflow-hidden hover:brightness-95 hover:shadow-md transition-all text-left px-1.5 py-0.5"
                        style={{
                          top: topPx + 1, height: heightPx, left: 3, right: 3, zIndex: 10,
                          backgroundColor: "white", border: "1px solid rgba(0,0,0,0.08)",
                          borderLeft: `3px solid ${color.colBorder}`, boxShadow: "0 1px 2px rgba(0,0,0,0.07)",
                        }}
                      >
                        <p className={`text-[8px] font-black italic leading-none opacity-70 ${color.text}`}>{p.ora}{endTime ? ` → ${endTime}` : ""}</p>
                        <p className={`text-[9px] font-black uppercase italic truncate leading-tight ${color.text}`}>{p.nume}</p>
                        {svc && heightPx > 36 && <p className={`text-[7px] truncate opacity-60 ${color.text}`}>{svc.nume_serviciu}</p>}
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

// ─── Month View ────────────────────────────────────────────────────────────────
function MonthView({ selectedDate, programariByDate, rawStaff, serviceById, onEdit, onDayClick, selectedExpert, selectedServiciu, onSelectExpert, onSelectServiciu, programari, rawServices, adminWorkingHours }: {
  selectedDate: Date; programariByDate: Record<string, Programare[]>; rawStaff: StaffRow[];
  serviceById: Record<string, ServiceRow>; onEdit: (p: Programare) => void;
  onDayClick: (d: Date) => void; selectedExpert: string; selectedServiciu: string;
  onSelectExpert: (id: string) => void; onSelectServiciu: (id: string) => void;
  programari: Programare[]; rawServices: ServiceRow[]; adminWorkingHours: WorkingHour[];
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

  const allStaffColumns = useMemo(() => {
    if (rawStaff.length === 0) return [{ id: "general", name: "Programări", services: [] as string[], appts: programari, colorIdx: 0 }];
    return rawStaff.map((staff, i) => ({
      id: staff.id, name: staff.name, services: staff.services,
      appts: programari.filter(p => p.expertId === staff.id),
      colorIdx: i % SPECIALIST_COLORS.length,
    }));
  }, [rawStaff, programari]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SpecialistHeaderBar staffColumns={allStaffColumns} selectedExpert={selectedExpert} onSelectExpert={onSelectExpert} rawServices={rawServices} selectedServiciu={selectedServiciu} onSelectServiciu={onSelectServiciu} rawStaff={rawStaff} />
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-white sticky top-0 z-10">
          {TXT.dayShort.map((d, i) => (
            <div key={d} className={`text-center font-black text-[9px] py-2 uppercase italic tracking-widest border-r last:border-r-0 border-slate-200 ${i >= 5 ? "text-slate-300" : "text-slate-500"}`}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7" style={{ minWidth: 700 }}>
          {monthGrid.map((day, idx) => {
            const key = formatDateKey(day);
            const allList = programariByDate[key] || [];
            const list = allList.filter(p => (!selectedExpert || p.expertId === selectedExpert) && (!selectedServiciu || p.serviciuId === selectedServiciu));
            const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
            const isToday = sameDay(day, today);
            const dow = (day.getDay() + 6) % 7;
            const isWeekend = dow >= 5;
            const dayName = TXT.dayLong[day.getDay()];
            const wh = whByDay[dayName];
            const isClosed = !!wh?.closed;

            return (
              <div key={idx} onClick={() => onDayClick(day)}
                className={`min-h-[110px] p-1.5 flex flex-col cursor-pointer transition-colors border-b border-r border-slate-200 ${!isCurrentMonth ? "opacity-25" : ""}`}
                style={{ backgroundColor: !isCurrentMonth ? "#f8fafc" : isClosed ? "rgba(239,68,68,0.04)" : isToday ? "rgba(251,191,36,0.06)" : isWeekend ? "#f8fafc" : "white" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-lg flex-shrink-0 ${isToday ? "bg-amber-500 text-white shadow-md shadow-amber-200" : isClosed ? "text-red-300" : isWeekend && isCurrentMonth ? "text-slate-300" : "text-slate-500"}`}>
                    {day.getDate()}
                  </span>
                  {isClosed && isCurrentMonth && <span className="text-[6px] font-black text-red-400 uppercase italic">Închis</span>}
                </div>
                <div className="space-y-0.5 flex-1 overflow-hidden">
                  {list.slice(0, 4).map(p => {
                    const colorIdx = staffColorMap[p.expertId || ""] ?? 0;
                    const color = SPECIALIST_COLORS[colorIdx];
                    return (
                      <button key={p.id} onClick={e => { e.stopPropagation(); onEdit(p); }}
                        className={`w-full text-left px-1.5 py-0.5 rounded-lg border ${color.bg} ${color.border} hover:brightness-95 transition-all flex items-center gap-1`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color.avatar}`} />
                        <span className={`text-[7px] font-black italic flex-shrink-0 opacity-60 ${color.text}`}>{p.ora}</span>
                        <span className={`text-[8px] font-black uppercase italic truncate ${color.text}`}>{p.nume}</span>
                      </button>
                    );
                  })}
                  {list.length > 4 && <p className="text-[7px] font-black text-amber-600 italic pl-1">+{list.length - 4} mai multe</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Calendar Content ─────────────────────────────────────────────────────
function CalendarContent() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const modalRef = useRef<HTMLDivElement>(null);
  const qClient = useQueryClient();

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExpert, setSelectedExpert] = useState("");
  const [selectedServiciu, setSelectedServiciu] = useState("");
  const [editForm, setEditForm] = useState<Programare | null>(null);
  const [newAppointmentForm, setNewAppointmentForm] = useState<{ date: string; time: string; nume: string; telefon: string; email: string; serviciuId: string; expertId: string; motiv: string } | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);
  const [searchResults, setSearchResults] = useState<Programare[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => { const { data: { session } } = await supabase.auth.getSession(); return session; },
    staleTime: 1000 * 60 * 5, // 5 minutes, not Infinity — fixes reload issue
  });
  const userId = session?.user?.id;

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["profile", userId], enabled: !!userId, staleTime: 1000 * 60 * 10,
    queryFn: async () => { const { data } = await supabase.from("profiles").select("plan_type, trial_started_at, manual_blocks, working_hours").eq("id", userId!).single(); return data; },
  });

  const { data: rawStaff = [] } = useQuery<StaffRow[]>({
    queryKey: ["staff", userId], enabled: !!userId, staleTime: 1000 * 60 * 10,
    queryFn: async () => { const { data } = await supabase.from("staff").select("id, name, services").eq("user_id", userId!); return data ?? []; },
  });

  const { data: rawServices = [] } = useQuery<ServiceRow[]>({
    queryKey: ["services", userId], enabled: !!userId, staleTime: 1000 * 60 * 10,
    queryFn: async () => { const { data } = await supabase.from("services").select("id, nume_serviciu, price, duration").eq("user_id", userId!); return data ?? []; },
  });

  const dateRange = useMemo(() => {
    const year = selectedDate.getFullYear(); const month = selectedDate.getMonth();
    return { start: new Date(year, month - 2, 1).toISOString().split("T")[0], end: new Date(year, month + 3, 0).toISOString().split("T")[0] };
  }, [selectedDate.getFullYear(), selectedDate.getMonth()]);

  const { data: programari = [], isLoading, refetch: refetchAppts } = useQuery<Programare[]>({
    queryKey: ["appointments", userId, dateRange.start, dateRange.end], enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select("id, title, prenume, nume, email, date, time, details, phone, poza, file_url, documente, angajat_id, serviciu_id, duration").eq("user_id", userId!).gte("date", dateRange.start).lte("date", dateRange.end).order("date", { ascending: true });
      if (error) return [];
      return (data ?? []).map(mapRow);
    },
  });

  useEffect(() => {
    if (!userId) return;
    const ch1 = supabase.channel(`cal-profile-${userId}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` }, () => refetchProfile()).subscribe();
    const ch2 = supabase.channel(`cal-appts-${userId}`).on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `user_id=eq.${userId}` }, () => refetchAppts()).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [userId]);

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
    if (profile.trial_started_at) { const start = new Date(profile.trial_started_at).getTime(); if (Date.now() - start < 10 * 24 * 60 * 60 * 1000) planFinal = "CHRONOS TEAM"; }
    return { userSubscription: { plan: planFinal } };
  }, [profile]);

  const hasWhatsAppAccess = userSubscription?.plan.includes("ELITE") || userSubscription?.plan.includes("TEAM");

  useEffect(() => {
    if (!editForm) return;
    const srvName = rawServices.find(s => s.id === editForm.serviciuId)?.nume_serviciu;
    setCustomMessage(`Bună, ${editForm.nume}! Te așteptăm la programarea din ${editForm.data}, ora ${editForm.ora}${srvName ? ` pentru ${srvName}` : ""}. O zi bună!`);
  }, [editForm?.id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node) && !showEditDatePicker && !showEditTimePicker) handleCloseModal();
    }
    if (editForm) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editForm, showEditDatePicker, showEditTimePicker]);

  const handleSearch = useCallback((query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setSearchResults(programari.filter(p => p.nume.toLowerCase().includes(query.toLowerCase()) || p.telefon?.includes(query) || p.email?.toLowerCase().includes(query.toLowerCase())).slice(0, 10));
  }, [programari]);

  const handleOpenEdit = useCallback((p: Programare) => { setEditForm({ ...p }); setShowEditDatePicker(false); setShowEditTimePicker(false); setShowSearchDropdown(false); }, []);
  const handleCloseModal = useCallback(() => { setEditForm(null); setNewAppointmentForm(null); setShowEditDatePicker(false); setShowEditTimePicker(false); setShowSearchDropdown(false); }, []);

  const handleUpdate = async () => {
    if (!editForm) return;
    const service = rawServices.find(s => s.id === editForm.serviciuId);
    const duration = service?.duration || editForm.duration || 0;
    const { error } = await supabase.from("appointments").update({ title: editForm.nume, prenume: editForm.nume, nume: editForm.nume, email: editForm.email || null, date: editForm.data, time: editForm.ora, duration, phone: editForm.telefon || null, details: editForm.motiv || null, angajat_id: editForm.expertId || null, serviciu_id: editForm.serviciuId || null }).eq("id", editForm.id);
    if (error) { await showToast({ message: error.message, type: "error" }); return; }
    qClient.invalidateQueries({ queryKey: ["appointments", userId] });
    await showToast({ message: "Programare actualizată cu succes!", type: "success" });
    handleCloseModal();
  };

  const handleDelete = async () => {
    if (!editForm) return;
    const confirmed = await showConfirm({ title: "Ștergere Programare", message: `Sigur ștergi programarea lui ${editForm.nume}?`, confirmText: "Da, Șterge", type: "danger" });
    if (!confirmed) return;
    await supabase.from("appointments").delete().eq("id", editForm.id);
    qClient.invalidateQueries({ queryKey: ["appointments", userId] });
    handleCloseModal();
  };

  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(searchTerm), 250); return () => clearTimeout(t); }, [searchTerm]);

  const filteredProgramari = useMemo(
    () => programari.filter(p => {
      const matchSearch = !debouncedSearch || p.nume.toLowerCase().includes(debouncedSearch.toLowerCase()) || p.telefon?.includes(debouncedSearch);
      const matchExpert = !selectedExpert || p.expertId === selectedExpert;
      const matchService = !selectedServiciu || p.serviciuId === selectedServiciu;
      return matchSearch && matchExpert && matchService;
    }).sort((a, b) => a.ora.localeCompare(b.ora)),
    [programari, debouncedSearch, selectedExpert, selectedServiciu]
  );

  const programariByDate = useMemo(() => {
    const map: Record<string, Programare[]> = {};
    programari.forEach(p => { if (!p.data) return; if (!map[p.data]) map[p.data] = []; map[p.data].push(p); });
    return map;
  }, [programari]);

  const serviceById = useMemo(() => { const m: Record<string, ServiceRow> = {}; rawServices.forEach(s => { m[s.id] = s; }); return m; }, [rawServices]);
  const nav = useCallback((dir: number) => { setSelectedDate(prev => { const d = new Date(prev); if (viewMode === "month") d.setMonth(d.getMonth() + dir); else if (viewMode === "week") d.setDate(d.getDate() + dir * 7); else d.setDate(d.getDate() + dir); return d; }); }, [viewMode]);

  const handleSelectExpert = useCallback((expertId: string) => {
    setSelectedExpert(expertId);
    if (expertId && selectedServiciu) { const staff = rawStaff.find(s => s.id === expertId); if (staff?.services?.length && !staff.services.includes(selectedServiciu)) setSelectedServiciu(""); }
  }, [selectedServiciu, rawStaff]);

  const handleSelectServiciu = useCallback((serviciuId: string) => {
    setSelectedServiciu(serviciuId);
    if (serviciuId && selectedExpert) { const staff = rawStaff.find(s => s.id === selectedExpert); if (staff?.services?.length && !staff.services.includes(serviciuId)) setSelectedExpert(""); }
  }, [selectedExpert, rawStaff]);

  const angajatiFiltratiInModal = useMemo(() => { if (!editForm?.serviciuId) return rawStaff; return rawStaff.filter(a => a.services?.includes(editForm.serviciuId!)); }, [editForm?.serviciuId, rawStaff]);
  const serviciiFiltrateInModal = useMemo(() => { if (!editForm?.expertId) return rawServices; const angajat = rawStaff.find(a => a.id === editForm.expertId); if (!angajat || !angajat.services?.length) return rawServices; return rawServices.filter(s => angajat.services.includes(s.id)); }, [editForm?.expertId, rawStaff, rawServices]);
  const editExistingAppointments = useMemo(() => { if (!editForm) return []; return programari.filter(p => p.data === editForm.data && String(p.id) !== String(editForm.id)).map(p => ({ time: p.ora, duration: p.duration || 30 })); }, [programari, editForm?.data, editForm?.id]);
  const editServiceDuration = useMemo(() => { if (!editForm?.serviciuId) return 0; return rawServices.find(s => s.id === editForm.serviciuId)?.duration || 0; }, [editForm?.serviciuId, rawServices]);

  // Loading state while session resolves — fixes the "need to reload" bug
  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center animate-pulse">
            <span className="text-amber-500 font-black text-sm italic">C</span>
          </div>
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Se încarcă Chronos...</span>
        </div>
      </div>
    );
  }

  if (!userId && !isDemo) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black italic text-slate-300 uppercase text-sm">Autentificare necesară...</div>;

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">

      {/* Edit Modal */}
      {editForm && (
        <>
          {showEditDatePicker && (
            <div className="fixed inset-0 z-[900] bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowEditDatePicker(false)}>
              <div onClick={e => e.stopPropagation()}><ChronosDatePicker value={editForm.data} onChange={val => { setEditForm(prev => prev ? { ...prev, data: val, ora: "" } : null); setShowEditDatePicker(false); }} minDate={today} onClose={() => setShowEditDatePicker(false)} workingHours={adminWorkingHours} manualBlocks={adminManualBlocks} /></div>
            </div>
          )}
          {showEditTimePicker && (
            <div className="fixed inset-0 z-[900] bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowEditTimePicker(false)}>
              <div onClick={e => e.stopPropagation()}><ChronosTimePicker value={editForm.ora || "09:00"} onChange={val => { setEditForm(prev => prev ? { ...prev, ora: val } : null); setShowEditTimePicker(false); }} onClose={() => setShowEditTimePicker(false)} workingHours={adminWorkingHours} existingAppointments={editExistingAppointments} selectedDate={editForm.data} serviceDuration={editServiceDuration} manualBlocks={adminManualBlocks} /></div>
            </div>
          )}
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[500] flex items-center justify-center p-4" onClick={handleCloseModal}>
            <div ref={modalRef} onClick={e => e.stopPropagation()} className="bg-white w-full max-w-xl rounded-[40px] overflow-hidden shadow-2xl border border-slate-100 relative">
              <button onClick={handleCloseModal} className="absolute top-6 right-6 w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 hover:bg-red-500 hover:text-white transition-all z-30">✕</button>
              <div className="h-36 bg-slate-900 flex items-end p-8">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-[24px] bg-white p-1 shadow-xl rotate-2"><div className="w-full h-full rounded-[18px] bg-slate-100 overflow-hidden flex items-center justify-center text-2xl">{editForm.poza ? <img src={editForm.poza} className="w-full h-full object-cover" alt="" /> : "👤"}</div></div>
                  <div><p className="text-amber-500 font-black text-[9px] uppercase italic tracking-[0.3em] mb-1">Detalii Programare</p><h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">{editForm.nume}</h2></div>
                </div>
              </div>
              <div className="p-8 space-y-5 max-h-[65vh] overflow-y-auto">
                <div className="bg-slate-50 p-5 rounded-[28px] border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase italic mb-1">Nume Complet</p><input className="w-full bg-transparent text-lg font-black uppercase italic text-slate-900 outline-none" value={editForm.nume} onChange={e => setEditForm(prev => prev ? { ...prev, nume: e.target.value } : null)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { setShowEditDatePicker(true); setShowEditTimePicker(false); }} className="h-[68px] bg-slate-900 text-white rounded-[22px] font-black uppercase italic hover:text-amber-500 transition-all flex flex-col items-center justify-center gap-1"><span className="text-[8px] text-slate-400">Data</span><span className="text-xs">📅 {editForm.data}</span></button>
                  <button onClick={() => { setShowEditTimePicker(true); setShowEditDatePicker(false); }} className="h-[68px] bg-slate-900 text-white rounded-[22px] font-black uppercase italic hover:text-amber-500 transition-all flex flex-col items-center justify-center gap-1"><span className="text-[8px] text-slate-400">Ora</span><span className="text-xs">🕐 {editForm.ora || "Alege..."}</span></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-4 rounded-[22px] border border-slate-100"><p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Telefon</p><input className="w-full bg-transparent font-black text-sm text-slate-800 outline-none italic" value={editForm.telefon || ""} onChange={e => setEditForm(prev => prev ? { ...prev, telefon: e.target.value } : null)} /></div>
                  <div className="bg-slate-50 p-4 rounded-[22px] border border-slate-100"><p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Email</p><input className="w-full bg-transparent font-black text-sm text-slate-800 outline-none italic" value={editForm.email || ""} onChange={e => setEditForm(prev => prev ? { ...prev, email: e.target.value } : null)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900 p-4 rounded-[22px]"><p className="text-[8px] font-black text-amber-500 uppercase italic mb-1">Specialist</p><select className="w-full bg-transparent font-black text-xs text-white outline-none cursor-pointer uppercase italic" value={editForm.expertId || ""} onChange={e => setEditForm(prev => prev ? { ...prev, expertId: e.target.value } : null)}><option value="" className="bg-slate-900">Alege...</option>{angajatiFiltratiInModal.map(a => <option key={a.id} value={a.id} className="bg-slate-900">{a.name}</option>)}</select></div>
                  <div className="bg-slate-900 p-4 rounded-[22px]"><p className="text-[8px] font-black text-amber-500 uppercase italic mb-1">Serviciu</p><select className="w-full bg-transparent font-black text-xs text-white outline-none cursor-pointer uppercase italic" value={editForm.serviciuId || ""} onChange={e => setEditForm(prev => prev ? { ...prev, serviciuId: e.target.value } : null)}><option value="" className="bg-slate-900">Alege...</option>{serviciiFiltrateInModal.map(s => <option key={s.id} value={s.id} className="bg-slate-900">{s.nume_serviciu}</option>)}</select></div>
                </div>
                <div className="bg-slate-50 p-4 rounded-[22px] border border-slate-100"><p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Notițe</p><textarea className="w-full bg-transparent text-xs font-bold italic text-slate-700 outline-none resize-none" rows={2} value={editForm.motiv || ""} onChange={e => setEditForm(prev => prev ? { ...prev, motiv: e.target.value } : null)} /></div>
                <div className={`border p-5 rounded-[22px] space-y-3 ${hasWhatsAppAccess ? "bg-green-50 border-green-100" : "bg-slate-50 border-slate-100 opacity-60"}`}>
                  <p className={`text-[9px] font-black uppercase italic ${hasWhatsAppAccess ? "text-green-700" : "text-slate-400"}`}>💬 Mesaj WhatsApp</p>
                  <textarea className={`w-full rounded-xl p-3 text-[11px] font-bold outline-none italic border resize-none ${hasWhatsAppAccess ? "bg-white/50 border-green-200 text-slate-700" : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"}`} rows={2} value={hasWhatsAppAccess ? customMessage : "Disponibil în planul ELITE sau TEAM..."} onChange={e => { if (hasWhatsAppAccess) setCustomMessage(e.target.value); }} readOnly={!hasWhatsAppAccess} />
                  {hasWhatsAppAccess
                    ? <button onClick={() => { const c = editForm.telefon?.replace(/\D/g, ""); window.open(`https://wa.me/${c?.startsWith("0") ? "4" + c : c}?text=${encodeURIComponent(customMessage)}`, "_blank"); }} className="w-full py-3 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase italic hover:bg-green-700 transition-all">Trimite pe WhatsApp</button>
                    : <div className="w-full py-3 bg-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase italic text-center cursor-not-allowed">🔒 Necesită Plan ELITE sau TEAM</div>
                  }
                </div>
                <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
                  <div className="flex gap-3">
                    <button onClick={handleCloseModal} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-[20px] font-black uppercase text-[10px] italic hover:bg-slate-200 transition-all">Anulează</button>
                    <button onClick={handleUpdate} className="flex-[2] py-4 bg-slate-900 text-white rounded-[20px] font-black uppercase text-[10px] italic hover:bg-amber-600 transition-all">Salvează</button>
                  </div>
                  <button onClick={handleDelete} className="w-full py-4 text-red-400 font-black uppercase text-[9px] italic hover:bg-red-50 rounded-[20px] transition-all">Șterge Definitiv 🗑️</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* New Appointment Modal */}
      {newAppointmentForm && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[40px] overflow-hidden shadow-2xl border border-slate-100 p-8">
            <h2 className="text-2xl font-black text-slate-900 uppercase italic mb-6">Adaugă Programare Nouă</h2>
            <div className="space-y-4">
              <div><p className="text-[9px] font-black text-slate-400 uppercase italic mb-1">Dată și Oră</p><p className="text-lg font-black text-slate-800">{newAppointmentForm.date} · {newAppointmentForm.time}</p></div>
              <div className="bg-slate-50 p-4 rounded-[22px] border border-slate-100"><p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Nume Complet</p><input className="w-full bg-transparent text-lg font-black uppercase italic text-slate-900 outline-none" value={newAppointmentForm.nume} onChange={e => setNewAppointmentForm(prev => prev ? { ...prev, nume: e.target.value } : null)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-[22px] border border-slate-100"><p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Telefon</p><input className="w-full bg-transparent font-black text-sm text-slate-800 outline-none italic" value={newAppointmentForm.telefon} onChange={e => setNewAppointmentForm(prev => prev ? { ...prev, telefon: e.target.value } : null)} /></div>
                <div className="bg-slate-50 p-4 rounded-[22px] border border-slate-100"><p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Email</p><input className="w-full bg-transparent font-black text-sm text-slate-800 outline-none italic" value={newAppointmentForm.email} onChange={e => setNewAppointmentForm(prev => prev ? { ...prev, email: e.target.value } : null)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 p-4 rounded-[22px]"><p className="text-[8px] font-black text-amber-500 uppercase italic mb-1">Specialist</p><select className="w-full bg-transparent font-black text-xs text-white outline-none cursor-pointer uppercase italic" value={newAppointmentForm.expertId} onChange={e => setNewAppointmentForm(prev => prev ? { ...prev, expertId: e.target.value } : null)}><option value="" className="bg-slate-900">Alege...</option>{rawStaff.map(a => <option key={a.id} value={a.id} className="bg-slate-900">{a.name}</option>)}</select></div>
                <div className="bg-slate-900 p-4 rounded-[22px]"><p className="text-[8px] font-black text-amber-500 uppercase italic mb-1">Serviciu</p><select className="w-full bg-transparent font-black text-xs text-white outline-none cursor-pointer uppercase italic" value={newAppointmentForm.serviciuId} onChange={e => setNewAppointmentForm(prev => prev ? { ...prev, serviciuId: e.target.value } : null)}><option value="" className="bg-slate-900">Alege...</option>{rawServices.map(s => <option key={s.id} value={s.id} className="bg-slate-900">{s.nume_serviciu}</option>)}</select></div>
              </div>
              <div className="bg-slate-50 p-4 rounded-[22px] border border-slate-100"><p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Notițe</p><textarea className="w-full bg-transparent text-xs font-bold italic text-slate-700 outline-none resize-none" rows={2} value={newAppointmentForm.motiv} onChange={e => setNewAppointmentForm(prev => prev ? { ...prev, motiv: e.target.value } : null)} /></div>
              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button onClick={() => setNewAppointmentForm(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-[20px] font-black uppercase text-[10px] italic hover:bg-slate-200 transition-all">Anulează</button>
                <button onClick={async () => {
                  if (!newAppointmentForm) return;
                  const { error } = await supabase.from("appointments").insert({ title: newAppointmentForm.nume, prenume: newAppointmentForm.nume, nume: newAppointmentForm.nume, email: newAppointmentForm.email || null, date: newAppointmentForm.date, time: newAppointmentForm.time, phone: newAppointmentForm.telefon || null, details: newAppointmentForm.motiv || null, angajat_id: newAppointmentForm.expertId || null, serviciu_id: newAppointmentForm.serviciuId || null, user_id: userId, duration: rawServices.find(s => s.id === newAppointmentForm.serviciuId)?.duration || 15 });
                  if (error) { await showToast({ message: error.message, type: "error" }); return; }
                  qClient.invalidateQueries({ queryKey: ["appointments", userId] });
                  await showToast({ message: "Programare adăugată cu succes!", type: "success" });
                  setNewAppointmentForm(null);
                }} className="flex-[2] py-4 bg-slate-900 text-white rounded-[20px] font-black uppercase text-[10px] italic hover:bg-amber-600 transition-all">Salvează</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER — more compact */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-3 flex-shrink-0">
        <Link href="/programari" className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-all group">
          <div className="w-8 h-8 bg-slate-100 group-hover:bg-slate-900 rounded-xl flex items-center justify-center transition-all">
            <span className="text-slate-500 group-hover:text-white text-xs">←</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-amber-500 font-black text-xs italic">C</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-black text-slate-900 tracking-tighter uppercase italic leading-none">Calendar <span className="text-amber-600">Chronos</span></h1>
            <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest leading-none">{isLoading ? "Se sincronizează..." : "Sincronizat"}</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-xs relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs">🔍</span>
          <input type="text" placeholder="Caută client..." value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); handleSearch(e.target.value); }}
            onFocus={() => { if (searchTerm.trim()) setShowSearchDropdown(true); }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-8 pr-12 text-xs font-bold text-slate-700 outline-none focus:border-amber-400 transition-all"
          />
          <button onClick={() => { handleSearch(searchTerm); setShowSearchDropdown(true); }} className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-900 text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase italic hover:bg-amber-600 transition-all">Caută</button>
          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-slate-200 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
              {searchResults.map(p => (
                <button key={p.id} onClick={() => { setSearchTerm(p.nume); setShowSearchDropdown(false); handleOpenEdit(p); }} className="w-full px-4 py-2.5 border-b border-slate-100 text-left hover:bg-slate-50 transition-all">
                  <span className="text-[11px] font-black uppercase italic text-slate-800 block">{p.nume}</span>
                  {p.telefon && <span className="text-[9px] font-bold text-slate-500">📞 {p.telefon}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View mode */}
        <div className="flex bg-slate-100 p-0.5 rounded-xl gap-0.5 ml-auto">
          {(["day", "week", "month"] as ViewMode[]).map(opt => (
            <button key={opt} onClick={() => setViewMode(opt)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase italic transition-all ${viewMode === opt ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-700"}`}>
              {opt === "day" ? "Zi" : opt === "week" ? "Săpt" : "Lună"}
            </button>
          ))}
        </div>

        {/* Nav */}
        <div className="flex items-center gap-1">
          <button onClick={() => nav(-1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl transition-all font-black text-slate-500 text-xs">◀</button>
          <button onClick={() => setSelectedDate(new Date())} className="px-2 py-1.5 text-[9px] font-black uppercase italic text-slate-500 hover:text-amber-600 transition-colors">Azi</button>
          <button onClick={() => nav(1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl transition-all font-black text-slate-500 text-xs">▶</button>
        </div>

        {userSubscription && (
          <span className="text-[7px] bg-slate-100 text-slate-400 px-2 py-1 rounded-lg font-black uppercase hidden md:block">{userSubscription.plan}</span>
        )}
      </div>

      {/* TIMELINE NAVIGATOR — compact */}
      <TimelineNavigator
        selectedDate={selectedDate}
        onSelectDate={d => { setSelectedDate(d); if (viewMode !== "day") setViewMode("day"); }}
        programariByDate={programariByDate}
      />

      {/* BODY */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {isLoading && <div className="w-full h-0.5 bg-amber-100 overflow-hidden flex-shrink-0"><div className="h-full w-1/3 bg-amber-500 animate-pulse" /></div>}

        {viewMode === "day" && (
          <div className="flex-1 overflow-hidden">
            <DayView selectedDate={selectedDate} programari={filteredProgramari} rawStaff={rawStaff} rawServices={rawServices} serviceById={serviceById} onEdit={handleOpenEdit} adminWorkingHours={adminWorkingHours} selectedExpert={selectedExpert} selectedServiciu={selectedServiciu} onSelectExpert={handleSelectExpert} onSelectServiciu={handleSelectServiciu}
              onAddNewAppointment={(time, date) => setNewAppointmentForm({ date, time, nume: "", telefon: "", email: "", serviciuId: "", expertId: selectedExpert || rawStaff[0]?.id || "", motiv: "" })} />
          </div>
        )}
        {viewMode === "week" && (
          <div className="flex-1 overflow-hidden">
            <WeekView selectedDate={selectedDate} programari={programari} rawStaff={rawStaff} rawServices={rawServices} serviceById={serviceById} onEdit={handleOpenEdit} selectedExpert={selectedExpert} selectedServiciu={selectedServiciu} onSelectExpert={handleSelectExpert} onSelectServiciu={handleSelectServiciu} programariByDate={programariByDate} adminWorkingHours={adminWorkingHours} />
          </div>
        )}
        {viewMode === "month" && (
          <div className="flex-1 overflow-hidden">
            <MonthView selectedDate={selectedDate} programariByDate={programariByDate} rawStaff={rawStaff} serviceById={serviceById} onEdit={handleOpenEdit} onDayClick={d => { setSelectedDate(d); setViewMode("day"); }} selectedExpert={selectedExpert} selectedServiciu={selectedServiciu} onSelectExpert={handleSelectExpert} onSelectServiciu={handleSelectServiciu} programari={filteredProgramari} rawServices={rawServices} adminWorkingHours={adminWorkingHours} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  // QueryClient in useState fixes the hydration/first-load bug
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 1000 * 60 * 5, refetchOnWindowFocus: false, retry: 1 } },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center animate-pulse">
              <span className="text-amber-500 font-black text-sm italic">C</span>
            </div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Se încarcă Chronos...</span>
          </div>
        </div>
      }>
        <CalendarContent />
      </Suspense>
    </QueryClientProvider>
  );
}