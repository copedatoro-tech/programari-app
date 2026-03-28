"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";

const plans = [
  {
    id: "CHRONOS FREE",
    name: "CHRONOS FREE",
    priceDisplay: "0",
    features: ["📌 30 programări / lună", "📇 50 contacte", "👤 Solo", "📱 Aplicație mobilă"],
    buttonText: "ALEGE FREE",
    stripeLink: "#"
  },
  {
    id: "CHRONOS PRO",
    name: "CHRONOS PRO",
    priceDisplay: "49",
    features: ["🚀 150 programări", "👥 500 contacte", "⏰ Remindere e-mail", "📊 Rapoarte"],
    buttonText: "ALEGE PRO",
    stripeLink: "https://buy.stripe.com/8x2eV76Qg5EugHF8lG0RG04"
  },
  {
    id: "CHRONOS ELITE",
    name: "CHRONOS ELITE",
    priceDisplay: "99",
    features: ["✨ 500 programări", "💰 Plăți & Avans", "📈 Statistici", "👥 5 Profesioniști"],
    buttonText: "ALEGE ELITE",
    stripeLink: "https://buy.stripe.com/28EaER6Qgff4bnl59u0RG02"
  },
  {
    id: "CHRONOS TEAM",
    name: "CHRONOS TEAM",
    priceDisplay: "199",
    features: ["💎 NELIMITAT", "👥 50 Profesioniști", "🔐 Roluri staff", "📊 Analiză echipă"],
    buttonText: "ALEGE TEAM",
    stripeLink: "https://buy.stripe.com/8x2eV76QgaYO9fdeK40RG06"
  }
];

export default function AbonamentePage() {
  const [currentPlan, setCurrentPlan] = useState<string>("CHRONOS FREE");
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ zile: 0, ore: 0, minute: 0 });
  const [trialUsed, setTrialUsed] = useState(false);
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [user, setUser] = useState<any>(null);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    setMounted(true);

    const fetchData = async () => {
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

      if (!profile) {
        setCurrentPlan("CHRONOS FREE");
        return;
      }

      setTrialUsed(profile.trial_used || false);

      if (profile.trial_started_at) {
        const start = new Date(profile.trial_started_at);
        const end = new Date(start.getTime() + 10 * 24 * 60 * 60 * 1000);
        const acum = new Date();
        const diffMs = end.getTime() - acum.getTime();

        if (diffMs > 0) {
          setIsTrialActive(true);
          setCurrentPlan("CHRONOS TEAM");
          setTimeLeft({
            zile: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
            ore: Math.floor((diffMs / (1000 * 60 * 60)) % 24),
            minute: Math.floor((diffMs / (1000 * 60)) % 60)
          });
          return;
        }
      }

      setCurrentPlan(profile.plan_type?.toUpperCase() || "CHRONOS FREE");
    };

    fetchData();
  }, [supabase]);

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

    if (error) {
      console.error("Eroare Supabase:", error);
      alert(`Eroare la activare: ${error.message}`);
    } else {
      window.location.reload();
    }
  };

  const handlePlanClick = (plan: any) => {
    if (isTrialActive) {
      const confirmChange = window.confirm("⚠️ Ești în perioada de probă CHRONOS TEAM. Dacă schimbi planul acum, pierzi accesul gratuit. Continui?");
      if (!confirmChange) return;
    }

    if (plan.id === "CHRONOS FREE" && currentPlan === "CHRONOS FREE") {
        return;
    }

    if (plan.stripeLink !== "#") {
        window.location.href = plan.stripeLink;
    }
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#fcfcfc] py-10 px-6 font-sans text-slate-900">
      <div className="w-full max-w-6xl mx-auto">

        {/* BANNER STATUS */}
        <div className="mb-12 rounded-[30px] shadow-2xl overflow-hidden bg-black border border-white/10">
          <div className="px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-8">
            
            <div className="text-center md:text-left">
              <p className="text-amber-500 text-[10px] font-black uppercase italic tracking-[0.2em] mb-1">
                {isTrialActive ? "SESIUNE TRIAL ACTIVĂ" : "STATUS ABONAMENT"}
              </p>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                {currentPlan}
              </h2>
              <p className="text-slate-500 text-[11px] font-bold mt-1 uppercase">
                {user ? user.email : "Vizitator"}
              </p>
            </div>

            <div className="flex flex-col items-center md:items-end">
              {isTrialActive ? (
                <div className="flex gap-2">
                  {[ 
                    { l: "ZILE", v: timeLeft.zile }, 
                    { l: "ORE", v: timeLeft.ore }, 
                    { l: "MIN", v: timeLeft.minute } 
                  ].map((t, i) => (
                    <div key={i} className="bg-amber-500 px-4 py-2 rounded-xl text-center min-w-[70px] shadow-lg">
                      <div className="text-2xl font-black text-black leading-none">{t.v}</div>
                      <div className="text-[8px] font-black text-black/70 uppercase">{t.l}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {!user ? (
                    <button 
                      onClick={() => window.location.href = "/login"} 
                      className="bg-white text-black px-8 py-3 rounded-xl font-black italic uppercase text-[12px] hover:bg-amber-500 transition-all"
                    >
                      Login pentru Trial
                    </button>
                  ) : !trialUsed && (
                    <button 
                      onClick={handleActivateTrial} 
                      className="bg-amber-500 text-black px-8 py-4 rounded-xl font-black italic uppercase text-[12px] hover:scale-105 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] border-b-4 border-amber-700 active:border-b-0"
                    >
                      Activează 10 zile TEAM
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* GRID PLANURI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => {
            const isSelected = currentPlan === plan.id;

            return (
              <div 
                key={index} 
                className={`bg-white rounded-[35px] p-8 shadow-xl border-2 flex flex-col transition-all duration-300 relative ${
                  isSelected ? "border-amber-500 scale-105 z-10 ring-8 ring-amber-500/5" : "border-slate-50 hover:border-slate-200"
                }`}
              >
                
                {isSelected && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[9px] font-black px-4 py-1 rounded-full uppercase italic shadow-md">
                    OPȚIUNE ACTIVĂ
                  </div>
                )}

                <h3 className={`text-lg font-black italic uppercase mb-1 ${isSelected ? 'text-amber-600' : 'text-slate-900'}`}>
                  {plan.name}
                </h3>
                
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-4xl font-black tracking-tighter">{plan.priceDisplay}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase italic">RON/LUNĂ</span>
                </div>

                <ul className="mb-8 space-y-3 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-[11px] font-bold text-slate-600 uppercase italic leading-tight">
                      <span className="text-amber-500 text-lg">✓</span> {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePlanClick(plan)}
                  disabled={isSelected}
                  className={`py-4 rounded-2xl font-black italic uppercase text-[10px] tracking-widest transition-all ${
                    isSelected 
                      ? "bg-amber-500 text-black cursor-default border-b-4 border-amber-600 shadow-lg" 
                      : "bg-slate-900 text-white hover:bg-amber-500 hover:text-black shadow-lg border-b-4 border-slate-800 active:border-b-0"
                  }`}
                >
                  {isSelected ? "ACTIVĂ" : plan.buttonText}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}