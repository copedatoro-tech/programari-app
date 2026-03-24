"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Image from "next/image";

const SUPABASE_URL = "https://zzrubdbngjfwurdwxtwf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6cnViZGJuZ2pmd3VyZHd4dHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDkyMTgsImV4cCI6MjA4ODQ4NTIxOH0.6uw6yzCs5OfCP7xqWshzPQP36bCPxi2LU0QtpwsvnOo";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function ProfilPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);

  const router = useRouter();

  // Date Profil Esențiale
  const [nume, setNume] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [functie, setFunctie] = useState(""); 
  const [avatarUrl, setAvatarUrl] = useState("");

  const [pass1, setPass1] = useState("");
  const [pass2, setPass2] = useState("");

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          setNume(profile.full_name || "");
          setEmail(profile.email || user.email || "");
          setTelefon(profile.phone || "");
          setFunctie(profile.role || "Administrator");
          setAvatarUrl(profile.avatar_url || "");
        }
      }
      setLoading(false);
    };
    getUserData();
  }, [router]);

  const handleUpdateAll = async () => {
    setUpdating(true);
    try {
      if (email !== user.email) {
        await supabase.auth.updateUser({ email: email });
      }

      const { error: profileError } = await supabase.from('profiles').upsert({ 
          id: user.id, 
          full_name: nume, 
          avatar_url: avatarUrl, 
          email: email, 
          phone: telefon,
          role: functie,
          updated_at: new Date().toISOString(),
        });

      if (profileError) alert("Eroare la salvare: " + profileError.message);
      else alert("✅ Profilul a fost actualizat cu succes!");
    } catch (err) {
      alert("A apărut o eroare neașteptată.");
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmPassword = async () => {
    if (pass1 !== pass2) { alert("Parolele nu coincid!"); return; }
    setUpdating(true);
    const { error } = await supabase.auth.updateUser({ password: pass1 });
    if (error) alert(error.message);
    else { alert("Parolă actualizată!"); setShowPassModal(false); }
    setUpdating(false);
  };

  const handleUploadAvatar = async (event: any) => {
    if (!event.target.files || event.target.files.length === 0) return;
    setUpdating(true);
    const file = event.target.files[0];
    const fileName = `avatar-${user.id}-${Date.now()}`;
    
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
    
    if (uploadError) {
      alert("Eroare upload: " + uploadError.message);
    } else {
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setAvatarUrl(data.publicUrl);
    }
    setUpdating(false);
  };

  if (loading) return <div className="p-20 text-center font-black text-slate-400 animate-pulse italic uppercase tracking-[0.2em]">Sincronizare cont...</div>;

  return (
    <main className="min-h-screen bg-slate-100 py-10 px-4 font-sans space-y-8">
      
      <div className="max-w-2xl mx-auto bg-white rounded-[40px] shadow-xl border border-slate-200 overflow-hidden">
        {/* Header Profil */}
        <div className="bg-slate-900 p-8 flex items-center gap-6">
          <div className="relative w-24 h-24 shrink-0 group">
            <div className="w-full h-full rounded-[30px] overflow-hidden border-2 border-amber-500 bg-slate-800 relative shadow-2xl flex items-center justify-center">
              {avatarUrl ? <Image src={avatarUrl} alt="Profil" fill className="object-cover" /> : <div className="text-4xl">👤</div>}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-all cursor-pointer rounded-[30px] m-0.5">
              <input type="file" accept="image/*" className="hidden" onChange={handleUploadAvatar} disabled={updating} />
              <span className="text-[9px] font-black text-white uppercase text-center">Modifică Foto</span>
            </label>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">
                {nume || "Utilizator"}
            </h1>
            <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2 italic flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
              {functie || "Administrator"}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button 
              onClick={handleUpdateAll} 
              disabled={updating}
              className="px-5 py-2.5 bg-amber-600 text-white text-[9px] font-black rounded-2xl border border-amber-700 hover:bg-amber-500 transition-all uppercase italic shadow-lg"
            >
              {updating ? "SALVARE..." : "Salvează Profil"}
            </button>
            <button onClick={() => setShowPassModal(true)} className="px-5 py-2.5 bg-slate-800 text-white text-[9px] font-black rounded-2xl border border-slate-700 hover:bg-slate-700 transition-all uppercase italic">Schimbă Parola</button>
          </div>
        </div>

        {/* Formular Date Esențiale */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nume Complet</label>
            <input type="text" value={nume} onChange={(e) => setNume(e.target.value)} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-amber-500 transition-all" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-amber-500" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Telefon</label>
            <input type="text" value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder="07xx xxx xxx" className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-amber-500" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Funcție în cadrul afacerii</label>
            <input type="text" value={functie} onChange={(e) => setFunctie(e.target.value)} placeholder="Ex: Manager, Mecanic Șef, Stilist..." className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-amber-500" />
          </div>
        </div>
      </div>

      {/* Modal Parolă */}
      {showPassModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setShowPassModal(false)}>
          <div className="bg-white w-full max-w-sm rounded-[50px] p-10 shadow-2xl space-y-6 border border-slate-100" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter text-center">Schimbă Parola</h2>
            <input type="password" value={pass1} onChange={(e) => setPass1(e.target.value)} placeholder="PAROLĂ NOUĂ" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[25px] font-bold outline-none focus:border-amber-500 shadow-inner" />
            <input type="password" value={pass2} onChange={(e) => setPass2(e.target.value)} placeholder="CONFIRMĂ" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[25px] font-bold outline-none focus:border-amber-500 shadow-inner" />
            <button onClick={handleConfirmPassword} className="w-full py-5 bg-slate-900 text-white rounded-[25px] font-black text-xs uppercase italic tracking-[0.2em] shadow-xl">ACTUALIZEAZĂ</button>
            <button onClick={() => setShowPassModal(false)} className="w-full text-slate-400 font-black text-[10px] uppercase italic text-center block">Anulează</button>
          </div>
        </div>
      )}

    </main>
  );
}