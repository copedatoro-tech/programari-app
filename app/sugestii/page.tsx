"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function PareriClienti() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);

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
  const channelRef = useRef<any>(null);

  const preiaFeedback = useCallback(async (adminId: string) => {
    if (!adminId) return;
    try {
      const { data, error } = await supabase
        .from("feedbacks")
        .select("*")
        .eq("admin_id", adminId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setFeedbacks(data || []);
    } catch (err) {
      console.error("Eroare la preluare feedback:", err);
    }
  }, []);

  useEffect(() => {
    const initApp = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const isLocal =
        typeof window !== "undefined" &&
        window.location.hostname === "localhost";

      let adminIdToUse: string | null = null;
      if (session) {
        adminIdToUse = session.user.id;
      } else if (isLocal) {
        adminIdToUse = "ed9cd915-6684-422c-a214-4ac5c25e98f3";
      }

      if (!adminIdToUse) return;

      setIsLoggedIn(true);
      setCurrentAdminId(adminIdToUse);
      preiaFeedback(adminIdToUse);

      // Curățăm canalul existent dacă există înainte de a crea unul nou
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase
        .channel(`feedbacks-admin-${adminIdToUse}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "feedbacks",
            filter: `admin_id=eq.${adminIdToUse}`,
          },
          () => {
            preiaFeedback(adminIdToUse!);
          }
        );
      
      // Înregistrăm referința și ABIA APOI apelăm subscribe()
      channelRef.current = channel;
      channel.subscribe();
    };

    initApp();

    const handleClickOutside = (event: MouseEvent) => {
      if (
        successPopupRef.current &&
        !successPopupRef.current.contains(event.target as Node)
      ) {
        setTrimis(false);
        setEditId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [preiaFeedback]);

  const trimiteFeedback = async () => {
    if (rating === 0 || !nume.trim() || !mesaj.trim() || !currentAdminId) {
      return alert("Completează toate câmpurile!");
    }
    setSeIncarca(true);
    try {
      const { error } = await supabase.from("feedbacks").insert([
        {
          nume_client: nume,
          stele: rating,
          comentariu: mesaj,
          aprobat: true,
          admin_id: currentAdminId,
        },
      ]);
      if (error) throw error;
      setTrimis(true);
      setNume("");
      setMesaj("");
      setRating(0);
      preiaFeedback(currentAdminId);
    } catch (err: any) {
      alert("Eroare la trimitere: " + err.message);
    } finally {
      setSeIncarca(false);
    }
  };

  const salveazaModificariAdmin = async (id: string) => {
    if (!currentAdminId) return;
    try {
      const { error } = await supabase
        .from("feedbacks")
        .update({
          comentariu: textEditat,
          raspuns_admin: raspunsAdmin,
          aprobat: true,
        })
        .eq("id", id)
        .eq("admin_id", currentAdminId);
      if (error) throw error;
      setEditId(null);
      setFeedbacks((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, comentariu: textEditat, raspuns_admin: raspunsAdmin, aprobat: true }
            : f
        )
      );
    } catch (err: any) {
      alert("Nu s-a putut salva: " + err.message);
    }
  };

  const aprobaRapid = async (id: string) => {
    if (!currentAdminId) return;
    try {
      const { error } = await supabase
        .from("feedbacks")
        .update({ aprobat: true })
        .eq("id", id)
        .eq("admin_id", currentAdminId);
      if (error) throw error;
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === id ? { ...f, aprobat: true } : f))
      );
    } catch (err: any) {
      alert("Eroare la aprobare: " + err.message);
    }
  };

  const dezaprobaRapid = async (id: string) => {
    if (!currentAdminId) return;
    try {
      const { error } = await supabase
        .from("feedbacks")
        .update({ aprobat: false })
        .eq("id", id)
        .eq("admin_id", currentAdminId);
      if (error) throw error;
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === id ? { ...f, aprobat: false } : f))
      );
    } catch (err: any) {
      alert("Eroare la dezaprobare: " + err.message);
    }
  };

  const stergeFeedback = async (id: string) => {
    if (!currentAdminId) return;
    if (!confirm("Ștergi definitiv această recenzie?")) return;
    try {
      const { error } = await supabase
        .from("feedbacks")
        .delete()
        .eq("id", id)
        .eq("admin_id", currentAdminId);
      if (error) throw error;
      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      alert("Eroare la ștergere: " + err.message);
    }
  };

  const totalRecenzii = feedbacks.length;
  const aprobate = feedbacks.filter((f) => f.aprobat).length;
  const neaprobate = feedbacks.filter((f) => !f.aprobat).length;
  const medieStele =
    feedbacks.length > 0
      ? (
          feedbacks.reduce((sum, f) => sum + (f.stele || 0), 0) /
          feedbacks.length
        ).toFixed(1)
      : "—";

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10 bg-white p-6 rounded-[35px] shadow-sm border border-slate-100">
          <div className="flex items-center gap-6">
            <img 
              src="/logo-chronos.png" 
              alt="Logo" 
              className="w-[120px] h-auto" 
              style={{ height: "auto" }} 
            />
            <h1 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter">
              Gestiune <span className="text-amber-600">Recenzii</span>
            </h1>
          </div>
          <Link
            href="/rezervare"
            title="Navighează către pagina de rezervări"
            className="font-black uppercase italic text-[9px] py-4 px-8 bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-amber-500 hover:text-black transition-all"
          >
            Vezi Pagina de Rezervări →
          </Link>
        </div>

        {/* Statistici */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Total", value: totalRecenzii, color: "bg-slate-900 text-white" },
            { label: "Aprobate", value: aprobate, color: "bg-emerald-500 text-white" },
            { label: "În așteptare", value: neaprobate, color: "bg-amber-500 text-black" },
            { label: "Medie stele", value: medieStele, color: "bg-white text-slate-900 border-2 border-slate-100" },
          ].map((s) => (
            <div
              key={s.label}
              className={`${s.color} p-6 rounded-[30px] flex flex-col items-center justify-center shadow-sm`}
            >
              <span className="text-3xl font-black italic">{s.value}</span>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-70 mt-1">
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Formular adăugare manuală */}
        <div className="max-w-xl mx-auto mb-16 bg-white p-10 rounded-[50px] shadow-2xl relative border border-slate-100">
          {trimis && (
            <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center text-center p-8 rounded-[50px]">
              <div ref={successPopupRef}>
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mb-6 mx-auto">
                  ✓
                </div>
                <h2 className="text-2xl font-black uppercase italic">Adăugat cu succes!</h2>
                <button
                  onClick={() => setTrimis(false)}
                  title="Închide fereastra de succes"
                  className="mt-8 text-[9px] font-black uppercase underline text-slate-400"
                >
                  Închide
                </button>
              </div>
            </div>
          )}

          <h2 className="text-center text-[11px] font-black uppercase italic tracking-widest text-slate-400 mb-8">
            Adaugă recenzie manual
          </h2>

          <div className="flex justify-center gap-3 mb-10">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                title={`Acordă ${star} stele`}
                className={`text-4xl transition-all ${
                  star <= (hover || rating) ? "scale-125" : "grayscale opacity-20"
                }`}
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
              className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[25px] font-black outline-none text-[13px] uppercase italic focus:border-amber-500 transition-all"
              value={nume}
              onChange={(e) => setNume(e.target.value)}
            />
            <textarea
              placeholder="COMENTARIU..."
              rows={4}
              className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[25px] font-bold outline-none text-[13px] italic focus:border-amber-500 transition-all"
              value={mesaj}
              onChange={(e) => setMesaj(e.target.value)}
            />
            <button
              onClick={trimiteFeedback}
              disabled={seIncarca}
              title="Salvează recenzia în baza de date"
              className="w-full py-6 rounded-[25px] bg-slate-900 text-white font-black uppercase italic text-[11px] border-b-8 border-slate-700 active:translate-y-1 active:border-b-0 hover:bg-amber-500 hover:text-black transition-all disabled:opacity-50"
            >
              {seIncarca ? "SE SALVEAZĂ..." : "ADĂUGĂ RECENZIE MANUAL"}
            </button>
          </div>
        </div>

        {/* Lista feedbacks */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
          {!isLoggedIn ? (
            <div className="col-span-full text-center py-20 bg-white rounded-[45px] border-2 border-slate-100">
              <p className="font-black uppercase italic text-slate-400 animate-pulse">
                Se verifică accesul...
              </p>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-white rounded-[45px] border-2 border-dashed border-slate-200">
              <p className="font-black uppercase italic text-slate-300">
                Nu ai nicio recenzie încă.
              </p>
            </div>
          ) : (
            feedbacks.map((f) => (
              <div
                key={f.id}
                className={`break-inside-avoid p-10 rounded-[45px] border-2 shadow-sm group relative flex flex-col transition-all ${
                  f.aprobat
                    ? "bg-white border-slate-100"
                    : "bg-amber-50 border-dashed border-amber-300 shadow-amber-100"
                }`}
              >
                {/* Controale admin */}
                <div className="absolute top-6 right-6 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all z-20">
                  {!f.aprobat ? (
                    <button
                      onClick={() => aprobaRapid(f.id)}
                      title="Aprobă rapid această recenzie pentru a fi vizibilă public"
                      className="bg-emerald-500 text-white p-3 rounded-2xl text-[9px] font-black uppercase shadow-lg hover:scale-105 active:scale-95 transition-transform"
                    >
                      Aprobă
                    </button>
                  ) : (
                    <button
                      onClick={() => dezaprobaRapid(f.id)}
                      title="Dezaprobă această recenzie pentru a o ascunde de public"
                      className="bg-slate-400 text-white p-3 rounded-2xl text-[9px] font-black uppercase shadow-lg hover:scale-105 active:scale-95 transition-transform"
                    >
                      Dezaprobă
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditId(f.id);
                      setTextEditat(f.comentariu);
                      setRaspunsAdmin(f.raspuns_admin || "");
                    }}
                    title="Modifică textul sau adaugă un răspuns oficial"
                    className="bg-slate-900 text-white p-3 rounded-2xl text-[9px] font-black uppercase shadow-lg hover:scale-105 active:scale-95 transition-transform"
                  >
                    Edit / Răspunde
                  </button>
                  <button
                    onClick={() => stergeFeedback(f.id)}
                    title="Șterge definitiv această recenzie din sistem"
                    className="bg-red-500 text-white p-3 rounded-2xl text-[9px] font-black uppercase shadow-lg hover:scale-105 active:scale-95 transition-transform"
                  >
                    Șterge
                  </button>
                </div>

                {/* Stele + badge */}
                <div className="flex gap-1 mb-6 flex-wrap">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <span key={idx} className={`text-sm ${idx < f.stele ? "" : "grayscale opacity-20"}`}>
                      ⭐
                    </span>
                  ))}
                  <span
                    className={`ml-4 text-[7px] px-3 py-1 rounded-full font-black uppercase italic ${
                      f.aprobat
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-500 text-white animate-pulse"
                    }`}
                  >
                    {f.aprobat ? "Aprobat ✓" : "Nou / Neaprobat"}
                  </span>
                </div>

                {/* Conținut */}
                {editId === f.id ? (
                  <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border-4 border-amber-500">
                    <label className="text-[9px] font-black uppercase opacity-50">
                      Comentariu Client:
                    </label>
                    <textarea
                      className="w-full p-4 text-xs font-bold rounded-xl border-2 outline-none focus:border-slate-900"
                      value={textEditat}
                      onChange={(e) => setTextEditat(e.target.value)}
                    />
                    <label className="text-[9px] font-black uppercase opacity-50">
                      Răspunsul tău:
                    </label>
                    <textarea
                      className="w-full p-4 text-xs font-bold rounded-xl border-2 border-amber-200 bg-amber-50 outline-none focus:border-amber-500"
                      placeholder="Scrie un răspuns..."
                      value={raspunsAdmin}
                      onChange={(e) => setRaspunsAdmin(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => salveazaModificariAdmin(f.id)}
                        title="Salvează modificările și aprobă automat recenzia"
                        className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black text-[9px] uppercase hover:bg-emerald-500 transition-colors"
                      >
                        Salvează și Aprobă
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        title="Anulează editarea fără a salva"
                        className="px-5 bg-white py-4 rounded-xl font-black text-[9px] border-2"
                      >
                        Anulează
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-700 font-bold italic mb-8 text-sm leading-relaxed">
                      "{f.comentariu}"
                    </p>
                    {f.raspuns_admin && (
                      <div className="mb-8 p-6 bg-slate-900 rounded-[30px] border-b-4 border-amber-600">
                        <p className="text-amber-500 font-black uppercase text-[8px] mb-2 italic tracking-widest">
                          Răspunsul tău:
                        </p>
                        <p className="text-white text-xs italic">"{f.raspuns_admin}"</p>
                      </div>
                    )}
                  </>
                )}

                {/* Footer */}
                <div className="flex items-center gap-4 border-t border-slate-100 pt-6 mt-auto">
                  <div className="w-12 h-12 bg-slate-900 text-amber-500 flex items-center justify-center rounded-2xl font-black italic text-lg shadow-md">
                    {f.nume_client?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black uppercase text-[11px] italic text-slate-900">
                      {f.nume_client}
                    </span>
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
                      {f.created_at
                        ? new Date(f.created_at).toLocaleDateString("ro-RO")
                        : "Recent"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}