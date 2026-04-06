"use client";

import { useState, useRef, useEffect } from "react";

const dayNamesShort = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"];
const monthNames = [
  "Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie",
  "Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"
];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}
function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ─── CHRONOS TIME PICKER ──────────────────────────────────────────────────────
export function ChronosTimePicker({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"hour" | "minute">("hour");
  const [selectedHour, setSelectedHour] = useState(value?.split(":")[0] || "09");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function clickOut(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        onClose();
    }
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, [onClose]);

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = ["00", "15", "30", "45"];

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div
        ref={containerRef}
        className="bg-white border-4 border-slate-900 rounded-[40px] shadow-2xl p-8 w-full max-w-xs"
      >
        <div className="text-center mb-6">
          <p className="text-[10px] font-black uppercase italic text-amber-600 tracking-widest">
            Selectează {step === "hour" ? "Ora" : "Minutele"}
          </p>
          <p className="text-3xl font-black italic text-slate-900">
            {selectedHour}:{step === "minute" ? "--" : value?.split(":")[1] || "00"}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2 h-64 overflow-y-auto pr-2">
          {step === "hour"
            ? hours.map((h) => (
                <button
                  key={h}
                  onClick={() => { setSelectedHour(h); setStep("minute"); }}
                  className={`py-4 rounded-2xl font-black italic transition-all ${
                    selectedHour === h
                      ? "bg-slate-900 text-white"
                      : "bg-slate-50 text-slate-400 hover:bg-amber-100"
                  }`}
                >
                  {h}
                </button>
              ))
            : minutes.map((m) => (
                <button
                  key={m}
                  onClick={() => { onChange(`${selectedHour}:${m}`); onClose(); }}
                  className="col-span-2 py-6 bg-slate-50 rounded-3xl font-black italic text-slate-900 hover:bg-amber-500 hover:text-white transition-all text-lg"
                >
                  :{m}
                </button>
              ))}
        </div>

        {step === "minute" && (
          <button
            onClick={() => setStep("hour")}
            className="w-full mt-4 py-3 text-[10px] font-black uppercase italic text-slate-400 hover:text-slate-900 transition-all"
          >
            ← Înapoi la ore
          </button>
        )}
      </div>
    </div>
  );
}

// ─── CHRONOS DATE PICKER ──────────────────────────────────────────────────────
export function ChronosDatePicker({
  value,
  onChange,
  onClose,
  minDate,
}: {
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
  minDate?: string;
}) {
  const [viewDate, setViewDate] = useState(() => {
    const d = value ? new Date(value + "T00:00:00") : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function clickOut(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        onClose();
    }
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, [onClose]);

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

  const formatKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const navMonth = (dir: number) => {
    setViewDate(new Date(year, month + dir, 1));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[600] flex items-center justify-center p-4">
      <div
        ref={containerRef}
        className="bg-white w-full max-w-md rounded-[45px] border-4 border-slate-900 shadow-2xl overflow-hidden"
      >
        <div className="bg-slate-900 p-6 text-center">
          <p className="text-[10px] font-black text-amber-500 uppercase italic tracking-[0.3em]">
            Chronos Date Picker
          </p>
          <div className="flex items-center justify-between mt-2">
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
          <div className="grid grid-cols-7 gap-1 mb-3">
            {dayNamesShort.map((d) => (
              <div
                key={d}
                className="text-center text-[9px] font-black text-slate-400 uppercase italic py-1"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              const key = formatKey(day);
              const isCurrentMonth = day.getMonth() === month;
              const isSelected = selectedDate ? sameDay(day, selectedDate) : false;
              const isToday = sameDay(day, today);
              const isPast = minDate ? key < minDate : false;

              return (
                <button
                  key={idx}
                  onClick={() => { if (!isPast) { onChange(key); onClose(); } }}
                  disabled={isPast}
                  className={`aspect-square rounded-xl text-[11px] font-black flex items-center justify-center transition-all
                    ${!isCurrentMonth ? "opacity-20" : "opacity-100"}
                    ${isPast ? "opacity-10 cursor-not-allowed" : ""}
                    ${isSelected ? "bg-amber-500 text-white shadow-lg" : ""}
                    ${isToday && !isSelected ? "border-2 border-amber-500 text-amber-600" : ""}
                    ${!isSelected && !isPast ? "hover:bg-slate-100 text-slate-900" : ""}
                  `}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <button
            onClick={onClose}
            className="w-full mt-4 py-4 bg-slate-100 text-slate-900 rounded-[20px] font-black uppercase italic text-[10px] hover:bg-slate-200 transition-all"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
}