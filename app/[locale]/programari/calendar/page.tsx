"use client";
import React, { useState, useEffect, useMemo, Suspense, useCallback, useRef } from "react";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { showToast, showConfirm } from "@/lib/toast";
import { useTranslations, useLocale } from "next-intl";
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
// ✅ Verificare suprapunere pentru ACELAȘI specialist (indiferent de serviciu).
// Specialiști diferiți pot avea programări la aceeași oră, chiar pe același serviciu.
function hasSpecialistConflict(list: Prog[], expertId: string, date: string, ora: string, durMin: number, excludeId?: any): boolean {
  if (!expertId) return false;
  const s = timeToMin(ora), e = s + (durMin||30);
  return list.some(p => {
    if (excludeId!=null && String(p.id)===String(excludeId)) return false;
    if (p.data !== date) return false;
    if (p.expertId !== expertId) return false;
    const ps = timeToMin(p.ora), pe = ps + (p.duration||30);
    return s < pe && e > ps;
  });
}
// ─── Sunet notificare (2 tonuri, generate — fără fișier audio necesar) ────────
function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const beep = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };
    beep(880, 0, 0.22);
    beep(1175, 0.16, 0.28);
  } catch {}
}
// ─── Types ────────────────────────────────────────────────────────────────────
type DocAtt = { id: number|string; name: string; url: string };
type Prog = {
  id: any; nume: string; email?: string; data: string; ora: string;
  telefon?: string; motiv?: string; poza?: string; documente: DocAtt[];
  expertId?: string; serviciuId?: string; duration?: number; isOnline?: boolean;
};
type ViewMode = "day"|"week"|"month"|"year";
type ManualBlocks = Record<string, string[]>;
interface StaffRow   { id: string; name: string; services: string[]; working_hours?: any }
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
// ─── Sanitizare nume fișier (diacritice RO + caractere speciale) ──────────────
function sanitizeFileName(name: string) {
  const dot = name.lastIndexOf(".");
  const base = dot > -1 ? name.slice(0, dot) : name;
  const ext = dot > -1 ? name.slice(dot) : "";
  const cleanBase = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${cleanBase}${ext}`;
}
// ─── AppointmentHoverCard ─────────────────────────────────────────────────────
interface HoverCardProps {
  prog: Prog;
  anchorRect: DOMRect;
  serviceById: Record<string, ServiceRow>;
  rawStaff: StaffRow[];
  staffColorIndex: number;
  onClose: () => void;
}
function AppointmentHoverCard({ prog, anchorRect, serviceById, rawStaff, staffColorIndex, onClose }: HoverCardProps) {
  const t = useTranslations("calendarPage");
  const svc = serviceById[prog.serviciuId || ""];
  const staff = rawStaff.find(s => s.id === prog.expertId);
  const color = SC[staffColorIndex % SC.length];
  const endTime = svc?.duration ? addMinutesToTime(prog.ora, svc.duration) : null;
  const [pos, setPos] = useState({ top: 0, left: 0, ready: false });
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardW = 284;
    const cardH = cardRef.current?.offsetHeight || 260;
    let left = anchorRect.right + 12;
    if (left + cardW > vw - 10) left = anchorRect.left - cardW - 12;
    if (left < 10) left = Math.max(10, (vw - cardW) / 2);
    let top = anchorRect.top;
    if (top + cardH > vh - 10) top = vh - cardH - 10;
    if (top < 10) top = 10;
    setPos({ top, left, ready: true });
  }, [anchorRect]);
  return (
    <>
      <div style={{ position:"fixed", inset:0, zIndex:9998, background:"transparent", pointerEvents:"none" }} />
      <div ref={cardRef} style={{
        position:"fixed", top:pos.top, left:pos.left, width:284,
        background:"#fff", borderRadius:18,
        boxShadow:"0 24px 64px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)",
        zIndex:9999, overflow:"hidden",
        opacity:pos.ready?1:0,
        transform:pos.ready?"scale(1) translateY(0)":"scale(0.95) translateY(6px)",
        transition:"opacity 0.14s ease, transform 0.14s ease",
        pointerEvents:"auto",
      }} onClick={e=>e.stopPropagation()}>
        <div style={{
          background:`linear-gradient(135deg, ${color.border}28 0%, ${color.border}10 100%)`,
          borderBottom:`3px solid ${color.border}`,
          padding:"13px 15px", display:"flex", alignItems:"center", gap:11,
        }}>
          <div style={{ width:42, height:42, borderRadius:13, background:color.border, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, overflow:"hidden" }}>
            {prog.poza
              ? <img src={prog.poza} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="" />
              : <span style={{color:"#fff",fontWeight:700,fontSize:17}}>{prog.nume.charAt(0).toUpperCase()}</span>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <p style={{fontSize:14,fontWeight:700,color:"#1e293b",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{prog.nume}</p>
            <p style={{fontSize:11,fontWeight:700,color:color.border,margin:"2px 0 0"}}>
              {prog.ora}{endTime?` → ${endTime}`:""}
              {prog.isOnline&&<span style={{marginLeft:5}}>🌐 {t("onlineLabel")}</span>}
            </p>
          </div>
        </div>
        <div style={{padding:"11px 15px",display:"flex",flexDirection:"column",gap:7}}>
          {svc&&<div style={{display:"flex",alignItems:"flex-start",gap:9}}><span style={{fontSize:13,color:"#94a3b8",flexShrink:0,marginTop:1}}>✂️</span><div><span style={{fontSize:12,fontWeight:700,color:"#334155"}}>{svc.nume_serviciu}</span>{svc.duration>0&&<span style={{fontSize:10,color:"#94a3b8",marginLeft:7}}>{svc.duration} min</span>}{svc.price>0&&<span style={{fontSize:10,fontWeight:700,color:"#059669",marginLeft:7}}>{svc.price} RON</span>}</div></div>}
          {staff&&<div style={{display:"flex",alignItems:"center",gap:9}}><span style={{fontSize:13,color:"#94a3b8",flexShrink:0}}>👤</span><span style={{fontSize:12,fontWeight:700,color:"#334155"}}>{staff.name}</span></div>}
          {prog.telefon&&<div style={{display:"flex",alignItems:"center",gap:9}}><span style={{fontSize:13,color:"#94a3b8",flexShrink:0}}>📞</span><span style={{fontSize:12,fontWeight:600,color:"#475569"}}>{prog.telefon}</span></div>}
          {prog.email&&<div style={{display:"flex",alignItems:"center",gap:9}}><span style={{fontSize:13,color:"#94a3b8",flexShrink:0}}>✉️</span><span style={{fontSize:11,color:"#475569",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{prog.email}</span></div>}
          {prog.motiv&&<div style={{background:"#f8fafc",borderRadius:9,padding:"7px 9px",border:"1px solid #e2e8f0"}}><p style={{fontSize:11,color:"#64748b",margin:0,lineHeight:1.45}}>{prog.motiv}</p></div>}
          <div style={{borderTop:"1px solid #f1f5f9",marginTop:2,paddingTop:7}}>
            <span style={{fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em"}}>{t("hoverHint")}</span>
          </div>
        </div>
      </div>
    </>
  );
}
// ─── TimeColumn ───────────────────────────────────────────────────────────────
function TimeColumn({ slots, whStart, whEnd, isClosed }: { slots: string[]; whStart: string; whEnd: string; isClosed: boolean }) {
  return (
    <div style={{ width:TIME_COL_W, flexShrink:0, borderRight:"2px solid #e2e8f0", background:"#fff" }}>
      {slots.map(slot => {
        const isHour = slot.endsWith(":00");
        const isHalf = slot.endsWith(":30");
        const isWork = !isClosed && whStart && whEnd && isWorkingSlot(slot, whStart, whEnd);
        return (
          <div key={slot} style={{
            height:SLOT_H, display:"flex", alignItems:"flex-start", justifyContent:"flex-end",
            paddingRight:10, paddingTop:4, userSelect:"none",
            borderTop: isHour ? "1.5px solid #94a3b8" : isHalf ? "1px solid #cbd5e1" : "1px solid #e2e8f0",
            background: isWork ? "#fafbfc" : "#f1f5f9",
          }}>
            {isHour&&<span style={{fontSize:12,fontWeight:700,color:isWork?"#334155":"#94a3b8",fontVariantNumeric:"tabular-nums"}}>{slot}</span>}
            {isHalf&&<span style={{fontSize:10,fontWeight:600,color:isWork?"#94a3b8":"#cbd5e1"}}>{slot}</span>}
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
  const t = useTranslations("calendarPage");
  const locale = useLocale();
  const dayShort = t.raw("dayShort") as string[];
  const dayLong = t.raw("dayLong") as string[];
  const months = t.raw("months") as string[];
  const monthsShort = t.raw("monthsShort") as string[];
  const today = new Date();
  const weekStart = getWeekStart(selectedDate);
  const weekDays = Array.from({ length:7 }, (_,i) => addDays(weekStart, i));
  const whByDay = useMemo(() => {
    const m: Record<string,WorkingHour> = {};
    adminWorkingHours.forEach(h => { m[h.day] = h; });
    return m;
  }, [adminWorkingHours]);
  const monthLabel = useMemo(() => {
    const fm = weekDays[0].getMonth(), lm = weekDays[6].getMonth(), yr = weekDays[0].getFullYear();
    return fm === lm ? `${months[fm]} ${yr}` : `${monthsShort[fm]} – ${monthsShort[lm]} ${yr}`;
  }, [weekDays, months, monthsShort]);
  return (
    <div style={{ flexShrink:0, background:"#fff", borderBottom:"2px solid #e2e8f0" }}>
      <div style={{ display:"flex", alignItems:"stretch", minHeight:64 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"0 12px", borderRight:"2px solid #e2e8f0", flexShrink:0, minWidth:190 }}>
          <button onClick={() => onSelectDate(addDays(weekStart, -7))}
            style={{ width:28, height:28, border:"1.5px solid #e2e8f0", borderRadius:8, background:"#f8fafc", fontSize:16, fontWeight:700, color:"#334155", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
          <div style={{ flex:1, textAlign:"center" }}>
            <p style={{ fontSize:12, fontWeight:700, color:"#1e293b", lineHeight:1.3 }}>{monthLabel}</p>
            <button onClick={() => onSelectDate(today)}
              style={{ fontSize:10, fontWeight:700, color:"#d97706", background:"none", border:"none", cursor:"pointer", padding:0 }}>{t("weekGoToday")}</button>
          </div>
          <button onClick={() => onSelectDate(addDays(weekStart, 7))}
            style={{ width:28, height:28, border:"1.5px solid #e2e8f0", borderRadius:8, background:"#f8fafc", fontSize:16, fontWeight:700, color:"#334155", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
        </div>
        <div style={{ display:"flex", flex:1 }}>
          {weekDays.map((day, i) => {
            const key = formatDateKey(day);
            const isSel = sameDay(day, selectedDate);
            const isToday = sameDay(day, today);
            const appts = programariByDate[key] || [];
            const total = appts.length;
            const online = appts.filter(p => p.isOnline).length;
            const dow = (day.getDay() + 6) % 7;
            const wh = whByDay[dayLong[day.getDay()]];
            const isClosed = !!wh?.closed;
            return (
              <button key={i} onClick={() => onSelectDate(day)}
                style={{
                  flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                  gap:2, padding:"6px 4px", border:"none", cursor:"pointer", position:"relative",
                  borderLeft: i===0 ? "none" : "1px solid #f1f5f9",
                  background: isSel ? "#0f172a" : isClosed ? "#fff5f5" : isToday ? "#fffbeb" : "#fff",
                  borderBottom: isSel ? "3px solid #f59e0b" : isClosed ? "3px solid #fca5a5" : "3px solid transparent",
                  transition:"background 0.15s",
                }}>
                <span style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", color: isSel?"#f59e0b":isToday?"#d97706":isClosed?"#f87171":"#64748b" }}>
                  {dayShort[dow]}
                </span>
                <span style={{ fontSize:18, fontWeight:700, lineHeight:1.2, color: isSel?"#fff":isToday?"#d97706":isClosed?"#f87171":"#1e293b" }}>
                  {day.getDate()}
                </span>
                {total>0&&(
                  <div style={{ display:"flex", gap:3, alignItems:"center" }}>
                    <span style={{ fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:99, background:isSel?"#f59e0b":isToday?"#f59e0b":"#e2e8f0", color:isSel||isToday?"#fff":"#475569" }}>{total}</span>
                    {online>0&&<span style={{ fontSize:9, fontWeight:700, padding:"1px 5px", borderRadius:99, background:"#3b82f6", color:"#fff" }}>{online}🌐</span>}
                  </div>
                )}
                {isClosed&&<span style={{ fontSize:7, fontWeight:700, color:"#f87171" }}>{t("closedBadge")}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
// ─── FilterDropdownButton — buton compact cu panou de căutare + scroll ────────
interface DropdownItem { id: string; label: string; sub?: string; dotColor?: string; initial?: string; count: number; }
function FilterDropdownButton({ label, allLabel, placeholder, items, selectedId, onSelect }: {
  label: string; allLabel: string; placeholder: string;
  items: DropdownItem[]; selectedId: string; onSelect: (id: string) => void;
}) {
  const t = useTranslations("calendarPage");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) { setOpen(false); setQuery(""); }
    }
    if (open) {
      document.addEventListener("mousedown", onClickOutside);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const selected = items.find(i => i.id === selectedId);
  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(i => i.label.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div ref={boxRef} style={{ position: "relative", flexShrink: 0 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 999,
          border: "1.5px solid #0f172a",
          background: "#0f172a", color: "#f59e0b",
          fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
        }}>
        <span style={{ opacity: 0.65, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}:</span>
        {selected?.initial && (
          <span style={{ width: 16, height: 16, borderRadius: "50%", background: selected.dotColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{selected.initial}</span>
        )}
        <span style={{ opacity: 1 }}>{selected ? selected.label : allLabel}</span>
        <span style={{ fontSize: 10, opacity: 0.65, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, width: 240, background: "#fff",
          border: "1.5px solid #e2e8f0", borderRadius: 14, boxShadow: "0 12px 32px rgba(0,0,0,0.14)",
          zIndex: 60, overflow: "hidden",
        }}>
          <div style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>
            <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
              placeholder={placeholder}
              style={{ width: "100%", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 9, padding: "6px 10px", fontSize: 11, fontWeight: 600, color: "#334155", outline: "none" }}
              className="focus:border-amber-400 transition-all" />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            <button onClick={() => { onSelect(""); setOpen(false); setQuery(""); }}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: !selectedId ? "#f1f5f9" : "transparent", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#334155", textAlign: "left" }}
              className="hover:bg-slate-50 transition-colors">
              {allLabel}
            </button>
            {filtered.length === 0 && (
              <p style={{ padding: "14px 12px", fontSize: 10, color: "#cbd5e1", fontWeight: 700, textAlign: "center" }}>{t("noResultsFound")}</p>
            )}
            {filtered.map(item => (
              <button key={item.id} onClick={() => { onSelect(selectedId === item.id ? "" : item.id); setOpen(false); setQuery(""); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: selectedId === item.id ? "#f1f5f9" : "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
                className="hover:bg-slate-50 transition-colors">
                {item.initial && (
                  <span style={{ width: 18, height: 18, borderRadius: "50%", background: item.dotColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{item.initial}</span>
                )}
                <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.label}{item.sub && <span style={{ opacity: 0.5, fontWeight: 600 }}> · {item.sub}</span>}
                </span>
                {item.count > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: "#e2e8f0", color: "#64748b", flexShrink: 0 }}>{item.count}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
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
  const t = useTranslations("calendarPage");
  const dateKey = formatDateKey(selectedDate);
  const cntExp = useMemo(() => {
    const m: Record<string,number> = {};
    programari.forEach(p => { if (p.data===dateKey&&p.expertId) m[p.expertId]=(m[p.expertId]||0)+1; });
    return m;
  }, [programari, dateKey]);
  const cntSvc = useMemo(() => {
    const m: Record<string,number> = {};
    programari.forEach(p => { if (p.data===dateKey&&p.serviciuId&&(!selectedExpert||p.expertId===selectedExpert)) m[p.serviciuId]=(m[p.serviciuId]||0)+1; });
    return m;
  }, [programari, dateKey, selectedExpert]);
  const visSvc = useMemo(() => {
    if (!selectedExpert) return rawServices;
    const st = rawStaff.find(s=>s.id===selectedExpert);
    if (!st?.services?.length) return rawServices;
    return rawServices.filter(s=>st.services.includes(s.id));
  }, [selectedExpert, rawStaff, rawServices]);
  if (!rawStaff.length&&!rawServices.length) return null;

  const staffItems: DropdownItem[] = rawStaff.map((st,i) => ({
    id: st.id, label: st.name, count: cntExp[st.id]||0,
    dotColor: SC[i%SC.length].border, initial: st.name.slice(0,1).toUpperCase(),
  }));
  const svcItems: DropdownItem[] = visSvc.map((svc) => {
    const parts: string[] = [];
    if (svc.duration>0) parts.push(`${svc.duration}min`);
    if (svc.price>0) parts.push(`${svc.price} RON`);
    return { id: svc.id, label: svc.nume_serviciu, sub: parts.length?parts.join(" · "):undefined, count: cntSvc[svc.id]||0 };
  });

  return (
    <div style={{ flexShrink:0, background:"#fff", borderBottom:"2px solid #e2e8f0", padding:"8px 14px", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
      {rawStaff.length>0&&(
        <FilterDropdownButton label={t("filterSpecialists")} allLabel={t("filterAll")} placeholder={t("searchSpecialistPlaceholder")}
          items={staffItems} selectedId={selectedExpert}
          onSelect={(id)=>{onSelectExpert(id); if(!id) onSelectServiciu("");}} />
      )}
      {rawServices.length>0&&(
        <FilterDropdownButton label={t("filterServices")} allLabel={t("filterAllServices")} placeholder={t("searchServicePlaceholder")}
          items={svcItems} selectedId={selectedServiciu}
          onSelect={onSelectServiciu} />
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
  const t = useTranslations("calendarPage");
  const dateKey = formatDateKey(selectedDate);
  const items = useMemo(() => {
    const m: Record<string,{total:number;online:number}> = {};
    programari.forEach(p => {
      if (p.data!==dateKey) return;
      if (selectedExpert&&p.expertId!==selectedExpert) return;
      if (p.serviciuId) { if (!m[p.serviciuId]) m[p.serviciuId]={total:0,online:0}; m[p.serviciuId].total++; if(p.isOnline)m[p.serviciuId].online++; }
    });
    return rawServices.filter(s=>m[s.id]).map((s,i)=>({...s,...m[s.id],ci:i}));
  }, [programari, dateKey, selectedExpert, rawServices]);
  const totals = useMemo(() => {
    let total=0,online=0;
    programari.forEach(p => {
      if(p.data!==dateKey)return;
      if(selectedExpert&&p.expertId!==selectedExpert)return;
      if(selectedServiciu&&p.serviciuId!==selectedServiciu)return;
      total++;if(p.isOnline)online++;
    });
    return{total,online};
  },[programari,dateKey,selectedExpert,selectedServiciu]);
  if (!totals.total&&!items.length) return null;
  return (
    <div style={{ flexShrink:0, background:"#f8fafc", borderTop:"1.5px solid #e2e8f0", display:"flex", alignItems:"center", gap:10, padding:"6px 14px", overflowX:"auto", scrollbarWidth:"thin" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0, borderRight:"1.5px solid #e2e8f0", paddingRight:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          <span style={{ width:8, height:8, borderRadius:"50%", background:"#334155", flexShrink:0 }} />
          <span style={{ fontSize:11, fontWeight:700, color:"#334155" }}>{totals.total} {t("progSuffix")}</span>
        </div>
        {totals.online>0&&<div style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:"50%",background:"#3b82f6",flexShrink:0}}/><span style={{fontSize:11,fontWeight:700,color:"#2563eb"}}>{totals.online} {t("onlineSuffix")}</span></div>}
      </div>
      {items.map(it=>{
        const c=SVC_C[it.ci%SVC_C.length];const isSel=selectedServiciu===it.id;
        return <button key={it.id} onClick={()=>onSelectServiciu(isSel?"":it.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:999,border:`1.5px solid ${isSel?it.text:c.border}`,background:c.bg,color:c.text,fontSize:10,fontWeight:700,cursor:"pointer",flexShrink:0,transition:"all 0.15s"}}>{it.nume_serviciu} <span style={{fontWeight:800}}>×{it.total}</span>{it.online>0&&<span style={{fontSize:9,opacity:0.7}}>({it.online}🌐)</span>}</button>;
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
  const t = useTranslations("calendarPage");
  const dayLong = t.raw("dayLong") as string[];
  const dateKey = formatDateKey(selectedDate);
  const dayName = dayLong[selectedDate.getDay()];
  const ds = adminWorkingHours.find(h=>h.day===dayName);
  const isClosed = !!ds?.closed;
  const whStart = ds?.start||"";
  const whEnd   = ds?.end||"";
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoverCard, setHoverCard] = useState<{prog:Prog;rect:DOMRect}|null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const slots = useMemo(() => {
    if (isClosed||!whStart||!whEnd) return ALL_SLOTS;
    const s = Math.max(0, timeToMin(whStart)-60);
    const e = Math.min(24*60, timeToMin(whEnd==="00:00"?"24:00":whEnd)+60);
    return ALL_SLOTS.filter(sl=>{ const m=timeToMin(sl); return m>=s&&m<e; });
  }, [isClosed,whStart,whEnd]);
  const firstMin = useMemo(() => slots.length?timeToMin(slots[0]):0, [slots]);
  const gridH = slots.length*SLOT_H;
  useEffect(() => {
    const target = whStart||`${new Date().getHours().toString().padStart(2,"0")}:00`;
    const off = Math.max(0, ((timeToMin(target)-firstMin)/15)*SLOT_H-80);
    setTimeout(()=>{ scrollRef.current?.scrollTo({top:off,behavior:"smooth"}); },120);
  }, [dateKey]);
  const nowTop = useMemo(() => {
    const now = new Date();
    if (!sameDay(now,selectedDate)) return null;
    return ((now.getHours()*60+now.getMinutes()-firstMin)/15)*SLOT_H;
  }, [selectedDate,firstMin]);
  const staffMap = useMemo(() => {
    const m: Record<string,number> = {};
    rawStaff.forEach((s,i)=>{m[s.id]=i%SC.length;});
    return m;
  }, [rawStaff]);
  const dayAppts = useMemo(() => programari.filter(p=>{
    if (p.data!==dateKey) return false;
    if (selectedExpert&&p.expertId!==selectedExpert) return false;
    if (selectedServiciu&&p.serviciuId!==selectedServiciu) return false;
    return true;
  }), [programari,dateKey,selectedExpert,selectedServiciu]);
  // ✅ Layout pe coloane: programările care se suprapun în timp apar una lângă alta (ca în vizualizarea pe săptămână),
  // cele la ore diferite rămân una sub alta, poziționate după oră
  const dayApptsLayout = useMemo(() => {
    const getDur = (p: Prog) => serviceById[p.serviciuId||""]?.duration || 30;
    const sorted = [...dayAppts].sort((a,b)=>timeToMin(a.ora)-timeToMin(b.ora));
    const result: { prog: Prog; col: number; totalCols: number }[] = [];
    let cluster: Prog[] = [];
    let clusterEnd = -Infinity;
    const flush = () => {
      if (!cluster.length) return;
      const colsEnd: number[] = [];
      const colOf: Record<string, number> = {};
      cluster.forEach(p => {
        const s = timeToMin(p.ora), e = s + getDur(p);
        let placed = -1;
        for (let c=0;c<colsEnd.length;c++) { if (colsEnd[c] <= s) { colsEnd[c]=e; placed=c; break; } }
        if (placed===-1) { colsEnd.push(e); placed = colsEnd.length-1; }
        colOf[String(p.id)] = placed;
      });
      const totalCols = colsEnd.length;
      cluster.forEach(p => result.push({ prog:p, col: colOf[String(p.id)], totalCols }));
      cluster = [];
    };
    sorted.forEach(p => {
      const s = timeToMin(p.ora), e = s + getDur(p);
      if (s >= clusterEnd) { flush(); clusterEnd = e; }
      else clusterEnd = Math.max(clusterEnd, e);
      cluster.push(p);
    });
    flush();
    return result;
  }, [dayAppts, serviceById]);
  const handleMouseEnter = (p: Prog, e: React.MouseEvent) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    const currentTarget = e.currentTarget as HTMLElement;
    hoverTimer.current = setTimeout(()=>{ if(currentTarget) setHoverCard({prog:p,rect:currentTarget.getBoundingClientRect()}); },320);
  };
  const handleMouseLeave = () => { if(hoverTimer.current) clearTimeout(hoverTimer.current); setHoverCard(null); };
  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1, overflow:"hidden" }}>
      {isClosed&&(
        <div style={{ flexShrink:0, background:"#fff5f5", borderBottom:"1px solid #fca5a5", padding:"6px 16px" }}>
          <span style={{ fontSize:11, fontWeight:700, color:"#dc2626" }}>{t("dayClosedBanner")}</span>
        </div>
      )}
      {hoverCard&&(
        <AppointmentHoverCard prog={hoverCard.prog} anchorRect={hoverCard.rect} serviceById={serviceById}
          rawStaff={rawStaff} staffColorIndex={staffMap[hoverCard.prog.expertId||""]??0} onClose={()=>setHoverCard(null)} />
      )}
      <div ref={scrollRef} style={{ flex:1, overflowY:"auto", overflowX:"hidden" }}>
        <div style={{ display:"flex", height:gridH, position:"relative" }}>
          <div style={{ position:"sticky", left:0, zIndex:20 }}>
            <TimeColumn slots={slots} whStart={whStart} whEnd={whEnd} isClosed={isClosed} />
          </div>
          <div style={{ flex:1, position:"relative" }}>
            {slots.map((slot,i) => {
              const isHour = slot.endsWith(":00");
              const isHalf = slot.endsWith(":30");
              const hasSchedule = !!(whStart && whEnd); // ✅ dacă nu există program setat, ziua e deschisă 24/24
              const isWork = !isClosed && hasSchedule && isWorkingSlot(slot,whStart,whEnd);
              const isOutsideHours = !isClosed && hasSchedule && !isWork; // ✅ program setat, dar ora e în afara lui — "închis pentru clienți"
              return (
                <div key={slot} style={{
                  position:"absolute", left:0, right:0, top:i*SLOT_H, height:SLOT_H,
                  background: isClosed
                    ? "repeating-linear-gradient(135deg,rgba(239,68,68,0.10) 0px,rgba(239,68,68,0.10) 4px,rgba(254,242,242,1) 4px,rgba(254,242,242,1) 8px)"
                    : isOutsideHours
                      ? "repeating-linear-gradient(45deg,rgba(148,163,184,0.28) 0px,rgba(148,163,184,0.28) 2px,transparent 2px,transparent 10px),repeating-linear-gradient(135deg,rgba(148,163,184,0.28) 0px,rgba(148,163,184,0.28) 2px,transparent 2px,transparent 10px),#eef1f5"
                      : "#fafbfc",
                  borderTop: isHour?"1.5px solid #94a3b8":isHalf?"1px solid #cbd5e1":"1px solid #e2e8f0",
                }} />
              );
            })}
            {!isClosed&&whStart&&whEnd&&(()=>{
              const s = ((timeToMin(whStart)-firstMin)/15)*SLOT_H;
              const e = ((timeToMin(whEnd==="00:00"?"24:00":whEnd)-firstMin)/15)*SLOT_H;
              return (
                <>
                  <div style={{position:"absolute",left:0,right:0,top:s,height:2,background:"#64748b",zIndex:10,pointerEvents:"none"}}/>
                  <div style={{position:"absolute",left:0,right:0,top:e,height:2,background:"#64748b",zIndex:10,pointerEvents:"none"}}/>
                  <div style={{position:"absolute",right:6,top:s+4,fontSize:8,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em",zIndex:11,pointerEvents:"none"}}>{t("programStart")}</div>
                  <div style={{position:"absolute",right:6,top:e+4,fontSize:8,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em",zIndex:11,pointerEvents:"none"}}>{t("programEnd")}</div>
                </>
              );
            })()}
            {nowTop!==null&&nowTop>=0&&(
              <div style={{position:"absolute",left:0,right:0,top:nowTop,zIndex:25,pointerEvents:"none"}}>
                <div style={{height:2.5,background:"#f59e0b",position:"relative"}}>
                  <div style={{width:11,height:11,borderRadius:"50%",background:"#f59e0b",position:"absolute",left:-5,top:-4}}/>
                </div>
              </div>
            )}
            {slots.map((slot,i) => {
              return (
                <button key={`e-${slot}`} onClick={()=>onAddNew(slot,dateKey)}
                  style={{position:"absolute",left:0,right:0,top:i*SLOT_H,height:SLOT_H,zIndex:5,background:"transparent",border:"none",cursor:"pointer"}}
                  className="group hover:bg-amber-50 transition-all">
                  <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:10,fontWeight:700,color:"#f59e0b",opacity:0}} className="group-hover:opacity-100 transition-opacity">+ {slot}</span>
                </button>
              );
            })}
            {dayApptsLayout.map(({prog:p, col, totalCols}) => {
              const svc = serviceById[p.serviciuId||""];
              const endTime = svc?.duration?addMinutesToTime(p.ora,svc.duration):null;
              const topPx = ((timeToMin(p.ora)-firstMin)/15)*SLOT_H;
              const heightPx = Math.max(((svc?.duration||30)/15)*SLOT_H-3,40);
              const ci = staffMap[p.expertId||""]??0;
              const color = SC[ci];
              return (
                <button key={p.id}
                  onClick={()=>{setHoverCard(null);onEdit(p);}}
                  onMouseEnter={e=>handleMouseEnter(p,e)}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    position:"absolute", top:topPx+2, height:heightPx, zIndex:15,
                    left:`calc(8px + ${col} * (100% - 8px) / ${totalCols})`,
                    width:`calc((100% - 8px) / ${totalCols} - 4px)`,
                    background:"#fff", borderRadius:7,
                    borderTop:"1px solid rgba(0,0,0,0.07)",
                    borderRight:"1px solid rgba(0,0,0,0.07)",
                    borderBottom:"1px solid rgba(0,0,0,0.07)",
                    borderLeft:`4px solid ${color.border}`,
                    boxShadow:"0 1px 6px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.06)",
                    padding:"5px 10px", textAlign:"left", cursor:"pointer",
                    transition:"all 0.15s", overflow:"hidden",
                  }}
                  className="hover:brightness-95 hover:shadow-md transition-all">
                  <p style={{fontSize:10,fontWeight:700,color:color.border,lineHeight:1.3,marginBottom:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {p.ora}{endTime?` → ${endTime}`:""}{p.isOnline?" 🌐":""}
                  </p>
                  <p style={{fontSize:13,fontWeight:700,color:"#1e293b",lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {p.nume}
                  </p>
                  {svc&&heightPx>56&&(
                    <p style={{fontSize:11,color:"#64748b",lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
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
        selectedExpert={selectedExpert} selectedServiciu={selectedServiciu} onSelectServiciu={onSelectServiciu}/>
    </div>
  );
}
// ─── WeekView — redesign simplu (listă per zi, fără grid ore) ─────────────────
function WeekView({ selectedDate, programariByDate, rawStaff, serviceById, rawServices, onEdit, selectedExpert, selectedServiciu, adminWorkingHours, onSelectDate }: {
  selectedDate: Date; programariByDate: Record<string,Prog[]>;
  rawStaff: StaffRow[]; serviceById: Record<string,ServiceRow>; rawServices: ServiceRow[];
  onEdit: (p: Prog) => void; selectedExpert: string; selectedServiciu: string;
  adminWorkingHours: WorkingHour[]; onSelectDate: (d: Date) => void;
}) {
  const t = useTranslations("calendarPage");
  const dayShort = t.raw("dayShort") as string[];
  const dayLong = t.raw("dayLong") as string[];
  const today = new Date();
  const weekDays = useMemo(() => {
    const s = getWeekStart(selectedDate);
    return Array.from({length:7},(_,i)=>addDays(s,i));
  }, [selectedDate]);
  const whByDay = useMemo(() => {
    const m: Record<string,WorkingHour> = {};
    adminWorkingHours.forEach(h=>{m[h.day]=h;});
    return m;
  }, [adminWorkingHours]);
  const staffMap = useMemo(() => {
    const m: Record<string,number> = {};
    rawStaff.forEach((s,i)=>{m[s.id]=i%SC.length;});
    return m;
  }, [rawStaff]);
  const [hoverCard, setHoverCard] = useState<{prog:Prog;rect:DOMRect}|null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const handleMouseEnter = (p: Prog, e: React.MouseEvent) => {
    if(hoverTimer.current) clearTimeout(hoverTimer.current);
    const ct = e.currentTarget as HTMLElement;
    hoverTimer.current = setTimeout(()=>{ if(ct) setHoverCard({prog:p,rect:ct.getBoundingClientRect()}); },320);
  };
  const handleMouseLeave = () => { if(hoverTimer.current) clearTimeout(hoverTimer.current); setHoverCard(null); };
  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
      {hoverCard&&(
        <AppointmentHoverCard prog={hoverCard.prog} anchorRect={hoverCard.rect} serviceById={serviceById}
          rawStaff={rawStaff} staffColorIndex={staffMap[hoverCard.prog.expertId||""]??0} onClose={()=>setHoverCard(null)}/>
      )}
      <div style={{flex:1,overflowY:"auto",overflowX:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",flex:1,alignItems:"start"}}>
          {weekDays.map((day,di)=>{
            const key = formatDateKey(day);
            const dn = dayLong[day.getDay()];
            const wh = whByDay[dn];
            const isClosed = !!wh?.closed;
            const isToday = sameDay(day,today);
            const dayAppts = (programariByDate[key]||[])
              .filter(p=>(!selectedExpert||p.expertId===selectedExpert)&&(!selectedServiciu||p.serviciuId===selectedServiciu))
              .sort((a,b)=>a.ora.localeCompare(b.ora));
            return (
              <div key={di} style={{
                minHeight:120,
                borderRight:di<6?"1px solid #e2e8f0":"none",
                borderBottom:"1px solid #e2e8f0",
                background:isClosed
                  ? "repeating-linear-gradient(135deg,rgba(239,68,68,0.04) 0px,rgba(239,68,68,0.04) 5px,rgba(255,245,245,1) 5px,rgba(255,245,245,1) 10px)"
                  : isToday?"rgba(251,191,36,0.04)":"#fff",
                padding:"8px 6px",
                display:"flex",flexDirection:"column",gap:5,
              }}>
                {isClosed&&(
                  <div style={{textAlign:"center",padding:"12px 4px",color:"#fca5a5"}}>
                    <div style={{fontSize:20,marginBottom:4}}>🚫</div>
                    <span style={{fontSize:9,fontWeight:700,color:"#f87171"}}>{t("weekDayClosedLabel")}</span>
                  </div>
                )}
                {!isClosed&&dayAppts.length===0&&(
                  <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px 4px"}}>
                    <span style={{fontSize:10,color:"#cbd5e1",fontWeight:600}}>—</span>
                  </div>
                )}
                {dayAppts.map(p=>{
                  const svc = serviceById[p.serviciuId||""];
                  const ci = staffMap[p.expertId||""]??0;
                  const color = SC[ci];
                  const endTime = svc?.duration?addMinutesToTime(p.ora,svc.duration):null;
                  const spec = rawStaff.find(s=>s.id===p.expertId);
                  return (
                    <button key={p.id}
                      onClick={()=>{setHoverCard(null);onEdit(p);}}
                      onMouseEnter={e=>handleMouseEnter(p,e)}
                      onMouseLeave={handleMouseLeave}
                      style={{
                        width:"100%",textAlign:"left",cursor:"pointer",
                        background:color.chipBg,
                        borderRadius:8,
                        borderTop:`1px solid ${color.chipBorder}`,
                        borderRight:`1px solid ${color.chipBorder}`,
                        borderBottom:`1px solid ${color.chipBorder}`,
                        borderLeft:`3px solid ${color.border}`,
                        padding:"6px 8px",
                        transition:"all 0.15s",
                      }}
                      className="hover:brightness-95 transition-all">
                      <p style={{fontSize:10,fontWeight:700,color:color.border,margin:"0 0 2px",lineHeight:1.3}}>
                        {p.ora}{endTime?` → ${endTime}`:""}{p.isOnline?" 🌐":""}
                      </p>
                      <p style={{fontSize:12,fontWeight:700,color:"#1e293b",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1.3}}>
                        {p.nume}
                      </p>
                      {svc&&(
                        <p style={{fontSize:10,color:color.chipText,margin:"2px 0 0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1.2}}>
                          {svc.nume_serviciu}{svc.duration>0?` · ${svc.duration}min`:""}
                        </p>
                      )}
                      {spec&&(
                        <div style={{display:"flex",alignItems:"center",gap:4,marginTop:3}}>
                          <span style={{width:12,height:12,borderRadius:"50%",background:color.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,color:"#fff",fontWeight:700,flexShrink:0}}>
                            {spec.name.charAt(0).toUpperCase()}
                          </span>
                          <span style={{fontSize:9,color:"#64748b",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{spec.name}</span>
                        </div>
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
  const t = useTranslations("calendarPage");
  const dayShort = t.raw("dayShort") as string[];
  const dayLong = t.raw("dayLong") as string[];
  const today = new Date();
  const whByDay = useMemo(()=>{const m:Record<string,WorkingHour>={};adminWorkingHours.forEach(h=>{m[h.day]=h;});return m;},[adminWorkingHours]);
  const [hoverCard, setHoverCard] = useState<{prog:Prog;rect:DOMRect}|null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const grid = useMemo(()=>{
    const yr=selectedDate.getFullYear(),mo=selectedDate.getMonth();
    const first=new Date(yr,mo,1);const startDow=(first.getDay()+6)%7;const daysInMonth=new Date(yr,mo+1,0).getDate();
    const cells:Date[]=[];
    for(let i=0;i<startDow;i++)cells.push(addDays(first,i-startDow));
    for(let d=1;d<=daysInMonth;d++)cells.push(new Date(yr,mo,d));
    while(cells.length%7!==0)cells.push(addDays(cells[cells.length-1],1));
    return cells;
  },[selectedDate]);
  const staffMap = useMemo(()=>{const m:Record<string,number>={};rawStaff.forEach((s,i)=>{m[s.id]=i%SC.length;});return m;},[rawStaff]);
  const handleMouseEnter=(p:Prog,e:React.MouseEvent)=>{if(hoverTimer.current)clearTimeout(hoverTimer.current);const ct=e.currentTarget as HTMLElement;hoverTimer.current=setTimeout(()=>{if(ct)setHoverCard({prog:p,rect:ct.getBoundingClientRect()});},320);};
  const handleMouseLeave=()=>{if(hoverTimer.current)clearTimeout(hoverTimer.current);setHoverCard(null);};
  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"auto"}}>
      {hoverCard&&<AppointmentHoverCard prog={hoverCard.prog} anchorRect={hoverCard.rect} serviceById={serviceById} rawStaff={rawStaff} staffColorIndex={staffMap[hoverCard.prog.expertId||""]??0} onClose={()=>setHoverCard(null)}/>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:"2px solid #e2e8f0",background:"#fff",position:"sticky",top:0,zIndex:10,flexShrink:0}}>
        {dayShort.map((d,i)=>(
          <div key={d} style={{textAlign:"center",padding:"8px 4px",borderRight:i<6?"1px solid #e2e8f0":"none",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color:"#64748b"}}>{d}</div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",minWidth:700,flex:1}}>
        {grid.map((day,idx)=>{
          const key=formatDateKey(day);
          const allAppts=programariByDate[key]||[];
          const appts=allAppts.filter(p=>(!selectedExpert||p.expertId===selectedExpert)&&(!selectedServiciu||p.serviciuId===selectedServiciu));
          const online=appts.filter(p=>p.isOnline).length;
          const isCurMo=day.getMonth()===selectedDate.getMonth();
          const isToday=sameDay(day,today);const isSel=sameDay(day,selectedDate);
          const wh=whByDay[dayLong[day.getDay()]];const isClosed=!!wh?.closed;
          return (
            <div key={idx} onClick={()=>onDayClick(day)}
              style={{
                minHeight:110,padding:"6px 6px 4px",display:"flex",flexDirection:"column",cursor:"pointer",
                borderBottom: isClosed&&isCurMo ? "1px solid #fca5a5" : "1px solid #e2e8f0",
                borderRight:(day.getDay()+6)%7<6?(isClosed&&isCurMo?"1px solid #fca5a5":"1px solid #e2e8f0"):"none",
                boxShadow: isClosed&&isCurMo ? "inset 0 0 0 2px #fca5a5" : "none",
                background:!isCurMo?"#f8fafc":isClosed?"#fef2f2":isToday?"rgba(251,191,36,0.06)":"#fff",
                opacity:!isCurMo?0.38:1,transition:"background 0.15s"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:12,fontWeight:700,width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:6,flexShrink:0,background:isToday?"#f59e0b":isSel?"#1e293b":isClosed?"#fecaca":"transparent",color:isToday||isSel?"#fff":isClosed?"#b91c1c":"#334155"}}>{day.getDate()}</span>
                <div style={{display:"flex",gap:3,alignItems:"center"}}>
                  {isClosed&&isCurMo&&<span style={{fontSize:8,fontWeight:800,color:"#fff",background:"#dc2626",padding:"2px 6px",borderRadius:5,letterSpacing:"0.02em"}}>{t("closedBadgeCaps")}</span>}
                  {appts.length>0&&<span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:99,background:"#e2e8f0",color:"#475569"}}>{appts.length}</span>}
                  {online>0&&<span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:99,background:"#3b82f6",color:"#fff"}}>{online}🌐</span>}
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:2,flex:1,overflow:"hidden"}}>
                {appts.slice(0,3).map(p=>{
                  const ci=staffMap[p.expertId||""]??0;const color=SC[ci];
                  return (
                    <button key={p.id} onClick={e=>{e.stopPropagation();setHoverCard(null);onEdit(p);}} onMouseEnter={e=>{e.stopPropagation();handleMouseEnter(p,e);}} onMouseLeave={handleMouseLeave}
                      style={{display:"flex",alignItems:"center",gap:4,padding:"2px 6px",borderRadius:4,background:color.chipBg,borderTop:`1px solid ${color.chipBorder}`,borderRight:`1px solid ${color.chipBorder}`,borderBottom:`1px solid ${color.chipBorder}`,borderLeft:`3px solid ${color.border}`,textAlign:"left",cursor:"pointer",transition:"all 0.15s"}}
                      className="hover:brightness-95 transition-all">
                      <span style={{fontSize:9,fontWeight:700,color:"#64748b",flexShrink:0}}>{p.ora}</span>
                      <span style={{fontSize:10,fontWeight:700,color:color.chipText,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{p.nume}</span>
                      {p.isOnline&&<span style={{fontSize:8,flexShrink:0}}>🌐</span>}
                    </button>
                  );
                })}
                {appts.length>3&&<p style={{fontSize:9,fontWeight:700,color:"#f59e0b",paddingLeft:4}}>{t("moreCount",{n:appts.length-3})}</p>}
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
  const t = useTranslations("calendarPage");
  const months = t.raw("months") as string[];
  const today = new Date();
  const yr = selectedDate.getFullYear();
  return (
    <div style={{flex:1,overflowY:"auto",padding:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
        {Array.from({length:12},(_,mo)=>{
          const first=new Date(yr,mo,1);const daysInMonth=new Date(yr,mo+1,0).getDate();const startDow=(first.getDay()+6)%7;
          let total=0,online=0;
          for(let d=1;d<=daysInMonth;d++){const key=`${yr}-${String(mo+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;const a=programariByDate[key]||[];total+=a.length;online+=a.filter(p=>p.isOnline).length;}
          const isCurMo=today.getFullYear()===yr&&today.getMonth()===mo;const isSel=selectedDate.getFullYear()===yr&&selectedDate.getMonth()===mo;
          return (
            <div key={mo} onClick={()=>onMonthClick(yr,mo)} style={{background:"#fff",border:"1.5px solid #e2e8f0",borderRadius:12,padding:"10px 12px",cursor:"pointer",transition:"all 0.15s",borderTop:isCurMo?"3px solid #f59e0b":isSel?"3px solid #1e293b":"1.5px solid #e2e8f0"}} className="hover:border-amber-400 hover:shadow-sm">
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:13,fontWeight:700,color:isCurMo?"#d97706":"#334155"}}>{months[mo]}</span>
                {total>0&&<div style={{display:"flex",gap:4}}><span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:99,background:"#e2e8f0",color:"#475569"}}>{total}</span>{online>0&&<span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:99,background:"#3b82f6",color:"#fff"}}>{online}🌐</span>}</div>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1}}>
                {["L","M","M","J","V","S","D"].map((d,i)=><div key={i} style={{fontSize:7,fontWeight:700,textAlign:"center",color:"#94a3b8",paddingBottom:2}}>{d}</div>)}
                {Array.from({length:startDow}).map((_,i)=><div key={`e${i}`}/>)}
                {Array.from({length:daysInMonth},(_,d)=>{
                  const dn=d+1;const key=`${yr}-${String(mo+1).padStart(2,"0")}-${String(dn).padStart(2,"0")}`;const hasA=(programariByDate[key]||[]).length>0;const isT=today.getFullYear()===yr&&today.getMonth()===mo&&today.getDate()===dn;
                  return <div key={dn} style={{fontSize:8,fontWeight:hasA?700:400,textAlign:"center",borderRadius:3,lineHeight:"16px",background:isT?"#f59e0b":hasA?"#dbeafe":"transparent",color:isT?"#fff":hasA?"#1d4ed8":"#94a3b8"}}>{dn}</div>;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
// ─── DocumentsSection ──────────────────────────────────────────────────────────
// Extras dintr-un IIFE inline care apela useState la fiecare render —
// asta cauza eroarea "Rendered more hooks than during the previous render".
// Acum e o componentă React normală, cu hooks la nivelul ei (legal).
interface DocumentsSectionProps {
  editForm: Prog;
  userId: string | undefined;
  setEditForm: React.Dispatch<React.SetStateAction<Prog | null>>;
  qClient: ReturnType<typeof useQueryClient>;
}
function DocumentsSection({ editForm, userId, setEditForm, qClient }: DocumentsSectionProps) {
  const t = useTranslations("calendarPage");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingDoc(true);
    const docs = [...(editForm.documente || [])];
    for (const file of files) {
      try {
        const safeName = `${Date.now()}_${sanitizeFileName(file.name)}`;
        const { error: upErr } = await supabase.storage.from("documente-programari").upload(safeName, file);
        if (upErr) throw upErr;
        const { data: u } = supabase.storage.from("documente-programari").getPublicUrl(safeName);
        docs.push({ id: Date.now() + Math.random(), name: file.name, url: u.publicUrl });
      } catch (err) {
        console.error("Upload eroare:", err);
      }
    }
    setEditForm(p => p ? { ...p, documente: docs } : null);
    await supabase.from("appointments").update({ documente: docs }).eq("id", editForm.id);
    if (editForm.telefon) {
      const tel = editForm.telefon.replace(/\D/g, "");
      const { data: caseData } = await supabase.from("client_cases")
        .select("id,fisiere_atasate").eq("user_id", userId!).eq("phone_number", tel).single();
      if (caseData) {
        let fisiere: any[] = [];
        try { fisiere = JSON.parse(caseData.fisiere_atasate || "[]"); } catch {}
        const existingUrls = new Set(fisiere.map((f: any) => f.url));
        for (const doc of docs) {
          if (!existingUrls.has(doc.url)) {
            const ext = doc.name.split(".").pop()?.toLowerCase() || "";
            const tip = ["jpg","jpeg","png","gif","webp"].includes(ext) ? "imagine"
              : ["mp4","mov","avi","webm"].includes(ext) ? "video"
              : ["mp3","wav","ogg","m4a"].includes(ext) ? "audio" : "document";
            fisiere.push({
              id: String(doc.id),
              nume: doc.name,
              url: doc.url,
              tip,
              created_at: new Date().toISOString(),
            });
          }
        }
        await supabase.from("client_cases")
          .update({ fisiere_atasate: JSON.stringify(fisiere) })
          .eq("id", caseData.id);
      }
    }
    setUploadingDoc(false);
    e.target.value = "";
    qClient.invalidateQueries({ queryKey: ["appointments", userId] });
  };
  const handleDocDelete = async (i: number) => {
    const newDocs = (editForm.documente || []).filter((_, j) => j !== i);
    setEditForm(p => p ? { ...p, documente: newDocs } : null);
    await supabase.from("appointments").update({ documente: newDocs }).eq("id", editForm.id);
  };
  return (
    <div style={{ background:"#f8fafc", border:"1.5px solid #e2e8f0", borderRadius:12, padding:"8px 10px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
        <p style={{ fontSize:7, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", margin:0 }}>
          {t("docsTitle")} {editForm.documente?.length > 0 ? `(${editForm.documente.length})` : ""}
        </p>
        <label style={{
          background: uploadingDoc ? "#64748b" : "#0f172a",
          color:"#fff", borderRadius:7, padding:"3px 10px", fontSize:9,
          fontWeight:700, cursor: uploadingDoc ? "not-allowed" : "pointer",
          display:"flex", alignItems:"center", gap:4,
          opacity: uploadingDoc ? 0.7 : 1,
        }}>
          {uploadingDoc ? t("docsUploading") : t("docsAddBtn")}
          <input type="file" multiple accept="*/*" style={{ display:"none" }}
            disabled={uploadingDoc} onChange={handleDocUpload} />
        </label>
      </div>
      {(!editForm.documente || editForm.documente.length === 0) && !uploadingDoc && (
        <p style={{ fontSize:9, color:"#cbd5e1", fontWeight:600, fontStyle:"italic", margin:0 }}>
          {t("docsEmpty")}
        </p>
      )}
      {uploadingDoc && (
        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 0" }}>
          <div style={{ width:12, height:12, borderRadius:"50%", border:"2px solid #f59e0b", borderTopColor:"transparent", animation:"spin 0.8s linear infinite", flexShrink:0 }} />
          <span style={{ fontSize:9, color:"#f59e0b", fontWeight:700 }}>{t("docsUploadingFiles")}</span>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:4, maxHeight:110, overflowY:"auto" }}>
        {(editForm.documente || []).map((doc, i) => {
          const ext = (doc.name || "").split(".").pop()?.toLowerCase() || "";
          const isImg = ["jpg","jpeg","png","gif","webp"].includes(ext);
          const isPdf = ext === "pdf";
          const isAudio = ["mp3","wav","ogg","m4a"].includes(ext);
          const isVideo = ["mp4","mov","avi","webm"].includes(ext);
          const icon = isImg ? "🖼️" : isPdf ? "📄" : isAudio ? "🎵" : isVideo ? "🎬" : "📎";
          return (
            <div key={doc.id} style={{ display:"flex", alignItems:"center", gap:6, background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:8, padding:"5px 8px" }}>
              <span style={{ fontSize:13, flexShrink:0 }}>{icon}</span>
              <a href={doc.url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize:10, fontWeight:700, color:"#334155", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textDecoration:"none" }}>
                {doc.name}
              </a>
              <button onClick={() => handleDocDelete(i)}
                style={{ width:18, height:18, background:"#fee2e2", border:"none", borderRadius:5, cursor:"pointer", fontSize:9, fontWeight:700, color:"#ef4444", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>✕</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
// ─── CalendarContent ──────────────────────────────────────────────────────────
function CalendarContent() {
  const t = useTranslations("calendarPage");
  const locale = useLocale();
  const localeCode = t("localeCode");
  const dayLong = t.raw("dayLong") as string[];
  const months = t.raw("months") as string[];
  const monthsShort = t.raw("monthsShort") as string[];
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo")==="true";
  const modalRef = useRef<HTMLDivElement>(null);
  const qClient = useQueryClient();
  const today = useMemo(()=>new Date().toISOString().split("T")[0],[]);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
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
  const {data:session,isLoading:sessionLoading} = useQuery({
    queryKey:["session"],
    queryFn:async()=>{const{data:{session}}=await supabase.auth.getSession();return session;},
    staleTime:1000*60*10, gcTime:1000*60*30,
  });
  const userId = session?.user?.id;
  const {data:profile,refetch:refetchProfile,isError:profileIsError} = useQuery({
    queryKey:["profile",userId],enabled:!!userId,staleTime:1000*60*5,
    queryFn:async()=>{const{data}=await supabase.from("profiles").select("plan_type,trial_started_at,manual_blocks,working_hours").eq("id",userId!).single();return data;},
  });
  const {data:rawStaff=[]} = useQuery<StaffRow[]>({
    queryKey:["staff",userId],enabled:!!userId,staleTime:1000*60*10,
    queryFn:async()=>{const{data}=await supabase.from("staff").select("id,name,services,working_hours").eq("user_id",userId!);return data??[];},
  });
  const {data:rawServices=[]} = useQuery<ServiceRow[]>({
    queryKey:["services",userId],enabled:!!userId,staleTime:1000*60*10,
    queryFn:async()=>{const{data}=await supabase.from("services").select("id,nume_serviciu,price,duration").eq("user_id",userId!);return data??[];},
  });
  const dateRange = useMemo(()=>{
    const yr=selectedDate.getFullYear(),mo=selectedDate.getMonth();
    return{start:new Date(yr,mo-2,1).toISOString().split("T")[0],end:new Date(yr,mo+3,0).toISOString().split("T")[0]};
  },[selectedDate.getFullYear(),selectedDate.getMonth()]);
  const {data:programari=[],isLoading,refetch:refetchAppts} = useQuery<Prog[]>({
    queryKey:["appointments",userId,dateRange.start,dateRange.end],enabled:!!userId,staleTime:1000*60*2,
    queryFn:async()=>{
      const{data,error}=await supabase.from("appointments").select("id,title,prenume,nume,email,date,time,details,phone,poza,file_url,documente,angajat_id,serviciu_id,duration,is_client_booking").eq("user_id",userId!).gte("date",dateRange.start).lte("date",dateRange.end).order("date",{ascending:true});
      if(error)return[];return(data??[]).map(mapRow);
    },
  });
  useEffect(()=>{
    if(!userId)return;
    const ch1=supabase.channel(`cp-${userId}`).on("postgres_changes",{event:"UPDATE",schema:"public",table:"profiles",filter:`id=eq.${userId}`},()=>refetchProfile()).subscribe();
    const ch2=supabase.channel(`ca-${userId}`).on("postgres_changes",{event:"*",schema:"public",table:"appointments",filter:`user_id=eq.${userId}`},(payload:any)=>{
      // ✅ Sunet + notificare vizuală atunci când clientul face o programare online
      if(payload.eventType==="INSERT"&&payload.new?.is_client_booking){
        playNotificationSound();
        const nume=payload.new.title||payload.new.prenume||payload.new.nume||"Client";
        showToast({title:t("newBookingNotifTitle"),message:t("newBookingNotifMsg",{nume}),type:"info"});
      }
      refetchAppts();
    }).subscribe();
    return()=>{supabase.removeChannel(ch1);supabase.removeChannel(ch2);};
  },[userId]);
  const adminWorkingHours = useMemo<WorkingHour[]>(()=>parseWH(profile?.working_hours),[profile?.working_hours]);
  const adminManualBlocks = useMemo<ManualBlocks>(()=>{const r=profile?.manual_blocks;if(!r||typeof r!=="object"||Array.isArray(r))return{};return r as ManualBlocks;},[profile?.manual_blocks]);
  const userSub = useMemo(()=>{if(!profile)return null;let plan=(profile.plan_type||"CHRONOS FREE").toUpperCase();if(profile.trial_started_at&&Date.now()-new Date(profile.trial_started_at).getTime()<10*24*60*60*1000)plan="CHRONOS TEAM";return{plan};},[profile]);
  const hasWA = userSub?.plan.includes("ELITE")||userSub?.plan.includes("TEAM");
  const programariByDate = useMemo(()=>{const m:Record<string,Prog[]>={};programari.forEach(p=>{if(!p.data)return;if(!m[p.data])m[p.data]=[];m[p.data].push(p);});return m;},[programari]);
  const serviceById = useMemo(()=>{const m:Record<string,ServiceRow>={};rawServices.forEach(s=>{m[s.id]=s;});return m;},[rawServices]);
  const filteredProg = useMemo(()=>programari.filter(p=>{const ms=!debouncedSearch||p.nume.toLowerCase().includes(debouncedSearch.toLowerCase())||p.telefon?.includes(debouncedSearch);return ms&&(!selectedExpert||p.expertId===selectedExpert)&&(!selectedServiciu||p.serviciuId===selectedServiciu);}),[programari,debouncedSearch,selectedExpert,selectedServiciu]);
  useEffect(()=>{const timer=setTimeout(()=>setDebouncedSearch(searchTerm),250);return()=>clearTimeout(timer);},[searchTerm]);
  const handleSearch = useCallback((q:string)=>{if(!q.trim()){setSearchResults([]);return;}setSearchResults(programari.filter(p=>p.nume.toLowerCase().includes(q.toLowerCase())||p.telefon?.includes(q)||p.email?.toLowerCase().includes(q.toLowerCase())).slice(0,8));},[programari]);
  const openEdit = useCallback((p:Prog)=>{setEditForm({...p});setShowDatePicker(false);setShowTimePicker(false);setShowSearchDrop(false);},[]);
  const closeModal = useCallback(()=>{setEditForm(null);setNewForm(null);setShowDatePicker(false);setShowTimePicker(false);setShowSearchDrop(false);},[]);
  useEffect(()=>{if(!editForm)return;const sn=rawServices.find(s=>s.id===editForm.serviciuId)?.nume_serviciu;const base=t("editModal.whatsappMessageBase",{nume:editForm.nume,data:editForm.data,ora:editForm.ora});const suffix=sn?t("editModal.whatsappMessageServiceSuffix",{serviciu:sn}):"";setCustomMsg(`${base}${suffix}.`);},[editForm?.id]);
  useEffect(()=>{function h(e:MouseEvent){if(modalRef.current&&!modalRef.current.contains(e.target as Node)&&!showDatePicker&&!showTimePicker)closeModal();}if(editForm)document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[editForm,showDatePicker,showTimePicker]);
  const handleUpdate = async()=>{
    if(!editForm)return;
    const svc=rawServices.find(s=>s.id===editForm.serviciuId);
    const dur=svc?.duration||editForm.duration||30;
    if(hasSpecialistConflict(programari,editForm.expertId||"",editForm.data,editForm.ora,dur,editForm.id)){
      await showToast({message:t("specialistConflictError"),type:"error"});
      return;
    }
    const{error}=await supabase.from("appointments").update({
      title:editForm.nume, prenume:editForm.nume, nume:editForm.nume,
      email:editForm.email||null, date:editForm.data, time:editForm.ora,
      duration:svc?.duration||editForm.duration||0,
      phone:editForm.telefon||null, details:editForm.motiv||null,
      angajat_id:editForm.expertId||null, serviciu_id:editForm.serviciuId||null,
      documente: editForm.documente||[],
    }).eq("id",editForm.id);
    if(error){await showToast({message:error.message,type:"error"});return;}
    qClient.invalidateQueries({queryKey:["appointments",userId]});
    await showToast({message:t("editModal.updatedToast"),type:"success"});
    closeModal();
  };
  const handleDelete = async()=>{
    if(!editForm)return;const ok=await showConfirm({title:t("editModal.deleteConfirmTitle"),message:t("editModal.deleteConfirmMsg",{nume:editForm.nume}),confirmText:t("editModal.deleteConfirmBtn"),type:"danger"});
    if(!ok)return;await supabase.from("appointments").delete().eq("id",editForm.id);qClient.invalidateQueries({queryKey:["appointments",userId]});closeModal();
  };
  // ✅ Program efectiv pentru vizualizarea calendarului: al specialistului filtrat
  // (dacă are unul propriu setat), altfel cel general al salonului
  const viewWorkingHours = useMemo(() => {
    if (!selectedExpert) return adminWorkingHours;
    const st = rawStaff.find(s => s.id === selectedExpert);
    const staffWH = parseWH(st?.working_hours);
    return staffWH.length > 0 ? staffWH : adminWorkingHours;
  }, [selectedExpert, rawStaff, adminWorkingHours]);

  // ✅ Program efectiv pentru selectoarele din modalul de editare, bazat pe specialistul ales acolo
  const editWorkingHours = useMemo(() => {
    if (!editForm?.expertId) return adminWorkingHours;
    const st = rawStaff.find(s => s.id === editForm.expertId);
    const staffWH = parseWH(st?.working_hours);
    return staffWH.length > 0 ? staffWH : adminWorkingHours;
  }, [editForm?.expertId, rawStaff, adminWorkingHours]);

  const handleSelectExpert = useCallback((id:string)=>{setSelectedExpert(id);if(id&&selectedServiciu){const st=rawStaff.find(s=>s.id===id);if(st?.services?.length&&!st.services.includes(selectedServiciu))setSelectedServiciu("");}},[selectedServiciu,rawStaff]);
  const handleSelectServiciu = useCallback((id:string)=>{setSelectedServiciu(id);if(id&&selectedExpert){const st=rawStaff.find(s=>s.id===selectedExpert);if(st?.services?.length&&!st.services.includes(id))setSelectedExpert("");}},[selectedExpert,rawStaff]);
  const nav = useCallback((dir:number)=>{setSelectedDate(prev=>{const d=new Date(prev);if(viewMode==="year")d.setFullYear(d.getFullYear()+dir);else if(viewMode==="month")d.setMonth(d.getMonth()+dir);else if(viewMode==="week")d.setDate(d.getDate()+dir*7);else d.setDate(d.getDate()+dir);return d;});},[viewMode]);
  const angInModal = useMemo(()=>{if(!editForm?.serviciuId)return rawStaff;return rawStaff.filter(a=>a.services?.includes(editForm.serviciuId!));},[editForm?.serviciuId,rawStaff]);
  const svcInModal = useMemo(()=>{if(!editForm?.expertId)return rawServices;const a=rawStaff.find(s=>s.id===editForm.expertId);if(!a?.services?.length)return rawServices;return rawServices.filter(s=>a.services.includes(s.id));},[editForm?.expertId,rawStaff,rawServices]);
  const editExisting = useMemo(()=>{
    if(!editForm)return[];
    return programari.filter(p=>
      p.data===editForm.data &&
      String(p.id)!==String(editForm.id) &&
      !!editForm.expertId && p.expertId===editForm.expertId
    ).map(p=>({time:p.ora,duration:p.duration||30}));
  },[programari,editForm?.data,editForm?.id,editForm?.expertId]);
  const editSvcDur = useMemo(()=>{if(!editForm?.serviciuId)return 0;return rawServices.find(s=>s.id===editForm.serviciuId)?.duration||0;},[editForm?.serviciuId,rawServices]);
  // ✅ Filtrare specialist ↔ serviciu pentru modalul de PROGRAMARE NOUĂ (bug reparat aici)
  const newAngOpts = useMemo(()=>{
    if(!newForm?.serviciuId)return rawStaff;
    return rawStaff.filter(a=>a.services?.includes(newForm.serviciuId));
  },[newForm?.serviciuId,rawStaff]);
  const newSvcOpts = useMemo(()=>{
    if(!newForm?.expertId)return rawServices;
    const a=rawStaff.find(s=>s.id===newForm.expertId);
    if(!a?.services?.length)return rawServices;
    return rawServices.filter(s=>a.services.includes(s.id));
  },[newForm?.expertId,rawStaff,rawServices]);
  const dateTitles:Record<ViewMode,string> = {
    day: selectedDate.toLocaleDateString(localeCode,{weekday:"long",day:"numeric",month:"long",year:"numeric"}),
    week:(()=>{const ws=getWeekStart(selectedDate),we=addDays(ws,6);return`${ws.getDate()} ${monthsShort[ws.getMonth()]} – ${we.getDate()} ${monthsShort[we.getMonth()]} ${we.getFullYear()}`;})(),
    month:`${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`,
    year:`${selectedDate.getFullYear()}`,
  };
  if(sessionLoading)return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f8fafc"}}><div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}><div style={{width:44,height:44,background:"#0f172a",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#f59e0b",fontWeight:700,fontSize:16}}>C</span></div><span style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.1em"}}>{t("loadingSession")}</span></div></div>);
  if(!userId&&!isDemo)return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#94a3b8",fontWeight:700}}>{t("authRequired")}</div>;
  const btnStyle=(active:boolean):React.CSSProperties=>({padding:"6px 12px",borderRadius:8,fontSize:10,fontWeight:700,textTransform:"uppercase",border:"none",cursor:"pointer",transition:"all 0.15s",background:active?"#0f172a":"#f1f5f9",color:active?"#fff":"#64748b"});

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:"#f8fafc",overflow:"hidden"}}>
      {editForm&&(
        <>
          {showDatePicker&&(<div style={{position:"fixed",inset:0,zIndex:900,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setShowDatePicker(false)}><div onClick={e=>e.stopPropagation()}><ChronosDatePicker value={editForm.data} onChange={v=>{setEditForm(p=>p?{...p,data:v,ora:""}:null);setShowDatePicker(false);}} minDate={today} onClose={()=>setShowDatePicker(false)} workingHours={editWorkingHours} manualBlocks={adminManualBlocks}/></div></div>)}
          {showTimePicker&&(<div style={{position:"fixed",inset:0,zIndex:900,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setShowTimePicker(false)}><div onClick={e=>e.stopPropagation()}><ChronosTimePicker value={editForm.ora||"09:00"} onChange={v=>{setEditForm(p=>p?{...p,ora:v}:null);setShowTimePicker(false);}} onClose={()=>setShowTimePicker(false)} workingHours={editWorkingHours} existingAppointments={editExisting} selectedDate={editForm.data} serviceDuration={editSvcDur} manualBlocks={adminManualBlocks}/></div></div>)}
          <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.72)",backdropFilter:"blur(6px)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:12}} onClick={closeModal}>
            <div ref={modalRef} onClick={e=>e.stopPropagation()} style={{background:"#fff",width:"100%",maxWidth:540,borderRadius:20,overflow:"hidden",boxShadow:"0 24px 60px rgba(0,0,0,0.25)",border:"1px solid #e2e8f0",position:"relative",display:"flex",flexDirection:"column",maxHeight:"96vh"}}>
              <button onClick={closeModal} style={{position:"absolute",top:10,right:10,width:28,height:28,background:"#1e293b",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,color:"#94a3b8",zIndex:30,display:"flex",alignItems:"center",justifyContent:"center"}} className="hover:bg-red-500 hover:text-white transition-all">✕</button>
              <div style={{background:"#0f172a",padding:"12px 16px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                <div style={{width:36,height:36,borderRadius:11,background:"#1e293b",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
                  {editForm.poza?<img src={editForm.poza} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:"👤"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <h2 style={{fontSize:14,fontWeight:700,color:"#fff",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{editForm.nume}</h2>
                  <p style={{fontSize:10,color:"#64748b",margin:0}}>{editForm.data} · {editForm.ora}{editForm.isOnline?" 🌐":""}</p>
                </div>
              </div>
              <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:7,overflowY:"auto",flex:1}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                  <div style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:12,padding:"7px 10px",gridColumn:"span 1"}}>
                    <p style={{fontSize:7,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",marginBottom:2}}>{t("editModal.nameLabel")}</p>
                    <input style={{width:"100%",background:"transparent",border:"none",fontSize:12,fontWeight:700,color:"#1e293b",outline:"none"}} value={editForm.nume} onChange={e=>setEditForm(p=>p?{...p,nume:e.target.value}:null)}/>
                  </div>
                  <button onClick={()=>{setShowDatePicker(true);setShowTimePicker(false);}} style={{background:"#0f172a",color:"#fff",border:"none",borderRadius:12,padding:"7px 10px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1}} className="hover:bg-slate-800 transition-all">
                    <span style={{fontSize:7,color:"#64748b",fontWeight:700,textTransform:"uppercase"}}>{t("editModal.dateLabel")}</span>
                    <span style={{fontSize:11,fontWeight:700}}>📅 {editForm.data}</span>
                  </button>
                  <button onClick={()=>{setShowTimePicker(true);setShowDatePicker(false);}} style={{background:"#0f172a",color:"#fff",border:"none",borderRadius:12,padding:"7px 10px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1}} className="hover:bg-slate-800 transition-all">
                    <span style={{fontSize:7,color:"#64748b",fontWeight:700,textTransform:"uppercase"}}>{t("editModal.timeLabel")}</span>
                    <span style={{fontSize:11,fontWeight:700}}>🕐 {editForm.ora||"—"}</span>
                  </button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  {[{label:t("editModal.phoneLabel"),key:"telefon"},{label:t("editModal.emailLabel"),key:"email"}].map(f=>(
                    <div key={f.key} style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:12,padding:"7px 10px"}}>
                      <p style={{fontSize:7,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",marginBottom:2}}>{f.label}</p>
                      <input style={{width:"100%",background:"transparent",border:"none",fontSize:11,fontWeight:700,color:"#1e293b",outline:"none"}} value={(editForm as any)[f.key]||""} onChange={e=>setEditForm(p=>p?{...p,[f.key]:e.target.value}:null)}/>
                    </div>
                  ))}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  <div style={{background:"#0f172a",borderRadius:12,padding:"7px 10px"}}>
                    <p style={{fontSize:7,fontWeight:700,color:"#f59e0b",textTransform:"uppercase",marginBottom:2}}>{t("editModal.specialistLabel")}</p>
                    <select style={{width:"100%",background:"transparent",border:"none",fontSize:11,fontWeight:700,color:"#fff",outline:"none",cursor:"pointer"}}
                      value={editForm.expertId||""}
                      onChange={e=>{
                        const nid=e.target.value;
                        const sp=rawStaff.find(s=>s.id===nid);
                        const ok=editForm.serviciuId&&sp?.services?.includes(editForm.serviciuId);
                        setEditForm(p=>p?{...p,expertId:nid,serviciuId:ok?p.serviciuId:""}:null);
                      }}>
                      <option value="" style={{background:"#0f172a"}}>{t("editModal.chooseOpt")}</option>
                      {(editForm.serviciuId?rawStaff.filter(s=>s.services?.includes(editForm.serviciuId!)):rawStaff)
                        .map(o=><option key={o.id} value={o.id} style={{background:"#0f172a"}}>{o.name}</option>)}
                    </select>
                  </div>
                  <div style={{background:"#0f172a",borderRadius:12,padding:"7px 10px"}}>
                    <p style={{fontSize:7,fontWeight:700,color:"#f59e0b",textTransform:"uppercase",marginBottom:2}}>{t("editModal.serviceLabel")}</p>
                    <select style={{width:"100%",background:"transparent",border:"none",fontSize:11,fontWeight:700,color:"#fff",outline:"none",cursor:"pointer"}}
                      value={editForm.serviciuId||""}
                      onChange={e=>{
                        const nid=e.target.value;
                        const sp=rawStaff.find(s=>s.id===editForm.expertId);
                        const ok=editForm.expertId&&sp?.services?.includes(nid);
                        setEditForm(p=>p?{...p,serviciuId:nid,expertId:ok?p.expertId:""}:null);
                      }}>
                      <option value="" style={{background:"#0f172a"}}>{t("editModal.chooseOpt")}</option>
                      {(editForm.expertId?rawServices.filter(s=>{const sp=rawStaff.find(x=>x.id===editForm.expertId);return sp?.services?.includes(s.id);}):rawServices)
                        .map(o=><option key={o.id} value={o.id} style={{background:"#0f172a"}}>{o.nume_serviciu}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:12,padding:"7px 10px"}}>
                  <p style={{fontSize:7,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",marginBottom:2}}>{t("editModal.notesLabel")}</p>
                  <textarea style={{width:"100%",background:"transparent",border:"none",fontSize:11,fontWeight:700,color:"#334155",outline:"none",resize:"none"}} rows={2} value={editForm.motiv||""} onChange={e=>setEditForm(p=>p?{...p,motiv:e.target.value}:null)}/>
                </div>
                <DocumentsSection editForm={editForm} userId={userId} setEditForm={setEditForm} qClient={qClient}/>
                <div style={{border:"1.5px solid",borderColor:hasWA?"#bbf7d0":"#e2e8f0",borderRadius:12,padding:"8px 10px",background:hasWA?"#f0fdf4":"#f8fafc",opacity:hasWA?1:0.6}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                    <div style={{flex:1}}>
                      <p style={{fontSize:7,fontWeight:700,textTransform:"uppercase",color:hasWA?"#15803d":"#94a3b8",marginBottom:3}}>{t("editModal.whatsappLabel")}</p>
                      <input style={{width:"100%",background:"transparent",border:"none",fontSize:10,fontWeight:600,color:hasWA?"#334155":"#94a3b8",outline:"none",cursor:hasWA?"text":"not-allowed"}}
                        value={hasWA?customMsg:t("editModal.whatsappUnavailable")}
                        onChange={e=>{if(hasWA)setCustomMsg(e.target.value);}}
                        readOnly={!hasWA}/>
                    </div>
                    {hasWA&&(
                      <button onClick={()=>{const c=editForm.telefon?.replace(/\D/g,"");window.open(`https://wa.me/${c?.startsWith("0")?"4"+c:c}?text=${encodeURIComponent(customMsg)}`,"_blank");}}
                        style={{background:"#16a34a",color:"#fff",border:"none",borderRadius:8,padding:"6px 10px",fontSize:10,fontWeight:700,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}} className="hover:bg-green-700 transition-all">
                        {t("editModal.whatsappSendBtn")}
                      </button>
                    )}
                  </div>
                </div>
                <div style={{display:"flex",gap:6,paddingTop:2,borderTop:"1.5px solid #f1f5f9"}}>
                  <button onClick={closeModal} style={{flex:1,padding:"8px",background:"#f1f5f9",border:"none",borderRadius:12,fontSize:11,fontWeight:700,color:"#64748b",cursor:"pointer"}} className="hover:bg-slate-200 transition-all">{t("editModal.cancelBtn")}</button>
                  <button onClick={handleUpdate} style={{flex:2,padding:"8px",background:"#0f172a",border:"none",borderRadius:12,fontSize:11,fontWeight:700,color:"#fff",cursor:"pointer"}} className="hover:bg-amber-600 transition-all">{t("editModal.saveBtn")}</button>
                  <button onClick={handleDelete} style={{width:36,padding:"8px",background:"#fff1f2",border:"1.5px solid #fecdd3",borderRadius:12,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} className="hover:bg-red-500 hover:text-white transition-all" title={t("editModal.deleteTooltip")}>🗑️</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {newForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.72)",backdropFilter:"blur(6px)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setNewForm(null)}>
          <div style={{background:"#fff",width:"100%",maxWidth:480,borderRadius:24,overflow:"hidden",boxShadow:"0 24px 60px rgba(0,0,0,0.22)",padding:20,display:"flex",flexDirection:"column",gap:10}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><h2 style={{fontSize:16,fontWeight:700,color:"#1e293b",margin:0}}>{t("newModal.title")}</h2><button onClick={()=>setNewForm(null)} style={{width:32,height:32,background:"#f1f5f9",border:"none",borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:700,color:"#64748b"}} className="hover:bg-red-500 hover:text-white transition-all">✕</button></div>
            <div style={{background:"#fffbeb",border:"1.5px solid #fcd34d",borderRadius:14,padding:"10px 14px"}}><p style={{fontSize:13,fontWeight:700,color:"#92400e",margin:0}}>📅 {newForm.date} · {newForm.time}</p></div>
            <div style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:14,padding:"10px 14px"}}><p style={{fontSize:8,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",marginBottom:4}}>{t("newModal.nameLabel")}</p><input style={{width:"100%",background:"transparent",border:"none",fontSize:14,fontWeight:700,color:"#1e293b",outline:"none"}} placeholder={t("newModal.namePlaceholder")} value={newForm.nume} onChange={e=>setNewForm(p=>p?{...p,nume:e.target.value}:null)}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{[{label:t("newModal.phoneLabel"),key:"telefon"},{label:t("newModal.emailLabel"),key:"email"}].map(f=>(<div key={f.key} style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:14,padding:"10px 14px"}}><p style={{fontSize:8,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",marginBottom:4}}>{f.label}</p><input style={{width:"100%",background:"transparent",border:"none",fontSize:12,fontWeight:700,color:"#1e293b",outline:"none"}} value={(newForm as any)[f.key]} onChange={e=>setNewForm(p=>p?{...p,[f.key]:e.target.value}:null)}/></div>))}</div>
            {/* ✅ FIX: Specialist și Serviciu acum se filtrează reciproc, la fel ca în modalul de editare */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div style={{background:"#0f172a",borderRadius:14,padding:"10px 14px"}}>
                <p style={{fontSize:8,fontWeight:700,color:"#f59e0b",textTransform:"uppercase",marginBottom:4}}>{t("newModal.specialistLabel")}</p>
                <select style={{width:"100%",background:"transparent",border:"none",fontSize:11,fontWeight:700,color:"#fff",outline:"none",cursor:"pointer"}}
                  value={newForm.expertId}
                  onChange={e=>{
                    const nid=e.target.value;
                    const sp=rawStaff.find(s=>s.id===nid);
                    const ok=newForm.serviciuId&&sp?.services?.includes(newForm.serviciuId);
                    setNewForm(p=>p?{...p,expertId:nid,serviciuId:ok?p.serviciuId:""}:null);
                  }}>
                  <option value="" style={{background:"#0f172a"}}>{t("newModal.chooseOpt")}</option>
                  {newAngOpts.map(o=><option key={o.id} value={o.id} style={{background:"#0f172a"}}>{o.name}</option>)}
                </select>
              </div>
              <div style={{background:"#0f172a",borderRadius:14,padding:"10px 14px"}}>
                <p style={{fontSize:8,fontWeight:700,color:"#f59e0b",textTransform:"uppercase",marginBottom:4}}>{t("newModal.serviceLabel")}</p>
                <select style={{width:"100%",background:"transparent",border:"none",fontSize:11,fontWeight:700,color:"#fff",outline:"none",cursor:"pointer"}}
                  value={newForm.serviciuId}
                  onChange={e=>{
                    const nid=e.target.value;
                    const sp=rawStaff.find(s=>s.id===newForm.expertId);
                    const ok=newForm.expertId&&sp?.services?.includes(nid);
                    setNewForm(p=>p?{...p,serviciuId:nid,expertId:ok?p.expertId:""}:null);
                  }}>
                  <option value="" style={{background:"#0f172a"}}>{t("newModal.chooseOpt")}</option>
                  {newSvcOpts.map(o=><option key={o.id} value={o.id} style={{background:"#0f172a"}}>{o.nume_serviciu}</option>)}
                </select>
              </div>
            </div>
            <div style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:14,padding:"10px 14px"}}><p style={{fontSize:8,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",marginBottom:4}}>{t("newModal.notesLabel")}</p><textarea style={{width:"100%",background:"transparent",border:"none",fontSize:11,fontWeight:700,color:"#334155",outline:"none",resize:"none"}} rows={2} value={newForm.motiv} onChange={e=>setNewForm(p=>p?{...p,motiv:e.target.value}:null)}/></div>
            <div style={{display:"flex",gap:8,paddingTop:4}}>
              <button onClick={()=>setNewForm(null)} style={{flex:1,padding:"10px",background:"#f1f5f9",border:"none",borderRadius:14,fontSize:11,fontWeight:700,color:"#64748b",cursor:"pointer"}} className="hover:bg-slate-200 transition-all">{t("newModal.cancelBtn")}</button>
              <button style={{flex:2,padding:"10px",background:"#0f172a",border:"none",borderRadius:14,fontSize:11,fontWeight:700,color:"#fff",cursor:"pointer"}} className="hover:bg-amber-600 transition-all"
                onClick={async()=>{
                  if(!newForm)return;
                  const durNew=rawServices.find(s=>s.id===newForm.serviciuId)?.duration||15;
                  if(hasSpecialistConflict(programari,newForm.expertId||"",newForm.date,newForm.time,durNew)){
                    await showToast({message:t("specialistConflictError"),type:"error"});
                    return;
                  }
                  const{error}=await supabase.from("appointments").insert({title:newForm.nume,prenume:newForm.nume,nume:newForm.nume,email:newForm.email||null,date:newForm.date,time:newForm.time,phone:newForm.telefon||null,details:newForm.motiv||null,angajat_id:newForm.expertId||null,serviciu_id:newForm.serviciuId||null,user_id:userId,duration:durNew});
                  if(error){await showToast({message:error.message,type:"error"});return;}
                  qClient.invalidateQueries({queryKey:["appointments",userId]});
                  await showToast({message:t("newModal.addedToast"),type:"success"});
                  setNewForm(null);
                }}>{t("newModal.saveBtn")}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{flexShrink:0,background:"#fff",borderBottom:"2px solid #e2e8f0",padding:"8px 14px",display:"flex",alignItems:"center",gap:10}}>
        <Link href="/programari" style={{flexShrink:0}}>
          <div style={{width:34,height:34,background:"#f1f5f9",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"#334155",cursor:"pointer",border:"none",transition:"all 0.15s"}} className="hover:bg-slate-900 hover:text-white">←</div>
        </Link>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <div style={{width:34,height:34,background:"#0f172a",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <span style={{color:"#f59e0b",fontWeight:700,fontSize:13}}>C</span>
          </div>
          <div className="hidden sm:block">
            <p style={{fontSize:13,fontWeight:700,color:"#1e293b",margin:0,lineHeight:1.2}}>{t("headerTitle")} <span style={{color:"#d97706"}}>{t("headerHighlight")}</span></p>
            <p style={{fontSize:8,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",margin:0}}>{isLoading?t("syncing"):t("synced")}</p>
          </div>
        </div>
        <div className="hidden md:block" style={{flexShrink:0,padding:"5px 12px",background:"#f8fafc",borderRadius:10,border:"1.5px solid #e2e8f0"}}>
          <span style={{fontSize:11,fontWeight:700,color:"#334155",textTransform:"capitalize"}}>{dateTitles[viewMode]}</span>
        </div>
        <div style={{flex:1,maxWidth:280,position:"relative"}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"#94a3b8"}}>🔍</span>
          <input type="text" placeholder={t("searchPlaceholder")} value={searchTerm}
            onChange={e=>{setSearchTerm(e.target.value);handleSearch(e.target.value);}}
            onFocus={()=>{if(searchTerm.trim())setShowSearchDrop(true);}}
            style={{width:"100%",background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:10,padding:"6px 40px 6px 32px",fontSize:11,fontWeight:700,color:"#334155",outline:"none"}}
            className="focus:border-amber-400 transition-all"/>
          <button onClick={()=>{handleSearch(searchTerm);setShowSearchDrop(true);}} style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"#0f172a",color:"#fff",border:"none",borderRadius:7,padding:"3px 8px",fontSize:9,fontWeight:700,cursor:"pointer"}} className="hover:bg-amber-600 transition-all">{t("searchBtn")}</button>
          {showSearchDrop&&searchResults.length>0&&(
            <div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:4,background:"#fff",border:"1.5px solid #e2e8f0",borderRadius:12,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",zIndex:50,maxHeight:240,overflowY:"auto"}}>
              {searchResults.map(p=>(<button key={p.id} onClick={()=>{setSearchTerm(p.nume);setShowSearchDrop(false);openEdit(p);}} style={{width:"100%",padding:"10px 14px",borderBottom:"1px solid #f1f5f9",textAlign:"left",background:"transparent",border:"none",cursor:"pointer"}} className="hover:bg-slate-50 transition-all"><span style={{fontSize:12,fontWeight:700,color:"#1e293b",display:"block"}}>{p.nume}</span><div style={{display:"flex",gap:8}}>{p.telefon&&<span style={{fontSize:9,color:"#94a3b8"}}>📞 {p.telefon}</span>}{p.isOnline&&<span style={{fontSize:9,color:"#3b82f6",fontWeight:700}}>🌐 {t("onlineLabel")}</span>}</div></button>))}
            </div>
          )}
        </div>
        <div style={{display:"flex",background:"#f1f5f9",padding:3,borderRadius:10,gap:2,marginLeft:"auto",flexShrink:0}}>
          {(["day","week","month","year"] as ViewMode[]).map(opt=>(
            <button key={opt} onClick={()=>setViewMode(opt)} style={btnStyle(viewMode===opt)}>
              {opt==="day"?t("viewDay"):opt==="week"?t("viewWeek"):opt==="month"?t("viewMonth"):t("viewYear")}
            </button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
          <button onClick={()=>nav(-1)} style={{width:32,height:32,background:"#f1f5f9",border:"1.5px solid #e2e8f0",borderRadius:8,cursor:"pointer",fontSize:16,fontWeight:700,color:"#334155",display:"flex",alignItems:"center",justifyContent:"center"}} className="hover:bg-slate-200 transition-all">‹</button>
          <button onClick={()=>setSelectedDate(new Date())} style={{padding:"4px 10px",background:"transparent",border:"none",cursor:"pointer",fontSize:10,fontWeight:700,color:"#64748b"}} className="hover:text-amber-600 transition-colors">{t("todayBtn")}</button>
          <button onClick={()=>nav(1)} style={{width:32,height:32,background:"#f1f5f9",border:"1.5px solid #e2e8f0",borderRadius:8,cursor:"pointer",fontSize:16,fontWeight:700,color:"#334155",display:"flex",alignItems:"center",justifyContent:"center"}} className="hover:bg-slate-200 transition-all">›</button>
        </div>
        {userSub&&<span style={{fontSize:8,background:"#f1f5f9",color:"#94a3b8",padding:"4px 8px",borderRadius:7,fontWeight:700,textTransform:"uppercase",flexShrink:0}} className="hidden lg:block">{userSub.plan}</span>}
      </div>

      {profileIsError && (
        <div style={{margin:"10px 14px", padding:"14px 18px", background:"#fffbeb", border:"2px solid #fde68a", borderRadius:20, display:"flex", flexWrap:"wrap", alignItems:"center", justifyContent:"space-between", gap:10}}>
          <p style={{fontSize:12, fontWeight:700, color:"#92400e", margin:0}}>{t("techErrorBannerMsg")}</p>
          <button onClick={()=>refetchProfile()} style={{padding:"8px 16px", background:"#0f172a", color:"#fff", border:"none", borderRadius:10, fontSize:10, fontWeight:900, textTransform:"uppercase", fontStyle:"italic", cursor:"pointer"}} className="hover:bg-amber-500 hover:text-black transition-all">
            {t("techErrorRetryBtn")}
          </button>
        </div>
      )}

      {(viewMode==="day"||viewMode==="week")&&(
        <WeekStrip selectedDate={selectedDate} onSelectDate={d=>{setSelectedDate(d);setViewMode("day");}} programariByDate={programariByDate} adminWorkingHours={viewWorkingHours}/>
      )}

      <FilterBar rawStaff={rawStaff} rawServices={rawServices} programari={programari}
        selectedExpert={selectedExpert} onSelectExpert={handleSelectExpert}
        selectedServiciu={selectedServiciu} onSelectServiciu={handleSelectServiciu}
        selectedDate={selectedDate}/>

      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",minHeight:0}}>
        {isLoading&&<div style={{height:3,background:"#fef3c7",overflow:"hidden",flexShrink:0}}><div style={{height:"100%",width:"33%",background:"#f59e0b"}} className="animate-pulse"/></div>}
        {viewMode==="day"&&(
          <DayView selectedDate={selectedDate} programari={filteredProg} rawStaff={rawStaff} rawServices={rawServices} serviceById={serviceById}
            onEdit={openEdit} adminWorkingHours={viewWorkingHours} selectedExpert={selectedExpert} selectedServiciu={selectedServiciu}
            onSelectServiciu={handleSelectServiciu}
            onAddNew={(time,date)=>setNewForm({date,time,nume:"",telefon:"",email:"",serviciuId:"",expertId:selectedExpert||rawStaff[0]?.id||"",motiv:""})}/>
        )}
        {viewMode==="week"&&(
          <WeekView selectedDate={selectedDate} programariByDate={programariByDate} rawStaff={rawStaff} rawServices={rawServices} serviceById={serviceById}
            onEdit={openEdit} selectedExpert={selectedExpert} selectedServiciu={selectedServiciu} adminWorkingHours={viewWorkingHours}
            onSelectDate={d=>{setSelectedDate(d);setViewMode("day");}}/>
        )}
        {viewMode==="month"&&(
          <MonthView selectedDate={selectedDate} programariByDate={programariByDate} rawStaff={rawStaff} serviceById={serviceById}
            onEdit={openEdit} onDayClick={d=>{setSelectedDate(d);setViewMode("day");}} selectedExpert={selectedExpert} selectedServiciu={selectedServiciu} adminWorkingHours={viewWorkingHours}/>
        )}
        {viewMode==="year"&&(
          <YearView selectedDate={selectedDate} programariByDate={programariByDate} onMonthClick={(yr,mo)=>{setSelectedDate(new Date(yr,mo,1));setViewMode("month");}}/>
        )}
      </div>
    </div>
  );
}
// ─── Root ─────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const [queryClient] = useState(()=>new QueryClient({defaultOptions:{queries:{staleTime:1000*60*5,refetchOnWindowFocus:false,retry:1}}}));
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f8fafc"}}><div style={{width:44,height:44,background:"#0f172a",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center"}} className="animate-pulse"><span style={{color:"#f59e0b",fontWeight:700,fontSize:16}}>C</span></div></div>}>
        <CalendarContent/>
      </Suspense>
    </QueryClientProvider>
  );
}