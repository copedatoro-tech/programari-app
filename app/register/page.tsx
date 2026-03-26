"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase"; // Folosim instanța centralizată pentru consistență
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ nume: "", email: "", telefon: "", parola: "", confirmParola: "" });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.parola !== form.confirmParola) { 
      setError("❌ Parolele nu coincid!"); 
      return; 
    }
    
    setLoading(true);
    setError("");

    try {
      // 1. Creăm utilizatorul în sistemul de autentificare
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.parola,
        options: { 
          data: { 
            full_name: form.nume, 
            phone: form.telefon 
          } 
        }
      });

      if (authError) {
        setError("❌ " + authError.message);
        setLoading(false);
        return;
      }

      // 2. Dacă userul a fost creat, inserăm datele în tabela 'profiles'
      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert([{
          id: authData.user.id,
          full_name: form.nume,
          phone: form.telefon,
          email: form.email,
          plan_type: 'start (gratuit)', // Adăugăm planul implicit aici
          role: 'Administrator' // Rolul implicit
        }]);

        if (profileError) {
          console.error("Eroare profil:", profileError.message);
        }

        alert("✅ Cont creat cu succes! Te poți loga acum.");
        
        // 3. Forțăm ieșirea din sesiune (pentru a evita logarea automată incompletă)
        await supabase.auth.signOut();
        
        // 4. Redirecționăm curat la login
        window.location.href = "/login";
      }
    } catch (err: any) {
      setError("❌ Eroare neașteptată. Încearcă din nou.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#fcfcfc] font-sans text-slate-900">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* HEADER IDENTIC CU PAGINA DE LOGIN */}
        <div className="bg-slate-900 px-4 py-12 text-center relative flex flex-col items-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16 blur-3xl z-0"></div>
          <Image 
            src="/logo-chronos.png" 
            alt="Chronos Logo" 
            width={200} 
            height={200} 
            priority 
            className="object-contain relative z-10 mb-4" 
          />
          <h2 className="text-3xl font-black uppercase text-white italic tracking-tighter relative z-10">ÎNREGISTRARE</h2>
          <div className="flex items-center gap-2 mt-3 relative z-10 justify-center">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
            <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.3em] italic">Alătură-te comunității CHRONOS</p>
          </div>
        </div>

        <form onSubmit={handleRegister} className="p-10 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Nume Complet</label>
            <input 
              title="Introdu numele tău complet pentru personalizarea profilului tau în platformă"
              type="text" 
              required 
              className="w-full px-7 py-5 bg-slate-50 border-2 border-transparent focus:border-amber-500 focus:bg-white focus:outline-none font-bold text-sm shadow-inner rounded-2xl transition-all hover:bg-slate-100" 
              placeholder="Numele tău" 
              value={form.nume} 
              onChange={(e) => setForm({...form, nume: e.target.value})} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Email</label>
            <input 
              title="Introdu o adresă de email validă care va fi folosită pentru autentificare și notificări"
              type="email" 
              required 
              className="w-full px-7 py-5 bg-slate-50 border-2 border-transparent focus:border-amber-500 focus:bg-white focus:outline-none font-bold text-sm shadow-inner rounded-2xl transition-all hover:bg-slate-100" 
              placeholder="nume@email.ro" 
              value={form.email} 
              onChange={(e) => setForm({...form, email: e.target.value})} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Telefon</label>
            <input 
              title="Introdu numărul tău de telefon pentru contact și securitatea contului"
              type="tel" 
              required 
              className="w-full px-7 py-5 bg-slate-50 border-2 border-transparent focus:border-amber-500 focus:bg-white focus:outline-none font-bold text-sm shadow-inner rounded-2xl transition-all hover:bg-slate-100" 
              placeholder="07xx xxx xxx" 
              value={form.telefon} 
              onChange={(e) => setForm({...form, telefon: e.target.value})} 
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Parolă</label>
              <input 
                title="Alege o parolă sigură de minim 6 caractere pentru protecția contului"
                type="password" 
                required 
                className="w-full px-7 py-5 bg-slate-50 border-2 border-transparent focus:border-amber-500 focus:bg-white focus:outline-none font-bold text-sm shadow-inner rounded-2xl transition-all hover:bg-slate-100" 
                placeholder="••••" 
                value={form.parola} 
                onChange={(e) => setForm({...form, parola: e.target.value})} 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Confirmă</label>
              <input 
                title="Repetă parola de mai sus pentru a te asigura că este scrisă corect"
                type="password" 
                required 
                className="w-full px-7 py-5 bg-slate-50 border-2 border-transparent focus:border-amber-500 focus:bg-white focus:outline-none font-bold text-sm shadow-inner rounded-2xl transition-all hover:bg-slate-100" 
                placeholder="••••" 
                value={form.confirmParola} 
                onChange={(e) => setForm({...form, confirmParola: e.target.value})} 
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase italic text-center border-l-4 border-red-500">
              {error}
            </div>
          )}

          <button 
            title="Finalizare înregistrare: Apasă pentru a crea contul tău oficial CHRONOS"
            type="submit" 
            disabled={loading} 
            className="w-full py-6 mt-4 bg-slate-900 text-amber-500 rounded-[25px] font-black text-center text-sm tracking-[0.25em] hover:bg-amber-500 hover:text-white transition-all border-b-4 border-slate-800 hover:border-amber-600 uppercase italic shadow-xl disabled:opacity-50 transform active:scale-95"
          >
            {loading ? "Se procesează..." : "Creează Cont"}
          </button>

          <div className="text-center pt-5 border-t border-slate-50 mt-4">
            <Link 
              href="/login" 
              title="Revenire la autentificare: Mergi la pagina de login dacă ai deja un cont creat"
              className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-amber-600 transition-colors group"
            >
              ← Ai deja cont? <span className="text-slate-900 underline underline-offset-4 decoration-amber-500 group-hover:text-amber-600 transition-all">Loghează-te aici</span>
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}