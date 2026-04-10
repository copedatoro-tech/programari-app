"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

// ─── TYPES ─────────────────────────────────────────────────────────────────────
interface WorkingHourEntry {
  day: string;
  start: string;
  end: string;
  closed: boolean;
}

interface BlockedSlot {
  time: string;
  endTime: string;
}

// ─── CONSTANTS ──────────────────────────────────────────────────────────────────
const dayNamesShort = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"];
const DAY_NAMES_LONG = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];
const monthNames = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

// ─── HELPERS ────────────────────────────────────────────────────────────────────
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMinutesToTime(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Generate all 15-min slots between start and end
function generateSlots(start: string, end: string): string[] {
  const slots: string[] = [];
  let cur = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  while (cur < endMin) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    cur += 15;
  }
  return slots;
}

// ─── CHRONOS TIME PICKER (WITH SUPABASE SYNC) ──────────────────────────────────
export function ChronosTimePicker({
  value,
  onChange,
  onClose,
  adminId,
  selectedDate,
  serviceDuration = 0,
}: {
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
  adminId?: string;
  selectedDate?: string;
  serviceDuration?: number;
}) {
  const initialHour = value?.includes(":") ? value.split(":")[0] : "09";
  const initialMinute = value?.includes(":") ? value.split(":")[1] : "00";

  const [selectedHour, setSelectedHour] = useState(initialHour);
  const [selectedMinute, setSelectedMinute] = useState(initialMinute);
  const [workingStart, setWorkingStart] = useState<string | null>(null);
  const [workingEnd, setWorkingEnd] = useState<string | null>(null);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch working hours + existing appointments for the selected date
  const fetchAvailability = useCallback(async () => {
    if (!adminId || !selectedDate) return;
    setLoading(true);
    try {
      // 1. Get working hours for this day
      const { data: profileData } = await supabase
        .from("profiles")
        .select("working_hours")
        .eq("id", adminId)
        .single();

      if (profileData?.working_hours) {
        const dateObj = new Date(selectedDate + "T00:00:00");
        const dayName = DAY_NAMES_LONG[dateObj.getDay()];
        const schedule: WorkingHourEntry = profileData.working_hours.find(
          (h: WorkingHourEntry) => h.day === dayName
        );

        if (!schedule || schedule.closed) {
          setIsClosed(true);
          setWorkingStart(null);
          setWorkingEnd(null);
        } else {
          setIsClosed(false);
          setWorkingStart(schedule.start);
          setWorkingEnd(schedule.end);
        }
      }

      // 2. Get existing appointments for this day
      const { data: appointments } = await supabase
        .from("appointments")
        .select("time, duration")
        .eq("user_id", adminId)
        .eq("date", selectedDate)
        .neq("status", "cancelled");

      if (appointments) {
        const blocked: BlockedSlot[] = appointments.map((appt) => ({
          time: appt.time,
          endTime: addMinutesToTime(appt.time, appt.duration || 0),
        }));
        setBlockedSlots(blocked);
      }
    } catch (e) {
      console.error("Error fetching availability:", e);
    } finally {
      setLoading(false);
    }
  }, [adminId, selectedDate]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Close on outside click
  useEffect(() => {
    function clickOut(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        onClose();
    }
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, [onClose]);

  // Check if a given time slot is available
  const isSlotBlocked = useCallback(
    (time: string): "blocked" | "outside" | "overlap" | "available" => {
      if (workingStart && workingEnd) {
        if (time < workingStart || time >= workingEnd) return "outside";
        // Check service duration doesn't exceed working hours
        if (serviceDuration > 0) {
          const endTime = addMinutesToTime(time, serviceDuration);
          if (endTime > workingEnd) return "overlap";
        }
      }

      // Check against existing appointments
      const slotStart = timeToMinutes(time);
      const slotEnd = slotStart + (serviceDuration || 30); // min 30min buffer

      for (const blocked of blockedSlots) {
        const bStart = timeToMinutes(blocked.time);
        const bEnd = timeToMinutes(blocked.endTime) || bStart + 30;
        // Overlap check
        if (slotStart < bEnd && slotEnd > bStart) return "blocked";
      }

      return "available";
    },
    [workingStart, workingEnd, blockedSlots, serviceDuration]
  );

  // Generate available hours list
  const availableHours = workingStart && workingEnd
    ? Array.from(
        new Set(
          generateSlots(workingStart, workingEnd).map((s) => s.split(":")[0])
        )
      )
    : Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

  const minutes = ["00", "15", "30", "45"];

  const handleFinalize = (m: string) => {
    const time = `${selectedHour}:${m}`;
    const status = isSlotBlocked(time);
    if (status !== "available" && workingStart) return; // don't allow blocked
    setSelectedMinute(m);
    onChange(time);
    onClose();
  };

  const getMinuteStatus = (m: string) => {
    const time = `${selectedHour}:${m}`;
    if (!workingStart) return "available";
    return isSlotBlocked(time);
  };

  const statusLabel: Record<string, string> = {
    blocked: "Ocupat",
    outside: "Închis",
    overlap: "Durată depășită",
    available: "",
  };

  const statusColor: Record<string, string> = {
    blocked: "bg-red-50 text-red-300 border-red-200 cursor-not-allowed line-through",
    outside: "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed",
    overlap: "bg-orange-50 text-orange-300 border-orange-200 cursor-not-allowed",
    available: "bg-white text-slate-500 border-slate-200 hover:border-amber-500 hover:text-slate-900",
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div
        ref={containerRef}
        className="bg-white w-full max-w-md rounded-[45px] border-4 border-slate-900 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-slate-900 p-8 text-center border-b-4 border-amber-500">
          <p className="text-[10px] font-black text-amber-500 uppercase italic tracking-[0.3em] mb-2">
            Chronos Time Picker
          </p>
          <h3 className="text-4xl font-black text-white italic tracking-tighter">
            {selectedHour}
            <span className="animate-pulse text-amber-500">:</span>
            {selectedMinute}
          </h3>
          {selectedDate && (
            <p className="text-slate-400 text-[10px] font-black uppercase italic mt-2">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("ro-RO", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </p>
          )}
          {workingStart && workingEnd && !isClosed && (
            <div className="mt-3 inline-flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                Program: {workingStart} — {workingEnd}
              </span>
            </div>
          )}
          {isClosed && (
            <div className="mt-3 inline-flex items-center gap-2 bg-red-900/50 px-4 py-2 rounded-full">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">
                Zi Închisă
              </span>
            </div>
          )}
        </div>

        <div className="p-6 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full"></div>
              <span className="ml-3 text-slate-400 font-black text-sm italic">Verificăm disponibilitatea...</span>
            </div>
          ) : isClosed ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">🚫</div>
              <p className="font-black uppercase italic text-slate-500 text-sm">
                Salonul este închis în această zi.
              </p>
              <p className="text-slate-400 text-xs mt-2 italic">Te rugăm să alegi altă dată.</p>
            </div>
          ) : (
            <>
              {/* Hours grid */}
              <div>
                <div className="flex justify-between items-center mb-2 px-2">
                  <span className="text-[9px] font-black uppercase italic text-slate-400">
                    Selectează Ora
                  </span>
                  <span className="text-[9px] font-black uppercase italic text-slate-300">
                    {workingStart ? `${workingStart}–${workingEnd}` : "Fără restricții"}
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-2 max-h-[180px] overflow-y-auto p-2 bg-slate-50 rounded-[25px] border-2 border-slate-100">
                  {(workingStart && workingEnd
                    ? availableHours
                    : Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))
                  ).map((h) => {
                    // Check if this hour has at least one available minute
                    const hasAvailable = minutes.some(
                      (m) => isSlotBlocked(`${h}:${m}`) === "available"
                    );
                    return (
                      <button
                        key={h}
                        onClick={() => setSelectedHour(h)}
                        disabled={!hasAvailable && !!workingStart}
                        className={`py-3 rounded-xl font-black text-[13px] transition-all border-2 ${
                          selectedHour === h
                            ? "bg-slate-900 text-amber-500 border-slate-900 shadow-md scale-105"
                            : !hasAvailable && workingStart
                            ? "bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed line-through"
                            : "bg-white text-slate-500 border-slate-200 hover:border-amber-500 hover:text-slate-900"
                        }`}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minutes grid */}
              <div>
                <span className="text-[9px] font-black uppercase italic text-slate-400 mb-2 block px-2">
                  Minute
                </span>
                <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-[25px] border-2 border-slate-100">
                  {minutes.map((m) => {
                    const status = getMinuteStatus(m);
                    const isSelected = selectedMinute === m;
                    return (
                      <button
                        key={m}
                        onClick={() => handleFinalize(m)}
                        disabled={status !== "available"}
                        title={statusLabel[status] || ""}
                        className={`py-4 rounded-2xl font-black text-xl transition-all border-2 ${
                          isSelected && status === "available"
                            ? "bg-amber-500 text-black border-amber-500 shadow-lg scale-105"
                            : statusColor[status]
                        }`}
                      >
                        :{m}
                        {status !== "available" && (
                          <span className="block text-[8px] font-black mt-1 not-italic normal-case tracking-normal">
                            {statusLabel[status]}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="flex gap-3 justify-center flex-wrap">
                {[
                  { color: "bg-emerald-400", label: "Disponibil" },
                  { color: "bg-red-300", label: "Ocupat" },
                  { color: "bg-slate-300", label: "Închis" },
                  { color: "bg-orange-300", label: "Durată depășită" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                    <span className="text-[9px] font-black text-slate-400 uppercase italic">
                      {item.label}
                    </span>
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
    </div>
  );
}

// ─── CHRONOS DATE PICKER (WITH CLOSED DAY HIGHLIGHTING) ────────────────────────
export function ChronosDatePicker({
  value,
  onChange,
  onClose,
  minDate,
  adminId,
}: {
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
  minDate?: string;
  adminId?: string;
}) {
  const [viewDate, setViewDate] = useState(() => {
    const d = value ? new Date(value + "T00:00:00") : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [workingHours, setWorkingHours] = useState<WorkingHourEntry[]>([]);
  const [busyDates, setBusyDates] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch working hours config
  useEffect(() => {
    if (!adminId) return;
    async function fetchWorkingHours() {
      const { data } = await supabase
        .from("profiles")
        .select("working_hours")
        .eq("id", adminId)
        .single();
      if (data?.working_hours) setWorkingHours(data.working_hours);
    }
    fetchWorkingHours();
  }, [adminId]);

  // Fetch busy dates for current month view
  useEffect(() => {
    if (!adminId) return;
    async function fetchBusy() {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const end = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()}`;

      const { data: appointments } = await supabase
        .from("appointments")
        .select("date")
        .eq("user_id", adminId)
        .gte("date", start)
        .lte("date", end)
        .neq("status", "cancelled");

      // Count appointments per date
      const countPerDay: Record<string, number> = {};
      appointments?.forEach((a) => {
        countPerDay[a.date] = (countPerDay[a.date] || 0) + 1;
      });
      // Mark days with 8+ appointments as "busy" (visual indicator)
      const busy = new Set<string>(
        Object.entries(countPerDay)
          .filter(([, count]) => count >= 8)
          .map(([date]) => date)
      );
      setBusyDates(busy);
    }
    fetchBusy();
  }, [adminId, viewDate]);

  useEffect(() => {
    function clickOut(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        onClose();
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

  const navMonth = (dir: number) => setViewDate(new Date(year, month + dir, 1));

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[600] flex items-center justify-center p-4">
      <div
        ref={containerRef}
        className="bg-white w-full max-w-md rounded-[45px] border-4 border-slate-900 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-slate-900 p-8 text-center border-b-4 border-amber-500">
          <p className="text-[10px] font-black text-amber-500 uppercase italic tracking-[0.3em] mb-2">
            Chronos Date Picker
          </p>
          <div className="flex items-center justify-between">
            <button
              onClick={() => navMonth(-1)}
              className="text-white hover:text-amber-500 font-black text-lg px-3 transition-all"
            >
              ◀
            </button>
            <h3 className="text-xl font-black text-white uppercase italic">
              {monthNames[month]} {year}
            </h3>
            <button
              onClick={() => navMonth(1)}
              className="text-white hover:text-amber-500 font-black text-lg px-3 transition-all"
            >
              ▶
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-3 px-2">
            {dayNamesShort.map((d) => (
              <div
                key={d}
                className="text-center text-[9px] font-black text-slate-400 uppercase italic py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 bg-slate-50 p-3 rounded-[30px] border-2 border-slate-100">
            {cells.map((day, idx) => {
              const key = formatKey(day);
              const isCurrentMonth = day.getMonth() === month;
              const isSelected = selectedDate ? sameDay(day, selectedDate) : false;
              const isToday = sameDay(day, today);
              const isPast = minDate ? key < minDate : false;
              const isClosed = isDayClosed(day);
              const isBusy = busyDates.has(key);
              const isDisabled = isPast || isClosed;

              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (!isDisabled) {
                      onChange(key);
                      onClose();
                    }
                  }}
                  disabled={isDisabled}
                  title={isClosed ? "Zi închisă" : isBusy ? "Zi aglomerată" : ""}
                  className={`
                    aspect-square rounded-xl text-[11px] font-black flex flex-col items-center justify-center transition-all relative
                    ${!isCurrentMonth ? "opacity-20" : "opacity-100"}
                    ${isDisabled ? "opacity-25 cursor-not-allowed" : ""}
                    ${isSelected ? "bg-amber-500 text-black shadow-lg scale-105" : ""}
                    ${isToday && !isSelected ? "border-2 border-amber-500 text-amber-600" : ""}
                    ${isClosed && isCurrentMonth && !isPast ? "bg-red-50 text-red-300" : ""}
                    ${isBusy && !isClosed && !isSelected ? "text-orange-500" : ""}
                    ${!isSelected && !isDisabled ? "hover:bg-white hover:shadow-sm text-slate-900" : ""}
                  `}
                >
                  {day.getDate()}
                  {isClosed && isCurrentMonth && !isPast && (
                    <span className="text-[5px] block leading-none text-red-300 font-black">ÎNCHIS</span>
                  )}
                  {isBusy && !isClosed && isCurrentMonth && (
                    <span className="w-1 h-1 rounded-full bg-orange-400 absolute bottom-1"></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 justify-center mt-4 flex-wrap">
            {[
              { color: "bg-amber-500", label: "Selectat" },
              { color: "bg-red-200", label: "Închis" },
              { color: "bg-orange-400", label: "Aglomerat", dot: true },
              { color: "border-2 border-amber-500 bg-transparent", label: "Azi" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span
                  className={`${item.dot ? "w-2 h-2 rounded-full" : "w-3 h-3 rounded"} ${item.color}`}
                ></span>
                <span className="text-[9px] font-black text-slate-400 uppercase italic">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full mt-6 py-4 bg-slate-900 text-white rounded-[20px] font-black uppercase italic text-[10px] hover:bg-amber-500 hover:text-black transition-all border-b-4 border-slate-800"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
}