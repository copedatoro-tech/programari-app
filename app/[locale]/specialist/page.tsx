"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabaseClient";
import { useSpecialist, parseApptDetails, playNotificationSound, playSystemNotification, SOUND_OPTIONS, type Appt } from "@/lib/SpecialistContext";

// ✅ Normalizează telefonul pentru link wa.me — presupunem România dacă începe cu "0"
function toWaLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountryCode = digits.startsWith("0") ? "4" + digits : digits;
  return `https://wa.me/${withCountryCode}`;
}

export default function SpecialistDashboard() {
  const t = useTranslations("specialistPortal.dashboard");
  const localeCode = useTranslations("calendarPage")("localeCode");
  const router = useRouter();
  const { staffId, staffName, bookingSlug, appointments, notifSettings, saveNotifSettings } = useSpecialist();
  const [qrCopied, setQrCopied] = useState(false);

  const bookingLink = (bookingSlug && staffId && typeof window !== "undefined")
    ? `${window.location.origin}/rezervare/${bookingSlug}?specialist=${staffId}`
    : null;

  const copyBookingLink = async () => {
    if (!bookingLink) return;
    try {
      await navigator.clipboard.writeText(bookingLink);
      setQrCopied(true);
      setTimeout(() => setQrCopied(false), 2500);
    } catch {}
  };
  const [systemMsg, setSystemMsg] = useState<string | null>(null);

  const azi = new Date().toISOString().split("T")[0];
  const apptAzi = appointments.filter((a) => a.date === azi);
  const apptViitoare = appointments.filter((a) => a.date !== azi);

  // ✅ Modal centrat, real — click deschide, click pe fundal sau pe ✕ închide.
  // Fiind centrat pe ecran (nu legat de scroll sau de o coloană laterală),
  // nu poate niciodată "ieși din pagină".
  const [modalAppt, setModalAppt] = useState<Appt | null>(null);
  const modalDetails = modalAppt ? parseApptDetails(modalAppt.details) : { service: null, note: null };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/specialist/login");
  };

  const handleToggleSystem = async () => {
    setSystemMsg(null);
    if (notifSettings.system_enabled) {
      saveNotifSettings({ ...notifSettings, system_enabled: false });
      return;
    }
    if (typeof window === "undefined" || !("Notification" in window)) {
      setSystemMsg(t("systemUnsupported"));
      return;
    }
    if (Notification.permission === "granted") {
      saveNotifSettings({ ...notifSettings, system_enabled: true });
      playSystemNotification("Chronos", t("systemTestMessage"));
      return;
    }
    if (Notification.permission === "denied") {
      setSystemMsg(t("systemPermissionDenied"));
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      saveNotifSettings({ ...notifSettings, system_enabled: true });
      playSystemNotification("Chronos", t("systemTestMessage"));
    } else {
      setSystemMsg(t("systemPermissionDenied"));
    }
  };

  const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString(localeCode, { weekday: "long", day: "2-digit", month: "long" });

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 bg-white p-6 rounded-[35px] shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <Image src="/logo-chronos.png" alt="Chronos" width={48} height={48} className="w-12 h-12" />
            <div>
              <h1 className="text-xl font-black uppercase italic tracking-tighter">
                {t("greeting")} <span className="text-amber-500">{staffName}</span>
              </h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase italic">{t("subtitle")}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="px-5 py-3 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase italic hover:bg-red-50 hover:text-red-500 transition-all">
            {t("logoutBtn")}
          </button>
        </div>

        {/* ✅ Cod QR personal — clientul scanează, ajunge pe pagina de rezervare
             cu acest specialist deja preselectat, alege doar data și ora */}
        <div className="bg-white rounded-[30px] p-6 mb-8 shadow-sm border border-slate-100">
          <h2 className="text-[11px] font-black uppercase italic text-slate-400 tracking-widest mb-4">{t("qrTitle")}</h2>
          {!bookingLink ? (
            <div className="bg-amber-50 border-2 border-dashed border-amber-200 rounded-2xl p-6 text-center">
              <p className="text-[10px] font-bold text-amber-700 italic">{t("qrNoSlugHint")}</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 shrink-0">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(bookingLink)}`}
                  alt={t("qrTitle")}
                  width={180}
                  height={180}
                  className="w-[180px] h-[180px]"
                />
              </div>
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <p className="text-[10px] font-bold text-slate-500 italic mb-4 leading-relaxed">{t("qrDesc")}</p>
                <div className="bg-slate-50 rounded-xl p-3 mb-3 break-all">
                  <p className="text-[10px] font-bold text-slate-600">{bookingLink}</p>
                </div>
                <button onClick={copyBookingLink}
                  className="px-5 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase italic hover:bg-amber-500 hover:text-black transition-all">
                  {qrCopied ? t("qrCopiedBtn") : t("qrCopyBtn")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Setări notificări */}
        <div className="bg-white rounded-[30px] p-6 mb-8 shadow-sm border border-slate-100">
          <h2 className="text-[11px] font-black uppercase italic text-slate-400 tracking-widest mb-4">{t("notificationsTitle")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase italic ${notifSettings.in_app_enabled ? "text-emerald-600" : "text-slate-400"}`}>
                {t("popupLabel")} {notifSettings.in_app_enabled ? t("statusOnSuffix") : t("statusOffSuffix")}
              </span>
              <button onClick={() => saveNotifSettings({ ...notifSettings, in_app_enabled: !notifSettings.in_app_enabled })}
                className={`px-3 py-2 rounded-lg font-black text-[9px] uppercase italic transition-all ${notifSettings.in_app_enabled ? "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white" : "bg-emerald-500 text-white hover:bg-emerald-600"}`}>
                {notifSettings.in_app_enabled ? t("deactivateBtn") : t("activateBtn")}
              </button>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-black uppercase italic ${notifSettings.sound_enabled ? "text-emerald-600" : "text-slate-400"}`}>
                  {t("soundLabel")} {notifSettings.sound_enabled ? t("statusOnSuffix") : t("statusOffSuffix")}
                </span>
                <button onClick={() => saveNotifSettings({ ...notifSettings, sound_enabled: !notifSettings.sound_enabled })}
                  className={`px-3 py-2 rounded-lg font-black text-[9px] uppercase italic transition-all ${notifSettings.sound_enabled ? "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white" : "bg-emerald-500 text-white hover:bg-emerald-600"}`}>
                  {notifSettings.sound_enabled ? t("deactivateBtn") : t("activateBtn")}
                </button>
              </div>
              <span className="text-[8px] font-bold text-slate-400 block mb-0.5">{t("volumeLabel")} {notifSettings.volume}%</span>
              <input type="range" min={0} max={100} value={notifSettings.volume}
                onChange={(e) => saveNotifSettings({ ...notifSettings, volume: Number(e.target.value) })}
                className="w-full h-1.5 accent-amber-500" />
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase italic ${notifSettings.system_enabled ? "text-emerald-600" : "text-slate-400"}`}>
                {t("systemLabel")} {notifSettings.system_enabled ? t("statusOnSuffix") : t("statusOffSuffix")}
              </span>
              <button onClick={handleToggleSystem}
                className={`px-3 py-2 rounded-lg font-black text-[9px] uppercase italic transition-all ${notifSettings.system_enabled ? "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white" : "bg-emerald-500 text-white hover:bg-emerald-600"}`}>
                {notifSettings.system_enabled ? t("deactivateBtn") : t("activateBtn")}
              </button>
            </div>
          </div>

          {systemMsg && (
            <p className="text-[10px] font-bold text-red-500 italic mb-3 px-1">{systemMsg}</p>
          )}
          <p className="text-[9px] font-bold text-slate-400 italic mb-4 px-1">{t("systemDesc")}</p>

          <div className="bg-slate-50 rounded-2xl p-4">
            <span className="text-[9px] font-black uppercase italic text-slate-400 block mb-3">{t("soundChoiceLabel")}</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SOUND_OPTIONS.map((opt) => (
                <div key={opt.id} className={`flex items-center justify-between gap-2 p-3 rounded-xl border-2 transition-all ${notifSettings.sound_id === opt.id ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white"}`}>
                  <button onClick={() => saveNotifSettings({ ...notifSettings, sound_id: opt.id })}
                    className={`text-[10px] font-black uppercase italic flex-1 text-left ${notifSettings.sound_id === opt.id ? "text-amber-700" : "text-slate-500"}`}>
                    {notifSettings.sound_id === opt.id ? "✓ " : ""}{opt.label}
                  </button>
                  <button onClick={() => playNotificationSound(notifSettings.volume, opt.id)}
                    title={t("previewSoundTitle")}
                    className="w-7 h-7 shrink-0 bg-slate-900 text-white rounded-lg flex items-center justify-center hover:bg-amber-500 transition-all">
                    ▶
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── LISTĂ, pe toată lățimea — click deschide modalul de detalii ── */}
        <h2 className="text-[11px] font-black uppercase italic text-slate-400 tracking-widest mb-3">{t("todayTitle")}</h2>
        <div className="space-y-2 mb-8">
          {apptAzi.length === 0 ? (
            <div className="bg-white rounded-[25px] p-6 text-center border-2 border-dashed border-slate-100">
              <p className="text-[10px] font-black uppercase italic text-slate-300">{t("noApptsToday")}</p>
            </div>
          ) : (
            apptAzi.map((a) => (
              <button key={a.id} onClick={() => setModalAppt(a)}
                className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border-2 border-transparent hover:border-amber-500 flex items-center gap-3 transition-all">
                <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white font-black text-[11px] shrink-0">{a.time}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-black uppercase italic text-slate-800 text-[13px] truncate">{a.title}</p>
                  {a.is_client_booking && <span className="text-[7px] font-black uppercase text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{t("onlineBadge")}</span>}
                </div>
                <span className="text-slate-300 text-lg">›</span>
              </button>
            ))
          )}
        </div>

        {apptViitoare.length > 0 && (
          <>
            <h2 className="text-[11px] font-black uppercase italic text-slate-400 tracking-widest mb-3">{t("upcomingTitle")}</h2>
            <div className="space-y-2">
              {apptViitoare.map((a) => (
                <button key={a.id} onClick={() => setModalAppt(a)}
                  className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border-2 border-transparent hover:border-amber-500 flex items-center gap-3 transition-all">
                  <div className="flex flex-col items-center bg-slate-900 rounded-xl px-2.5 py-1.5 shrink-0">
                    <span className="text-[7px] font-black text-amber-500 uppercase">{new Date(a.date + "T00:00:00").toLocaleDateString(localeCode, { day: "2-digit", month: "short" })}</span>
                    <span className="text-white font-black text-[10px]">{a.time}</span>
                  </div>
                  <p className="font-black uppercase italic text-slate-800 text-[13px] truncate flex-1">{a.title}</p>
                  <span className="text-slate-300 text-lg">›</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── MODAL — centrat, mereu vizibil complet pe ecran ─────────────── */}
      {modalAppt && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setModalAppt(null)}>
          <div onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-md rounded-[35px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            <div className="bg-slate-900 p-8 text-white relative shrink-0">
              <button onClick={() => setModalAppt(null)}
                className="absolute top-4 right-4 w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white hover:bg-red-500 transition-all text-xs font-black">
                ✕
              </button>
              <p className="text-[9px] font-black text-amber-500 uppercase italic tracking-widest mb-1">
                {fmtDate(modalAppt.date)} — {modalAppt.time}
              </p>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter pr-10">{modalAppt.title}</h3>
              {modalAppt.is_client_booking && (
                <span className="inline-block mt-2 text-[8px] font-black uppercase text-blue-300 bg-blue-900/40 px-2 py-1 rounded">{t("onlineBadge")}</span>
              )}
            </div>

            <div className="p-8 space-y-5 overflow-y-auto">
              {modalDetails.service && (
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">{t("serviceLabel")}</p>
                  <p className="font-black text-slate-800 text-sm">{modalDetails.service}</p>
                </div>
              )}

              {modalAppt.phone && (
                <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">{t("phoneLabel")}</p>
                    <p className="font-black text-slate-800 text-sm">{modalAppt.phone}</p>
                  </div>
                  <a href={toWaLink(modalAppt.phone)} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 bg-[#25D366] text-white rounded-xl flex items-center justify-center hover:brightness-95 transition-all shrink-0">💬</a>
                </div>
              )}

              {modalAppt.email && (
                <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">{t("emailLabel")}</p>
                    <p className="font-black text-slate-800 text-sm truncate">{modalAppt.email}</p>
                  </div>
                  <a href={`mailto:${modalAppt.email}`}
                    className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-amber-500 transition-all shrink-0 ml-2">✉️</a>
                </div>
              )}

              {modalDetails.note && (
                <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-4">
                  <p className="text-[8px] font-black text-amber-600 uppercase italic mb-1">{t("noteLabel")}</p>
                  <p className="font-bold text-amber-900 text-sm italic">{modalDetails.note}</p>
                </div>
              )}

              {!modalDetails.service && !modalDetails.note && (
                <p className="text-[10px] font-bold text-slate-300 uppercase italic text-center py-4">{t("noExtraDetails")}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}