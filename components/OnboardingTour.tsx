"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { supabase } from "@/lib/supabaseClient";
// ─── Configurare pași tur (pagini) ─────────────────────────────────────────
const TOUR_STEPS: { path: string; key: string }[] = [
  { path: "/profil", key: "profil" },
  { path: "/settings", key: "settings" },
  { path: "/resurse", key: "resurse" },
  { path: "/programari", key: "programari" },
  { path: "/programari/calendar", key: "calendar" },
  { path: "/clienti", key: "clienti" },
  { path: "/rapoarte", key: "rapoarte" },
  { path: "/sugestii", key: "sugestii" },
  { path: "/contacte-utile", key: "contacteUtile" },
  { path: "/abonamente", key: "abonamente" },
];
const ICONS: Record<string, string> = {
  profil: "👤", settings: "⚙️", resurse: "📦", programari: "📅",
  calendar: "🗓️", clienti: "👥", abonamente: "💎", rapoarte: "📊",
  sugestii: "⭐", contacteUtile: "📞",
};
// ─── Pași cu spotlight pe elemente reale ────────────────────────────────────
// Textele vin acum din ro.json (onboarding.highlights.<pagina>.<key>.title/desc),
// nu mai sunt hardcodate în cod — pot fi traduse ulterior, ca pas separat.
type Highlight = { targetId: string; key: string; actionable?: boolean };
const PAGE_HIGHLIGHTS: Record<string, Highlight[]> = {
  profil: [
    { targetId: "onboarding-avatar", key: "avatar" },
    { targetId: "onboarding-nume", key: "businessName" },
    { targetId: "onboarding-telefon", key: "phone" },
    { targetId: "onboarding-slug", key: "slug" },
    { targetId: "onboarding-slug-btn", key: "slugButton", actionable: true },
    { targetId: "onboarding-save-btn", key: "saveButton", actionable: true },
  ],
  settings: [
    { targetId: "onboarding-orar", key: "workingHours" },
    { targetId: "onboarding-notifications", key: "notifications" },
    { targetId: "onboarding-stripe-connect", key: "stripe" },
  ],
  resurse: [
    { targetId: "onboarding-service-duration", key: "duration" },
    { targetId: "onboarding-service-price", key: "price" },
    { targetId: "onboarding-add-staff-btn", key: "addStaff", actionable: true },
  ],
  programari: [
    { targetId: "onboarding-prog-email", key: "email" },
    { targetId: "onboarding-prog-phone", key: "phone" },
  ],
  calendar: [
    { targetId: "onboarding-calendar-view-toggle", key: "viewToggle" },
    { targetId: "onboarding-calendar-search", key: "search" },
  ],
  sugestii: [
    { targetId: "onboarding-sugestii-view-bookings", key: "viewBookings" },
    { targetId: "onboarding-sugestii-form", key: "manualForm" },
  ],
  abonamente: [
    { targetId: "onboarding-activate-trial-btn", key: "activateTrial", actionable: true },
  ],
  clienti: [
    { targetId: "onboarding-clienti-search", key: "search" },
    { targetId: "onboarding-clienti-sync", key: "autoSync" },
  ],
  rapoarte: [
    { targetId: "onboarding-rapoarte-stats", key: "stats" },
    { targetId: "onboarding-rapoarte-export", key: "exportBtn", actionable: true },
  ],
  contacteUtile: [
    { targetId: "onboarding-contacte-form", key: "addForm" },
    { targetId: "onboarding-contacte-new-folder", key: "newFolder", actionable: true },
  ],
};
type Status = "loading" | "hidden" | "welcome" | "touring" | "activating" | "done";
function TourStyles() {
  return (
    <style>{`
      @keyframes chronosFadeIn { from { opacity:0; } to { opacity:1; } }
      @keyframes chronosSlideUp { from { opacity:0; transform:translateY(28px) scale(0.96); } to { opacity:1; transform:translateY(0) scale(1); } }
      @keyframes chronosPop { 0% { transform:scale(0.7); opacity:0; } 60% { transform:scale(1.08); opacity:1; } 100% { transform:scale(1); } }
      @keyframes chronosSpin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      @keyframes chronosPulseRing { 0% { box-shadow:0 0 0 0 rgba(245,158,11,0.55);} 70% { box-shadow:0 0 0 12px rgba(245,158,11,0);} 100% { box-shadow:0 0 0 0 rgba(245,158,11,0);} }
      @keyframes chronosArrowPulse { 0%,100% { transform:translateY(-50%) rotate(45deg) scale(1); } 50% { transform:translateY(-50%) rotate(45deg) scale(1.08); } }
    `}</style>
  );
}
function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(15,23,42,0.88)", backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, animation: "chronosFadeIn 0.25s ease",
    }}>
      {children}
    </div>
  );
}
// ─── Overlay cu "gaură" — blochează click-urile peste tot, în afară de elementul evidențiat ───
function SpotlightMask({ rect }: { rect: DOMRect }) {
  const pad = 10;
  const top = Math.max(rect.top - pad, 0);
  const left = Math.max(rect.left - pad, 0);
  const width = rect.width + pad * 2;
  const height = rect.height + pad * 2;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
  const vh = typeof window !== "undefined" ? window.innerHeight : 1080;
  const bar: React.CSSProperties = {
    position: "fixed", background: "rgba(15,23,42,0.72)", zIndex: 9990, transition: "all 0.25s ease",
  };
  return (
    <>
      <div style={{ ...bar, top: 0, left: 0, width: vw, height: top }} />
      <div style={{ ...bar, top: top + height, left: 0, width: vw, height: Math.max(vh - (top + height), 0) }} />
      <div style={{ ...bar, top, left: 0, width: left, height }} />
      <div style={{ ...bar, top, left: left + width, width: Math.max(vw - (left + width), 0), height }} />
      <div style={{
        position: "fixed", top, left, width, height, borderRadius: 18,
        border: "3px solid #f59e0b", boxShadow: "0 0 0 4px rgba(245,158,11,0.25), 0 0 40px rgba(245,158,11,0.5)",
        zIndex: 9991, pointerEvents: "none", transition: "all 0.25s ease",
        animation: "chronosPulseRing 1.8s ease infinite",
      }} />
    </>
  );
}
export default function OnboardingTour({ userId }: { userId: string }) {
  const t = useTranslations("layout");
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [stepIndex, setStepIndex] = useState(0);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clickHandlerRef = useRef<((e: Event) => void) | null>(null);
  const currentTargetElRef = useRef<HTMLElement | null>(null);
  const step = TOUR_STEPS[stepIndex];
  const highlights = PAGE_HIGHLIGHTS[step?.key] || [];
  const hasHighlights = highlights.length > 0;
  const highlight = highlights[highlightIndex];
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", userId)
          .single();
        if (!mounted) return;
        setStatus(data?.onboarding_completed ? "hidden" : "welcome");
      } catch {
        if (mounted) setStatus("hidden");
      }
    })();
    return () => { mounted = false; };
  }, [userId]);
  const markCompleted = useCallback(async (extra?: Record<string, any>) => {
    try {
      await supabase.from("profiles").update({ onboarding_completed: true, ...extra }).eq("id", userId);
    } catch {
      // silențios
    }
  }, [userId]);

  const advanceHighlight = () => {
    if (highlightIndex < highlights.length - 1) {
      setHighlightIndex((i) => i + 1);
    } else {
      goToNextPage();
    }
  };

  const cleanupTargetWatch = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (currentTargetElRef.current && clickHandlerRef.current) {
      currentTargetElRef.current.removeEventListener("click", clickHandlerRef.current);
    }
    currentTargetElRef.current = null;
    clickHandlerRef.current = null;
  }, []);
  useEffect(() => {
    cleanupTargetWatch();
    setTargetRect(null);
    if (status !== "touring" || !hasHighlights || !highlight) return;
    let tries = 0;
    pollRef.current = setInterval(() => {
      tries++;
      const el = document.getElementById(highlight.targetId);
      if (el) {
        if (pollRef.current) clearInterval(pollRef.current);
        currentTargetElRef.current = el;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const updateRect = () => setTargetRect(el.getBoundingClientRect());
        updateRect();
        window.addEventListener("resize", updateRect);
        window.addEventListener("scroll", updateRect, true);
        const onClick = () => advanceHighlight();
        clickHandlerRef.current = onClick;
        el.addEventListener("click", onClick);
        (el as any)._chronosCleanup = () => {
          window.removeEventListener("resize", updateRect);
          window.removeEventListener("scroll", updateRect, true);
        };
      } else if (tries > 30) {
        if (pollRef.current) clearInterval(pollRef.current);
        advanceHighlight();
      }
    }, 100);
    return () => {
      if (currentTargetElRef.current && (currentTargetElRef.current as any)._chronosCleanup) {
        (currentTargetElRef.current as any)._chronosCleanup();
      }
      cleanupTargetWatch();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, stepIndex, highlightIndex]);
  const startTour = () => {
    setStepIndex(0);
    setHighlightIndex(0);
    setStatus("touring");
    router.push(TOUR_STEPS[0].path as any);
  };
  const skipTour = async () => {
    setStatus("hidden");
    await markCompleted();
  };
  const goToNextPage = async () => {
    const isLast = stepIndex === TOUR_STEPS.length - 1;
    if (isLast) {
      await markCompleted();
      setStatus("done");
      return;
    }
    const next = stepIndex + 1;
    setStepIndex(next);
    setHighlightIndex(0);
    router.push(TOUR_STEPS[next].path as any);
  };
  const goPrevPage = () => {
    if (stepIndex === 0) return;
    const prev = stepIndex - 1;
    setStepIndex(prev);
    setHighlightIndex(0);
    router.push(TOUR_STEPS[prev].path as any);
  };
  const finishAndGo = () => {
    setStatus("hidden");
    router.push("/programari" as any);
  };
  const finishAndOpenPlans = () => {
    setStatus("hidden");
    router.push("/abonamente" as any);
  };
  if (status === "loading" || status === "hidden") return null;
  // ─── ECRAN 1 — Bun venit ──────────────────────────────────────────────
  if (status === "welcome") {
    return (
      <Overlay>
        <TourStyles />
        <div style={{
          background: "#fff", borderRadius: 32, overflow: "hidden",
          width: "100%", maxWidth: 520, maxHeight: "92vh",
          boxShadow: "0 40px 100px rgba(0,0,0,0.35)", animation: "chronosSlideUp 0.3s ease",
          display: "flex", flexDirection: "column",
        }}>
          <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", padding: "36px 32px 28px", textAlign: "center" }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20, background: "#f59e0b",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 30, margin: "0 auto 16px", animation: "chronosPop 0.5s ease",
            }}>👋</div>
            <p style={{ fontSize: 9, fontWeight: 900, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 6px" }}>CHRONOS</p>
            <h1 style={{ fontSize: 22, fontWeight: 900, fontStyle: "italic", color: "#fff", textTransform: "uppercase", margin: 0, letterSpacing: "-0.02em" }}>
              {t("onboarding.welcomeTitle")}
            </h1>
          </div>
          <div style={{ padding: "24px 28px", overflowY: "auto", flex: 1 }}>
            <div style={{
              background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 14,
              padding: "12px 16px", marginBottom: 18, display: "flex", gap: 10, alignItems: "flex-start",
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
              <p style={{ fontSize: 11, color: "#1e3a8a", fontWeight: 700, lineHeight: 1.5, margin: 0 }}>
                {t("onboarding.welcomeInfoNote")}
              </p>
            </div>
            <p style={{ fontSize: 13, color: "#475569", fontWeight: 600, lineHeight: 1.6, margin: "0 0 18px", textAlign: "center" }}>
              {t("onboarding.welcomeSubtitle")}
            </p>
            <p style={{ fontSize: 10, fontWeight: 900, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>
              {t("onboarding.welcomeListIntro")}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {TOUR_STEPS.map((s, i) => (
                <div key={s.path} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "8px 10px",
                }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: 6, background: "#0f172a", color: "#f59e0b",
                    fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>{i + 1}</span>
                  <span style={{ fontSize: 14 }}>{ICONS[s.key]}</span>
                  <span style={{ fontSize: 9, fontWeight: 800, color: "#334155", textTransform: "uppercase", lineHeight: 1.2 }}>
                    {t(`pageTitles.${s.key}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: "18px 28px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={startTour} style={{
              width: "100%", padding: "15px", background: "#f59e0b", border: "none", borderRadius: 16,
              fontSize: 12, fontWeight: 900, color: "#0f172a", cursor: "pointer",
              textTransform: "uppercase", fontStyle: "italic", letterSpacing: "0.03em",
              boxShadow: "0 8px 20px rgba(245,158,11,0.35)",
            }} className="hover:brightness-105 active:scale-[0.98] transition-all">
              {t("onboarding.startTourBtn")}
            </button>
            <button onClick={skipTour} style={{
              width: "100%", padding: "10px", background: "transparent", border: "none",
              fontSize: 10, fontWeight: 700, color: "#94a3b8", cursor: "pointer",
              textTransform: "uppercase", letterSpacing: "0.05em",
            }} className="hover:text-slate-600 transition-colors">
              {t("onboarding.skipTourBtn")}
            </button>
          </div>
        </div>
      </Overlay>
    );
  }
  // ─── ECRAN — Felicitare finală ──────────────────────────────────────────
  if (status === "done") {
    return (
      <Overlay>
        <TourStyles />
        <div style={{
          background: "linear-gradient(160deg,#fffbeb,#fff)", borderRadius: 32, overflow: "hidden",
          width: "100%", maxWidth: 440, boxShadow: "0 40px 100px rgba(0,0,0,0.35)",
          animation: "chronosSlideUp 0.3s ease", border: "3px solid #f59e0b",
        }}>
          <div style={{ padding: "44px 32px 28px", textAlign: "center" }}>
            <div style={{
              width: 76, height: 76, borderRadius: "50%", background: "#f59e0b",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 36, margin: "0 auto 20px", animation: "chronosPop 0.5s ease",
              boxShadow: "0 12px 30px rgba(245,158,11,0.4)",
            }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, fontStyle: "italic", color: "#0f172a", textTransform: "uppercase", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
              {t("onboarding.finalTitle")}
            </h2>
            <p style={{ fontSize: 12, color: "#78716c", fontWeight: 600, lineHeight: 1.6, margin: "0 0 20px" }}>
              {t("onboarding.finalSubtitle")}
            </p>
            <div style={{ background: "#0f172a", borderRadius: 18, padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <span style={{ fontSize: 20 }}>💎</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#fde68a", textAlign: "left", lineHeight: 1.4 }}>
                {t("onboarding.finalTrialLine")}
              </span>
            </div>
            <button onClick={finishAndGo} style={{
              width: "100%", padding: "15px", background: "#0f172a", border: "none", borderRadius: 16,
              fontSize: 12, fontWeight: 900, color: "#fff", cursor: "pointer",
              textTransform: "uppercase", fontStyle: "italic", letterSpacing: "0.03em",
            }} className="hover:bg-amber-600 hover:text-slate-900 active:scale-[0.98] transition-all">
              {t("onboarding.goToDashboardBtn")}
            </button>
            <button onClick={finishAndOpenPlans} style={{
              width: "100%", marginTop: 10, padding: "13px", background: "#f59e0b", border: "none", borderRadius: 16,
              fontSize: 11, fontWeight: 900, color: "#0f172a", cursor: "pointer",
              textTransform: "uppercase", fontStyle: "italic", letterSpacing: "0.03em",
            }} className="hover:brightness-105 active:scale-[0.98] transition-all">
              {t("pageTitles.abonamente")}
            </button>
          </div>
        </div>
      </Overlay>
    );
  }
  // ─── ECRAN — Tur cu spotlight pe element real ───────────────────────────
  if (hasHighlights && highlight) {
    const isFirstOverall = stepIndex === 0 && highlightIndex === 0;
    let cardStyle: React.CSSProperties = {
      position: "fixed", zIndex: 9992, width: 320, maxWidth: "calc(100vw - 32px)",
    };
    let arrowSide: "left" | "right" | "top" = "left";
    if (targetRect && typeof window !== "undefined") {
      const vh = window.innerHeight, vw = window.innerWidth;
      const cardWidth = Math.min(320, vw - 32);
      const estCardHeight = 240;
      const spaceRight = vw - targetRect.right;
      const spaceLeft = targetRect.left;
      const placeRight = spaceRight >= cardWidth + 28;
      const placeLeft = !placeRight && spaceLeft >= cardWidth + 28;
      cardStyle.width = cardWidth;
      if (placeRight || placeLeft) {
        cardStyle.top = Math.min(Math.max(targetRect.top + targetRect.height / 2 - estCardHeight / 2, 16), Math.max(16, vh - estCardHeight - 16));
        cardStyle.left = placeRight ? targetRect.right + 22 : targetRect.left - cardWidth - 22;
        arrowSide = placeRight ? "left" : "right";
      } else {
        const spaceBelow = vh - targetRect.bottom;
        const placeBelow = spaceBelow > estCardHeight + 24;
        cardStyle.top = placeBelow ? targetRect.bottom + 22 : Math.max(targetRect.top - estCardHeight - 22, 16);
        cardStyle.left = Math.min(Math.max(targetRect.left, 16), vw - cardWidth - 16);
        arrowSide = "top";
      }
    } else {
      cardStyle.top = "50%"; cardStyle.left = "50%"; cardStyle.transform = "translate(-50%,-50%)";
    }
    return (
      <>
        <TourStyles />
        {targetRect && <SpotlightMask rect={targetRect} />}
        {!targetRect && (
          <div style={{ position: "fixed", inset: 0, zIndex: 9990, background: "rgba(15,23,42,0.72)" }} />
        )}
        <div style={{ ...cardStyle, animation: "chronosSlideUp 0.25s ease" }}>
          {targetRect && (
            <div style={{
              position: "absolute",
              top: arrowSide === "top" ? -14 : Math.max(26, Math.min(190, targetRect.top + targetRect.height / 2 - Number(cardStyle.top || 0))),
              left: arrowSide === "left" ? -14 : arrowSide === "top" ? 28 : "auto",
              right: arrowSide === "right" ? -14 : "auto",
              width: 28,
              height: 28,
              background: "#f59e0b",
              borderRadius: 5,
              zIndex: -1,
              animation: "chronosArrowPulse 1.4s ease infinite",
            }} />
          )}
          <div style={{
            background: "#fff", borderRadius: 24, overflow: "hidden",
            boxShadow: "0 24px 60px rgba(0,0,0,0.35)", border: "2px solid #f59e0b",
          }}>
            <div style={{ background: "#0f172a", padding: "14px 18px 10px" }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                {TOUR_STEPS.map((_, i) => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: i < stepIndex ? "#f59e0b" : i === stepIndex ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.15)",
                  }} />
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>{ICONS[step.key]}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 8, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
                    {t("onboarding.stepCounter", { current: stepIndex + 1, total: TOUR_STEPS.length })}
                  </p>
                  <h2 style={{ fontSize: 14, fontWeight: 800, color: "#fff", margin: 0, fontStyle: "italic", textTransform: "uppercase" }}>
                    {t(`onboarding.highlights.${step.key}.${highlight.key}.title`)}
                  </h2>
                </div>
                <button onClick={skipTour} style={{
                  width: 24, height: 24, borderRadius: 7, background: "rgba(255,255,255,0.1)", border: "none",
                  cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#94a3b8",
                }} className="hover:bg-red-500 hover:text-white transition-all">✕</button>
              </div>
            </div>
            <div style={{ padding: "14px 18px" }}>
              <p style={{ fontSize: 12, color: "#334155", fontWeight: 600, lineHeight: 1.55, margin: "0 0 12px" }}>
                {t(`onboarding.highlights.${step.key}.${highlight.key}.desc`)}
              </p>
              {highlight.actionable ? (
                <p style={{
                  fontSize: 10, fontWeight: 800, color: "#92400e", background: "#fffbeb",
                  border: "1.5px solid #fcd34d", borderRadius: 10, padding: "8px 10px", margin: "0 0 12px",
                }}>
                  👉 {t("onboarding.tryItBtn")}
                </p>
              ) : null}
              <div style={{ display: "flex", gap: 6 }}>
                {!isFirstOverall && (
                  <button onClick={goPrevPage} style={{
                    padding: "9px 12px", background: "#f1f5f9", border: "none", borderRadius: 12,
                    fontSize: 10, fontWeight: 700, color: "#64748b", cursor: "pointer", textTransform: "uppercase", fontStyle: "italic",
                  }}>
                    {t("onboarding.prevBtn")}
                  </button>
                )}
                <button onClick={advanceHighlight} style={{
                  flex: 1, padding: "9px", background: "#0f172a", border: "none", borderRadius: 12,
                  fontSize: 10, fontWeight: 800, color: "#fff", cursor: "pointer", textTransform: "uppercase", fontStyle: "italic",
                }} className="hover:bg-amber-600 transition-all">
                  {highlight.actionable ? t("onboarding.skipStepBtn") : t("onboarding.nextBtn")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
  // ─── ECRAN — Fallback: modal clasic centrat (pagini fără spotlight încă) ──
  const titlu = t(`onboarding.${step.key}.titlu`);
  const subtitlu = t(`onboarding.${step.key}.subtitlu`);
  const tip = t(`onboarding.${step.key}.tip`);
  const pasi = t.raw(`onboarding.${step.key}.pasi`) as string[];
  const isLastPage = stepIndex === TOUR_STEPS.length - 1;
  return (
    <Overlay>
      <TourStyles />
      <div key={step.path} style={{
        background: "#fff", borderRadius: 28, overflow: "hidden",
        width: "100%", maxWidth: 480, maxHeight: "90vh",
        boxShadow: "0 32px 80px rgba(0,0,0,0.3)", animation: "chronosSlideUp 0.25s ease",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ background: "#0f172a", padding: "18px 22px 14px", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
            {TOUR_STEPS.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i <= stepIndex ? "#f59e0b" : "rgba(255,255,255,0.15)", transition: "background 0.3s ease",
              }} />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                {ICONS[step.key]}
              </div>
              <div>
                <p style={{ fontSize: 8, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>
                  {t("onboarding.stepCounter", { current: stepIndex + 1, total: TOUR_STEPS.length })}
                </p>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0, fontStyle: "italic", textTransform: "uppercase" }}>{titlu}</h2>
              </div>
            </div>
            <button onClick={skipTour} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#94a3b8" }}
              className="hover:bg-red-500 hover:text-white transition-all">✕</button>
          </div>
          <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, fontWeight: 600 }}>{subtitlu}</p>
        </div>
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {pasi.map((pas, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#f8fafc", borderRadius: 12, padding: "10px 12px", border: "1.5px solid #e2e8f0" }}>
                <span style={{ width: 22, height: 22, borderRadius: 7, background: "#0f172a", color: "#f59e0b", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                <p style={{ fontSize: 12, color: "#334155", fontWeight: 600, margin: 0, lineHeight: 1.5 }}>{pas}</p>
              </div>
            ))}
          </div>
          {tip && (
            <div style={{ background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
              <p style={{ fontSize: 11, color: "#92400e", fontWeight: 700, margin: 0, lineHeight: 1.5 }}>{tip}</p>
            </div>
          )}
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1.5px solid #f1f5f9", flexShrink: 0, display: "flex", gap: 8 }}>
          {stepIndex > 0 && (
            <button onClick={goPrevPage} style={{
              padding: "10px 16px", background: "#f1f5f9", border: "none", borderRadius: 14,
              fontSize: 11, fontWeight: 700, color: "#475569", cursor: "pointer", textTransform: "uppercase", fontStyle: "italic",
            }} className="hover:bg-slate-200 transition-all">
              {t("onboarding.prevBtn")}
            </button>
          )}
          <button onClick={goToNextPage} style={{
            flex: 1, padding: "10px", background: "#0f172a", border: "none", borderRadius: 14,
            fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer", textTransform: "uppercase", fontStyle: "italic",
          }} className="hover:bg-amber-600 transition-all">
            {isLastPage ? t("onboarding.finishBtn") : t("onboarding.nextBtn")}
          </button>
        </div>
      </div>
    </Overlay>
  );
}