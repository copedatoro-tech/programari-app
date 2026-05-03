"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";

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

// ─── CONSTANTS ───────────────────────────────────────────────────────────────────
const dayNamesShort = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"];
const DAY_NAMES_LONG = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];
const monthNames = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

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
  workingStart: string,
  workingEnd: string,
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

  const startMinutes = timeToMinutes(workingStart);
  const endMinutes = timeToMinutes(workingEnd);
  
  if (slotMinutes < startMinutes || slotMinutes >= endMinutes) return "outside";

  const serviceLen = serviceDuration > 0 ? serviceDuration : 15;
  if (slotMinutes + serviceLen > endMinutes) return "overlap";

  if (manualBlocksForDay.includes(time)) return "manual_block";

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
}: {
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
  workingHours?: WorkingHourEntry[];
  existingAppointments?: ExistingAppointment[];
  selectedDate?: string;
  serviceDuration?: number;
  manualBlocks?: Record<string, string[]>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const todayStr = formatKey(new Date());
  const isToday = selectedDate === todayStr;
  
  const manualBlocksForDay: string[] = useMemo(() => 
    selectedDate ? (manualBlocks[selectedDate] || []) : [], 
  [selectedDate, manualBlocks]);

  const daySchedule = useMemo(() => {
    if (!selectedDate || workingHours.length === 0) return null;
    const dayName = getDayNameFromDateString(selectedDate);
    return workingHours.find((h) => h.day === dayName) || null;
  }, [selectedDate, workingHours]);

  const isClosed = daySchedule?.closed === true;
  const workingStart = daySchedule?.start || "00:00";
  const workingEnd = daySchedule?.end || "23:59";

  const minutes = useMemo(() => ["00", "15", "30", "45"], []);
  const allHours = useMemo(() => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")), []);

  const checkStatus = useCallback(
    (h: string, m: string): SlotStatus => {
      if (isClosed) return "outside";
      
      return getSlotStatus(
        `${h}:${m}`,
        workingStart,
        workingEnd,
        existingAppointments,
        serviceDuration,
        manualBlocksForDay,
        isToday
      );
    },
    [isClosed, workingStart, workingEnd, existingAppointments, serviceDuration, manualBlocksForDay, isToday]
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
    (h: string) => minutes.some((m) => checkStatus(h, m) === "available"),
    [checkStatus, minutes]
  );

  const handleSelectMinute = (m: string) => {
    if (checkStatus(selHour, m) !== "available") return;
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
    blocked: "Ocupat",
    outside: "Închis",
    past: "Expirat",
    overlap: "Depășit",
    manual_block: "Indisponibil",
  };

  return (
    <div ref={containerRef} className="bg-white w-[95vw] max-w-2xl rounded-[45px] border-4 border-slate-900 shadow-2xl overflow-hidden mx-auto">
      <div className="bg-slate-900 p-6 text-center border-b-4 border-amber-500">
        <p className="text-[10px] font-black text-amber-500 uppercase italic tracking-[0.3em] mb-1">Chronos Time Picker</p>
        {selectedDate && (
          <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("ro-RO", { weekday: "long", day: "2-digit", month: "long" })}
          </h3>
        )}
      </div>

      <div className="p-6 space-y-6">
        {isClosed ? (
          <div className="text-center py-10">
            <div className="text-6xl mb-4">🚫</div>
            <p className="font-black uppercase italic text-slate-500 text-base">Salonul este închis în această zi.</p>
          </div>
        ) : (
          <>
            <div>
              <span className="text-[10px] font-black uppercase italic text-slate-400 mb-3 block px-2">Selectează Ora</span>
              {/* 6 ORE PE ORIZONTALĂ (grid-cols-6) */}
              <div className="grid grid-cols-6 gap-2 p-3 bg-slate-50 rounded-[30px] border-2 border-slate-100">
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
                      className={`py-3 rounded-xl font-black text-[15px] transition-all border-2 ${
                        isSelected ? "bg-slate-900 text-amber-500 border-slate-900 shadow-md scale-105" :
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
              <span className="text-[10px] font-black uppercase italic text-slate-400 mb-3 block px-2">Minute</span>
              <div className="grid grid-cols-4 gap-4 bg-slate-50 p-4 rounded-[30px] border-2 border-slate-100">
                {minutes.map((m) => {
                  const status = checkStatus(selHour, m);
                  const isSelected = selMinute === m;
                  const isAvail = status === "available";
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectMinute(m)}
                      disabled={!isAvail}
                      className={`py-5 rounded-2xl font-black text-2xl transition-all border-2 flex flex-col items-center justify-center ${
                        isSelected && isAvail 
                          ? "bg-slate-900 text-amber-500 border-slate-900 shadow-lg scale-105" 
                          : statusColors[status]
                      }`}
                    >
                      {m}
                      {!isAvail && (
                        <span className="text-[8px] font-black mt-1 not-italic normal-case tracking-normal leading-none text-center">
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
        <button type="button" onClick={onClose} className="w-full py-5 bg-slate-900 text-white rounded-[25px] font-black uppercase italic text-[12px] hover:bg-amber-500 hover:text-black transition-all border-b-4 border-slate-800">
          Anulează
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
  minDate,
  workingHours = [],
  manualBlocks = {},
  isDateAvailable,
}: {
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
  minDate?: string;
  workingHours?: WorkingHourEntry[];
  manualBlocks?: Record<string, string[]>;
  isDateAvailable?: (dateStr: string) => boolean;
}) {
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
      const schedule = workingHours.find((h) => h.day === dayName);
      return schedule?.closed === true;
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
    <div ref={containerRef} className="bg-white w-[95vw] max-w-xl rounded-[45px] border-4 border-slate-900 shadow-2xl overflow-hidden mx-auto">
      <div className="bg-slate-900 p-10 text-center border-b-4 border-amber-500">
        <p className="text-[12px] font-black text-amber-500 uppercase italic tracking-[0.3em] mb-3">Chronos Date Picker</p>
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))} className="text-white hover:text-amber-500 font-black text-2xl px-4 transition-all">◀</button>
          <h3 className="text-2xl font-black text-white uppercase italic">{monthNames[month]} {year}</h3>
          <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))} className="text-white hover:text-amber-500 font-black text-2xl px-4 transition-all">▶</button>
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-7 gap-2 mb-4 px-2">
          {dayNamesShort.map((d) => (
            <div key={d} className="text-center text-[11px] font-black text-slate-400 uppercase italic py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 bg-slate-50 p-5 rounded-[40px] border-2 border-slate-100">
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
                className={`aspect-square rounded-2xl text-[15px] font-black flex flex-col items-center justify-center transition-all
                  ${!isCurrentMonth ? "opacity-20 pointer-events-none" : ""}
                  ${isDisabled && isCurrentMonth ? "opacity-40 cursor-not-allowed bg-slate-100" : ""}
                  ${isSelected ? "bg-amber-500 text-black shadow-lg scale-105" : ""}
                  ${isTodayDate && !isSelected ? "border-2 border-amber-500 text-amber-600" : ""}
                  ${!isSelected && !isDisabled && isCurrentMonth ? "hover:bg-white hover:shadow-sm text-slate-900" : ""}
                `}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
        <button type="button" onClick={onClose} className="w-full mt-8 py-5 bg-slate-900 text-white rounded-[25px] font-black uppercase italic text-[12px] hover:bg-amber-500 hover:text-black transition-all border-b-4 border-slate-800">
          Închide
        </button>
      </div>
    </div>
  );
}