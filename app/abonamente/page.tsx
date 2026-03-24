"use client";

import React, { useState, useEffect } from "react";

const plans = [
  {
    id: "START (GRATUIT)",
    name: "CHRONOS FREE",
    price: 0,
    priceDisplay: "0",
    description: "Ideal pentru început sau testare.",
    features: ["10 programări / lună", "5 contacte în Agendă", "Utilizator unic (Solo)"],
    buttonText: "ALEGE FREE",
    highlight: false
  },
  {
    id: "CHRONOS PRO",
    name: "CHRONOS PRO",
    price: 49,
    priceDisplay: "49",
    description: "Pentru profesioniști cu flux constant.",
    features: ["Programări nelimitate", "Contacte nelimitate", "Istoric complet", "Suport tehnic inclus", "Utilizator unic (Solo)"],
    buttonText: "ALEGE PRO",
    highlight: false,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO
  },
  {
    id: "CHRONOS ELITE",
    name: "CHRONOS ELITE",
    price: 99,
    priceDisplay: "99",
    description: "Soluția avansată pentru performanță.",
    features: ["Tot ce include PRO", "Statistici avansate", "Prioritate funcții noi", "Export date complet", "Branding personalizat", "Utilizator unic (Solo)"],
    buttonText: "ALEGE ELITE",
    highlight: false,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE
  },
  {
    id: "CHRONOS TEAM",
    name: "CHRONOS TEAM",
    price: 199,
    priceDisplay: "199",
    description: "Puterea colaborării pentru echipe.",
    features: ["Tot ce include ELITE", "👥 MODUL ECHIPĂ (Multi-User)", "🔐 Gestiune roluri angajați", "📅 Calendare individuale staff", "📊 Analize profit / angajat", "🎧 Suport Prioritar VIP"],
    buttonText: "ALEGE TEAM",
    highlight: true,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAM
  }
];

export default function AbonamentePage() {
  const [currentPlan, setCurrentPlan] = useState("");
  const [mounted, setMounted] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [trialUsed, setTrialUsed] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 6, hours: 23, minutes: 59, seconds: 59 });

  useEffect(() => {
    setMounted(true);
    
    const hasActivatedTrial = localStorage.getItem("trial_activated") === "true";
    setTrialUsed(hasActivatedTrial);

    if (!hasActivatedTrial) {
      localStorage.setItem("user_plan", "START (GRATUIT)");
      setCurrentPlan("START (GRATUIT)");
    } else {
      const savedPlan = localStorage.getItem("user_plan");
      setCurrentPlan(savedPlan || "START (GRATUIT)");
    }

    // Logică pentru Timer (doar dacă trial-ul e activ)
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleActivateTrial = () => {
    const teamPlanId = "CHRONOS TEAM";
    localStorage.setItem("user_plan", teamPlanId);
    localStorage.setItem("trial_activated", "true");
    setCurrentPlan(teamPlanId);
    setTrialUsed(true);
    alert("Oferta de 7 zile a fost activată! Acum ești pe planul TEAM.");
  };

  const handleSelectPlan = async (plan: any) => {
    if (plan.id === "START (GRATUIT)") {
      localStorage.setItem("user_plan", plan.id);
      setCurrentPlan(plan.id);
      return;
    }

    setLoadingPlan(plan.id);
    try {
      const supabaseAuthKey = "sb-zzrubdbngjfwurdwxtwf-auth-token";
      const authData = localStorage.getItem(supabaseAuthKey);
      const token = authData ? JSON.parse(authData).access_token : null;

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ planName: plan.id, priceId: plan.stripePriceId }),
      });

      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      alert("Eroare: " + err.message);
    } finally {
      setLoadingPlan(null);
    }
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-slate-50 py-16 px-6 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Banner Ofertă */}
        {!trialUsed && (
          <div className="mb-10 bg-slate-900 border-2 border-amber-500 rounded-[30px] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl animate-pulse">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-3xl">🎁</div>
              <div>
                <h4 className="font-black text-white uppercase italic text-lg leading-none mb-2">CADOU: 7 ZILE ACCES TEAM</h4>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Deblochează tot potențialul Chronos chiar acum.</p>
              </div>
            </div>
            <button 
              onClick={handleActivateTrial} 
              className="bg-amber-500 text-slate-900 px-8 py-4 rounded-xl font-black text-[10px] uppercase italic hover:bg-amber-400 transition-all shadow-lg active:scale-95"
            >
              Activează acum gratuit
            </button>
          </div>
        )}

        <div className="text-center mb-16">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-4 italic uppercase leading-none">
            Abonamente <span className="text-amber-600">Chronos.</span>
          </h1>
          
          {/* TIMER VIZUAL - Apare doar dacă trial-ul e activ */}
          {trialUsed && currentPlan === "CHRONOS TEAM" && (
            <div className="inline-flex items-center gap-3 bg-amber-100 border border-amber-200 px-6 py-2 rounded-full mb-6 animate-bounce">
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Oferta expiră în:</span>
              <div className="flex gap-2 text-amber-900 font-black italic text-sm">
                <span>{timeLeft.days}Z</span>
                <span>{timeLeft.hours}H</span>
                <span>{timeLeft.minutes}M</span>
                <span className="w-8">{timeLeft.seconds}S</span>
              </div>
            </div>
          )}

          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">
            Status: {currentPlan === "START (GRATUIT)" ? "Utilizator Solo" : `Acces Activ: ${currentPlan}`}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {plans.map((plan, index) => {
            const isSelected = currentPlan === plan.id;
            const isProcessing = loadingPlan === plan.id;
            
            return (
              <div 
                key={index}
                className={`bg-white rounded-[40px] p-8 shadow-xl border-2 flex flex-col transition-all duration-300 ${
                  isSelected 
                    ? "border-amber-500 scale-105 z-10 ring-4 ring-amber-500/5 shadow-amber-200/20" 
                    : "border-slate-100 opacity-90"
                }`}
              >
                <div className="mb-6 border-b border-slate-50 pb-6">
                  <h3 className="text-lg font-black text-slate-900 mb-2 uppercase italic leading-none">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-black">{plan.priceDisplay}</span>
                    <span className="text-slate-400 font-bold text-[9px] uppercase tracking-widest">RON / lună</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-[10px] font-black text-slate-600 uppercase tracking-tight">
                      <span className="text-amber-500">✓</span> <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isSelected || isProcessing}
                  className={`w-full py-4 rounded-2xl font-black text-[10px] tracking-widest uppercase shadow-lg border-b-4 transition-all ${
                    isSelected 
                    ? "bg-amber-500 text-slate-900 border-amber-600 cursor-default" 
                    : "bg-slate-900 text-white hover:bg-slate-800 border-slate-700 active:translate-y-1 active:border-b-0"
                  }`}
                >
                  {isProcessing ? "CONECTARE..." : isSelected ? "PLAN ACTIV" : plan.buttonText}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}