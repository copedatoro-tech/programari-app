"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const supabase = createClient(
  "https://zzrubdbngjfwurdwxtwf.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6cnViZGJuZ2pmd3VyZHd4dHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDkyMTgsImV4cCI6MjA4ODQ4NTIxOH0.6uw6yzCs5OfCP7xqWshzPQP36bCPxi2LU0QtpwsvnOo"
);

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    numeFirma: "",
    email: "",
    parola: "",
    confirmParola: ""
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.parola !== form.confirmParola) {
      setError("❌ Parolele introduse nu coincid!");
      return;
    }

    if (form.parola.length < 6) {
      setError("⚠️ Parola trebuie să aibă minim 6 caractere.");
      return;
    }

    setLoading(true);

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.parola,
      options: {
        data: {
          display_name: form.numeFirma,
        }
      }
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      alert("✅ Cont creat! Verifică email-ul pentru confirmare.");
      router.push("/login");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50 font-sans">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* HEADER - CURAT, FĂRĂ DREPTUNGHIURI ÎN JURUL LOGO-ULUI */}
        <div className="bg-slate-900 px-4 py-12 text-center relative overflow-hidden flex flex-col items-center">
          {/* Fundal decorativ subtil */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16 blur-3xl z-0"></div>
          
          {/* LOGO CHRONOS OFICIAL (Mărit substanțial, fără fundal alb/pătrat) */}
          <div className="relative z-10 mb-4 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-transform hover:scale-105 duration-300">
            <Image 
              src="/logo-chronos.png"
              alt="Chronos Logo"
              width={220} // Lățime mai mare pentru impact maxim
              height={220}
              priority
              className="object-contain" // Garantează că imaginea se vede integral fără tăieri
            />
          </div>

          <h1 className="text-3xl font-black text-white tracking-tighter italic uppercase relative z-10 leading-tight">
            Creează Cont<span className="text-amber-500">.</span>
          </h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2 tracking-widest text-center relative z-10 opacity-80">Partener Mastery</p>
        </div>

        {/* FORMULARUL RĂMÂNE ELEGANT ȘI AERISIT */}
        <form onSubmit={handleRegister} className="p-10 space-y-5 relative z-10">
          
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Nume sau Brand</label>
            <input 
              type="text" required placeholder="Ex: Barber" 
              className="w-full px-7 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-500 focus:outline-none font-bold text-slate-800 text-sm transition-all shadow-inner" 
              value={form.numeFirma}
              onChange={(e) => setForm({...form, numeFirma: e.target.value})}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Adresă Email</label>
            <input 
              type="email" required placeholder="contact@afacere.ro" 
              className="w-full px-7 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-500 focus:outline-none font-bold text-slate-800 text-sm transition-all shadow-inner" 
              value={form.email}
              onChange={(e) => setForm({...form, email: e.target.value})}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Alege o Parolă</label>
            <input 
              type="password" required placeholder="••••••••" 
              className="w-full px-7 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-500 focus:outline-none font-bold text-slate-800 text-sm transition-all shadow-inner" 
              value={form.parola}
              onChange={(e) => setForm({...form, parola: e.target.value})}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Repetă Parola</label>
            <input 
              type="password" required placeholder="••••••••" 
              className={`w-full px-7 py-5 bg-slate-50 border-2 rounded-2xl focus:outline-none font-bold text-slate-800 text-sm transition-all shadow-inner ${
                form.confirmParola && form.parola !== form.confirmParola 
                  ? 'border-red-400 bg-red-50 text-red-900' 
                  : 'border-slate-100 focus:border-amber-500'
              }`}
              value={form.confirmParola}
              onChange={(e) => setForm({...form, confirmParola: e.target.value})}
            />
          </div>

          {error && <p className="text-[11px] font-black text-red-500 uppercase text-center italic py-3 bg-red-50 rounded-xl animate-pulse">{error}</p>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-6 mt-4 bg-slate-900 text-white rounded-[25px] font-black text-center text-sm tracking-[0.25em] hover:bg-amber-600 transition-all border-b-4 border-slate-700 uppercase italic shadow-xl disabled:opacity-50 active:scale-95"
          >
            {loading ? "Se creează contul..." : "Înregistrează-te acum ✨"}
          </button>

          <div className="text-center pt-5">
            <Link href="/login" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">
              Ai deja cont? <span className="text-slate-900 underline underline-offset-2">Loghează-te</span>
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}