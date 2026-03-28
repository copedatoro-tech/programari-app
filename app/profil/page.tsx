"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from "next/navigation";
import Image from "next/image";

const LIMITE_ABONAMENTE: Record<string, { nume: string; limita: string; culoare: string }> = {
  "start (gratuit)": { nume: "START (GRATUIT)", limita: "50 rezervări/lună", culoare: "text-slate-400" },
  "pro": { nume: "PRO", limita: "200 rezervări/lună", culoare: "text-blue-500" },
  "elite": { nume: "ELITE", limita: "500 rezervări/lună", culoare: "text-amber-500" },
  "team": { nume: "TEAM", limita: "Nelimitat (5000)", culoare: "text-purple-500" }
};

export default function ProfilPage() {
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);

  const router = useRouter();
  
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
    setIsClient(true);
    let isMounted = true;

    const getUserData = async () => {
      try {
        if (isMounted) setLoading(true);
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          if (isMounted) {
            localStorage.clear();
            window.location.href = "/login";
          }
          return;
        }

        const currentUser = session.user;
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
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      window.location.href = "/login";
    } catch (error) {
      window.location.href = "/login";
    }
  };

  if (!isClient || loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin mb-4"></div>
      <p className="italic font-black text-slate-400 animate-pulse uppercase tracking-[0.3em] text-[10px]">Sincronizare Identitate Chronos...</p>
    </div>
  );

  const currentPlanInfo = LIMITE_ABONAMENTE[subscriptionPlan] || LIMITE_ABONAMENTE["start (gratuit)"];

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto bg-white rounded-[50px] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden transform transition-all">
        
        {/* Sectiune Header - Design Premium Chronos */}
        <div className="bg-slate-900 p-12 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] -mr-32 -mt-32 z-0"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full blur-[60px] -ml-20 -mb-20 z-0"></div>
          
          <div className="relative w-40 h-40 shrink-0 group z-10">
            <div className="w-full h-full rounded-[45px] overflow-hidden border-4 border-slate-800 bg-slate-800 flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-transform group-hover:scale-105 duration-500 relative">
              {avatarUrl ? (
                <Image 
                  src={avatarUrl} 
                  alt="Avatar" 
                  fill 
                  sizes="160px"
                  style={{ objectFit: 'cover' }}
                  className="transition-opacity duration-300"
                />
              ) : (
                <span className="text-6xl opacity-10">👤</span>
              )}
            </div>
            <label 
              title="Încarcă o poză de profil nouă pentru identitatea ta Chronos" 
              className="absolute inset-0 flex items-center justify-center bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-all cursor-pointer rounded-[45px] m-1 z-20 border-2 border-dashed border-amber-500/50"
            >
              <input type="file" accept="image/*" className="hidden" onChange={handleUploadAvatar} />
              <div className="text-center">
                <span className="block text-[10px] font-black text-amber-500 uppercase tracking-widest italic">Actualizează</span>
                <span className="block text-[8px] font-bold text-white/60 uppercase">Avatar</span>
              </div>
            </label>
          </div>

          <div className="flex-1 text-center md:text-left z-10">
            <div className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-4">
               <p className="text-amber-500 text-[9px] font-black uppercase tracking-[0.4em] italic flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,1)]"></span> 
                ID: {user?.id.substring(0, 8)}
              </p>
            </div>
            <h1 className="text-5xl font-black text-white uppercase italic tracking-tighter leading-none mb-2 drop-shadow-md">
              {nume || "Utilizator Chronos"}
            </h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest italic opacity-80">
              {functie || "Administrator Sistem"}
            </p>
          </div>

          <div className="flex flex-col gap-4 z-10 w-full md:w-auto">
            <button 
              title="Salvează definitiv toate modificările efectuate în profil" 
              onClick={handleUpdateAll} 
              disabled={updating} 
              className="px-10 py-4 bg-amber-500 text-slate-900 text-[11px] font-black rounded-2xl uppercase italic hover:bg-white transition-all shadow-[0_10px_20px_rgba(245,158,11,0.2)] active:scale-95 border-b-8 border-amber-700 hover:border-slate-200"
            >
              {updating ? "Sincronizare..." : "Salvează Profil"}
            </button>
            <button 
              title="Deconectare securizată din platformă" 
              onClick={handleSignOut} 
              className="px-10 py-4 bg-slate-800 text-slate-400 text-[11px] font-black rounded-2xl uppercase italic hover:bg-red-600 hover:text-white transition-all active:scale-95 border-b-8 border-slate-700 hover:border-red-800"
            >
              Deconectare
            </button>
          </div>
        </div>

        {/* Status Abonament */}
        <div className="px-12 py-8 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-xl text-3xl border border-slate-100 transform -rotate-3 hover:rotate-0 transition-transform">💎</div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 italic">Nivel Licență / Plan</p>
              <h3 className={`text-2xl font-black italic uppercase tracking-tighter ${currentPlanInfo.culoare}`}>
                {currentPlanInfo.nume}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-10">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 italic">Capacitate Rezervări</p>
              <p className="text-sm font-black text-slate-800 uppercase italic bg-white px-4 py-1 rounded-full border border-slate-200 shadow-sm">{currentPlanInfo.limita}</p>
            </div>
            <button 
              onClick={() => router.push('/abonamente')} 
              title="Explorează planurile superioare pentru a crește limitele contului tău" 
              className="px-8 py-4 bg-slate-900 text-white text-[10px] font-black rounded-2xl uppercase italic hover:bg-amber-500 hover:text-slate-900 transition-all shadow-xl border-b-8 border-slate-800 hover:border-amber-600 active:scale-95 active:border-b-0 active:translate-y-1"
            >
              Upgrade
            </button>
          </div>
        </div>

        {/* Grid Date Personale */}
        <div className="p-12 grid grid-cols-1 md:grid-cols-2 gap-10 bg-white">
          {[
            { label: "Nume Complet", val: nume, set: setNume, hint: "Numele afișat în calendar și rapoarte", icon: "👤" },
            { label: "Adresă Email", val: email, set: null, hint: "Emailul principal (Contactați suportul pentru schimbare)", icon: "✉️" },
            { label: "Telefon Contact", val: telefon, set: setTelefon, hint: "Numărul de telefon pentru comunicarea cu clienții", icon: "📱" },
            { label: "Funcție / Rol", val: functie, set: setFunctie, hint: "Rolul tău în cadrul echipei sau business-ului", icon: "💼" }
          ].map((item, idx) => (
            <div key={idx} className="space-y-3 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 italic group-focus-within:text-amber-600 transition-colors flex items-center gap-2">
                <span className="opacity-40">{item.icon}</span> {item.label}
              </label>
              <input 
                title={item.hint}
                type="text" 
                value={item.val} 
                onChange={item.set ? (e) => item.set!(e.target.value) : undefined}
                readOnly={!item.set}
                className={`w-full p-6 rounded-[25px] font-bold text-sm outline-none transition-all ${item.set ? 'bg-slate-50 border-2 border-slate-100 focus:border-amber-500 focus:bg-white focus:shadow-2xl focus:shadow-amber-500/5' : 'bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-slate-200 italic opacity-60'}`}
              />
            </div>
          ))}
          
          <div className="md:col-span-2 pt-10 border-t border-slate-50 flex justify-center">
            <button 
              title="Modifică parola de acces pentru a menține securitatea contului"
              onClick={() => setShowPassModal(true)} 
              className="flex items-center gap-4 px-8 py-4 bg-slate-50 rounded-full text-[11px] font-black text-slate-500 uppercase italic hover:text-amber-600 hover:bg-amber-50 transition-all border border-transparent hover:border-amber-200"
            >
              <span className="bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm">🔒</span> 
              Vrei să securizezi contul cu o parolă nouă?
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
         <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em] italic">Chronos Management System Identity Management • v2.0</p>
      </div>

      {/* Modal Schimbare Parolă */}
      {showPassModal && (
        <div 
          className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300" 
          onClick={() => setShowPassModal(false)}
        >
          <div 
            className="bg-white w-full max-w-sm rounded-[50px] p-12 shadow-[0_40px_120px_rgba(0,0,0,0.6)] space-y-10 border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-300" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>

            <div className="text-center relative">
              <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl transform -rotate-12">
                <span className="text-2xl text-amber-500">🔐</span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Securitate</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-3">Resetare Cheie de Acces</p>
            </div>

            <div className="space-y-4 relative">
              <input 
                title="Introdu noua parolă (minim 6 caractere)" 
                type="password" 
                placeholder="PAROLĂ NOUĂ" 
                value={pass1} 
                onChange={(e) => setPass1(e.target.value)} 
                className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[25px] font-bold outline-none focus:border-amber-500 focus:bg-white transition-all shadow-inner text-center tracking-widest" 
              />
              <input 
                title="Repetă noua parolă pentru confirmare" 
                type="password" 
                placeholder="CONFIRMĂ PAROLA" 
                value={pass2} 
                onChange={(e) => setPass2(e.target.value)} 
                className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[25px] font-bold outline-none focus:border-amber-500 focus:bg-white transition-all shadow-inner text-center tracking-widest" 
              />
            </div>

            <div className="space-y-4 relative">
              <button 
                title="Confirmă și aplică noua parolă" 
                onClick={handleConfirmPassword} 
                className="w-full py-6 bg-slate-900 text-amber-500 rounded-[25px] font-black text-[12px] uppercase italic tracking-[0.3em] hover:bg-amber-500 hover:text-white transition-all shadow-2xl border-b-8 border-slate-800 hover:border-amber-600 active:border-b-0 active:translate-y-1"
              >
                {updating ? "Procesare..." : "Actualizează"}
              </button>
              <button 
                title="Închide fereastra fără a schimba parola" 
                onClick={() => setShowPassModal(false)} 
                className="text-center w-full text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-red-500 transition-colors py-2 italic"
              >
                Renunță la modificări
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}