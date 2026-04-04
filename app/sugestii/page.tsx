"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const globalForSupabase = global as unknown as { supabase: ReturnType<typeof createClient> };
export const supabase = globalForSupabase.supabase || createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
if (process.env.NODE_ENV !== "production") globalForSupabase.supabase = supabase;

export default function PareriClienti() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [nouaRecenzie, setNouaRecenzie] = useState(false); 
  
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [nume, setNume] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [seIncarca, setSeIncarca] = useState(false);
  const [trimis, setTrimis] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [textEditat, setTextEditat] = useState("");
  const [raspunsAdmin, setRaspunsAdmin] = useState("");

  const successPopupRef = useRef<HTMLDivElement>(null);
  const adminIdRef = useRef<string | null>(null); 

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setIsLoggedIn(true);
        setCurrentAdminId(session.user.id);
        adminIdRef.current = session.user.id;
        preiaFeedback(session.user.id, true);
      } else {
        setIsLoggedIn(false);
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get("id");
        if (urlId) {
          adminIdRef.current = urlId;
          preiaFeedback(urlId, false);
        }
      }
    };
    checkUser();

    const handleClickOutside = (event: MouseEvent) => {
      if (successPopupRef.current && !successPopupRef.current.contains(event.target as Node)) {
        setTrimis(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    const channel = supabase
      .channel("feedbacks-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "feedbacks" },
        (payload) => {
          const newFeedback = payload.new as any;
          if (newFeedback.admin_id === adminIdRef.current) {
            setFeedbacks((prev) => [newFeedback, ...prev]);
            setNouaRecenzie(true); 
            setTimeout(() => setNouaRecenzie(false), 4000);
          }
        }
      )
      .subscribe();

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      supabase.removeChannel(channel);
    };
  }, []);

  const preiaFeedback = async (adminId: string, isAdmin = true) => {
    try {
      let query = supabase
        .from("feedbacks")
        .select("*")
        .eq("admin_id", adminId);
      
      if (!isAdmin) {
        query = query.eq("aprobat", true);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      
      if (error) throw error;
      if (data) setFeedbacks(data);
    } catch (err) {
      console.error("Eroare la preluare feedback:", err);
    }
  };

  const trimiteFeedback = async () => {
    if (rating === 0) return alert("Alege numărul de stele!");
    if (!nume.trim()) return alert("Introdu numele!");
    if (!mesaj.trim()) return alert("Scrie un mesaj!");

    const targetAdminId = currentAdminId || new URLSearchParams(window.location.search).get("id");
    
    if (!targetAdminId) {
      return alert("Lipsește ID-ul utilizatorului.");
    }

    setSeIncarca(true);
    try {
      const { error } = await (supabase.from("feedbacks") as any).insert([
        { 
          nume_client: nume, 
          stele: rating, 
          comentariu: mesaj, 
          aprobat: isLoggedIn,
          admin_id: targetAdminId
        }
      ]);

      if (error) {
        alert("Eroare: " + error.message);
      } else {
        setTrimis(true);
        setNume(""); 
        setMesaj(""); 
        setRating(0);
        setTimeout(() => setTrimis(false), 5000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSeIncarca(false);
    }
  };

  const intraInModEditare = (f: any) => {
    setEditId(f.id);
    setTextEditat(f.comentariu);
    setRaspunsAdmin(f.raspuns_admin || "");
  };

  const salveazaModificariAdmin = async (id: string) => {
    if (!currentAdminId) return;

    const { error } = await (supabase.from("feedbacks") as any)
      .update({ 
        comentariu: textEditat,
        raspuns_admin: raspunsAdmin,
        aprobat: true 
      })
      .eq("id", id)
      .eq("admin_id", currentAdminId); 
    
    if (error) {
      alert("Eroare: " + error.message);
    } else {
      setEditId(null);
      await preiaFeedback(currentAdminId, true);
    }
  };

  const aprobaRapid = async (id: string) => {
    if (!currentAdminId) return;

    const { error } = await (supabase.from("feedbacks") as any)
      .update({ aprobat: true })
      .eq("id", id)
      .eq("admin_id", currentAdminId); 
    
    if (!error) await preiaFeedback(currentAdminId, true);
  };

  const stergeFeedback = async (id: string) => {
    if (!currentAdminId) return;

    if (!confirm("Sigur vrei să ștergi definitiv această recenzie?")) return;
    const { error } = await (supabase.from("feedbacks") as any)
      .delete()
      .eq("id", id)
      .eq("admin_id", currentAdminId); 
    
    if (!error) await preiaFeedback(currentAdminId, true);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">

        {/* 🔔 NOTIFICARE REALTIME */}
        {nouaRecenzie && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl font-black uppercase italic text-[11px] tracking-widest animate-bounce">
            ✨ Recenzie nouă primită!
          </div>
        )}
        
        {/* HEADER COMPACT: LOGO + TITLU + BUTON */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10 bg-white p-6 rounded-[35px] shadow-sm border border-slate-100">
          <div className="flex items-center gap-6">
            <img src="/logo-chronos.png" alt="Logo Chronos" style={{ width: "120px", height: "auto" }} />
            <h1 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
              Gestionare <span className="text-amber-600">Recenzii</span>
            </h1>
          </div>
          
          <Link href="/rezervare" className="inline-flex items-center gap-2 text-slate-900 font-black uppercase italic text-[9px] tracking-widest hover:text-amber-600 transition-all py-3 px-6 bg-white border-2 border-slate-900 rounded-xl shadow-sm border-b-4 border-slate-900 active:translate-y-1 active:border-b-0">
            Panou Principal →
          </Link>
        </div>

        {/* FORMULAR DE INTRODUCERE */}
        <div className="max-w-xl mx-auto mb-16 bg-white p-10 rounded-[50px] shadow-2xl border-2 border-slate-100 relative">
          {trimis && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 text-center p-8 rounded-[50px]">
              <div ref={successPopupRef} className="flex flex-col items-center">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mb-6">✓</div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Recenzie Salvată!</h2>
                <button onClick={() => setTrimis(false)} className="mt-8 text-[9px] font-black uppercase underline tracking-widest text-slate-400">Închide</button>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-3 mb-10">
            {[1, 2, 3, 4, 5].map((star) => (
              <button 
                key={star} 
                title={`Acordă ${star} stele`}
                className={`text-4xl transition-all ${star <= (hover || rating) ? "scale-125 rotate-6" : "grayscale opacity-20"}`}
                onClick={() => setRating(star)} 
                onMouseEnter={() => setHover(star)} 
                onMouseLeave={() => setHover(0)}
              >
                ⭐
              </button>
            ))}
          </div>

          <div className="space-y-5">
            <input 
              type="text" 
              placeholder="NUME CLIENT" 
              className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[25px] font-black outline-none focus:border-amber-500 text-xs tracking-wider uppercase italic"
              value={nume} 
              onChange={(e) => setNume(e.target.value)} 
            />
            <textarea 
              placeholder="MESAJUL RECENZIEI..." 
              rows={4} 
              className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[25px] font-bold outline-none focus:border-amber-500 resize-none text-xs italic"
              value={mesaj} 
              onChange={(e) => setMesaj(e.target.value)} 
            />
            <button 
              onClick={trimiteFeedback} 
              disabled={seIncarca} 
              title="Apasă pentru a trimite recenzia"
              className="w-full py-6 rounded-[25px] bg-slate-900 text-white font-black uppercase italic tracking-widest text-[11px] shadow-xl border-b-8 border-slate-800 active:translate-y-1 active:border-b-0 hover:bg-amber-600"
            >
              {seIncarca ? "SE SALVEAZĂ..." : "Adaugă Recenzia"}
            </button>
          </div>
        </div>

        {/* LISTA DE RECENZII */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
          {feedbacks.length === 0 && (
            <div className="col-span-full text-center py-20 opacity-30">
              <p className="font-black uppercase italic tracking-widest text-xs">Nu există recenzii de afișat.</p>
            </div>
          )}
          {feedbacks.map((f) => (
            <div key={f.id} className={`break-inside-avoid p-10 rounded-[45px] border-2 shadow-sm transition-all group relative flex flex-col ${f.aprobat ? 'bg-white border-slate-50 hover:shadow-2xl' : 'bg-amber-50/50 border-amber-200 border-dashed shadow-inner'}`}>
              
              {isLoggedIn && (
                <div className="absolute top-6 right-6 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all z-20">
                  {!f.aprobat && (
                    <button onClick={() => aprobaRapid(f.id)} title="Aprobă rapid această recenzie" className="bg-emerald-500 text-white p-3 rounded-2xl text-[9px] font-black uppercase shadow-lg hover:scale-105 transition-transform">Aprobă</button>
                  )}
                  <button onClick={() => intraInModEditare(f)} title="Editează conținutul sau răspunde" className="bg-slate-900 text-white p-3 rounded-2xl text-[9px] font-black uppercase shadow-lg hover:scale-105 transition-transform">Edit</button>
                  <button onClick={() => stergeFeedback(f.id)} title="Șterge definitiv recenzia" className="bg-red-500 text-white p-3 rounded-2xl text-[9px] font-black uppercase shadow-lg hover:scale-105 transition-transform">Șterge</button>
                </div>
              )}

              <div className="flex gap-1 mb-6">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <span key={idx} className={`text-sm ${idx < f.stele ? 'filter-none' : 'grayscale opacity-20'}`}>⭐</span>
                ))}
                {!f.aprobat && (
                  <span className="ml-4 bg-amber-500 text-white text-[7px] px-3 py-1 rounded-full font-black uppercase italic animate-pulse">Needs Approval</span>
                )}
              </div>
              
              {editId === f.id ? (
                <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border-4 border-amber-500">
                  <textarea className="w-full p-3 text-xs font-bold rounded-xl border-2 outline-none" value={textEditat} onChange={(e) => setTextEditat(e.target.value)} />
                  <textarea className="w-full p-3 text-xs font-bold rounded-xl border-2 border-amber-200 bg-amber-50 outline-none" placeholder="Răspuns..." value={raspunsAdmin} onChange={(e) => setRaspunsAdmin(e.target.value)} />
                  <div className="flex gap-2">
                    <button onClick={() => salveazaModificariAdmin(f.id)} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black text-[9px] uppercase">Confirmă</button>
                    <button onClick={() => setEditId(null)} className="flex-1 bg-white text-slate-400 py-3 rounded-xl font-black text-[9px] uppercase border-2">X</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-slate-700 font-bold italic leading-relaxed mb-8 text-sm">
                    {f.comentariu}
                  </p>
                  {f.raspuns_admin && (
                    <div className="mb-8 p-6 bg-slate-900 rounded-[30px] border-b-4 border-amber-600">
                      <p className="text-amber-500 font-black uppercase text-[8px] tracking-[0.3em] mb-2 italic">Răspuns Chronos:</p>
                      <p className="text-white text-xs font-medium italic leading-relaxed">{f.raspuns_admin}</p>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center gap-4 border-t border-slate-50 pt-6 mt-auto">
                <div className="w-12 h-12 bg-slate-900 text-amber-500 flex items-center justify-center rounded-2xl font-black italic text-lg shadow-md">
                  {f.nume_client?.charAt(0).toUpperCase() || "C"}
                </div>
                <div className="flex flex-col">
                  <span className="font-black uppercase text-[11px] tracking-widest text-slate-900 italic">{f.nume_client}</span>
                  <span className="text-[8px] font-black text-slate-300 uppercase">
                    {f.created_at ? new Date(f.created_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric'}) : "Postat recent"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}