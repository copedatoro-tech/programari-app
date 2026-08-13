"use client";
import React, { useState, useEffect, useMemo, Suspense, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { showToast, showConfirm } from "@/lib/toast";
import { useTranslations } from "next-intl";
import { ChronosTimePicker, ChronosDatePicker } from "@/components/ChronosDateTimePickers";
import SimpleTimePicker from "@/components/SimpleTimePicker";
// --- Constants ----------------------------------------------------------------
const SLOT_H = 34;
const TIME_COL_W = 44;
// --- Utils --------------------------------------------------------------------
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
// ? Blocare timp per specialist ΓÇö folosim acela?i format ca la blocarea
// generala din Setari (Record<data, lista de sloturi de 15 min>), dar stocat
// direct pe r├óndul specialistului din tabela "staff", nu pe tot business-ul.
function parseStaffBlocks(d: any): Record<string, string[]> {
  if (!d || typeof d !== "object" || Array.isArray(d)) return {};
  return d as Record<string, string[]>;
}
function generateSlotRange(start: string, end: string): string[] {
  const out: string[] = [];
  const s = timeToMin(start), e = timeToMin(end);
  if (e <= s) return out;
  for (let m = s; m < e; m += 15) out.push(`${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`);
  return out;
}
function isWorkingSlot(slot: string, start: string, end: string) {
  const s = timeToMin(slot), ws = timeToMin(start), we = timeToMin(end === "00:00" ? "24:00" : end);
  return s >= ws && s < we;
}
const ALL_SLOTS: string[] = [];
for (let m = 0; m < 24*60; m += 15)
  ALL_SLOTS.push(`${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`);
// ? Verificare suprapunere pentru ACELA?I specialist (indiferent de serviciu).
// Speciali?ti diferi?i pot avea programari la aceea?i ora, chiar pe acela?i serviciu.
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
// --- Sunet notificare (2 tonuri, generate ΓÇö fara fi?ier audio necesar) --------
function playNotificationSound(volume: number = 75) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const peakGain = 0.18 * Math.max(0, Math.min(100, volume)) / 100;
    const beep = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(Math.max(peakGain, 0.001), ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };
    beep(880, 0, 0.22);
    beep(1175, 0.16, 0.28);
  } catch {}
}
// --- Notificare de sistem (browser) ΓÇö apare chiar daca tab-ul nu e activ ------
function playSystemNotification(title: string, body: string) {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    new Notification(title, { body, icon: "/logo-chronos.png" });
  } catch {}
}
// --- Types --------------------------------------------------------------------
type DocAtt = { id: number|string; name: string; url: string };
type Prog = {
  id: any; nume: string; email?: string; data: string; ora: string;
  telefon?: string; motiv?: string; poza?: string; documente: DocAtt[];
  expertId?: string; serviciuId?: string; duration?: number; isOnline?: boolean;
  totalPrice?: number; amountPaid?: number; paymentStatus?: string;
  workLocationId?: string; workLocationName?: string; workLocationAddress?: string; workLocationMapsUrl?: string;
};
type ViewMode = "day"|"week"|"month"|"year";
type ManualBlocks = Record<string, string[]>;
type WorkLocationRow = { id: string; name: string; address?: string; maps_url?: string; service_ids?: string[]; staff_ids?: string[] };
interface StaffRow   { id: string; name: string; services: string[]; working_hours?: any; manual_blocks?: any; can_view_client_contact?: boolean }
interface ServiceRow { id: string; nume_serviciu: string; price: number; duration: number }
interface WorkingHour{ day: string; start: string; end: string; closed: boolean }
type NotificationSettings = { in_app_enabled: boolean; system_enabled: boolean; sound_enabled: boolean; volume: number };
const DEFAULT_NOTIF_SETTINGS: NotificationSettings = { in_app_enabled: true, system_enabled: false, sound_enabled: true, volume: 75 };
// --- Colors -------------------------------------------------------------------
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
// --- Helpers ------------------------------------------------------------------
function normDocs(raw: any): DocAtt[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((it: any, i: number) => typeof it === "string"
    ? { id: i, name: `Document ${i+1}`, url: it }
    : { id: it.idi, name: it.name`Document ${i+1}`, url: it.urlit });
}
function mapRow(it: any): Prog {
  const raw: string = it.date || "";
  return {
    id: it.id, nume: it.title||it.prenume||it.nume||"Client",
    email: it.email || "", data: raw.includes("T") ? raw.split("T")[0] : raw,
    ora: it.time || "", telefon: it.phone || "", motiv: it.details || "",
    poza: it.poza ?? it.file_url ?? null, documente: normDocs(it.documente),
    expertId: it.angajat_id || "", serviciuId: it.serviciu_id || "",
    duration: it.duration ?? 0, isOnline: it.is_client_booking ?? false,
    totalPrice: it.total_price || 0, amountPaid: it.amount_paid || 0, paymentStatus: it.payment_status || "unpaid",
    workLocationId: it.work_location_id || "", workLocationName: it.work_location_name || "", workLocationAddress: it.work_location_address || "", workLocationMapsUrl: it.work_location_maps_url || "",
  };
}
// --- Sanitizare nume fi?ier (diacritice RO + caractere speciale) --------------
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
// --- AppointmentHoverCard -----------------------------------------------------
interface HoverCardProps {
  prog: Prog;
  anchorRect: DOMRect;
  serviceById: Record<string, ServiceRow>;
  rawStaff: StaffRow[];
  staffColorIndex: number;
  onClose: () => void;
}
function AppointmentHoverCard({ prog, anchorRect, serviceById, rawStaff, staffColorIndex }: HoverCardProps) {
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
              {prog.isOnline&&<span style={{marginLeft:5}}>{t("onlineLabel")}</span>}
            </p>
          </div>
        </div>
        <div style={{padding:"11px 15px",display:"flex",flexDirection:"column",gap:7}}>
          {svc&&<div style={{display:"flex",alignItems:"flex-start",gap:9}}><span style={{fontSize:13,color:"#94a3b8",flexShrink:0,marginTop:1}}></span><div><span style={{fontSize:12,fontWeight:700,color:"#334155"}}>{svc.nume_serviciu}</span>{svc.duration>0&&<span style={{fontSize:10,color:"#94a3b8",marginLeft:7}}>{svc.duration} min</span>}{svc.price>0&&<span style={{fontSize:10,fontWeight:700,color:"#059669",marginLeft:7}}>{svc.price} RON</span>}</div></div>}
          {prog.paymentStatus==="deposit_paid"&&<div style={{background:"#fffbeb",borderRadius:9,padding:"7px 9px",border:"1px solid #fcd34d",display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:13}}></span><span style={{fontSize:11,fontWeight:700,color:"#92400e"}}>{t("depositPaidLabel",{paid:(prog.amountPaid||0).toFixed(0),rest:((prog.totalPrice||0)-(prog.amountPaid||0)).toFixed(0)})}</span></div>}
          {prog.paymentStatus==="fully_paid"&&<div style={{background:"#ecfdf5",borderRadius:9,padding:"7px 9px",border:"1px solid #6ee7b7",display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:13}}>✅</span><span style={{fontSize:11,fontWeight:700,color:"#065f46"}}>{t("fullyPaidLabel")}</span></div>}
          {staff&&<div style={{display:"flex",alignItems:"center",gap:9}}><span style={{fontSize:13,color:"#94a3b8",flexShrink:0}}></span><span style={{fontSize:12,fontWeight:700,color:"#334155"}}>{staff.name}</span></div>}
          {prog.telefon&&<div style={{display:"flex",alignItems:"center",gap:9}}><span style={{fontSize:13,color:"#94a3b8",flexShrink:0}}></span><span style={{fontSize:12,fontWeight:600,color:"#475569"}}>{prog.telefon}</span></div>}
          {prog.email&&<div style={{display:"flex",alignItems:"center",gap:9}}><span style={{fontSize:13,color:"#94a3b8",flexShrink:0}}></span><span style={{fontSize:11,color:"#475569",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{prog.email}</span></div>}
          {prog.motiv&&<div style={{background:"#f8fafc",borderRadius:9,padding:"7px 9px",border:"1px solid #e2e8f0"}}><p style={{fontSize:11,color:"#64748b",margin:0,lineHeight:1.45}}>{prog.motiv}</p></div>}
          <div style={{borderTop:"1px solid #f1f5f9",marginTop:2,paddingTop:7}}>
            <span style={{fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em"}}>{t("hoverHint")}</span>
          </div>
        </div>
      </div>
    </>
  );
}
// --- TimeColumn ---------------------------------------------------------------
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
            paddingRight:4, paddingTop:4, userSelect:"none",
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
// --- WeekStrip ----------------------------------------------------------------
function WeekStrip({ selectedDate, onSelectDate, programariByDate, adminWorkingHours }: {
  selectedDate: Date; onSelectDate: (d: Date) => void;
  programariByDate: Record<string, Prog[]>; adminWorkingHours: WorkingHour[];
}) {
  const t = useTranslations("calendarPage");
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
  const weekNumber = useMemo(() => {
    const d = new Date(Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()));
    const dayNum = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    return 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  }, [weekStart]);
  return (
    <div style={{ flexShrink:0, background:"#fff", borderBottom:"2px solid #e2e8f0" }}>
      <div style={{ display:"flex", alignItems:"stretch", minHeight:44 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"0 8px", borderRight:"2px solid #e2e8f0", flexShrink:0, minWidth:140 }}>
          <div style={{ textAlign:"center" }}>
            <p style={{ fontSize:10, fontWeight:700, color:"#1e293b", lineHeight:1.2 }}>Saptamana {weekNumber}</p>
            <p style={{ fontSize:8, fontWeight:700, color:"#94a3b8", marginTop:1 }}>{monthLabel}</p>
          </div>
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
                  gap:1, padding:"4px 2px", border:"none", cursor:"pointer", position:"relative",
                  borderLeft: i===0 ? "none" : "1px solid #f1f5f9",
                  background: isSel ? "#0f172a" : isClosed ? "#fff5f5" : isToday ? "#fffbeb" : "#fff",
                  borderBottom: isSel ? "2px solid #f59e0b" : isClosed ? "2px solid #fca5a5" : "2px solid transparent",
                  transition:"background 0.15s",
                }}>
                <span style={{ fontSize:8, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color: isSel?"#f59e0b":isToday?"#d97706":isClosed?"#f87171":"#64748b" }}>
                  {dayShort[dow]}
                </span>
                <span style={{ fontSize:14, fontWeight:700, lineHeight:1.1, color: isSel?"#fff":isToday?"#d97706":isClosed?"#f87171":"#1e293b" }}>
                  {day.getDate()}
                </span>
                {total>0&&(
                  <div style={{ display:"flex", gap:2, alignItems:"center" }}>
                    <span style={{ fontSize:8, fontWeight:700, padding:"0px 5px", borderRadius:99, background:isSel?"#f59e0b":isToday?"#f59e0b":"#e2e8f0", color:isSel||isToday?"#fff":"#475569" }}>{total}</span>
                    {online>0&&<span style={{ fontSize:8, fontWeight:700, padding:"0px 4px", borderRadius:99, background:"#3b82f6", color:"#fff" }}>{online}</span>}
                  </div>
                )}
                {isClosed&&<span style={{ fontSize:6, fontWeight:700, color:"#f87171" }}>{t("closedBadge")}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
// --- FilterDropdownButton ΓÇö buton compact cu panou de cautare + scroll --------
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
          display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 999,
          border: "1.5px solid #0f172a",
          background: "#0f172a", color: "#f59e0b",
          fontSize: 10, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
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
                  {item.label}{item.sub && <span style={{ opacity: 0.5, fontWeight: 600 }}> ┬╖ {item.sub}</span>}
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
// --- FilterBar ----------------------------------------------------------------
function FilterBar({ rawStaff, rawServices, programari, selectedExpert, onSelectExpert, selectedServiciu, onSelectServiciu, selectedDate, workLocations, selectedWorkLocation, onSelectWorkLocation }: {
  rawStaff: StaffRow[]; rawServices: ServiceRow[]; programari: Prog[];
  selectedExpert: string; onSelectExpert: (id: string) => void;
  selectedServiciu: string; onSelectServiciu: (id: string) => void;
  selectedDate: Date;
  workLocations: { id: string; name: string }[]; selectedWorkLocation: string; onSelectWorkLocation: (id: string) => void;
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
    return { id: svc.id, label: svc.nume_serviciu, sub: parts.length?parts.join(" ┬╖ "):undefined, count: cntSvc[svc.id]||0 };
  });

  const locationItems: DropdownItem[] = workLocations.map((loc) => ({ id: loc.id, label: loc.name, count: 0 }));

  return (
    <div style={{ flexShrink:0, background:"#fff", borderBottom:"2px solid #e2e8f0", padding:"5px 10px", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
      {workLocations.length>0&&(
        <FilterDropdownButton label="Punct" allLabel="Toate" placeholder="Cauta punct de lucru..."
          items={locationItems} selectedId={selectedWorkLocation}
          onSelect={onSelectWorkLocation} />
      )}
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
// --- SummaryBar ---------------------------------------------------------------
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
        return <button key={it.id} onClick={()=>onSelectServiciu(isSel?"":it.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:999,border:`1.5px solid ${isSel?c.text:c.border}`,background:c.bg,color:c.text,fontSize:10,fontWeight:700,cursor:"pointer",flexShrink:0,transition:"all 0.15s"}}>{it.nume_serviciu} <span style={{fontWeight:800}}>├ù{it.total}</span>{it.online>0&&<span style={{fontSize:9,opacity:0.7}}>({it.online})</span>}</button>;
      })}
    </div>
  );
}
// --- DayView ------------------------------------------------------------------
function DayView({ selectedDate, programari, rawStaff, rawServices, serviceById, onEdit, adminWorkingHours, adminManualBlocks, selectedExpert, selectedServiciu, onSelectServiciu, onAddNew, onSwipeDay, onBlocksSaved, userId }: {
  selectedDate: Date; programari: Prog[]; rawStaff: StaffRow[];
  rawServices: ServiceRow[]; serviceById: Record<string,ServiceRow>;
  onEdit: (p: Prog) => void; onAddNew: (time: string, date: string, staffId: string) => void;
  adminWorkingHours: WorkingHour[]; adminManualBlocks: ManualBlocks; selectedExpert: string; selectedServiciu: string;
  onSelectServiciu: (id: string) => void;
  onSwipeDay: (dir: number) => void; onBlocksSaved: () => void; userId: string | undefined;
}) {
  const t = useTranslations("calendarPage");
  const dayLong = t.raw("dayLong") as string[];
  const dateKey = formatDateKey(selectedDate);
  const dayName = dayLong[selectedDate.getDay()];
  const ds = adminWorkingHours.find(h=>h.day===dayName);
  const dayManualBlocks = (adminManualBlocks[dateKey] || []).length;
  const isFullyBlocked = dayManualBlocks >= 94;
  const isClosed = !!ds?.closed || isFullyBlocked;
  const nowRef = new Date();
  const todayKeyRef = formatDateKey(nowRef);
  const nowMinutesRef = nowRef.getHours()*60+nowRef.getMinutes();
  const whStart = ds?.start||"";
  const whEnd   = ds?.end||"";
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoverCard, setHoverCard] = useState<{prog:Prog;rect:DOMRect}|null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const longPressFired = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const slots = useMemo(() => {
    if (isClosed||!whStart||!whEnd) return ALL_SLOTS;
    const s = Math.max(0, timeToMin(whStart)-30);
    const e = Math.min(24*60, timeToMin(whEnd==="00:00"?"24:00":whEnd)+30);
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
  // ? Coloane pe specialist (stil Mero/Fresha) ΓÇö fiecare specialist activ ├«n
  // ziua curenta prime?te propria coloana verticala, ├«n loc de suprapuneri
  // grupate pe interval orar. Daca e filtrat un singur specialist, apare o
  // singura coloana. Programarile fara specialist asignat merg ├«ntr-o coloana
  // separata "ΓÇö", afi?ata ultima.
  const dayStaffList = useMemo(() => {
    if (selectedExpert) {
      const st = rawStaff.find(s => s.id === selectedExpert);
      return st ? [st] : [];
    }

    return rawStaff;
  }, [selectedExpert, rawStaff]);
  const hasUnassigned = useMemo(
    () => dayAppts.some(p => !p.expertId || !dayStaffList.some(s => s.id === p.expertId)),
    [dayAppts, dayStaffList]
  );
  const colIndexOf = useMemo(() => {
    const m: Record<string, number> = {};
    dayStaffList.forEach((s, i) => { m[s.id] = i; });
    return m;
  }, [dayStaffList]);
  const totalCols = Math.max(dayStaffList.length + (hasUnassigned ? 1 : 0), 1);
  const MIN_COL_W = 34;
  const showColName = dayStaffList.length + (hasUnassigned?1:0) <= 4;
  const gridMinWidth = `max(100%, ${TIME_COL_W + totalCols * MIN_COL_W}px)`;
  // ? Blocarile per specialist (salvate pe staff.manual_blocks), citite pentru
  // ziua curenta ΓÇö folosite ca sa dezactivam sloturile blocate din fiecare
  // coloana ?i sa le desenam ha?urat.
  const staffBlocksBySlot = useMemo(() => {
    const m: Record<string, Record<string,string[]>> = {};
    rawStaff.forEach(s => { m[s.id] = parseStaffBlocks(s.manual_blocks); });
    return m;
  }, [rawStaff]);
  const [slotMenu, setSlotMenu] = useState<{ x:number; y:number; time:string; staffId:string } | null>(null);
  const [blockPopup, setBlockPopup] = useState<{ date:string; staffId:string; start:string; end:string } | null>(null);
  const [savingBlock, setSavingBlock] = useState(false);
  const touchStartRef = useRef<{ x:number; y:number; atLeftEdge:boolean; atRightEdge:boolean } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    const el = scrollRef.current;
    const t = e.touches[0];
    const atLeftEdge = el ? el.scrollLeft <= 2 : true;
    const atRightEdge = el ? el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 : true;
    touchStartRef.current = { x: t.clientX, y: t.clientY, atLeftEdge, atRightEdge };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x, dy = t.clientY - start.y;
    // ? Doar daca gestul e clar orizontal ?i porne?te de la marginea la care
    // ar duce oricum scroll-ul de coloane (sau daca e o singura coloana, oric├ónd)
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0 && start.atRightEdge) onSwipeDay(1);
    else if (dx > 0 && start.atLeftEdge) onSwipeDay(-1);
  };
  const confirmBlockTime = async () => {
    if (!blockPopup) return;
    setSavingBlock(true);
    const slotsToBlock = generateSlotRange(blockPopup.start, blockPopup.end);
    if (blockPopup.staffId) {
      const staffMember = rawStaff.find(s => s.id === blockPopup.staffId);
      const existing = parseStaffBlocks(staffMember?.manual_blocks);
      const merged = { ...existing, [blockPopup.date]: Array.from(new Set([...(existing[blockPopup.date]||[]), ...slotsToBlock])) };
      await supabase.from("staff").update({ manual_blocks: merged }).eq("id", blockPopup.staffId);
    } else if (userId) {
      const merged = { ...adminManualBlocks, [blockPopup.date]: Array.from(new Set([...(adminManualBlocks[blockPopup.date]||[]), ...slotsToBlock])) };
      await supabase.from("profiles").update({ manual_blocks: merged }).eq("id", userId);
    }
    setSavingBlock(false);
    setBlockPopup(null);
    onBlocksSaved();
  };
  const handleMouseEnter = (p: Prog, e: React.MouseEvent) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    const currentTarget = e.currentTarget as HTMLElement;
    hoverTimer.current = setTimeout(()=>{ if(currentTarget) setHoverCard({prog:p,rect:currentTarget.getBoundingClientRect()}); },320);
  };
  const handleMouseLeave = () => { if(hoverTimer.current) clearTimeout(hoverTimer.current); setHoverCard(null); };
  return (
    <div className="chronos-calendar-day-view" style={{ display:"flex", flexDirection:"column", flex:1, overflow:"hidden" }}>
      {isClosed&&(
        <div style={{ flexShrink:0, background:"#fff5f5", borderBottom:"1px solid #fca5a5", padding:"6px 16px" }}>
          <span style={{ fontSize:11, fontWeight:700, color:"#dc2626" }}>{t("dayClosedBanner")}</span>
        </div>
      )}
      {hoverCard&&(
        <AppointmentHoverCard prog={hoverCard.prog} anchorRect={hoverCard.rect} serviceById={serviceById}
          rawStaff={rawStaff} staffColorIndex={staffMap[hoverCard.prog.expertId||""] ?? 0} onClose={()=>setHoverCard(null)} />
      )}
      <div ref={scrollRef} className="chronos-calendar-day-scroll" style={{ flex:1, overflowY:"auto", overflowX:"auto" }}
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="chronos-calendar-day-grid" style={{ minWidth: gridMinWidth }}>
          {dayStaffList.length>0&&(
            <div style={{ display:"flex", position:"sticky", top:0, zIndex:30, background:"#fff", borderBottom:"2px solid #e2e8f0" }}>
              <div style={{ width:TIME_COL_W, flexShrink:0, borderRight:"2px solid #e2e8f0", background:"#fff" }} />
              {dayStaffList.map((s,i) => {
                const color = SC[(staffMap[s.id] ?? i) % SC.length];
                return (
                  <div key={s.id} title={s.name} style={{ flex:1, minWidth:MIN_COL_W, display:"flex", alignItems:"center", justifyContent:showColName?"flex-start":"center", gap:3, padding:showColName?"5px 4px":"5px 1px", borderLeft:"2px solid #e2e8f0" }}>
                    <span style={{ width:15, height:15, borderRadius:"50%", background:color.border, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:700, color:"#fff", flexShrink:0 }}>
                      {s.name.charAt(0).toUpperCase()}
                    </span>
                    {showColName&&<span style={{ fontSize:10, fontWeight:700, color:"#334155", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.name}</span>}
                  </div>
                );
              })}
              {hasUnassigned&&(
                <div style={{ flex:1, minWidth:MIN_COL_W, display:"flex", alignItems:"center", justifyContent:"center", padding:"5px 1px", borderLeft:"2px solid #e2e8f0" }}>
                  <span style={{ fontSize:10, fontWeight:700, color:"#94a3b8" }}>—</span>
                </div>
              )}
            </div>
          )}
        <div style={{ display:"flex", height:gridH, position:"relative" }}>
          <div style={{ position:"sticky", left:0, zIndex:20 }}>
            <TimeColumn slots={slots} whStart={whStart} whEnd={whEnd} isClosed={isClosed} />
          </div>
          <div style={{ flex:1, position:"relative" }}>
            {Array.from({ length: totalCols }, (_, colI) => {
              const staffIdForCol = colI < dayStaffList.length ? dayStaffList[colI].id : "";
              const ci = staffIdForCol ? (staffMap[staffIdForCol] ?? 0) : -1;
              const tint = ci>=0 ? SC[ci].workBg : "#f8fafc";
              return (
                <div key={`tint-${colI}`} style={{
                  position:"absolute", left:`calc(${colI} * 100% / ${totalCols})`, width:`calc(100% / ${totalCols})`,
                  top:0, height:gridH, background:tint,
                  borderRight: colI < totalCols-1 ? "1.5px solid #dde3ea" : "none",
                }} />
              );
            })}
            {slots.map((slot,i) => {
              const isHour = slot.endsWith(":00");
              const isHalf = slot.endsWith(":30");
              const hasSchedule = !!(whStart && whEnd);
              const isWork = !isClosed && hasSchedule && isWorkingSlot(slot,whStart,whEnd);
              const isOutsideHours = !isClosed && hasSchedule && !isWork;
              return (
                <div key={slot} style={{
                  position:"absolute", left:0, right:0, top:i*SLOT_H, height:SLOT_H,
                  background: isClosed
                    ? "repeating-linear-gradient(135deg,rgba(239,68,68,0.10) 0px,rgba(239,68,68,0.10) 4px,rgba(254,242,242,1) 4px,rgba(254,242,242,1) 8px)"
                    : isOutsideHours
                      ? "repeating-linear-gradient(45deg,rgba(148,163,184,0.28) 0px,rgba(148,163,184,0.28) 2px,transparent 2px,transparent 10px),repeating-linear-gradient(135deg,rgba(148,163,184,0.28) 0px,rgba(148,163,184,0.28) 2px,transparent 2px,transparent 10px),#eef1f5"
                      : "transparent",
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
            {slots.flatMap((slot,i) => {
              const isPastSlot = dateKey === todayKeyRef && timeToMin(slot) <= nowMinutesRef;
              const baseDisabled = isClosed || isPastSlot;
              return Array.from({ length: totalCols }, (_, colI) => {
                const staffIdForCol = colI < dayStaffList.length ? dayStaffList[colI].id : "";
                const isBlocked = !!staffIdForCol && (staffBlocksBySlot[staffIdForCol]?.[dateKey] || []).includes(slot);
                const disabled = baseDisabled || isBlocked;
                return (
                  <button key={`e-${slot}-${colI}`}
                    onClick={(e)=>{ if(disabled) return; const rect=(e.currentTarget as HTMLElement).getBoundingClientRect(); setSlotMenu({ x:rect.left, y:rect.bottom, time:slot, staffId:staffIdForCol }); }}
                    disabled={disabled}
                    style={{
                      position:"absolute", left:`calc(${colI} * 100% / ${totalCols})`, width:`calc(100% / ${totalCols})`,
                      top:i*SLOT_H, height:SLOT_H, zIndex:5,
                      background: isBlocked ? "repeating-linear-gradient(45deg,rgba(220,38,38,0.16) 0px,rgba(220,38,38,0.16) 4px,transparent 4px,transparent 9px)" : "transparent",
                      border:"none", cursor:disabled?"not-allowed":"pointer",
                    }}
                    className={disabled?"":"group hover:bg-amber-50 transition-all"}>
                    {!disabled && <span style={{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",fontSize:9,fontWeight:700,color:"#f59e0b",opacity:0}} className="group-hover:opacity-100 transition-opacity">+</span>}
                  </button>
                );
              });
            })}
            {dayAppts.map((p) => {
              const svc = serviceById[p.serviciuId||""];
              const endTime = svc?.duration?addMinutesToTime(p.ora,svc.duration):null;
              const topPx = ((timeToMin(p.ora)-firstMin)/15)*SLOT_H;
              const heightPx = Math.max(((svc?.duration||30)/15)*SLOT_H-3,40);
              const ci = staffMap[p.expertId||""] ?? 0;
              const color = SC[ci];
              const col = p.expertId && colIndexOf[p.expertId]!=null ? colIndexOf[p.expertId] : totalCols-1;
              return (
                <button key={p.id}
                  onClick={()=>{if(longPressFired.current){longPressFired.current=false;return;}if(hoverTimer.current)clearTimeout(hoverTimer.current);setHoverCard(null);onEdit(p);}}
                  onMouseEnter={e=>handleMouseEnter(p,e)}
                  onMouseLeave={handleMouseLeave}
                  onTouchStart={e=>{longPressFired.current=false;const ct=e.currentTarget as HTMLElement;if(longPressTimer.current)clearTimeout(longPressTimer.current);longPressTimer.current=setTimeout(()=>{longPressFired.current=true;setHoverCard({prog:p,rect:ct.getBoundingClientRect()});},500);}}
                  onTouchEnd={()=>{if(longPressTimer.current)clearTimeout(longPressTimer.current);}}
                  onTouchMove={()=>{if(longPressTimer.current)clearTimeout(longPressTimer.current);}}
                  style={{
                    position:"absolute", top:topPx+2, height:heightPx, zIndex:15,
                    left:`calc(2px + ${col} * (100% - 2px) / ${totalCols})`,
                    width:`calc((100% - 2px) / ${totalCols} - 2px)`,
                    background:"#fff", borderRadius:5,
                    borderTop:"1px solid rgba(0,0,0,0.07)",
                    borderRight:"1px solid rgba(0,0,0,0.07)",
                    borderBottom:"1px solid rgba(0,0,0,0.07)",
                    borderLeft:`3px solid ${color.border}`,
                    boxShadow:"0 1px 6px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.06)",
                    padding:"3px 3px", textAlign:"left", cursor:"pointer",
                    transition:"all 0.15s", overflow:"hidden",
                  }}
                  className="hover:brightness-95 hover:shadow-md transition-all">
                  <p style={{fontSize:9,fontWeight:700,color:color.border,lineHeight:1.25,marginBottom:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {p.ora}{endTime ? ` - ${endTime}` : ""}{p.isOnline ? " online" : ""}
                  </p>
                  <p style={{fontSize:11,fontWeight:700,color:"#1e293b",lineHeight:1.25,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {p.nume}
                  </p>
                  {svc&&heightPx>56&&(
                    <p style={{fontSize:9,color:"#64748b",lineHeight:1.15,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {svc.nume_serviciu}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        </div>
      </div>
      <SummaryBar programari={programari} rawServices={rawServices} selectedDate={selectedDate}
        selectedExpert={selectedExpert} selectedServiciu={selectedServiciu} onSelectServiciu={onSelectServiciu}/>
      {slotMenu && (
        <div style={{ position:"fixed", inset:0, zIndex:400 }} onClick={()=>setSlotMenu(null)}>
          <div onClick={e=>e.stopPropagation()} style={{
            position:"fixed",
            top:Math.min(slotMenu.y, (typeof window!=="undefined"?window.innerHeight:800)-110),
            left:Math.min(slotMenu.x, (typeof window!=="undefined"?window.innerWidth:400)-200),
            background:"#fff", borderRadius:14, boxShadow:"0 12px 32px rgba(0,0,0,0.2)", border:"1.5px solid #e2e8f0",
            overflow:"hidden", minWidth:190,
          }}>
            <button onClick={()=>{ onAddNew(slotMenu.time, dateKey, slotMenu.staffId); setSlotMenu(null); }}
              style={{ width:"100%", textAlign:"left", padding:"11px 14px", fontSize:11, fontWeight:700, color:"#1e293b", background:"transparent", border:"none", cursor:"pointer", borderBottom:"1px solid #f1f5f9" }}
              className="hover:bg-slate-50 transition-colors">
              Adauga programare - {slotMenu.time}
            </button>
            <button onClick={()=>{ setBlockPopup({ date:dateKey, staffId:slotMenu.staffId, start:slotMenu.time, end:addMinutesToTime(slotMenu.time,60) }); setSlotMenu(null); }}
              style={{ width:"100%", textAlign:"left", padding:"11px 14px", fontSize:11, fontWeight:700, color:"#dc2626", background:"transparent", border:"none", cursor:"pointer" }}
              className="hover:bg-red-50 transition-colors">
              Blocheaza timp
            </button>
          </div>
        </div>
      )}
      {blockPopup && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.6)", zIndex:410, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={()=>setBlockPopup(null)}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:20, padding:22, width:"100%", maxWidth:340, boxShadow:"0 24px 60px rgba(0,0,0,0.25)" }}>
            <p style={{ fontSize:13, fontWeight:700, color:"#1e293b", marginBottom:4 }}>Blocheaza un interval</p>
            <p style={{ fontSize:10, fontWeight:700, color:"#94a3b8", marginBottom:14 }}>
              {blockPopup.date}{blockPopup.staffId ? ` ┬╖ ${rawStaff.find(s=>s.id===blockPopup.staffId)?.name || ""}` : " ┬╖ tot programul"}
            </p>
            <div style={{ display:"flex", gap:8, marginBottom:16 }}>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:9, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", marginBottom:4 }}>De la</p>
                <SimpleTimePicker value={blockPopup.start} onChange={v=>setBlockPopup(p=>p?{...p,start:v}:null)} />

              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:9, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", marginBottom:4 }}>Până la</p>
                <SimpleTimePicker value={blockPopup.end} onChange={v=>setBlockPopup(p=>p?{...p,end:v}:null)} />

              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setBlockPopup(null)} style={{ flex:1, padding:"10px", borderRadius:10, background:"#f1f5f9", border:"none", fontWeight:700, fontSize:11, color:"#64748b", cursor:"pointer" }}>Anulează</button>
              <button disabled={savingBlock} onClick={confirmBlockTime}
                style={{ flex:1, padding:"10px", borderRadius:10, background:"#dc2626", border:"none", fontWeight:700, fontSize:11, color:"#fff", cursor:"pointer", opacity:savingBlock?0.6:1 }}>
                {savingBlock ? "..." : "Blochează"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// --- WeekView ΓÇö redesign simplu (lista per zi, fara grid ore) -----------------
function WeekView({ selectedDate, programariByDate, rawStaff, serviceById, onEdit, selectedExpert, selectedServiciu, adminWorkingHours, adminManualBlocks }: {
  selectedDate: Date; programariByDate: Record<string,Prog[]>;
  rawStaff: StaffRow[]; serviceById: Record<string,ServiceRow>; rawServices: ServiceRow[];
  onEdit: (p: Prog) => void; selectedExpert: string; selectedServiciu: string;
  adminWorkingHours: WorkingHour[]; adminManualBlocks: ManualBlocks; onSelectDate: (d: Date) => void;
}) {
  const t = useTranslations("calendarPage");
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
  const longPressFired = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
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
          rawStaff={rawStaff} staffColorIndex={staffMap[hoverCard.prog.expertId||""] ?? 0} onClose={()=>setHoverCard(null)}/>
      )}
      <div style={{flex:1,overflowY:"auto",overflowX:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",flex:1,alignItems:"start"}}>
          {weekDays.map((day,di)=>{
            const key = formatDateKey(day);
            const dn = dayLong[day.getDay()];
            const wh = whByDay[dn];
            const dayManualBlocksWV = (adminManualBlocks[key] || []).length;
            const isFullyBlockedWV = dayManualBlocksWV >= 94;
            const isClosed = !!wh?.closed || isFullyBlockedWV;
            const isToday = sameDay(day,today);
            const dayAppts = (programariByDate[key]||[])
              .filter(p=>(!selectedExpert||p.expertId===selectedExpert)&&(!selectedServiciu||p.serviciuId===selectedServiciu))
              .sort((a,b)=>a.ora.localeCompare(b.ora));
            return (
              <div key={di} style={{
                minHeight:120,
                borderRight:di<6?(isClosed?"1px solid #fca5a5":"1px solid #e2e8f0"):"none",
                borderBottom: isClosed ? "1px solid #fca5a5" : "1px solid #e2e8f0",
                boxShadow: isClosed ? "inset 0 0 0 2px #fca5a5" : "none",
                background:isClosed?"#fef2f2":isToday?"rgba(251,191,36,0.04)":"#fff",
                padding:"8px 6px",
                display:"flex",flexDirection:"column",gap:5,
              }}>
                {isClosed&&(
                  <div style={{display:"flex",justifyContent:"center",marginBottom:6}}>
                    <span style={{fontSize:8,fontWeight:800,color:"#fff",background:"#dc2626",padding:"2px 8px",borderRadius:5,letterSpacing:"0.02em"}}>{t("closedBadgeCaps")}</span>
                  </div>
                )}
                {!isClosed&&dayAppts.length===0&&(
                  <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px 4px"}}>
                    <span style={{fontSize:10,color:"#cbd5e1",fontWeight:600}}>—</span>
                  </div>
                )}
                {dayAppts.map(p=>{
                  const svc = serviceById[p.serviciuId||""];
                  const ci = staffMap[p.expertId||""] ?? 0;
                  const color = SC[ci];
                  const endTime = svc?.duration?addMinutesToTime(p.ora,svc.duration):null;
                  const spec = rawStaff.find(s=>s.id===p.expertId);
                  return (
                    <button key={p.id}
                      onClick={()=>{if(longPressFired.current){longPressFired.current=false;return;}if(hoverTimer.current)clearTimeout(hoverTimer.current);setHoverCard(null);onEdit(p);}}
                      onMouseEnter={e=>handleMouseEnter(p,e)}
                      onMouseLeave={handleMouseLeave}
                      onTouchStart={e=>{longPressFired.current=false;const ct=e.currentTarget as HTMLElement;if(longPressTimer.current)clearTimeout(longPressTimer.current);longPressTimer.current=setTimeout(()=>{longPressFired.current=true;setHoverCard({prog:p,rect:ct.getBoundingClientRect()});},500);}}
                      onTouchEnd={()=>{if(longPressTimer.current)clearTimeout(longPressTimer.current);}}
                      onTouchMove={()=>{if(longPressTimer.current)clearTimeout(longPressTimer.current);}}
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
                        {p.ora}{endTime ? ` - ${endTime}` : ""}{p.isOnline ? " online" : ""}
                      </p>
                      <p style={{fontSize:12,fontWeight:700,color:"#1e293b",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1.3}}>
                        {p.nume}
                      </p>
                      {svc&&(
                        <p style={{fontSize:10,color:color.chipText,margin:"2px 0 0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1.2}}>
                          {svc.nume_serviciu}{svc.duration>0?` ┬╖ ${svc.duration}min`:""}
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
// --- MonthView ----------------------------------------------------------------
function MonthView({ selectedDate, programariByDate, rawStaff, serviceById, onEdit, onDayClick, selectedExpert, selectedServiciu, adminWorkingHours, adminManualBlocks }: {
  selectedDate: Date; programariByDate: Record<string,Prog[]>;
  rawStaff: StaffRow[]; serviceById: Record<string,ServiceRow>;
  onEdit: (p: Prog) => void; onDayClick: (d: Date) => void;
  selectedExpert: string; selectedServiciu: string; adminWorkingHours: WorkingHour[]; adminManualBlocks: ManualBlocks;
}) {
  const t = useTranslations("calendarPage");
  const dayShort = t.raw("dayShort") as string[];
  const dayLong = t.raw("dayLong") as string[];
  const today = new Date();
  const whByDay = useMemo(()=>{const m:Record<string,WorkingHour>={};adminWorkingHours.forEach(h=>{m[h.day]=h;});return m;},[adminWorkingHours]);
  const [hoverCard, setHoverCard] = useState<{prog:Prog;rect:DOMRect}|null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const longPressFired = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
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
      {hoverCard&&<AppointmentHoverCard prog={hoverCard.prog} anchorRect={hoverCard.rect} serviceById={serviceById} rawStaff={rawStaff} staffColorIndex={staffMap[hoverCard.prog.expertId||""] ?? 0} onClose={()=>setHoverCard(null)}/>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:"2px solid #e2e8f0",background:"#fff",position:"sticky",top:0,zIndex:10,flexShrink:0}}>
        {dayShort.map((d,i)=>(
          <div key={d} style={{textAlign:"center",padding:"8px 4px",borderRight:i<6?"1px solid #e2e8f0":"none",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color:"#64748b"}}>{d}</div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",flex:1}}>
        {grid.map((day,idx)=>{
          const key=formatDateKey(day);
          const allAppts=programariByDate[key]||[];
          const appts=allAppts
            .filter(p=>(!selectedExpert||p.expertId===selectedExpert)&&(!selectedServiciu||p.serviciuId===selectedServiciu))
            .sort((a,b)=>(a.ora||"").localeCompare(b.ora||"")); // ? ordonate cronologic, nu ├«n ordinea crearii
          const online=appts.filter(p=>p.isOnline).length;
          const isCurMo=day.getMonth()===selectedDate.getMonth();
          const isToday=sameDay(day,today);const isSel=sameDay(day,selectedDate);
          const wh=whByDay[dayLong[day.getDay()]];const dayBlocked=(adminManualBlocks[key]||[]).length>=94;const isClosed=!!wh?.closed||dayBlocked;
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
                  {online>0&&<span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:99,background:"#3b82f6",color:"#fff"}}>{online}</span>}
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:2,flex:1,overflow:"hidden"}}>
                {appts.slice(0,3).map(p=>{
                  const ci=staffMap[p.expertId||""] ?? 0;const color=SC[ci];
                  return (
                    <button key={p.id} onClick={e=>{e.stopPropagation();if(longPressFired.current){longPressFired.current=false;return;}if(hoverTimer.current)clearTimeout(hoverTimer.current);setHoverCard(null);onEdit(p);}} onMouseEnter={e=>{e.stopPropagation();handleMouseEnter(p,e);}} onMouseLeave={handleMouseLeave}
                      onTouchStart={e=>{e.stopPropagation();longPressFired.current=false;const ct=e.currentTarget as HTMLElement;if(longPressTimer.current)clearTimeout(longPressTimer.current);longPressTimer.current=setTimeout(()=>{longPressFired.current=true;setHoverCard({prog:p,rect:ct.getBoundingClientRect()});},500);}}
                      onTouchEnd={e=>{e.stopPropagation();if(longPressTimer.current)clearTimeout(longPressTimer.current);}}
                      onTouchMove={e=>{e.stopPropagation();if(longPressTimer.current)clearTimeout(longPressTimer.current);}}
                      style={{display:"flex",alignItems:"center",gap:4,padding:"2px 6px",borderRadius:4,background:color.chipBg,borderTop:`1px solid ${color.chipBorder}`,borderRight:`1px solid ${color.chipBorder}`,borderBottom:`1px solid ${color.chipBorder}`,borderLeft:`3px solid ${color.border}`,textAlign:"left",cursor:"pointer",transition:"all 0.15s"}}
                      className="hover:brightness-95 transition-all">
                      <span style={{fontSize:9,fontWeight:700,color:"#64748b",flexShrink:0}}>{p.ora}</span>
                      <span style={{fontSize:10,fontWeight:700,color:color.chipText,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{p.nume}</span>
                      {p.isOnline&&<span style={{fontSize:8,flexShrink:0}}></span>}
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
// --- YearView -----------------------------------------------------------------
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
                {total>0&&<div style={{display:"flex",gap:4}}><span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:99,background:"#e2e8f0",color:"#475569"}}>{total}</span>{online>0&&<span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:99,background:"#3b82f6",color:"#fff"}}>{online}</span>}</div>}
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
// --- DocumentsSection ----------------------------------------------------------
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
          const icon = isImg ? "?" : isPdf ? "" : isAudio ? "" : isVideo ? "" : "";
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
// --- CalendarContent ----------------------------------------------------------
function CalendarContent() {
  const t = useTranslations("calendarPage");
  const localeCode = t("localeCode");
  const months = t.raw("months") as string[];
  const monthsShort = t.raw("monthsShort") as string[];
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo")==="true";
  const modalRef = useRef<HTMLDivElement>(null);
  const qClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExpert, setSelectedExpert] = useState("");
  const [selectedServiciu, setSelectedServiciu] = useState("");
  const [selectedWorkLocation, setSelectedWorkLocation] = useState("");
  const [editForm, setEditForm] = useState<Prog|null>(null);
  const [newForm, setNewForm] = useState<{date:string;time:string;nume:string;telefon:string;email:string;serviciuId:string;expertId:string;motiv:string;workLocationId:string}|null>(null);
  const [customMsg, setCustomMsg] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showNewDatePicker, setShowNewDatePicker] = useState(false);
  const [showNewTimePicker, setShowNewTimePicker] = useState(false);
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
    queryFn:async()=>{const{data}=await supabase.from("profiles").select("plan_type,trial_started_at,manual_blocks,working_hours,notification_settings,work_locations").eq("id",userId!).single();return data;},
  });
  const notifSettings: NotificationSettings = useMemo(() => {
    const raw = profile?.notification_settings;
    if (raw && typeof raw === "object") return { ...DEFAULT_NOTIF_SETTINGS, ...raw };
    return DEFAULT_NOTIF_SETTINGS;
  }, [profile?.notification_settings]);
  const {data:rawStaff=[]} = useQuery<StaffRow[]>({
    queryKey:["staff",userId],enabled:!!userId,staleTime:1000*60*10,
    queryFn:async()=>{const{data}=await supabase.from("staff").select("id,name,services,working_hours,manual_blocks").eq("user_id",userId!);return data || [];},
  });
  const {data:rawServices=[]} = useQuery<ServiceRow[]>({
    queryKey:["services",userId],enabled:!!userId,staleTime:1000*60*10,
    queryFn:async()=>{const{data}=await supabase.from("services").select("id,nume_serviciu,price,duration").eq("user_id",userId!);return data || [];},
  });
  const dateRange = useMemo(()=>{
    const yr=selectedDate.getFullYear(),mo=selectedDate.getMonth();
    return{start:new Date(yr,mo-2,1).toISOString().split("T")[0],end:new Date(yr,mo+3,0).toISOString().split("T")[0]};
  },[selectedDate.getFullYear(),selectedDate.getMonth()]);
  const {data:programari=[],isLoading,refetch:refetchAppts} = useQuery<Prog[]>({
    queryKey:["appointments",userId,dateRange.start,dateRange.end],enabled:!!userId,staleTime:1000*60*2,
    queryFn:async()=>{
      const{data,error}=await supabase.from("appointments").select("id,title,prenume,nume,email,date,time,details,phone,poza,file_url,documente,angajat_id,serviciu_id,duration,is_client_booking,total_price,amount_paid,payment_status,work_location_id,work_location_name,work_location_address,work_location_maps_url").eq("user_id",userId!).gte("date",dateRange.start).lte("date",dateRange.end).order("date",{ascending:true});
      if(error)return[];return (data || []).map(mapRow);
    },
  });
  useEffect(()=>{
    if(!userId)return;
    const ch1=supabase.channel(`cp-${userId}`).on("postgres_changes",{event:"UPDATE",schema:"public",table:"profiles",filter:`id=eq.${userId}`},()=>refetchProfile()).subscribe();
    const ch2=supabase.channel(`ca-${userId}`).on("postgres_changes",{event:"*",schema:"public",table:"appointments",filter:`user_id=eq.${userId}`},(payload:any)=>{
      // ? Notificari la programare online noua ΓÇö respecta setarile din Settings
      if(payload.eventType==="INSERT"&&payload.new?.is_client_booking){
        const nume=payload.new.title||payload.new.prenume||payload.new.nume||"Client";
        if(notifSettings.sound_enabled) playNotificationSound(notifSettings.volume);
        if(notifSettings.in_app_enabled) showToast({title:t("newBookingNotifTitle"),message:t("newBookingNotifMsg",{nume}),type:"info"});
        if(notifSettings.system_enabled) playSystemNotification(t("newBookingNotifTitle"),t("newBookingNotifMsg",{nume}));
      }
      refetchAppts();
    }).subscribe();
    return()=>{supabase.removeChannel(ch1);supabase.removeChannel(ch2);};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[userId,notifSettings.sound_enabled,notifSettings.volume,notifSettings.in_app_enabled,notifSettings.system_enabled]);
  const adminWorkingHours = useMemo<WorkingHour[]>(()=>parseWH(profile?.working_hours),[profile?.working_hours]);
  const adminManualBlocks = useMemo<ManualBlocks>(()=>{const r=profile?.manual_blocks;if(!r||typeof r!=="object"||Array.isArray(r))return{};return r as ManualBlocks;},[profile?.manual_blocks]);
  const workLocations = useMemo<WorkLocationRow[]>(()=>{const r=profile?.work_locations;return Array.isArray(r)?r:[];},[profile?.work_locations]);
  const userSub = useMemo(()=>{if(!profile)return null;let plan=(profile.plan_type||"CHRONOS FREE").toUpperCase();if(profile.trial_started_at&&Date.now()-new Date(profile.trial_started_at).getTime()<10*24*60*60*1000)plan="CHRONOS TEAM";return{plan};},[profile]);
  const hasWA = userSub?.plan.includes("ELITE")||userSub?.plan.includes("TEAM")||userSub?.plan.includes("BUSINESS");
  const programariByDate = useMemo(()=>{const m:Record<string,Prog[]>={};programari.forEach(p=>{if(!p.data)return;if(!m[p.data])m[p.data]=[];m[p.data].push(p);});return m;},[programari]);
  const serviceById = useMemo(()=>{const m:Record<string,ServiceRow>={};rawServices.forEach(s=>{m[s.id]=s;});return m;},[rawServices]);
  const filteredProg = useMemo(()=>programari.filter(p=>{const ms=!debouncedSearch||p.nume.toLowerCase().includes(debouncedSearch.toLowerCase())||p.telefon?.includes(debouncedSearch);return ms&&(!selectedExpert||p.expertId===selectedExpert)&&(!selectedServiciu||p.serviciuId===selectedServiciu)&&(!selectedWorkLocation||p.workLocationId===selectedWorkLocation);}),[programari,debouncedSearch,selectedExpert,selectedServiciu,selectedWorkLocation]);
  useEffect(()=>{const timer=setTimeout(()=>setDebouncedSearch(searchTerm),250);return()=>clearTimeout(timer);},[searchTerm]);
  const handleSearch = useCallback((q:string)=>{if(!q.trim()){setSearchResults([]);return;}setSearchResults(programari.filter(p=>p.nume.toLowerCase().includes(q.toLowerCase())||p.telefon?.includes(q)||p.email?.toLowerCase().includes(q.toLowerCase())).slice(0,8));},[programari]);
  const openEdit = useCallback((p:Prog)=>{setEditForm({...p});setShowDatePicker(false);setShowTimePicker(false);setShowSearchDrop(false);},[]);
  const closeModal = useCallback(()=>{setEditForm(null);setNewForm(null);setShowDatePicker(false);setShowTimePicker(false);setShowNewDatePicker(false);setShowNewTimePicker(false);setShowSearchDrop(false);},[]);
  useEffect(()=>{if(!editForm)return;const sn=rawServices.find(s=>s.id===editForm.serviciuId)?.nume_serviciu;const base=t("editModal.whatsappMessageBase",{nume:editForm.nume,data:editForm.data,ora:editForm.ora});const suffix=sn?t("editModal.whatsappMessageServiceSuffix",{serviciu:sn}):"";const locationBlock=editForm.workLocationAddress?`\n${t("editModal.whatsappLocationLine",{location:editForm.workLocationName||editForm.workLocationAddress})}\n${t("editModal.whatsappMapsLine",{maps:editForm.workLocationMapsUrl||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(editForm.workLocationAddress)}`})}`:"";setCustomMsg(`${base}${suffix}.${locationBlock}`);},[editForm?.id,rawServices,t]);
  useEffect(()=>{function h(e:MouseEvent){if(modalRef.current&&!modalRef.current.contains(e.target as Node)&&!showDatePicker&&!showTimePicker)closeModal();}if(editForm)document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[editForm,showDatePicker,showTimePicker]);
  const handleUpdate = async()=>{
    if(!editForm)return;
    const svc=rawServices.find(s=>s.id===editForm.serviciuId);
    const dur=svc?.duration||editForm.duration||30;
    if(hasSpecialistConflict(programari,editForm.expertId||"",editForm.data,editForm.ora,dur,editForm.id)){
      await showToast({message:t("specialistConflictError"),type:"error"});
      return;
    }
    const locEdit = workLocations.find(l=>l.id===editForm.workLocationId);
    const mapsEdit = locEdit?.maps_url || (locEdit?.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locEdit.address)}` : null);
    const{error}=await supabase.from("appointments").update({
      title:editForm.nume, prenume:editForm.nume, nume:editForm.nume,
      email:editForm.email||null, date:editForm.data, time:editForm.ora,
      duration:svc?.duration||editForm.duration||0,
      phone:editForm.telefon||null, details:editForm.motiv||null,
      angajat_id:editForm.expertId||null, serviciu_id:editForm.serviciuId||null,
      work_location_id: editForm.workLocationId||null,
      work_location_name: locEdit?.name||null,
      work_location_address: locEdit?.address||null,
      work_location_maps_url: mapsEdit,
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
  const viewWorkingHours = useMemo(() => {
    if (!selectedExpert) return adminWorkingHours;
    const st = rawStaff.find(s => s.id === selectedExpert);
    const staffWH = parseWH(st?.working_hours);
    return staffWH.length > 0 ? staffWH : adminWorkingHours;
  }, [selectedExpert, rawStaff, adminWorkingHours]);

  const editWorkingHours = useMemo(() => {
    if (!editForm?.expertId) return adminWorkingHours;
    const st = rawStaff.find(s => s.id === editForm.expertId);
    const staffWH = parseWH(st?.working_hours);
    return staffWH.length > 0 ? staffWH : adminWorkingHours;
  }, [editForm?.expertId, rawStaff, adminWorkingHours]);

  const handleSelectExpert = useCallback((id:string)=>{setSelectedExpert(id);if(id&&selectedServiciu){const st=rawStaff.find(s=>s.id===id);if(st?.services?.length&&!st.services.includes(selectedServiciu))setSelectedServiciu("");}},[selectedServiciu,rawStaff]);
  const handleSelectServiciu = useCallback((id:string)=>{setSelectedServiciu(id);if(id&&selectedExpert){const st=rawStaff.find(s=>s.id===selectedExpert);if(st?.services?.length&&!st.services.includes(id))setSelectedExpert("");}},[selectedExpert,rawStaff]);
  const nav = useCallback((dir:number)=>{setSelectedDate(prev=>{const d=new Date(prev);if(viewMode==="year")d.setFullYear(d.getFullYear()+dir);else if(viewMode==="month")d.setMonth(d.getMonth()+dir);else if(viewMode==="week")d.setDate(d.getDate()+dir*7);else d.setDate(d.getDate()+dir);return d;});},[viewMode]);
  const editExisting = useMemo(()=>{
    if(!editForm)return[];
    return programari.filter(p=>
      p.data===editForm.data &&
      String(p.id)!==String(editForm.id) &&
      !!editForm.expertId && p.expertId===editForm.expertId
    ).map(p=>({time:p.ora,duration:p.duration||30}));
  },[programari,editForm]);
  const editSvcDur = useMemo(()=>{if(!editForm?.serviciuId)return 0;return rawServices.find(s=>s.id===editForm.serviciuId)?.duration||0;},[editForm?.serviciuId,rawServices]);
  const newWorkingHours = useMemo(() => {
    if (!newForm?.expertId) return adminWorkingHours;
    const st = rawStaff.find(s => s.id === newForm.expertId);
    const staffWH = parseWH(st?.working_hours);
    return staffWH.length > 0 ? staffWH : adminWorkingHours;
  }, [newForm?.expertId, rawStaff, adminWorkingHours]);
  const newExisting = useMemo(()=>{
    if(!newForm)return[];
    return programari.filter(p=>
      p.data===newForm.date &&
      !!newForm.expertId && p.expertId===newForm.expertId
    ).map(p=>({time:p.ora,duration:p.duration||30}));
  },[programari,newForm]);
  const newSvcDur = useMemo(()=>{if(!newForm?.serviciuId)return 0;return rawServices.find(s=>s.id===newForm.serviciuId)?.duration||0;},[newForm?.serviciuId,rawServices]);

  const getLocationFilteredStaff = useCallback((locationId?: string)=>{
    const loc = workLocations.find(l=>l.id===locationId);
    if(!loc?.staff_ids?.length) return rawStaff;
    return rawStaff.filter(st=>loc.staff_ids?.includes(st.id));
  },[rawStaff,workLocations]);

  const getLocationFilteredServices = useCallback((locationId?: string)=>{
    const loc = workLocations.find(l=>l.id===locationId);
    if(!loc?.service_ids?.length) return rawServices;
    return rawServices.filter(svc=>loc.service_ids?.includes(svc.id));
  },[rawServices,workLocations]);

  const newAngOpts = useMemo(()=>{
    let opts = getLocationFilteredStaff(newForm?.workLocationId);
    if(newForm?.serviciuId) opts = opts.filter(a=>a.services?.includes(newForm.serviciuId));
    return opts;
  },[newForm?.serviciuId,newForm?.workLocationId,getLocationFilteredStaff]);

  const newSvcOpts = useMemo(()=>{
    let opts = getLocationFilteredServices(newForm?.workLocationId);
    if(newForm?.expertId){
      const a=rawStaff.find(s=>s.id===newForm.expertId);
      if(a?.services?.length) opts = opts.filter(s=>a.services.includes(s.id));
    }
    return opts;
  },[newForm?.expertId,newForm?.workLocationId,rawStaff,getLocationFilteredServices]);

  const editAngOpts = useMemo(()=>{
    const selectedServiceId = editForm?.serviciuId || "";
    let opts = getLocationFilteredStaff(editForm?.workLocationId);
    if(selectedServiceId) opts = opts.filter(a=>a.services?.includes(selectedServiceId));
    return opts;
  },[editForm?.serviciuId,editForm?.workLocationId,getLocationFilteredStaff]);

  const editSvcOpts = useMemo(()=>{
    let opts = getLocationFilteredServices(editForm?.workLocationId);
    if(editForm?.expertId){
      const a=rawStaff.find(s=>s.id===editForm.expertId);
      if(a?.services?.length) opts = opts.filter(s=>a.services.includes(s.id));
    }
    return opts;
  },[editForm?.expertId,editForm?.workLocationId,rawStaff,getLocationFilteredServices]);

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
    <div style={{display:"flex",flexDirection:"column",height:"100%",minHeight:0,background:"#f8fafc",overflow:"hidden"}}>
      {editForm&&(
        <>
          {showDatePicker&&(<div style={{position:"fixed",inset:0,zIndex:900,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setShowDatePicker(false)}><div onClick={e=>e.stopPropagation()}><ChronosDatePicker value={editForm.data} onChange={v=>{setEditForm(p=>p?{...p,data:v,ora:""}:null);setShowDatePicker(false);}} onClose={()=>setShowDatePicker(false)} workingHours={editWorkingHours}/></div></div>)}
          {showTimePicker&&(<div style={{position:"fixed",inset:0,zIndex:900,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setShowTimePicker(false)}><div onClick={e=>e.stopPropagation()}><ChronosTimePicker value={editForm.ora||"09:00"} onChange={v=>{setEditForm(p=>p?{...p,ora:v}:null);setShowTimePicker(false);}} onClose={()=>setShowTimePicker(false)} workingHours={editWorkingHours} existingAppointments={editExisting} selectedDate={editForm.data} serviceDuration={editSvcDur} manualBlocks={adminManualBlocks}/></div></div>)}
          <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.72)",backdropFilter:"blur(6px)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:12}} onClick={closeModal}>
            <div ref={modalRef} onClick={e=>e.stopPropagation()} style={{background:"#fff",width:"100%",maxWidth:540,minWidth:0,borderRadius:20,overflow:"hidden",boxShadow:"0 24px 60px rgba(0,0,0,0.25)",border:"1px solid #e2e8f0",position:"relative",display:"flex",flexDirection:"column",maxHeight:"96vh"}}>
              <button onClick={closeModal} style={{position:"absolute",top:10,right:10,width:28,height:28,background:"#1e293b",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,color:"#94a3b8",zIndex:30,display:"flex",alignItems:"center",justifyContent:"center"}} className="hover:bg-red-500 hover:text-white transition-all">✕</button>
              <div style={{background:"#0f172a",padding:"12px 16px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                <div style={{width:36,height:36,borderRadius:11,background:"#1e293b",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
                  {editForm.poza?<img src={editForm.poza} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:""}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <h2 style={{fontSize:14,fontWeight:700,color:"#fff",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{editForm.nume}</h2>
                  <p style={{fontSize:10,color:"#64748b",margin:0}}>{editForm.data} · {editForm.ora}{editForm.isOnline?" 🌐":""}</p>
                  {editForm.paymentStatus==="deposit_paid"&&<span style={{display:"inline-block",marginTop:3,fontSize:9,fontWeight:800,color:"#fbbf24",background:"rgba(251,191,36,0.15)",padding:"2px 7px",borderRadius:6}}>{t("depositPaidLabel",{paid:(editForm.amountPaid||0).toFixed(0),rest:((editForm.totalPrice||0)-(editForm.amountPaid||0)).toFixed(0)})}</span>}
                  {editForm.paymentStatus==="fully_paid"&&<span style={{display:"inline-block",marginTop:3,fontSize:9,fontWeight:800,color:"#6ee7b7",background:"rgba(110,231,183,0.15)",padding:"2px 7px",borderRadius:6}}>? {t("fullyPaidLabel")}</span>}
                </div>
              </div>
              <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:7,overflowY:"auto",flex:1}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,minWidth:0}}>
                  <div style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:12,padding:"7px 8px",gridColumn:"span 1",minWidth:0,overflow:"hidden"}}>
                    <p style={{fontSize:7,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",marginBottom:2}}>{t("editModal.nameLabel")}</p>
                    <input style={{width:"100%",background:"transparent",border:"none",fontSize:12,fontWeight:700,color:"#1e293b",outline:"none",minWidth:0}} value={editForm.nume} onChange={e=>setEditForm(p=>p?{...p,nume:e.target.value}:null)}/>
                  </div>
                  <button onClick={()=>{setShowDatePicker(true);setShowTimePicker(false);}} style={{background:"#0f172a",color:"#fff",border:"none",borderRadius:12,padding:"7px 4px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,minWidth:0,overflow:"hidden"}} className="hover:bg-slate-800 transition-all">
                    <span style={{fontSize:7,color:"#64748b",fontWeight:700,textTransform:"uppercase"}}>{t("editModal.dateLabel")}</span>
                    <span style={{fontSize:10,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%"}}>{editForm.data}</span>
                  </button>
                  <button onClick={()=>{setShowTimePicker(true);setShowDatePicker(false);}} style={{background:"#0f172a",color:"#fff",border:"none",borderRadius:12,padding:"7px 4px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,minWidth:0,overflow:"hidden"}} className="hover:bg-slate-800 transition-all">
                    <span style={{fontSize:7,color:"#64748b",fontWeight:700,textTransform:"uppercase"}}>{t("editModal.timeLabel")}</span>
                    <span style={{fontSize:10,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%"}}>{editForm.ora||"—"}</span>
                  </button>
                </div>
                <div style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:12,padding:"7px 10px",minWidth:0,overflow:"hidden"}}><p style={{fontSize:7,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",marginBottom:2}}>{t("workLocationLabel")}</p><select style={{width:"100%",background:"transparent",border:"none",fontSize:11,fontWeight:700,color:"#1e293b",outline:"none",cursor:"pointer",minWidth:0}} value={editForm.workLocationId||""} onChange={e=>{
  const id=e.target.value;
  const loc=workLocations.find(l=>l.id===id);
  setEditForm(p=>{
    if(!p)return null;
    const staffOk=!id||!loc?.staff_ids?.length||!p.expertId||loc.staff_ids.includes(p.expertId);
    const serviceOk=!id||!loc?.service_ids?.length||!p.serviciuId||loc.service_ids.includes(p.serviciuId);
    return {...p,workLocationId:id,workLocationName:loc?.name||"",workLocationAddress:loc?.address||"",workLocationMapsUrl:loc?.maps_url||"",expertId:staffOk?p.expertId:"",serviciuId:serviceOk?p.serviciuId:""};
  });
}}><option value="">{t("allWorkLocationsOpt")}</option>{workLocations.map(loc=><option key={loc.id} value={loc.id}>{loc.name}</option>)}</select></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,minWidth:0}}>
                  {[{label:t("editModal.phoneLabel"),key:"telefon"},{label:t("editModal.emailLabel"),key:"email"}].map(f=>(
                    <div key={f.key} id={f.key==="telefon"?"onboarding-prog-phone":"onboarding-prog-email"} style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:12,padding:"7px 10px",minWidth:0,overflow:"hidden"}}>
                      <p style={{fontSize:7,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",marginBottom:2}}>{f.label}</p>
                      <input style={{width:"100%",background:"transparent",border:"none",fontSize:11,fontWeight:700,color:"#1e293b",outline:"none",minWidth:0}} value={(editForm as any)[f.key]||""} onChange={e=>setEditForm(p=>p?{...p,[f.key]:e.target.value}:null)}/>
                    </div>
                  ))}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,minWidth:0}}>
                  <div style={{background:"#0f172a",borderRadius:12,padding:"7px 8px",minWidth:0,overflow:"hidden"}}>
                    <p style={{fontSize:7,fontWeight:700,color:"#f59e0b",textTransform:"uppercase",marginBottom:2}}>{t("editModal.specialistLabel")}</p>
                    <select style={{width:"100%",background:"transparent",border:"none",fontSize:11,fontWeight:700,color:"#fff",outline:"none",cursor:"pointer",minWidth:0}}
                      value={editForm.expertId||""}
                      onChange={e=>{
                        const nid=e.target.value;
                        const sp=rawStaff.find(s=>s.id===nid);
                        const ok=editForm.serviciuId&&sp?.services?.includes(editForm.serviciuId);
                        setEditForm(p=>p?{...p,expertId:nid,serviciuId:ok?p.serviciuId:""}:null);
                      }}>
                      <option value="" style={{background:"#0f172a"}}>{t("editModal.chooseOpt")}</option>
                      {editAngOpts.map(o=><option key={o.id} value={o.id} style={{background:"#0f172a"}}>{o.name}</option>)}
                    </select>
                  </div>
                  <div style={{background:"#0f172a",borderRadius:12,padding:"7px 8px",minWidth:0,overflow:"hidden"}}>
                    <p style={{fontSize:7,fontWeight:700,color:"#f59e0b",textTransform:"uppercase",marginBottom:2}}>{t("editModal.serviceLabel")}</p>
                    <select style={{width:"100%",background:"transparent",border:"none",fontSize:11,fontWeight:700,color:"#fff",outline:"none",cursor:"pointer",minWidth:0}}
                      value={editForm.serviciuId||""}
                      onChange={e=>{
                        const nid=e.target.value;
                        const sp=rawStaff.find(s=>s.id===editForm.expertId);
                        const ok=editForm.expertId&&sp?.services?.includes(nid);
                        setEditForm(p=>p?{...p,serviciuId:nid,expertId:ok?p.expertId:""}:null);
                      }}>
                      <option value="" style={{background:"#0f172a"}}>{t("editModal.chooseOpt")}</option>
                      {editSvcOpts.map(o=><option key={o.id} value={o.id} style={{background:"#0f172a"}}>{o.nume_serviciu}</option>)}
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
                      <textarea style={{width:"100%",background:"transparent",border:"none",fontSize:10,fontWeight:600,color:hasWA?"#334155":"#94a3b8",outline:"none",cursor:hasWA?"text":"not-allowed",resize:"vertical",minHeight:58}}
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
                  <button onClick={handleDelete} style={{width:36,padding:"8px",background:"#fff1f2",border:"1.5px solid #fecdd3",borderRadius:12,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} className="hover:bg-red-500 hover:text-white transition-all" title={t("editModal.deleteTooltip")}>🗑</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showNewDatePicker&&newForm&&(<div style={{position:"fixed",inset:0,zIndex:900,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setShowNewDatePicker(false)}><div onClick={e=>e.stopPropagation()}><ChronosDatePicker value={newForm.date} onChange={v=>{setNewForm(p=>p?{...p,date:v,time:""}:null);setShowNewDatePicker(false);}} onClose={()=>setShowNewDatePicker(false)} workingHours={newWorkingHours}/></div></div>)}
      {showNewTimePicker&&newForm&&(<div style={{position:"fixed",inset:0,zIndex:900,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setShowNewTimePicker(false)}><div onClick={e=>e.stopPropagation()}><ChronosTimePicker value={newForm.time||"09:00"} onChange={v=>{setNewForm(p=>p?{...p,time:v}:null);setShowNewTimePicker(false);}} onClose={()=>setShowNewTimePicker(false)} workingHours={newWorkingHours} existingAppointments={newExisting} selectedDate={newForm.date} serviceDuration={newSvcDur} manualBlocks={adminManualBlocks}/></div></div>)}
      {newForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.72)",backdropFilter:"blur(6px)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setNewForm(null)}>
          <div style={{background:"#fff",width:"100%",maxWidth:480,borderRadius:24,overflow:"hidden",boxShadow:"0 24px 60px rgba(0,0,0,0.22)",padding:20,display:"flex",flexDirection:"column",gap:10}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><h2 style={{fontSize:16,fontWeight:700,color:"#1e293b",margin:0}}>{t("newModal.title")}</h2><button onClick={()=>setNewForm(null)} style={{width:32,height:32,background:"#f1f5f9",border:"none",borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:700,color:"#64748b"}} className="hover:bg-red-500 hover:text-white transition-all">✕</button></div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div style={{background:"#fffbeb",border:"1.5px solid #fcd34d",borderRadius:14,padding:"10px 14px"}}>
                <p style={{fontSize:8,fontWeight:700,color:"#92400e",textTransform:"uppercase",marginBottom:4}}>Data</p>
                <button onClick={()=>{setShowNewDatePicker(true);setShowNewTimePicker(false);}} style={{width:"100%",background:"transparent",border:"none",fontSize:13,fontWeight:700,color:"#1e293b",outline:"none",textAlign:"left",cursor:"pointer"}}>{newForm.date}</button>
              </div>
              <div style={{background:"#fffbeb",border:"1.5px solid #fcd34d",borderRadius:14,padding:"10px 14px"}}>
                <p style={{fontSize:8,fontWeight:700,color:"#92400e",textTransform:"uppercase",marginBottom:4}}>Ora</p>
                <button onClick={()=>{setShowNewTimePicker(true);setShowNewDatePicker(false);}} style={{width:"100%",background:"transparent",border:"none",fontSize:13,fontWeight:700,color:"#1e293b",outline:"none",textAlign:"left",cursor:"pointer"}}>{newForm.time||"09:00"}</button>
              </div>
            </div>
<div style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:14,padding:"10px 14px"}}><p style={{fontSize:8,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",marginBottom:4}}>{t("workLocationLabel")}</p><select style={{width:"100%",background:"transparent",border:"none",fontSize:12,fontWeight:700,color:"#1e293b",outline:"none",cursor:"pointer"}} value={newForm.workLocationId||""} onChange={e=>setNewForm(p=>p?{...p,workLocationId:e.target.value,serviciuId:"",expertId:""}:null)}><option value="">{t("allWorkLocationsOpt")}</option>{workLocations.map(loc=><option key={loc.id} value={loc.id}>{loc.name}</option>)}</select></div>
            <div style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:14,padding:"10px 14px"}}><p style={{fontSize:8,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",marginBottom:4}}>{t("newModal.nameLabel")}</p><input style={{width:"100%",background:"transparent",border:"none",fontSize:14,fontWeight:700,color:"#1e293b",outline:"none"}} placeholder={t("newModal.namePlaceholder")} value={newForm.nume} onChange={e=>setNewForm(p=>p?{...p,nume:e.target.value}:null)}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{[{label:t("newModal.phoneLabel"),key:"telefon"},{label:t("newModal.emailLabel"),key:"email"}].map(f=>(<div key={f.key} style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:14,padding:"10px 14px"}}><p style={{fontSize:8,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",marginBottom:4}}>{f.label}</p><input style={{width:"100%",background:"transparent",border:"none",fontSize:12,fontWeight:700,color:"#1e293b",outline:"none"}} value={(newForm as any)[f.key]} onChange={e=>setNewForm(p=>p?{...p,[f.key]:e.target.value}:null)}/></div>))}</div>
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
                  const locNew=workLocations.find(l=>l.id===newForm.workLocationId);
                  const mapsNew=locNew?.maps_url || (locNew?.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locNew.address)}` : null);
                  const{error}=await supabase.from("appointments").insert({title:newForm.nume,prenume:newForm.nume,nume:newForm.nume,email:newForm.email||null,date:newForm.date,time:newForm.time,phone:newForm.telefon||null,details:newForm.motiv||null,angajat_id:newForm.expertId||null,serviciu_id:newForm.serviciuId||null,work_location_id:newForm.workLocationId||null,work_location_name:locNew?.name||null,work_location_address:locNew?.address||null,work_location_maps_url:mapsNew,user_id:userId,duration:durNew});
                  if(error){await showToast({message:error.message,type:"error"});return;}
                  qClient.invalidateQueries({queryKey:["appointments",userId]});
                  await showToast({message:t("newModal.addedToast"),type:"success"});
                  setNewForm(null);
                }}>{t("newModal.saveBtn")}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{flexShrink:0,background:"#fff",borderBottom:"2px solid #e2e8f0",padding:"6px 10px",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",rowGap:6}}>
        <div className="hidden sm:block">
          <p style={{fontSize:12,fontWeight:700,color:"#1e293b",margin:0,lineHeight:1.2}}>{t("headerTitle")} <span style={{color:"#d97706"}}>{t("headerHighlight")}</span></p>
          <p style={{fontSize:7,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",margin:0}}>{isLoading?t("syncing"):t("synced")}</p>
        </div>
        {/* selectorul de puncte de lucru a fost mutat l├ónga Speciali?ti/Servicii, ├«n FilterBar */}
        <div className="hidden md:block" style={{flexShrink:0,padding:"4px 10px",background:"#f8fafc",borderRadius:8,border:"1.5px solid #e2e8f0"}}>
          <span style={{fontSize:10,fontWeight:700,color:"#334155",textTransform:"capitalize"}}>{dateTitles[viewMode]}</span>
        </div>
        <div id="onboarding-calendar-search" style={{flex:"1 1 100px",minWidth:80,maxWidth:180,position:"relative"}}>
          <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:12,color:"#94a3b8"}}></span>
          <input type="text" placeholder={t("searchPlaceholder")} value={searchTerm}
            onChange={e=>{setSearchTerm(e.target.value);handleSearch(e.target.value);setShowSearchDrop(e.target.value.trim().length>0);}}
            onFocus={()=>{if(searchTerm.trim())setShowSearchDrop(true);}}
            style={{width:"100%",background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"5px 8px 5px 24px",fontSize:10,fontWeight:700,color:"#334155",outline:"none"}}
            className="focus:border-amber-400 transition-all"/>
          {showSearchDrop&&searchResults.length>0&&(
            <div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:4,background:"#fff",border:"1.5px solid #e2e8f0",borderRadius:12,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",zIndex:50,maxHeight:240,overflowY:"auto"}}>
              {searchResults.map(p=>(<button key={p.id} onClick={()=>{setSearchTerm(p.nume);setShowSearchDrop(false);openEdit(p);}} style={{width:"100%",padding:"10px 14px",borderBottom:"1px solid #f1f5f9",textAlign:"left",background:"transparent",border:"none",cursor:"pointer"}} className="hover:bg-slate-50 transition-all"><span style={{fontSize:12,fontWeight:700,color:"#1e293b",display:"block"}}>{p.nume}</span><div style={{display:"flex",gap:8}}>{p.telefon&&<span style={{fontSize:9,color:"#94a3b8"}}>{p.telefon}</span>}{p.isOnline&&<span style={{fontSize:9,color:"#3b82f6",fontWeight:700}}>{t("onlineLabel")}</span>}</div></button>))}
            </div>
          )}
        </div>
        <div id="onboarding-calendar-view-toggle" style={{display:"flex",background:"#f1f5f9",padding:2,borderRadius:8,gap:2,marginLeft:"auto",flexShrink:0}}>
          {(["day","week","month","year"] as ViewMode[]).map(opt=>(
            <button key={opt} onClick={()=>setViewMode(opt)} style={{...btnStyle(viewMode===opt),padding:"5px 9px",fontSize:9}}>
              {opt==="day"?t("viewDay"):opt==="week"?t("viewWeek"):opt==="month"?t("viewMonth"):t("viewYear")}
            </button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:2,flexShrink:0}}>
          <button onClick={()=>nav(-1)} style={{width:26,height:26,background:"#f1f5f9",border:"1.5px solid #e2e8f0",borderRadius:7,cursor:"pointer",fontSize:14,fontWeight:700,color:"#334155",display:"flex",alignItems:"center",justifyContent:"center"}} className="hover:bg-slate-200 transition-all">‹</button>
          <button onClick={()=>setSelectedDate(new Date())} style={{padding:"3px 8px",background:"transparent",border:"none",cursor:"pointer",fontSize:9,fontWeight:700,color:"#64748b"}} className="hover:text-amber-600 transition-colors">{t("todayBtn")}</button>
          <button onClick={()=>nav(1)} style={{width:26,height:26,background:"#f1f5f9",border:"1.5px solid #e2e8f0",borderRadius:7,cursor:"pointer",fontSize:14,fontWeight:700,color:"#334155",display:"flex",alignItems:"center",justifyContent:"center"}} className="hover:bg-slate-200 transition-all">›</button>
        </div>
        {userSub&&<span style={{fontSize:7,background:"#f1f5f9",color:"#94a3b8",padding:"3px 7px",borderRadius:6,fontWeight:700,textTransform:"uppercase",flexShrink:0}} className="hidden lg:block">{userSub.plan}</span>}
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
        selectedDate={selectedDate}
        workLocations={workLocations} selectedWorkLocation={selectedWorkLocation} onSelectWorkLocation={setSelectedWorkLocation}/>

      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",minHeight:0}}>
        {isLoading&&<div style={{height:3,background:"#fef3c7",overflow:"hidden",flexShrink:0}}><div style={{height:"100%",width:"33%",background:"#f59e0b"}} className="animate-pulse"/></div>}
        {viewMode==="day"&&(
          <DayView selectedDate={selectedDate} programari={filteredProg} rawStaff={rawStaff} rawServices={rawServices} serviceById={serviceById}
            onEdit={openEdit} adminWorkingHours={viewWorkingHours} adminManualBlocks={adminManualBlocks} selectedExpert={selectedExpert} selectedServiciu={selectedServiciu}
            onSelectServiciu={handleSelectServiciu}
            onSwipeDay={(dir)=>setSelectedDate(d=>addDays(d,dir))}
            onBlocksSaved={()=>{ qClient.invalidateQueries({queryKey:["staff",userId]}); refetchProfile(); }}
            userId={userId}
            onAddNew={(time,date,staffId)=>setNewForm({date,time,nume:"",telefon:"",email:"",serviciuId:"",expertId:staffId||selectedExpert||rawStaff[0]?.id||"",motiv:"",workLocationId:selectedWorkLocation||workLocations[0]?.id||""})}/>
        )}
        {viewMode==="week"&&(
          <WeekView selectedDate={selectedDate} programariByDate={programariByDate} rawStaff={rawStaff} rawServices={rawServices} serviceById={serviceById}
            onEdit={openEdit} selectedExpert={selectedExpert} selectedServiciu={selectedServiciu} adminWorkingHours={viewWorkingHours} adminManualBlocks={adminManualBlocks}
            onSelectDate={d=>{setSelectedDate(d);setViewMode("day");}}/>
        )}
        {viewMode==="month"&&(
          <MonthView selectedDate={selectedDate} programariByDate={programariByDate} rawStaff={rawStaff} serviceById={serviceById}
            onEdit={openEdit} onDayClick={d=>{setSelectedDate(d);setViewMode("day");}} selectedExpert={selectedExpert} selectedServiciu={selectedServiciu} adminWorkingHours={viewWorkingHours} adminManualBlocks={adminManualBlocks}/>
        )}
        {viewMode==="year"&&(
          <YearView selectedDate={selectedDate} programariByDate={programariByDate} onMonthClick={(yr,mo)=>{setSelectedDate(new Date(yr,mo,1));setViewMode("month");}}/>
        )}
      </div>
    </div>
  );
}
// --- Root ---------------------------------------------------------------------
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
