"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    try {
      // 1. Încercăm autentificarea
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        alert("Eroare: " + error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        // 2. Curățăm orice urmă de demo imediat după login reușit [cite: 2026-03-21]
        localStorage.removeItem("chronos_demo");

        // 3. Forțăm refresh-ul sesiunii în instanța locală
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // 4. Navigare controlată și refresh pentru a actualiza RootLayout [cite: 2026-03-19]
          router.push("/programari");
          router.refresh(); 
        }
      }
    } catch (err) {
      setLoading(false);
      alert("Eroare de conexiune la server.");
    }
  };

  // Funcție pentru modul Demo (Prezentare)
  const handleDemoMode = () => {
    localStorage.setItem("chronos_demo", "true");
    window.location.href = "/programari";
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50 font-sans text-slate-900">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl shadow-slate-200/60 border-4 border-white overflow-hidden transform hover:scale-[1.01] transition-all duration-500">

        {/* Header Secțiune - Fundal Negru Premium */}
        <div className="bg-slate-900 px-4 py-12 text-center relative flex flex-col items-center overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full -mr-20 -mt-20 blur-3xl z-0"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full -ml-16 -mb-16 blur-2xl z-0"></div>

          <Image
            src="/logo-chronos.png"
            alt="Chronos Logo"
            width={140}
            height={140}
            priority
            className="object-contain relative z-10 mb-6 drop-shadow-2xl animate-pulse"
          />

          <h2 className="text-3xl font-black uppercase text-white italic tracking-tighter relative z-10 leading-none">
            AUTENTIFICARE <span className="text-amber-500">CONT</span>
          </h2>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] italic mt-3 relative z-10">
            Sistem de Gestiune Premium
          </p>
        </div>

        {/* Formular de Logare */}
        <form onSubmit={handleLogin} className="p-10 space-y-5 bg-white">
          
          <div className="space-y-4">
            <div className="relative group">
              <input
                type="email"
                required
                placeholder="ADRESA EMAIL"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-[11px] uppercase italic tracking-wider focus:border-amber-500 outline-none transition-all"
                title="Introdu adresa de email pentru autentificare [cite: 2026-03-23]"
              />
            </div>

            <div className="relative group text-right">
              <input
                type="password"
                required
                placeholder="PAROLA"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-[11px] uppercase italic tracking-wider focus:border-amber-500 outline-none transition-all"
                title="Introdu parola contului tău [cite: 2026-03-23]"
              />
              <Link 
                href="/forgot-password" 
                title="Recuperează parola dacă ai uitat-o [cite: 2026-03-23]"
                className="inline-block mt-2 text-[9px] font-black uppercase italic text-slate-400 hover:text-amber-500 transition-colors mr-2"
              >
                Ai uitat parola?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black italic uppercase tracking-widest hover:bg-slate-800 border-b-4 border-slate-700 active:border-b-0 active:translate-y-1 transition-all text-xs"
            title={loading ? "Se verifică datele..." : "Apasă pentru a intra în contul Chronos [cite: 2026-03-23]"}
          >
            {loading ? "SE VERIFICĂ..." : "INTRĂ ÎN CONT"}
          </button>

          {/* Secțiune Demo & Înregistrare */}
          <div className="pt-4 border-t-2 border-slate-50 flex flex-col items-center gap-3 text-center">
            <button 
              type="button"
              onClick={handleDemoMode}
              className="text-[10px] font-black uppercase italic text-amber-600 hover:text-amber-700 transition-all tracking-widest"
              title="Explorează aplicația fără cont [cite: 2026-03-23]"
            >
              EXPLOREAZĂ MOD PREZENTARE (DEMO)
            </button>

            <p className="text-[10px] font-black uppercase italic text-slate-400 mt-2">
              Nu ai un cont încă?
            </p>
            <Link 
              href="/register" 
              className="w-full py-3 text-[9px] font-black uppercase italic bg-slate-100 text-slate-900 rounded-xl border-2 border-slate-200 hover:bg-slate-200 transition-all text-center"
              title="Creează un cont nou în sistemul Chronos [cite: 2026-03-23]"
            >
              CREEAZĂ CONT NOU
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}