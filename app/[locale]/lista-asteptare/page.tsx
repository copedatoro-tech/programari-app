"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { showConfirm, showToast } from "@/lib/toast";
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
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [selectedApptId, setSelectedApptId] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [workLocations, setWorkLocations] = useState<any[]>([]);
  const today = new Date().toISOString().split("T")[0];
  const [addForm, setAddForm] = useState({
    clientName: "", clientPhone: "", clientEmail: "", date: today, time: "",
    specialistId: "", serviciuId: "", workLocationId: "",
  });
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    try {
      const todayKey = new Date().toISOString().split("T")[0];
      const [waitlistRes, staffRes, servicesRes, profileRes, apptRes] = await Promise.all([
        fetch("/api/waitlist/admin"),
        supabase.from("staff").select("id, name, services").eq("user_id", session.user.id),
        supabase.from("services").select("id, nume_serviciu").eq("user_id", session.user.id),
        supabase.from("profiles").select("work_locations").eq("id", session.user.id).single(),
        supabase.from("appointments").select("id,title,prenume,nume,date,time,angajat_id,serviciu_id,duration,work_location_id").eq("user_id", session.user.id).gte("date", todayKey).order("date", { ascending: true }).order("time", { ascending: true }),
      ]);
      const data = await waitlistRes.json();
      setEntries(data.entries || []);
      if (staffRes.data) setStaff(staffRes.data);
      if (servicesRes.data) setServices(servicesRes.data);
      if (apptRes.data) setAllAppointments(apptRes.data);
      if (Array.isArray(profileRes.data?.work_locations)) {
        setWorkLocations(profileRes.data.work_locations);
      }
    } catch {
      // ignorăm
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);
  useEffect(() => { load(); }, [load]);
  const handleSelectAppointment = (a: any) => {
    setSelectedApptId(a.id);
    setAddForm((f) => ({
      ...f,
      date: a.date,
      time: a.time || "",
      specialistId: a.angajat_id || "",
      serviciuId: a.serviciu_id || "",
    }));
  };
  const filteredAppts = useMemo(() => allAppointments.filter((a: any) =>
    (!addForm.workLocationId || a.work_location_id === addForm.workLocationId) &&
    (!addForm.specialistId || a.angajat_id === addForm.specialistId) &&
    (!addForm.serviciuId || a.serviciu_id === addForm.serviciuId)
  ), [allAppointments, addForm.workLocationId, addForm.specialistId, addForm.serviciuId]);
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
      setAddForm({ clientName: "", clientPhone: "", clientEmail: "", date: today, time: "", specialistId: "", serviciuId: "", workLocationId: "" });
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
  const locationStaff = addForm.workLocationId
    ? staff.filter((st: any) => {
        const loc = workLocations.find((l: any) => l.id === addForm.workLocationId);
        return !loc?.staff_ids?.length || loc.staff_ids.includes(st.id);
      })
    : staff;
  const locationServices = addForm.workLocationId
    ? services.filter((s: any) => {
        const loc = workLocations.find((l: any) => l.id === addForm.workLocationId);
        return !loc?.service_ids?.length || loc.service_ids.includes(s.id);
      })
    : services;
  const availableServices = addForm.specialistId
    ? locationServices.filter((s) => locationStaff.find((st) => st.id === addForm.specialistId)?.services?.includes(s.id))
    : locationServices;
  const availableStaff = addForm.serviciuId
    ? locationStaff.filter((st) => st.services?.includes(addForm.serviciuId))
    : locationStaff;
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
      {/* MODAL ADAUGARE MANUALA */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 md:p-10 shadow-2xl border-t-[10px] border-amber-500 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6 sticky top-0 bg-white z-10 pb-2 -mt-2">
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
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-slate-400 ml-3 uppercase">{t("filterWorkLocationLabel")}</span>
                <select
                  className="bg-slate-50 p-4 rounded-2xl font-bold text-[12px] outline-none border-2 border-transparent focus:border-amber-400 transition-all"
                  value={addForm.workLocationId}
                  onChange={(e) => setAddForm((f) => ({ ...f, workLocationId: e.target.value }))}
                >
                  <option value="">{t("anyOpt")}</option>
                  {workLocations.map((loc: any) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-slate-400 ml-3 uppercase">{t("selectExistingApptLabel")}</span>
                <div className="max-h-56 overflow-y-auto rounded-2xl border-2 border-slate-100 bg-slate-50 p-2 space-y-1.5">
                  {filteredAppts.length === 0 ? (
                    <p className="text-[11px] font-bold text-slate-300 italic text-center py-4">{t("noUpcomingApptsFound")}</p>
                  ) : (
                    filteredAppts.map((a: any) => {
                      const isSel = selectedApptId === a.id;
                      const specName = staff.find((s: any) => s.id === a.angajat_id)?.name || "-";
                      const dateLabel = new Date(a.date + "T00:00:00").toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
                      return (
                        <button key={a.id} type="button" onClick={() => handleSelectAppointment(a)}
                          className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-all border-2 ${isSel ? "bg-amber-500 border-amber-600 text-white" : "bg-white border-transparent hover:border-slate-200 text-slate-700"}`}>
                          <CalendarDays className="w-3.5 h-3.5 shrink-0" strokeWidth={2.6} />
                          <span className="text-[11px] font-black">{dateLabel}</span>
                          <Clock3 className="w-3.5 h-3.5 shrink-0 ml-1" strokeWidth={2.6} />
                          <span className="text-[11px] font-black">{a.time}</span>
                          <span className="flex-1 text-[10px] font-bold uppercase italic truncate ml-1">{a.title || a.prenume || a.nume || "Client"}</span>
                          <span className={`text-[9px] font-bold italic ${isSel ? "text-white/80" : "text-slate-400"}`}>{specName}</span>
                        </button>
                      );
                    })
                  )}
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
