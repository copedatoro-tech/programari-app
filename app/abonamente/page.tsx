"use client";

import React, { useState, useEffect } from "react";

const plans = [
  {
    id: "START (GRATUIT)",
    name: "CHRONOS FREE",
    price: 0,
    priceDisplay: "0",
    description: "Ideal pentru început.",
    features: [
      "📌 30 programări / lună",
      "📇 50 contacte în Agendă",
      "👤 Utilizator unic (Solo)",
      "📧 Notificări de bază"
    ],
    buttonText: "ALEGE FREE",
    highlight: false
  },
  {
    id: "CHRONOS PRO",
    name: "CHRONOS PRO",
    price: 49,
    priceDisplay: "49",
    description: "Pentru profesioniști la început.",
    features: [
      "🚀 150 programări / lună",
      "👥 500 contacte în Agendă",
      "⏰ Mementouri automate Email",
      "👤 Utilizator unic (Solo)"
    ],
    buttonText: "ALEGE PRO",
    highlight: false,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO
  },
  {
    id: "CHRONOS ELITE",
    name: "CHRONOS ELITE",
    price: 99,
    priceDisplay: "99",
    description: "Expertiză și volum mare.",
    features: [
      "✨ 500 programări / lună",
      "💰 Integrare Plăți (Avans)",
      "📈 Statistici Profit & Evoluție",
      "👤 Utilizator unic (Solo)"
    ],
    buttonText: "ALEGE ELITE",
    highlight: true,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE
  },
  {
    id: "CHRONOS TEAM",
    name: "CHRONOS TEAM",
    price: 199,
    priceDisplay: "199",
    description: "Puterea echipei tale.",
    features: [
      "💎 Programări NELIMITATE",
      "👥 UTILIZATORI NELIMITAȚI",
      "🔐 Gestiune Roluri Staff",
      "📅 Calendare Individuale Staff",
      "📊 Analiză Profit / Angajat"
    ],
    buttonText: "ALEGE TEAM",
    highlight: false,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAM
  }
];

export default function AbonamentePage() {
  const [currentPlan, setCurrentPlan] = useState("");
  const [mounted, setMounted] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [trialUsed, setTrialUsed] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    setMounted(true);
    
    const hasActivatedTrial = localStorage.getItem("trial_activated") === "true";
    const trialExpiryRaw = localStorage.getItem("trial_expiry");
    setTrialUsed(hasActivatedTrial);

    const savedPlan = localStorage.getItem("user_plan") || "START (GRATUIT)";
    setCurrentPlan(savedPlan);

    const calculateTimeLeft = () => {
      if (!trialExpiryRaw) return;
      
      // Folosim timestamp-ul brut (număr) pentru a evita erorile de fus orar
      const expiryTimestamp = parseInt(trialExpiryRaw);
      const now = Date.now();
      const difference = expiryTimestamp - now;
      
      if (difference > 0) {
        const totalSeconds = Math.floor(difference / 1000);
        setTimeLeft({
          days: Math.floor(totalSeconds / (24 * 3600)),
          hours: Math.floor((totalSeconds % (24 * 3600)) / 3600),
          minutes: Math.floor((totalSeconds % 3600) / 60),
          seconds: totalSeconds % 60
        });
      } else if (hasActivatedTrial && localStorage.getItem("user_plan") === "CHRONOS TEAM") {
          // Trecere automată la FREE după expirare
          localStorage.setItem("user_plan", "START (GRATUIT)");
          setCurrentPlan("START (GRATUIT)");
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleActivateTrial = () => {
    const teamPlanId = "CHRONOS TEAM";
    
    // Matematică pură: 10 zile * 24h * 60m * 60s * 1000ms
    // Adăugăm un buffer de 1.5 secunde pentru a asigura afișarea de "10Z" la pornire
    const now = Date.now();
    const tenDaysInMs = (10 * 24 * 60 * 60 * 1000) + 1500;
    const expiryTimestamp = now + tenDaysInMs;
    
    localStorage.setItem("user_plan", teamPlanId);
    localStorage.setItem("trial_activated", "true");
    localStorage.setItem("trial_expiry", expiryTimestamp.toString());
    
    setCurrentPlan(teamPlanId);
    setTrialUsed(true);
    alert("🚀 Felicitări! Ai activat cele 10 zile de acces TEAM.");
    window.location.reload();
  };

  const handleSelectPlan = async (plan: any) => {
    if (plan.id === "START (GRATUIT)") {
      localStorage.setItem("user_plan", plan.id);
      setCurrentPlan(plan.id);
      return;
    }
    setLoadingPlan(plan.id);
    // Logica Stripe va veni aici
    setLoadingPlan(null);
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-slate-50 py-16 px-6 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* --- BANNER ACTIVARE TRIAL --- */}
        {!trialUsed && (
          <div className="mb-12 bg-gradient-to-r from-slate-900 to-slate-800 border-2 border-amber-500 rounded-[30px] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-amber-500/20 transition-all"></div>
            
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center text-4xl shadow-lg shadow-amber-500/20">🎁</div>
              <div>
                <h4 className="font-black text-white uppercase italic text-2xl leading-none mb-2 tracking-tight">
                  Încearcă <span className="text-amber-500">GRATUIT</span> totul!
                </h4>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                  Primești 10 zile de CHRONOS TEAM (Echipă, Plăți online, Statistici)
                </p>
              </div>
            </div>
            
            <button 
              onClick={handleActivateTrial} 
              className="relative z-10 bg-amber-500 text-slate-900 px-10 py-5 rounded-2xl font-black text-xs uppercase italic hover:bg-white hover:scale-105 transition-all shadow-xl active:scale-95 border-b-4 border-amber-700 active:border-b-0"
            >
              Activează Cadoul Acum
            </button>
          </div>
        )}

        {/* --- TITLU ȘI TIMER --- */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-4 italic uppercase leading-none">
            Abonamente <span className="text-amber-600">Chronos.</span>
          </h1>
          
          {trialUsed && currentPlan === "CHRONOS TEAM" && (
            <div className="inline-flex items-center gap-4 bg-amber-100 border-2 border-amber-200 px-8 py-3 rounded-full mb-6 shadow-sm">
              <span className="flex h-3 w-3 rounded-full bg-amber-500 animate-ping"></span>
              <span className="text-xs font-black text-amber-700 uppercase tracking-widest">Accesul Premium expiră în:</span>
              <div className="flex gap-2 text-amber-900 font-black italic text-lg">
                <span>{timeLeft.days}Z</span>
                <span>{timeLeft.hours}H</span>
                <span>{timeLeft.minutes}M</span>
                <span className="w-10 text-amber-600">{timeLeft.seconds}S</span>
              </div>
            </div>
          )}

          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-4">
            Plan curent: <span className="text-slate-900 border-b-2 border-amber-500 pb-1">{currentPlan}</span>
          </p>
        </div>

        {/* --- GRID ABONAMENTE --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
          {plans.map((plan, index) => {
            const isSelected = currentPlan === plan.id;
            return (
              <div 
                key={index}
                className={`bg-white rounded-[40px] p-8 shadow-xl border-2 flex flex-col transition-all duration-500 ${
                  isSelected 
                    ? "border-amber-500 scale-105 z-10 ring-8 ring-amber-500/5 shadow-amber-200/40" 
                    : "border-slate-100 hover:border-slate-200 opacity-95"
                }`}
              >
                <div className="mb-6 border-b border-slate-50 pb-6">
                  <h3 className="text-xl font-black text-slate-900 mb-2 uppercase italic leading-none">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-3">
                    <span className="text-4xl font-black">{plan.priceDisplay}</span>
                    <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">RON / lună</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-10 flex-grow">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-[11px] font-bold text-slate-600 uppercase tracking-tight leading-snug">
                      <span className="text-amber-500 bg-amber-50 rounded-full p-0.5 text-[8px]">✔</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isSelected || loadingPlan === plan.id}
                  className={`w-full py-5 rounded-2xl font-black text-xs tracking-widest uppercase shadow-lg border-b-4 transition-all ${
                    isSelected 
                    ? "bg-amber-500 text-slate-900 border-amber-600 cursor-default" 
                    : "bg-slate-900 text-white hover:bg-slate-800 border-slate-700 active:translate-y-1 active:border-b-0"
                  }`}
                >
                  {loadingPlan === plan.id ? "PROCESARE..." : isSelected ? "PLAN ACTIV" : plan.buttonText}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}