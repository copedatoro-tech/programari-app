"use client";

import React, { useState, useEffect, useMemo, Suspense, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { showToast, showConfirm } from "@/lib/toast";
import { ChronosTimePicker, ChronosDatePicker } from "@/components/ChronosDateTimePickers";

// ─── Constants ────────────────────────────────────────────────────────────────
const SLOT_H = 56;
const TIME_COL_W = 68;
const DAY_COL_W = 148;

// ─── Utils ────────────────────────────────────────────────────────────────────
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function getWeekStart(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function formatDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function addMinutesToTime(t: string, mins: number) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const tot = h * 60 + m + mins;
  return `${String(Math.floor(tot/60)%24).padStart(2,"0")}:${String(tot%60).padStart(2,"0")}`;
}
function timeToMin(t: string) {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}
function parseWH(d: any): WorkingHour[] {
  if (!d) return [];
  if (typeof d === "string") { try { return JSON.parse(d); } catch { return []; } }
  return Array.isArray(d) ? d : [];
}
function isWorkingSlot(slot: string, start: string, end: string) {
  const s = timeToMin(slot), ws = timeToMin(start), we = timeToMin(end === "00:00" ? "24:00" : end);
  return s >= ws && s < we;
}

const ALL_SLOTS: string[] = [];
for (let m = 0; m < 24*60; m += 15)
  ALL_SLOTS.push(`${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`);

const TXT = {
  dayShort: ["Lun","Mar","Mie","Joi","Vin","Sâm","Dum"],
  dayLong:  ["Duminică","Luni","Marți","Miercuri","Joi","Vineri","Sâmbătă"],
  months:   ["Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie","Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"],
  monthsShort: ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Noi","Dec"],
};

// ─── Types ────────────────────────────────────────────────────────────────────
type DocAtt = { id: number|string; name: string; url: string };
type Prog = {
  id: any; nume: string; email?: string; data: string; ora: string;
  telefon?: string; motiv?: string; poza?: string; documente: DocAtt[];
  expertId?: string; serviciuId?: string; duration?: number; isOnline?: boolean;
};
type ViewMode = "day"|"week"|"month"|"year";
type ManualBlocks = Record<string, string[]>;
interface StaffRow   { id: string; name: string; services: string[] }
interface ServiceRow { id: string; nume_serviciu: string; price: number; duration: number }
interface WorkingHour{ day: string; start: string; end: string; closed: boolean }

// ─── Colors ───────────────────────────────────────────────────────────────────
const SC = [
  { avatar:"bg-blue-500",   border:"#3b82f6", workBg:"#eff6ff", chipBg:"#dbeafe", chipText:"#1d4ed8", chipBorder:"#93c5fd" },
  { avatar:"bg-emerald-500",border:"#10b981", workBg:"#f0fdf4", chipBg:"#d1fae5", chipText:"#065f46", chipBorder:"#6ee7b7" },
  { avatar:"bg-violet-500", border:"#8b5cf6", workBg:"#f5f3ff", chipBg:"#ede9fe", chipText:"#5b21b6", chipBorder:"#c4b5fd" },
  { avatar:"bg-amber-500",  border:"#f59e0b", workBg:"#fffbeb", chipBg:"#fef3c7", chipText:"#92400e", chipBorder:"#fcd34d" },
  { avatar:"bg-rose-500",   border:"#f43f5e", workBg:"#fff1f2", chipBg:"#ffe4e6", chipText:"#9f1239", chipBorder:"#fda4af" },
  { avatar:"bg-cyan-500",   border:"#06b6d4", workBg:"#ecfeff", chipBg:"#cffafe", chipText:"#155e75", chipBorder:"#67e8f9" },
  { avatar:"bg-indigo-500", border:"#6366f1", workBg:"#eef2ff", chipBg:"#e0e7ff", chipText:"#3730a3", chipBorder:"#a5b4fc" },
  { avatar:"bg-teal-500",   border:"#14b8a6", workBg:"#f0fdfa", chipBg:"#ccfbf1", chipText:"#0f766e", chipBorder:"#5eead4" },
];
const SVC_C = [
  { bg:"#ecfeff", text:"#155e75", border:"#a5f3fc" },
  { bg:"#fffbeb", text:"#92400e", border:"#fde68a" },
  { bg:"#fdf2f8", text:"#9d174d", border:"#f9a8d4" },
  { bg:"#f0fdf4", text:"#14532d", border:"#86efac" },
  { bg:"#f5f3ff", text:"#5b21b6", border:"#c4b5fd" },
  { bg:"#fff7ed", text:"#7c2d12", border:"#fdba74" },
  { bg:"#fef2f2", text:"#7f1d1d", border:"#fca5a5" },
  { bg:"#f0f9ff", text:"#0c4a6e", border:"#7dd3fc" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normDocs(raw: any): DocAtt[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((it: any, i: number) => typeof it === "string"
    ? { id: i, name: `Document ${i+1}`, url: it }
    : { id: it.id??i, name: it.name??`Document ${i+1}`, url: it.url??it });
}
function mapRow(it: any): Prog {
  const raw: string = it.date ?? "";
  return {
    id: it.id, nume: it.title||it.prenume||it.nume||"Client",
    email: it.email??"", data: raw.includes("T") ? raw.split("T")[0] : raw,
    ora: it.time??"", telefon: it.phone??"", motiv: it.details??"",
    poza: it.poza??it.file_url??null, documente: normDocs(it.documente),
    expertId: it.angajat_id??"", serviciuId: it.serviciu_id??"",
    duration: it.duration??0, isOnline: it.is_client_booking??false,
  };
}

// ─── TimeColumn ───────────────────────────────────────────────────────────────
function TimeColumn({ slots, whStart, whEnd, isClosed }: { slots: string[]; whStart: string; whEnd: string; isClosed: boolean }) {
  return (
    <div style={{ width: TIME_COL_W, flexShrink: 0, borderRight: "2px solid #e2e8f0", background: "#fff" }}>
      {slots.map(slot => {
        const isHour = slot.endsWith(":00");
        const isHalf = slot.endsWith(":30");
        const isWork = !isClosed && whStart && whEnd && isWorkingSlot(slot, whStart, whEnd);
        return (
          <div key={slot} style={{
            height: SLOT_H, display:"flex", alignItems:"flex-start", justifyContent:"flex-end",
            paddingRight: 10, paddingTop: 4, userSelect:"none",
            borderTop: isHour ? "1.5px solid #94a3b8" : isHalf ? "1px solid #cbd5e1" : "1px solid #e2e8f0",
            background: isWork ? "#fff" : "#f8fafc",
          }}>
            {isHour && (
              <span style={{ fontSize: 12, fontWeight: 700, color: isWork ? "#334155" : "#94a3b8", fontVariantNumeric:"tabular-nums", letterSpacing:"0.01em" }}>
                {slot}
              </span>
            )}
            {isHalf && (
              <span style={{ fontSize: 10, fontWeight: 600, color: isWork ? "#94a3b8" : "#cbd5e1" }}>
                {slot}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── WeekStrip ────────────────────────────────────────────────────────────────
function WeekStrip({ selectedDate, onSelectDate, programariByDate, adminWorkingHours }: {
  selectedDate: Date; onSelectDate: (d: Date) => void;
  programariByDate: Record<string, Prog[]>; adminWorkingHours: WorkingHour[];
}) {
  const today = new Date();
  const weekStart = getWeekStart(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const whByDay = useMemo(() => {
    const m: Record<string, WorkingHour> = {};
    adminWorkingHours.forEach(h => { m[h.day] = h; });
    return m;
  }, [adminWorkingHours]);

  const monthLabel = useMemo(() => {
    const fm = weekDays[0].getMonth(), lm = weekDays[6].getMonth(), yr = weekDays[0].getFullYear();
    return fm === lm ? `${TXT.months[fm]} ${yr}` : `${TXT.monthsShort[fm]} – ${TXT.monthsShort[lm]} ${yr}`;
  }, [weekDays]);

  return (
    <div style={{ flexShrink: 0, background: "#fff", borderBottom: "2px solid #e2e8f0" }}>
      <div style={{ display:"flex", alignItems:"stretch", minHeight: 64 }}>
        {/* Luna + nav saptamana */}
        <div style={{ display:"flex", alignItems:"center", gap: 6, padding:"0 12px", borderRight:"2px solid #e2e8f0", flexShrink: 0, minWidth: 190 }}>
          <button onClick={() => onSelectDate(addDays(weekStart, -7))}
            style={{ width:28, height:28, border:"1.5px solid #e2e8f0", borderRadius:8, background:"#f8fafc", fontSize:16, fontWeight:700, color:"#334155", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
          <div style={{ flex:1, textAlign:"center" }}>
            <p style={{ fontSize:12, fontWeight:700, color:"#1e293b", lineHeight:1.3 }}>{monthLabel}</p>
            <button onClick={() => onSelectDate(today)}
              style={{ fontSize:10, fontWeight:700, color:"#d97706", background:"none", border:"none", cursor:"pointer", padding:0 }}>→ Azi</button>
          </div>
          <button onClick={() => onSelectDate(addDays(weekStart, 7))}
            style={{ width:28, height:28, border:"1.5px solid #e2e8f0", borderRadius:8, background:"#f8fafc", fontSize:16, fontWeight:700, color:"#334155", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
        </div>

        {/* Zilele saptamanii */}
        <div style={{ display:"flex", flex:1 }}>
          {weekDays.map((day, i) => {
            const key = formatDateKey(day);
            const isSel = sameDay(day, selectedDate);
            const isToday = sameDay(day, today);
            const appts = programariByDate[key] || [];
            const total = appts.length;
            const online = appts.filter(p => p.isOnline).length;
            const dow = (day.getDay() + 6) % 7;
            const isWE = dow >= 5;
            const wh = whByDay[TXT.dayLong[day.getDay()]];
            const isClosed = !!wh?.closed;

            return (
              <button key={i} onClick={() => onSelectDate(day)}
                style={{
                  flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                  gap: 2, padding:"6px 4px", border:"none", cursor:"pointer", position:"relative",
                  borderLeft: i === 0 ? "none" : "1px solid #f1f5f9",
                  background: isSel ? "#0f172a" : isToday ? "#fffbeb" : isClosed ? "#fff5f5" : isWE ? "#f8fafc" : "#fff",
                  borderBottom: isSel ? "3px solid #f59e0b" : "3px solid transparent",
                  transition:"background 0.15s",
                }}>
                <span style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em",
                  color: isSel ? "#f59e0b" : isToday ? "#d97706" : isClosed ? "#f87171" : isWE ? "#94a3b8" : "#64748b" }}>
                  {TXT.dayShort[dow]}
                </span>
                <span style={{ fontSize:18, fontWeight:700, lineHeight:1.2,
                  color: isSel ? "#fff" : isToday ? "#d97706" : isClosed ? "#f87171" : isWE ? "#94a3b8" : "#1e293b" }}>
                  {day.getDate()}
                </span>
                {total > 0 && (
                  <div style={{ display:"flex", gap:3, alignItems:"center" }}>
                    <span style={{ fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:99,
                      background: isSel ? "#f59e0b" : isToday ? "#f59e0b" : "#e2e8f0",
                      color: isSel || isToday ? "#fff" : "#475569" }}>{total}</span>
                    {online > 0 && (
                      <span style={{ fontSize:9, fontWeight:700, padding:"1px 5px", borderRadius:99, background:"#3b82f6", color:"#fff" }}>
                        {online}🌐
                      </span>
                    )}
                  </div>
                )}
                {isClosed && <span style={{ fontSize:7, fontWeight:700, color:"#f87171" }}>Închis</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── FilterBar ────────────────────────────────────────────────────────────────
function FilterBar({ rawStaff, rawServices, programari, selectedExpert, onSelectExpert, selectedServiciu, onSelectServiciu, selectedDate }: {
  rawStaff: StaffRow[]; rawServices: ServiceRow[]; programari: Prog[];
  selectedExpert: string; onSelectExpert: (id: string) => void;
  selectedServiciu: string; onSelectServiciu: (id: string) => void;
  selectedDate: Date;
}) {
  const dateKey = formatDateKey(selectedDate);

  const cntExp = useMemo(() => {
    const m: Record<string,number> = {};
    programari.forEach(p => { if (p.data === dateKey && p.expertId) m[p.expertId] = (m[p.expertId]||0)+1; });
    return m;
  }, [programari, dateKey]);

  const cntSvc = useMemo(() => {
    const m: Record<string,number> = {};
    programari.forEach(p => {
      if (p.data === dateKey && p.serviciuId && (!selectedExpert || p.expertId === selectedExpert))
        m[p.serviciuId] = (m[p.serviciuId]||0)+1;
    });
    return m;
  }, [programari, dateKey, selectedExpert]);

  const visSvc = useMemo(() => {
    if (!selectedExpert) return rawServices;
    const st = rawStaff.find(s => s.id === selectedExpert);
    if (!st?.services?.length) return rawServices;
    return rawServices.filter(s => st.services.includes(s.id));
  }, [selectedExpert, rawStaff, rawServices]);

  if (!rawStaff.length && !rawServices.length) return null;

  const chipBase: React.CSSProperties = {
    display:"flex", alignItems:"center", gap:5, padding:"4px 12px", borderRadius:999,
    border:"1.5px solid", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap",
    flexShrink:0, transition:"all 0.15s",
  };

  return (
    <div style={{ flexShrink:0, background:"#fff", borderBottom:"2px solid #e2e8f0" }}>
      {rawStaff.length > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 14px", borderBottom:"1px solid #f1f5f9", overflowX:"auto", scrollbarWidth:"none" }}>
          <span style={{ fontSize:9, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em", flexShrink:0, width:68 }}>Specialiști</span>
          <button onClick={() => { onSelectExpert(""); onSelectServiciu(""); }}
            style={{ ...chipBase, background: !selectedExpert ? "#0f172a" : "#f8fafc", borderColor: !selectedExpert ? "#0f172a" : "#e2e8f0", color: !selectedExpert ? "#fff" : "#64748b" }}>
            Toți
          </button>
          {rawStaff.map((st, i) => {
            const c = SC[i % SC.length];
            const isSel = selectedExpert === st.id;
            const cnt = cntExp[st.id] || 0;
            return (
              <button key={st.id} onClick={() => { onSelectExpert(isSel ? "" : st.id); if (!isSel) onSelectServiciu(""); }}
                style={{ ...chipBase, background: isSel ? c.chipBg : "#f8fafc", borderColor: isSel ? c.chipBorder : "#e2e8f0", color: isSel ? c.chipText : "#334155" }}>
                <span style={{ width:16, height:16, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:700, color:"#fff", background: c.border, flexShrink:0 }}>
                  {st.name.slice(0,1).toUpperCase()}
                </span>
                {st.name}
                {cnt > 0 && <span style={{ fontSize:9, fontWeight:700, padding:"1px 5px", borderRadius:99, background:"rgba(0,0,0,0.08)", color: isSel ? c.chipText : "#64748b" }}>{cnt}</span>}
              </button>
            );
          })}
        </div>
      )}
      {rawServices.length > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 14px", overflowX:"auto", scrollbarWidth:"none" }}>
          <span style={{ fontSize:9, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em", flexShrink:0, width:68 }}>Servicii</span>
          <button onClick={() => onSelectServiciu("")}
            style={{ ...chipBase, background: !selectedServiciu ? "#0f172a" : "#f8fafc", borderColor: !selectedServiciu ? "#0f172a" : "#e2e8f0", color: !selectedServiciu ? "#fff" : "#64748b" }}>
            Toate
          </button>
          {visSvc.map((svc, i) => {
            const c = SVC_C[i % SVC_C.length];
            const isSel = selectedServiciu === svc.id;
            const cnt = cntSvc[svc.id] || 0;
            return (
              <button key={svc.id} onClick={() => onSelectServiciu(isSel ? "" : svc.id)}
                style={{ ...chipBase, background: isSel ? c.bg : "#f8fafc", borderColor: isSel ? c.border : "#e2e8f0", color: isSel ? c.text : "#334155" }}>
                {svc.nume_serviciu}
                {svc.duration > 0 && <span style={{ fontSize:9, opacity:0.6 }}>{svc.duration}min</span>}
                {cnt > 0 && <span style={{ fontSize:9, fontWeight:700, padding:"1px 5px", borderRadius:99, background:"rgba(0,0,0,0.09)", color: isSel ? c.text : "#64748b" }}>{cnt}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── SummaryBar ───────────────────────────────────────────────────────────────
function SummaryBar({ programari, rawServices, selectedDate, selectedExpert, selectedServiciu, onSelectServiciu }: {
  programari: Prog[]; rawServices: ServiceRow[];
  selectedDate: Date; selectedExpert: string; selectedServiciu: string;
  onSelectServiciu: (id: string) => void;
}) {
  const dateKey = formatDateKey(selectedDate);
  const items = useMemo(() => {
    const m: Record<string,{total:number;online:number}> = {};
    programari.forEach(p => {
      if (p.data !== dateKey) return;
      if (selectedExpert && p.expertId !== selectedExpert) return;
      if (p.serviciuId) {
        if (!m[p.serviciuId]) m[p.serviciuId] = { total:0, online:0 };
        m[p.serviciuId].total++;
        if (p.isOnline) m[p.serviciuId].online++;
      }
    });
    return rawServices.filter(s => m[s.id]).map((s, i) => ({ ...s, ...m[s.id], ci: i }));
  }, [programari, dateKey, selectedExpert, rawServices]);

  const totals = useMemo(() => {
    let total = 0, online = 0;
    programari.forEach(p => {
      if (p.data !== dateKey) return;
      if (selectedExpert && p.expertId !== selectedExpert) return;
      if (selectedServiciu && p.serviciuId !== selectedServiciu) return;
      total++; if (p.isOnline) online++;
    });
    return { total, online };
  }, [programari, dateKey, selectedExpert, selectedServiciu]);

  if (!totals.total && !items.length) return null;

  return (
    <div style={{ flexShrink:0, background:"#f8fafc", borderTop:"1.5px solid #e2e8f0", display:"flex", alignItems:"center", gap:10, padding:"6px 14px", overflowX:"auto", scrollbarWidth:"none" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0, borderRight:"1.5px solid #e2e8f0", paddingRight:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          <span style={{ width:8, height:8, borderRadius:"50%", background:"#334155", flexShrink:0 }} />
          <span style={{ fontSize:11, fontWeight:700, color:"#334155" }}>{totals.total} prog.</span>
        </div>
        {totals.online > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:"#3b82f6", flexShrink:0 }} />
            <span style={{ fontSize:11, fontWeight:700, color:"#2563eb" }}>{totals.online} online</span>
          </div>
        )}
      </div>
      {items.map(it => {
        const c = SVC_C[it.ci % SVC_C.length];
        const isSel = selectedServiciu === it.id;
        return (
          <button key={it.id} onClick={() => onSelectServiciu(isSel ? "" : it.id)}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:999, border:`1.5px solid ${isSel ? it.text : c.border}`, background: c.bg, color: c.text, fontSize:10, fontWeight:700, cursor:"pointer", flexShrink:0, transition:"all 0.15s" }}>
            {it.nume_serviciu} <span style={{ fontWeight:800 }}>×{it.total}</span>
            {it.online > 0 && <span style={{ fontSize:9, opacity:0.7 }}>({it.online}🌐)</span>}
          </button>
        );
      })}
    </div>
  );
}

// ─── DayView ──────────────────────────────────────────────────────────────────
function DayView({ selectedDate, programari, rawStaff, rawServices, serviceById, onEdit, adminWorkingHours, selectedExpert, selectedServiciu, onSelectServiciu, onAddNew }: {
  selectedDate: Date; programari: Prog[]; rawStaff: StaffRow[];
  rawServices: ServiceRow[]; serviceById: Record<string,ServiceRow>;
  onEdit: (p: Prog) => void; onAddNew: (time: string, date: string) => void;
  adminWorkingHours: WorkingHour[]; selectedExpert: string; selectedServiciu: string;
  onSelectServiciu: (id: string) => void;
}) {
  const dateKey = formatDateKey(selectedDate);
  const dayName = TXT.dayLong[selectedDate.getDay()];
  const ds = adminWorkingHours.find(h => h.day === dayName);
  const isClosed = !!ds?.closed;
  const whStart = ds?.start || "";
  const whEnd   = ds?.end   || "";
  const scrollRef = useRef<HTMLDivElement>(null);

  const slots = useMemo(() => {
    if (isClosed || !whStart || !whEnd) return ALL_SLOTS;
    const s = Math.max(0, timeToMin(whStart) - 60);
    const e = Math.min(24*60, timeToMin(whEnd === "00:00" ? "24:00" : whEnd) + 60);
    return ALL_SLOTS.filter(sl => { const m = timeToMin(sl); return m >= s && m < e; });
  }, [isClosed, whStart, whEnd]);

  const firstMin = useMemo(() => slots.length ? timeToMin(slots[0]) : 0, [slots]);
  const gridH = slots.length * SLOT_H;

  useEffect(() => {
    const target = whStart || `${new Date().getHours().toString().padStart(2,"0")}:00`;
    const off = Math.max(0, ((timeToMin(target) - firstMin) / 15) * SLOT_H - 80);
    setTimeout(() => { scrollRef.current?.scrollTo({ top: off, behavior:"smooth" }); }, 120);
  }, [dateKey]);

  const nowTop = useMemo(() => {
    const now = new Date();
    if (!sameDay(now, selectedDate)) return null;
    return ((now.getHours()*60 + now.getMinutes() - firstMin) / 15) * SLOT_H;
  }, [selectedDate, firstMin]);

  const staffMap = useMemo(() => {
    const m: Record<string,number> = {};
    rawStaff.forEach((s,i) => { m[s.id] = i % SC.length; });
    return m;
  }, [rawStaff]);

  const dayAppts = useMemo(() => programari.filter(p => {
    if (p.data !== dateKey) return false;
    if (selectedExpert && p.expertId !== selectedExpert) return false;
    if (selectedServiciu && p.serviciuId !== selectedServiciu) return false;
    return true;
  }), [programari, dateKey, selectedExpert, selectedServiciu]);

  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1, overflow:"hidden" }}>
      {isClosed && (
        <div style={{ flexShrink:0, background:"#fff5f5", borderBottom:"1px solid #fca5a5", padding:"6px 16px" }}>
          <span style={{ fontSize:11, fontWeight:700, color:"#dc2626" }}>🚫 Zi închisă — poți adăuga programări manual</span>
        </div>
      )}

      <div ref={scrollRef} style={{ flex:1, overflowY:"auto", overflowX:"hidden" }}>
        <div style={{ display:"flex", height: gridH, position:"relative" }}>
          {/* Coloana ore — sticky left */}
          <div style={{ position:"sticky", left:0, zIndex:20 }}>
            <TimeColumn slots={slots} whStart={whStart} whEnd={whEnd} isClosed={isClosed} />
          </div>

          {/* Zona grid */}
          <div style={{ flex:1, position:"relative" }}>
            {/* Fundaluri sloturi */}
            {slots.map((slot, i) => {
              const isHour = slot.endsWith(":00");
              const isHalf = slot.endsWith(":30");
              const isWork = !isClosed && whStart && whEnd && isWorkingSlot(slot, whStart, whEnd);
              return (
                <div key={slot} style={{
                  position:"absolute", left:0, right:0, top: i*SLOT_H, height: SLOT_H,
                  background: isClosed ? "rgba(239,68,68,0.04)" : isWork ? "#fff" : "#f8fafc",
                  borderTop: isHour ? "1.5px solid #94a3b8" : isHalf ? "1px solid #cbd5e1" : "1px solid #e2e8f0",
                }} />
              );
            })}

            {/* Linii orar de lucru */}
            {!isClosed && whStart && whEnd && (() => {
              const s = ((timeToMin(whStart) - firstMin) / 15) * SLOT_H;
              const e = ((timeToMin(whEnd === "00:00" ? "24:00" : whEnd) - firstMin) / 15) * SLOT_H;
              return (
                <>
                  <div style={{ position:"absolute", left:0, right:0, top: s, height:2, background:"#64748b", zIndex:10, pointerEvents:"none" }} />
                  <div style={{ position:"absolute", left:0, right:0, top: e, height:2, background:"#64748b", zIndex:10, pointerEvents:"none" }} />
                </>
              );
            })()}

            {/* Linia "acum" */}
            {nowTop !== null && nowTop >= 0 && (
              <div style={{ position:"absolute", left:0, right:0, top: nowTop, zIndex:25, pointerEvents:"none" }}>
                <div style={{ height:2.5, background:"#f59e0b", position:"relative" }}>
                  <div style={{ width:11, height:11, borderRadius:"50%", background:"#f59e0b", position:"absolute", left:-5, top:-4 }} />
                </div>
              </div>
            )}

            {/* Sloturi goale — click pentru programare noua */}
            {slots.map((slot, i) => {
              const slotMin = timeToMin(slot);
              const isOcc = dayAppts.some(p => {
                const pm = timeToMin(p.ora);
                const dur = serviceById[p.serviciuId||""]?.duration || 15;
                return pm <= slotMin && slotMin < pm + dur;
              });
              if (isOcc) return null;
              return (
                <button key={`e-${slot}`} onClick={() => onAddNew(slot, dateKey)}
                  style={{ position:"absolute", left:0, right:0, top: i*SLOT_H, height: SLOT_H, zIndex:5, background:"transparent", border:"none", cursor:"pointer" }}
                  className="group hover:bg-amber-50 transition-all">
                  <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:10, fontWeight:700, color:"#f59e0b", opacity:0 }}
                    className="group-hover:opacity-100 transition-opacity">+ {slot}</span>
                </button>
              );
            })}

            {/* Programari */}
            {dayAppts.sort((a,b) => a.ora.localeCompare(b.ora)).map(p => {
              const svc = serviceById[p.serviciuId||""];
              const endTime = svc?.duration ? addMinutesToTime(p.ora, svc.duration) : null;
              const topPx = ((timeToMin(p.ora) - firstMin) / 15) * SLOT_H;
              const heightPx = Math.max(((svc?.duration||30) / 15) * SLOT_H - 3, 40);
              const ci = staffMap[p.expertId||""] ?? 0;
              const color = SC[ci];
              return (
                <button key={p.id} onClick={() => onEdit(p)}
                  style={{
                    position:"absolute", top: topPx+2, height: heightPx, left:8, right:8, zIndex:15,
                    background:"#fff", borderRadius:7, borderLeft:`4px solid ${color.border}`,
                    boxShadow:`0 1px 6px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.06)`,
                    padding:"5px 10px", textAlign:"left", cursor:"pointer", border:`1px solid rgba(0,0,0,0.07)`,
                    borderLeftWidth:4, borderLeftColor: color.border,
                  }}
                  className="hover:brightness-95 hover:shadow-md transition-all">
                  <p style={{ fontSize:10, fontWeight:700, color: color.border, lineHeight:1.3, marginBottom:1 }}>
                    {p.ora}{endTime ? ` → ${endTime}` : ""}{p.isOnline ? " 🌐" : ""}
                  </p>
                  <p style={{ fontSize:13, fontWeight:700, color:"#1e293b", lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {p.nume}
                  </p>
                  {svc && heightPx > 56 && (
                    <p style={{ fontSize:11, color:"#64748b", lineHeight:1.2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {svc.nume_serviciu}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <SummaryBar programari={programari} rawServices={rawServices} selectedDate={selectedDate}
        selectedExpert={selectedExpert} selectedServiciu={selectedServiciu} onSelectServiciu={onSelectServiciu} />
    </div>
  );
}

// ─── WeekView ─────────────────────────────────────────────────────────────────
function WeekView({ selectedDate, programariByDate, rawStaff, serviceById, onEdit, selectedExpert, selectedServiciu, adminWorkingHours, onSelectDate }: {
  selectedDate: Date; programariByDate: Record<string,Prog[]>;
  rawStaff: StaffRow[]; serviceById: Record<string,ServiceRow>;
  onEdit: (p: Prog) => void; selectedExpert: string; selectedServiciu: string;
  adminWorkingHours: WorkingHour[]; onSelectDate: (d: Date) => void;
}) {
  const today = new Date();
  const weekDays = useMemo(() => {
    const s = getWeekStart(selectedDate);
    return Array.from({ length:7 }, (_,i) => addDays(s, i));
  }, [selectedDate]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const hdrScrollRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  const sync = useCallback((from:"body"|"header") => {
    if (syncing.current) return;
    syncing.current = true;
    requestAnimationFrame(() => {
      if (from === "body" && hdrScrollRef.current && scrollRef.current)
        hdrScrollRef.current.scrollLeft = scrollRef.current.scrollLeft;
      if (from === "header" && scrollRef.current && hdrScrollRef.current)
        scrollRef.current.scrollLeft = hdrScrollRef.current.scrollLeft;
      syncing.current = false;
    });
  }, []);

  const whByDay = useMemo(() => {
    const m: Record<string,WorkingHour> = {};
    adminWorkingHours.forEach(h => { m[h.day] = h; });
    return m;
  }, [adminWorkingHours]);

  const slots = useMemo(() => {
    let minS = 24*60, maxE = 0, hasAny = false;
    weekDays.forEach(d => {
      const wh = whByDay[TXT.dayLong[d.getDay()]];
      if (wh && !wh.closed && wh.start && wh.end) {
        hasAny = true;
        minS = Math.min(minS, timeToMin(wh.start));
        maxE = Math.max(maxE, timeToMin(wh.end === "00:00" ? "24:00" : wh.end));
      }
    });
    if (!hasAny) return ALL_SLOTS;
    return ALL_SLOTS.filter(sl => { const m = timeToMin(sl); return m >= Math.max(0,minS-60) && m < Math.min(24*60,maxE+60); });
  }, [weekDays, whByDay]);

  const firstMin = useMemo(() => slots.length ? timeToMin(slots[0]) : 0, [slots]);
  const gridH = slots.length * SLOT_H;
  const totalW = 7 * DAY_COL_W + TIME_COL_W;

  useEffect(() => {
    const now = new Date();
    const off = Math.max(0, ((now.getHours()*60 + now.getMinutes() - firstMin) / 15) * SLOT_H - 120);
    setTimeout(() => { scrollRef.current?.scrollTo({ top: off, behavior:"smooth" }); }, 120);
  }, []);

  const staffMap = useMemo(() => {
    const m: Record<string,number> = {};
    rawStaff.forEach((s,i) => { m[s.id] = i % SC.length; });
    return m;
  }, [rawStaff]);

  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1, overflow:"hidden" }}>
      {/* Header zile — scrollabil sincronizat */}
      <div ref={hdrScrollRef} onScroll={() => sync("header")}
        style={{ flexShrink:0, display:"flex", borderBottom:"2px solid #e2e8f0", background:"#fff", overflowX:"auto", scrollbarWidth:"none" }}>
        <div style={{ display:"flex", minWidth: totalW }}>
          <div style={{ width: TIME_COL_W, flexShrink:0, borderRight:"2px solid #e2e8f0" }} />
          {weekDays.map((day, di) => {
            const dn = TXT.dayLong[day.getDay()];
            const wh = whByDay[dn];
            const isClosed = !!wh?.closed;
            const isToday = sameDay(day, today);
            const isSel = sameDay(day, selectedDate);
            const dow = (day.getDay() + 6) % 7;
            const isWE = dow >= 5;
            const appts = (programariByDate[formatDateKey(day)] || []).filter(p =>
              (!selectedExpert || p.expertId === selectedExpert) &&
              (!selectedServiciu || p.serviciuId === selectedServiciu)
            );
            const online = appts.filter(p => p.isOnline).length;

            return (
              <button key={di} onClick={() => onSelectDate(day)}
                style={{
                  width: DAY_COL_W, flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center",
                  justifyContent:"center", padding:"8px 4px", border:"none", cursor:"pointer",
                  borderRight:"1.5px solid #e2e8f0", transition:"background 0.15s",
                  background: isClosed ? "#fff5f5" : isToday ? "#fffbeb" : isWE ? "#f8fafc" : "#fff",
                  borderBottom: isSel ? "3px solid #0f172a" : "3px solid transparent",
                }}>
                <span style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em",
                  color: isClosed ? "#f87171" : isToday ? "#d97706" : isWE ? "#94a3b8" : "#64748b" }}>
                  {TXT.dayShort[dow]}
                </span>
                <span style={{ fontSize:22, fontWeight:700, lineHeight:1.2,
                  color: isClosed ? "#f87171" : isToday ? "#d97706" : isWE ? "#94a3b8" : "#1e293b" }}>
                  {day.getDate()}
                </span>
                {isClosed
                  ? <span style={{ fontSize:8, fontWeight:700, color:"#f87171" }}>Închis</span>
                  : wh?.start ? <span style={{ fontSize:9, color:"#94a3b8", fontWeight:600 }}>{wh.start}–{wh.end}</span> : null}
                {appts.length > 0 && (
                  <div style={{ display:"flex", gap:4, marginTop:2 }}>
                    <span style={{ fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:99,
                      background: isToday ? "#f59e0b" : "#e2e8f0", color: isToday ? "#fff" : "#475569" }}>
                      {appts.length}
                    </span>
                    {online > 0 && (
                      <span style={{ fontSize:9, fontWeight:700, padding:"1px 5px", borderRadius:99, background:"#3b82f6", color:"#fff" }}>
                        {online}🌐
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div ref={scrollRef} onScroll={() => sync("body")} style={{ flex:1, overflowY:"auto", overflowX:"auto" }}>
        <div style={{ display:"flex", minWidth: totalW, height: gridH, position:"relative" }}>
          {/* Ore sticky */}
          <div style={{ position:"sticky", left:0, zIndex:20 }}>
            <TimeColumn slots={slots} whStart="" whEnd="" isClosed={false} />
          </div>

          {/* Coloane zile */}
          {weekDays.map((day, di) => {
            const dn = TXT.dayLong[day.getDay()];
            const wh = whByDay[dn];
            const isClosed = !!wh?.closed;
            const whS = wh?.start || "";
            const whE = wh?.end   || "";
            const isToday = sameDay(day, today);
            const isWE = (day.getDay() + 6) % 7 >= 5;
            const dayAppts = (programariByDate[formatDateKey(day)] || []).filter(p =>
              (!selectedExpert || p.expertId === selectedExpert) &&
              (!selectedServiciu || p.serviciuId === selectedServiciu)
            );
            const nowTop = isToday ? ((new Date().getHours()*60 + new Date().getMinutes() - firstMin) / 15) * SLOT_H : null;

            return (
              <div key={di} style={{ position:"absolute", left: di*DAY_COL_W + TIME_COL_W, width: DAY_COL_W, height: gridH, borderRight:"1.5px solid #e2e8f0" }}>
                {/* Slot backgrounds */}
                {slots.map((slot, i) => {
                  const isHour = slot.endsWith(":00");
                  const isHalf = slot.endsWith(":30");
                  const isWork = !isClosed && isWorkingSlot(slot, whS, whE);
                  return (
                    <div key={slot} style={{
                      position:"absolute", left:0, right:0, top: i*SLOT_H, height: SLOT_H,
                      background: isClosed ? "rgba(239,68,68,0.04)" : isToday ? (isWork ? "rgba(251,191,36,0.08)" : "rgba(251,191,36,0.02)") : isWE ? (isWork ? "#f8fafc" : "#f1f5f9") : (isWork ? "#fff" : "#f8fafc"),
                      borderTop: isHour ? "1.5px solid #94a3b8" : isHalf ? "1px solid #cbd5e1" : "1px solid #e2e8f0",
                    }} />
                  );
                })}

                {/* Linii orar */}
                {!isClosed && whS && whE && (() => {
                  const s = ((timeToMin(whS) - firstMin) / 15) * SLOT_H;
                  const e = ((timeToMin(whE === "00:00" ? "24:00" : whE) - firstMin) / 15) * SLOT_H;
                  return (
                    <>
                      <div style={{ position:"absolute", left:0, right:0, top: s, height:1.5, background:"#94a3b8", zIndex:3, pointerEvents:"none" }} />
                      <div style={{ position:"absolute", left:0, right:0, top: e, height:1.5, background:"#94a3b8", zIndex:3, pointerEvents:"none" }} />
                    </>
                  );
                })()}

                {/* Linie acum */}
                {nowTop !== null && nowTop >= 0 && (
                  <div style={{ position:"absolute", left:0, right:0, top: nowTop, zIndex:20, pointerEvents:"none" }}>
                    <div style={{ height:2.5, background:"#f59e0b", position:"relative" }}>
                      <div style={{ width:9, height:9, borderRadius:"50%", background:"#f59e0b", position:"absolute", left:-4, top:-3 }} />
                    </div>
                  </div>
                )}

                {/* Programari */}
                {dayAppts.sort((a,b) => a.ora.localeCompare(b.ora)).map(p => {
                  const svc = serviceById[p.serviciuId||""];
                  const endTime = svc?.duration ? addMinutesToTime(p.ora, svc.duration) : null;
                  const topPx = ((timeToMin(p.ora) - firstMin) / 15) * SLOT_H;
                  const heightPx = Math.max(((svc?.duration||30) / 15) * SLOT_H - 3, 32);
                  const ci = rawStaff.length === 0 ? 0 : (staffMap[p.expertId||""] ?? 0);
                  const color = SC[ci];
                  return (
                    <button key={p.id} onClick={() => onEdit(p)}
                      style={{
                        position:"absolute", top: topPx+1, height: heightPx, left:3, right:3, zIndex:10,
                        background:"#fff", borderRadius:5, borderLeft:`3px solid ${color.border}`,
                        boxShadow:"0 1px 4px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.05)",
                        padding:"3px 6px", textAlign:"left", cursor:"pointer", border:`1px solid rgba(0,0,0,0.07)`,
                        borderLeftWidth:3, borderLeftColor: color.border,
                      }}
                      className="hover:brightness-95 transition-all">
                      <p style={{ fontSize:9, fontWeight:700, color: color.border, lineHeight:1.3 }}>
                        {p.ora}{endTime ? `→${endTime}` : ""}{p.isOnline ? " 🌐" : ""}
                      </p>
                      <p style={{ fontSize:11, fontWeight:700, color:"#1e293b", lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {p.nume}
                      </p>
                      {svc && heightPx > 52 && (
                        <p style={{ fontSize:9, color:"#64748b", lineHeight:1.2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {svc.nume_serviciu}
                        </p>
                      )}
                    </button>
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

// ─── MonthView ────────────────────────────────────────────────────────────────
function MonthView({ selectedDate, programariByDate, rawStaff, serviceById, onEdit, onDayClick, selectedExpert, selectedServiciu, adminWorkingHours }: {
  selectedDate: Date; programariByDate: Record<string,Prog[]>;
  rawStaff: StaffRow[]; serviceById: Record<string,ServiceRow>;
  onEdit: (p: Prog) => void; onDayClick: (d: Date) => void;
  selectedExpert: string; selectedServiciu: string; adminWorkingHours: WorkingHour[];
}) {
  const today = new Date();
  const whByDay = useMemo(() => {
    const m: Record<string,WorkingHour> = {};
    adminWorkingHours.forEach(h => { m[h.day] = h; });
    return m;
  }, [adminWorkingHours]);

  const grid = useMemo(() => {
    const yr = selectedDate.getFullYear(), mo = selectedDate.getMonth();
    const first = new Date(yr, mo, 1);
    const startDow = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(yr, mo+1, 0).getDate();
    const cells: Date[] = [];
    for (let i = 0; i < startDow; i++) cells.push(addDays(first, i - startDow));
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(yr, mo, d));
    while (cells.length % 7 !== 0) cells.push(addDays(cells[cells.length-1], 1));
    return cells;
  }, [selectedDate]);

  const staffMap = useMemo(() => {
    const m: Record<string,number> = {};
    rawStaff.forEach((s,i) => { m[s.id] = i % SC.length; });
    return m;
  }, [rawStaff]);

  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1, overflow:"auto" }}>
      {/* Header zile saptamana */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:"2px solid #e2e8f0", background:"#fff", position:"sticky", top:0, zIndex:10, flexShrink:0 }}>
        {TXT.dayShort.map((d, i) => (
          <div key={d} style={{ textAlign:"center", padding:"8px 4px", borderRight: i < 6 ? "1px solid #e2e8f0" : "none", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color: i >= 5 ? "#94a3b8" : "#64748b" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid zile */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", minWidth:700, flex:1 }}>
        {grid.map((day, idx) => {
          const key = formatDateKey(day);
          const allAppts = programariByDate[key] || [];
          const appts = allAppts.filter(p =>
            (!selectedExpert || p.expertId === selectedExpert) &&
            (!selectedServiciu || p.serviciuId === selectedServiciu)
          );
          const online = appts.filter(p => p.isOnline).length;
          const isCurMo = day.getMonth() === selectedDate.getMonth();
          const isToday = sameDay(day, today);
          const isSel = sameDay(day, selectedDate);
          const dow = (day.getDay() + 6) % 7;
          const isWE = dow >= 5;
          const wh = whByDay[TXT.dayLong[day.getDay()]];
          const isClosed = !!wh?.closed;

          return (
            <div key={idx} onClick={() => onDayClick(day)}
              style={{
                minHeight:110, padding:"6px 6px 4px", display:"flex", flexDirection:"column",
                cursor:"pointer", borderBottom:"1px solid #e2e8f0", borderRight: dow < 6 ? "1px solid #e2e8f0" : "none",
                background: !isCurMo ? "#f8fafc" : isClosed ? "rgba(239,68,68,0.03)" : isToday ? "rgba(251,191,36,0.06)" : isWE ? "#f8fafc" : "#fff",
                opacity: !isCurMo ? 0.38 : 1, transition:"background 0.15s",
              }}>
              {/* Header celula */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{
                  fontSize:12, fontWeight:700, width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:6, flexShrink:0,
                  background: isToday ? "#f59e0b" : isSel ? "#1e293b" : "transparent",
                  color: isToday || isSel ? "#fff" : isClosed ? "#f87171" : isWE ? "#94a3b8" : "#334155",
                }}>
                  {day.getDate()}
                </span>
                <div style={{ display:"flex", gap:3 }}>
                  {appts.length > 0 && (
                    <span style={{ fontSize:9, fontWeight:700, padding:"1px 5px", borderRadius:99, background:"#e2e8f0", color:"#475569" }}>
                      {appts.length}
                    </span>
                  )}
                  {online > 0 && (
                    <span style={{ fontSize:9, fontWeight:700, padding:"1px 5px", borderRadius:99, background:"#3b82f6", color:"#fff" }}>
                      {online}🌐
                    </span>
                  )}
                  {isClosed && isCurMo && (
                    <span style={{ fontSize:7, fontWeight:700, color:"#f87171" }}>Închis</span>
                  )}
                </div>
              </div>

              {/* Programari */}
              <div style={{ display:"flex", flexDirection:"column", gap:2, flex:1, overflow:"hidden" }}>
                {appts.slice(0,3).map(p => {
                  const ci = staffMap[p.expertId||""] ?? 0;
                  const color = SC[ci];
                  return (
                    <button key={p.id} onClick={e => { e.stopPropagation(); onEdit(p); }}
                      style={{
                        display:"flex", alignItems:"center", gap:4, padding:"2px 6px", borderRadius:4,
                        background: color.chipBg, borderLeft:`3px solid ${color.border}`,
                        textAlign:"left", cursor:"pointer", border:`1px solid ${color.chipBorder}`, borderLeftWidth:3,
                      }}
                      className="hover:brightness-95 transition-all">
                      <span style={{ fontSize:9, fontWeight:700, color:"#64748b", flexShrink:0 }}>{p.ora}</span>
                      <span style={{ fontSize:10, fontWeight:700, color: color.chipText, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>
                        {p.nume}
                      </span>
                      {p.isOnline && <span style={{ fontSize:8, flexShrink:0 }}>🌐</span>}
                    </button>
                  );
                })}
                {appts.length > 3 && (
                  <p style={{ fontSize:9, fontWeight:700, color:"#f59e0b", paddingLeft:4 }}>+{appts.length-3} mai multe</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── YearView ─────────────────────────────────────────────────────────────────
function YearView({ selectedDate, programariByDate, onMonthClick }: {
  selectedDate: Date; programariByDate: Record<string,Prog[]>;
  onMonthClick: (yr: number, mo: number) => void;
}) {
  const today = new Date();
  const yr = selectedDate.getFullYear();

  return (
    <div style={{ flex:1, overflowY:"auto", padding:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:12 }}>
        {Array.from({ length:12 }, (_, mo) => {
          const first = new Date(yr, mo, 1);
          const daysInMonth = new Date(yr, mo+1, 0).getDate();
          const startDow = (first.getDay() + 6) % 7;
          let total = 0, online = 0;
          for (let d = 1; d <= daysInMonth; d++) {
            const key = `${yr}-${String(mo+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            const a = programariByDate[key] || [];
            total += a.length;
            online += a.filter(p => p.isOnline).length;
          }
          const isCurMo = today.getFullYear() === yr && today.getMonth() === mo;
          const isSel = selectedDate.getFullYear() === yr && selectedDate.getMonth() === mo;

          return (
            <div key={mo} onClick={() => onMonthClick(yr, mo)}
              style={{
                background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:12, padding:"10px 12px",
                cursor:"pointer", transition:"all 0.15s",
                borderTop: isCurMo ? "3px solid #f59e0b" : isSel ? "3px solid #1e293b" : "1.5px solid #e2e8f0",
              }}
              className="hover:border-amber-400 hover:shadow-sm">
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:700, color: isCurMo ? "#d97706" : "#334155" }}>
                  {TXT.months[mo]}
                </span>
                {total > 0 && (
                  <div style={{ display:"flex", gap:4 }}>
                    <span style={{ fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:99, background:"#e2e8f0", color:"#475569" }}>{total}</span>
                    {online > 0 && (
                      <span style={{ fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:99, background:"#3b82f6", color:"#fff" }}>{online}🌐</span>
                    )}
                  </div>
                )}
              </div>
              {/* Mini grid */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1 }}>
                {["L","M","M","J","V","S","D"].map((d,i) => (
                  <div key={i} style={{ fontSize:7, fontWeight:700, textAlign:"center", color:"#94a3b8", paddingBottom:2 }}>{d}</div>
                ))}
                {Array.from({ length: startDow }).map((_,i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, d) => {
                  const dn = d+1;
                  const key = `${yr}-${String(mo+1).padStart(2,"0")}-${String(dn).padStart(2,"0")}`;
                  const hasA = (programariByDate[key]||[]).length > 0;
                  const isT = today.getFullYear()===yr && today.getMonth()===mo && today.getDate()===dn;
                  return (
                    <div key={dn} style={{
                      fontSize:8, fontWeight: hasA ? 700 : 400, textAlign:"center", borderRadius:3, lineHeight:"16px",
                      background: isT ? "#f59e0b" : hasA ? "#dbeafe" : "transparent",
                      color: isT ? "#fff" : hasA ? "#1d4ed8" : "#94a3b8",
                    }}>{dn}</div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── CalendarContent ──────────────────────────────────────────────────────────
function CalendarContent() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const modalRef = useRef<HTMLDivElement>(null);
  const qClient = useQueryClient();
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExpert, setSelectedExpert] = useState("");
  const [selectedServiciu, setSelectedServiciu] = useState("");
  const [editForm, setEditForm] = useState<Prog|null>(null);
  const [newForm, setNewForm] = useState<{date:string;time:string;nume:string;telefon:string;email:string;serviciuId:string;expertId:string;motiv:string}|null>(null);
  const [customMsg, setCustomMsg] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [searchResults, setSearchResults] = useState<Prog[]>([]);
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => { const { data: { session } } = await supabase.auth.getSession(); return session; },
    staleTime: 1000*60*5,
  });
  const userId = session?.user?.id;

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["profile", userId], enabled: !!userId, staleTime: 1000*60*10,
    queryFn: async () => { const { data } = await supabase.from("profiles").select("plan_type,trial_started_at,manual_blocks,working_hours").eq("id", userId!).single(); return data; },
  });

  const { data: rawStaff = [] } = useQuery<StaffRow[]>({
    queryKey: ["staff", userId], enabled: !!userId, staleTime: 1000*60*10,
    queryFn: async () => { const { data } = await supabase.from("staff").select("id,name,services").eq("user_id", userId!); return data??[]; },
  });

  const { data: rawServices = [] } = useQuery<ServiceRow[]>({
    queryKey: ["services", userId], enabled: !!userId, staleTime: 1000*60*10,
    queryFn: async () => { const { data } = await supabase.from("services").select("id,nume_serviciu,price,duration").eq("user_id", userId!); return data??[]; },
  });

  const dateRange = useMemo(() => {
    const yr = selectedDate.getFullYear(), mo = selectedDate.getMonth();
    return { start: new Date(yr,mo-2,1).toISOString().split("T")[0], end: new Date(yr,mo+3,0).toISOString().split("T")[0] };
  }, [selectedDate.getFullYear(), selectedDate.getMonth()]);

  const { data: programari = [], isLoading, refetch: refetchAppts } = useQuery<Prog[]>({
    queryKey: ["appointments", userId, dateRange.start, dateRange.end], enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments")
        .select("id,title,prenume,nume,email,date,time,details,phone,poza,file_url,documente,angajat_id,serviciu_id,duration,is_client_booking")
        .eq("user_id", userId!).gte("date", dateRange.start).lte("date", dateRange.end).order("date",{ascending:true});
      if (error) return [];
      return (data??[]).map(mapRow);
    },
  });

  useEffect(() => {
    if (!userId) return;
    const ch1 = supabase.channel(`cp-${userId}`).on("postgres_changes",{event:"UPDATE",schema:"public",table:"profiles",filter:`id=eq.${userId}`},()=>refetchProfile()).subscribe();
    const ch2 = supabase.channel(`ca-${userId}`).on("postgres_changes",{event:"*",schema:"public",table:"appointments",filter:`user_id=eq.${userId}`},()=>refetchAppts()).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [userId]);

  const adminWorkingHours = useMemo<WorkingHour[]>(() => parseWH(profile?.working_hours), [profile?.working_hours]);
  const adminManualBlocks = useMemo<ManualBlocks>(() => {
    const r = profile?.manual_blocks;
    if (!r||typeof r!=="object"||Array.isArray(r)) return {};
    return r as ManualBlocks;
  }, [profile?.manual_blocks]);

  const userSub = useMemo(() => {
    if (!profile) return null;
    let plan = (profile.plan_type||"CHRONOS FREE").toUpperCase();
    if (profile.trial_started_at && Date.now()-new Date(profile.trial_started_at).getTime()<10*24*60*60*1000) plan="CHRONOS TEAM";
    return { plan };
  }, [profile]);
  const hasWA = userSub?.plan.includes("ELITE")||userSub?.plan.includes("TEAM");

  const programariByDate = useMemo(() => {
    const m: Record<string,Prog[]> = {};
    programari.forEach(p => { if (!p.data) return; if (!m[p.data]) m[p.data]=[]; m[p.data].push(p); });
    return m;
  }, [programari]);

  const serviceById = useMemo(() => { const m: Record<string,ServiceRow>={}; rawServices.forEach(s=>{m[s.id]=s;}); return m; }, [rawServices]);

  const filteredProg = useMemo(() => programari.filter(p => {
    const ms = !debouncedSearch || p.nume.toLowerCase().includes(debouncedSearch.toLowerCase()) || p.telefon?.includes(debouncedSearch);
    return ms && (!selectedExpert||p.expertId===selectedExpert) && (!selectedServiciu||p.serviciuId===selectedServiciu);
  }), [programari, debouncedSearch, selectedExpert, selectedServiciu]);

  useEffect(() => { const t=setTimeout(()=>setDebouncedSearch(searchTerm),250); return ()=>clearTimeout(t); }, [searchTerm]);

  const handleSearch = useCallback((q:string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchResults(programari.filter(p=>p.nume.toLowerCase().includes(q.toLowerCase())||p.telefon?.includes(q)||p.email?.toLowerCase().includes(q.toLowerCase())).slice(0,8));
  }, [programari]);

  const openEdit = useCallback((p:Prog) => { setEditForm({...p}); setShowDatePicker(false); setShowTimePicker(false); setShowSearchDrop(false); }, []);
  const closeModal = useCallback(() => { setEditForm(null); setNewForm(null); setShowDatePicker(false); setShowTimePicker(false); setShowSearchDrop(false); }, []);

  useEffect(() => {
    if (!editForm) return;
    const sn = rawServices.find(s=>s.id===editForm.serviciuId)?.nume_serviciu;
    setCustomMsg(`Bună, ${editForm.nume}! Te așteptăm la programarea din ${editForm.data}, ora ${editForm.ora}${sn?` pentru ${sn}`:""}.`);
  }, [editForm?.id]);

  useEffect(() => {
    function h(e:MouseEvent) { if (modalRef.current&&!modalRef.current.contains(e.target as Node)&&!showDatePicker&&!showTimePicker) closeModal(); }
    if (editForm) document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  }, [editForm,showDatePicker,showTimePicker]);

  const handleUpdate = async () => {
    if (!editForm) return;
    const svc = rawServices.find(s=>s.id===editForm.serviciuId);
    const { error } = await supabase.from("appointments").update({
      title:editForm.nume,prenume:editForm.nume,nume:editForm.nume,email:editForm.email||null,
      date:editForm.data,time:editForm.ora,duration:svc?.duration||editForm.duration||0,
      phone:editForm.telefon||null,details:editForm.motiv||null,angajat_id:editForm.expertId||null,serviciu_id:editForm.serviciuId||null,
    }).eq("id",editForm.id);
    if (error) { await showToast({message:error.message,type:"error"}); return; }
    qClient.invalidateQueries({queryKey:["appointments",userId]});
    await showToast({message:"Programare actualizată!",type:"success"});
    closeModal();
  };

  const handleDelete = async () => {
    if (!editForm) return;
    const ok = await showConfirm({title:"Ștergere",message:`Ștergi programarea lui ${editForm.nume}?`,confirmText:"Șterge",type:"danger"});
    if (!ok) return;
    await supabase.from("appointments").delete().eq("id",editForm.id);
    qClient.invalidateQueries({queryKey:["appointments",userId]});
    closeModal();
  };

  const handleSelectExpert = useCallback((id:string) => {
    setSelectedExpert(id);
    if (id&&selectedServiciu) { const st=rawStaff.find(s=>s.id===id); if (st?.services?.length&&!st.services.includes(selectedServiciu)) setSelectedServiciu(""); }
  }, [selectedServiciu,rawStaff]);

  const handleSelectServiciu = useCallback((id:string) => {
    setSelectedServiciu(id);
    if (id&&selectedExpert) { const st=rawStaff.find(s=>s.id===selectedExpert); if (st?.services?.length&&!st.services.includes(id)) setSelectedExpert(""); }
  }, [selectedExpert,rawStaff]);

  const nav = useCallback((dir:number) => {
    setSelectedDate(prev => {
      const d=new Date(prev);
      if (viewMode==="year") d.setFullYear(d.getFullYear()+dir);
      else if (viewMode==="month") d.setMonth(d.getMonth()+dir);
      else if (viewMode==="week") d.setDate(d.getDate()+dir*7);
      else d.setDate(d.getDate()+dir);
      return d;
    });
  }, [viewMode]);

  const angInModal = useMemo(() => { if (!editForm?.serviciuId) return rawStaff; return rawStaff.filter(a=>a.services?.includes(editForm.serviciuId!)); }, [editForm?.serviciuId,rawStaff]);
  const svcInModal = useMemo(() => { if (!editForm?.expertId) return rawServices; const a=rawStaff.find(s=>s.id===editForm.expertId); if (!a?.services?.length) return rawServices; return rawServices.filter(s=>a.services.includes(s.id)); }, [editForm?.expertId,rawStaff,rawServices]);
  const editExisting = useMemo(() => { if (!editForm) return []; return programari.filter(p=>p.data===editForm.data&&String(p.id)!==String(editForm.id)).map(p=>({time:p.ora,duration:p.duration||30})); }, [programari,editForm?.data,editForm?.id]);
  const editSvcDur = useMemo(() => { if (!editForm?.serviciuId) return 0; return rawServices.find(s=>s.id===editForm.serviciuId)?.duration||0; }, [editForm?.serviciuId,rawServices]);

  const dateTitles: Record<ViewMode,string> = {
    day: selectedDate.toLocaleDateString("ro-RO",{weekday:"long",day:"numeric",month:"long",year:"numeric"}),
    week: (()=>{ const ws=getWeekStart(selectedDate),we=addDays(ws,6); return `${ws.getDate()} ${TXT.monthsShort[ws.getMonth()]} – ${we.getDate()} ${TXT.monthsShort[we.getMonth()]} ${we.getFullYear()}`; })(),
    month: `${TXT.months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`,
    year: `${selectedDate.getFullYear()}`,
  };

  if (sessionLoading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f8fafc"}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
        <div style={{width:44,height:44,background:"#0f172a",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{color:"#f59e0b",fontWeight:700,fontSize:16}}>C</span>
        </div>
        <span style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.1em"}}>Se încarcă...</span>
      </div>
    </div>
  );
  if (!userId&&!isDemo) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#94a3b8",fontWeight:700}}>Autentificare necesară</div>;

  const btnStyle = (active:boolean): React.CSSProperties => ({
    padding:"6px 12px", borderRadius:8, fontSize:10, fontWeight:700, textTransform:"uppercase",
    border:"none", cursor:"pointer", transition:"all 0.15s",
    background: active ? "#0f172a" : "#f1f5f9", color: active ? "#fff" : "#64748b",
  });

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:"#f8fafc",overflow:"hidden"}}>

      {/* ── MODAL EDITARE ─────────────────────────────────────────────────── */}
      {editForm && (
        <>
          {showDatePicker && (
            <div style={{position:"fixed",inset:0,zIndex:900,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setShowDatePicker(false)}>
              <div onClick={e=>e.stopPropagation()}>
                <ChronosDatePicker value={editForm.data} onChange={v=>{setEditForm(p=>p?{...p,data:v,ora:""}:null);setShowDatePicker(false);}} minDate={today} onClose={()=>setShowDatePicker(false)} workingHours={adminWorkingHours} manualBlocks={adminManualBlocks} />
              </div>
            </div>
          )}
          {showTimePicker && (
            <div style={{position:"fixed",inset:0,zIndex:900,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setShowTimePicker(false)}>
              <div onClick={e=>e.stopPropagation()}>
                <ChronosTimePicker value={editForm.ora||"09:00"} onChange={v=>{setEditForm(p=>p?{...p,ora:v}:null);setShowTimePicker(false);}} onClose={()=>setShowTimePicker(false)} workingHours={adminWorkingHours} existingAppointments={editExisting} selectedDate={editForm.data} serviceDuration={editSvcDur} manualBlocks={adminManualBlocks} />
              </div>
            </div>
          )}
          <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.72)",backdropFilter:"blur(6px)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={closeModal}>
            <div ref={modalRef} onClick={e=>e.stopPropagation()} style={{background:"#fff",width:"100%",maxWidth:520,borderRadius:24,overflow:"hidden",boxShadow:"0 24px 60px rgba(0,0,0,0.25)",border:"1px solid #e2e8f0",position:"relative"}}>
              <button onClick={closeModal} style={{position:"absolute",top:14,right:14,width:32,height:32,background:"#f1f5f9",border:"none",borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:700,color:"#64748b",zIndex:30,display:"flex",alignItems:"center",justifyContent:"center"}} className="hover:bg-red-500 hover:text-white transition-all">✕</button>
              {/* Header */}
              <div style={{background:"#0f172a",padding:"20px 24px",display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:48,height:48,borderRadius:16,background:"#1e293b",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                  {editForm.poza?<img src={editForm.poza} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="" />:"👤"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:9,fontWeight:700,color:"#f59e0b",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:2}}>Detalii programare</p>
                  <h2 style={{fontSize:18,fontWeight:700,color:"#fff",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{editForm.nume}</h2>
                  <p style={{fontSize:11,color:"#94a3b8",margin:0}}>{editForm.data} · {editForm.ora}{editForm.isOnline?" 🌐":""}</p>
                </div>
              </div>
              {/* Body */}
              <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:10,maxHeight:"72vh",overflowY:"auto"}}>
                {/* Nume */}
                <div style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:16,padding:"10px 14px"}}>
                  <p style={{fontSize:8,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",marginBottom:4}}>Nume complet</p>
                  <input style={{width:"100%",background:"transparent",border:"none",fontSize:15,fontWeight:700,color:"#1e293b",outline:"none"}} value={editForm.nume} onChange={e=>setEditForm(p=>p?{...p,nume:e.target.value}:null)} />
                </div>
                {/* Data + Ora */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <button onClick={()=>{setShowDatePicker(true);setShowTimePicker(false);}} style={{background:"#0f172a",color:"#fff",border:"none",borderRadius:16,padding:"10px 14px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}} className="hover:bg-slate-800 transition-all">
                    <span style={{fontSize:8,color:"#64748b",fontWeight:700,textTransform:"uppercase"}}>Data</span>
                    <span style={{fontSize:13,fontWeight:700}}>📅 {editForm.data}</span>
                  </button>
                  <button onClick={()=>{setShowTimePicker(true);setShowDatePicker(false);}} style={{background:"#0f172a",color:"#fff",border:"none",borderRadius:16,padding:"10px 14px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}} className="hover:bg-slate-800 transition-all">
                    <span style={{fontSize:8,color:"#64748b",fontWeight:700,textTransform:"uppercase"}}>Ora</span>
                    <span style={{fontSize:13,fontWeight:700}}>🕐 {editForm.ora||"Alege..."}</span>
                  </button>
                </div>
                {/* Tel + Email */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[{label:"Telefon",key:"telefon"},{label:"Email",key:"email"}].map(f=>(
                    <div key={f.key} style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:16,padding:"10px 14px"}}>
                      <p style={{fontSize:8,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",marginBottom:4}}>{f.label}</p>
                      <input style={{width:"100%",background:"transparent",border:"none",fontSize:12,fontWeight:700,color:"#1e293b",outline:"none"}} value={(editForm as any)[f.key]||""} onChange={e=>setEditForm(p=>p?{...p,[f.key]:e.target.value}:null)} />
                    </div>
                  ))}
                </div>
                {/* Specialist + Serviciu */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[{label:"Specialist",key:"expertId",opts:angInModal,nameKey:"name"},{label:"Serviciu",key:"serviciuId",opts:svcInModal,nameKey:"nume_serviciu"}].map(f=>(
                    <div key={f.key} style={{background:"#0f172a",borderRadius:16,padding:"10px 14px"}}>
                      <p style={{fontSize:8,fontWeight:700,color:"#f59e0b",textTransform:"uppercase",marginBottom:4}}>{f.label}</p>
                      <select style={{width:"100%",background:"transparent",border:"none",fontSize:11,fontWeight:700,color:"#fff",outline:"none",cursor:"pointer"}} value={(editForm as any)[f.key]||""} onChange={e=>setEditForm(p=>p?{...p,[f.key]:e.target.value}:null)}>
                        <option value="" style={{background:"#0f172a"}}>Alege...</option>
                        {f.opts.map((o:any)=><option key={o.id} value={o.id} style={{background:"#0f172a"}}>{(o as any)[f.nameKey]}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                {/* Notite */}
                <div style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:16,padding:"10px 14px"}}>
                  <p style={{fontSize:8,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",marginBottom:4}}>Notițe</p>
                  <textarea style={{width:"100%",background:"transparent",border:"none",fontSize:11,fontWeight:700,color:"#334155",outline:"none",resize:"none"}} rows={2} value={editForm.motiv||""} onChange={e=>setEditForm(p=>p?{...p,motiv:e.target.value}:null)} />
                </div>
                {/* Documente */}
                {editForm.documente&&editForm.documente.length>0&&(
                  <div style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:16,padding:"10px 14px"}}>
                    <p style={{fontSize:8,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",marginBottom:8}}>Documente atașate ({editForm.documente.length})</p>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {editForm.documente.map(doc=>{
                        const isImg=/\.(jpg|jpeg|png|gif|webp)$/i.test(doc.name||doc.url);
                        const isPdf=/\.pdf$/i.test(doc.name||doc.url);
                        return (
                          <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:10,background:"#fff",border:"1.5px solid #e2e8f0",borderRadius:12,padding:"8px 12px",textDecoration:"none",transition:"all 0.15s"}} className="hover:border-amber-400 hover:bg-amber-50">
                            <span style={{fontSize:16,flexShrink:0}}>{isImg?"🖼️":isPdf?"📄":"📎"}</span>
                            <span style={{fontSize:11,fontWeight:700,color:"#334155",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.name}</span>
                            <span style={{fontSize:9,color:"#94a3b8",fontWeight:700,flexShrink:0}}>↗ Deschide</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* WhatsApp */}
                <div style={{border:"1.5px solid",borderColor:hasWA?"#bbf7d0":"#e2e8f0",borderRadius:16,padding:"10px 14px",background:hasWA?"#f0fdf4":"#f8fafc",opacity:hasWA?1:0.65}}>
                  <p style={{fontSize:8,fontWeight:700,textTransform:"uppercase",color:hasWA?"#15803d":"#94a3b8",marginBottom:6}}>💬 Mesaj WhatsApp</p>
                  <textarea style={{width:"100%",borderRadius:10,padding:8,fontSize:11,fontWeight:700,border:`1.5px solid ${hasWA?"#bbf7d0":"#e2e8f0"}`,background:hasWA?"rgba(255,255,255,0.6)":"#f1f5f9",color:hasWA?"#334155":"#94a3b8",outline:"none",resize:"none",cursor:hasWA?"text":"not-allowed"}} rows={2} value={hasWA?customMsg:"Disponibil în planul ELITE sau TEAM..."} onChange={e=>{if(hasWA)setCustomMsg(e.target.value);}} readOnly={!hasWA} />
                  {hasWA?(
                    <button onClick={()=>{const c=editForm.telefon?.replace(/\D/g,"");window.open(`https://wa.me/${c?.startsWith("0")?"4"+c:c}?text=${encodeURIComponent(customMsg)}`,"_blank");}} style={{width:"100%",padding:"8px",background:"#16a34a",color:"#fff",border:"none",borderRadius:10,fontSize:11,fontWeight:700,cursor:"pointer",marginTop:6}} className="hover:bg-green-700 transition-all">Trimite pe WhatsApp</button>
                  ):(
                    <div style={{width:"100%",padding:"8px",background:"#e2e8f0",color:"#94a3b8",borderRadius:10,fontSize:11,fontWeight:700,textAlign:"center",marginTop:6}}>🔒 Necesită plan ELITE sau TEAM</div>
                  )}
                </div>
                {/* Actiuni */}
                <div style={{display:"flex",flexDirection:"column",gap:8,paddingTop:4,borderTop:"1.5px solid #f1f5f9"}}>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={closeModal} style={{flex:1,padding:"10px",background:"#f1f5f9",border:"none",borderRadius:16,fontSize:11,fontWeight:700,color:"#64748b",cursor:"pointer"}} className="hover:bg-slate-200 transition-all">Anulează</button>
                    <button onClick={handleUpdate} style={{flex:2,padding:"10px",background:"#0f172a",border:"none",borderRadius:16,fontSize:11,fontWeight:700,color:"#fff",cursor:"pointer"}} className="hover:bg-amber-600 transition-all">Salvează modificările</button>
                  </div>
                  <button onClick={handleDelete} style={{padding:"10px",background:"transparent",border:"none",borderRadius:16,fontSize:11,fontWeight:700,color:"#ef4444",cursor:"pointer"}} className="hover:bg-red-50 transition-all">Șterge definitiv 🗑️</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── MODAL PROGRAMARE NOUA ─────────────────────────────────────────── */}
      {newForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.72)",backdropFilter:"blur(6px)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",width:"100%",maxWidth:480,borderRadius:24,overflow:"hidden",boxShadow:"0 24px 60px rgba(0,0,0,0.22)",padding:20,display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <h2 style={{fontSize:16,fontWeight:700,color:"#1e293b",margin:0}}>Programare nouă</h2>
              <button onClick={()=>setNewForm(null)} style={{width:32,height:32,background:"#f1f5f9",border:"none",borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:700,color:"#64748b"}} className="hover:bg-red-500 hover:text-white transition-all">✕</button>
            </div>
            <div style={{background:"#fffbeb",border:"1.5px solid #fcd34d",borderRadius:14,padding:"10px 14px"}}>
              <p style={{fontSize:13,fontWeight:700,color:"#92400e",margin:0}}>📅 {newForm.date} · ora {newForm.time}</p>
            </div>
            <div style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:14,padding:"10px 14px"}}>
              <p style={{fontSize:8,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",marginBottom:4}}>Nume complet</p>
              <input style={{width:"100%",background:"transparent",border:"none",fontSize:14,fontWeight:700,color:"#1e293b",outline:"none"}} placeholder="Numele clientului..." value={newForm.nume} onChange={e=>setNewForm(p=>p?{...p,nume:e.target.value}:null)} />
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[{label:"Telefon",key:"telefon"},{label:"Email",key:"email"}].map(f=>(
                <div key={f.key} style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:14,padding:"10px 14px"}}>
                  <p style={{fontSize:8,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",marginBottom:4}}>{f.label}</p>
                  <input style={{width:"100%",background:"transparent",border:"none",fontSize:12,fontWeight:700,color:"#1e293b",outline:"none"}} value={(newForm as any)[f.key]} onChange={e=>setNewForm(p=>p?{...p,[f.key]:e.target.value}:null)} />
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[{label:"Specialist",key:"expertId",opts:rawStaff,nameKey:"name"},{label:"Serviciu",key:"serviciuId",opts:rawServices,nameKey:"nume_serviciu"}].map(f=>(
                <div key={f.key} style={{background:"#0f172a",borderRadius:14,padding:"10px 14px"}}>
                  <p style={{fontSize:8,fontWeight:700,color:"#f59e0b",textTransform:"uppercase",marginBottom:4}}>{f.label}</p>
                  <select style={{width:"100%",background:"transparent",border:"none",fontSize:11,fontWeight:700,color:"#fff",outline:"none",cursor:"pointer"}} value={(newForm as any)[f.key]} onChange={e=>setNewForm(p=>p?{...p,[f.key]:e.target.value}:null)}>
                    <option value="" style={{background:"#0f172a"}}>Alege...</option>
                    {f.opts.map((o:any)=><option key={o.id} value={o.id} style={{background:"#0f172a"}}>{(o as any)[f.nameKey]}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:14,padding:"10px 14px"}}>
              <p style={{fontSize:8,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",marginBottom:4}}>Notițe</p>
              <textarea style={{width:"100%",background:"transparent",border:"none",fontSize:11,fontWeight:700,color:"#334155",outline:"none",resize:"none"}} rows={2} value={newForm.motiv} onChange={e=>setNewForm(p=>p?{...p,motiv:e.target.value}:null)} />
            </div>
            <div style={{display:"flex",gap:8,paddingTop:4}}>
              <button onClick={()=>setNewForm(null)} style={{flex:1,padding:"10px",background:"#f1f5f9",border:"none",borderRadius:14,fontSize:11,fontWeight:700,color:"#64748b",cursor:"pointer"}} className="hover:bg-slate-200 transition-all">Anulează</button>
              <button style={{flex:2,padding:"10px",background:"#0f172a",border:"none",borderRadius:14,fontSize:11,fontWeight:700,color:"#fff",cursor:"pointer"}} className="hover:bg-amber-600 transition-all"
                onClick={async()=>{
                  if(!newForm)return;
                  const{error}=await supabase.from("appointments").insert({title:newForm.nume,prenume:newForm.nume,nume:newForm.nume,email:newForm.email||null,date:newForm.date,time:newForm.time,phone:newForm.telefon||null,details:newForm.motiv||null,angajat_id:newForm.expertId||null,serviciu_id:newForm.serviciuId||null,user_id:userId,duration:rawServices.find(s=>s.id===newForm.serviciuId)?.duration||15});
                  if(error){await showToast({message:error.message,type:"error"});return;}
                  qClient.invalidateQueries({queryKey:["appointments",userId]});
                  await showToast({message:"Programare adăugată!",type:"success"});
                  setNewForm(null);
                }}>Salvează</button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div style={{background:"#fff",borderBottom:"2px solid #e2e8f0",padding:"8px 14px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <Link href="/programari" style={{flexShrink:0}}>
          <div style={{width:34,height:34,background:"#f1f5f9",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"#334155",cursor:"pointer",border:"none",transition:"all 0.15s"}} className="hover:bg-slate-900 hover:text-white">←</div>
        </Link>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <div style={{width:34,height:34,background:"#0f172a",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <span style={{color:"#f59e0b",fontWeight:700,fontSize:13}}>C</span>
          </div>
          <div className="hidden sm:block">
            <p style={{fontSize:13,fontWeight:700,color:"#1e293b",margin:0,lineHeight:1.2}}>Calendar <span style={{color:"#d97706"}}>Chronos</span></p>
            <p style={{fontSize:8,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",margin:0}}>{isLoading?"Se sincronizează...":"Sincronizat"}</p>
          </div>
        </div>
        {/* Titlu data curenta */}
        <div className="hidden md:block" style={{flexShrink:0,padding:"5px 12px",background:"#f8fafc",borderRadius:10,border:"1.5px solid #e2e8f0"}}>
          <span style={{fontSize:11,fontWeight:700,color:"#334155",textTransform:"capitalize"}}>{dateTitles[viewMode]}</span>
        </div>
        {/* Search */}
        <div style={{flex:1,maxWidth:280,position:"relative"}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"#94a3b8"}}>🔍</span>
          <input type="text" placeholder="Caută client..." value={searchTerm}
            onChange={e=>{setSearchTerm(e.target.value);handleSearch(e.target.value);}}
            onFocus={()=>{if(searchTerm.trim())setShowSearchDrop(true);}}
            style={{width:"100%",background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:10,padding:"6px 40px 6px 32px",fontSize:11,fontWeight:700,color:"#334155",outline:"none"}}
            className="focus:border-amber-400 transition-all" />
          <button onClick={()=>{handleSearch(searchTerm);setShowSearchDrop(true);}} style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"#0f172a",color:"#fff",border:"none",borderRadius:7,padding:"3px 8px",fontSize:9,fontWeight:700,cursor:"pointer"}} className="hover:bg-amber-600 transition-all">Caută</button>
          {showSearchDrop&&searchResults.length>0&&(
            <div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:4,background:"#fff",border:"1.5px solid #e2e8f0",borderRadius:12,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",zIndex:50,maxHeight:240,overflowY:"auto"}}>
              {searchResults.map(p=>(
                <button key={p.id} onClick={()=>{setSearchTerm(p.nume);setShowSearchDrop(false);openEdit(p);}} style={{width:"100%",padding:"10px 14px",borderBottom:"1px solid #f1f5f9",textAlign:"left",background:"transparent",border:"none",cursor:"pointer"}} className="hover:bg-slate-50 transition-all">
                  <span style={{fontSize:12,fontWeight:700,color:"#1e293b",display:"block"}}>{p.nume}</span>
                  <div style={{display:"flex",gap:8}}>
                    {p.telefon&&<span style={{fontSize:9,color:"#94a3b8"}}>📞 {p.telefon}</span>}
                    {p.isOnline&&<span style={{fontSize:9,color:"#3b82f6",fontWeight:700}}>🌐 Online</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {/* View mode */}
        <div style={{display:"flex",background:"#f1f5f9",padding:3,borderRadius:10,gap:2,marginLeft:"auto",flexShrink:0}}>
          {(["day","week","month","year"] as ViewMode[]).map(opt=>(
            <button key={opt} onClick={()=>setViewMode(opt)} style={btnStyle(viewMode===opt)}>
              {opt==="day"?"Zi":opt==="week"?"Săpt.":opt==="month"?"Lună":"An"}
            </button>
          ))}
        </div>
        {/* Nav */}
        <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
          <button onClick={()=>nav(-1)} style={{width:32,height:32,background:"#f1f5f9",border:"1.5px solid #e2e8f0",borderRadius:8,cursor:"pointer",fontSize:16,fontWeight:700,color:"#334155",display:"flex",alignItems:"center",justifyContent:"center"}} className="hover:bg-slate-200 transition-all">‹</button>
          <button onClick={()=>setSelectedDate(new Date())} style={{padding:"4px 10px",background:"transparent",border:"none",cursor:"pointer",fontSize:10,fontWeight:700,color:"#64748b"}} className="hover:text-amber-600 transition-colors">Azi</button>
          <button onClick={()=>nav(1)} style={{width:32,height:32,background:"#f1f5f9",border:"1.5px solid #e2e8f0",borderRadius:8,cursor:"pointer",fontSize:16,fontWeight:700,color:"#334155",display:"flex",alignItems:"center",justifyContent:"center"}} className="hover:bg-slate-200 transition-all">›</button>
        </div>
        {userSub&&<span style={{fontSize:8,background:"#f1f5f9",color:"#94a3b8",padding:"4px 8px",borderRadius:7,fontWeight:700,textTransform:"uppercase",flexShrink:0}} className="hidden lg:block">{userSub.plan}</span>}
      </div>

      {/* ── WEEK STRIP ───────────────────────────────────────────────────── */}
      {(viewMode==="day"||viewMode==="week")&&(
        <WeekStrip selectedDate={selectedDate} onSelectDate={d=>{setSelectedDate(d);setViewMode("day");}} programariByDate={programariByDate} adminWorkingHours={adminWorkingHours} />
      )}

      {/* ── FILTER BAR ───────────────────────────────────────────────────── */}
      <FilterBar rawStaff={rawStaff} rawServices={rawServices} programari={programari}
        selectedExpert={selectedExpert} onSelectExpert={handleSelectExpert}
        selectedServiciu={selectedServiciu} onSelectServiciu={handleSelectServiciu}
        selectedDate={selectedDate} />

      {/* ── BODY ─────────────────────────────────────────────────────────── */}
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {isLoading&&<div style={{height:3,background:"#fef3c7",overflow:"hidden",flexShrink:0}}><div style={{height:"100%",width:"33%",background:"#f59e0b"}} className="animate-pulse" /></div>}

        {viewMode==="day"&&(
          <DayView selectedDate={selectedDate} programari={filteredProg} rawStaff={rawStaff} rawServices={rawServices} serviceById={serviceById}
            onEdit={openEdit} adminWorkingHours={adminWorkingHours} selectedExpert={selectedExpert} selectedServiciu={selectedServiciu}
            onSelectServiciu={handleSelectServiciu}
            onAddNew={(time,date)=>setNewForm({date,time,nume:"",telefon:"",email:"",serviciuId:"",expertId:selectedExpert||rawStaff[0]?.id||"",motiv:""})} />
        )}
        {viewMode==="week"&&(
          <WeekView selectedDate={selectedDate} programariByDate={programariByDate} rawStaff={rawStaff} serviceById={serviceById}
            onEdit={openEdit} selectedExpert={selectedExpert} selectedServiciu={selectedServiciu} adminWorkingHours={adminWorkingHours}
            onSelectDate={d=>{setSelectedDate(d);setViewMode("day");}} />
        )}
        {viewMode==="month"&&(
          <MonthView selectedDate={selectedDate} programariByDate={programariByDate} rawStaff={rawStaff} serviceById={serviceById}
            onEdit={openEdit} onDayClick={d=>{setSelectedDate(d);setViewMode("day");}} selectedExpert={selectedExpert} selectedServiciu={selectedServiciu} adminWorkingHours={adminWorkingHours} />
        )}
        {viewMode==="year"&&(
          <YearView selectedDate={selectedDate} programariByDate={programariByDate} onMonthClick={(yr,mo)=>{setSelectedDate(new Date(yr,mo,1));setViewMode("month");}} />
        )}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime:1000*60*5, refetchOnWindowFocus:false, retry:1 } },
  }));
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={
        <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f8fafc"}}>
          <div style={{width:44,height:44,background:"#0f172a",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center"}} className="animate-pulse">
            <span style={{color:"#f59e0b",fontWeight:700,fontSize:16}}>C</span>
          </div>
        </div>
      }>
        <CalendarContent />
      </Suspense>
    </QueryClientProvider>
  );
}