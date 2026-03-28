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
        // 2. Curățăm orice urmă de demo imediat
        localStorage.removeItem("chronos_demo");

        // 3. Forțăm refresh-ul sesiunii în instanța locală
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // 4. Folosim router.push pentru o navigare controlată
          // Direcționăm către /programari (sau orice pagină protejată)
          router.push("/programari");
          router.refresh(); // Forțează RootLayout să re-evalueze sesiunea
        }
      }
    } catch (err) {
      setLoading(false);
      alert("Eroare de conexiune la server.");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50 font-sans text-slate-900">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl shadow-slate-200/60 border-4 border-white overflow-hidden transform hover:scale-[1.01] transition-all duration-500">

        {/* Header Secțiune */}
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

        {/* Formular */}
        <form onSubmit={handleLogin} className="p-10 space-y-5 bg-white">
          
          <div className="space-y-4">
            <div className="relative group">
              <input
                type="email"
                required
                placeholder="ADRESA EMAIL"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-chronos uppercase italic text-[11px] tracking-wider"
                title="Introdu adresa de email pentru autentificare"
              />
            </div>

            <div className="relative group text-right">
              <input
                type="password"
                required
                placeholder="PAROLA"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-chronos uppercase italic text-[11px] tracking-wider"
                title="Introdu parola contului tău"
              />
              <Link 
                href="/forgot-password" 
                title="Recuperează parola dacă ai uitat-o"
                className="inline-block mt-2 text-[9px] font-black uppercase italic text-slate-400 hover:text-amber-500 transition-colors mr-2"
              >
                Ai uitat parola?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-demo w-full py-4 text-xs"
            title={loading ? "Se verifică datele..." : "Apasă pentru a intra în contul Chronos"}
          >
            {loading ? "SE VERIFICĂ..." : "INTRĂ ÎN CONT"}
          </button>

          <div className="pt-4 border-t-2 border-slate-50 flex flex-col items-center gap-3">
            <p className="text-[10px] font-black uppercase italic text-slate-400">
              Nu ai un cont încă?
            </p>
            <Link 
              href="/register" 
              className="btn-chronos w-full py-3 text-[9px] bg-slate-100 !text-slate-900 border-slate-200 !shadow-none hover:!bg-slate-200"
              title="Creează un cont nou în sistemul Chronos"
            >
              CREEAZĂ CONT NOU
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}