"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // Switch între Login și Înregistrare
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (isSignUp) {
      // --- CREEAZĂ CONT NOU ---
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        alert("⚠️ Eroare: " + error.message);
      } else {
        alert("✅ Cont creat cu succes! Acum te poți loga.");
        setIsSignUp(false);
      }
    } else {
      // --- LOGARE EXISTENTĂ ---
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert("⚠️ Date incorecte: " + error.message);
      } else {
        router.push("/programari");
      }
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-10 md:p-16 rounded-[60px] shadow-2xl w-full max-w-md border border-slate-100 transition-all">
        
        {/* LOGO & TITLU */}
        <div className="text-center mb-12">
          <div className="inline-block p-4 bg-amber-50 rounded-[25px] mb-4">
             <span className="text-4xl">⏳</span>
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
            CHRONOS<span className="text-amber-600">.</span>
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3 italic">
            {isSignUp ? "Creează cont afacere" : "Acces Securizat Gestiune"}
          </p>
        </div>

        {/* FORMULAR */}
        <form onSubmit={handleAuth} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase ml-5 text-slate-400 italic">Email</label>
            <input 
              type="email" 
              placeholder="email@exemplu.com" 
              className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 outline-none font-bold text-slate-700 shadow-inner transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase ml-5 text-slate-400 italic">Parolă</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 outline-none font-bold text-slate-700 shadow-inner transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="mt-6 bg-slate-900 text-white py-6 rounded-[30px] font-black uppercase text-[11px] tracking-widest hover:bg-amber-600 transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            {loading ? "Se procesează..." : isSignUp ? "Creează Cont →" : "Intră în Sistem →"}
          </button>
        </form>

        {/* SWITCH ÎNTRE MODURI */}
        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-[10px] font-black uppercase text-slate-400 hover:text-amber-600 transition-colors tracking-widest"
          >
            {isSignUp ? "Ai deja cont? Loghează-te" : "Nu ai cont? Înregistrează-ți afacerea"}
          </button>
        </div>

        <p className="text-center mt-8 text-[9px] font-bold text-slate-300 uppercase tracking-widest">
          Chronos Productivity © 2026
        </p>
      </div>
    </main>
  );
}