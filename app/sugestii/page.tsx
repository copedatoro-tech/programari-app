"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zzrubdbngjfwurdwxtwf.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6cnViZGJuZ2pmd3VyZHd4dHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDkyMTgsImV4cCI6MjA4ODQ4NTIxOH0.6uw6yzCs5OfCP7xqWshzPQP36bCPxi2LU0QtpwsvnOo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function PareriClienti() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [nume, setNume] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [seIncarca, setSeIncarca] = useState(false);
  const [trimis, setTrimis] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [textEditat, setTextEditat] = useState("");
  const [raspunsAdmin, setRaspunsAdmin] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkUser();
    preiaFeedback();
  }, []);

  const preiaFeedback = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let query = supabase.from("feedbacks").select("*");
      
      if (!session) {
        query = query.eq("aprobat", true);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      if (data) setFeedbacks(data);
    } catch (err) {
      console.error("Eroare la preluare:", err);
    }
  };

  const trimiteFeedback = async () => {
    if (rating === 0) return alert("Te rugăm să alegi numărul de stele!");
    if (!nume.trim()) return alert("Te rugăm să introduci numele!");
    if (!mesaj.trim()) return alert("Te rugăm să scrii un mesaj!");

    setSeIncarca(true);
    
    try {
      const { error } = await supabase.from("feedbacks").insert([
        { 
          nume_client: nume, 
          stele: rating, 
          comentariu: mesaj, 
          aprobat: false 
        }
      ]);

      if (error) {
        alert("Eroare Supabase: " + error.message);
      } else {
        setTrimis(true);
        setNume(""); 
        setMesaj(""); 
        setRating(0);
        await preiaFeedback(); 
        setTimeout(() => setTrimis(false), 3000);
      }
    } catch (err) {
      alert("A apărut o eroare neașteptată.");
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
    const { error } = await supabase
      .from("feedbacks")
      .update({ 
        comentariu: textEditat,
        raspuns_admin: raspunsAdmin,
        aprobat: true 
      })
      .eq("id", id);
    
    if (error) {
      alert("Eroare la salvare: " + error.message);
    } else {
      setEditId(null);
      await preiaFeedback();
    }
  };

  const aprobaRapid = async (id: string) => {
    const { error } = await supabase
      .from("feedbacks")
      .update({ aprobat: true })
      .eq("id", id);
    if (!error) await preiaFeedback();
  };

  const stergeFeedback = async (id: string) => {
    if (!confirm("Sigur vrei să ștergi definitiv această recenzie?")) return;
    const { error } = await supabase.from("feedbacks").delete().eq("id", id);
    if (!error) await preiaFeedback();
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        
        {!isLoggedIn && (
          <div className="mb-8">
            <Link href="/rezervare" title="Înapoi la pagina principală de programări" className="inline-flex items-center gap-2 text-slate-900 font-black uppercase italic text-[10px] tracking-widest hover:text-amber-600 transition-all group py-3 px-6 bg-white border-2 border-slate-900 rounded-2xl shadow-sm border-b-4 border-slate-900 active:translate-y-0.5 active:border-b-0">
              <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
              Înapoi la Rezervări
            </Link>
          </div>
        )}

        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
            Păreri și <span className="text-amber-600">Sugestii</span>
          </h1>
          <div className="flex items-center justify-center gap-4 mt-6">
            <div className="h-[2px] w-12 bg-slate-200"></div>
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] italic">Comunitatea Chronos</p>
            <div className="h-[2px] w-12 bg-slate-200"></div>
          </div>
        </div>

        {/* Formular Feedback */}
        <div className="max-w-xl mx-auto mb-24 bg-white p-10 rounded-[50px] shadow-2xl border-2 border-slate-100 relative overflow-hidden">
          {trimis && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 text-center p-8" onClick={() => setTrimis(false)}>
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner">✓</div>
              <h2 className="text-2xl font-black uppercase italic text-slate-900 tracking-tighter">Mulțumim frumos!</h2>
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-2 bg-amber-50 px-4 py-2 rounded-xl">Recenzia va fi vizibilă după aprobare.</p>
              <button title="Închide mesajul de succes" className="mt-8 text-[9px] font-black uppercase underline tracking-widest text-slate-400">Închide</button>
            </div>
          )}

          <div className="flex justify-center gap-3 mb-10">
            {[1, 2, 3, 4, 5].map((star) => (
              <button 
                key={star} 
                type="button" 
                title={`Acordă ${star} stele`}
                className={`text-4xl transition-all duration-300 ${star <= (hover || rating) ? "scale-125 rotate-6 filter-none" : "grayscale opacity-20 hover:opacity-40"}`}
                onClick={() => setRating(star)} 
                onMouseEnter={() => setHover(star)} 
                onMouseLeave={() => setHover(0)}
              >
                ⭐
              </button>
            ))}
          </div>

          <div className="space-y-5">
            <div className="relative group">
               <input 
                type="text" 
                title="Introdu numele tău complet sau porecla"
                placeholder="NUMELE TĂU" 
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[25px] font-black outline-none focus:border-amber-500 focus:bg-white transition-all text-xs tracking-wider text-slate-900 uppercase italic placeholder:text-slate-300"
                value={nume} 
                onChange={(e) => setNume(e.target.value)} 
              />
            </div>
            <textarea 
              title="Scrie aici experiența ta sau propunerile de îmbunătățire"
              placeholder="CE SUGESTII AI PENTRU NOI?" 
              rows={4} 
              className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[25px] font-bold outline-none focus:border-amber-500 focus:bg-white transition-all resize-none text-xs tracking-wide text-slate-900 italic placeholder:text-slate-300"
              value={mesaj} 
              onChange={(e) => setMesaj(e.target.value)} 
            />
            <button 
              type="button"
              title="Postează recenzia ta pe platformă"
              onClick={(e) => {
                e.preventDefault();
                trimiteFeedback();
              }} 
              disabled={seIncarca} 
              className={`w-full py-5 rounded-[25px] font-black uppercase italic tracking-[0.2em] text-[11px] transition-all shadow-xl active:scale-95 border-b-4 ${seIncarca ? 'bg-slate-300 border-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-amber-600 border-slate-700 hover:border-amber-700'}`}
            >
              {seIncarca ? "SE PROCESEAZĂ..." : "Postează Recenzia"}
            </button>
          </div>
        </div>

        {/* Lista Recenzii */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
          {feedbacks.map((f) => (
            <div key={f.id} className={`break-inside-avoid p-10 rounded-[45px] border-2 shadow-sm transition-all group relative flex flex-col ${f.aprobat ? 'bg-white border-slate-50 hover:shadow-2xl hover:border-amber-100' : 'bg-amber-50/50 border-amber-200 border-dashed'}`}>
              
              {isLoggedIn && (
                <div className="absolute top-6 right-6 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all z-20">
                  {!f.aprobat && (
                    <button title="Aprobă imediat" onClick={() => aprobaRapid(f.id)} className="bg-emerald-500 text-white p-3 rounded-2xl text-[9px] font-black uppercase hover:bg-emerald-600 border-b-4 border-emerald-700 active:translate-y-1 active:border-b-0 shadow-lg">Aprobă</button>
                  )}
                  <button title="Modifică sau răspunde" onClick={() => intraInModEditare(f)} className="bg-slate-900 text-white p-3 rounded-2xl text-[9px] font-black uppercase hover:bg-amber-500 border-b-4 border-slate-700 active:translate-y-1 active:border-b-0 shadow-lg">Edit</button>
                  <button title="Șterge definitiv" onClick={() => stergeFeedback(f.id)} className="bg-red-500 text-white p-3 rounded-2xl text-[9px] font-black uppercase hover:bg-red-600 border-b-4 border-red-700 active:translate-y-1 active:border-b-0 shadow-lg">Delete</button>
                </div>
              )}

              <div className="flex gap-1 mb-6">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <span key={idx} className={`text-sm ${idx < f.stele ? 'filter-none' : 'grayscale opacity-20'}`}>⭐</span>
                ))}
                {!f.aprobat && isLoggedIn && (
                  <span className="ml-4 bg-amber-500 text-white text-[7px] px-3 py-1 rounded-full font-black uppercase italic tracking-tighter animate-pulse">Waiting Approval</span>
                )}
              </div>
              
              {editId === f.id ? (
                <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border-4 border-amber-500 animate-in slide-in-from-top-2">
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Comentariu Client:</label>
                    <textarea title="Modifică textul recenziei" className="w-full p-3 text-xs font-bold rounded-xl border-2 border-slate-100 outline-none focus:border-slate-900" value={textEditat} onChange={(e) => setTextEditat(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-1 block">Răspunsul tău (Oficial):</label>
                    <textarea title="Adaugă un răspuns oficial vizibil pentru toți" className="w-full p-3 text-xs font-bold rounded-xl border-2 border-amber-200 bg-amber-50 outline-none focus:border-amber-500" placeholder="Mulțumim pentru feedback..." value={raspunsAdmin} onChange={(e) => setRaspunsAdmin(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <button title="Salvează toate modificările" onClick={() => salveazaModificariAdmin(f.id)} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black text-[9px] uppercase border-b-4 border-slate-700">Confirmă</button>
                    <button title="Renunță fără a salva" onClick={() => setEditId(null)} className="flex-1 bg-white text-slate-400 py-3 rounded-xl font-black text-[9px] uppercase border-2 border-slate-100">X</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-slate-700 font-bold italic leading-relaxed mb-8 text-sm relative">
                    <span className="absolute -top-4 -left-2 text-4xl text-slate-100 font-serif opacity-50">“</span>
                    {f.comentariu}
                  </p>
                  {f.raspuns_admin && (
                    <div className="mb-8 p-6 bg-slate-900 rounded-[30px] relative border-b-4 border-amber-600">
                      <p className="text-amber-500 font-black uppercase text-[8px] tracking-[0.3em] mb-2 italic">Răspuns Chronos:</p>
                      <p className="text-white text-xs font-medium italic leading-relaxed">{f.raspuns_admin}</p>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center gap-4 border-t border-slate-50 pt-6 mt-auto">
                <div className="w-12 h-12 bg-slate-900 text-amber-500 flex items-center justify-center rounded-2xl font-black italic text-lg shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
                  {f.nume_client?.charAt(0).toUpperCase() || "C"}
                </div>
                <div className="flex flex-col">
                  <span className="font-black uppercase text-[11px] tracking-widest text-slate-900 italic">{f.nume_client}</span>
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">
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