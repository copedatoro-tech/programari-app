"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
// ─── TYPES ──────────────────────────────────────────────────────────────────────
export interface WorkingHourEntry {
  day: string;
  start: string;
  end: string;
  closed: boolean;
}
export interface ExistingAppointment {
  time: string;
  duration: number;
}
// ⚠️ FIX (nu tradus): zilele stocate în baza de date (working_hours.day) sunt salvate
// întotdeauna în română, indiferent de limba interfeței. Acest array e folosit DOAR
// pentru a verifica programul din baza de date, deci trebuie să rămână fix.
const DAY_NAMES_LONG = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];
// ─── HELPERS ─────────────────────────────────────────────────────────────────────
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function timeToMinutes(t: string): number {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function isInsideManualBlockInterval(time: string, manualBlocksForDay: string[]): boolean {
  const slotMinutes = timeToMinutes(time);
  return manualBlocksForDay.some((blockedTime) => {
    const blockStart = timeToMinutes(blockedTime);
    return slotMinutes >= blockStart && slotMinutes < blockStart + 15;
  });
}
function formatKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function getDayNameFromDateString(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, mo - 1, d);
  return DAY_NAMES_LONG[dateObj.getDay()];
}
// ─── SLOT STATUS ─────────────────────────────────────────────────────────────────
type SlotStatus = "available" | "blocked" | "outside" | "overlap" | "manual_block" | "past";
function getSlotStatus(
  time: string,
  intervals: { start: string; end: string }[],
  existingAppointments: ExistingAppointment[],
  serviceDuration: number,
  manualBlocksForDay: string[],
  isToday: boolean
): SlotStatus {
  const slotMinutes = timeToMinutes(time);
  if (isToday) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    if (slotMinutes < currentMinutes) return "past";
  }
  const serviceLen = serviceDuration > 0 ? serviceDuration : 15;
  // ✅ Poate fi mai multe intervale în aceeași zi (ex: 08-09, 14-15) — slotul e valid
  // dacă încape complet într-UNUL dintre ele, nu neapărat în primul găsit
  let withinAnyRange = false;
  let fitsInAnyInterval = false;
  for (const iv of intervals) {
    const s = timeToMinutes(iv.start), e = timeToMinutes(iv.end);
    if (slotMinutes >= s && slotMinutes < e) {
      withinAnyRange = true;
      if (slotMinutes + serviceLen <= e) { fitsInAnyInterval = true; break; }
    }
  }
  if (!withinAnyRange) return "outside";
  if (!fitsInAnyInterval) return "overlap";
  if (isInsideManualBlockInterval(time, manualBlocksForDay)) return "manual_block";
  const newStart = slotMinutes;
  const newEnd = slotMinutes + serviceLen;
  for (const appt of existingAppointments) {
    if (!appt.time) continue;
    const apptStart = timeToMinutes(appt.time);
    const apptEnd = apptStart + (appt.duration > 0 ? appt.duration : 15);
    if (newStart < apptEnd && newEnd > apptStart) return "blocked";
  }
  return "available";
}
// ─── CHRONOS TIME PICKER ─────────────────────────────────────────────────────────
export function ChronosTimePicker({
  value,
  onChange,
  onClose,
  workingHours = [],
  existingAppointments = [],
  selectedDate,
  serviceDuration = 0,
  manualBlocks = {},
  allowOverride = false,
}: {
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
  workingHours?: WorkingHourEntry[];
  existingAppointments?: ExistingAppointment[];
  selectedDate?: string;
  serviceDuration?: number;
  manualBlocks?: Record<string, string[]>;
  allowOverride?: boolean;
}) {
  const t = useTranslations("chronosPickers");
  const localeCode = t("localeCode");
  const containerRef = useRef<HTMLDivElement>(null);
  const todayStr = formatKey(new Date());
  const isToday = selectedDate === todayStr;
  const manualBlocksForDay: string[] = useMemo(() =>
    selectedDate ? (manualBlocks[selectedDate] || []) : [],
  [selectedDate, manualBlocks]);
  const dayIntervals = useMemo(() => {
    if (!selectedDate) return [];
    // ✅ Fără niciun program configurat = deschis non-stop (regula stabilită) —
    // simulăm un interval "toată ziua", ca să nu fie interpretat greșit ca "zero ore libere"
    if (workingHours.length === 0) return [{ start: "00:00", end: "23:59" }];
    const dayName = getDayNameFromDateString(selectedDate);
    return workingHours
      .filter((h) => h.day === dayName && !h.closed)
      .map((h) => ({ start: h.start, end: h.end }));
  }, [selectedDate, workingHours]);
  // O zi e închisă dacă nu are niciun interval deschis (fie explicit "closed", fie fără nicio intrare)
  const isClosed = dayIntervals.length === 0 && workingHours.length > 0;
  const workingStart = dayIntervals[0]?.start || "00:00";
  const workingEnd = dayIntervals[dayIntervals.length - 1]?.end || "23:59";
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")), []);
  const allHours = useMemo(() => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")), []);
  const checkStatus = useCallback(
    (h: string, m: string): SlotStatus => {
      if (isClosed) return "outside";
      return getSlotStatus(
        `${h}:${m}`,
        dayIntervals,
        existingAppointments,
        serviceDuration,
        manualBlocksForDay,
        isToday
      );
    },
    [isClosed, dayIntervals, existingAppointments, serviceDuration, manualBlocksForDay, isToday]
  );
  const hoursToShow = useMemo(() => {
    if (isClosed) return [];
    const startH = parseInt(workingStart.split(":")[0]);
    const endH = parseInt(workingEnd.split(":")[0]);
    return allHours.filter(h => {
      const hourNum = parseInt(h);
      return hourNum >= startH && hourNum <= endH;
    });
  }, [allHours, isClosed, workingStart, workingEnd]);
  const [selHour, setSelHour] = useState("09");
  const [selMinute, setSelMinute] = useState("00");
  useEffect(() => {
    if (value && value.includes(":")) {
      const [h, m] = value.split(":");
      setSelHour(h);
      setSelMinute(m);
    } else if (!isClosed && hoursToShow.length > 0) {
      for (const h of hoursToShow) {
        for (const m of minutes) {
          if (checkStatus(h, m) === "available") {
            setSelHour(h);
            setSelMinute(m);
            return;
          }
        }
      }
    }
  }, [selectedDate, isClosed, checkStatus, hoursToShow, minutes, value]);
  const hourHasAvailable = useCallback(
    (h: string) => minutes.some((m) => allowOverride ? checkStatus(h, m) !== "past" : checkStatus(h, m) === "available"),
    [checkStatus, minutes]
  );
  const handleSelectMinute = (m: string) => {
    if (allowOverride ? checkStatus(selHour, m) === "past" : checkStatus(selHour, m) !== "available") return;
    setSelMinute(m);
    onChange(`${selHour}:${m}`);
    onClose();
  };
  useEffect(() => {
    function clickOut(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, [onClose]);
  const statusColors: Record<SlotStatus, string> = {
    available: "bg-amber-500 text-black border-amber-600 hover:bg-slate-900 hover:text-amber-500 cursor-pointer",
    blocked: "bg-red-50 text-red-300 border-red-100 cursor-not-allowed line-through",
    outside: "bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed",
    past: "bg-slate-100 text-slate-200 border-slate-100 cursor-not-allowed italic",
    overlap: "bg-orange-50 text-orange-300 border-orange-100 cursor-not-allowed",
    manual_block: "bg-slate-900 text-slate-500 border-slate-700 cursor-not-allowed",
  };
  const statusLabel: Record<SlotStatus, string> = {
    available: "",
    blocked: t("statusBooked"),
    outside: t("statusClosed"),
    past: t("statusExpired"),
    overlap: t("statusExceeded"),
    manual_block: t("statusUnavailable"),
  };
  return (
    <div ref={containerRef} className="bg-white w-[92vw] max-w-[300px] rounded-2xl border-2 border-slate-900 shadow-2xl overflow-hidden mx-auto">
      <div className="bg-slate-900 px-4 py-2.5 text-center border-b-2 border-amber-500">
        <p className="text-[8px] font-black text-amber-500 uppercase italic tracking-[0.2em] mb-0.5">{t("timePickerTitle")}</p>
        {selectedDate && (
          <h3 className="text-[13px] font-black text-white uppercase italic tracking-tight leading-tight">
            {new Date(selectedDate + "T00:00:00").toLocaleDateString(localeCode, { weekday: "short", day: "2-digit", month: "short" })}
          </h3>
        )}
      </div>
      <div className="p-3 space-y-2.5">
        {(isClosed && !allowOverride) ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-2">🚫</div>
            <p className="font-black uppercase italic text-slate-500 text-[11px]">{t("closedMessage")}</p>
          </div>
        ) : (
          <>
            <div>
              <span className="text-[8px] font-black uppercase italic text-slate-400 mb-1.5 block px-1">{t("selectHourLabel")}</span>
              <div className="grid grid-cols-6 gap-1 p-1.5 bg-slate-50 rounded-xl border border-slate-100 max-h-32 overflow-y-auto">
                {hoursToShow.map((h) => {
                  const hasAvail = hourHasAvailable(h);
                  const isSelected = selHour === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      title={h}
                      onClick={() => { if (hasAvail) setSelHour(h); }}
                      disabled={!hasAvail}
                      className={`py-1.5 rounded-md font-black text-[11px] transition-all border ${
                        isSelected ? "bg-slate-900 text-amber-500 border-slate-900 shadow-sm" :
                        !hasAvail ? "bg-slate-100 text-slate-200 border-slate-100 cursor-not-allowed" :
                        "bg-white text-slate-500 border-slate-200 hover:border-amber-500 hover:text-slate-900"
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <span className="text-[8px] font-black uppercase italic text-slate-400 mb-1.5 block px-1">{t("minutesLabel")}</span>
              <div className="grid grid-cols-5 gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-100 max-h-56 overflow-y-auto">
                {minutes.map((m) => {
                  const status = checkStatus(selHour, m);
                  const isSelected = selMinute === m;
                  const isAvail = status === "available";
                  const isLandmark = Number(m) % 5 === 0;
                  const minuteCls = isSelected && isAvail
                    ? "border-amber-500 bg-slate-950 text-amber-500 shadow-sm"
                    : isAvail && isLandmark
                      ? "border-slate-950 bg-amber-500 text-slate-950"
                      : isAvail
                        ? "border-transparent bg-white text-slate-600 hover:bg-amber-100"
                        : isLandmark
                          ? statusColors[status] + " !border-amber-500"
                          : statusColors[status];
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectMinute(m)}
                      disabled={allowOverride ? status === "past" : !isAvail}
                      className={`py-2 rounded-lg font-black text-[13px] transition-all border-2 flex flex-col items-center justify-center ${minuteCls} ${allowOverride && status !== "past" ? "!cursor-pointer" : ""}`}
                    >
                      {m}
                      {!isAvail && (
                        <span className="text-[6px] font-black mt-0.5 not-italic normal-case tracking-normal leading-none text-center">
                          {statusLabel[status]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
        <button type="button" onClick={onClose} className="w-full py-2 bg-slate-900 text-white rounded-xl font-black uppercase italic text-[10px] hover:bg-amber-500 hover:text-black transition-all">
          {t("cancelBtn")}
        </button>
      </div>
    </div>
  );
}
// ─── CHRONOS DATE PICKER ──────────────────────────────────────────────────────────
export function ChronosDatePicker({
  value,
  onChange,
  onClose,
  workingHours = [],
  isDateAvailable,
}: {
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
  workingHours?: WorkingHourEntry[];
  isDateAvailable?: (dateStr: string) => boolean;
}) {
  const t = useTranslations("chronosPickers");
  const dayNamesShort = t.raw("dayNamesShort") as string[];
  const monthNames = t.raw("monthNames") as string[];
  const [viewDate, setViewDate] = useState(() => {
    const d = value ? new Date(value + "T00:00:00") : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function clickOut(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, [onClose]);
  const isDayClosed = useCallback(
    (date: Date): boolean => {
      if (!workingHours || workingHours.length === 0) return false;
      const dayName = DAY_NAMES_LONG[date.getDay()];
      const dayEntries = workingHours.filter((h) => h.day === dayName);
      if (dayEntries.length === 0) return false;
      return dayEntries.every((h) => h.closed === true);
    },
    [workingHours]
  );
  const isDisabledDate = useCallback(
    (date: Date, key: string, isPast: boolean): boolean => {
      if (isPast) return true;
      if (isDateAvailable) return !isDateAvailable(key);
      return isDayClosed(date);
    },
    [isDateAvailable, isDayClosed]
  );
  const selectedDate = value ? new Date(value + "T00:00:00") : null;
  const today = new Date();
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Date[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(addDays(first, i - startOffset));
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(addDays(cells[cells.length - 1], 1));
  return (
    <div ref={containerRef} className="bg-white w-[92vw] max-w-[320px] rounded-2xl border-2 border-slate-900 shadow-2xl overflow-hidden mx-auto">
      <div className="bg-slate-900 px-4 py-3 text-center border-b-2 border-amber-500">
        <p className="text-[8px] font-black text-amber-500 uppercase italic tracking-[0.2em] mb-1.5">{t("datePickerTitle")}</p>
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))} className="text-white hover:text-amber-500 font-black text-sm px-2 transition-all">◀</button>
          <h3 className="text-[13px] font-black text-white uppercase italic">{monthNames[month]} {year}</h3>
          <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))} className="text-white hover:text-amber-500 font-black text-sm px-2 transition-all">▶</button>
        </div>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-7 gap-0.5 mb-1.5 px-0.5">
          {dayNamesShort.map((d) => (
            <div key={d} className="text-center text-[8px] font-black text-slate-400 uppercase italic py-0.5">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 bg-slate-50 p-2 rounded-xl border border-slate-100">
          {cells.map((day, idx) => {
            const key = formatKey(day);
            const isCurrentMonth = day.getMonth() === month;
            const isSelected = selectedDate ? sameDay(day, selectedDate) : false;
            const isTodayDate = sameDay(day, today);
            const isPast = formatKey(day) < formatKey(today);
            const isDisabled = isDisabledDate(day, key, isPast);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => { if (!isDisabled && isCurrentMonth) { onChange(key); onClose(); } }}
                disabled={isDisabled || !isCurrentMonth}
                className={`aspect-square rounded-md text-[10px] font-black flex flex-col items-center justify-center transition-all
                  ${!isCurrentMonth ? "opacity-20 pointer-events-none" : ""}
                  ${isDisabled && isCurrentMonth ? "opacity-40 cursor-not-allowed bg-slate-100" : ""}
                  ${isSelected ? "bg-amber-500 text-black shadow-sm" : ""}
                  ${isTodayDate && !isSelected ? "border border-amber-500 text-amber-600" : ""}
                  ${!isSelected && !isDisabled && isCurrentMonth ? "hover:bg-white hover:shadow-sm text-slate-900" : ""}
                `}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
        <button type="button" onClick={onClose} className="w-full mt-3 py-2 bg-slate-900 text-white rounded-xl font-black uppercase italic text-[10px] hover:bg-amber-500 hover:text-black transition-all">
          {t("closeBtn")}
        </button>
      </div>
    </div>
  );
}
