"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { ChronosTimePicker, ChronosDatePicker } from "@/components/ChronosDateTimePickers";

interface ApptData {
  id: string;
  clientName: string;
  date: string;
  time: string;
  duration: number;
  status: string;
  serviceName: string | null;
  specialistName: string | null;
  adminId: string;
  serviciuId: string | null;
  specialistId: string | null;
  workingHours: any[];
  manualBlocks: Record<string, string[]>;
}

type ViewState = "loading" | "notFound" | "view" | "cancelConfirm" | "cancelSuccess" | "reschedule" | "rescheduleSuccess";

export default function GestioneazaPage() {
  const params = useParams();
  const id = params.id as string;
  const t = useTranslations("gestioneaza");

  const [state, setState] = useState<ViewState>("loading");
  const [appt, setAppt] = useState<ApptData | null>(null);
  const [error, setError] = useState("");

  // Reprogramare
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [existingSlots, setExistingSlots] = useState<{ time: string; duration: number }[]>([]);
  const [saving, setSaving] = useState(false);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const loadAppt = useCallback(async () => {
    try {
      const res = await fetch(`/api/appointments/${id}`);
      if (!res.ok) { setState("notFound"); return; }
      const data: ApptData = await res.json();
      setAppt(data);
      setNewDate(data.date);
      setNewTime(data.time);
      setState("view");
    } catch {
      setState("notFound");
    }
  }, [id]);

  useEffect(() => {
    if (id) loadAppt();
  }, [id, loadAppt]);

  const fetchSlotsForDate = useCallback(async (date: string) => {
    try {
      const res = await fetch(`/api/appointments/${id}/slots?date=${date}`);
      const data = await res.json();
      setExistingSlots(data.slots || []);
    } catch {
      setExistingSlots([]);
    }
  }, [id]);

  useEffect(() => {
    if (state === "reschedule" && newDate) fetchSlotsForDate(newDate);
  }, [state, newDate, fetchSlotsForDate]);

  const isPast = useMemo(() => {
    if (!appt) return false;
    const apptDateTime = new Date(`${appt.date}T${appt.time}`);
    return apptDateTime.getTime() < Date.now();
  }, [appt]);

  const isCancelled = appt?.status === "cancelled";

  const handleCancel = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/appointments/${id}/cancel`, { method: "POST" });
      if (!res.ok) throw new Error();
      setState("cancelSuccess");
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setSaving(false);
    }
  };

  const handleReschedule = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/appointments/${id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDate, time: newTime }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (data.error === "conflict") setError(t("errorGeneric"));
        else setError(t("errorGeneric"));
        setSaving(false);
        return;
      }
      setAppt((prev) => (prev ? { ...prev, date: newDate, time: newTime } : prev));
      setState("rescheduleSuccess");
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (d: string) => {
    if (!d) return "";
    return new Date(d + "T00:00:00").toLocaleDateString(undefined, {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  };

  const CardShell = ({ children }: { children: React.ReactNode }) => (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="fixed top-4 right-4 z-[700]"><LocaleSwitcher /></div>
      <div className="w-full max-w-lg bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 px-8 py-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full -mr-20 -mt-20 blur-3xl z-0"></div>
          <Image src="/logo-chronos.png" alt="Chronos" width={72} height={72} priority className="mx-auto mb-4 relative z-10" />
          <h1 className="text-2xl font-black uppercase text-white italic tracking-tighter relative z-10">
            {t("headerTitle")} <span className="text-amber-500">{t("headerHighlight")}</span>
          </h1>
        </div>
        <div className="p-8">{children}</div>
      </div>
    </main>
  );

  if (state === "loading") {
    return (
      <CardShell>
        <p className="text-center font-black uppercase italic text-slate-400 animate-pulse">{t("loading")}</p>
      </CardShell>
    );
  }

  if (state === "notFound") {
    return (
      <CardShell>
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-black uppercase italic text-slate-900 mb-2">{t("notFoundTitle")}</h2>
          <p className="text-slate-500">{t("notFoundMsg")}</p>
        </div>
      </CardShell>
    );
  }

  if (!appt) return null;

  if (isCancelled && state !== "cancelSuccess") {
    return (
      <CardShell>
        <div className="text-center">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-black uppercase italic text-slate-900 mb-2">{t("alreadyCancelledTitle")}</h2>
          <p className="text-slate-500">{t("alreadyCancelledMsg")}</p>
        </div>
      </CardShell>
    );
  }

  if (isPast && state !== "cancelSuccess" && state !== "rescheduleSuccess") {
    return (
      <CardShell>
        <div className="text-center">
          <div className="text-5xl mb-4">🕓</div>
          <h2 className="text-xl font-black uppercase italic text-slate-900 mb-2">{t("pastTitle")}</h2>
          <p className="text-slate-500">{t("pastMsg")}</p>
        </div>
      </CardShell>
    );
  }

  if (state === "cancelSuccess") {
    return (
      <CardShell>
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-3xl">✓</div>
          <h2 className="text-xl font-black uppercase italic text-slate-900 mb-2">{t("cancelSuccessTitle")}</h2>
          <p className="text-slate-500">{t("cancelSuccessMsg")}</p>
        </div>
      </CardShell>
    );
  }

  if (state === "rescheduleSuccess") {
    return (
      <CardShell>
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-3xl">✓</div>
          <h2 className="text-xl font-black uppercase italic text-slate-900 mb-2">{t("rescheduleSuccessTitle")}</h2>
          <p className="text-slate-500 mb-4">{t("rescheduleSuccessMsg")}</p>
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
            <p className="font-black text-slate-900">{fmtDate(newDate)}</p>
            <p className="font-black text-amber-600 text-lg">{newTime}</p>
          </div>
        </div>
      </CardShell>
    );
  }

  if (state === "cancelConfirm") {
    return (
      <CardShell>
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-black uppercase italic text-slate-900 mb-2">{t("confirmCancelTitle")}</h2>
          <p className="text-slate-500 mb-6">{t("confirmCancelMsg")}</p>
          {error && <p className="text-red-500 text-sm font-bold mb-4">{error}</p>}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase italic hover:bg-red-600 transition-all disabled:opacity-50"
            >
              {saving ? "..." : t("confirmCancelYes")}
            </button>
            <button
              onClick={() => setState("view")}
              className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase italic hover:bg-slate-200 transition-all"
            >
              {t("confirmCancelNo")}
            </button>
          </div>
        </div>
      </CardShell>
    );
  }

  if (state === "reschedule") {
    return (
      <CardShell>
        <h2 className="text-lg font-black uppercase italic text-slate-900 mb-6 text-center">{t("rescheduleTitle")}</h2>
        <div className="space-y-4 mb-6">
          <button
            type="button"
            onClick={() => setShowDatePicker(true)}
            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase italic hover:bg-amber-500 hover:text-black transition-all"
          >
            📅 {newDate ? fmtDate(newDate) : t("chooseDateBtn")}
          </button>
          <button
            type="button"
            onClick={() => setShowTimePicker(true)}
            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase italic hover:bg-amber-500 hover:text-black transition-all"
          >
            🕒 {newTime || t("chooseTimeBtn")}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm font-bold mb-4 text-center">{error}</p>}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleReschedule}
            disabled={saving || !newDate || !newTime}
            className="w-full py-4 bg-amber-500 text-black rounded-2xl font-black uppercase italic hover:bg-amber-600 transition-all disabled:opacity-50"
          >
            {saving ? "..." : t("confirmRescheduleBtn")}
          </button>
          <button
            onClick={() => setState("view")}
            className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase italic hover:bg-slate-200 transition-all"
          >
            {t("backBtn")}
          </button>
        </div>

        {showDatePicker && (
          <div className="fixed inset-0 z-[900] bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowDatePicker(false)}>
            <div onClick={(e) => e.stopPropagation()}>
              <ChronosDatePicker
                value={newDate}
                onChange={(v) => { setNewDate(v); setNewTime(""); setShowDatePicker(false); }}
                minDate={today}
                onClose={() => setShowDatePicker(false)}
                workingHours={appt.workingHours}
                manualBlocks={appt.manualBlocks}
              />
            </div>
          </div>
        )}
        {showTimePicker && (
          <div className="fixed inset-0 z-[900] bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowTimePicker(false)}>
            <div onClick={(e) => e.stopPropagation()}>
              <ChronosTimePicker
                value={newTime || "09:00"}
                onChange={(v) => { setNewTime(v); setShowTimePicker(false); }}
                onClose={() => setShowTimePicker(false)}
                workingHours={appt.workingHours}
                existingAppointments={existingSlots}
                selectedDate={newDate}
                serviceDuration={appt.duration || 30}
                manualBlocks={appt.manualBlocks}
              />
            </div>
          </div>
        )}
      </CardShell>
    );
  }

  // state === "view"
  return (
    <CardShell>
      <div className="space-y-4 mb-6">
        {appt.serviceName && (
          <div className="flex justify-between items-center py-3 border-b border-slate-100">
            <span className="text-[10px] font-black uppercase text-slate-400">{t("serviceLabel")}</span>
            <span className="font-black text-slate-900">{appt.serviceName}</span>
          </div>
        )}
        {appt.specialistName && (
          <div className="flex justify-between items-center py-3 border-b border-slate-100">
            <span className="text-[10px] font-black uppercase text-slate-400">{t("specialistLabel")}</span>
            <span className="font-black text-slate-900">{appt.specialistName}</span>
          </div>
        )}
        <div className="flex justify-between items-center py-3 border-b border-slate-100">
          <span className="text-[10px] font-black uppercase text-slate-400">{t("dateLabel")}</span>
          <span className="font-black text-slate-900 capitalize">{fmtDate(appt.date)}</span>
        </div>
        <div className="flex justify-between items-center py-3 border-b border-slate-100">
          <span className="text-[10px] font-black uppercase text-slate-400">{t("timeLabel")}</span>
          <span className="font-black text-amber-600 text-lg">{appt.time}</span>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <button
          onClick={() => setState("reschedule")}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase italic hover:bg-amber-500 hover:text-black transition-all"
        >
          {t("rescheduleBtn")}
        </button>
        <button
          onClick={() => setState("cancelConfirm")}
          className="w-full py-4 bg-white border-2 border-red-200 text-red-500 rounded-2xl font-black uppercase italic hover:bg-red-50 transition-all"
        >
          {t("cancelBtn")}
        </button>
      </div>
    </CardShell>
  );
}