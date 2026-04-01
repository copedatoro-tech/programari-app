"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";

const plans = [
  {
    id: "CHRONOS FREE",
    name: "Chronos Free",
    priceDisplay: "0",
    description: "Esențial pentru început de drum.",
    features: [
      "📌 30 Programări / lună",
      "📇 30 Clienți (Capacitate)",
      "👤 1 Profesionist (Solo)",
      "🔒 Securitate date"
    ],
    buttonText: "Alege Free",
    stripeLink: "#",
    popular: false
  },
  {
    id: "CHRONOS PRO",
    name: "Chronos Pro",
    priceDisplay: "49",
    description: "Pentru profesioniști în creștere.",
    features: [
      "🚀 150 Programări / lună",
      "👥 150 Clienți (Capacitate)",
      "📊 Raport sumar activitate",
      "📧 Suport e-mail dedicat"
    ],
    buttonText: "Alege Pro",
    stripeLink: "https://buy.stripe.com/8x2eV76Qg5EugHF8lG0RG04",
    popular: true
  },
  {
    id: "CHRONOS ELITE",
    name: "Chronos Elite",
    priceDisplay: "99",
    description: "Puterea comunicării directe.",
    features: [
      "✨ 500 Programări / lună",
      "👥 500 Clienți (Capacitate)",
      "📲 WhatsApp Direct",
      "👨‍⚕️ 5 Profesioniști"
    ],
    buttonText: "Alege Elite",
    stripeLink: "https://buy.stripe.com/28EaER6Qgff4bnl59u0RG02",
    popular: false
  },
  {
    id: "CHRONOS TEAM",
    name: "Chronos Team",
    priceDisplay: "199",
    description: "Control total pentru clinici.",
    features: [
      "💎 Programări Nelimitate",
      "♾️ Clienți Nelimitați",
      "📊 Analiză avansată echipă",
      "👥 Până la 50 membri"
    ],
    buttonText: "Alege Team",
    stripeLink: "https://buy.stripe.com/8x2eV76QgaYO9fdeK40RG06",
    popular: false
  }
];

export default function AbonamentePage() {
  const [currentPlan, setCurrentPlan] = useState<string>("CHRONOS FREE");
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ zile: 0, ore: 0, minute: 0, secunde: 0 });
  const [trialUsed, setTrialUsed] = useState(false);
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [user, setUser] = useState<any>(null);
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

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("plan_type, trial_started_at, trial_used")
          .eq("id", authUser.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          setCurrentPlan("CHRONOS FREE");
          return;
        }

        if (!profile) {
          setCurrentPlan("CHRONOS FREE");
          return;
        }

        setTrialUsed(profile.trial_used || false);

        // Logică consolidată: Dacă planul în DB este TEAM și există un trial început
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
            // Dacă trial-ul a expirat, facem update în DB să nu mai figureze ca TEAM dacă nu a plătit
            setIsTrialActive(false);
            if (profile.plan_type === "CHRONOS TEAM") {
                await supabase.from("profiles").update({ plan_type: "CHRONOS FREE" }).eq("id", authUser.id);
                setCurrentPlan("CHRONOS FREE");
            } else {
                setCurrentPlan(profile.plan_type?.toUpperCase() || "CHRONOS FREE");
            }
          }
        } else {
          setCurrentPlan(profile.plan_type?.toUpperCase() || "CHRONOS FREE");
        }
      } catch (err) {
        console.error("Error in fetchData:", err);
      }
    };

    fetchData();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [supabase]);

  const startTimer = (endTime: Date) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const updateTimer = () => {
      const acum = new Date();
      const diffMs = endTime.getTime() - acum.getTime();

      if (diffMs <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsTrialActive(false);
        window.location.reload();
        return;
      }

      const zile = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const ore = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
      const minute = Math.floor((diffMs / (1000 * 60)) % 60);
      const secunde = Math.floor((diffMs / 1000) % 60);

      setTimeLeft({ zile, ore, minute, secunde });
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);
  };

  const handleActivateTrial = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          plan_type: "CHRONOS TEAM",
          trial_started_at: new Date().toISOString(),
          trial_used: true
        })
        .eq("id", user.id);

      if (error) {
        alert(`Eroare la activare: ${error.message}`);
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error("Error in handleActivateTrial:", err);
    }
  };

  const handlePlanClick = (plan: any) => {
    if (isTrialActive) {
      const confirmChange = window.confirm("⚠️ Ești în perioada de probă TEAM. Dacă schimbi planul acum, pierzi accesul gratuit. Continui?");
      if (!confirmChange) return;
    }
    if (plan.id === "CHRONOS FREE" && currentPlan === "CHRONOS FREE") return;
    if (plan.stripeLink !== "#") {
      window.location.href = plan.stripeLink;
    }
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-slate-50 py-16 px-4 md:px-8 font-sans">
      <div className="max-w-7xl mx-auto">

        {/* Header Elegance */}
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-slate-900 uppercase">
            Planuri <span className="text-amber-500">Chronos</span>
          </h1>
          <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">
            Alege structura potrivită pentru afacerea ta. Simplitate, eficiență și control absolut.
          </p>
        </div>

        {/* Banner Status - Minimalist */}
        {user && (
          <div className="mb-16 max-w-4xl mx-auto bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:shadow-md">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Statusul tău curent</p>
              <h2 className="text-2xl font-black italic uppercase text-slate-900">{currentPlan}</h2>
              <p className="text-slate-400 text-xs font-bold uppercase">{user.email}</p>
            </div>

            <div className="flex items-center gap-4">
              {isTrialActive ? (
                <div className="flex gap-2">
                  {[ 
                    { l: "Zile", v: timeLeft.zile },
                    { l: "Ore", v: timeLeft.ore },
                    { l: "Min", v: timeLeft.minute },
                    { l: "Sec", v: timeLeft.secunde }
                  ].map((t, i) => (
                    <div key={i} className="bg-slate-900 w-16 h-16 rounded-2xl flex flex-col items-center justify-center shadow-lg">
                      <span className="text-white font-black text-xl leading-none">{t.v}</span>
                      <span className="text-[8px] text-slate-400 font-bold uppercase">{t.l}</span>
                    </div>
                  ))}
                </div>
              ) : (
                !trialUsed && (
                  <button
                    onClick={handleActivateTrial}
                    className="bg-amber-500 text-black px-8 py-4 rounded-2xl font-black italic uppercase text-xs hover:bg-black hover:text-white transition-all duration-300 shadow-xl shadow-amber-500/20"
                  >
                    Activează 10 zile TEAM
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
          {plans.map((plan, index) => {
            const isSelected = currentPlan === plan.id;

            return (
              <div
                key={index}
                className={`relative flex flex-col bg-white rounded-[45px] p-10 transition-all duration-500 border-2 ${
                  isSelected
                    ? "border-amber-500 shadow-2xl scale-[1.02] z-10"
                    : "border-transparent shadow-xl shadow-slate-200/50 hover:border-slate-200 hover:translate-y-[-5px]"
                }`}
              >
                {plan.popular && !isSelected && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                    Recomandat
                  </div>
                )}

                {isSelected && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                    Plan Activ
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-xl font-black italic uppercase text-slate-900 mb-2">{plan.name}</h3>
                  <p className="text-slate-400 text-xs font-bold leading-relaxed h-8">{plan.description}</p>
                </div>

                <div className="mb-10 flex items-baseline gap-1">
                  <span className="text-5xl font-black tracking-tighter text-slate-900">{plan.priceDisplay}</span>
                  <span className="text-sm font-black text-slate-300 uppercase italic">Ron</span>
                </div>

                <div className="space-y-4 flex-1 mb-12">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-50 flex items-center justify-center">
                        <span className="text-amber-600 text-[10px] font-black">✓</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 uppercase italic tracking-tight">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handlePlanClick(plan)}
                  disabled={isSelected}
                  title={plan.name}
                  className={`w-full py-5 rounded-[22px] font-black italic uppercase text-[11px] tracking-widest transition-all duration-300 ${
                    isSelected
                      ? "bg-amber-500 text-black cursor-default border border-slate-200"
                      : "bg-slate-900 text-white hover:bg-amber-500 hover:text-black shadow-xl shadow-slate-900/10 active:scale-95"
                  }`}
                >
                  {isSelected ? "Deja Activat" : plan.buttonText}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-20 text-center">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
            Toate abonamentele includ actualizări automate și suport tehnic.
          </p>
        </div>
      </div>
    </main>
  );
}