"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const verifySession = async () => {
      // Luăm sesiunea actuală
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      // Dacă există o eroare de sesiune sau sesiunea lipsește complet
      if (sessionError || !session) {
        console.log("Acces neautorizat detectat. Redirecționare...");
        router.push("/forgot-password"); 
      } else {
        // Dacă suntem aici, înseamnă că link-ul din email a funcționat
        setCheckingAuth(false);
      }
    };

    verifySession();
  }, [supabase, router]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("❌ Parolele nu coincid!");
      return;
    }
    if (password.length < 6) {
      setError("❌ Parola trebuie să aibă minim 6 caractere!");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError("❌ " + updateError.message);
      } else {
        setMessage("✅ Parola actualizată! Redirecționare...");
        
        // Imediat după update, închidem sesiunea pentru a invalida link-ul
        await supabase.auth.signOut();
        
        setTimeout(() => router.push("/login"), 2000);
      }
    } catch (err) {
      setError("❌ Eroare de conexiune.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 font-sans text-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[12px] font-black uppercase italic tracking-widest animate-pulse">
            Verificare Securitate...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50 font-sans text-slate-900">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden transform hover:scale-[1.01] transition-all duration-500">
        <div className="bg-slate-900 px-4 py-14 text-center relative flex flex-col items-center overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full -mr-20 -mt-20 blur-3xl z-0"></div>
          <Image src="/logo-chronos.png" alt="Chronos Logo" width={180} height={180} priority className="relative z-10 mb-6 drop-shadow-2xl" />
          <h2 className="text-3xl font-black uppercase text-white italic tracking-tighter relative z-10">
            SETARE <span className="text-amber-500">PAROLĂ</span>
          </h2>
          
          <div className="flex items-center gap-2 mt-4 relative z-10 justify-center bg-white/5 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.8)]"></span>
            <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.4em] italic">Sesiune Validă</p>
          </div>
        </div>

        <form onSubmit={handleUpdatePassword} className="p-10 space-y-6 bg-white">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 ml-4 italic tracking-[0.2em]">Noua Parolă</label>
              <input 
                type="password" 
                required 
                className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 focus:border-amber-500 rounded-[22px] outline-none font-bold text-sm italic text-slate-900" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 ml-4 italic tracking-[0.2em]">Confirmă Parola</label>
              <input 
                type="password" 
                required 
                className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 focus:border-amber-500 rounded-[22px] outline-none font-bold text-sm italic text-slate-900" 
                placeholder="••••••••" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
              />
            </div>
          </div>

          {error && <div className="p-5 bg-red-50 text-red-600 rounded-[20px] text-[10px] font-black uppercase italic text-center border-l-4 border-red-500">{error}</div>}
          {message && <div className="p-5 bg-green-50 text-green-600 rounded-[20px] text-[10px] font-black uppercase italic text-center border-l-4 border-green-500">{message}</div>}

          <button 
            type="submit" 
            disabled={loading} 
            title="Actualizează parola Chronos"
            className="w-full py-6 bg-slate-900 text-amber-500 rounded-[25px] font-black text-[12px] tracking-[0.3em] hover:bg-amber-600 hover:text-white transition-all border-b-8 border-slate-800 uppercase italic shadow-2xl active:translate-y-1 active:border-b-0"
          >
            {loading ? "Se salvează..." : "Salvează Noua Parolă"}
          </button>
        </form>

        <div className="bg-slate-50/50 py-4 text-center border-t border-slate-100">
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest italic">Chronos Security Module • v2.0</p>
        </div>
      </div>
    </main>
  );
}