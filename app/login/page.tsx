"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from '@supabase/supabase-js';
import Link from "next/link";
import Image from "next/image"; // Am adăugat importul pentru Image

const SUPABASE_URL = "https://zzrubdbngjfwurdwxtwf.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6cnViZGJuZ2pmd3VyZHd4dHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDkyMTgsImV4cCI6MjA4ODQ4NTIxOH0.6uw6yzCs5OfCP7xqWshzPQP36bCPxi2LU0QtpwsvnOo";

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.push("/profil");
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("❌ Date de logare incorecte. Verifică email-ul și parola.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50 font-sans">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* HEADER CU LOGO MĂRIT ȘI CURAT */}
        <div className="bg-slate-900 px-4 py-12 text-center relative overflow-hidden flex flex-col items-center">
          {/* Fundal decorativ subtil */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16 blur-3xl z-0"></div>
          
          {/* LOGO CHRONOS OFICIAL (În locul pătratului galben) */}
          <div className="relative z-10 mb-4 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-transform hover:scale-105 duration-300">
            <Image 
              src="/logo-chronos.png"
              alt="Chronos Logo"
              width={220} // Mărit la 220px pentru impact
              height={220}
              priority
              className="object-contain"
            />
          </div>

          <h2 className="text-3xl font-black uppercase text-white italic tracking-tighter relative z-10 leading-tight">
            Bun venit la <span className="text-amber-500 font-black">CHRONOS</span>
          </h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3 tracking-widest relative z-10 opacity-80">
            Autentificare Partener
          </p>
        </div>

        <form onSubmit={handleLogin} className="p-10 space-y-6 relative z-10">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Email</label>
            <input 
              type="email" 
              required 
              className="w-full px-7 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-500 focus:outline-none font-bold text-slate-800 text-sm transition-all shadow-inner"
              placeholder="nume@afacere.ro"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Parola</label>
            <input 
              type="password" 
              required 
              className="w-full px-7 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-500 focus:outline-none font-bold text-slate-800 text-sm transition-all shadow-inner"
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
            className="w-full py-6 mt-4 bg-slate-900 text-white rounded-[25px] font-black text-center text-sm tracking-[0.25em] hover:bg-amber-600 transition-all border-b-4 border-slate-700 uppercase italic shadow-xl disabled:opacity-50 active:scale-95"
          >
            {loading ? "Se verifică..." : "Intră în Dashboard"}
          </button>

          <div className="text-center pt-5">
            <Link href="/register" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">
              Nu ai cont încă? <span className="text-slate-900 underline underline-offset-2">Creează unul aici</span>
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}