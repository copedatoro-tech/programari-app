"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";

interface MiniProg {
  id: any;
  date: string;
  time: string;
  title: string;
  angajat_id?: string;
  nume_serviciu?: string;
  is_client_booking?: boolean;
  total_price?: number;
  amount_paid?: number;
  payment_status?: string;
}
interface StaffRow { id: string; name: string }

interface ProgramariCalendarPanelProps {
  programari: MiniProg[];
  angajati: StaffRow[];
  onSelectDate?: (dateStr: string) => void;
}

function fmtKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function ProgramariCalendarPanel({ programari, angajati, onSelectDate }: ProgramariCalendarPanelProps) {
  const t = useTranslations("programariPage");
  const tCal = useTranslations("calendarPage");
  const localeCode = tCal("localeCode");
  const LUNI = tCal.raw("months") as string[];
  const ZILE_SCURT = tCal.raw("dayShort") as string[];

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const todayKey = fmtKey(new Date());
  const [selectedDay, setSelectedDay] = useState(todayKey);

  const countByDate = useMemo(() => {
    const m: Record<string, number> = {};
    programari.forEach((p) => { if (p.date) m[p.date] = (m[p.date] || 0) + 1; });
    return m;
  }, [programari]);

  const dayAppts = useMemo(() => {
    return programari
      .filter((p) => p.date === selectedDay)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [programari, selectedDay]);

  // ✅ Sumar online vs. recepție pentru ziua selectată
  const daySummary = useMemo(() => {
    const online = dayAppts.filter((p) => p.is_client_booking).length;
    const receptie = dayAppts.length - online;
    return { total: dayAppts.length, online, receptie };
  }, [dayAppts]);

  const handleDayClick = (dateStr: string) => {
    setSelectedDay(dateStr);
    onSelectDate?.(dateStr);
  };

  const renderGrid = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const startDow = new Date(year, month, 1).getDay();
    const offset = startDow === 0 ? 6 : startDow - 1;
    const cells = [];
    for (let i = 0; i < offset; i++) cells.push(<div key={`e${i}`} />);
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isToday = dateStr === todayKey;
      const isSelected = dateStr === selectedDay;
      const count = countByDate[dateStr] || 0;
      cells.push(
        <button key={d} onClick={() => handleDayClick(dateStr)}
          className={`h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all border-2 ${
            isSelected ? "bg-slate-900 border-slate-900 text-white"
              : isToday ? "bg-amber-50 border-amber-400 text-slate-900"
              : "bg-white border-transparent hover:border-slate-200 text-slate-700"
          }`}>
          <span className="text-[12px] font-black">{d}</span>
          {count > 0 && (
            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-amber-400" : "bg-amber-500"}`} />
          )}
        </button>
      );
    }
    return cells;
  };

  const selectedDayLabel = useMemo(() => {
    const [y, m, d] = selectedDay.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const isToday = selectedDay === todayKey;
    return isToday ? t("calendarPanel.todayLabel") : date.toLocaleDateString(localeCode, { day: "numeric", month: "long" });
  }, [selectedDay, todayKey, t, localeCode]);

  return (
    <div className="bg-white rounded-[40px] p-6 md:p-8 shadow-2xl border border-slate-100 h-fit">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-900">
          {LUNI[currentMonth.getMonth()]} <span className="text-amber-500">{currentMonth.getFullYear()}</span>
        </h3>
        <div className="flex gap-1.5">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-lg hover:bg-amber-500 hover:text-white transition-all text-sm font-black">‹</button>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-lg hover:bg-amber-500 hover:text-white transition-all text-sm font-black">›</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {ZILE_SCURT.map((z) => (
          <div key={z} className="text-center text-[8px] font-black uppercase text-slate-400 tracking-widest py-1">{z}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 mb-6">
        {renderGrid()}
      </div>

      <div className="border-t border-slate-100 pt-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <p className="text-[10px] font-black uppercase italic text-slate-400 tracking-widest">
            {t("calendarPanel.apptsForLabel")} <span className="text-amber-600">{selectedDayLabel}</span>
          </p>

          {daySummary.total > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-black uppercase italic px-2 py-1 rounded-lg bg-slate-100 text-slate-600">
                {daySummary.total} {t("calendarPanel.totalSuffix")}
              </span>
              {daySummary.online > 0 && (
                <span className="text-[8px] font-black uppercase italic px-2 py-1 rounded-lg bg-blue-50 text-blue-600 flex items-center gap-1">
                  🌐 {daySummary.online} {t("calendarPanel.onlineSuffix")}
                </span>
              )}
              {daySummary.receptie > 0 && (
                <span className="text-[8px] font-black uppercase italic px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 flex items-center gap-1">
                  🏠 {daySummary.receptie} {t("calendarPanel.receptionSuffix")}
                </span>
              )}
            </div>
          )}
        </div>

        {dayAppts.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-[25px] border-2 border-dashed border-slate-100">
            <p className="text-[10px] font-black uppercase italic text-slate-300">{t("calendarPanel.noApptsLabel")}</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {dayAppts.map((p) => {
              const spec = angajati.find((a) => a.id === p.angajat_id);
              return (
                <div key={p.id} className={`flex items-center gap-3 bg-slate-50 rounded-2xl p-3 border ${p.is_client_booking ? "border-blue-100" : "border-slate-100"}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-[10px] shrink-0 ${p.is_client_booking ? "bg-blue-500" : "bg-amber-500"}`}>
                    {p.time}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[11px] font-black uppercase italic text-slate-800 truncate">{p.title}</p>
                      {p.is_client_booking ? (
                        <span className="text-[7px] font-black uppercase text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded shrink-0">{t("calendarPanel.onlineBadge")}</span>
                      ) : (
                        <span className="text-[7px] font-black uppercase text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">{t("calendarPanel.receptionBadge")}</span>
                      )}
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase italic truncate">
                      {spec?.name || t("generalFallback")}{p.nume_serviciu ? ` · ${p.nume_serviciu}` : ""}
                    </p>
                    {p.payment_status === "deposit_paid" && (
                      <p className="text-[8px] font-black uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded inline-block mt-1">
                        💳 {t("calendarPanel.depositPaid", { paid: (p.amount_paid || 0).toFixed(0), rest: ((p.total_price || 0) - (p.amount_paid || 0)).toFixed(0) })}
                      </p>
                    )}
                    {p.payment_status === "fully_paid" && (
                      <p className="text-[8px] font-black uppercase text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded inline-block mt-1">
                        ✅ {t("calendarPanel.fullyPaid")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}