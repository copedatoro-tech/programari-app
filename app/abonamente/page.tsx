"use client";

import React, { useState, useEffect } from "react";

const plans = [
  {
    id: "START (GRATUIT)",
    name: "CHRONOS FREE",
    priceDisplay: "0",
    features: [
      "📌 30 programări / lună", 
      "📇 50 contacte", 
      "👤 1 Profesionist (Solo)", 
      "📱 Acces aplicație mobilă"
    ],
    buttonText: "ALEGE FREE",
    stripeLink: "#"
  },
  {
    id: "CHRONOS PRO",
    name: "CHRONOS PRO",
    priceDisplay: "49",
    features: [
      "🚀 150 programări / lună", 
      "👥 500 contacte", 
      "⏰ Reminder e-mail automat", 
      "👤 1 Profesionist (Solo)",
      "📊 Rapoarte activitate"
    ],
    buttonText: "ALEGE PRO",
    stripeLink: "https://buy.stripe.com/8x2eV76Qg5EugHF8lG0RG04"
  },
  {
    id: "CHRONOS ELITE",
    name: "CHRONOS ELITE",
    priceDisplay: "99",
    features: [
      "✨ 500 programări / lună", 
      "💰 Plăți online & Avans", 
      "📈 Statistici avansate", 
      "👥 Până la 5 Profesioniști",
      "🛠️ Configurare profil"
    ],
    buttonText: "ALEGE ELITE",
    stripeLink: "https://buy.stripe.com/28EaER6Qgff4bnl59u0RG02"
  },
  {
    id: "CHRONOS TEAM",
    name: "CHRONOS TEAM",
    priceDisplay: "199",
    features: [
      "💎 NELIMITAT Programări", 
      "👥 Max. 50 Profesioniști", 
      "🔐 Roluri & Permisiuni", 
      "📊 Analiză performanță echipă",
      "⚙️ Panou administrare staff"
    ],
    buttonText: "ALEGE TEAM",
    stripeLink: "https://buy.stripe.com/8x2eV76QgaYO9fdeK40RG06"
  }
];

export default function AbonamentePage() {
  const [currentPlan, setCurrentPlan] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrentPlan(localStorage.getItem("user_plan") || "START (GRATUIT)");
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-slate-50 py-16 px-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-black text-slate-900 italic uppercase leading-none mb-4">
            Abonamente <span className="text-amber-600">Chronos.</span>
          </h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">
            Plan curent: <span className="text-slate-900 border-b-2 border-amber-500">{currentPlan}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan, index) => {
            const isSelected = currentPlan === plan.id;
            
            return (
              <div 
                key={index}
                className={`bg-white rounded-[40px] p-8 shadow-xl border-2 flex flex-col transition-all duration-300 ${
                  isSelected ? "border-amber-500 scale-105 z-10" : "border-slate-100 hover:border-amber-200"
                }`}
              >
                <div className="mb-6 border-b pb-6">
                  <h3 className="text-xl font-black text-slate-900 mb-2 uppercase italic">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-3">
                    <span className="text-4xl font-black">{plan.priceDisplay}</span>
                    <span className="text-slate-400 font-bold text-[10px] uppercase">RON / lună</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-10 flex-grow">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-[11px] font-bold text-slate-600 uppercase leading-tight">
                      <span className="text-amber-500 text-sm">✔</span> <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {isSelected ? (
                  <button 
                    disabled
                    className="w-full py-5 rounded-2xl font-black text-xs uppercase bg-amber-500 text-slate-900 border-b-4 border-amber-600 cursor-default opacity-90 shadow-inner"
                  >
                    PLAN ACTIV
                  </button>
                ) : plan.id === "START (GRATUIT)" ? (
                  <button 
                    onClick={() => {
                        localStorage.setItem("user_plan", plan.id);
                        window.location.reload();
                    }}
                    className="w-full py-5 rounded-2xl font-black text-xs uppercase border-b-4 bg-slate-900 text-white border-slate-700 hover:bg-slate-800 transition-all active:translate-y-1"
                  >
                    {plan.buttonText}
                  </button>
                ) : (
                  <a 
                    href={plan.stripeLink}
                    rel="external" 
                    className="w-full py-5 rounded-2xl font-black text-xs uppercase shadow-lg border-b-4 bg-slate-900 text-white hover:bg-amber-600 hover:border-amber-700 text-center block no-underline transition-all active:translate-y-1"
                  >
                    {plan.buttonText}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}