"use client";
import { useEffect, useRef, useState } from "react";
interface SimpleDatePickerProps {
  value: string; // format "YYYY-MM-DD"
  onChange: (v: string) => void;
}
const DAY_NAMES = ["L", "M", "M", "J", "V", "S", "D"];
const MONTH_NAMES = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];
function formatKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
export default function SimpleDatePicker({ value, onChange }: SimpleDatePickerProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const selectedDate = value ? new Date(value + "T00:00:00") : new Date();
  const [viewDate, setViewDate] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  useEffect(() => {
    if (!open) return;
    const base = value ? new Date(value + "T00:00:00") : new Date();
    setViewDate(new Date(base.getFullYear(), base.getMonth(), 1));
    function onClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, value]);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Date[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(addDays(first, i - startOffset));
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(addDays(cells[cells.length - 1], 1));
  const today = new Date();
  const select = (d: Date) => {
    onChange(formatKey(d));
    setOpen(false);
  };
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-w-[120px] rounded-2xl bg-slate-950 px-4 py-3 text-center text-[13px] font-black italic text-amber-500 shadow-sm ring-1 ring-slate-800 transition-all hover:bg-amber-500 hover:text-slate-950"
      >
        📅 {value || "Alege data"}
      </button>
      {open && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
          <div
            ref={panelRef}
            className="w-full max-w-sm rounded-[32px] border-t-[8px] border-amber-500 bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))}
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-600 hover:bg-amber-100">‹</button>
              <h4 className="text-sm font-black uppercase italic tracking-tight text-slate-950">
                {MONTH_NAMES[month]} {year}
              </h4>
              <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))}
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-600 hover:bg-amber-100">›</button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAY_NAMES.map((d, i) => (
                <div key={i} className="text-center text-[9px] font-black uppercase italic text-slate-400 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((d, i) => {
                const inMonth = d.getMonth() === month;
                const isSelected = formatKey(d) === value;
                const isToday = formatKey(d) === formatKey(today);
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!inMonth}
                    onClick={() => select(d)}
                    className={`aspect-square rounded-xl text-[12px] font-black italic transition-all ${
                      !inMonth ? "opacity-0 pointer-events-none" :
                      isSelected ? "border-2 border-amber-500 bg-slate-950 text-amber-500 shadow-md" :
                      isToday ? "border-2 border-slate-950 bg-amber-500 text-slate-950" :
                      "border-2 border-transparent bg-slate-100 text-slate-600 hover:bg-amber-100"
                    }`}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-6 w-full rounded-2xl bg-slate-100 py-3 text-[10px] font-black uppercase italic text-slate-500 transition-all hover:bg-red-500 hover:text-white"
            >
              Inchide
            </button>
          </div>
        </div>
      )}
    </>
  );
}