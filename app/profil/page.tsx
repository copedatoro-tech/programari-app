"use client";

import { useEffect, useState, useMemo } from "react";
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from "next/navigation";
import Image from "next/image";

const LIMITE_ABONAMENTE: Record<string, { nume: any; limita: string; culoare: string }> = {
  "chronos free": { 
    nume: "START (GRATUIT)", 
    limita: "50 rezervări/lună", 
    culoare: "text-slate-400" 
  },
  "chronos pro": { 
    nume: "PRO", 
    limita: "200 rezervări/lună", 
    culoare: "text-blue-500" 
  },
  "chronos elite": { 
    nume: "ELITE", 
    limita: "500 rezervări/lună", 
    culoare: "text-amber-500" 
  },
  "chronos team": { 
    nume: (
      <span className="italic uppercase">
        <span className="text-slate-900">CHRONOS</span>{" "}
        <span className="text-amber-500">TEAM</span>
      </span>
    ), 
    limita: "Nelimitat (5000)", 
    culoare: "" 
  }
};

export default function ProfilPage() {
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  const router = useRouter();
  
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [nume, setNume] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [functie, setFunctie] = useState(""); 
  const [slug, setSlug] = useState(""); 
  const [avatarUrl, setAvatarUrl] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState("chronos free");
  const [isTrialActive, setIsTrialActive] = useState(false);

  const [pass1, setPass1] = useState("");
  const [pass2, setPass2] = useState("");

  const formatSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') 
      .replace(/[\s_-]+/g, '-') 
      .replace(/^-+|-+$/g, '');
  };

  useEffect(() => {
    setIsClient(true);
    let isMounted = true;

    const initAuth = async () => {
      const demoActive = typeof window !== 'undefined' && localStorage.getItem("chronos_demo") === "true";
      if (demoActive) {
        if (isMounted) {
          setIsDemo(true);
          setUser({ id: "demo_user", email: "demo@chronos.ro" });
          setNume("Utilizator Demo");
          setEmail("demo@chronos.ro");
          setFunctie("Administrator (Demo)");
          setSlug("demo-salon");
          setSubscriptionPlan("chronos elite");
          setLoading(false);
        }
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (isMounted) {
          setLoading(false);
          router.replace("/login");
        }
        return;
      }

      const u = session.user;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', u.id)
          .maybeSingle();

        if (isMounted) {
          setUser(u);
          setEmail(u.email || "");
          setNume(profile?.full_name || u.user_metadata?.full_name || "Utilizator Chronos");
          setTelefon(profile?.phone || "");
          setFunctie(profile?.role || "Administrator Sistem");
          setSlug(profile?.slug || ""); 
          setAvatarUrl(profile?.avatar_url || "");
          setIsTrialActive(profile?.trial_activated === true);
          
          if (profile?.plan_type) {
            setSubscriptionPlan(profile.plan_type.toLowerCase());
          }
        }
      } catch (err) {
        console.warn("Eroare la sincronizare date profil.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();
    return () => { isMounted = false; };
  }, [router, supabase]);

  const handleUpdateAll = async () => {
    if (!user || isDemo) return;
    setUpdating(true);
    try {
      const { error } = await supabase.from('profiles').upsert({ 
          id: user.id, 
          full_name: nume, 
          avatar_url: avatarUrl, 
          phone: telefon,
          role: functie,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) throw error;
      alert("✅ Profil actualizat!");
    } catch (err: any) {
      alert("Eroare la salvare: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateSlug = async () => {
    if (!user || isDemo) return;
    setUpdating(true);
    try {
      const finalSlug = formatSlug(slug);

      if (finalSlug.length < 3) {
        alert("⚠️ Adresa unică (slug) trebuie să aibă minim 3 caractere.");
        setUpdating(false);
        return;
      }

      const { data: existingSlug } = await supabase
        .from('profiles')
        .select('id')
        .eq('slug', finalSlug)
        .neq('id', user.id)
        .maybeSingle();

      if (existingSlug) {
        alert(`❌ Eroare: Numele "${finalSlug}" este deja rezervat de altcineva. Te rugăm să alegi o altă variantă.`);
        setUpdating(false);
        return;
      }

      const { error } = await supabase.from('profiles').update({ 
          slug: finalSlug, 
          updated_at: new Date().toISOString(),
        }).eq('id', user.id);

      if (error) throw error;
      
      setSlug(finalSlug);
      alert("✅ Felicitări! Adresa ta unică a fost rezervată cu succes.");
    } catch (err: any) {
      alert("Eroare: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmPassword = async () => {
    if (isDemo) return;
    if (!pass1 || pass1 !== pass2) { alert("Parolele nu coincid!"); return; }
    setUpdating(true);
    const { error } = await supabase.auth.updateUser({ password: pass1 });
    if (error) alert(error.message);
    else { alert("✅ Parola actualizată!"); setShowPassModal(false); setPass1(""); setPass2(""); }
    setUpdating(false);
  };

  const handleUploadAvatar = async (event: any) => {
    if (!event.target.files?.[0] || isDemo) return;
    setUpdating(true);
    try {
      const file = event.target.files[0];
      const filePath = `avatars/${user.id}-${Date.now()}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
    } catch (err: any) {
      alert("Eroare avatar: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOut = async () => {
    if (isDemo) { localStorage.removeItem("chronos_demo"); window.location.href = "/login"; return; }
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (!isClient || loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
      <div className="w-12 h-12 border-4 border-slate-800 border-t-amber-500 rounded-full animate-spin mb-4"></div>
      <p className="italic font-black text-amber-500/80 animate-pulse uppercase tracking-[0.3em] text-[10px]">Sincronizare Profil...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto bg-white rounded-[50px] shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 p-12 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] -mr-32 -mt-32 z-0"></div>
          
          <div className="relative w-40 h-40 shrink-0 group z-10">
            <div className="w-full h-full rounded-[45px] overflow-hidden border-4 border-slate-800 bg-slate-800 flex items-center justify-center shadow-2xl relative">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Avatar" fill style={{ objectFit: 'cover' }} />
              ) : (
                <span className="text-6xl opacity-10">👤</span>
              )}
            </div>
            {!isDemo && (
              <label className="absolute inset-0 flex items-center justify-center bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-all cursor-pointer rounded-[45px] m-1 z-20">
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadAvatar} />
                <span className="text-[10px] font-black text-amber-500 uppercase italic">Schimbă</span>
              </label>
            )}
          </div>

          <div className="flex-1 text-center md:text-left z-10">
            <div className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-4 text-amber-500 text-[9px] font-black uppercase tracking-[0.4em] italic">
                {isDemo ? "MOD VIZUALIZARE" : `ID: ${user?.id?.substring(0, 8)}`}
            </div>
            <h1 className="text-5xl font-black text-white uppercase italic tracking-tighter leading-none mb-2 min-h-[1em]">
              {nume}
            </h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest italic min-h-[1.2em]">
              {functie}
            </p>
          </div>

          <div className="flex flex-col gap-4 z-10">
            <button 
              onClick={handleUpdateAll} 
              disabled={updating || isDemo} 
              className={`px-10 py-4 text-[11px] font-black rounded-2xl uppercase italic transition-all border-b-8 ${isDemo ? 'bg-slate-700 text-slate-500 border-slate-800' : 'bg-amber-500 text-slate-900 border-amber-700 hover:bg-white'}`}
            >
              {updating ? "Așteaptă..." : "Salvează"}
            </button>
            <button onClick={handleSignOut} className="px-10 py-4 bg-slate-800 text-slate-400 text-[11px] font-black rounded-2xl uppercase italic border-b-8 border-slate-700 hover:bg-red-600 hover:text-white transition-all">
              {isDemo ? "Ieșire Demo" : "Deconectare"}
            </button>
          </div>
        </div>

        {/* Plan Section */}
        <div className="px-12 py-8 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-xl border border-slate-100 text-3xl">💎</div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase italic">Nivel Licență Activ</p>
              <h3 className={`text-2xl font-black italic uppercase ${LIMITE_ABONAMENTE[subscriptionPlan.toLowerCase()]?.culoare || 'text-slate-400'}`}>
                {LIMITE_ABONAMENTE[subscriptionPlan.toLowerCase()]?.nume || "START"} 
                {(isTrialActive || subscriptionPlan.includes("trial")) && (
                  <span className="ml-2 text-[10px] text-amber-600 animate-pulse">(TRIAL)</span>
                )}
              </h3>
              <p className="text-[10px] font-bold text-slate-500 italic uppercase">Limită: {LIMITE_ABONAMENTE[subscriptionPlan.toLowerCase()]?.limita || "50"}</p>
            </div>
          </div>
          <button onClick={() => router.push('/abonamente')} className="px-8 py-4 bg-slate-900 text-white text-[10px] font-black rounded-2xl uppercase italic hover:bg-amber-500 hover:text-slate-900 border-b-8 border-slate-800 transition-all">
            Schimbă Abonamentul
          </button>
        </div>

        {/* Input fields */}
        <div className="p-12 space-y-12 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {[
              { label: "Nume Complet", val: nume, set: setNume, icon: "👤", editable: !isDemo },
              { label: "Email", val: email, set: null, icon: "✉️", editable: false },
              { label: "Telefon", val: telefon, set: setTelefon, icon: "📱", editable: !isDemo },
              { label: "Rol", val: functie, set: setFunctie, icon: "💼", editable: !isDemo },
            ].map((item, idx) => (
              <div key={idx} className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 italic flex items-center gap-2">
                  {item.icon} {item.label}
                </label>
                <input 
                  type="text" 
                  value={item.val} 
                  onChange={item.set && item.editable ? (e) => item.set!(e.target.value) : undefined}
                  readOnly={!item.editable}
                  className={`w-full p-6 rounded-[25px] font-bold text-sm outline-none transition-all ${item.editable ? 'bg-slate-50 border-2 border-slate-100 focus:border-amber-500 focus:bg-white' : 'bg-slate-100 text-slate-600 italic'}`}
                />
              </div>
            ))}
          </div>

          {/* SECȚIUNEA SPECIALĂ PENTRU SLUG CU BUTON DE ACTIVARE */}
          <div className="bg-amber-50/30 p-8 md:p-10 rounded-[40px] border-2 border-dashed border-amber-200 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end gap-6">
              <div className="flex-1 space-y-3">
                <label className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] ml-4 italic flex items-center gap-2">
                  🔗 ADRESA TA UNICĂ DE REZERVARE (SLUG)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-6 text-slate-400 font-bold text-xs italic">/rezervare/</span>
                  <input 
                    type="text" 
                    placeholder="nume-afacere"
                    value={slug} 
                    onChange={(e) => setSlug(formatSlug(e.target.value))}
                    readOnly={isDemo}
                    className={`w-full p-6 pl-28 rounded-[25px] font-black text-sm outline-none transition-all ${!isDemo ? 'bg-white border-2 border-amber-100 focus:border-amber-500' : 'bg-slate-100 text-slate-600 italic'}`}
                  />
                </div>
              </div>
              
              <button 
                onClick={handleUpdateSlug}
                disabled={updating || isDemo}
                className="px-10 py-6 bg-slate-900 text-amber-500 text-[10px] font-black rounded-[25px] uppercase italic border-b-8 border-slate-800 hover:bg-amber-500 hover:text-white transition-all shadow-xl"
              >
                {updating ? "Se verifică..." : "Rezervă Link Unic"}
              </button>
            </div>
            
            <p className="ml-6 text-[9px] text-slate-400 italic">
              *Atenție: Aceasta este adresa pe care o vei trimite clienților tăi. Verifică disponibilitatea apăsând butonul de mai sus.
            </p>
          </div>
          
          <div className="pt-6 border-t border-slate-50 flex justify-center">
            <button 
              onClick={() => { if(!isDemo) setShowPassModal(true); else alert("🔒 Dezactivat în Demo."); }} 
              className="flex items-center gap-4 px-8 py-4 rounded-full text-[11px] font-black uppercase italic transition-all bg-slate-50 text-slate-500 hover:text-amber-600 border border-transparent hover:border-amber-200"
            >
              🔒 Schimbă parola de acces
            </button>
          </div>
        </div>
      </div>

      {/* Modal Parolă */}
      {showPassModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200] flex items-center justify-center p-6" onClick={() => setShowPassModal(false)}>
          <div className="bg-white w-full max-w-sm rounded-[50px] p-12 shadow-2xl space-y-10 border border-slate-100 relative" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <h2 className="text-3xl font-black text-slate-900 uppercase italic">Securitate</h2>
            </div>
            <div className="space-y-4">
              <input type="password" placeholder="PAROLĂ NOUĂ" value={pass1} onChange={(e) => setPass1(e.target.value)} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[25px] font-bold text-center" />
              <input type="password" placeholder="CONFIRMĂ" value={pass2} onChange={(e) => setPass2(e.target.value)} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[25px] font-bold text-center" />
            </div>
            <button onClick={handleConfirmPassword} className="w-full py-6 bg-slate-900 text-amber-500 rounded-[25px] font-black text-[12px] uppercase italic border-b-8 border-slate-800 hover:bg-amber-500 hover:text-white transition-all">
              {updating ? "..." : "Actualizează"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}