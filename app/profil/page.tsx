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
  
  // State-uri pentru Modale
  const [showServiciiModal, setShowServiciiModal] = useState(false);
  const [showEchipaModal, setShowEchipaModal] = useState(false);
  const [showDomeniuModal, setShowDomeniuModal] = useState(false);

  const router = useRouter();

  // Date Profil (Identitate)
  const [nume, setNume] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [functie, setFunctie] = useState(""); // Ex: Patron, Manager
  const [avatarUrl, setAvatarUrl] = useState("");

  // Date Organizare Business (Domenii multiple)
  const [sectoare, setSectoare] = useState<string[]>([]); 
  const [noulSector, setNoulSector] = useState("");
  
  // Servicii: { nume, pret, durata }
  const [servicii, setServicii] = useState<any[]>([]);
  const [noulServiciu, setNoulServiciu] = useState("");
  const [pretServiciu, setPretServiciu] = useState("");
  // Modificare durata: separare ore si minute
  const [oreServiciu, setOreServiciu] = useState("0");
  const [minuteServiciu, setMinuteServiciu] = useState("30");

  // Staff: { nume, poza }
  const [staff, setStaff] = useState<any[]>([]);
  const [noulMembru, setNoulMembru] = useState("");

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
          
          if (Array.isArray(profile.category)) {
            setSectoare(profile.category);
          } else if (profile.category) {
            setSectoare([profile.category]);
          } else {
            setSectoare([]);
          }

          if (Array.isArray(profile.services)) {
            const mappedServices = profile.services.map((s: any) => {
              if (typeof s === 'string') return { nume: s, pret: "0 RON", durata: "30 min" };
              return {
                nume: s.nume || "Serviciu fără nume",
                pret: s.pret || "0 RON",
                durata: s.durata || "30 min"
              };
            });
            setServicii(mappedServices);
          } else {
            setServicii([]);
          }

          setStaff(Array.isArray(profile.staff) ? profile.staff : []);
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
          category: sectoare, 
          services: servicii, 
          staff: staff,
          updated_at: new Date().toISOString(),
        });

      if (profileError) alert("Eroare la salvare: " + profileError.message);
      else alert("✅ Toate modificările au fost salvate!");
    } catch (err) {
      alert("A apărut o eroare neașteptată.");
    } finally {
      setUpdating(false);
    }
  };

  const adaugaDomeniu = () => {
    if (noulSector.trim()) {
      setSectoare([...sectoare, noulSector.trim()]);
      setNoulSector("");
    }
  };

  const adaugaServiciu = () => { 
    if (noulServiciu.trim()) { 
      let durataText = "";
      const h = parseInt(oreServiciu);
      const m = parseInt(minuteServiciu);

      if (h > 0) {
        durataText = `${h} h ${m > 0 ? m + " min" : ""}`;
      } else {
        durataText = `${m} min`;
      }

      const item = { 
        nume: noulServiciu.trim(), 
        pret: pretServiciu || "0 RON", 
        durata: durataText 
      };

      setServicii([...servicii, item]); 
      setNoulServiciu(""); 
      setPretServiciu("");
      setOreServiciu("0");
      setMinuteServiciu("30");
    } 
  };

  const adaugaStaff = () => { 
    if (noulMembru.trim()) { 
      setStaff([...staff, { nume: noulMembru.trim(), poza: "" }]); 
      setNoulMembru(""); 
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
      alert("Eroare upload: " + uploadError.message + ". Asigură-te că ai creat bucket-ul 'avatars' în Supabase!");
    } else {
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setAvatarUrl(data.publicUrl);
    }
    setUpdating(false);
  };

  const handleUploadStaffPoza = async (event: any, index: number) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    const fileName = `staff-${index}-${Date.now()}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
    
    if (!uploadError) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const newStaff = [...staff];
      newStaff[index].poza = data.publicUrl;
      setStaff(newStaff);
    } else {
        alert("Eroare upload staff: " + uploadError.message);
    }
  };

  if (loading) return <div className="p-20 text-center font-black text-slate-400 animate-pulse italic uppercase tracking-[0.2em]">Sincronizare cont...</div>;

  return (
    <main className="min-h-screen bg-slate-100 py-10 px-4 font-sans space-y-8">
      
      <style jsx global>{`
        .custom-scroll {
          scrollbar-width: thin;
          scrollbar-color: #f59e0b #f1f5f9;
        }
        .custom-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background-color: #f59e0b;
          border-radius: 10px;
        }
      `}</style>

      {/* --- SECTIUNEA 1: IDENTITATE VIZUALĂ --- */}
      <div className="max-w-2xl mx-auto bg-white rounded-[40px] shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 p-8 flex items-center gap-6">
          <div className="relative w-24 h-24 shrink-0 group">
            <div className="w-full h-full rounded-[30px] overflow-hidden border-2 border-amber-500 bg-slate-800 relative shadow-2xl flex items-center justify-center">
              {avatarUrl ? <Image src={avatarUrl} alt="Profil" fill className="object-cover" /> : <div className="text-4xl">👤</div>}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-all cursor-pointer rounded-[30px] m-0.5">
              <input type="file" accept="image/*" className="hidden" onChange={handleUploadAvatar} disabled={updating} />
              <span className="text-[9px] font-black text-white uppercase text-center">Modifică</span>
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

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nume Complet</label>
            <input 
              type="text" 
              value={nume} 
              onChange={(e) => setNume(e.target.value)} 
              className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-amber-500 transition-all" 
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-amber-500" 
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Telefon</label>
            <input 
              type="text" 
              value={telefon} 
              onChange={(e) => setTelefon(e.target.value)} 
              placeholder="07xx xxx xxx"
              className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-amber-500" 
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Funcție / Rol</label>
            <input 
              type="text" 
              value={functie} 
              onChange={(e) => setFunctie(e.target.value)} 
              placeholder="Ex: Patron, Manager..."
              className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-amber-500" 
            />
          </div>
        </div>
      </div>

      {/* --- SECTIUNEA 2: MANAGEMENT OPERATIV --- */}
      <div className="max-w-2xl mx-auto bg-white rounded-[40px] shadow-xl border border-slate-200 overflow-hidden p-8 space-y-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-6">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Management Operativ</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Organizarea internă a structurii firmei</p>
          </div>
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl shadow-inner">🏢</div>
        </div>

        <div className="flex flex-col gap-4">
          <button onClick={() => setShowDomeniuModal(true)} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[35px] flex items-center gap-6 hover:border-amber-500 transition-all group shadow-sm">
            <span className="text-3xl group-hover:rotate-12 transition-transform">🎯</span>
            <div className="text-left flex-1">
              <p className="text-[10px] font-black text-slate-900 uppercase italic">Domenii de Activitate</p>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                {sectoare.length} Sectoare salvate
              </p>
            </div>
            <span className="text-slate-300">❯</span>
          </button>

          <button onClick={() => setShowServiciiModal(true)} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[35px] flex items-center gap-6 hover:border-amber-500 transition-all group shadow-sm">
            <span className="text-3xl group-hover:rotate-12 transition-transform">🛠️</span>
            <div className="text-left flex-1">
              <p className="text-[10px] font-black text-slate-900 uppercase italic">Management Servicii</p>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{servicii.length} Articole definite</p>
            </div>
            <span className="text-slate-300">❯</span>
          </button>

          <button onClick={() => setShowEchipaModal(true)} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[35px] flex items-center gap-6 hover:border-amber-500 transition-all group shadow-sm">
            <span className="text-3xl group-hover:rotate-12 transition-transform">👥</span>
            <div className="text-left flex-1">
              <p className="text-[10px] font-black text-slate-900 uppercase italic">Organizare Staff</p>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{staff.length} Membri în echipă</p>
            </div>
            <span className="text-slate-300">❯</span>
          </button>
        </div>

        <button onClick={handleUpdateAll} disabled={updating} className="w-full py-6 bg-amber-600 text-white rounded-[35px] font-black text-xs uppercase tracking-[0.4em] italic shadow-2xl hover:bg-slate-900 transition-all active:scale-95 border-b-4 border-amber-800 hover:border-slate-700">
          {updating ? "SALVARE ÎN CURS..." : "SALVEAZĂ TOATE MODIFICĂRILE ✨"}
        </button>
      </div>

      {/* --- MODAL DOMENIU (MODELUL DE BAZĂ) --- */}
      {showDomeniuModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[45px] p-8 shadow-2xl space-y-6 border border-slate-100 flex flex-col h-full max-h-[550px]">
            <div className="text-center space-y-2 shrink-0">
                <span className="text-4xl">🎯</span>
                <h2 className="text-xl font-black text-slate-900 uppercase italic">Domenii Activitate</h2>
            </div>
            
            <div className="flex gap-2 shrink-0">
              <input 
                type="text" 
                value={noulSector} 
                onChange={(e) => setNoulSector(e.target.value)} 
                placeholder="Ex: Coafor..." 
                className="flex-1 p-5 bg-slate-50 border-2 border-slate-100 rounded-[25px] font-bold text-sm outline-none focus:border-amber-500 shadow-inner" 
              />
              <button onClick={adaugaDomeniu} className="px-6 bg-slate-900 text-amber-500 rounded-[20px] font-black text-xl">+</button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll pr-2 space-y-2">
                {sectoare.map((cat, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="font-bold text-xs uppercase italic text-slate-700">{cat}</span>
                    <button onClick={() => setSectoare(sectoare.filter((_, i) => i !== idx))} className="text-red-500 font-bold px-2">✕</button>
                  </div>
                ))}
            </div>

            <button onClick={() => setShowDomeniuModal(false)} className="w-full shrink-0 py-4 bg-slate-900 text-amber-500 rounded-[25px] font-black text-[10px] uppercase italic tracking-widest">CONFIRMĂ</button>
          </div>
        </div>
      )}

      {/* --- MODAL SERVICII (OPTIMIZAT PENTRU ECRAN) --- */}
      {showServiciiModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[45px] p-8 shadow-2xl space-y-6 border border-slate-100 flex flex-col h-full max-h-[680px]">
            <div className="text-center space-y-2 shrink-0">
                <span className="text-4xl">🛠️</span>
                <h2 className="text-xl font-black text-slate-900 uppercase italic">Management Servicii</h2>
            </div>
            
            <div className="space-y-3 shrink-0">
              <input 
                type="text" 
                value={noulServiciu} 
                onChange={(e) => setNoulServiciu(e.target.value)} 
                placeholder="Denumire serviciu..." 
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[25px] font-bold text-sm outline-none focus:border-amber-500 shadow-inner" 
              />
              <div className="flex gap-2">
                <input 
                    type="text" 
                    value={pretServiciu} 
                    onChange={(e) => setPretServiciu(e.target.value)} 
                    placeholder="Preț (RON)" 
                    className="flex-1 p-4 bg-slate-50 border-2 border-slate-100 rounded-[20px] font-bold text-xs outline-none focus:border-amber-500 shadow-inner" 
                />
                <select value={oreServiciu} onChange={(e) => setOreServiciu(e.target.value)} className="w-20 p-4 bg-slate-50 border-2 border-slate-100 rounded-[20px] font-bold text-xs outline-none">
                    {[...Array(6)].map((_, i) => <option key={i} value={i}>{i}h</option>)}
                </select>
                <select value={minuteServiciu} onChange={(e) => setMinuteServiciu(e.target.value)} className="w-20 p-4 bg-slate-50 border-2 border-slate-100 rounded-[20px] font-bold text-xs outline-none">
                    {["00", "15", "30", "45"].map((m) => <option key={m} value={m}>{m}m</option>)}
                </select>
              </div>
              <button 
                onClick={adaugaServiciu} 
                className="w-full py-4 bg-slate-900 text-white rounded-[20px] font-black text-[10px] uppercase italic tracking-widest hover:bg-amber-600 transition-colors"
              >
                + ADAUGĂ SERVICIU ÎN LISTĂ
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll pr-2 space-y-2">
                {servicii.map((s, i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                        <span className="font-bold text-xs uppercase italic text-slate-700 block">{s.nume}</span>
                        <span className="text-[10px] font-black text-amber-600 uppercase italic">{s.pret} • {s.durata}</span>
                    </div>
                    <button onClick={() => setServicii(servicii.filter((_, idx) => idx !== i))} className="text-red-500 font-bold px-2">✕</button>
                  </div>
                ))}
            </div>

            <button onClick={() => setShowServiciiModal(false)} className="w-full shrink-0 py-4 bg-amber-600 text-white rounded-[25px] font-black text-[10px] uppercase italic tracking-widest shadow-lg">CONFIRMĂ</button>
          </div>
        </div>
      )}

      {/* --- MODAL STAFF (UNIFORMIZAT) --- */}
      {showEchipaModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[45px] p-8 shadow-2xl space-y-6 border border-slate-100 flex flex-col h-full max-h-[550px]">
            <div className="text-center space-y-2 shrink-0">
                <span className="text-4xl">👥</span>
                <h2 className="text-xl font-black text-slate-900 uppercase italic">Organizare Staff</h2>
            </div>
            
            <div className="flex gap-2 shrink-0">
              <input 
                type="text" 
                value={noulMembru} 
                onChange={(e) => setNoulMembru(e.target.value)} 
                placeholder="Nume membru..." 
                className="flex-1 p-5 bg-slate-50 border-2 border-slate-100 rounded-[25px] font-bold text-sm outline-none focus:border-amber-500 shadow-inner" 
              />
              <button onClick={adaugaStaff} className="px-6 bg-slate-900 text-amber-500 rounded-[20px] font-black text-xl">+</button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll pr-2 space-y-2">
                {staff.map((p: any, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                        <label className="w-10 h-10 rounded-xl bg-slate-200 overflow-hidden relative border border-amber-500 cursor-pointer shrink-0">
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadStaffPoza(e, i)} />
                            {p.poza ? <Image src={p.poza} alt={p.nume} fill className="object-cover" /> : <div className="flex items-center justify-center h-full text-xs">📸</div>}
                        </label>
                        <span className="font-bold text-xs uppercase italic text-slate-700">{p.nume}</span>
                    </div>
                    <button onClick={() => setStaff(staff.filter((_, idx) => idx !== i))} className="text-red-500 font-bold px-2">✕</button>
                  </div>
                ))}
            </div>

            <button onClick={() => setShowEchipaModal(false)} className="w-full shrink-0 py-4 bg-slate-900 text-amber-500 rounded-[25px] font-black text-[10px] uppercase italic tracking-widest">CONFIRMĂ</button>
          </div>
        </div>
      )}

      {/* --- MODAL SCHIMBĂ PAROLA --- */}
      {showPassModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[50px] p-10 shadow-2xl space-y-6 border border-slate-100">
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