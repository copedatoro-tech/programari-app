"use client";
import { useState, useEffect, useRef, useMemo, useCallback, startTransition, Suspense } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { showToast } from "@/lib/toast";

type ManualBlocksMap = Record<string, string[]>;

const CURRENCY_OPTIONS = ["RON", "EUR", "USD", "GBP", "HUF", "PLN"];

function SettingsContent() {
  const t = useTranslations("settings");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState("CHRONOS FREE");
  const [mounted, setMounted] = useState(false);
  const [slug, setSlug] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [bookingInterval, setBookingInterval] = useState(60);
  const [manualBlocks, setManualBlocks] = useState<ManualBlocksMap>({});
  const [showDayModal, setShowDayModal] = useState(false);
  const [existingBookings, setExistingBookings] = useState<string[]>([]);
  const [daysWithBookings, setDaysWithBookings] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [showSuccessTick, setShowSuccessTick] = useState(false);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmPopupRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  // ✅ Plată online la rezervare
  const [stripeOnboarded, setStripeOnboarded] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [requirePayment, setRequirePayment] = useState(false);
  const [currency, setCurrency] = useState("RON");
  const [connectingStripe, setConnectingStripe] = useState(false);

  const localeCode = t("localeCode");
  const weekdaysShort = t.raw("weekdaysShort") as string[];
  const weekdayLetters = t.raw("weekdayLetters") as string[];

  const isEliteOrTeam = useMemo(() => {
    return userPlan.includes("ELITE") || userPlan.includes("TEAM");
  }, [userPlan]);

  useEffect(() => {
    if (typeof window !== "undefined") setBaseUrl(window.location.origin);
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowDayModal(false);
      }
      if (confirmPopupRef.current && !confirmPopupRef.current.contains(event.target as Node)) {
        setShowConfirmPopup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const generateSlots = useCallback((step: number) => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let min = 0; min < 60; min += step) {
        slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }, []);

  const formatSlug = useCallback((text: string) => {
    return text
      .toLowerCase()
      .trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }, []);

  const dynamicTimeSlots = useMemo(() => generateSlots(bookingInterval), [bookingInterval, generateSlots]);

  const fetchMonthlyAppointments = useCallback(async (uid: string, date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
    const { data } = await supabase.from("appointments").select("date").eq("user_id", uid).gte("date", firstDay).lte("date", lastDay);
    if (data) setDaysWithBookings(Array.from(new Set(data.map((a: any) => a.date))));
  }, [supabase]);

  const loadProfile = useCallback(async (currentUid: string) => {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUid)
      .maybeSingle();
    if (profile) {
      setUserPlan(profile.plan_type?.toUpperCase() || "CHRONOS FREE");
      setBookingInterval(profile.booking_interval || 60);
      setStripeOnboarded(!!profile.stripe_onboarded);
      setStripeAccountId(profile.stripe_account_id || null);
      setRequirePayment(!!profile.require_payment_at_booking);
      setCurrency(profile.currency || "RON");
      const savedSlug = profile.slug || "";
      if (savedSlug) {
        setSlug(savedSlug);
      } else {
        const base = formatSlug(profile.full_name || "chronos");
        const autoSlug = `${base || "chronos"}-${currentUid.slice(0, 6)}`;
        setSlug(autoSlug);
        await supabase.from('profiles').update({
          slug: autoSlug,
          updated_at: new Date().toISOString()
        }).eq('id', currentUid);
      }
      const rawBlocks = profile.manual_blocks;
      if (rawBlocks && typeof rawBlocks === 'object' && !Array.isArray(rawBlocks)) {
        setManualBlocks(rawBlocks as ManualBlocksMap);
      } else {
        setManualBlocks({});
      }
    }
  }, [supabase, formatSlug]);

  useEffect(() => {
    setMounted(true);
    async function initAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const currentUid = session.user.id;
      setUserId(currentUid);
      await loadProfile(currentUid);
      await fetchMonthlyAppointments(currentUid, currentMonth);
      setLoading(false);
    }
    initAdmin();
  }, [supabase, router, currentMonth, fetchMonthlyAppointments, loadProfile]);

  // ✅ Când ne întoarcem de la Stripe după conectare, reîncărcăm profilul
  useEffect(() => {
    if (searchParams.get("stripe") === "connected" && userId) {
      loadProfile(userId).then(() => {
        showToast({ message: t("stripeConnectedLabel"), type: "success" });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, userId]);

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        await showToast({ message: data.error || "Eroare la conectare.", type: "error" });
        setConnectingStripe(false);
      }
    } catch (e: any) {
      await showToast({ message: e?.message || "Eroare la conectare.", type: "error" });
      setConnectingStripe(false);
    }
  };

  const handleToggleRequirePayment = async () => {
    if (!userId) return;
    const newVal = !requirePayment;
    setRequirePayment(newVal);
    await supabase.from('profiles').update({ require_payment_at_booking: newVal }).eq('id', userId);
    await showToast({ message: t("toastSavedMsg"), type: "success" });
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    if (!userId) return;
    setCurrency(newCurrency);
    await supabase.from('profiles').update({ currency: newCurrency }).eq('id', userId);
    await showToast({ message: t("toastSavedMsg"), type: "success" });
  };

  const saveSettings = async (blocksToSave: ManualBlocksMap = manualBlocks) => {
    if (!userId) return;
    const { error } = await supabase.from('profiles').update({
      manual_blocks: blocksToSave,
      booking_interval: bookingInterval
    }).eq('id', userId);
    if (!error) {
      setIsDirty(false);
      showToast({ message: t("toastSavedMsg"), type: "success", title: t("toastSavedTitle") });
    } else {
      await showToast({ message: error.message, type: "error", title: t("toastSaveErrorTitle") });
    }
  };

  const handleCloseAndSave = async () => {
    if (isDirty) await saveSettings(manualBlocks);
    setShowDayModal(false);
    setShowConfirmPopup(false);
  };

  const toggleHourBlock = (baseSlot: string) => {
    if (!selectedDate) return;
    setIsDirty(true);
    const currentDayBlocks = [...(manualBlocks[selectedDate] || [])];
    const subSlots: string[] = [];
    const [h, m] = baseSlot.split(':').map(Number);
    for (let i = 0; i < bookingInterval; i += 15) {
      const totalMinutes = m + i;
      const slotH = h + Math.floor(totalMinutes / 60);
      const slotM = totalMinutes % 60;
      if (slotH < 24) subSlots.push(`${slotH.toString().padStart(2, '0')}:${slotM.toString().padStart(2, '0')}`);
    }
    const isAlreadyBlocked = currentDayBlocks.includes(baseSlot);
    let updatedDayBlocks;
    if (isAlreadyBlocked) {
      updatedDayBlocks = currentDayBlocks.filter(slot => !subSlots.includes(slot));
    } else {
      updatedDayBlocks = Array.from(new Set([...currentDayBlocks, ...subSlots]));
    }
    setManualBlocks({ ...manualBlocks, [selectedDate]: updatedDayBlocks });
  };

  const isDayFullyBlocked = useMemo(() => {
    if (!selectedDate) return false;
    const currentDayBlocks = manualBlocks[selectedDate] || [];
    const slots15 = generateSlots(15);
    return currentDayBlocks.length >= slots15.length;
  }, [selectedDate, manualBlocks, generateSlots]);

  const toggleAllDay = () => {
    if (!selectedDate) return;
    setIsDirty(true);
    const slots15 = generateSlots(15);
    if (isDayFullyBlocked) {
      setManualBlocks({ ...manualBlocks, [selectedDate]: [] });
    } else {
      setManualBlocks({ ...manualBlocks, [selectedDate]: slots15 });
    }
  };

  const toggleWeekdaySelection = (day: number) => {
    setSelectedWeekdays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const applyToSelectedWeekdays = async () => {
    if (!selectedDate || selectedWeekdays.length === 0) return;
    setIsApplying(true);
    const currentBlocks = manualBlocks[selectedDate] ? [...manualBlocks[selectedDate]] : [];
    startTransition(() => {
      const newBlocks = { ...manualBlocks };
      const startDate = new Date(selectedDate);
      const currentYear = startDate.getFullYear();
      const date = new Date(startDate);
      while (date.getFullYear() === currentYear) {
        if (selectedWeekdays.includes(date.getDay())) {
          const y = date.getFullYear();
          const m = (date.getMonth() + 1).toString().padStart(2, '0');
          const d = date.getDate().toString().padStart(2, '0');
          newBlocks[`${y}-${m}-${d}`] = [...currentBlocks];
        }
        date.setDate(date.getDate() + 1);
      }
      setManualBlocks(newBlocks);
      setIsDirty(true);
      saveSettings(newBlocks).then(() => {
        setIsApplying(false);
        setShowSuccessTick(true);
        setTimeout(() => {
          setShowSuccessTick(false);
          setShowConfirmPopup(false);
        }, 1500);
      });
    });
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const startDay = new Date(year, month, 1).getDay();
    const offset = startDay === 0 ? 6 : startDay - 1;
    const days = [];
    for (let i = 0; i < offset; i++) {
      days.push(<div key={`empty-${i}`} className="h-20 md:h-24 bg-slate-50/50 rounded-[25px]"></div>);
    }
    const slots15Count = generateSlots(15).length;
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const isToday = new Date().toISOString().split('T')[0] === dateStr;
      const blockedSlots = (manualBlocks[dateStr] || []).length;
      const isBlocked = blockedSlots >= (slots15Count - 2);
      const isPartiallyBlocked = blockedSlots > 0 && blockedSlots < (slots15Count - 2);
      const hasBooking = daysWithBookings.includes(dateStr);
      days.push(
        <button key={d}
          type="button"
          title={t("modalBadge")}
          onClick={async () => {
            const [y, m, day] = dateStr.split('-').map(Number);
            const dateObj = new Date(y, m - 1, day);
            setSelectedDate(dateStr);
            setSelectedWeekdays([dateObj.getDay()]);
            const { data } = await supabase.from("appointments").select("time").eq("date", dateStr).eq("user_id", userId);
            setExistingBookings(data ? data.map((b: any) => b.time.substring(0, 5)) : []);
            setShowDayModal(true);
          }}
          className={`h-20 md:h-24 p-3 md:p-4 rounded-[25px] border-2 transition-all flex flex-col justify-between items-start relative overflow-hidden shadow-sm transform hover:scale-105 hover:z-10 ${
            isBlocked ? 'bg-red-50 border-red-100 opacity-60'
              : isPartiallyBlocked ? 'bg-amber-50 border-amber-200'
              : 'bg-white border-slate-100 hover:border-amber-500 shadow-md'
          }`}
        >
          <span className={`text-lg font-black ${isToday ? 'text-amber-500 underline decoration-2' : 'text-slate-900'}`}>{d}</span>
          {hasBooking && (
            <div className="flex flex-col items-start gap-0.5 w-full">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
              <span className="text-[6px] font-black uppercase text-amber-500 tracking-tighter">{t("dayBookingLabel")}</span>
            </div>
          )}
          {isPartiallyBlocked && !hasBooking && (
            <div className="flex flex-col items-start gap-0.5 w-full">
              <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
              <span className="text-[6px] font-black uppercase text-orange-500 tracking-tighter">{t("dayPartialLabel")}</span>
            </div>
          )}
        </button>
      );
    }
    return days;
  };

  const bookingUrl = `${baseUrl}/rezervare/${slug}`;

  const handlePrintQR = () => {
    if (!isEliteOrTeam) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const qrSvg = qrRef.current?.innerHTML;
    printWindow.document.write(`
      <html>
        <head>
          <title>${t("printWindowTitle")}</title>
          <style>
            @page { margin: 0; size: auto; }
            body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; text-align: center; }
            .qr-container { padding: 40px; border: 2px solid #f59e0b; border-radius: 40px; display: inline-block; }
            svg { width: 300px !important; height: 300px !important; }
          </style>
        </head>
        <body>
          <div class="qr-container">${qrSvg}</div>
          <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleWhatsAppShare = () => {
    if (!isEliteOrTeam) return;
    const message = encodeURIComponent(t("whatsappMessage", { url: bookingUrl }));
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleCopyLink = async () => {
    if (!isEliteOrTeam) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      await showToast({ message: t("toastCopiedMsg"), type: "success", title: t("toastCopiedTitle") });
    } catch {
      await showToast({ message: t("toastCopyErrorMsg"), type: "error", title: t("toastCopyErrorTitle") });
    }
  };

  if (loading || !mounted) return <div className="min-h-screen bg-white flex items-center justify-center font-black text-amber-500 animate-pulse text-[10px] uppercase">{t("loading")}</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900 flex flex-col">
      <div className="max-w-7xl mx-auto flex-grow w-full">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter border-l-4 border-amber-500 pl-4 text-slate-900">
              {t("headingLine1")} <span className="text-amber-500">{t("headingHighlight")}</span>
            </h1>
          </div>
          <div className="flex gap-2">
            {isDirty && (
              <button
                type="button"
                title={t("saveBtn")}
                onClick={() => saveSettings()}
                className="px-5 py-3 bg-amber-500 text-black rounded-xl font-black uppercase text-[9px] italic shadow-lg hover:bg-slate-900 hover:text-white transition-all"
              >
                {t("saveBtn")}
              </button>
            )}
            <Link
              href="/programari"
              title={t("backBtn")}
              className="px-5 py-3 bg-white border-2 border-slate-900 text-slate-900 rounded-xl font-black uppercase text-[9px] italic hover:bg-slate-900 hover:text-white transition-all shadow-[0_3px_0_0_rgba(15,23,42,1)]"
            >
              {t("backBtn")}
            </Link>
          </div>
        </header>

        {/* SECTIUNE LINK SI QR - PROTEJATA */}
        <section className="relative bg-slate-900 rounded-[30px] p-6 mb-4 shadow-xl overflow-hidden">
          {!isEliteOrTeam && (
             <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md p-6 text-center">
                <div className="bg-amber-500 text-black px-4 py-1 rounded-full font-black text-[10px] uppercase mb-2">{t("premiumBadge")}</div>
                <h3 className="text-white font-black uppercase italic text-lg tracking-tighter">{t("premiumTitle")}</h3>
                <p className="text-white/60 text-[10px] font-bold uppercase max-w-md mt-1">
                  {t("premiumTextBefore")}<span className="text-amber-500">{t("premiumElite")}</span>{t("premiumOr")}<span className="text-amber-500">{t("premiumTeam")}</span>{t("premiumTextAfter")}
                </p>
                <Link href="/upgrade" className="mt-4 px-6 py-2 bg-white text-slate-900 rounded-lg font-black uppercase text-[9px] italic hover:bg-amber-500 transition-all">
                  {t("upgradeBtn")}
                </Link>
             </div>
          )}

          <div className={`flex flex-col md:flex-row items-center justify-between gap-6 transition-all ${!isEliteOrTeam ? 'blur-sm grayscale opacity-30 pointer-events-none' : ''}`}>
            <div className="flex-1 w-full md:w-auto">
              <h2 className="text-amber-500 font-black italic uppercase tracking-widest text-[8px] mb-2">{t("linkSectionTitle")}</h2>
              <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-6 flex items-center overflow-hidden">
                <span className="text-white/40 font-mono text-sm mr-1 truncate">{baseUrl}/rezervare/</span>
                <span className="text-amber-500 font-black font-mono text-base md:text-lg truncate">{slug || t("slugUnset")}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-2 h-[120px]">
                <button type="button" onClick={handleCopyLink} disabled={!slug} className="flex-1 bg-white text-black px-6 rounded-xl font-black uppercase text-[9px] italic hover:bg-amber-500 transition-all shadow-md">{t("copyBtn")}</button>
                <button type="button" onClick={handleWhatsAppShare} disabled={!slug} className="flex-1 bg-[#25D366] text-white px-6 rounded-xl font-black uppercase text-[9px] italic hover:scale-105 transition-all shadow-md">{t("whatsappBtn")}</button>
              </div>
              <div className="bg-white p-2.5 rounded-xl flex items-center justify-center h-[120px] w-[120px] shadow-lg" ref={qrRef}>
                <QRCodeSVG value={slug ? bookingUrl : "https://chronos.ro"} size={100} level="H" includeMargin={false} />
              </div>
              <button type="button" onClick={handlePrintQR} disabled={!slug} className="bg-amber-500 text-black h-[120px] px-3 rounded-xl font-black uppercase text-[9px] italic hover:bg-white transition-all shadow-md flex flex-col items-center justify-center gap-2">
                <span className="[writing-mode:vertical-lr] rotate-180">{t("printBtn")}</span>
              </button>
            </div>
          </div>
        </section>

        {/* ✅ SECTIUNE PLATA ONLINE - PROTEJATA (Elite/Team) */}
        <section className="relative bg-white rounded-[30px] p-6 md:p-8 mb-8 shadow-xl border border-slate-100 overflow-hidden">
          {!isEliteOrTeam && (
             <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md p-6 text-center">
                <div className="bg-amber-500 text-black px-4 py-1 rounded-full font-black text-[10px] uppercase mb-2">{t("premiumBadge")}</div>
                <h3 className="text-slate-900 font-black uppercase italic text-lg tracking-tighter">{t("paymentSectionTitle")}</h3>
                <p className="text-slate-500 text-[10px] font-bold uppercase max-w-md mt-1">
                  {t("paymentPremiumTextBefore")}<span className="text-amber-600">{t("premiumElite")}</span>{t("premiumOr")}<span className="text-amber-600">{t("premiumTeam")}</span>
                </p>
                <Link href="/upgrade" className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-lg font-black uppercase text-[9px] italic hover:bg-amber-500 hover:text-black transition-all">
                  {t("upgradeBtn")}
                </Link>
             </div>
          )}

          <div className={`transition-all ${!isEliteOrTeam ? 'blur-sm grayscale opacity-30 pointer-events-none' : ''}`}>
            <h2 className="text-lg md:text-xl font-black uppercase italic text-slate-900 tracking-tighter mb-2 border-l-4 border-amber-500 pl-3">
              {t("paymentSectionTitle")}
            </h2>
            <p className="text-slate-500 text-[11px] font-bold mb-6">{t("paymentSectionSubtitle")}</p>

            <div className="flex flex-col md:flex-row items-stretch gap-4 mb-6">
              {/* Status conectare Stripe */}
              <div className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-[22px] p-5 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${stripeOnboarded ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                  <span className={`text-[11px] font-black uppercase italic ${stripeOnboarded ? 'text-green-700' : 'text-slate-400'}`}>
                    {stripeOnboarded ? t("stripeConnectedLabel") : t("stripeNotConnectedLabel")}
                  </span>
                </div>
                {stripeAccountId && !stripeOnboarded && (
                  <p className="text-[9px] font-bold text-amber-600 italic mb-3">{t("connectionPending")}</p>
                )}
                <button
                  type="button"
                  onClick={handleConnectStripe}
                  disabled={connectingStripe}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase italic hover:bg-amber-500 hover:text-black transition-all shadow-md disabled:opacity-50"
                >
                  {connectingStripe ? t("connectingBtn") : t("connectStripeBtn")}
                </button>
              </div>

              {/* Comutator plată obligatorie */}
              <div className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-[22px] p-5 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase text-slate-500 italic mb-3 block">{t("requirePaymentLabel")}</span>
                <button
                  type="button"
                  onClick={handleToggleRequirePayment}
                  disabled={!stripeOnboarded}
                  className={`w-full py-3 rounded-xl font-black text-[10px] uppercase italic transition-all shadow-md disabled:opacity-40 ${requirePayment ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}
                >
                  {requirePayment ? t("requirePaymentOn") : t("requirePaymentOff")}
                </button>
              </div>

              {/* Valuta */}
              <div className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-[22px] p-5 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase text-slate-500 italic mb-3 block">{t("currencyLabel")}</span>
                <select
                  value={currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="w-full py-3 px-3 bg-white border-2 border-slate-200 rounded-xl font-black text-[12px] outline-none focus:border-amber-500"
                >
                  {CURRENCY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Transparență comision */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-[22px] p-5">
              <p className="text-[10px] font-black uppercase text-amber-800 italic mb-2">{t("commissionNoticeTitle")}</p>
              <p className="text-[11px] font-bold text-amber-900 leading-relaxed">{t("commissionNoticeText")}</p>
            </div>
          </div>
        </section>

        {isEliteOrTeam && !slug && (
          <div className="mb-8 p-6 bg-red-50 border-2 border-red-200 rounded-[25px] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-3xl">⚠️</span>
              <div>
                <h4 className="text-red-900 font-black uppercase italic text-sm tracking-tighter">{t("noSlugWarningTitle")}</h4>
                <p className="text-red-700 font-bold text-[10px] uppercase italic">{t("noSlugWarningText")}</p>
              </div>
            </div>
          </div>
        )}

        {/* CALENDAR - DISPONIBIL TUTUROR */}
        <div className="bg-white p-5 md:p-8 rounded-[40px] shadow-2xl border border-slate-100 mb-10">
          <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
            <div className="flex flex-col">
              <h2 className="text-2xl md:text-3xl font-black uppercase italic text-slate-900 tracking-tighter leading-none">
                {currentMonth.toLocaleString(localeCode, { month: 'long' })} <span className="text-amber-500">{currentMonth.getFullYear()}</span>
              </h2>
            </div>
            <div className="flex-1 flex justify-center">
              <h2 className="text-xl md:text-2xl font-black uppercase italic text-slate-900 tracking-tighter">
                {t("calendarHeadingLine1")} <span className="text-amber-500">{t("calendarHeadingHighlight")}</span>
              </h2>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="w-10 h-10 flex items-center justify-center bg-slate-50 border-2 border-slate-100 rounded-lg hover:bg-amber-500 hover:text-white transition-all">←</button>
              <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="w-10 h-10 flex items-center justify-center bg-slate-50 border-2 border-slate-100 rounded-lg hover:bg-amber-500 hover:text-white transition-all">→</button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2 md:gap-3">
            {weekdaysShort.map(z => (
              <div key={z} className="text-center p-2 border-b-2 border-amber-500/10 mb-1">
                <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest italic">{z}</span>
              </div>
            ))}
            {renderCalendar()}
          </div>
        </div>
      </div>

      {/* MODAL MANAGEMENT ZI */}
      {showDayModal && selectedDate && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div ref={modalRef} className="bg-white w-full max-w-6xl rounded-[45px] p-6 md:p-10 relative shadow-2xl border-t-[10px] border-amber-500 overflow-y-auto max-h-[75vh] custom-scrollbar">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
              <div>
                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest italic mb-1 block">{t("modalBadge")}</span>
                <h3 className="text-3xl font-black uppercase italic text-slate-900 tracking-tighter">
                  {(() => {
                    const [y, m, d] = selectedDate.split('-').map(Number);
                    return new Date(y, m - 1, d).toLocaleDateString(localeCode, { weekday: 'long', day: 'numeric', month: 'long' });
                  })()}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                  <button type="button" onClick={toggleAllDay} className={`h-[50px] px-6 rounded-xl font-black text-[9px] uppercase italic transition-all border-2 ${isDayFullyBlocked ? 'bg-green-500 border-green-500 text-white' : 'bg-slate-100 border-slate-100 text-slate-900'}`}>
                    {isDayFullyBlocked ? t("unblockAllBtn") : t("blockAllBtn")}
                  </button>
                  <button type="button" onClick={() => setShowConfirmPopup(true)} className="h-[50px] px-6 bg-amber-500 text-black rounded-xl font-black text-[9px] uppercase italic shadow-lg hover:scale-105 transition-all">
                    {t("presetScheduleBtn")}
                  </button>
                  <button type="button" onClick={handleCloseAndSave} className="w-12 h-[50px] flex items-center justify-center bg-slate-900 text-white rounded-xl font-black hover:bg-red-500 transition-colors shadow-lg">✕</button>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-3">
                <p className="text-[8px] font-black uppercase text-slate-400 mb-3 italic tracking-widest">{t("bookingStepLabel")}</p>
                <div className="grid grid-cols-1 gap-2">
                  {[60, 30, 15].map(v => (
                    <button type="button" key={v} onClick={() => { setBookingInterval(v); setIsDirty(true); }} className={`py-4 rounded-xl font-black text-[10px] border-2 transition-all ${bookingInterval === v ? 'border-amber-500 bg-amber-500 text-black' : 'border-slate-100 text-slate-400'}`}>
                      {v === 60 ? t("oneHourOption") : t("minutesOption", { v })}
                    </button>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-9">
                <div className="max-h-[400px] overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-4 gap-2 custom-scrollbar">
                  {dynamicTimeSlots.map(slot => (
                    <button type="button" key={slot} onClick={() => toggleHourBlock(slot)} className={`py-5 rounded-xl font-black text-[12px] border-2 transition-all italic ${existingBookings.includes(slot) ? 'bg-amber-50 border-amber-200 text-amber-600 cursor-not-allowed' : (manualBlocks[selectedDate] || []).includes(slot) ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white border-slate-100 text-slate-900'}`}>
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-8 text-center border-t border-slate-100 pt-6">
              <button type="button" onClick={handleCloseAndSave} className="px-16 py-5 bg-amber-500 text-black rounded-[25px] font-black text-[11px] uppercase italic tracking-widest shadow-xl hover:scale-105 transition-all">
                {t("confirmAvailabilityBtn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP REPLICARE ZILE */}
      {showConfirmPopup && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div ref={confirmPopupRef} className="bg-white w-full max-w-md rounded-[35px] p-8 shadow-2xl border-b-[8px] border-amber-500 text-center relative overflow-hidden">
            {showSuccessTick ? (
              <div className="py-6 animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-200">
                  <span className="text-white text-4xl">✓</span>
                </div>
                <h3 className="text-2xl font-black uppercase italic text-slate-900 tracking-tighter">{t("successTitle")}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase italic mt-2">{t("successText")}</p>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-black uppercase italic text-slate-900 tracking-tighter mb-2">{t("applyScheduleTitle")}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase italic mb-6">{t("applyScheduleText")}</p>
                <div className="flex justify-center gap-2 mb-8">
                  {[1, 2, 3, 4, 5, 6, 0].map(d => (
                    <button type="button" key={d} onClick={() => toggleWeekdaySelection(d)} className={`w-10 h-10 rounded-full font-black text-[10px] transition-all border-2 flex items-center justify-center ${selectedWeekdays.includes(d) ? 'bg-amber-500 border-amber-500 text-black shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-amber-500'}`}>
                      {weekdayLetters[d]}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-3">
                  <button type="button" disabled={isApplying || selectedWeekdays.length === 0} onClick={applyToSelectedWeekdays} className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase italic tracking-widest transition-all ${isApplying ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-amber-500 hover:text-black shadow-xl'}`}>
                    {isApplying ? t("applying") : t("applyNowBtn")}
                  </button>
                  <button type="button" onClick={() => setShowConfirmPopup(false)} className="w-full py-4 text-slate-400 font-black text-[9px] uppercase italic hover:text-red-500">
                    {t("cancelBtn")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminSettingsHub() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center font-black text-amber-500 animate-pulse text-[10px] uppercase">...</div>}>
      <SettingsContent />
    </Suspense>
  );
}