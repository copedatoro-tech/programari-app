"use client";

import React, {
  useState, useEffect, useMemo, Suspense, useCallback, useRef, memo,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { showToast, showConfirm } from "@/lib/toast";
import { ChronosTimePicker, ChronosDatePicker } from "@/components/ChronosDateTimePickers";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, refetchOnWindowFocus: false, retry: 1 } },
});

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

// ─── Strings ──────────────────────────────────────────────────────────────────
const TXT = {
  dayShort:   ["Lun","Mar","Mie","Joi","Vin","Sâm","Dum"],
  dayLong:    ["Duminică","Luni","Marți","Miercuri","Joi","Vineri","Sâmbătă"],
  months:     ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Noi","Dec"],
  monthsFull: ["Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie","Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"],
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

// Specialist color palette — consistent across all views
const SPECIALIST_COLORS = [
  { bg: "bg-blue-100",   border: "border-blue-300",   text: "text-blue-900",   avatar: "bg-blue-500",   light: "bg-blue-50",   chip: "bg-blue-500",   col: "#eff6ff",   colBorder: "#93c5fd" },
  { bg: "bg-green-100",  border: "border-green-300",  text: "text-green-900",  avatar: "bg-green-500",  light: "bg-green-50",  chip: "bg-green-500",  col: "#f0fdf4",   colBorder: "#86efac" },
  { bg: "bg-purple-100", border: "border-purple-300", text: "text-purple-900", avatar: "bg-purple-500", light: "bg-purple-50", chip: "bg-purple-500", col: "#faf5ff",   colBorder: "#c4b5fd" },
  { bg: "bg-amber-100",  border: "border-amber-300",  text: "text-amber-900",  avatar: "bg-amber-500",  light: "bg-amber-50",  chip: "bg-amber-500",  col: "#fffbeb",   colBorder: "#fcd34d" },
  { bg: "bg-rose-100",   border: "border-rose-300",   text: "text-rose-900",   avatar: "bg-rose-500",   light: "bg-rose-50",   chip: "bg-rose-500",   col: "#fff1f2",   colBorder: "#fda4af" },
  { bg: "bg-cyan-100",   border: "border-cyan-300",   text: "text-cyan-900",   avatar: "bg-cyan-500",   light: "bg-cyan-50",   chip: "bg-cyan-500",   col: "#ecfeff",   colBorder: "#67e8f9" },
  { bg: "bg-indigo-100", border: "border-indigo-300", text: "text-indigo-900", avatar: "bg-indigo-500", light: "bg-indigo-50", chip: "bg-indigo-500", col: "#eef2ff",   colBorder: "#a5b4fc" },
  { bg: "bg-teal-100",   border: "border-teal-300",   text: "text-teal-900",   avatar: "bg-teal-500",   light: "bg-teal-50",   chip: "bg-teal-500",   col: "#f0fdfa",   colBorder: "#5eead4" },
];

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
// FIX: removed apptCount display under month labels — was causing the "1" and "29" artifacts
function TimelineNavigator({
  selectedDate, onSelectDate, programariByDate,
}: {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  programariByDate: Record<string, Programare[]>;
}) {
  const today = new Date();
  const [displayYear, setDisplayYear] = useState(selectedDate.getFullYear());

  useEffect(() => { setDisplayYear(selectedDate.getFullYear()); }, [selectedDate.getFullYear()]);

  const daysInSelectedMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();

  // Count appointments per month for the dot indicator only (no number shown)
  const monthHasAppts = useMemo(() => {
    const result: Record<number, boolean> = {};
    Object.entries(programariByDate).forEach(([k, v]) => {
      const parts = k.split("-");
      if (parts.length === 3 && parseInt(parts[0]) === displayYear && v.length > 0) {
        result[parseInt(parts[1]) - 1] = true;
      }
    });
    return result;
  }, [programariByDate, displayYear]);

  return (
    <div className="w-full bg-white border-b-2 border-slate-200 select-none flex-shrink-0">
      {/* Month row */}
      <div className="flex items-stretch border-b border-slate-100" style={{ height: 52 }}>
        {/* Year navigator */}
        <div className="flex items-center border-r-2 border-slate-200 flex-shrink-0">
          <button onClick={() => setDisplayYear(y => y - 1)}
            className="w-9 h-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all font-black text-xs">◀</button>
          <button onClick={() => {
            const target = displayYear === today.getFullYear() ? today : new Date(displayYear, 0, 1);
            onSelectDate(target);
          }} className={`px-3 h-full flex flex-col items-center justify-center min-w-[58px] transition-all ${displayYear === selectedDate.getFullYear() ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
            <span className={`text-[8px] font-black uppercase tracking-widest ${displayYear === selectedDate.getFullYear() ? "text-amber-400" : "text-slate-400"}`}>AN</span>
            <span className="text-base font-black italic leading-none">{displayYear}</span>
          </button>
          <button onClick={() => setDisplayYear(y => y + 1)}
            className="w-9 h-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all font-black text-xs">▶</button>
        </div>

        {/* Month buttons — NO count number, only a dot indicator */}
        <div className="flex flex-1 divide-x divide-slate-100">
          {TXT.months.map((monthLabel, mIdx) => {
            const isSelectedMonth = selectedDate.getFullYear() === displayYear && selectedDate.getMonth() === mIdx;
            const isCurrentMonth = today.getFullYear() === displayYear && today.getMonth() === mIdx;
            const hasAppts = monthHasAppts[mIdx];
            return (
              <button key={mIdx}
                onClick={() => {
                  const day = (displayYear === selectedDate.getFullYear() && mIdx === selectedDate.getMonth())
                    ? selectedDate.getDate()
                    : (displayYear === today.getFullYear() && mIdx === today.getMonth()) ? today.getDate() : 1;
                  const maxDay = new Date(displayYear, mIdx + 1, 0).getDate();
                  onSelectDate(new Date(displayYear, mIdx, Math.min(day, maxDay)));
                }}
                className={`flex-1 flex flex-col items-center justify-center relative transition-all ${
                  isSelectedMonth
                    ? "bg-amber-500 text-white"
                    : isCurrentMonth
                    ? "bg-amber-50 text-amber-700"
                    : "hover:bg-slate-50 text-slate-500"
                }`}>
                <span className={`text-[10px] font-black uppercase italic tracking-wide leading-none ${
                  isSelectedMonth ? "text-white" : isCurrentMonth ? "text-amber-700" : "text-slate-600"
                }`}>{monthLabel}</span>
                {/* Only a dot — no number */}
                {hasAppts && (
                  <span className={`mt-1 w-1.5 h-1.5 rounded-full ${
                    isSelectedMonth ? "bg-white/60" : "bg-amber-400"
                  }`} />
                )}
                {!hasAppts && <span className="mt-1 w-1.5 h-1.5" />}
                {isCurrentMonth && !isSelectedMonth && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day row */}
      <div className="flex items-stretch divide-x divide-slate-100" style={{ height: 40 }}>
        {/* Spacer matching the year navigator width */}
        <div className="flex-shrink-0 border-r-2 border-slate-100" style={{ width: "calc(36px + 58px + 36px)" }} />
        <div className="flex flex-1 divide-x divide-slate-100/60">
          {Array.from({ length: daysInSelectedMonth }, (_, i) => {
            const day = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i + 1);
            const key = formatDateKey(day);
            const isSelected = sameDay(day, selectedDate);
            const isToday = sameDay(day, today);
            const hasAppts = (programariByDate[key] || []).length > 0;
            const dow = (day.getDay() + 6) % 7;
            const isWeekend = dow >= 5;
            return (
              <button key={i} onClick={() => onSelectDate(day)}
                className={`flex-1 flex flex-col items-center justify-center transition-all min-w-0 ${
                  isSelected
                    ? "bg-slate-900 text-white"
                    : isToday
                    ? "bg-amber-50 text-amber-700"
                    : isWeekend
                    ? "text-slate-300 hover:bg-slate-50"
                    : "text-slate-500 hover:bg-slate-50"
                }`}>
                <span className={`text-[7px] font-black uppercase leading-none ${isSelected ? "text-amber-400" : "text-slate-300"}`}>
                  {TXT.dayShort[dow].slice(0, 1)}
                </span>
                <span className={`text-[11px] font-black leading-tight ${isSelected ? "text-white" : ""}`}>{i + 1}</span>
                {hasAppts && (
                  <span className={`w-1 h-1 rounded-full mt-px ${isSelected ? "bg-amber-400" : "bg-amber-400"}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Service Filter Popup ──────────────────────────────────────────────────────
// Used in day view sidebar hamburger button — pops up a panel
function ServiceFilterPopup({
  rawServices,
  selectedServiciu,
  onSelectServiciu,
  onClose,
}: {
  rawServices: ServiceRow[];
  selectedServiciu: string;
  onSelectServiciu: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[600] flex" onClick={onClose}>
      <div className="absolute left-16 top-0 bottom-0 w-64 bg-white border-r-2 border-slate-200 shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-slate-900 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Filtru</p>
            <p className="text-sm font-black text-white uppercase italic">Servicii</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 bg-slate-700 rounded-xl flex items-center justify-center text-slate-300 hover:bg-red-500 hover:text-white transition-all font-black text-xs">✕</button>
        </div>

        {/* All services */}
        <button onClick={() => { onSelectServiciu(""); onClose(); }}
          className={`flex items-center gap-3 px-4 py-3 border-b border-slate-100 transition-all ${
            !selectedServiciu ? "bg-amber-500" : "hover:bg-slate-50"
          }`}>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
            !selectedServiciu ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
          }`}>✦</div>
          <div className="flex flex-col items-start">
            <span className={`text-[10px] font-black uppercase italic ${!selectedServiciu ? "text-white" : "text-slate-700"}`}>
              Toate Serviciile
            </span>
          </div>
        </button>

        {/* Service list */}
        <div className="flex-1 overflow-y-auto">
          {rawServices.map((s, i) => {
            const isSelected = selectedServiciu === s.id;
            const color = SPECIALIST_COLORS[i % SPECIALIST_COLORS.length];
            return (
              <button key={s.id}
                onClick={() => { onSelectServiciu(isSelected ? "" : s.id); onClose(); }}
                className={`w-full flex items-center gap-3 px-4 py-3 border-b border-slate-100 text-left transition-all ${
                  isSelected ? color.chip + " text-white" : "hover:bg-slate-50"
                }`}>
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isSelected ? "bg-white/50" : color.avatar}`} />
                <div className="flex flex-col items-start min-w-0">
                  <span className={`text-[11px] font-black uppercase italic truncate w-full ${
                    isSelected ? "text-white" : "text-slate-800"
                  }`}>{s.nume_serviciu}</span>
                  {s.duration > 0 && (
                    <span className={`text-[9px] font-bold ${isSelected ? "text-white/70" : "text-slate-400"}`}>
                      {s.duration} min · {s.price} RON
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Left Sidebar ──────────────────────────────────────────────────────────────
// FIX: Day view shows hours + hamburger for services; Week/Month shows NOTHING (minimal)
function LeftSidebar({
  viewMode,
  rawServices,
  selectedServiciu,
  onSelectServiciu,
  adminWorkingHours,
  selectedDate,
  onScrollToTime,
}: {
  viewMode: ViewMode;
  rawServices: ServiceRow[];
  selectedServiciu: string;
  onSelectServiciu: (id: string) => void;
  adminWorkingHours: WorkingHour[];
  selectedDate: Date;
  onScrollToTime?: (time: string) => void;
}) {
  const [showServicePanel, setShowServicePanel] = useState(false);
  const dayName = TXT.dayLong[selectedDate.getDay()];
  const daySchedule = adminWorkingHours.find(h => h.day === dayName);
  const schedStart = daySchedule?.start || "08:00";
  const schedEnd = daySchedule?.end || "20:00";

  const hourSlots = useMemo(() => {
    const slots: string[] = [];
    let cur = timeToMinutes(schedStart);
    const end = timeToMinutes(schedEnd);
    while (cur <= end) {
      if (cur % 60 === 0) slots.push(`${String(Math.floor(cur / 60)).padStart(2, "0")}:00`);
      cur += 60;
    }
    return slots;
  }, [schedStart, schedEnd]);

  if (viewMode !== "day") {
    // Week / Month: ultra-minimal sidebar — just a thin line separator
    return <div className="flex-shrink-0 w-3 bg-white border-r-2 border-slate-200" />;
  }

  return (
    <>
      {showServicePanel && (
        <ServiceFilterPopup
          rawServices={rawServices}
          selectedServiciu={selectedServiciu}
          onSelectServiciu={onSelectServiciu}
          onClose={() => setShowServicePanel(false)}
        />
      )}
      <div className="flex-shrink-0 w-16 bg-white border-r-2 border-slate-200 flex flex-col overflow-hidden">
        {/* Hamburger button for services */}
        <button
          onClick={() => setShowServicePanel(v => !v)}
          className={`h-10 border-b-2 border-slate-200 flex flex-col items-center justify-center gap-0.5 transition-all flex-shrink-0 ${
            selectedServiciu ? "bg-amber-500" : "bg-slate-50 hover:bg-slate-100"
          }`}
          title="Filtrează servicii">
          <div className={`flex flex-col gap-[3px] ${selectedServiciu ? "opacity-100" : ""}`}>
            <span className={`block w-4 h-0.5 rounded-full ${selectedServiciu ? "bg-white" : "bg-slate-400"}`} />
            <span className={`block w-3 h-0.5 rounded-full ${selectedServiciu ? "bg-white" : "bg-slate-400"}`} />
            <span className={`block w-4 h-0.5 rounded-full ${selectedServiciu ? "bg-white" : "bg-slate-400"}`} />
          </div>
          {selectedServiciu && (
            <span className="text-[6px] font-black text-white uppercase mt-0.5">Activ</span>
          )}
        </button>

        {/* Hour navigation */}
        <div className="flex-1 overflow-y-auto py-1">
          {hourSlots.map(slot => (
            <button key={slot}
              onClick={() => onScrollToTime?.(slot)}
              className="w-full flex items-center justify-center py-2 text-[10px] font-black text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all border-b border-slate-50 last:border-b-0">
              {slot}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Specialist Header Bar ─────────────────────────────────────────────────────
function SpecialistHeaderBar({
  staffColumns,
  selectedExpert,
  onSelectExpert,
}: {
  staffColumns: Array<{ id: string; name: string; appts: Programare[]; colorIdx: number }>;
  selectedExpert: string;
  onSelectExpert: (id: string) => void;
}) {
  return (
    <div className="flex flex-shrink-0 border-b-2 border-slate-200 bg-white z-10" style={{ minHeight: 64 }}>
      {/* "Toți" button */}
      <button
        onClick={() => onSelectExpert("")}
        className={`flex-shrink-0 flex flex-col items-center justify-center px-3 py-2 border-r-2 border-slate-200 transition-all min-w-[80px] ${!selectedExpert ? "bg-slate-900" : "hover:bg-slate-50"}`}>
        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black mb-1 ${!selectedExpert ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400"}`}>✦</span>
        <span className={`text-[9px] font-black uppercase italic ${!selectedExpert ? "text-white" : "text-slate-500"}`}>Toți</span>
        {!selectedExpert && (
          <span className="text-[7px] bg-amber-500 text-white px-1 py-px rounded-full font-black mt-0.5">
            {staffColumns.reduce((s, c) => s + c.appts.length, 0)}
          </span>
        )}
      </button>

      {/* Specialist columns */}
      <div className="flex flex-1 overflow-x-auto divide-x divide-slate-200">
        {staffColumns.map((col) => {
          const isSelected = selectedExpert === col.id;
          const color = SPECIALIST_COLORS[col.colorIdx];
          return (
            <button
              key={col.id}
              onClick={() => onSelectExpert(isSelected ? "" : col.id)}
              className={`flex-1 flex flex-col items-center justify-center px-4 py-2 last:border-r-0 transition-all min-w-[120px] ${
                isSelected ? "bg-slate-900" : "hover:brightness-95"
              }`}
              style={!isSelected ? { backgroundColor: color.col } : {}}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black text-white mb-1 ${isSelected ? "bg-amber-500" : color.avatar}`}>
                {col.name.slice(0, 1).toUpperCase()}
              </span>
              <span className={`text-[10px] font-black uppercase italic truncate max-w-full ${isSelected ? "text-white" : color.text}`}>
                {col.name}
              </span>
              {col.appts.length > 0 ? (
                <span className={`text-[7px] font-black px-1.5 py-px rounded-full mt-0.5 ${isSelected ? "bg-amber-500 text-white" : "bg-white/80 " + color.text}`}>
                  {col.appts.length} prog.
                </span>
              ) : (
                <span className={`text-[7px] font-black mt-0.5 ${isSelected ? "text-slate-400" : "text-slate-300"}`}>Liber</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day View ──────────────────────────────────────────────────────────────────
// FIX: Time labels shown ONCE in a dedicated fixed column (not per specialist column)
// FIX: Specialist column background extends the FULL height of the scroll container
const SLOT_H = 56;
const TIME_COL_W = 56; // px width of the time label column

function DayView({
  selectedDate, programari, rawStaff, rawServices, serviceById, onEdit,
  adminWorkingHours, selectedExpert, selectedServiciu, onSelectExpert, onSelectServiciu,
  bodyScrollRef,
}: {
  selectedDate: Date;
  programari: Programare[];
  rawStaff: StaffRow[];
  rawServices: ServiceRow[];
  serviceById: Record<string, ServiceRow>;
  onEdit: (p: Programare) => void;
  adminWorkingHours: WorkingHour[];
  selectedExpert: string;
  selectedServiciu: string;
  onSelectExpert: (id: string) => void;
  onSelectServiciu: (id: string) => void;
  bodyScrollRef: React.RefObject<HTMLDivElement>;
}) {
  const dateKey = formatDateKey(selectedDate);
  const dayName = TXT.dayLong[selectedDate.getDay()];
  const daySchedule = adminWorkingHours.find(h => h.day === dayName);
  const isClosed = daySchedule?.closed;

  const timeSlots = useMemo(() => {
    const start = daySchedule?.start || "08:00";
    const end = daySchedule?.end || "20:00";
    const slots: string[] = [];
    let cur = timeToMinutes(start);
    const endMin = timeToMinutes(end);
    while (cur <= endMin) {
      slots.push(`${String(Math.floor(cur / 60)).padStart(2, "0")}:${String(cur % 60).padStart(2, "0")}`);
      cur += 30;
    }
    return slots;
  }, [daySchedule]);

  const schedStart = timeToMinutes(daySchedule?.start || "08:00");
  const dateAppts = programari.filter(p => p.data === dateKey);
  const totalHeight = timeSlots.length * SLOT_H;

  const allStaffColumns = useMemo(() => {
    if (rawStaff.length === 0) {
      return [{ id: "general", name: "Programări", services: [] as string[], appts: dateAppts, colorIdx: 0 }];
    }
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

  if (isClosed) {
    return (
      <div className="flex flex-col h-full">
        <SpecialistHeaderBar staffColumns={allStaffColumns} selectedExpert={selectedExpert} onSelectExpert={onSelectExpert} />
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="text-5xl mb-3 opacity-10">🚫</div>
            <p className="font-black uppercase italic text-slate-300 text-sm">Zi Închisă</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Specialist header */}
      <SpecialistHeaderBar
        staffColumns={allStaffColumns}
        selectedExpert={selectedExpert}
        onSelectExpert={onSelectExpert}
      />

      {/* Column headers row (time col + specialist name repetition for alignment) */}
      <div className="flex flex-shrink-0 border-b border-slate-200 bg-white" style={{ minHeight: 0 }}>
        {/* Time column header */}
        <div className="flex-shrink-0 border-r-2 border-slate-200 bg-slate-50 flex items-center justify-center"
          style={{ width: TIME_COL_W }}>
          <span className="text-[8px] font-black text-slate-300 uppercase italic tracking-widest">Oră</span>
        </div>
        {/* Specialist column subheaders */}
        <div className="flex flex-1 divide-x divide-slate-200 overflow-x-auto">
          {visibleColumns.map(col => {
            const color = SPECIALIST_COLORS[col.colorIdx];
            return (
              <div key={col.id}
                className="flex-1 flex items-center justify-center py-1.5"
                style={{ minWidth: 160, backgroundColor: color.col, borderBottom: `2px solid ${color.colBorder}` }}>
                <span className={`text-[9px] font-black uppercase italic ${color.text}`}>{col.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable time grid */}
      <div ref={bodyScrollRef} className="flex flex-1 overflow-auto" id="day-body-scroll">
        {/* Fixed time labels column */}
        <div className="flex-shrink-0 border-r-2 border-slate-200 bg-white relative"
          style={{ width: TIME_COL_W, minHeight: totalHeight }}>
          {timeSlots.map((slot, i) => {
            const isHour = slot.endsWith(":00");
            return (
              <div key={slot}
                className={`absolute left-0 right-0 flex items-start justify-end pr-2 ${
                  isHour ? "border-t border-slate-300" : "border-t border-slate-100"
                }`}
                style={{ top: i * SLOT_H, height: SLOT_H }}>
                {isHour && (
                  <span className="text-[10px] font-black text-slate-500 mt-1">{slot}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Specialist columns — background extends full height */}
        <div className="flex flex-1 divide-x divide-slate-200 overflow-x-auto">
          {visibleColumns.map((col) => {
            const color = SPECIALIST_COLORS[col.colorIdx];
            return (
              <div key={col.id}
                className="flex-1 relative"
                style={{ minWidth: 160, minHeight: totalHeight, backgroundColor: color.col }}>
                {/* Grid lines */}
                {timeSlots.map((slot, i) => (
                  <div key={slot}
                    className={`absolute left-0 right-0 ${
                      slot.endsWith(":00")
                        ? "border-t border-slate-300"
                        : "border-t border-slate-200"
                    }`}
                    style={{ top: i * SLOT_H, height: SLOT_H }}
                  />
                ))}

                {/* Vertical column separator (right border stripe using the color) */}
                <div className="absolute top-0 right-0 bottom-0 w-px"
                  style={{ backgroundColor: color.colBorder, opacity: 0.5 }} />

                {/* Appointments */}
                {col.appts.sort((a, b) => a.ora.localeCompare(b.ora)).map(p => {
                  const svc = serviceById[p.serviciuId || ""];
                  const endTime = svc?.duration ? addMinutesToTime(p.ora, svc.duration) : null;
                  const startMin = timeToMinutes(p.ora);
                  const topPx = ((startMin - schedStart) / 30) * SLOT_H;
                  const durMin = svc?.duration || 30;
                  const heightPx = Math.max((durMin / 30) * SLOT_H - 4, 32);
                  return (
                    <button key={p.id} onClick={() => onEdit(p)}
                      style={{ top: topPx + 2, height: heightPx, left: 6, right: 6 }}
                      className={`absolute ${color.bg} ${color.border} rounded-lg px-2 py-1 text-left border-2 hover:brightness-95 hover:shadow-md transition-all z-10 overflow-hidden shadow-sm`}>
                      <p className={`text-[9px] font-black uppercase italic leading-tight ${color.text}`}>
                        {p.ora}{endTime ? ` → ${endTime}` : ""}
                      </p>
                      <p className={`text-[10px] font-black truncate leading-tight ${color.text}`}>{p.nume}</p>
                      {svc && heightPx > 48 && (
                        <p className={`text-[8px] font-bold truncate opacity-70 ${color.text}`}>{svc.nume_serviciu}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {visibleColumns.length === 0 && (
            <div className="flex-1 flex items-center justify-center py-20">
              <p className="text-[11px] font-black text-slate-300 uppercase italic">Niciun rezultat</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Week View ─────────────────────────────────────────────────────────────────
// FIX: Full-height colored backgrounds per specialist row
// FIX: Grid lines span all the way across properly
function WeekView({
  selectedDate, programari, rawStaff, rawServices, serviceById, onEdit,
  selectedExpert, selectedServiciu, onSelectExpert, onSelectServiciu,
  programariByDate,
}: {
  selectedDate: Date;
  programari: Programare[];
  rawStaff: StaffRow[];
  rawServices: ServiceRow[];
  serviceById: Record<string, ServiceRow>;
  onEdit: (p: Programare) => void;
  selectedExpert: string;
  selectedServiciu: string;
  onSelectExpert: (id: string) => void;
  onSelectServiciu: (id: string) => void;
  programariByDate: Record<string, Programare[]>;
}) {
  const today = useMemo(() => new Date(), []);
  const weekDays = useMemo(() => {
    const start = getWeekStart(selectedDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const allStaffColumns = useMemo(() => {
    if (rawStaff.length === 0) {
      return [{ id: "general", name: "Programări", services: [] as string[], appts: programari, colorIdx: 0 }];
    }
    return rawStaff.map((staff, i) => ({
      id: staff.id, name: staff.name, services: staff.services,
      appts: programari.filter(p => p.expertId === staff.id),
      colorIdx: i % SPECIALIST_COLORS.length,
    }));
  }, [rawStaff, programari]);

  const visibleStaff = useMemo(() =>
    selectedExpert ? allStaffColumns.filter(c => c.id === selectedExpert) : allStaffColumns,
    [allStaffColumns, selectedExpert]
  );

  const SPECIALIST_COL_W = 72; // px for specialist label column

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SpecialistHeaderBar
        staffColumns={allStaffColumns}
        selectedExpert={selectedExpert}
        onSelectExpert={onSelectExpert}
      />

      <div className="flex-1 overflow-auto">
        {/* Sticky header: specialist label col + 7 day cols */}
        <div className="sticky top-0 z-10 bg-white border-b-2 border-slate-200 flex"
          style={{ minWidth: visibleStaff.length * SPECIALIST_COL_W + 7 * 140 }}>
          <div className="flex-shrink-0 bg-slate-50 border-r-2 border-slate-200 flex items-center justify-center"
            style={{ width: SPECIALIST_COL_W }}>
            <span className="text-[7px] font-black text-slate-300 uppercase italic">Spec</span>
          </div>
          {weekDays.map((day, i) => {
            const isToday = sameDay(day, today);
            return (
              <div key={i}
                className={`flex-1 border-r border-slate-200 last:border-r-0 py-2 text-center ${isToday ? "bg-amber-50" : "bg-white"}`}
                style={{ minWidth: 140 }}>
                <p className={`text-[9px] font-black uppercase italic ${isToday ? "text-amber-500" : "text-slate-400"}`}>
                  {TXT.dayShort[i]}
                </p>
                <p className={`text-lg font-black italic leading-none ${isToday ? "text-amber-600" : "text-slate-800"}`}>
                  {day.getDate()}
                </p>
                <p className={`text-[8px] font-bold ${isToday ? "text-amber-400" : "text-slate-300"}`}>
                  {TXT.months[day.getMonth()]}
                </p>
              </div>
            );
          })}
        </div>

        {/* Specialist rows */}
        <div style={{ minWidth: visibleStaff.length * SPECIALIST_COL_W + 7 * 140 }}>
          {visibleStaff.map((staff, sIdx) => {
            const color = SPECIALIST_COLORS[staff.colorIdx];
            const isLast = sIdx === visibleStaff.length - 1;
            return (
              <div key={staff.id} className={`flex ${!isLast ? "border-b-2 border-slate-200" : ""}`}>
                {/* Specialist label — full height color bg */}
                <div className="flex-shrink-0 border-r-2 border-slate-200 flex flex-col items-center justify-start pt-3 gap-2"
                  style={{ width: SPECIALIST_COL_W, backgroundColor: color.col, borderRightColor: color.colBorder }}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-[11px] font-black shadow-sm ${color.avatar}`}>
                    {staff.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span className={`text-[8px] font-black uppercase italic text-center leading-tight px-1 ${color.text}`}
                    style={{ writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)", maxHeight: 100 }}>
                    {staff.name}
                  </span>
                </div>

                {/* Day cells */}
                {weekDays.map((day, di) => {
                  const key = formatDateKey(day);
                  const dayAppts = programariByDate[key] || [];
                  const staffAppts = rawStaff.length === 0
                    ? dayAppts
                    : dayAppts.filter(p => p.expertId === staff.id);
                  const filtered = selectedServiciu ? staffAppts.filter(p => p.serviciuId === selectedServiciu) : staffAppts;
                  const isToday = sameDay(day, today);
                  const isLastDay = di === 6;
                  return (
                    <div key={di}
                      className={`flex-1 p-2 min-h-[100px] ${!isLastDay ? "border-r border-slate-200" : ""}`}
                      style={{
                        minWidth: 140,
                        // Today column gets amber tint, others get specialist color
                        backgroundColor: isToday ? "rgba(251,191,36,0.08)" : color.col,
                        borderRightColor: isToday ? "#fde68a" : "#e2e8f0",
                      }}>
                      <div className="space-y-1.5">
                        {filtered.sort((a, b) => a.ora.localeCompare(b.ora)).map(p => {
                          const svc = serviceById[p.serviciuId || ""];
                          const endTime = svc?.duration ? addMinutesToTime(p.ora, svc.duration) : null;
                          return (
                            <button key={p.id} onClick={() => onEdit(p)}
                              className={`w-full text-left px-2 py-2 rounded-lg border-2 ${color.bg} ${color.border} hover:brightness-95 hover:shadow-sm transition-all`}>
                              <p className={`text-[8px] font-black italic leading-none ${color.text} opacity-70`}>
                                {p.ora}{endTime ? ` → ${endTime}` : ""}
                              </p>
                              <p className={`text-[10px] font-black uppercase italic truncate leading-tight ${color.text}`}>{p.nume}</p>
                              {svc && (
                                <p className={`text-[8px] truncate opacity-60 ${color.text}`}>{svc.nume_serviciu}</p>
                              )}
                            </button>
                          );
                        })}
                        {filtered.length === 0 && (
                          <div className="h-8 flex items-center justify-center">
                            <span className={`text-[8px] font-black opacity-20 uppercase italic ${color.text}`}>—</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Month View ────────────────────────────────────────────────────────────────
function MonthView({
  selectedDate, programariByDate, rawStaff, serviceById, onEdit, onDayClick,
  selectedExpert, selectedServiciu, onSelectExpert, programari,
}: {
  selectedDate: Date;
  programariByDate: Record<string, Programare[]>;
  rawStaff: StaffRow[];
  serviceById: Record<string, ServiceRow>;
  onEdit: (p: Programare) => void;
  onDayClick: (d: Date) => void;
  selectedExpert: string;
  selectedServiciu: string;
  onSelectExpert: (id: string) => void;
  programari: Programare[];
}) {
  const today = useMemo(() => new Date(), []);

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
      <SpecialistHeaderBar
        staffColumns={allStaffColumns}
        selectedExpert={selectedExpert}
        onSelectExpert={onSelectExpert}
      />

      <div className="flex-1 overflow-auto">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b-2 border-slate-200 bg-white sticky top-0 z-10">
          {TXT.dayShort.map((d, i) => (
            <div key={d}
              className={`text-center font-black text-[10px] py-3 uppercase italic tracking-widest border-r last:border-r-0 border-slate-200 ${
                i >= 5 ? "text-slate-300" : "text-slate-500"
              }`}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
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

            return (
              <div key={idx}
                onClick={() => onDayClick(day)}
                className={`min-h-[120px] p-2 flex flex-col cursor-pointer transition-colors border-b border-r border-slate-200 ${
                  !isCurrentMonth
                    ? "bg-slate-50/60 opacity-30"
                    : isWeekend
                    ? "bg-slate-50/50 hover:bg-slate-100/50"
                    : "bg-white hover:bg-slate-50/80"
                }`}>
                {/* Day number */}
                <span className={`text-[11px] font-black mb-2 w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0 ${
                  isToday
                    ? "bg-amber-500 text-white shadow-md shadow-amber-200"
                    : isWeekend && isCurrentMonth
                    ? "text-slate-300"
                    : "text-slate-500"
                }`}>
                  {day.getDate()}
                </span>
                {/* Appointments */}
                <div className="space-y-1 flex-1 overflow-hidden">
                  {list.slice(0, 4).map(p => {
                    const colorIdx = staffColorMap[p.expertId || ""] ?? 0;
                    const color = SPECIALIST_COLORS[colorIdx];
                    return (
                      <button key={p.id}
                        onClick={e => { e.stopPropagation(); onEdit(p); }}
                        className={`w-full text-left px-2 py-1 rounded-lg border ${color.bg} ${color.border} hover:brightness-95 transition-all flex items-center gap-1.5`}>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color.avatar}`} />
                        <span className={`text-[8px] font-black italic flex-shrink-0 opacity-60 ${color.text}`}>{p.ora}</span>
                        <span className={`text-[9px] font-black uppercase italic truncate ${color.text}`}>{p.nume}</span>
                      </button>
                    );
                  })}
                  {list.length > 4 && (
                    <p className="text-[8px] font-black text-amber-600 italic pl-1">+{list.length - 4} mai multe</p>
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

// ─── Main Calendar Content ─────────────────────────────────────────────────────
function CalendarContent() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const modalRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const qClient = useQueryClient();

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExpert, setSelectedExpert] = useState("");
  const [selectedServiciu, setSelectedServiciu] = useState("");
  const [editForm, setEditForm] = useState<Programare | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => { const { data: { session } } = await supabase.auth.getSession(); return session; },
    staleTime: Infinity,
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
      end:   new Date(year, month + 3, 0).toISOString().split("T")[0],
    };
  }, [selectedDate.getFullYear(), selectedDate.getMonth()]);

  const { data: programari = [], isLoading, refetch: refetchAppts } = useQuery<Programare[]>({
    queryKey: ["appointments", userId, dateRange.start, dateRange.end], enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments")
        .select("id, title, prenume, nume, email, date, time, details, phone, poza, file_url, documente, angajat_id, serviciu_id, duration")
        .eq("user_id", userId!).gte("date", dateRange.start).lte("date", dateRange.end)
        .order("date", { ascending: true });
      if (error) return [];
      return (data ?? []).map(mapRow);
    },
  });

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node) && !showEditDatePicker && !showEditTimePicker) {
        handleCloseModal();
      }
    }
    if (editForm) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editForm, showEditDatePicker, showEditTimePicker]);

  const handleOpenEdit = useCallback((p: Programare) => {
    setEditForm({ ...p });
    setShowEditDatePicker(false);
    setShowEditTimePicker(false);
  }, []);

  const handleCloseModal = useCallback(() => {
    setEditForm(null);
    setShowEditDatePicker(false);
    setShowEditTimePicker(false);
  }, []);

  const handleUpdate = async () => {
    if (!editForm) return;
    const service = rawServices.find(s => s.id === editForm.serviciuId);
    const duration = service?.duration || editForm.duration || 0;
    const { error } = await supabase.from("appointments").update({
      title: editForm.nume, prenume: editForm.nume, nume: editForm.nume,
      email: editForm.email || null, date: editForm.data, time: editForm.ora,
      duration, phone: editForm.telefon || null, details: editForm.motiv || null,
      angajat_id: editForm.expertId || null, serviciu_id: editForm.serviciuId || null,
    }).eq("id", editForm.id);
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

  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 250);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const filteredProgramari = useMemo(() =>
    programari.filter(p => {
      const matchSearch = !debouncedSearch || p.nume.toLowerCase().includes(debouncedSearch.toLowerCase()) || p.telefon?.includes(debouncedSearch);
      return matchSearch;
    }).sort((a, b) => a.ora.localeCompare(b.ora)),
    [programari, debouncedSearch]
  );

  const programariByDate = useMemo(() => {
    const map: Record<string, Programare[]> = {};
    filteredProgramari.forEach(p => {
      if (!p.data) return;
      if (!map[p.data]) map[p.data] = [];
      map[p.data].push(p);
    });
    return map;
  }, [filteredProgramari]);

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

  const handleScrollToTime = useCallback((time: string) => {
    if (!bodyScrollRef.current) return;
    const timeMin = timeToMinutes(time);
    const startMin = timeToMinutes("08:00");
    const slotIdx = Math.round((timeMin - startMin) / 30);
    bodyScrollRef.current.scrollTop = slotIdx * SLOT_H;
  }, []);

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
    return programari.filter(p => p.data === editForm.data && String(p.id) !== String(editForm.id))
      .map(p => ({ time: p.ora, duration: p.duration || 30 }));
  }, [programari, editForm?.data, editForm?.id]);

  const editServiceDuration = useMemo(() => {
    if (!editForm?.serviciuId) return 0;
    return rawServices.find(s => s.id === editForm.serviciuId)?.duration || 0;
  }, [editForm?.serviciuId, rawServices]);

  if (!userId && !isDemo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black italic text-slate-300 uppercase text-sm">
        Autentificare necesară...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">

      {/* ─── Edit Modal ───────────────────────────────────────────────────────── */}
      {editForm && (
        <>
          {showEditDatePicker && (
            <div className="fixed inset-0 z-[900] bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowEditDatePicker(false)}>
              <div onClick={e => e.stopPropagation()}>
                <ChronosDatePicker value={editForm.data} onChange={val => { setEditForm(prev => prev ? { ...prev, data: val, ora: "" } : null); setShowEditDatePicker(false); }}
                  minDate={today} onClose={() => setShowEditDatePicker(false)} workingHours={adminWorkingHours} manualBlocks={adminManualBlocks} />
              </div>
            </div>
          )}
          {showEditTimePicker && (
            <div className="fixed inset-0 z-[900] bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowEditTimePicker(false)}>
              <div onClick={e => e.stopPropagation()}>
                <ChronosTimePicker value={editForm.ora || "09:00"} onChange={val => { setEditForm(prev => prev ? { ...prev, ora: val } : null); setShowEditTimePicker(false); }}
                  onClose={() => setShowEditTimePicker(false)} workingHours={adminWorkingHours} existingAppointments={editExistingAppointments}
                  selectedDate={editForm.data} serviceDuration={editServiceDuration} manualBlocks={adminManualBlocks} />
              </div>
            </div>
          )}
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[500] flex items-center justify-center p-4" onClick={handleCloseModal}>
            <div ref={modalRef} onClick={e => e.stopPropagation()}
              className="bg-white w-full max-w-xl rounded-[40px] overflow-hidden shadow-2xl border border-slate-100 relative">
              <button onClick={handleCloseModal}
                className="absolute top-6 right-6 w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 hover:bg-red-500 hover:text-white transition-all z-30">✕</button>
              <div className="h-36 bg-slate-900 flex items-end p-8">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-[24px] bg-white p-1 shadow-xl rotate-2">
                    <div className="w-full h-full rounded-[18px] bg-slate-100 overflow-hidden flex items-center justify-center text-2xl">
                      {editForm.poza ? <img src={editForm.poza} className="w-full h-full object-cover" alt="" /> : "👤"}
                    </div>
                  </div>
                  <div>
                    <p className="text-amber-500 font-black text-[9px] uppercase italic tracking-[0.3em] mb-1">Detalii Programare</p>
                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">{editForm.nume}</h2>
                  </div>
                </div>
              </div>
              <div className="p-8 space-y-5 max-h-[65vh] overflow-y-auto">
                <div className="bg-slate-50 p-5 rounded-[28px] border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase italic mb-1">Nume Complet</p>
                  <input className="w-full bg-transparent text-lg font-black uppercase italic text-slate-900 outline-none"
                    value={editForm.nume} onChange={e => setEditForm(prev => prev ? { ...prev, nume: e.target.value } : null)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { setShowEditDatePicker(true); setShowEditTimePicker(false); }}
                    className="h-[68px] bg-slate-900 text-white rounded-[22px] font-black uppercase italic hover:text-amber-500 transition-all flex flex-col items-center justify-center gap-1">
                    <span className="text-[8px] text-slate-400">Data</span>
                    <span className="text-xs">📅 {editForm.data}</span>
                  </button>
                  <button onClick={() => { setShowEditTimePicker(true); setShowEditDatePicker(false); }}
                    className="h-[68px] bg-slate-900 text-white rounded-[22px] font-black uppercase italic hover:text-amber-500 transition-all flex flex-col items-center justify-center gap-1">
                    <span className="text-[8px] text-slate-400">Ora</span>
                    <span className="text-xs">🕐 {editForm.ora || "Alege..."}</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-4 rounded-[22px] border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Telefon</p>
                    <input className="w-full bg-transparent font-black text-sm text-slate-800 outline-none italic"
                      value={editForm.telefon || ""} onChange={e => setEditForm(prev => prev ? { ...prev, telefon: e.target.value } : null)} />
                  </div>
                  <div className="bg-slate-50 p-4 rounded-[22px] border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Email</p>
                    <input className="w-full bg-transparent font-black text-sm text-slate-800 outline-none italic"
                      value={editForm.email || ""} onChange={e => setEditForm(prev => prev ? { ...prev, email: e.target.value } : null)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900 p-4 rounded-[22px]">
                    <p className="text-[8px] font-black text-amber-500 uppercase italic mb-1">Specialist</p>
                    <select className="w-full bg-transparent font-black text-xs text-white outline-none cursor-pointer uppercase italic"
                      value={editForm.expertId || ""} onChange={e => setEditForm(prev => prev ? { ...prev, expertId: e.target.value } : null)}>
                      <option value="" className="bg-slate-900">Alege...</option>
                      {angajatiFiltratiInModal.map(a => <option key={a.id} value={a.id} className="bg-slate-900">{a.name}</option>)}
                    </select>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-[22px]">
                    <p className="text-[8px] font-black text-amber-500 uppercase italic mb-1">Serviciu</p>
                    <select className="w-full bg-transparent font-black text-xs text-white outline-none cursor-pointer uppercase italic"
                      value={editForm.serviciuId || ""} onChange={e => setEditForm(prev => prev ? { ...prev, serviciuId: e.target.value } : null)}>
                      <option value="" className="bg-slate-900">Alege...</option>
                      {serviciiFiltrateInModal.map(s => <option key={s.id} value={s.id} className="bg-slate-900">{s.nume_serviciu}</option>)}
                    </select>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-[22px] border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Notițe</p>
                  <textarea className="w-full bg-transparent text-xs font-bold italic text-slate-700 outline-none resize-none" rows={2}
                    value={editForm.motiv || ""} onChange={e => setEditForm(prev => prev ? { ...prev, motiv: e.target.value } : null)} />
                </div>
                <div className={`border p-5 rounded-[22px] space-y-3 ${hasWhatsAppAccess ? "bg-green-50 border-green-100" : "bg-slate-50 border-slate-100 opacity-60"}`}>
                  <p className={`text-[9px] font-black uppercase italic ${hasWhatsAppAccess ? "text-green-700" : "text-slate-400"}`}>💬 Mesaj WhatsApp</p>
                  <textarea className={`w-full rounded-xl p-3 text-[11px] font-bold outline-none italic border resize-none ${hasWhatsAppAccess ? "bg-white/50 border-green-200 text-slate-700" : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"}`}
                    rows={2} value={hasWhatsAppAccess ? customMessage : "Disponibil în planul ELITE sau TEAM..."}
                    onChange={e => { if (hasWhatsAppAccess) setCustomMessage(e.target.value); }} readOnly={!hasWhatsAppAccess} />
                  {hasWhatsAppAccess ? (
                    <button onClick={() => { const c = editForm.telefon?.replace(/\D/g, ""); window.open(`https://wa.me/${c?.startsWith("0") ? "4" + c : c}?text=${encodeURIComponent(customMessage)}`, "_blank"); }}
                      className="w-full py-3 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase italic hover:bg-green-700 transition-all">
                      Trimite pe WhatsApp
                    </button>
                  ) : (
                    <div className="w-full py-3 bg-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase italic text-center cursor-not-allowed">
                      🔒 Necesită Plan ELITE sau TEAM
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
                  <div className="flex gap-3">
                    <button onClick={handleCloseModal} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-[20px] font-black uppercase text-[10px] italic hover:bg-slate-200 transition-all">Anulează</button>
                    <button onClick={handleUpdate} className="flex-[2] py-4 bg-slate-900 text-white rounded-[20px] font-black uppercase text-[10px] italic hover:bg-amber-600 transition-all">Salvează</button>
                  </div>
                  <button onClick={handleDelete} className="w-full py-4 text-red-400 font-black uppercase text-[9px] italic hover:bg-red-50 rounded-[20px] transition-all">
                    Șterge Definitiv 🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── TOP HEADER ───────────────────────────────────────────────────────── */}
      <div className="bg-white border-b-2 border-slate-200 px-4 py-3 flex items-center gap-4 flex-shrink-0 shadow-sm">
        <Link href="/programari"
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-all group">
          <div className="w-9 h-9 bg-slate-100 group-hover:bg-slate-900 rounded-xl flex items-center justify-center transition-all">
            <span className="text-slate-500 group-hover:text-white text-sm">←</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center">
            <span className="text-amber-500 font-black text-sm italic">C</span>
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tighter uppercase italic leading-none">
              Calendar <span className="text-amber-600">Chronos</span>
            </h1>
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
              {isLoading ? "Se sincronizează..." : "Sincronizat în timp real"}
            </p>
          </div>
        </div>

        <div className="flex-1 max-w-xs relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs">🔍</span>
          <input type="text" placeholder="Caută client..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-8 pr-3 text-xs font-bold text-slate-700 outline-none focus:border-amber-400 transition-all" />
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 ml-auto">
          {(["day", "week", "month"] as ViewMode[]).map(opt => (
            <button key={opt} onClick={() => setViewMode(opt)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase italic transition-all ${viewMode === opt ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-700"}`}>
              {opt === "day" ? "Zi" : opt === "week" ? "Săpt" : "Lună"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => nav(-1)} className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl transition-all font-black text-slate-500">◀</button>
          <button onClick={() => setSelectedDate(new Date())} className="px-3 py-2 text-[10px] font-black uppercase italic text-slate-500 hover:text-amber-600 transition-colors">Azi</button>
          <button onClick={() => nav(1)} className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl transition-all font-black text-slate-500">▶</button>
        </div>

        {userSubscription && (
          <span className="text-[8px] bg-slate-100 text-slate-400 px-2 py-1 rounded-lg font-black uppercase">{userSubscription.plan}</span>
        )}
      </div>

      {/* ─── TIMELINE NAVIGATOR ───────────────────────────────────────────────── */}
      <TimelineNavigator
        selectedDate={selectedDate}
        onSelectDate={d => { setSelectedDate(d); if (viewMode !== "day") setViewMode("day"); }}
        programariByDate={programariByDate}
      />

      {/* ─── BODY: LEFT SIDEBAR + CALENDAR ───────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          viewMode={viewMode}
          rawServices={rawServices}
          selectedServiciu={selectedServiciu}
          onSelectServiciu={setSelectedServiciu}
          adminWorkingHours={adminWorkingHours}
          selectedDate={selectedDate}
          onScrollToTime={handleScrollToTime}
        />

        {/* Calendar area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {isLoading && (
            <div className="w-full h-0.5 bg-amber-100 overflow-hidden flex-shrink-0">
              <div className="h-full w-1/3 bg-amber-500 animate-pulse" />
            </div>
          )}

          {viewMode === "day" && (
            <div className="flex-1 overflow-hidden">
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
                onSelectExpert={setSelectedExpert}
                onSelectServiciu={setSelectedServiciu}
                bodyScrollRef={bodyScrollRef}
              />
            </div>
          )}

          {viewMode === "week" && (
            <div className="flex-1 overflow-hidden">
              <WeekView
                selectedDate={selectedDate}
                programari={filteredProgramari}
                rawStaff={rawStaff}
                rawServices={rawServices}
                serviceById={serviceById}
                onEdit={handleOpenEdit}
                selectedExpert={selectedExpert}
                selectedServiciu={selectedServiciu}
                onSelectExpert={setSelectedExpert}
                onSelectServiciu={setSelectedServiciu}
                programariByDate={programariByDate}
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
                onSelectExpert={setSelectedExpert}
                programari={filteredProgramari}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center font-black italic text-slate-300 animate-pulse uppercase text-sm">
          Se încarcă Chronos...
        </div>
      }>
        <CalendarContent />
      </Suspense>
    </QueryClientProvider>
  );
}