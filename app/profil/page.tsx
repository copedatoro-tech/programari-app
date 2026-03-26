"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from '@supabase/ssr' // Folosim clientul corect pentru SSR
import { useRouter } from "next/navigation";
import Image from "next/image";

const LIMITE_ABONAMENTE: Record<string, { nume: string; limita: string; culoare: string }> = {
  "start (gratuit)": { nume: "START (GRATUIT)", limita: "50 rezervări/lună", culoare: "text-slate-400" },
  "pro": { nume: "PRO", limita: "200 rezervări/lună", culoare: "text-blue-500" },
  "elite": { nume: "ELITE", limita: "1000 rezervări/lună", culoare: "text-amber-500" },
  "team": { nume: "TEAM", limita: "Nelimitat (5000)", culoare: "text-purple-500" }
};

export default function ProfilPage() {
  const [isClient, setIsClient] = useState(false); // Pentru a preveni eroarea de hidratare
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);

  const router = useRouter();
  
  // Inițializăm clientul Supabase pentru browser
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [nume, setNume] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [functie, setFunctie] = useState(""); 
  const [avatarUrl, setAvatarUrl] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState("start (gratuit)");

  const [pass1, setPass1] = useState("");
  const [pass2, setPass2] = useState("");

  useEffect(() => {
    setIsClient(true); // Confirmăm că suntem pe client
    let isMounted = true;

    const getUserData = async () => {
      try {
        if (isMounted) setLoading(true);
        
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !currentUser) {
          if (isMounted) window.location.assign("/login");
          return;
        }

        if (isMounted) setUser(currentUser);
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (profile && isMounted) {
          setNume(profile.full_name || "");
          setEmail(profile.email || currentUser.email || "");
          setTelefon(profile.phone || "");
          setFunctie(profile.role || "Administrator");
          setAvatarUrl(profile.avatar_url || "");
          setSubscriptionPlan(profile.plan_type?.toLowerCase() || "start (gratuit)");
        }
      } catch (err) {
        console.error("Eroare la încărcare profil:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    getUserData();
    return () => { isMounted = false; };
  }, [router]);

  const handleUpdateAll = async () => {
    if (!user) return;
    setUpdating(true);
    try {
      const { error } = await supabase.from('profiles').upsert({ 
          id: user.id, 
          full_name: nume, 
          avatar_url: avatarUrl, 
          email: email, 
          phone: telefon,
          role: functie,
          plan_type: subscriptionPlan,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (error) throw error;
      alert("✅ Profil actualizat cu succes!");
    } catch (err: any) {
      alert("Eroare la salvare: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmPassword = async () => {
    if (!pass1 || pass1 !== pass2) { alert("Parolele nu coincid sau sunt goale!"); return; }
    if (pass1.length < 6) { alert("Parola trebuie să aibă minim 6 caractere!"); return; }
    
    setUpdating(true);
    const { error } = await supabase.auth.updateUser({ password: pass1 });
    if (error) alert(error.message);
    else { 
      alert("✅ Parola a fost actualizată!"); 
      setShowPassModal(false); 
      setPass1(""); setPass2("");
    }
    setUpdating(false);
  };

  const handleUploadAvatar = async (event: any) => {
    if (!event.target.files?.[0] || !user) return;
    setUpdating(true);
    try {
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
    } catch (err: any) {
      alert("Eroare la încărcare imagine: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.assign("/login");
  };

  // Prevenim randarea pe server pentru a evita Hydration Mismatch
  if (!isClient || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 italic font-black text-slate-400 animate-pulse uppercase tracking-widest">
      Sincronizare date profil...
    </div>
  );

  const currentPlanInfo = LIMITE_ABONAMENTE[subscriptionPlan] || LIMITE_ABONAMENTE["start (gratuit)"];

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 font-sans text-slate-900">
      <div className="max-w-3xl mx-auto bg-white rounded-[50px] shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Sectiune Header */}
        <div className="bg-slate-900 p-10 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          
          <div className="relative w-32 h-32 shrink-0 group">
            <div className="w-full h-full rounded-[40px] overflow-hidden border-2 border-amber-500 bg-slate-800 flex items-center justify-center shadow-2xl transition-transform group-hover:scale-105 duration-500 relative">
              {avatarUrl ? (
                <Image 
                  src={avatarUrl} 
                  alt="Avatar" 
                  fill 
                  sizes="128px"
                  style={{ objectFit: 'cover' }}
                  className="transition-opacity duration-300"
                />
              ) : (
                <span className="text-5xl opacity-20">👤</span>
              )}
            </div>
            <label title="Încarcă o poză de profil nouă pentru identitatea ta Chronos" className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-all cursor-pointer rounded-[40px] m-1 z-20">
              <input type="file" accept="image/*" className="hidden" onChange={handleUploadAvatar} />
              <span className="text-[10px] font-black text-white uppercase text-center px-2">Schimbă Poza</span>
            </label>
          </div>

          <div className="flex-1 text-center md:text-left z-10">
            <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none mb-3">
              {nume || "Utilizator Chronos"}
            </h1>
            <p className="text-amber-500 text-[11px] font-black uppercase tracking-[0.4em] italic flex items-center justify-center md:justify-start gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span> {functie || "Administrator Sistem"}
            </p>
          </div>

          <div className="flex flex-col gap-3 z-10 w-full md:w-auto">
            <button title="Salvează definitiv toate modificările efectuate în profil" onClick={handleUpdateAll} disabled={updating} className="px-8 py-3.5 bg-amber-500 text-slate-900 text-[10px] font-black rounded-2xl uppercase italic hover:bg-white transition-all shadow-lg active:scale-95">
              {updating ? "Se salvează..." : "Salvează Profil"}
            </button>
            <button title="Deconectare securizată din platformă" onClick={handleSignOut} className="px-8 py-3.5 bg-red-600/20 text-red-500 border border-red-500/30 text-[10px] font-black rounded-2xl uppercase italic hover:bg-red-600 hover:text-white transition-all active:scale-95">
              Deconectare
            </button>
          </div>
        </div>

        {/* Status Abonament */}
        <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md text-2xl border border-slate-100">💎</div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nivel Abonament</p>
              <h3 className={`text-xl font-black italic uppercase ${currentPlanInfo.culoare}`}>{currentPlanInfo.nume}</h3>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Capacitate</p>
              <p className="text-sm font-black text-slate-800 uppercase italic">{currentPlanInfo.limita}</p>
            </div>
            <button onClick={() => router.push('/abonamente')} title="Explorează planurile superioare pentru a crește limitele contului tău" className="px-6 py-3 bg-slate-900 text-white text-[9px] font-black rounded-xl uppercase italic hover:bg-amber-500 transition-colors shadow-md">Upgrade</button>
          </div>
        </div>

        {/* Grid Date Personale */}
        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10 bg-white">
          {[
            { label: "Nume Complet", val: nume, set: setNume, hint: "Numele afișat în calendar și rapoarte" },
            { label: "Adresă Email", val: email, set: null, hint: "Emailul principal folosit pentru autentificare (nu poate fi schimbat de aici)" },
            { label: "Telefon Contact", val: telefon, set: setTelefon, hint: "Numărul de telefon pentru comunicarea cu clienții" },
            { label: "Funcție / Rol", val: functie, set: setFunctie, hint: "Rolul tău în cadrul echipei sau business-ului" }
          ].map((item, idx) => (
            <div key={idx} className="space-y-3 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic group-focus-within:text-amber-600 transition-colors">{item.label}</label>
              <input 
                title={item.hint}
                type="text" 
                value={item.val} 
                onChange={item.set ? (e) => item.set!(e.target.value) : undefined}
                readOnly={!item.set}
                className={`w-full p-5 rounded-2xl font-bold text-sm outline-none transition-all ${item.set ? 'bg-slate-50 border-2 border-transparent focus:border-amber-500 focus:bg-white focus:shadow-xl' : 'bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-slate-100'}`}
              />
            </div>
          ))}
          
          <div className="md:col-span-2 pt-6 border-t border-slate-50">
            <button 
              title="Modifică parola de acces pentru a menține securitatea contului"
              onClick={() => setShowPassModal(true)} 
              className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase italic hover:text-amber-600 transition-colors"
            >
              <span className="text-lg">🔒</span> Vrei să schimbi parola de acces?
            </button>
          </div>
        </div>
      </div>

      {/* Modal Schimbare Parolă */}
      {showPassModal && (
        <div 
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-6" 
          onClick={() => setShowPassModal(false)}
        >
          <div 
            className="bg-white w-full max-w-sm rounded-[45px] p-12 shadow-[0_30px_100px_rgba(0,0,0,0.5)] space-y-8 border border-slate-100 relative" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Securitate</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Introdu noua ta cheie de acces</p>
            </div>
            <div className="space-y-4">
              <input title="Introdu noua parolă (minim 6 caractere)" type="password" placeholder="PAROLĂ NOUĂ" value={pass1} onChange={(e) => setPass1(e.target.value)} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[25px] font-bold outline-none focus:border-amber-500 focus:bg-white transition-all shadow-inner" />
              <input title="Repetă noua parolă pentru confirmare" type="password" placeholder="CONFIRMĂ PAROLA" value={pass2} onChange={(e) => setPass2(e.target.value)} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[25px] font-bold outline-none focus:border-amber-500 focus:bg-white transition-all shadow-inner" />
            </div>
            <button title="Confirmă și aplică noua parolă" onClick={handleConfirmPassword} className="w-full py-6 bg-slate-900 text-amber-500 rounded-[25px] font-black text-[11px] uppercase italic tracking-[0.2em] hover:bg-amber-500 hover:text-white transition-all shadow-2xl">
              ACTUALIZEAZĂ ACUM
            </button>
            <button title="Închide fereastra fără a schimba parola" onClick={() => setShowPassModal(false)} className="text-center w-full text-[9px] font-black text-slate-300 uppercase tracking-widest hover:text-red-500 transition-colors">Anulează</button>
          </div>
        </div>
      )}
    </main>
  );
}