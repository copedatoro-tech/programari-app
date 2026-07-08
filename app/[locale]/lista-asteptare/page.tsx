"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { showConfirm, showToast } from "@/lib/toast";

interface WaitlistEntry {
  id: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string;
  date: string;
  status: string;
  createdAt: string;
  specialistName: string | null;
  serviceName: string | null;
}

export default function ListaAsteptarePage() {
  const t = useTranslations("listaAsteptare");
  const locale = useLocale();
  const router = useRouter();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    try {
      const res = await fetch("/api/waitlist/admin");
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {
      // ignorăm
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => { load(); }, [load]);

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
          <button
            onClick={() => router.push("/programari")}
            className="px-8 py-4 bg-white border-2 border-slate-900 rounded-[20px] font-black uppercase text-[10px] italic hover:bg-slate-900 hover:text-white transition-all shadow-lg"
          >
            {t("backBtn")}
          </button>
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
                      <td className="p-5 font-black text-[12px] text-amber-600">{fmtDate(e.date)}</td>
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
    </div>
  );
}