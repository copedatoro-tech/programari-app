"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

type Programare = {
  id: number;
  nume: string;
  data: string;
  ora: string;
};

type ViewMode = "day" | "week" | "month";

const dayNamesShort = ["L", "Ma", "Mi", "J", "V", "S", "D"];
const dayNamesLong = [
  "Luni",
  "Marți",
  "Miercuri",
  "Joi",
  "Vineri",
  "Sâmbătă",
  "Duminică",
];
const monthNames = [
  "Ianuarie",
  "Februarie",
  "Martie",
  "Aprilie",
  "Mai",
  "Iunie",
  "Iulie",
  "August",
  "Septembrie",
  "Octombrie",
  "Noiembrie",
  "Decembrie",
];

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CalendarPage() {
  const [programari, setProgramari] = useState<Programare[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("programari");
      if (saved) {
        const raw = JSON.parse(saved);
        const mapped = raw.map((p: any) => ({
          id: p.id,
          nume: p.nume,
          data: p.data,
          ora: p.ora,
        }));
        setProgramari(mapped);
      }
    } catch {}
  }, []);

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const programariByDate = useMemo(() => {
    const map: Record<string, Programare[]> = {};
    for (const p of programari) {
      if (!map[p.data]) map[p.data] = [];
      map[p.data].push(p);
    }
    return map;
  }, [programari]);

  const currentMonthLabel = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  const handlePrev = () => {
    if (viewMode === "day") {
      setCurrentDate(addDays(currentDate, -1));
      setSelectedDate(addDays(selectedDate, -1));
    } else if (viewMode === "week") {
      setCurrentDate(addDays(currentDate, -7));
      setSelectedDate(addDays(selectedDate, -7));
    } else {
      const d = new Date(currentDate);
      d.setMonth(d.getMonth() - 1);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    if (viewMode === "day") {
      setCurrentDate(addDays(currentDate, 1));
      setSelectedDate(addDays(selectedDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(addDays(currentDate, 7));
      setSelectedDate(addDays(selectedDate, 7));
    } else {
      const d = new Date(currentDate);
      d.setMonth(d.getMonth() + 1);
      setCurrentDate(d);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  const monthGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startDay = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Date[] = [];
    for (let i = 0; i < startDay; i++) {
      cells.push(addDays(firstOfMonth, i - startDay));
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(year, month, d));
    }
    while (cells.length % 7 !== 0) {
      cells.push(addDays(cells[cells.length - 1], 1));
    }
    return cells;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const start = getWeekStart(selectedDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const selectedKey = formatDateKey(selectedDate);
  const programariSelected = programariByDate[selectedKey] || [];

  return (
    <main className="min-h-screen max-h-screen bg-amber-50 p-6 flex flex-col items-center overflow-y-auto">
      <h1 className="text-4xl font-bold text-amber-900 mb-6">
        Calendar Programări
      </h1>

      <Link
        href="/programari"
        className="mb-6 px-6 py-3 bg-amber-600 text-white rounded-xl text-lg font-semibold hover:bg-amber-700 transition"
      >
        ← Înapoi la programări
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 w-full max-w-5xl">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="px-3 py-1 rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200"
          >
            ◀
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1 rounded-lg bg-amber-600 text-white hover:bg-amber-700 text-sm"
          >
            Azi
          </button>
          <button
            onClick={handleNext}
            className="px-3 py-1 rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200"
          >
            ▶
          </button>
          <span className="ml-2 text-lg font-semibold text-amber-900">
            {currentMonthLabel}
          </span>
        </div>

        <div className="flex gap-2">
          {[
            { label: "Zi", value: "day" as ViewMode },
            { label: "Săptămână", value: "week" as ViewMode },
            { label: "Lună", value: "month" as ViewMode },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setViewMode(opt.value)}
              className={`px-3 py-1 rounded-lg text-sm font-semibold border ${
                viewMode === opt.value
                  ? "bg-amber-600 text-white border-amber-700"
                  : "bg-white text-amber-800 border-amber-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "month" && (
        <div className="grid grid-cols-7 gap-1 text-sm w-full max-w-5xl">
          {dayNamesShort.map((d) => (
            <div
              key={d}
              className="text-center font-semibold text-amber-800 py-1"
            >
              {d}
            </div>
          ))}

          {monthGrid.map((day, idx) => {
            const key = formatDateKey(day);
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = sameDay(day, new Date());
            const isSelected = sameDay(day, selectedDate);
            const list = programariByDate[key] || [];

            return (
              <button
                key={idx}
                onClick={() => {
                  setSelectedDate(day);
                  setViewMode("day");
                }}
                className={`min-h-[80px] rounded-lg border text-left px-2 py-1 flex flex-col ${
                  isSelected
                    ? "border-amber-700 bg-amber-100"
                    : "border-amber-200 bg-white"
                } ${!isCurrentMonth ? "opacity-50" : ""} hover:bg-amber-50`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm ${
                      isToday ? "text-amber-700 font-bold" : "text-amber-900"
                    }`}
                  >
                    {day.getDate()}
                  </span>

                  {list.length > 0 && (
                    <span className="text-[10px] bg-amber-600 text-white px-1 rounded-full">
                      {list.length}
                    </span>
                  )}
                </div>

                <div className="mt-1 space-y-0.5">
                  {list.slice(0, 2).map((p) => (
                    <div
                      key={p.id}
                      className="text-[10px] bg-amber-50 border border-amber-200 rounded px-1 truncate text-amber-900"
                    >
                      {p.ora} • {p.nume}
                    </div>
                  ))}
                  {list.length > 2 && (
                    <div className="text-[10px] text-amber-700">
                      +{list.length - 2} altele
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {viewMode === "week" && (
        <div className="overflow-x-auto w-full max-w-5xl max-h-[70vh] overflow-y-auto mt-4">
          <div className="grid grid-cols-8 text-xs border-t border-l border-amber-200 min-w-[800px]">
            <div className="bg-amber-50 border-b border-r border-amber-200 p-1 text-amber-800 font-semibold sticky left-0 z-10">
              Oră
            </div>

            {weekDays.map((d, i) => {
              const isToday = sameDay(d, new Date());
              return (
                <div
                  key={i}
                  className={`border-b border-r border-amber-200 p-1 text-center ${
                    isToday ? "bg-amber-100 font-semibold" : "bg-amber-50"
                  } text-amber-800`}
                >
                  {dayNamesShort[i]} {d.getDate()}
                </div>
              );
            })}

            {hours.map((h) => (
              <div key={`row-${h}`} className="contents">
                <div className="border-b border-r border-amber-200 p-1 text-amber-800 bg-white text-xs sticky left-0 z-10">
                  {String(h).padStart(2, "0")}:00
                </div>

                {weekDays.map((d, i) => {
                  const key = formatDateKey(d);
                  const list = (programariByDate[key] || []).filter((p) => {
                    const [hh] = p.ora.split(":").map(Number);
                    return hh === h;
                  });

                  return (
                    <div
                      key={`${key}-${h}-${i}`}
                      className="border-b border-r border-amber-200 p-1 bg-white align-top"
                    >
                      {list.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedDate(d);
                            setViewMode("day");
                          }}
                          className="mb-1 text-[10px] bg-amber-50 border border-amber-300 rounded px-1 text-amber-900 truncate w-full text-left hover:bg-amber-100"
                        >
                          {p.ora} • {p.nume}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === "day" && (
        <div className="w-full max-w-5xl max-h-[70vh] overflow-y-auto mt-4">
          <div className="mb-3 text-amber-900 font-semibold">
            {dayNamesLong[(selectedDate.getDay() + 6) % 7]} •{" "}
            {selectedDate.getDate()} {monthNames[selectedDate.getMonth()]}{" "}
            {selectedDate.getFullYear()}
          </div>

          <div className="grid grid-cols-[60px,1fr] text-xs border-t border-l border-amber-200">
            {hours.map((h) => {
              const hourLabel = `${String(h).padStart(2, "0")}:00`;
              const list = (programariByDate[selectedKey] || []).filter((p) => {
                const [hh] = p.ora.split(":").map(Number);
                return hh === h;
              });

              return (
                <div key={`row-${h}`} className="contents">
                  <div className="border-b border-r border-amber-200 p-1 text-amber-800 bg-amber-50">
                    {hourLabel}
                  </div>

                  <div className="border-b border-r border-amber-200 p-1 bg-white">
                    {list.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          window.location.href = `/programari?id=${p.id}`;
                        }}
                        className="mb-1 text-[11px] bg-amber-50 border border-amber-300 rounded px-1 text-amber-900 w-full text-left hover:bg-amber-100"
                      >
                        {p.ora} • {p.nume}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 mb-6">
            <h3 className="text-amber-900 font-semibold mb-2 text-sm">
              Programări în această zi
            </h3>

            {programariSelected.length === 0 && (
              <p className="text-sm text-amber-700">
                Nu există programări în această zi.
              </p>
            )}

            <ul className="space-y-1">
              {programariSelected.map((p) => (
                <li
                  key={p.id}
                  className="text-sm bg-amber-50 border border-amber-200 rounded px-2 py-1 text-amber-900"
                >
                  {p.ora} • {p.nume}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}
