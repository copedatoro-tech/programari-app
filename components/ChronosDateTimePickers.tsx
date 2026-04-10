"use client";

import { useState, useRef, useEffect, useCallback } from "react";

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

function formatKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Returnează ziua săptămânii din "YYYY-MM-DD" fără probleme de timezone
function getDayNameFromDateString(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, mo - 1, d);
  return DAY_NAMES_LONG[dateObj.getDay()];
}

// ─── SLOT STATUS ─────────────────────────────────────────────────────────────────
type SlotStatus = "available" | "blocked" | "outside" | "overlap";

function getSlotStatus(
  time: string,
  workingStart: string,
  workingEnd: string,
  existingAppointments: ExistingAppointment[],
  serviceDuration: number
): SlotStatus {
  if (time < workingStart || time >= workingEnd) return "outside";

  if (serviceDuration > 0) {
    const endTime = addMinutesToTime(time, serviceDuration);
    if (endTime > workingEnd) return "overlap";
  }

  const newStart = timeToMinutes(time);
  const newEnd = newStart + (serviceDuration > 0 ? serviceDuration : 30);

  for (const appt of existingAppointments) {
    if (!appt.time) continue;
    const apptStart = timeToMinutes(appt.time);
    const apptEnd = apptStart + (appt.duration > 0 ? appt.duration : 30);
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
}: {
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
  workingHours?: WorkingHourEntry[];
  existingAppointments?: ExistingAppointment[];
  blockedSlots?: any[];
  selectedDate?: string;
  serviceDuration?: number;
}) {
  const initH = value?.includes(":") ? value.split(":")[0] : "09";
  const initM = value?.includes(":") ? value.split(":")[1] : "00";
  const [selHour, setSelHour] = useState(initH);
  const [selMinute, setSelMinute] = useState(initM);
  const containerRef = useRef<HTMLDivElement>(null);

  const daySchedule = (() => {
    if (!selectedDate || !workingHours.length) return null;
    const dayName = getDayNameFromDateString(selectedDate);
    return workingHours.find((h) => h.day === dayName) || null;
  })();

  const isClosed = daySchedule?.closed === true;
  const workingStart = !isClosed && daySchedule?.start ? daySchedule.start : null;
  const workingEnd = !isClosed && daySchedule?.end ? daySchedule.end : null;

  const minutes = ["00", "15", "30", "45"];
  const allHours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

  const hoursToShow = workingStart && workingEnd
    ? allHours.filter((h) =>
        minutes.some((m) => {
          const t = `${h}:${m}`;
          return t >= workingStart && t < workingEnd;
        })
      )
    : allHours;

  const checkStatus = useCallback(
    (h: string, m: string): SlotStatus => {
      if (isClosed) return "outside";
      if (!workingStart || !workingEnd) return "available";
      return getSlotStatus(`${h}:${m}`, workingStart, workingEnd, existingAppointments, serviceDuration);
    },
    [isClosed, workingStart, workingEnd, existingAppointments, serviceDuration]
  );

  const hourHasAvailable = useCallback(
    (h: string) => minutes.some((m) => checkStatus(h, m) === "available"),
    [checkStatus]
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
    available: "bg-white text-slate-600 border-slate-200 hover:border-amber-500 hover:text-slate-900 cursor-pointer",
    blocked: "bg-red-50 text-red-300 border-red-100 cursor-not-allowed line-through",
    outside: "bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed",
    overlap: "bg-orange-50 text-orange-300 border-orange-100 cursor-not-allowed",
  };

  const statusLabel: Record<SlotStatus, string> = {
    available: "",
    blocked: "Ocupat",
    outside: "Închis",
    overlap: "Depășit",
  };

  return (
    <div
      ref={containerRef}
      className="bg-white w-full max-w-md rounded-[45px] border-4 border-slate-900 shadow-2xl overflow-hidden"
    >
      <div className="bg-slate-900 p-8 text-center border-b-4 border-amber-500">
        <p className="text-[10px] font-black text-amber-500 uppercase italic tracking-[0.3em] mb-2">
          Chronos Time Picker
        </p>
        <h3 className="text-4xl font-black text-white italic tracking-tighter">
          {selHour}<span className="animate-pulse text-amber-500">:</span>{selMinute}
        </h3>
        {selectedDate && (
          <p className="text-slate-400 text-[10px] font-black uppercase italic mt-1">
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("ro-RO", {
              weekday: "long", day: "2-digit", month: "long",
            })}
          </p>
        )}
        <div className="mt-3">
          {isClosed ? (
            <span className="inline-flex items-center gap-2 bg-red-900/50 px-4 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">Zi Închisă</span>
            </span>
          ) : workingStart && workingEnd ? (
            <span className="inline-flex items-center gap-2 bg-slate-800 px-4 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                Program: {workingStart} — {workingEnd}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 bg-slate-800 px-4 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Program nesetat</span>
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-5">
        {isClosed ? (
          <div className="text-center py-10">
            <div className="text-5xl mb-4">🚫</div>
            <p className="font-black uppercase italic text-slate-500 text-sm">Salonul este închis în această zi.</p>
            <p className="text-slate-400 text-xs mt-2 italic">Te rugăm să alegi altă dată.</p>
          </div>
        ) : (
          <>
            <div>
              <span className="text-[9px] font-black uppercase italic text-slate-400 mb-2 block px-2">Selectează Ora</span>
              <div className="grid grid-cols-6 gap-2 max-h-[180px] overflow-y-auto p-2 bg-slate-50 rounded-[25px] border-2 border-slate-100">
                {hoursToShow.map((h) => {
                  const hasAvail = hourHasAvailable(h);
                  const isSelected = selHour === h;
                  return (
                    <button
                      key={h}
                      onClick={() => { if (hasAvail) setSelHour(h); }}
                      disabled={!hasAvail}
                      className={`py-3 rounded-xl font-black text-[13px] transition-all border-2 ${
                        isSelected
                          ? "bg-slate-900 text-amber-500 border-slate-900 shadow-md scale-105"
                          : !hasAvail
                          ? "bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed"
                          : "bg-white text-slate-500 border-slate-200 hover:border-amber-500 hover:text-slate-900"
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="text-[9px] font-black uppercase italic text-slate-400 mb-2 block px-2">Minute</span>
              <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-[25px] border-2 border-slate-100">
                {minutes.map((m) => {
                  const status = checkStatus(selHour, m);
                  const isSelected = selMinute === m;
                  const isAvail = status === "available";
                  return (
                    <button
                      key={m}
                      onClick={() => handleSelectMinute(m)}
                      disabled={!isAvail}
                      title={statusLabel[status]}
                      className={`py-4 rounded-2xl font-black text-xl transition-all border-2 flex flex-col items-center justify-center ${
                        isSelected && isAvail
                          ? "bg-amber-500 text-black border-amber-500 shadow-lg scale-105"
                          : statusColors[status]
                      }`}
                    >
                      :{m}
                      {!isAvail && (
                        <span className="text-[7px] font-black mt-0.5 not-italic normal-case tracking-normal leading-none">
                          {statusLabel[status]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 justify-center flex-wrap pt-1">
              {[
                { color: "bg-emerald-400", label: "Disponibil" },
                { color: "bg-red-300", label: "Ocupat" },
                { color: "bg-slate-300", label: "Închis" },
                { color: "bg-orange-300", label: "Depășit" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${item.color}`}></span>
                  <span className="text-[9px] font-black text-slate-400 uppercase italic">{item.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <button
          onClick={onClose}
          className="w-full py-4 bg-slate-900 text-white rounded-[20px] font-black uppercase italic text-[10px] hover:bg-amber-500 hover:text-black transition-all border-b-4 border-slate-800"
        >
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
}: {
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
  minDate?: string;
  workingHours?: WorkingHourEntry[];
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
      if (!workingHours.length) return false;
      const dayName = DAY_NAMES_LONG[date.getDay()];
      const schedule = workingHours.find((h) => h.day === dayName);
      return !!schedule?.closed;
    },
    [workingHours]
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
    <div
      ref={containerRef}
      className="bg-white w-full max-w-md rounded-[45px] border-4 border-slate-900 shadow-2xl overflow-hidden"
    >
      <div className="bg-slate-900 p-8 text-center border-b-4 border-amber-500">
        <p className="text-[10px] font-black text-amber-500 uppercase italic tracking-[0.3em] mb-2">
          Chronos Date Picker
        </p>
        <div className="flex items-center justify-between">
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="text-white hover:text-amber-500 font-black text-lg px-3 transition-all">◀</button>
          <h3 className="text-xl font-black text-white uppercase italic">{monthNames[month]} {year}</h3>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="text-white hover:text-amber-500 font-black text-lg px-3 transition-all">▶</button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-7 gap-1 mb-3 px-2">
          {dayNamesShort.map((d) => (
            <div key={d} className="text-center text-[9px] font-black text-slate-400 uppercase italic py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 bg-slate-50 p-3 rounded-[30px] border-2 border-slate-100">
          {cells.map((day, idx) => {
            const key = formatKey(day);
            const isCurrentMonth = day.getMonth() === month;
            const isSelected = selectedDate ? sameDay(day, selectedDate) : false;
            const isToday = sameDay(day, today);
            const isPast = minDate ? key < minDate : false;
            const isClosed = isDayClosed(day);
            const isDisabled = isPast || isClosed;

            return (
              <button
                key={idx}
                onClick={() => { if (!isDisabled) { onChange(key); onClose(); } }}
                disabled={isDisabled}
                title={isClosed ? "Zi închisă" : ""}
                className={`
                  aspect-square rounded-xl text-[11px] font-black flex flex-col items-center justify-center transition-all
                  ${!isCurrentMonth ? "opacity-20" : ""}
                  ${isDisabled ? "opacity-30 cursor-not-allowed" : ""}
                  ${isSelected ? "bg-amber-500 text-black shadow-lg scale-105" : ""}
                  ${isToday && !isSelected ? "border-2 border-amber-500 text-amber-600" : ""}
                  ${isClosed && isCurrentMonth && !isPast ? "bg-red-50 text-red-300" : ""}
                  ${!isSelected && !isDisabled ? "hover:bg-white hover:shadow-sm text-slate-900" : ""}
                `}
              >
                {day.getDate()}
                {isClosed && isCurrentMonth && !isPast && (
                  <span className="text-[5px] block leading-none text-red-300 font-black">ÎNCHIS</span>
                )}
              </button>
            );
          })}
        </div>

        {workingHours.length > 0 && (
          <div className="flex gap-4 justify-center mt-4 flex-wrap">
            {[
              { color: "bg-amber-500", label: "Selectat" },
              { color: "bg-red-200", label: "Închis" },
              { color: "border-2 border-amber-500 bg-transparent", label: "Azi" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded ${item.color}`}></span>
                <span className="text-[9px] font-black text-slate-400 uppercase italic">{item.label}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-6 py-4 bg-slate-900 text-white rounded-[20px] font-black uppercase italic text-[10px] hover:bg-amber-500 hover:text-black transition-all border-b-4 border-slate-800"
        >
          Închide
        </button>
      </div>
    </div>
  );
}