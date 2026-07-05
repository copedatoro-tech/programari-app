"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useTranslations } from "next-intl";
import { ChronosTimePicker, ChronosDatePicker } from "@/components/ChronosDateTimePickers";

// ─── Tipuri ────────────────────────────────────────────────────────────────────
interface ServiceRow   { id: string; nume_serviciu: string; price: number; duration: number }
interface StaffRow     { id: string; name: string; services: string[] }
interface WorkingHour  { day: string; start: string; end: string; closed: boolean }
interface ExistingAppt { time: string; duration: number }

interface ServiceSlot {
  slotId:        string;
  serviciu_id:   string;
  specialist_id: string;
  data:          string;
  ora:           string;
}

export interface MultiServiceBookingProps {
  adminId:           string;
  servicii:          ServiceRow[];
  specialisti:       StaffRow[];
  adminWorkingHours: WorkingHour[];
  adminManualBlocks: Record<string, string[]>;
  clientData:        { nume: string; telefon: string; email: string; detalii?: string };
  pozaProfil?:       string | null;
  documenteAtasate?: any[];
  documente?:        any[];
  validateClientData: () => boolean;
  onSuccess?:        () => void;
  onCancel?:         () => void;
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
function fmtDateShort(d: string, localeCode: string) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString(localeCode, {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

// ─── Cheia cache: "data|specialist_id" ───────────────────────────────────────
function mkKey(date: string, specialistId: string) {
  return `${date}|${specialistId || ""}`;
}

// ─── Un slot (rând) ───────────────────────────────────────────────────────────
function SlotRow({
  slot, index, servicii, specialisti, workingHours, manualBlocks,
  apptForSlot, today, onChange, onRemove, canRemove,
}: {
  slot: ServiceSlot; index: number; servicii: ServiceRow[]; specialisti: StaffRow[];
  workingHours: WorkingHour[]; manualBlocks: Record<string, string[]>;
  apptForSlot: ExistingAppt[];
  today: string;
  onChange: (u: Partial<ServiceSlot>) => void;
  onRemove: () => void; canRemove: boolean;
}) {
  const t = useTranslations("multiServiceBooking");
  const localeCode = t("localeCode");
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const svc = servicii.find((s) => s.id === slot.serviciu_id);

  // Specialiștii care oferă serviciul ales
  const filteredSpec = useMemo(() =>
    slot.serviciu_id
      ? specialisti.filter((sp) => sp.services?.includes(slot.serviciu_id))
      : specialisti,
  [slot.serviciu_id, specialisti]);

  // Serviciile pe care le oferă specialistul ales
  const filteredSvc = useMemo(() => {
    if (!slot.specialist_id) return servicii;
    const sp = specialisti.find((s) => s.id === slot.specialist_id);
    return sp?.services?.length ? servicii.filter((s) => sp.services.includes(s.id)) : servicii;
  }, [slot.specialist_id, servicii, specialisti]);

  const handleSpecialistChange = useCallback((specialistId: string) => {
    const sp = specialisti.find((s) => s.id === specialistId);
    const serviceStillValid = slot.serviciu_id && sp?.services?.includes(slot.serviciu_id);
    onChange({
      specialist_id: specialistId,
      serviciu_id:   serviceStillValid ? slot.serviciu_id : "",
      ora:           serviceStillValid ? slot.ora : "00:00",
    });
  }, [slot.serviciu_id, slot.ora, specialisti, onChange]);

  const handleServiciuChange = useCallback((serviciuId: string) => {
    const sp = specialisti.find((s) => s.id === slot.specialist_id);
    const specialistStillValid = slot.specialist_id && sp?.services?.includes(serviciuId);
    onChange({
      serviciu_id:   serviciuId,
      specialist_id: specialistStillValid ? slot.specialist_id : "",
      ora:           "00:00",
    });
  }, [slot.specialist_id, specialisti, onChange]);

  const endOra = svc?.duration && slot.ora && slot.ora !== "00:00"
    ? addMin(slot.ora, svc.duration) : null;

  const isComplete = !!(slot.serviciu_id && slot.data && slot.ora && slot.ora !== "00:00");

  return (
    <>
      {showDate && (
        <div className="fixed inset-0 z-[900] bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-4"
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

      {showTime && (
        <div className="fixed inset-0 z-[900] bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowTime(false)}>
          <div onClick={(e) => e.stopPropagation()} className="relative animate-in fade-in zoom-in duration-200">
            <ChronosTimePicker
              value={slot.ora && slot.ora !== "00:00" ? slot.ora : "09:00"}
              onChange={(v) => { onChange({ ora: v }); setShowTime(false); }}
              onClose={() => setShowTime(false)}
              workingHours={workingHours}
              existingAppointments={apptForSlot}
              selectedDate={slot.data}
              serviceDuration={svc?.duration || 30}
              manualBlocks={manualBlocks}
            />
          </div>
        </div>
      )}

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
            {t("serviceLabel", { n: index + 1 })}
            {isComplete && svc && <span className="ml-2 text-amber-600">— {svc.nume_serviciu}</span>}
          </span>
          {canRemove && (
            <button onClick={onRemove}
              className="ml-auto w-8 h-8 bg-red-50 text-red-400 rounded-xl flex items-center justify-center font-black text-xs hover:bg-red-500 hover:text-white transition-all active:scale-90">
              ✕
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">{t("chooseSpecialistLabel")}</label>
            <select
              className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner cursor-pointer transition-all"
              value={slot.specialist_id}
              onChange={(e) => handleSpecialistChange(e.target.value)}>
              <option value="">{t("chooseSpecialistOpt")}</option>
              {filteredSpec.map((sp) => (
                <option key={sp.id} value={sp.id}>{sp.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">{t("chooseServiceLabel")}</label>
            <select
              className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner cursor-pointer transition-all"
              value={slot.serviciu_id}
              onChange={(e) => handleServiciuChange(e.target.value)}>
              <option value="">{t("chooseServiceOpt")}</option>
              {filteredSvc.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nume_serviciu}{s.price ? ` — ${s.price} RON` : ""}{s.duration ? ` (${s.duration} min)` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">{t("dateLabel")}</label>
            <button type="button" onClick={() => setShowDate(true)}
              className="w-full h-[72px] bg-slate-900 text-white rounded-[25px] font-black text-[18px] uppercase italic hover:text-amber-500 transition-all flex items-center justify-center gap-3 shadow-inner">
              <span>📅</span>
              <span>{slot.data ? fmtDateShort(slot.data, localeCode) : t("chooseDateBtn")}</span>
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">{t("timeLabel")}</label>
            <button type="button"
              onClick={() => {
                if (!slot.serviciu_id) { alert(t("chooseServiceFirstAlert")); return; }
                setShowTime(true);
              }}
              className={`w-full h-[72px] rounded-[25px] font-black text-[18px] uppercase italic flex items-center justify-center gap-3 shadow-inner transition-all ${
                slot.ora && slot.ora !== "00:00"
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "bg-slate-900 text-white hover:text-amber-500"
              }`}>
              <span>🕒</span>
              <span>{slot.ora && slot.ora !== "00:00" ? slot.ora : t("chooseTimeBtn")}</span>
            </button>
          </div>
        </div>

        {isComplete && endOra && (
          <div className="mt-4 bg-gradient-to-r from-slate-900 to-slate-800 rounded-[22px] px-6 py-4 flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <span className="text-amber-400 text-xl">⏱️</span>
              <div>
                <p className="text-[8px] font-black text-amber-400 uppercase italic tracking-widest">{t("reservedIntervalLabel")}</p>
                <p className="text-sm font-black text-white italic">{slot.ora} → {endOra} • {fmtDateShort(slot.data, localeCode)}</p>
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
  clientData, validateClientData, onSuccess, onCancel, documente,
}: MultiServiceBookingProps) {
  const t = useTranslations("multiServiceBooking");
  const localeCode = t("localeCode");
  const today = new Date().toISOString().split("T")[0];

  const [slots, setSlots] = useState<ServiceSlot[]>([
    { slotId: uid(), serviciu_id: "", specialist_id: "", data: today, ora: "00:00" },
  ]);
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState<string[]>([]);
  const [apptCache, setApptCache] = useState<Record<string, ExistingAppt[]>>({});

  // ✅ FIX: fetchAppt adaugă ÎNTOTDEAUNA filtrul angajat_id când specialistul e ales
  // Dacă nu e ales specialist, NU aducem nimic (0 ore blocate) — e corect,
  // pentru că fără specialist ales nu putem ști care e ocupat
  const fetchAppt = useCallback(async (date: string, specialistId: string) => {
    // Dacă nu e specialist ales, nu are sens să blocăm ore — returnăm gol
    if (!specialistId) {
      const key = mkKey(date, "");
      setApptCache((p) => ({ ...p, [key]: [] }));
      return;
    }

    const key = mkKey(date, specialistId);

    setApptCache((prev) => {
      if (prev[key] !== undefined) return prev;

      supabase
        .from("appointments")
        .select("time, duration")
        .eq("user_id", adminId)
        .eq("date", date)
        .eq("angajat_id", specialistId) // ✅ ÎNTOTDEAUNA filtru pe specialist
        .neq("status", "cancelled")
        .then(({ data }) => {
          setApptCache((p) => ({ ...p, [key]: data || [] }));
        });

      return { ...prev, [key]: [] };
    });
  }, [adminId]);

  const updateSlot = useCallback((id: string, u: Partial<ServiceSlot>) => {
    setSlots((prev) => {
      const updated = prev.map((s) => (s.slotId === id ? { ...s, ...u } : s));
      const slot = updated.find((s) => s.slotId === id);
      if (slot?.data) {
        fetchAppt(slot.data, slot.specialist_id);
      }
      return updated;
    });
  }, [fetchAppt]);

  useEffect(() => {
    slots.forEach((s) => fetchAppt(s.data, s.specialist_id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const submit = async () => {
    setErrors([]);

    const isClientValid = validateClientData();
    if (!isClientValid) {
      setErrors([t("errClientData")]);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const erori: string[] = [];
    const now = new Date();
    const currentTotalMin = now.getHours() * 60 + now.getMinutes();

    slots.forEach((s, i) => {
      if (!s.serviciu_id)              erori.push(t("errChooseService", { n: i + 1 }));
      if (!s.data)                     erori.push(t("errChooseDate", { n: i + 1 }));
      if (!s.ora || s.ora === "00:00") erori.push(t("errChooseTime", { n: i + 1 }));
      else if (s.data === today && toMin(s.ora) < currentTotalMin)
        erori.push(t("errTimePassed", { n: i + 1, ora: s.ora }));
    });

    if (erori.length > 0) { setErrors(erori); return; }

    // Suprapuneri în formular — doar dacă același specialist
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i], b = slots[j];
        if (a.data !== b.data) continue;
        if (a.specialist_id !== b.specialist_id) continue; // ✅ specialiști diferiți = OK
        const sa = servicii.find((x) => x.id === a.serviciu_id);
        const sb = servicii.find((x) => x.id === b.serviciu_id);
        if (!sa || !sb) continue;
        const as_ = toMin(a.ora), ae = as_ + sa.duration;
        const bs  = toMin(b.ora), be = bs  + sb.duration;
        if (as_ < be && ae > bs)
          erori.push(t("errOverlapForm", { i: i + 1, j: j + 1 }));
      }
    }

    if (erori.length > 0) { setErrors(erori); return; }

    setLoading(true);
    try {
      // ✅ Query per combinație data + specialist
      const keys = [...new Set(slots.map((s) => mkKey(s.data, s.specialist_id)))];
      const dbByKey: Record<string, ExistingAppt[]> = {};

      await Promise.all(keys.map(async (key) => {
        const [date, specialistId] = key.split("|");
        // ✅ Dacă nu e specialist — lista goală, nu blocăm nimic
        if (!specialistId) { dbByKey[key] = []; return; }
        const { data } = await supabase
          .from("appointments").select("time, duration")
          .eq("user_id", adminId).eq("date", date)
          .eq("angajat_id", specialistId) // ✅ filtru strict pe specialist
          .neq("status", "cancelled");
        dbByKey[key] = data || [];
      }));

      for (const s of slots) {
        const svc = servicii.find((x) => x.id === s.serviciu_id);
        if (!svc || !s.ora || s.ora === "00:00") continue;
        // ✅ Dacă nu e specialist ales, nu verificăm suprapunere
        if (!s.specialist_id) continue;
        const key = mkKey(s.data, s.specialist_id);
        const ns = toMin(s.ora), ne = ns + svc.duration;
        const overlap = (dbByKey[key] || []).some((a) => {
          const as_ = toMin(a.time), ae = as_ + (a.duration || 30);
          return ns < ae && ne > as_;
        });
        if (overlap) {
          const specName = specialisti.find((x) => x.id === s.specialist_id)?.name || t("chosenSpecialistFallback");
          erori.push(t("errOverlapDb", { svc: svc.nume_serviciu, ora: s.ora, specName }));
        }
      }

      if (erori.length > 0) { setErrors(erori); setLoading(false); return; }

      const rows = slots.map((s) => {
        const svc  = servicii.find((x) => x.id === s.serviciu_id);
        const spec = specialisti.find((x) => x.id === s.specialist_id);
        return {
          user_id:     adminId,
          title:       clientData.nume.trim(),
          prenume:     clientData.nume.trim(),
          nume:        clientData.nume.trim(),
          phone:       clientData.telefon,
          email:       clientData.email.trim(),
          date:        s.data,
          time:        s.ora,
          duration:    svc?.duration || 0,
          details:     `Serviciu: ${svc?.nume_serviciu || t("naFallback")}${clientData.detalii ? ` | Notă: ${clientData.detalii}` : ""} | Rezervare multiplă`,
          specialist:  spec?.name || t("firstAvailFallback"),
          angajat_id:  s.specialist_id || null,
          serviciu_id: s.serviciu_id || null,
          status:      "pending",
          is_client_booking: false,
          ...(documente?.length ? { documente } : {}),
        };
      });

      const { error } = await supabase.from("appointments").insert(rows);
      if (error) throw error;
      onSuccess?.();
    } catch (e: any) {
      setErrors([`${t("saveErrorPrefix")}${e?.message || t("saveErrorDefault")}`]);
    } finally {
      setLoading(false);
    }
  };

  const byDate = useMemo(() => {
    const m: Record<string, ServiceSlot[]> = {};
    completedSlots.forEach((s) => { if (!m[s.data]) m[s.data] = []; m[s.data].push(s); });
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
            apptForSlot={apptCache[mkKey(slot.data, slot.specialist_id)] || []}
            today={today}
            onChange={(u) => updateSlot(slot.slotId, u)}
            onRemove={() => removeSlot(slot.slotId)}
            canRemove={slots.length > 1}
          />
        ))}
      </div>

      <button onClick={addSlot} disabled={slots.length >= 8}
        className="w-full py-5 border-2 border-dashed border-amber-400 rounded-[30px] font-black uppercase italic text-[12px] text-amber-600 hover:bg-amber-50 hover:border-amber-500 transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-3">
        <span className="w-7 h-7 bg-amber-500 text-white rounded-xl flex items-center justify-center text-lg font-black leading-none">+</span>
        {t("addServiceBtn")}
      </button>

      {completedSlots.length > 0 && (
        <div className="bg-slate-50 rounded-[35px] border-2 border-slate-100 p-6 space-y-4 shadow-inner">
          <p className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">{t("summaryTitle")}</p>
          {Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, ds]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[10px] font-black text-slate-500 uppercase italic bg-white px-3 py-1 rounded-full border border-slate-200">
                  📅 {fmtDateShort(date, localeCode)}
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
                          {spec?.name || t("firstAvailFallback")} • {s.ora} → {addMin(s.ora, svc.duration)}
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
            <p className="text-sm font-black text-slate-900 uppercase italic">{t("totalLabel")}</p>
            <div className="text-right">
              <p className="text-xl font-black text-amber-600">{totals.price} RON</p>
              <p className="text-[10px] font-bold text-slate-400 italic">{totals.dur}{t("minutesSuffix")}</p>
            </div>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-[30px] p-6 space-y-2">
          <p className="text-[10px] font-black text-red-600 uppercase italic tracking-widest">{t("attentionTitle")}</p>
          {errors.map((e, i) => <p key={i} className="text-[12px] font-bold text-red-700 italic">• {e}</p>)}
        </div>
      )}

      <button onClick={submit} disabled={loading || completedSlots.length === 0}
        className="w-full py-6 bg-amber-600 text-white rounded-[30px] font-black uppercase italic text-[13px] shadow-2xl hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-50 border-b-4 border-amber-700 hover:border-slate-800">
        {loading ? t("processingBtn") : t("saveBtn", { n: completedSlots.length })}
      </button>
    </div>
  );
}