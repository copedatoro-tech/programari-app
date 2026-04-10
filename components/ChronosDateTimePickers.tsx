"use client";

import { useState, useRef, useEffect } from "react";

const dayNamesShort = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"];
const monthNames = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"
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
  const [selectedHour, setSelectedHour] = useState(value?.split(":")[0] || "09");
  const [selectedMinute, setSelectedMinute] = useState(value?.split(":")[1] || "00");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function clickOut(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        onClose();
    }
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, [onClose]);

  const hours = Array.from({ length: 15 }, (_, i) => String(i + 8).padStart(2, "0")); // 08:00 - 22:00
  const minutes = ["00", "15", "30", "45"];

  const handleFinalize = (m: string) => {
    setSelectedMinute(m);
    onChange(`${selectedHour}:${m}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div
        ref={containerRef}
        className="bg-white w-full max-w-md rounded-[45px] border-4 border-slate-900 shadow-2xl overflow-hidden"
      >
        {/* HEADER - IDENTIC CU DATE PICKER */}
        <div className="bg-slate-900 p-8 text-center border-b-4 border-amber-500">
          <p className="text-[10px] font-black text-amber-500 uppercase italic tracking-[0.3em] mb-2">
            Chronos Hour Picker
          </p>
          <h3 className="text-4xl font-black text-white italic">
            {selectedHour}<span className="animate-pulse">:</span>{selectedMinute}
          </h3>
        </div>

        <div className="p-6 space-y-6">
          {/* SECTOR ORE */}
          <div className="bg-slate-50 p-5 rounded-[30px] border-2 border-slate-100 relative">
            <label className="text-[9px] font-black uppercase italic text-slate-400 absolute -top-3 left-6 bg-white px-2 border border-slate-100 rounded-full">
              ORE
            </label>
            <div className="grid grid-cols-5 gap-2">
              {hours.map((h) => (
                <button
                  key={h}
                  onClick={() => setSelectedHour(h)}
                  className={`py-3 rounded-xl font-black text-[13px] transition-all border-2 ${
                    selectedHour === h
                      ? "bg-slate-900 text-amber-500 border-slate-900 shadow-md scale-105"
                      : "bg-white text-slate-400 border-slate-200 hover:border-amber-500 hover:text-slate-900"
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* SECTOR MINUTE */}
          <div className="bg-slate-50 p-5 rounded-[30px] border-2 border-slate-100 relative">
            <label className="text-[9px] font-black uppercase italic text-slate-400 absolute -top-3 left-6 bg-white px-2 border border-slate-100 rounded-full">
              MINUTE
            </label>
            <div className="grid grid-cols-4 gap-3">
              {minutes.map((m) => (
                <button
                  key={m}
                  onClick={() => handleFinalize(m)}
                  className={`py-5 rounded-2xl font-black text-lg transition-all border-2 ${
                    selectedMinute === m
                      ? "bg-amber-500 text-black border-amber-500 shadow-md"
                      : "bg-white text-slate-400 border-slate-200 hover:border-amber-500"
                  }`}
                >
                  :{m}
                </button>
              ))}
            </div>
          </div>

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
                    ${isSelected ? "bg-amber-500 text-white shadow-lg scale-105" : ""}
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
            className="w-full mt-4 py-4 bg-slate-900 text-white rounded-[20px] font-black uppercase italic text-[10px] hover:bg-amber-500 hover:text-black transition-all border-b-4 border-slate-800"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
}