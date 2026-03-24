"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

// Verificăm variabilele sau folosim fallback direct pentru a evita blocajul
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
    // Verificare manuală pentru a vedea dacă intră în funcție
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
            <Link href="/rezervare" className="inline-flex items-center gap-2 text-slate-900 font-black uppercase italic text-xs tracking-widest hover:text-amber-600 transition-all group py-2 px-1">
              <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
              Înapoi la Rezervări
            </Link>
          </div>
        )}

        <div className="text-center mb-12">
          <h1 className="text-5xl font-black uppercase italic tracking-tighter text-slate-900">
            Păreri și <span className="text-amber-600">Sugestii</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-4 italic">Comunitatea Chronos</p>
        </div>

        {/* Formular Feedback */}
        <div className="max-w-xl mx-auto mb-20 bg-white p-8 rounded-[40px] shadow-2xl border-2 border-slate-100 relative overflow-hidden">
          {trimis && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 text-center p-6">
              <span className="text-5xl mb-4">✅</span>
              <h2 className="text-xl font-black uppercase italic text-slate-900">Mulțumim!</h2>
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-1">Recenzia va fi vizibilă după aprobarea adminului.</p>
            </div>
          )}

          <div className="flex justify-center gap-2 mb-8">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} type="button" className={`text-4xl transition-all duration-200 ${star <= (hover || rating) ? "scale-125 rotate-6" : "grayscale opacity-20 hover:opacity-50"}`}
                onClick={() => setRating(star)} onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(0)}>⭐</button>
            ))}
          </div>

          <div className="space-y-4">
            <input type="text" placeholder="Numele tău" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-amber-500 focus:bg-white transition-all text-sm text-slate-900"
              value={nume} onChange={(e) => setNume(e.target.value)} />
            <textarea placeholder="Ce sugestii ai pentru noi?" rows={3} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-amber-500 focus:bg-white transition-all resize-none text-sm text-slate-900"
              value={mesaj} onChange={(e) => setMesaj(e.target.value)} />
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                trimiteFeedback();
              }} 
              disabled={seIncarca} 
              className={`w-full py-4 rounded-2xl font-black uppercase italic tracking-widest transition-all shadow-lg active:scale-95 ${seIncarca ? 'bg-slate-400' : 'bg-slate-900 text-white hover:bg-amber-600'}`}
            >
              {seIncarca ? "Se trimite..." : "Postează Recenzia"}
            </button>
          </div>
        </div>

        {/* Lista Recenzii */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {feedbacks.map((f) => (
            <div key={f.id} className={`break-inside-avoid p-8 rounded-[35px] border-2 shadow-sm transition-all group relative ${f.aprobat ? 'bg-white border-slate-100' : 'bg-amber-50 border-amber-200 border-dashed'}`}>
              
              {isLoggedIn && (
                <div className="absolute top-4 right-4 flex flex-wrap justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all z-20">
                  {!f.aprobat && (
                    <button onClick={() => aprobaRapid(f.id)} className="bg-green-600 text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-green-700">Aprobă Rapid</button>
                  )}
                  <button onClick={() => intraInModEditare(f)} className="bg-slate-900 text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-amber-600">Modifică</button>
                  <button onClick={() => stergeFeedback(f.id)} className="bg-red-500 text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-red-700">Șterge</button>
                </div>
              )}

              <div className="flex gap-1 mb-4">
                {Array.from({ length: f.stele }).map((_, idx) => <span key={idx} className="text-xs">⭐</span>)}
                {!f.aprobat && isLoggedIn && <span className="ml-2 bg-amber-500 text-white text-[8px] px-2 py-1 rounded-full font-black uppercase italic">Așteaptă Aprobare</span>}
              </div>
              
              {editId === f.id ? (
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border-2 border-amber-500">
                  <textarea className="w-full p-2 text-sm font-bold rounded-lg border border-slate-200" value={textEditat} onChange={(e) => setTextEditat(e.target.value)} />
                  <textarea className="w-full p-2 text-sm font-bold rounded-lg border-2 border-amber-200 bg-amber-50" placeholder="Răspunsul tău..." value={raspunsAdmin} onChange={(e) => setRaspunsAdmin(e.target.value)} />
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => salveazaModificariAdmin(f.id)} className="flex-1 bg-green-600 text-white py-2 rounded-xl font-black text-[10px] uppercase">Salvează</button>
                    <button onClick={() => setEditId(null)} className="flex-1 bg-slate-200 text-slate-600 py-2 rounded-xl font-black text-[10px] uppercase">Anulează</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-slate-700 font-bold italic leading-relaxed mb-4 text-sm">"{f.comentariu}"</p>
                  {f.raspuns_admin && (
                    <div className="mb-6 p-4 bg-slate-900 rounded-2xl relative">
                      <p className="text-amber-500 font-black uppercase text-[8px] tracking-widest mb-1 italic">Răspuns Oficial:</p>
                      <p className="text-white text-xs font-medium italic leading-relaxed">{f.raspuns_admin}</p>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center gap-3 border-t border-slate-50 pt-4 mt-auto">
                <div className="w-10 h-10 bg-slate-900 text-amber-500 flex items-center justify-center rounded-xl font-black italic text-sm">{f.nume_client?.charAt(0) || "C"}</div>
                <div className="flex flex-col">
                  <span className="font-black uppercase text-[10px] tracking-wider text-slate-900">{f.nume_client}</span>
                  <span className="text-[8px] font-black text-slate-300 uppercase">{f.created_at ? new Date(f.created_at).toLocaleDateString('ro-RO') : "Recent"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}