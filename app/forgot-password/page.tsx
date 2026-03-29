"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Inițializăm clientul Supabase direct aici pentru a evita erorile de import
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50 font-sans text-slate-900">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden transform hover:scale-[1.01] transition-all duration-500">
        
        {/* Header - Design Premium Chronos */}
        <div className="bg-slate-900 px-4 py-14 text-center relative flex flex-col items-center overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full -mr-20 -mt-20 blur-3xl z-0"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full -ml-16 -mb-16 blur-2xl z-0"></div>
          
          <Image 
            src="/logo-chronos.png" 
            alt="Chronos Logo" 
            width={180} 
            height={180} 
            priority 
            className="object-contain relative z-10 mb-6 drop-shadow-2xl" 
          />
          
          <h2 className="text-3xl font-black uppercase text-white italic tracking-tighter relative z-10 leading-none">
            RECUPERARE <span className="text-amber-500">CONT</span>
          </h2>
          
          <div className="flex items-center gap-2 mt-4 relative z-10 justify-center bg-white/5 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.8)]"></span>
            <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.4em] italic">Security Protocol</p>
          </div>
        </div>

        {/* Formular */}
        <form onSubmit={handleResetPassword} className="p-10 space-y-8 bg-white relative">
          <div className="text-center space-y-2">
            <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest italic">Procedură de resetare</p>
            <p className="text-[12px] text-slate-600 font-bold leading-relaxed italic border-l-4 border-amber-500 pl-4 py-2 bg-slate-50 rounded-r-xl">
              Introdu adresa de email și îți vom trimite un link securizat pentru resetarea parolei tale.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase text-slate-400 ml-4 italic tracking-[0.2em]">Adresa de Email</label>
            <div className="relative group">
               <input 
                title="Introdu adresa de email asociată contului tău Chronos"
                type="email" 
                required 
                className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 focus:border-amber-500 focus:bg-white focus:outline-none font-bold text-sm shadow-inner rounded-[22px] transition-all italic text-slate-900" 
                placeholder="nume@email.ro" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">📧</span>
            </div>
          </div>

          {error && (
            <div className="p-5 bg-red-50 text-red-600 rounded-[20px] text-[10px] font-black uppercase italic text-center border-l-4 border-red-500 shadow-sm animate-in slide-in-from-top-2 duration-300">
              {error}
            </div>
          )}

          {message && (
            <div className="p-5 bg-green-50 text-green-600 rounded-[20px] text-[10px] font-black uppercase italic text-center border-l-4 border-green-500 shadow-sm animate-in slide-in-from-top-2 duration-300">
              {message}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-6 bg-slate-900 text-amber-500 rounded-[25px] font-black text-center text-[12px] tracking-[0.3em] hover:bg-amber-600 hover:text-white transition-all border-b-8 border-slate-800 hover:border-amber-700 uppercase italic shadow-2xl disabled:opacity-50 transform active:scale-95 active:border-b-0 active:translate-y-1"
          >
            {loading ? "Se trimite..." : "Trimite Link Resetare"}
          </button>

          <div className="text-center pt-8 border-t border-slate-50">
            <Link 
              href="/login" 
              className="group text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-amber-600 transition-colors"
            >
              Te-ai răzgândit? <span className="text-slate-900 group-hover:text-amber-600 underline underline-offset-8 decoration-2 decoration-amber-500/30 group-hover:decoration-amber-500 transition-all ml-1">Înapoi la LogIn</span>
            </Link>
          </div>
        </form>

        <div className="bg-slate-50/50 py-4 text-center border-t border-slate-100">
           <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest italic">Chronos Management System • v2.0</p>
        </div>
      </div>
    </main>
  );
}