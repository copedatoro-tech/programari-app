"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import LocaleSwitcher from "@/components/LocaleSwitcher";

interface OfferedSlot {
  date: string;
  time: string;
  duration: number;
}

type ViewState = "loading" | "notFound" | "expired" | "alreadyDone" | "available" | "success" | "error";

export default function ConfirmaLocPage() {
  const params = useParams();
  const id = params.id as string;
  const t = useTranslations("waitlist");

  const [state, setState] = useState<ViewState>("loading");
  const [slot, setSlot] = useState<OfferedSlot | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/waitlist/${id}`);
      if (!res.ok) { setState("notFound"); return; }
      const data = await res.json();
      if (data.status === "expired") { setState("expired"); return; }
      if (data.status === "confirmed") { setState("alreadyDone"); return; }
      if (data.status !== "notified" || !data.offeredSlot) { setState("alreadyDone"); return; }
      setSlot(data.offeredSlot);
      setState("available");
    } catch {
      setState("notFound");
    }
  }, [id]);

  useEffect(() => { if (id) load(); }, [id, load]);

  const handleClaim = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/waitlist/${id}/claim`, { method: "POST" });
      if (res.status === 410) { setState("expired"); return; }
      if (res.status === 409) { setState("expired"); return; }
      if (!res.ok) { setState("error"); return; }
      setState("success");
    } catch {
      setState("error");
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
            {t("claimPageTitle")}
          </h1>
        </div>
        <div className="p-8">{children}</div>
      </div>
    </main>
  );

  if (state === "loading") {
    return (
      <CardShell>
        <p className="text-center font-black uppercase italic text-slate-400 animate-pulse">...</p>
      </CardShell>
    );
  }

  if (state === "notFound") {
    return (
      <CardShell>
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-black uppercase italic text-slate-900 mb-2">{t("claimNotFoundTitle")}</h2>
          <p className="text-slate-500">{t("claimNotFoundMsg")}</p>
        </div>
      </CardShell>
    );
  }

  if (state === "expired") {
    return (
      <CardShell>
        <div className="text-center">
          <div className="text-5xl mb-4">⏰</div>
          <h2 className="text-xl font-black uppercase italic text-slate-900 mb-2">{t("claimExpiredTitle")}</h2>
          <p className="text-slate-500">{t("claimExpiredMsg")}</p>
        </div>
      </CardShell>
    );
  }

  if (state === "alreadyDone") {
    return (
      <CardShell>
        <div className="text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-black uppercase italic text-slate-900 mb-2">{t("claimAlreadyDoneTitle")}</h2>
          <p className="text-slate-500">{t("claimAlreadyDoneMsg")}</p>
        </div>
      </CardShell>
    );
  }

  if (state === "error") {
    return (
      <CardShell>
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-slate-500">{t("errorGeneric")}</p>
        </div>
      </CardShell>
    );
  }

  if (state === "success") {
    return (
      <CardShell>
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-3xl">✓</div>
          <h2 className="text-xl font-black uppercase italic text-slate-900 mb-2">{t("claimSuccessTitle")}</h2>
          <p className="text-slate-500">{t("claimSuccessMsg")}</p>
        </div>
      </CardShell>
    );
  }

  // state === "available"
  return (
    <CardShell>
      <div className="text-center">
        <div className="text-5xl mb-4">🎉</div>
        <p className="text-slate-600 font-medium mb-6">{t("claimAvailable")}</p>
        {slot && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 mb-6">
            <p className="font-black text-slate-900 text-lg capitalize">{fmtDate(slot.date)}</p>
            <p className="font-black text-amber-600 text-2xl mt-1">{slot.time}</p>
          </div>
        )}
        <button
          onClick={handleClaim}
          disabled={saving}
          className="w-full py-5 bg-amber-500 text-black rounded-2xl font-black uppercase italic text-sm hover:bg-amber-600 transition-all disabled:opacity-50"
        >
          {saving ? "..." : t("claimConfirmBtn")}
        </button>
      </div>
    </CardShell>
  );
}