"use client";

import { useState } from "react";
// IMPORTĂ INSTANȚA TA CENTRALIZATĂ (ajustează calea dacă e diferită)
import { supabase } from "@/lib/supabase"; 
import Link from "next/link";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/profil/reset-password`,
      });

      if (resetError) {
        setError("❌ " + resetError.message);
      } else {
        setMessage("✅ Verifică email-ul pentru link-ul de resetare.");
      }
    } catch (err) {
      setError("❌ Eroare de conexiune. Încearcă din nou.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#fcfcfc] font-sans text-slate-900">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Header - Identic cu Login */}
        <div className="bg-slate-900 px-4 py-12 text-center relative flex flex-col items-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16 blur-3xl z-0"></div>
          <Image 
            src="/logo-chronos.png" 
            alt="Chronos Logo" 
            width={180} 
            height={180} 
            priority 
            sizes="180px"
            className="object-contain relative z-10 mb-4" 
          />
          <h2 className="text-2xl font-black uppercase text-white italic tracking-tighter relative z-10">RECUPERARE CONT</h2>
          <div className="flex items-center gap-2 mt-3 relative z-10 justify-center">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
            <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.3em] italic">Resetare Parolă</p>
          </div>
        </div>

        {/* Formular */}
        <form onSubmit={handleResetPassword} className="p-10 space-y-6">
          <p className="text-[11px] text-slate-500 font-bold uppercase italic text-center px-4 leading-relaxed">
            Introdu adresa de email și îți vom trimite un link securizat pentru resetare.
          </p>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Email</label>
            <input 
              title="Introdu email-ul asociat contului tău"
              type="email" 
              required 
              className="w-full px-7 py-5 bg-slate-50 border-2 border-transparent focus:border-amber-500 focus:bg-white focus:outline-none font-bold text-sm shadow-inner rounded-2xl transition-all" 
              placeholder="nume@email.ro" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase italic text-center border-l-4 border-red-500">
              {error}
            </div>
          )}

          {message && (
            <div className="p-4 bg-green-50 text-green-600 rounded-2xl text-[10px] font-black uppercase italic text-center border-l-4 border-green-500">
              {message}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-6 bg-slate-900 text-amber-500 rounded-[25px] font-black text-center text-sm tracking-[0.25em] hover:bg-amber-500 hover:text-white transition-all border-b-4 border-slate-800 hover:border-amber-600 uppercase italic shadow-xl disabled:opacity-50 transform active:scale-95"
          >
            {loading ? "Se trimite..." : "Trimite Link"}
          </button>

          <div className="text-center pt-8 border-t border-slate-50">
            <Link 
              href="/login" 
              className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-amber-600 transition-colors group"
            >
              Te-ai răzgândit? <span className="text-slate-900 group-hover:text-amber-600 underline underline-offset-4 decoration-amber-500 transition-all">Înapoi la LogIn</span>
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}