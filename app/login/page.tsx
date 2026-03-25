"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from '@supabase/supabase-js';
import Link from "next/link";
import Image from "next/image";

// ACUM LUĂM CHEILE DIN FIȘIERUL .ENV.LOCAL (SECURE)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) router.push("/profil");
    };
    checkUser();
  }, [router]);

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
        router.push("/profil");
        router.refresh();
      }
    } catch (err) {
      setError("❌ Eroare de conexiune. Încearcă din nou.");
      setLoading(false);
    }
  };

  // FUNCȚIA PENTRU LOGARE CU GOOGLE
  const handleGoogleLogin = async () => {
    setError("");
    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (googleError) throw googleError;
    } catch (err: any) {
      setError("❌ Eroare Google: " + (err.message || "Încearcă din nou"));
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50 font-sans text-slate-900">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl border border-slate-200 overflow-hidden">
        
        <div className="bg-slate-900 px-4 py-12 text-center relative flex flex-col items-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16 blur-3xl z-0"></div>
          <Image src="/logo-chronos.png" alt="Chronos Logo" width={200} height={200} priority className="object-contain relative z-10 mb-4" />
          <h2 className="text-3xl font-black uppercase text-white italic tracking-tighter relative z-10">AUTENTIFICARE</h2>
          <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3 relative z-10">Bun venit la CHRONOS</p>
        </div>

        <form onSubmit={handleLogin} className="p-10 space-y-6">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Email</label>
            <input 
              type="email" 
              required 
              className="w-full px-7 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-500 focus:outline-none font-bold text-sm shadow-inner" 
              placeholder="nume@email.ro" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Parola</label>
            <input 
              type="password" 
              required 
              className="w-full px-7 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-500 focus:outline-none font-bold text-sm shadow-inner" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-[11px] font-black uppercase italic text-center animate-pulse">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-6 mt-4 bg-slate-900 text-white rounded-[25px] font-black text-center text-sm tracking-[0.25em] hover:bg-amber-600 transition-all border-b-4 border-slate-700 uppercase italic shadow-xl disabled:opacity-50"
          >
            {loading ? "Se verifică..." : "Intră în Cont"}
          </button>

          {/* SEPARATOR ȘI BUTON GOOGLE */}
          <div className="relative py-4 flex items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-[10px] font-black text-slate-300 uppercase italic">sau</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-5 bg-white text-slate-900 rounded-[25px] font-black text-center text-[11px] tracking-[0.15em] hover:bg-slate-50 transition-all border-2 border-slate-100 uppercase italic shadow-md flex items-center justify-center gap-3"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuă cu Google
          </button>

          <div className="text-center pt-5">
            <Link href="/register" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">
              Nu ai cont? <span className="text-slate-900 underline underline-offset-2">Creează unul aici</span>
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}