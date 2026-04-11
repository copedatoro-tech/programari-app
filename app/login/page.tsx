"use client";

import { useState, useMemo, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Verificăm și curățăm sesiunile invalide la încărcare pentru a preveni erorile de Refresh Token
  useEffect(() => {
    const checkSession = async () => {
      const { error } = await supabase.auth.getSession();
      if (error && error.message.includes("Refresh Token Not Found")) {
        console.warn("Sesiune invalidă detectată, curățăm datele locale...");
        await supabase.auth.signOut();
        router.refresh();
      }
    };
    checkSession();
  }, [supabase, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    console.log("Încercare logare locală...");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("Eroare detaliată:", error);
        
        // Tratăm cazul specific de refresh token și în timpul logării
        if (error.message.includes("Refresh Token Not Found")) {
          await supabase.auth.signOut();
          alert("Sesiunea a expirat. Vă rugăm să încercați din nou.");
        } else {
          alert("Eroare: " + error.message);
        }
        
        setLoading(false);
        return;
      }

      if (data.session) {
        router.push("/programari");
        router.refresh();
      } else {
        alert("Sesiunea nu a putut fi creată.");
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
      console.error("Eroare Catch:", err);
      alert("Eroare de conexiune.");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50 font-sans text-slate-900">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl shadow-slate-200/60 border-4 border-white overflow-hidden transform hover:scale-[1.01] transition-all duration-500">

        <div className="bg-slate-900 px-4 py-12 text-center relative flex flex-col items-center overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full -mr-20 -mt-20 blur-3xl z-0"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full -ml-16 -mb-16 blur-2xl z-0"></div>

          <Image
            src="/logo-chronos.png"
            alt="Chronos Logo"
            width={140}
            height={140}
            style={{ height: "auto" }} // Rezolvă avertismentul din browser
            priority
            className="object-contain relative z-10 mb-6 drop-shadow-2xl"
          />

          <h2 className="text-3xl font-black uppercase text-white italic tracking-tighter relative z-10 leading-none">
            AUTENTIFICARE <span className="text-amber-500">CONT</span>
          </h2>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] italic mt-3 relative z-10">
            Sistem de Gestiune Premium
          </p>
        </div>

        <form onSubmit={handleLogin} className="p-10 space-y-5 bg-white">
          <div className="space-y-4">
            <input
              type="email"
              required
              placeholder="ADRESA EMAIL"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-[11px] uppercase italic tracking-wider focus:border-amber-500 outline-none transition-all"
            />
            <div className="relative group text-right">
              <input
                type="password"
                required
                placeholder="PAROLA"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-[11px] uppercase italic tracking-wider focus:border-amber-500 outline-none transition-all"
              />
              <Link
                href="/forgot-password"
                className="inline-block mt-2 text-[9px] font-black uppercase italic text-slate-400 hover:text-amber-500 transition-colors mr-2"
              >
                Ai uitat parola?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black italic uppercase tracking-widest hover:bg-slate-800 border-b-4 border-slate-700 active:border-b-0 active:translate-y-1 transition-all text-xs disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "SE VERIFICĂ..." : "INTRĂ ÎN CONT"}
          </button>

          <div className="pt-4 border-t-2 border-slate-50 flex flex-col items-center gap-3 text-center">
            <p className="text-[10px] font-black uppercase italic text-slate-400 mt-2">
              Nu ai un cont încă?
            </p>
            <Link
              href="/register"
              className="w-full py-3 text-[11px] font-black uppercase italic bg-amber-500 text-slate-900 rounded-xl border-b-4 border-amber-600 hover:bg-amber-600 transition-all text-center"
            >
              CREEAZĂ CONT NOU
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}