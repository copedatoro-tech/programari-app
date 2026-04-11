"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { showToast, showConfirm } from "@/lib/toast";

// --- CONFIGURAȚIE PLANURI ---
const plans = [
  {
    id: "CHRONOS FREE",
    name: "CHRONOS FREE",
    priceDisplay: "0",
    description: "Esențial pentru început de drum.",
    features: [
      { text: "📌 30 Programări / lună", available: true },
      { text: "📇 30 Clienți (Capacitate)", available: true },
      { text: "👤 1 Profesionist (Solo)", available: true },
      { text: "📊 Raport INDISPONIBIL", available: false },
      { text: "📵 Fără WhatsApp", available: false },
      { text: "🔒 Securitate date", available: true }
    ],
    buttonText: "Alege Free",
    stripeLink: "#",
    popular: false
  },
  {
    id: "CHRONOS PRO",
    name: "CHRONOS PRO",
    priceDisplay: "49",
    description: "Pentru profesioniști în creștere.",
    features: [
      { text: "🚀 150 Programări / lună", available: true },
      { text: "👥 150 Clienți (Capacitate)", available: true },
      { text: "👤 1 Profesionist (Solo)", available: true },
      { text: "📊 Raport SUMAR activitate", available: true, highlight: "SUMAR" },
      { text: "📵 Fără WhatsApp", available: false },
      { text: "🔒 Securitate date", available: true }
    ],
    buttonText: "Alege Pro",
    stripeLink: "https://buy.stripe.com/8x2eV76Qg5EugHF8lG0RG04",
    popular: true
  },
  {
    id: "CHRONOS ELITE",
    name: "CHRONOS ELITE",
    priceDisplay: "99",
    description: "Puterea comunicării directe.",
    features: [
      { text: "✨ 500 Programări / lună", available: true },
      { text: "👥 500 Clienți (Capacitate)", available: true },
      { text: "👨‍⚕️ 5 Profesioniști", available: true },
      { text: "📈 Raport DETALIAT activitate", available: true, highlight: "DETALIAT" },
      { text: "📲 WhatsApp Direct", available: true },
      { text: "🔒 Securitate date", available: true }
    ],
    buttonText: "Alege Elite",
    stripeLink: "https://buy.stripe.com/28EaER6Qgff4bnl59u0RG02",
    popular: false
  },
  {
    id: "CHRONOS TEAM",
    name: "CHRONOS TEAM",
    priceDisplay: "199",
    description: "Control total pentru clinici.",
    features: [
      { text: "💎 Programări Nelimitate", available: true },
      { text: "♾️ Clienți Nelimitați", available: true },
      { text: "👥 Până la 50 membri", available: true },
      { text: "📊 Raport DETALIAT + ANALIZĂ ECHIPĂ", available: true, highlight: "DETALIAT + ANALIZĂ ECHIPĂ" },
      { text: "📲 WhatsApp Direct", available: true },
      { text: "🔒 Securitate date", available: true }
    ],
    buttonText: "Alege Team",
    stripeLink: "https://buy.stripe.com/8x2eV76QgaYO9fdeK40RG06",
    popular: false
  }
];

// Modal elegant de schimbare plan
function ElegantModal({ title, message, onConfirm, onCancel }: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onCancel}
    >
      <div
        className="bg-white p-8 rounded-[35px] shadow-2xl border border-slate-100 max-w-sm w-full mx-4 transform animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4 text-amber-500 text-2xl">⚠️</div>
          <h3 className="text-xl font-black italic uppercase tracking-tighter mb-2">{title}</h3>
          <p className="text-slate-500 font-medium italic text-sm mb-6">{message}</p>
          <div className="flex flex-col w-full gap-3">
            <button
              onClick={onConfirm}
              className="w-full bg-slate-900 text-white py-4 rounded-[20px] font-black uppercase italic text-[10px] tracking-widest border-b-4 border-slate-700 hover:scale-[1.02] transition-all"
            >
              Confirm Schimbarea
            </button>
            <button
              onClick={onCancel}
              className="w-full bg-slate-100 text-slate-500 py-3 rounded-[20px] font-black uppercase italic text-[9px]"
            >
              Anulează
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AbonamentePage() {
  const [currentPlan, setCurrentPlan] = useState<string>("CHRONOS FREE");
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ zile: 0, ore: 0, minute: 0, secunde: 0 });
  const [trialUsed, setTrialUsed] = useState(false);
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showModal, setShowModal] = useState<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    setMounted(true);

    const fetchData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          setUser(null);
          setCurrentPlan("CHRONOS FREE");
          return;
        }
        setUser(authUser);

        const { data: profile } = await supabase
          .from("profiles")
          .select("plan_type, trial_started_at, trial_used")
          .eq("id", authUser.id)
          .single();

        if (profile) {
          setTrialUsed(profile.trial_used || false);
          const rawPlan = (profile.plan_type || "CHRONOS FREE").toUpperCase().trim();
          let dbPlan = "CHRONOS FREE";
          if (rawPlan.includes("TEAM")) dbPlan = "CHRONOS TEAM";
          else if (rawPlan.includes("ELITE")) dbPlan = "CHRONOS ELITE";
          else if (rawPlan.includes("PRO")) dbPlan = "CHRONOS PRO";
          else dbPlan = "CHRONOS FREE";

          if (profile.trial_started_at) {
            const start = new Date(profile.trial_started_at);
            const end = new Date(start.getTime() + 10 * 24 * 60 * 60 * 1000);
            const acum = new Date();
            const diffMs = end.getTime() - acum.getTime();

            if (diffMs > 0) {
              setIsTrialActive(true);
              setCurrentPlan("CHRONOS TEAM");
              startTimer(end);
            } else {
              setIsTrialActive(false);
              if (dbPlan === "CHRONOS TEAM") {
                await supabase.from("profiles").update({ plan_type: "CHRONOS FREE" }).eq("id", authUser.id);
                setCurrentPlan("CHRONOS FREE");
              } else {
                setCurrentPlan(dbPlan);
              }
            }
          } else {
            setCurrentPlan(dbPlan);
          }
        }
      } catch (err) {
        console.error("Error:", err);
      }
    };

    fetchData();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [supabase]);

  const startTimer = (endTime: Date) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const updateTimer = () => {
      const acum = new Date();
      const diffMs = endTime.getTime() - acum.getTime();
      if (diffMs <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsTrialActive(false);
        window.location.reload();
        return;
      }
      setTimeLeft({
        zile: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
        ore: Math.floor((diffMs / (1000 * 60 * 60)) % 24),
        minute: Math.floor((diffMs / (1000 * 60)) % 60),
        secunde: Math.floor((diffMs / 1000) % 60)
      });
    };
    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);
  };

  const handleActivateTrial = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        plan_type: "CHRONOS TEAM",
        trial_started_at: new Date().toISOString(),
        trial_used: true
      })
      .eq("id", user.id);

    if (!error) window.location.reload();
    else await showToast({ message: "Eroare la activarea trial-ului. Încearcă din nou.", type: "error", title: "Eroare" });
  };

  const confirmPlanChange = (plan: any) => {
    if (plan.id === currentPlan) return;
    if (plan.stripeLink && plan.stripeLink !== "#") {
      window.location.href = plan.stripeLink;
    } else if (plan.id === "CHRONOS FREE") {
      showToast({ message: "Ești deja pe planul gratuit sau contactează suportul pentru downgrade.", type: "info", title: "Info" });
    }
  };

  const handlePlanClick = (plan: any) => {
    if (plan.id === currentPlan) return;
    if (isTrialActive) {
      setShowModal(plan);
    } else {
      confirmPlanChange(plan);
    }
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 md:px-8 font-sans">
      {showModal && (
        <ElegantModal
          title="Schimbare Plan"
          message={`Ești în perioada de probă CHRONOS TEAM. Dacă treci la ${showModal.name}, vei pierde zilele rămase de acces gratuit. Continui?`}
          onConfirm={() => { confirmPlanChange(showModal); setShowModal(null); }}
          onCancel={() => setShowModal(null)}
        />
      )}

      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter text-slate-900 uppercase">
            Abonamente <span className="text-amber-500">Chronos</span>
          </h1>
          <p className="text-slate-500 font-medium text-base max-w-2xl mx-auto italic">
            Performanță și organizare la nivel profesionist.
          </p>
        </div>

        {user && (
          <div className="mb-10 max-w-4xl mx-auto bg-white border border-slate-200 rounded-[30px] p-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)] flex flex-col md:flex-row items-center justify-between gap-4 transition-all hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-500 mb-1">
                {isTrialActive ? "Acces Temporar Activ" : "Abonament Activ"}
              </p>
              <h2 className="text-xl font-black italic uppercase text-slate-900">
                {isTrialActive ? "CHRONOS TEAM (PERIOADĂ PROBĂ)" : currentPlan}
              </h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tight">{user.email}</p>
            </div>

            <div className="flex items-center gap-3">
              {isTrialActive ? (
                <div className="flex gap-1.5">
                  {[
                    { l: "Zile", v: timeLeft.zile },
                    { l: "Ore", v: timeLeft.ore },
                    { l: "Min", v: timeLeft.minute },
                    { l: "Sec", v: timeLeft.secunde }
                  ].map((t, i) => (
                    <div key={i} className="bg-slate-900 w-14 h-14 rounded-xl flex flex-col items-center justify-center shadow-md border-b-2 border-slate-700">
                      <span className="text-white font-black text-lg leading-none">{t.v}</span>
                      <span className="text-[7px] text-slate-400 font-bold uppercase">{t.l}</span>
                    </div>
                  ))}
                </div>
              ) : (
                !trialUsed && (
                  <button
                    onClick={handleActivateTrial}
                    className="bg-amber-500 text-black px-6 py-3 rounded-xl font-black italic uppercase text-[10px] hover:bg-black hover:text-white transition-all duration-300 shadow-lg shadow-amber-500/20"
                  >
                    Activează 10 zile CHRONOS TEAM (Gratuit)
                  </button>
                )
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {plans.map((plan, index) => {
            const isSelected = currentPlan === plan.id;
            return (
              <div
                key={index}
                className={`relative flex flex-col bg-white rounded-[40px] p-8 transition-all duration-500 border-2 ${
                  isSelected
                    ? "border-amber-500 shadow-2xl scale-[1.01] z-10"
                    : "border-transparent shadow-xl shadow-slate-200/50 hover:border-slate-200 hover:translate-y-[-3px]"
                }`}
              >
                {plan.popular && !isSelected && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-amber-500 text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                    Popular
                  </div>
                )}
                {isSelected && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                    Plan Activ
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-black italic uppercase text-slate-900 mb-1">{plan.name}</h3>
                  <p className="text-slate-400 text-[11px] font-bold leading-relaxed h-7">{plan.description}</p>
                </div>

                <div className="mb-8 flex items-baseline gap-1">
                  <span className="text-4xl font-black tracking-tighter text-slate-900">{plan.priceDisplay}</span>
                  <span className="text-xs font-black text-slate-300 uppercase italic">Ron / lună</span>
                </div>

                <div className="space-y-3 flex-1 mb-10">
                  {plan.features.map((feature, i) => {
                    const parts = feature.highlight 
                      ? feature.text.split(new RegExp(`(${feature.highlight})`, 'g'))
                      : [feature.text];

                    return (
                      <div key={i} className="flex items-center gap-2.5">
                        <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${feature.available ? "bg-amber-50" : "bg-red-50"}`}>
                          <span className={`${feature.available ? "text-amber-600" : "text-red-500"} text-[9px] font-black`}>
                            {feature.available ? "✓" : "✕"}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold uppercase italic tracking-tight ${feature.available ? "text-slate-600" : "text-slate-300"}`}>
                          {parts.map((part, idx) => 
                            part === feature.highlight ? <strong key={idx} className="text-slate-900 underline decoration-amber-500/50">{part}</strong> : part
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePlanClick(plan)}
                  disabled={isSelected}
                  className={`w-full py-4 rounded-[20px] font-black italic uppercase text-[10px] tracking-widest transition-all duration-300 ${
                    isSelected
                      ? "bg-amber-500 text-black cursor-default border border-slate-200"
                      : "bg-slate-900 text-white hover:bg-amber-500 hover:text-black shadow-lg shadow-slate-900/10 active:scale-95"
                  }`}
                >
                  {isSelected ? "Deja Activat" : plan.buttonText}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}