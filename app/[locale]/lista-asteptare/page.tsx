"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { showConfirm, showToast } from "@/lib/toast";
import { ChronosTimePicker, ChronosDatePicker } from "@/components/ChronosDateTimePickers";
import { CalendarDays, Clock3 } from "lucide-react";

interface WaitlistEntry {
  id: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string;
  date: string;
  requestedTime: string | null;
  status: string;
  createdAt: string;
  specialistName: string | null;
  serviceName: string | null;
}

interface StaffRow { id: string; name: string; services: string[] }
interface ServiceRow { id: string; nume_serviciu: string }

export default function ListaAsteptarePage() {
  const t = useTranslations("listaAsteptare");
  const locale = useLocale();
  const router = useRouter();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Adăugare manuală — util pentru admin/specialist când știe direct
  // că cineva vrea o anumită dată (ex. "nuntă", data solicitată de client)
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [adding, setAdding] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const [addForm, setAddForm] = useState({
    clientName: "", clientPhone: "", clientEmail: "", date: today, time: "",
    specialistId: "", serviciuId: "",
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [adminWorkingHours, setAdminWorkingHours] = useState<any[]>([]);
  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    try {
      const [waitlistRes, staffRes, servicesRes, profileRes] = await Promise.all([
        fetch("/api/waitlist/admin"),
        supabase.from("staff").select("id, name, services").eq("user_id", session.user.id),
        supabase.from("services").select("id, nume_serviciu").eq("user_id", session.user.id),
        supabase.from("profiles").select("working_hours").eq("id", session.user.id).single(),
      ]);
      const data = await waitlistRes.json();
      setEntries(data.entries || []);
      if (staffRes.data) setStaff(staffRes.data);
      if (servicesRes.data) setServices(servicesRes.data);
      if (profileRes.data?.working_hours) {
        const wh = profileRes.data.working_hours;
        const parsed = typeof wh === "string" ? JSON.parse(wh) : wh;
        setAdminWorkingHours(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      // ignorăm
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!addForm.clientName.trim() || !addForm.clientEmail.trim() || !addForm.date) {
      await showToast({ message: t("addNameEmailDateRequired"), type: "error" });
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/waitlist/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: addForm.clientName.trim(),
          clientPhone: addForm.clientPhone.trim() || null,
          clientEmail: addForm.clientEmail.trim(),
          date: addForm.date,
          requestedTime: addForm.time || null,
          specialistId: addForm.specialistId || null,
          serviciuId: addForm.serviciuId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        await showToast({ message: json.error || t("addError"), type: "error" });
        return;
      }
      await showToast({ message: t("addSuccess"), type: "success" });
      setShowAddModal(false);
      setAddForm({ clientName: "", clientPhone: "", clientEmail: "", date: today, time: "", specialistId: "", serviciuId: "" });
      load();
    } catch {
      await showToast({ message: t("addError"), type: "error" });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    const confirmed = await showConfirm({
      title: t("removeBtn"),
      message: t("confirmRemove"),
      confirmText: t("removeBtn"),
      type: "danger",
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/waitlist/admin/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setEntries((prev) => prev.filter((e) => e.id !== id));
      await showToast({ message: t("removeBtn"), type: "success" });
    } catch {
      await showToast({ message: "Eroare", type: "error" });
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      waiting: { label: t("statusWaiting"), color: "bg-slate-100 text-slate-600" },
      notified: { label: t("statusNotified"), color: "bg-amber-100 text-amber-700" },
      confirmed: { label: t("statusConfirmed"), color: "bg-green-100 text-green-700" },
      expired: { label: t("statusExpired"), color: "bg-red-100 text-red-500" },
    };
    const conf = map[status] || map.waiting;
    return <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full ${conf.color}`}>{conf.label}</span>;
  };

  const fmtDate = (d: string) => {
    if (!d) return "";
    return new Date(d + "T00:00:00").toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
  };
  const fmtDateTime = (d: string) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const availableServices = addForm.specialistId
    ? services.filter((s) => staff.find((st) => st.id === addForm.specialistId)?.services?.includes(s.id))
    : services;
  const availableStaff = addForm.serviciuId
    ? staff.filter((st) => st.services?.includes(addForm.serviciuId))
    : staff;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center font-black italic text-amber-600 animate-pulse uppercase tracking-[0.3em] text-[10px]">{t("loading")}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fcfcfc] p-4 md:p-16 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-slate-900 border-l-8 border-amber-500 pl-6">
              {t("headingLine1")} <span className="text-amber-600">{t("headingHighlight")}</span>
            </h1>
            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest italic ml-8 mt-2">{t("subtitle")}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-8 py-4 bg-amber-500 text-slate-900 rounded-[20px] font-black uppercase text-[10px] italic hover:bg-amber-600 transition-all shadow-lg"
            >
              {t("addManualBtn")}
            </button>
            <button
              onClick={() => router.push("/programari")}
              className="px-8 py-4 bg-white border-2 border-slate-900 rounded-[20px] font-black uppercase text-[10px] italic hover:bg-slate-900 hover:text-white transition-all shadow-lg"
            >
              {t("backBtn")}
            </button>
          </div>
        </header>

        {entries.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
            <span className="text-5xl block mb-3">📋</span>
            <p className="font-black text-slate-400 text-lg uppercase italic">{t("emptyTitle")}</p>
            <p className="text-slate-300 text-sm mt-2">{t("emptyMsg")}</p>
          </div>
        ) : (
          <div className="bg-white rounded-[40px] shadow-xl border border-slate-50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="p-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">{t("colClient")}</th>
                    <th className="p-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">{t("colContact")}</th>
                    <th className="p-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">{t("colDate")}</th>
                    <th className="p-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">{t("colSpecialist")}</th>
                    <th className="p-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">{t("colService")}</th>
                    <th className="p-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">{t("colStatus")}</th>
                    <th className="p-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">{t("colJoined")}</th>
                    <th className="p-5"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="p-5 font-black text-[13px] text-slate-900">{e.clientName}</td>
                      <td className="p-5 text-[11px] text-slate-500 font-medium">
                        <div>{e.clientPhone}</div>
                        <div className="text-slate-400">{e.clientEmail}</div>
                      </td>
                      <td className="p-5 font-black text-[12px] text-amber-600">
                        {fmtDate(e.date)}
                        {e.requestedTime && <span className="block text-[10px] text-slate-400 font-bold">{e.requestedTime}</span>}
                      </td>
                      <td className="p-5 text-[11px] font-bold text-slate-600">{e.specialistName || t("anyOpt")}</td>
                      <td className="p-5 text-[11px] font-bold text-slate-600">{e.serviceName || t("anyOpt")}</td>
                      <td className="p-5">{statusBadge(e.status)}</td>
                      <td className="p-5 text-[10px] text-slate-400 font-medium">{fmtDateTime(e.createdAt)}</td>
                      <td className="p-5">
                        <button
                          onClick={() => handleRemove(e.id)}
                          className="w-9 h-9 flex items-center justify-center bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* PICKER DATA */}
      {showDatePicker && (
        <div className="fixed inset-0 z-[900] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDatePicker(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <ChronosDatePicker
              value={addForm.date}
              onChange={(val) => { setAddForm((f) => ({ ...f, date: val })); setShowDatePicker(false); }}
              onClose={() => setShowDatePicker(false)}
              workingHours={adminWorkingHours}
            />
          </div>
        </div>
      )}

      {/* PICKER ORA */}
      {showTimePicker && (
        <div className="fixed inset-0 z-[900] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowTimePicker(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <ChronosTimePicker
              value={addForm.time || "09:00"}
              onChange={(val) => { setAddForm((f) => ({ ...f, time: val })); setShowTimePicker(false); }}
              onClose={() => setShowTimePicker(false)}
              workingHours={adminWorkingHours}
              existingAppointments={[]}
              selectedDate={addForm.date}
              serviceDuration={30}
              manualBlocks={{}}
            />
          </div>
        </div>
      )}

      {/* MODAL ADAUGARE MANUALA */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 md:p-10 shadow-2xl border-t-[10px] border-amber-500 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-black uppercase italic text-slate-900 tracking-tighter">{t("addManualTitle")}</h3>
              <button onClick={() => setShowAddModal(false)} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl font-black text-slate-400 hover:bg-red-500 hover:text-white transition-all">✕</button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-slate-400 ml-3 uppercase">{t("addNameLabel")}</span>
                <input
                  type="text"
                  className="bg-slate-50 p-4 rounded-2xl font-bold text-[13px] outline-none border-2 border-transparent focus:border-amber-400 transition-all"
                  value={addForm.clientName}
                  onChange={(e) => setAddForm((f) => ({ ...f, clientName: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-400 ml-3 uppercase">{t("addPhoneLabel")}</span>
                  <input
                    type="tel"
                    className="bg-slate-50 p-4 rounded-2xl font-bold text-[13px] outline-none border-2 border-transparent focus:border-amber-400 transition-all"
                    value={addForm.clientPhone}
                    onChange={(e) => setAddForm((f) => ({ ...f, clientPhone: e.target.value.replace(/[^0-9+]/g, "") }))}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-400 ml-3 uppercase">{t("addEmailLabel")}</span>
                  <input
                    type="email"
                    className="bg-slate-50 p-4 rounded-2xl font-bold text-[13px] outline-none border-2 border-transparent focus:border-amber-400 transition-all"
                    value={addForm.clientEmail}
                    onChange={(e) => setAddForm((f) => ({ ...f, clientEmail: e.target.value }))}
                  />
                </div>
              </div>

              {/* ✅ Picker native Chronos pentru dată și oră, la fel ca in restul aplicatiei */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-400 ml-3 uppercase">{t("addDateLabel")}</span>
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(true)}
                    className="bg-slate-900 text-white rounded-2xl py-4 px-4 font-black text-[13px] uppercase italic hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    <CalendarDays className="w-4 h-4 shrink-0" strokeWidth={2.6} />
                    <span>{new Date(addForm.date + "T00:00:00").toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-400 ml-3 uppercase">{t("addTimeLabel")}</span>
                  <button
                    type="button"
                    onClick={() => setShowTimePicker(true)}
                    className={`rounded-2xl py-4 px-4 font-black text-[13px] uppercase italic transition-all flex items-center justify-center gap-2 ${addForm.time ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-slate-900 text-white hover:bg-slate-800"}`}
                  >
                    <Clock3 className="w-4 h-4 shrink-0" strokeWidth={2.6} />
                    <span>{addForm.time || t("anyOpt")}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-400 ml-3 uppercase">{t("addSpecialistLabel")}</span>
                  <select
                    className="bg-slate-50 p-4 rounded-2xl font-bold text-[12px] outline-none border-2 border-transparent focus:border-amber-400 transition-all"
                    value={addForm.specialistId}
                    onChange={(e) => setAddForm((f) => ({ ...f, specialistId: e.target.value }))}
                  >
                    <option value="">{t("anyOpt")}</option>
                    {availableStaff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-400 ml-3 uppercase">{t("addServiceLabel")}</span>
                  <select
                    className="bg-slate-50 p-4 rounded-2xl font-bold text-[12px] outline-none border-2 border-transparent focus:border-amber-400 transition-all"
                    value={addForm.serviciuId}
                    onChange={(e) => setAddForm((f) => ({ ...f, serviciuId: e.target.value }))}
                  >
                    <option value="">{t("anyOpt")}</option>
                    {availableServices.map((s) => <option key={s.id} value={s.id}>{s.nume_serviciu}</option>)}
                  </select>
                </div>
              </div>

              <button
                onClick={handleAdd}
                disabled={adding}
                className="w-full py-5 bg-slate-900 text-amber-500 rounded-2xl font-black uppercase italic text-[12px] hover:bg-amber-500 hover:text-slate-900 transition-all shadow-lg disabled:opacity-50"
              >
                {adding ? "..." : t("addManualSubmitBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
