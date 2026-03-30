"use client";

import { useState, useEffect, useRef } from "react";
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ 
    nume: "", 
    email: "", 
    telefon: "", 
    parola: "", 
    confirmParola: "",
    expert: "",
    serviciu: ""
  });
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setError(""); 
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (form.parola !== form.confirmParola) { 
      setError("❌ Parolele nu coincid!"); 
      return; 
    }

    if (form.parola.length < 6) {
      setError("❌ Parola trebuie să aibă cel puțin 6 caractere!");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      localStorage.removeItem("chronos_demo");

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.parola,
        options: { 
          data: { 
            full_name: form.nume, 
            phone: form.telefon || null,
            expert_preferat: form.expert,
            serviciu_interes: form.serviciu
          } 
        }
      });

      if (authError) {
        setError("❌ " + authError.message);
        setLoading(false);
        return;
      }

      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert([{
          id: authData.user.id,
          full_name: form.nume,
          phone: form.telefon || null,
          email: form.email,
          plan_type: 'start (gratuit)', 
          role: 'Administrator',
          // Mapăm datele suplimentare dacă ai coloanele în DB
          staff: form.expert ? [{ nume: form.expert }] : [],
          services: form.serviciu ? [{ nume: form.serviciu }] : []
        }]);

        alert("✅ Cont creat cu succes! Acum te poți loga.");
        await supabase.auth.signOut();
        router.push("/login");
      }
    } catch (err: any) {
      setError("❌ Eroare neașteptată la server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50 font-sans text-slate-900">
      <div ref={formRef} className="w-full max-w-2xl bg-white rounded-[40px] shadow-2xl border-4 border-white overflow-hidden transform hover:scale-[1.005] transition-all duration-500">
        
        {/* Header Secțiune */}
        <div className="bg-slate-900 px-4 py-12 text-center relative flex flex-col items-center overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full -mr-20 -mt-20 blur-3xl z-0"></div>
          
          <div className="relative z-10 mb-6 drop-shadow-2xl bg-white p-4 rounded-3xl">
            <span className="text-4xl font-black italic text-slate-900">C</span>
          </div>

          <h2 className="text-3xl font-black uppercase text-white italic tracking-tighter relative z-10 leading-none">
            CREARE <span className="text-amber-500">CONT</span>
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3 relative z-10 italic">
            Acces Premium CHRONOS
          </p>
        </div>

        <form onSubmit={handleRegister} className="p-10 space-y-6 bg-white">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Nume Complet</label>
              <input 
                type="text" required 
                className="input-chronos !py-4 text-[13px] uppercase italic tracking-wider font-bold" 
                placeholder="EX: ION POPESCU" value={form.nume} 
                onChange={(e) => setForm({...form, nume: e.target.value})} 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Telefon</label>
              <input 
                type="tel" 
                className="input-chronos !py-4 text-[13px] uppercase italic tracking-wider font-bold" 
                placeholder="07XX XXX XXX" value={form.telefon} 
                onChange={(e) => setForm({...form, telefon: e.target.value})} 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Adresă Email</label>
            <input 
              type="email" required 
              className="input-chronos !py-4 text-[13px] uppercase italic tracking-wider font-bold" 
              placeholder="EMAIL@EXEMPLU.RO" value={form.email} 
              onChange={(e) => setForm({...form, email: e.target.value})} 
            />
          </div>

          {/* Secțiune Nouă: Specialist și Serviciu */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-[30px] border-2 border-slate-100 shadow-inner">
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-amber-600 ml-2 italic tracking-widest flex items-center gap-2">
                  👤 Specialist Dorit
                </label>
                <select 
                  className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 px-4 text-[13px] font-bold text-slate-700 uppercase italic outline-none focus:border-amber-500 transition-all"
                  value={form.expert}
                  onChange={(e) => setForm({...form, expert: e.target.value})}
                >
                  <option value="">Alege Specialist</option>
                  <option value="Expert 1">Expert Principal</option>
                  <option value="Expert 2">Expert Secundar</option>
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-amber-600 ml-2 italic tracking-widest flex items-center gap-2">
                  ✂️ Serviciu Dorit
                </label>
                <select 
                  className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 px-4 text-[13px] font-bold text-slate-700 uppercase italic outline-none focus:border-amber-500 transition-all"
                  value={form.serviciu}
                  onChange={(e) => setForm({...form, serviciu: e.target.value})}
                >
                  <option value="">Alege Serviciu</option>
                  <option value="Serviciu 1">Tuns & Styling</option>
                  <option value="Serviciu 2">Barba & Tratament</option>
                </select>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Parolă</label>
              <input 
                type="password" required 
                className="input-chronos !py-4 text-[13px] font-bold" 
                placeholder="••••••••" value={form.parola} 
                onChange={(e) => setForm({...form, parola: e.target.value})} 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Confirmă Parola</label>
              <input 
                type="password" required 
                className="input-chronos !py-4 text-[13px] font-bold" 
                placeholder="••••••••" value={form.confirmParola} 
                onChange={(e) => setForm({...form, confirmParola: e.target.value})} 
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase italic text-center border-l-8 border-red-500 animate-pulse">
              {error}
            </div>
          )}

          <button 
            type="submit" disabled={loading} 
            className="btn-demo w-full py-5 text-sm mt-4 shadow-xl hover:shadow-amber-500/20"
          >
            {loading ? "SE PROCESEAZĂ..." : "ÎNREGISTRARE CONT NOU"}
          </button>

          <div className="text-center pt-8 border-t-2 border-slate-50">
            <Link href="/login" className="text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-amber-600 transition-all flex items-center justify-center gap-2 group">
              <span className="group-hover:-translate-x-1 transition-transform">←</span> AI DEJA CONT? <span className="text-slate-900 underline decoration-amber-500 decoration-2 underline-offset-4">LOGHEAZĂ-TE</span>
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}