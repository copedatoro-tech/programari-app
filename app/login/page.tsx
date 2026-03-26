"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from '@supabase/ssr' // Importăm clientul de browser corect
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Inițializăm clientul de browser aici pentru a gestiona corect cookie-urile
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (authError) {
        setError("❌ " + authError.message);
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Refresh este crucial pentru a trimite cookie-urile noi către server/middleware
        router.refresh();
        
        // Folosim router.push pentru o tranziție mai lină în interiorul Next.js
        // sau window.location.assign dacă vrei un refresh complet al stării
        setTimeout(() => {
          window.location.assign("/profil");
        }, 100);
      }
    } catch (err) {
      setError("❌ Eroare de conexiune. Încearcă din nou.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#fcfcfc] font-sans text-slate-900">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Header Secțiune LogIn */}
        <div className="bg-slate-900 px-4 py-12 text-center relative flex flex-col items-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16 blur-3xl z-0"></div>
          <Image 
            src="/logo-chronos.png" 
            alt="Chronos Logo" 
            width={200} 
            height={200} 
            priority 
            sizes="200px"
            style={{ width: '200px', height: 'auto' }} 
            className="object-contain relative z-10 mb-4" 
          />
          <h2 className="text-3xl font-black uppercase text-white italic tracking-tighter relative z-10">AUTENTIFICARE</h2>
          <div className="flex items-center gap-2 mt-3 relative z-10 justify-center">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
            <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.3em] italic">Acces Securizat</p>
          </div>
        </div>

        {/* Formular */}
        <form onSubmit={handleLogin} className="p-10 space-y-6">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Email</label>
            <input 
              title="Introdu adresa de email folosită la înregistrare pentru a accesa contul Chronos"
              type="email" 
              required 
              className="w-full px-7 py-5 bg-slate-50 border-2 border-transparent focus:border-amber-500 focus:bg-white focus:outline-none font-bold text-sm shadow-inner rounded-2xl transition-all hover:bg-slate-100" 
              placeholder="nume@email.ro" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Parola</label>
            <div className="relative flex items-center w-full">
              <input 
                title="Introdu parola asociată contului tău Chronos"
                type={showPassword ? "text" : "password"} 
                required 
                className="w-full px-7 py-5 bg-slate-50 border-2 border-transparent focus:border-amber-500 focus:bg-white focus:outline-none font-bold text-sm shadow-inner rounded-2xl transition-all pr-16 hover:bg-slate-100" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.preventDefault();
                  setShowPassword(!showPassword);
                }}
                title={showPassword ? "Ascunde parola" : "Afișează parola"}
                className="absolute right-3 flex items-center justify-center w-10 h-10 text-slate-400 hover:text-amber-600 transition-colors z-20 cursor-pointer"
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase italic text-center border-l-4 border-red-500">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button 
              title="Autentificare: Apasă pentru a intra în panoul de management profesional Chronos"
              type="submit" 
              disabled={loading} 
              className="w-full py-6 bg-slate-900 text-amber-500 rounded-[25px] font-black text-center text-sm tracking-[0.25em] hover:bg-amber-500 hover:text-white transition-all border-b-4 border-slate-800 hover:border-amber-600 uppercase italic shadow-xl disabled:opacity-50 transform active:scale-95"
            >
              {loading ? "Sincronizare..." : "Intră în Cont"}
            </button>

            <div className="text-center">
              <Link 
                href="/forgot-password" 
                title="Procedură de recuperare"
                className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-amber-600 transition-colors italic"
              >
                Ai uitat parola?
              </Link>
            </div>
          </div>

          <div className="text-center pt-8 border-t border-slate-50">
            <Link 
              href="/register" 
              title="Cont nou"
              className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-amber-600 transition-colors group"
            >
              Nu ai cont? <span className="text-slate-900 group-hover:text-amber-600 underline underline-offset-4 decoration-amber-500 transition-all">Creează unul aici</span>
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}