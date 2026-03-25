"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const SUPABASE_URL = "https://zzrubdbngjfwurdwxtwf.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6cnViZGJuZ2pmd3VyZHd4dHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDkyMTgsImV4cCI6MjA4ODQ4NTIxOH0.6uw6yzCs5OfCP7xqWshzPQP36bCPxi2LU0QtpwsvnOo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ nume: "", email: "", telefon: "", parola: "", confirmParola: "" });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.parola !== form.confirmParola) { setError("❌ Parolele nu coincid!"); return; }
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.parola,
      options: { data: { display_name: form.nume, phone: form.telefon } }
    });

    if (authError) { setError(authError.message); setLoading(false); return; }

    if (authData.user) {
      await supabase.from('profiles').insert([{
        id: authData.user.id,
        full_name: form.nume,
        phone: form.telefon,
        email: form.email,
        account_type: 'personal' 
      }]);
      
      alert("✅ Cont creat cu succes!");
      router.push("/login");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50 font-sans text-slate-900">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* HEADER IDENTIC CU PAGINA DE LOGIN */}
        <div className="bg-slate-900 px-4 py-12 text-center relative flex flex-col items-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16 blur-3xl z-0"></div>
          <Image src="/logo-chronos.png" alt="Chronos Logo" width={200} height={200} priority className="object-contain relative z-10 mb-4" />
          <h2 className="text-3xl font-black uppercase text-white italic tracking-tighter relative z-10">ÎNREGISTRARE</h2>
          <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3 relative z-10">Alătură-te comunității CHRONOS</p>
        </div>

        <form onSubmit={handleRegister} className="p-10 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Nume Complet</label>
            <input type="text" required className="w-full px-7 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-500 focus:outline-none font-bold text-sm shadow-inner" placeholder="Numele tău" value={form.nume} onChange={(e) => setForm({...form, nume: e.target.value})} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Email</label>
            <input type="email" required className="w-full px-7 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-500 focus:outline-none font-bold text-sm shadow-inner" placeholder="nume@email.ro" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Telefon</label>
            <input type="tel" required className="w-full px-7 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-500 focus:outline-none font-bold text-sm shadow-inner" placeholder="07xx xxx xxx" value={form.telefon} onChange={(e) => setForm({...form, telefon: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Parolă</label>
              <input type="password" required className="w-full px-7 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-500 focus:outline-none font-bold text-sm shadow-inner" placeholder="••••" value={form.parola} onChange={(e) => setForm({...form, parola: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Confirmă</label>
              <input type="password" required className="w-full px-7 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-500 focus:outline-none font-bold text-sm shadow-inner" placeholder="••••" value={form.confirmParola} onChange={(e) => setForm({...form, confirmParola: e.target.value})} />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-[11px] font-black uppercase italic text-center animate-pulse">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full py-6 mt-4 bg-slate-900 text-white rounded-[25px] font-black text-center text-sm tracking-[0.25em] hover:bg-amber-600 transition-all border-b-4 border-slate-700 uppercase italic shadow-xl disabled:opacity-50">
            {loading ? "Se procesează..." : "Creează Cont"}
          </button>

          <div className="text-center pt-5">
            <Link href="/login" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">
              ← Ai deja cont? <span className="text-slate-900 underline underline-offset-2">Loghează-te aici</span>
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}