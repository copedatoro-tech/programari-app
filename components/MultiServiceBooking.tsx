"use client";

import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ChronosTimePicker, ChronosDatePicker } from "@/components/ChronosDateTimePickers";

// ─── Tipuri ────────────────────────────────────────────────────────────────────
interface ServiceRow   { id: string; nume_serviciu: string; price: number; duration: number }
interface StaffRow     { id: string; name: string; services: string[] }
interface WorkingHour  { day: string; start: string; end: string; closed: boolean }
interface ExistingAppt { time: string; duration: number }

interface ServiceSlot {
  slotId:         string;
  serviciu_id:    string;
  specialist_id: string;
  data:           string;
  ora:            string;
}

export interface MultiServiceBookingProps {
  adminId:            string;
  servicii:           ServiceRow[];
  specialisti:        StaffRow[];
  adminWorkingHours:  WorkingHour[];
  adminManualBlocks:  Record<string, string[]>;
  clientData:         { nume: string; telefon: string; email: string; detalii?: string };
  validateClientData: () => boolean;
  onSuccess?:         () => void;
  onCancel?:          () => void;
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function addMin(t: string, min: number): string {
  if (!t || t === "00:00") return "00:00";
  const [h, m] = t.split(":").map(Number);
  const total = h * 60 + m + min;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
function toMin(t: string): number {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}
function uid() { return Math.random().toString(36).slice(2, 9); }
function fmtDateShort(d: string) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("ro-RO", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

// ─── Un slot (rând) ───────────────────────────────────────────────────────────
function SlotRow({
  slot, index, servicii, specialisti, workingHours, manualBlocks,
  apptForDate, today, onChange, onRemove, canRemove,
}: {
  slot: ServiceSlot; index: number; servicii: ServiceRow[]; specialisti: StaffRow[];
  workingHours: WorkingHour[]; manualBlocks: Record<string, string[]>;
  apptForDate: ExistingAppt[]; today: string;
  onChange: (u: Partial<ServiceSlot>) => void;
  onRemove: () => void; canRemove: boolean;
}) {
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const svc = servicii.find((s) => s.id === slot.serviciu_id);

  const filteredSpec = useMemo(() =>
    slot.serviciu_id
      ? specialisti.filter((sp) => sp.services?.includes(slot.serviciu_id))
      : specialisti,
  [slot.serviciu_id, specialisti]);

  const filteredSvc = useMemo(() => {
    if (!slot.specialist_id) return servicii;
    const sp = specialisti.find((s) => s.id === slot.specialist_id);
    return sp?.services?.length ? servicii.filter((s) => sp.services.includes(s.id)) : servicii;
  }, [slot.specialist_id, servicii, specialisti]);

  const endOra = svc?.duration && slot.ora && slot.ora !== "00:00"
    ? addMin(slot.ora, svc.duration) : null;

  const isComplete = !!(slot.serviciu_id && slot.data && slot.ora && slot.ora !== "00:00");

  return (
    <>
      {/* DatePicker cu închidere la click exterior */}
      {showDate && (
        <div className="fixed inset-0 z-[900] bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-4 transition-all"
          onClick={() => setShowDate(false)}>
          <div onClick={(e) => e.stopPropagation()} className="relative animate-in fade-in zoom-in duration-200">
            <ChronosDatePicker
              value={slot.data}
              onChange={(v) => { onChange({ data: v, ora: "00:00" }); setShowDate(false); }}
              minDate={today} onClose={() => setShowDate(false)}
              workingHours={workingHours} manualBlocks={manualBlocks}
            />
          </div>
        </div>
      )}

      {/* TimePicker cu închidere la click exterior */}
      {showTime && (
        <div className="fixed inset-0 z-[900] bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-4 transition-all"
          onClick={() => setShowTime(false)}>
          <div onClick={(e) => e.stopPropagation()} className="relative animate-in fade-in zoom-in duration-200">
            <ChronosTimePicker
              value={slot.ora && slot.ora !== "00:00" ? slot.ora : "09:00"}
              onChange={(v) => { onChange({ ora: v }); setShowTime(false); }}
              onClose={() => setShowTime(false)}
              workingHours={workingHours} existingAppointments={apptForDate}
              selectedDate={slot.data} serviceDuration={svc?.duration || 30}
              manualBlocks={manualBlocks}
            />
          </div>
        </div>
      )}

      {/* ── Card slot ─────────────────────────────────────────────────────── */}
      <div className={`relative bg-white rounded-[35px] border-2 p-6 md:p-8 shadow-md transition-all duration-300 ${
        isComplete ? "border-amber-400 shadow-amber-50" : "border-slate-100 hover:border-slate-200"
      }`}>

        <div className="flex items-center gap-3 mb-6">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm italic shadow-sm ${
            isComplete ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400"
          }`}>
            {isComplete ? "✓" : index + 1}
          </div>
          <span className="text-[10px] font-black uppercase italic text-slate-400 tracking-widest">
            Serviciu #{index + 1}
            {isComplete && svc && (
              <span className="ml-2 text-amber-600">— {svc.nume_serviciu}</span>
            )}
          </span>

          {canRemove && (
            <button 
              onClick={onRemove}
              title="Elimină acest serviciu"
              className="ml-auto w-8 h-8 bg-red-50 text-red-400 rounded-xl flex items-center justify-center font-black text-xs hover:bg-red-500 hover:text-white transition-all active:scale-90">
              ✕
            </button>
          )}
        </div>

        {/* ── Rând 1: Specialist + Serviciu ─────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">
              Alege Specialist
              {slot.serviciu_id && <span className="text-amber-500 ml-1">(filtrat)</span>}
            </label>
            <select
              className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner cursor-pointer transition-all"
              value={slot.specialist_id}
              onChange={(e) => onChange({ specialist_id: e.target.value })}
            >
              <option value="">Alege Specialist...</option>
              {filteredSpec.map((sp) => (
                <option key={sp.id} value={sp.id}>{sp.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">
              Alege Serviciu
              {slot.specialist_id && <span className="text-amber-500 ml-1">(filtrat)</span>}
            </label>
            <select
              className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner cursor-pointer transition-all"
              value={slot.serviciu_id}
              onChange={(e) => onChange({ serviciu_id: e.target.value, specialist_id: "", ora: "00:00" })}
            >
              <option value="">Alege Serviciu...</option>
              {filteredSvc.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nume_serviciu}{s.price ? ` — ${s.price} RON` : ""}{s.duration ? ` (${s.duration} min)` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Rând 2: Data + Ora ─────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Data</label>
            <button 
              type="button" 
              onClick={() => setShowDate(true)}
              title="Alege data programării"
              className="w-full h-[72px] bg-slate-900 text-white rounded-[25px] font-black text-[18px] uppercase italic hover:text-amber-500 transition-all flex items-center justify-center gap-3 shadow-inner">
              <span>📅</span>
              <span>{slot.data ? fmtDateShort(slot.data) : "ALEGE DATA"}</span>
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">Ora</label>
            <button 
              type="button"
              title={slot.serviciu_id ? "Alege ora programării" : "Alege întâi serviciul"}
              onClick={() => {
                if (!slot.serviciu_id) { alert("Alege mai întâi serviciul."); return; }
                setShowTime(true);
              }}
              className={`w-full h-[72px] rounded-[25px] font-black text-[18px] uppercase italic flex items-center justify-center gap-3 shadow-inner transition-all ${
                slot.ora && slot.ora !== "00:00"
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "bg-slate-900 text-white hover:text-amber-500"
              }`}>
              <span>🕒</span>
              <span>{slot.ora && slot.ora !== "00:00" ? slot.ora : "ORA"}</span>
            </button>
          </div>
        </div>

        {isComplete && endOra && (
          <div className="mt-4 bg-gradient-to-r from-slate-900 to-slate-800 rounded-[22px] px-6 py-4 flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <span className="text-amber-400 text-xl">⏱️</span>
              <div>
                <p className="text-[8px] font-black text-amber-400 uppercase italic tracking-widest">Interval rezervat</p>
                <p className="text-sm font-black text-white italic">{slot.ora} → {endOra} • {fmtDateShort(slot.data)}</p>
              </div>
            </div>
            <div className="text-right">
              {svc?.price ? <p className="text-sm font-black text-amber-400">{svc.price} RON</p> : null}
              <p className="text-[9px] font-bold text-slate-400 italic">{svc?.duration} min</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Componenta principală ────────────────────────────────────────────────────
export default function MultiServiceBooking({
  adminId, servicii, specialisti, adminWorkingHours, adminManualBlocks,
  clientData, validateClientData, onSuccess, onCancel,
}: MultiServiceBookingProps) {
  const today = new Date().toISOString().split("T")[0];

  const [slots, setSlots] = useState<ServiceSlot[]>([
    { slotId: uid(), serviciu_id: "", specialist_id: "", data: today, ora: "00:00" },
  ]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState<string[]>([]);
  const [apptCache, setApptCache] = useState<Record<string, ExistingAppt[]>>({});

  const fetchAppt = async (date: string) => {
    if (apptCache[date] !== undefined) return;
    const { data } = await supabase
      .from("appointments").select("time, duration")
      .eq("user_id", adminId).eq("date", date).neq("status", "cancelled");
    setApptCache((p) => ({ ...p, [date]: data || [] }));
  };

  const completedSlots = slots.filter((s) => s.serviciu_id && s.data && s.ora && s.ora !== "00:00");

  const totals = useMemo(() => {
    let price = 0, dur = 0;
    completedSlots.forEach((s) => {
      const svc = servicii.find((x) => x.id === s.serviciu_id);
      if (svc) { price += svc.price; dur += svc.duration; }
    });
    return { price, dur };
  }, [completedSlots, servicii]);

  const addSlot = () => {
    const lastDate = slots[slots.length - 1]?.data || today;
    setSlots((p) => [...p, { slotId: uid(), serviciu_id: "", specialist_id: "", data: lastDate, ora: "00:00" }]);
  };

  const removeSlot = (id: string) => setSlots((p) => p.filter((s) => s.slotId !== id));

  const updateSlot = (id: string, u: Partial<ServiceSlot>) => {
    setSlots((p) => p.map((s) => s.slotId === id ? { ...s, ...u } : s));
    if (u.data) fetchAppt(u.data);
  };

  const submit = async () => {
    if (!validateClientData()) {
      setErrors(["Completează Numele, Telefonul și Email-ul clientului mai sus."]);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const erori: string[] = [];
    slots.forEach((s, i) => {
      if (!s.serviciu_id)              erori.push(`Serviciul #${i + 1}: alege un serviciu.`);
      if (!s.data)                     erori.push(`Serviciul #${i + 1}: alege data.`);
      if (!s.ora || s.ora === "00:00") erori.push(`Serviciul #${i + 1}: alege ora.`);
    });
    if (erori.length) { setErrors(erori); return; }

    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i], b = slots[j];
        if (a.data !== b.data) continue;
        const sa = servicii.find((x) => x.id === a.serviciu_id);
        const sb = servicii.find((x) => x.id === b.serviciu_id);
        if (!sa || !sb) continue;
        const as_ = toMin(a.ora), ae = as_ + sa.duration;
        const bs  = toMin(b.ora), be = bs  + sb.duration;
        if (as_ < be && ae > bs)
          erori.push(`Serviciile #${i + 1} și #${j + 1} se suprapun pe ${a.data}.`);
      }
    }

    const dates = [...new Set(slots.map((s) => s.data))];
    const dbByDate: Record<string, ExistingAppt[]> = {};
    await Promise.all(dates.map(async (d) => {
      if (apptCache[d] !== undefined) { dbByDate[d] = apptCache[d]; return; }
      const { data } = await supabase.from("appointments").select("time, duration")
        .eq("user_id", adminId).eq("date", d).neq("status", "cancelled");
      dbByDate[d] = data || [];
    }));

    for (const s of slots) {
      const svc = servicii.find((x) => x.id === s.serviciu_id);
      if (!svc || !s.ora || s.ora === "00:00") continue;
      const ns = toMin(s.ora), ne = ns + svc.duration;
      const overlap = (dbByDate[s.data] || []).some((a) => {
        const as_ = toMin(a.time), ae = as_ + (a.duration || 30);
        return ns < ae && ne > as_;
      });
      if (overlap)
        erori.push(`"${svc.nume_serviciu}" la ${s.ora} pe ${s.data} se suprapune cu o programare existentă.`);
    }

    if (erori.length) { setErrors(erori); return; }

    setErrors([]);
    setLoading(true);
    try {
      const rows = slots.map((s) => {
        const svc  = servicii.find((x) => x.id === s.serviciu_id);
        const spec = specialisti.find((x) => x.id === s.specialist_id);
        return {
          user_id:    adminId,
          title:      clientData.nume.trim(),
          prenume:    clientData.nume.trim(),
          nume:       clientData.nume.trim(),
          phone:      clientData.telefon,
          email:      clientData.email.trim(),
          date:       s.data,
          time:       s.ora,
          duration:   svc?.duration || 0,
          details:    `Serviciu: ${svc?.nume_serviciu || "N/A"}${clientData.detalii ? ` | Notă: ${clientData.detalii}` : ""} | Rezervare multiplă (${slots.length} servicii)`,
          specialist: spec?.name || "Prima Disponibilitate",
          angajat_id: s.specialist_id || null,
          serviciu_id: s.serviciu_id || null,
          status:      "pending",
          is_client_booking: false,
        };
      });
      const { error } = await supabase.from("appointments").insert(rows);
      if (error) setErrors([`Eroare: ${error.message}`]);
      else onSuccess?.();
    } catch (e: any) {
      setErrors([e?.message || "Eroare neașteptată."]);
    } finally {
      setLoading(false);
    }
  };

  const byDate = useMemo(() => {
    const m: Record<string, ServiceSlot[]> = {};
    completedSlots.forEach((s) => {
      if (!m[s.data]) m[s.data] = [];
      m[s.data].push(s);
    });
    return m;
  }, [completedSlots]);

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        {slots.map((slot, i) => (
          <SlotRow
            key={slot.slotId} slot={slot} index={i}
            servicii={servicii} specialisti={specialisti}
            workingHours={adminWorkingHours} manualBlocks={adminManualBlocks}
            apptForDate={apptCache[slot.data] || []} today={today}
            onChange={(u) => updateSlot(slot.slotId, u)}
            onRemove={() => removeSlot(slot.slotId)}
            canRemove={slots.length > 1}
          />
        ))}
      </div>

      <button 
        onClick={addSlot} 
        disabled={slots.length >= 8}
        title="Adaugă un alt serviciu la această rezervare"
        className="w-full py-5 border-2 border-dashed border-amber-400 rounded-[30px] font-black uppercase italic text-[12px] text-amber-600 hover:bg-amber-50 hover:border-amber-500 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3">
        <span className="w-7 h-7 bg-amber-500 text-white rounded-xl flex items-center justify-center text-lg font-black leading-none">+</span>
        ADAUGĂ SERVICIU NOU {slots.length >= 8 && <span className="text-slate-400">(MAXIM 8)</span>}
      </button>

      {completedSlots.length > 0 && (
        <div className="bg-slate-50 rounded-[35px] border-2 border-slate-100 p-6 space-y-4 shadow-inner">
          <p className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">📋 Sumar Rezervare</p>

          {Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, ds]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[10px] font-black text-slate-500 uppercase italic bg-white px-3 py-1 rounded-full border border-slate-200">
                  📅 {fmtDateShort(date)}
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              {ds.map((s) => {
                const svc  = servicii.find((x) => x.id === s.serviciu_id);
                const spec = specialisti.find((x) => x.id === s.specialist_id);
                if (!svc) return null;
                const idx = slots.findIndex((x) => x.slotId === s.slotId);
                return (
                  <div key={s.slotId} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 pl-2">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 bg-amber-500 rounded-xl flex items-center justify-center text-white text-[10px] font-black shrink-0">{idx + 1}</span>
                      <div>
                        <p className="text-[12px] font-black text-slate-800 uppercase italic">{svc.nume_serviciu}</p>
                        <p className="text-[9px] font-bold text-slate-400 italic">
                          {spec?.name || "Prima disponibilitate"} • {s.ora} → {addMin(s.ora, svc.duration)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] font-black text-slate-800">{svc.price} RON</p>
                      <p className="text-[9px] font-bold text-slate-400 italic">{svc.duration} min</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          <div className="flex justify-between pt-3 border-t-2 border-slate-200">
            <div>
              <p className="text-sm font-black text-slate-900 uppercase italic">TOTAL</p>
              <p className="text-[9px] font-bold text-slate-400 italic">
                {completedSlots.length} servicii • {Object.keys(byDate).length} {Object.keys(byDate).length === 1 ? "zi" : "zile"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-amber-600">{totals.price} RON</p>
              <p className="text-[10px] font-bold text-slate-400 italic">{totals.dur} minute</p>
            </div>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-[30px] p-6 space-y-2 animate-bounce-short">
          <p className="text-[10px] font-black text-red-600 uppercase italic tracking-widest">⚠️ Atenție</p>
          {errors.map((e, i) => <p key={i} className="text-[12px] font-bold text-red-700 italic">• {e}</p>)}
        </div>
      )}

      <button 
        onClick={submit} 
        disabled={loading || completedSlots.length === 0}
        title="Confirmă și salvează toate programările de mai sus"
        className="w-full py-6 bg-amber-600 text-white rounded-[30px] font-black uppercase italic text-[13px] shadow-2xl hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border-b-4 border-amber-700 hover:border-slate-800">
        {loading
          ? <span className="animate-pulse">Se procesează...</span>
          : completedSlots.length === 0
            ? "COMPLETEAZĂ CEL PUȚIN UN SERVICIU"
            : `✓ SALVEAZĂ ${completedSlots.length} ${completedSlots.length === 1 ? "PROGRAMARE" : "PROGRAMĂRI"}${totals.price > 0 ? ` — ${totals.price} RON` : ""}`}
      </button>
    </div>
  );
}