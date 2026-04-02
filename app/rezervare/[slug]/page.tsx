"use client";

import { useState, useEffect, Suspense, useCallback, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import Image from "next/image";

interface StaffRow { id: string; name: string; services: string[]; }
interface ServiceRow { id: string; name: string; price: number; duration: number; }

function RezervareContent() {
  const params = useParams();
  const rawSlug = params?.slug as string | undefined;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const [adminId, setAdminId] = useState<string>("");
  const [adminIdReady, setAdminIdReady] = useState(false);

  const supabase = useMemo(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
  []);

  const fetchAdminIdBySlug = useCallback(async (slug: string) => {
    try {
      const { data } = await supabase.from("profiles").select("id").eq("slug", slug).single();
      return data?.id || null;
    } catch { return null; }
  }, [supabase]);

  // Rezolvă slug/UUID → adminId
  useEffect(() => {
    async function init() {
      if (!rawSlug) {
        setAdminIdReady(true);
        return;
      }
      if (uuidRegex.test(rawSlug)) {
        setAdminId(rawSlug);
        setAdminIdReady(true);
      } else {
        const id = await fetchAdminIdBySlug(rawSlug);
        if (id) setAdminId(id);
        setAdminIdReady(true);
      }
    }
    init();
  }, [rawSlug, fetchAdminIdBySlug]);

  const [trimis, setTrimis] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingConfig, setFetchingConfig] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerStep, setPickerStep] = useState<"hours" | "minutes">("hours");

  const [specialisti, setSpecialisti] = useState<StaffRow[]>([]);
  const [servicii, setServicii] = useState<ServiceRow[]>([]);
  const [working_hours, setWorkingHours] = useState<any[]>([]);

  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [numeFeedback, setNumeFeedback] = useState("");
  const [mesajFeedback, setMesajFeedback] = useState("");
  const [incarcareFeedback, setIncarcareFeedback] = useState(false);
  const [feedbackTrimisSucces, setFeedbackTrimisSucces] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    nume: "", telefon: "", email: "", data: today, ora: "00:00",
    serviciu_id: "", specialist_id: "", detalii: ""
  });

  const [selectedHour, setSelectedHour] = useState(0);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);
  const feedbackSuccessRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const fetchAdminConfig = useCallback(async () => {
    if (!adminId || !adminIdReady) { setFetchingConfig(false); return; }
    setFetchingConfig(true);
    try {
      const { data: profile } = await supabase.from("profiles")
        .select("working_hours").eq("id", adminId).single();
      if (profile?.working_hours) {
        setWorkingHours(Array.isArray(profile.working_hours) ? profile.working_hours : []);
      }

      const { data: staffData, error: errStaff } = await supabase
        .from('staff').select('*').eq('user_id', adminId).order('created_at', { ascending: false });
      const { data: servicesData, error: errServices } = await supabase
        .from('services').select('*').eq('user_id', adminId).order('created_at', { ascending: false });

      if (errStaff) console.error('Eroare staff:', errStaff.message);
      if (errServices) console.error('Eroare services:', errServices.message);

      if (staffData) setSpecialisti(staffData);
      if (servicesData) setServicii(servicesData);

      const { data: fbs } = await supabase.from("feedbacks").select("*")
        .eq("admin_id", adminId).order("created_at", { ascending: false });
      setFeedbacks(fbs || []);

    } catch (e) { console.error("Eroare critică:", e); }
    finally { setFetchingConfig(false); }
  }, [adminId, adminIdReady, supabase]);

  useEffect(() => {
    if (adminIdReady) fetchAdminConfig();
  }, [adminIdReady, fetchAdminConfig]);

  const filteredServicii = useMemo(() => {
    if (!form.specialist_id) return servicii;
    const expert = specialisti.find(s => s.id === form.specialist_id);
    if (!expert?.services?.length) return servicii;
    return servicii.filter(s => expert.services.includes(s.id));
  }, [form.specialist_id, servicii, specialisti]);

  const filteredSpecialisti = useMemo(() => {
    if (!form.serviciu_id) return specialisti;
    return specialisti.filter(e => e.services?.includes(form.serviciu_id));
  }, [form.serviciu_id, specialisti]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false); setPickerStep("hours");
      }
    };
    if (showPicker) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPicker]);

  useEffect(() => {
    const hh = selectedHour.toString().padStart(2, "0");
    const mm = selectedMinute.toString().padStart(2, "0");
    setForm(prev => ({ ...prev, ora: `${hh}:${mm}` }));
  }, [selectedHour, selectedMinute]);

  const trimiteRezervare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminId || !uuidRegex.test(adminId)) {
      alert("Eroare: ID salon invalid. Verifică link-ul de rezervare.");
      return;
    }

    setLoading(true);
    try {
      const selectedService = servicii.find(s => s.id === form.serviciu_id);
      const selectedExpert = specialisti.find(s => s.id === form.specialist_id);

      const payload = {
        user_id: adminId,
        title: form.nume.trim(),
        phone: form.telefon,
        email: form.email.trim(),
        date: form.data,
        time: form.ora,
        duration: selectedService?.duration || 15,
        details: `Serviciu: ${selectedService?.name || form.serviciu_id}${form.detalii ? ` | Notă: ${form.detalii}` : ""}`,
        expert: selectedExpert?.name || "Prima Disponibilitate",
        status: "pending",
        notifications: {
          angajat_id: form.specialist_id,
          serviciu_id: form.serviciu_id
        }
      };

      const { error } = await supabase.from("appointments").insert([payload]);

      if (!error) {
        setTrimis(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        console.error("❌ Eroare Supabase:", error);
        alert(`Eroare Supabase:\n${error.message}\n\nCod: ${error.code}\nDetalii: ${error.details || "—"}`);
      }
    } catch (err: any) {
      console.error("❌ Eroare necunoscută:", err);
      alert(`Eroare necunoscută:\n${err?.message || JSON.stringify(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const trimiteFeedback = async () => {
    if (!adminId || rating === 0 || !numeFeedback.trim() || !mesajFeedback.trim()) {
      alert("Completează toate câmpurile pentru recenzie."); return;
    }
    setIncarcareFeedback(true);
    try {
      const { error } = await supabase.from("feedbacks").insert([{
        nume_client: numeFeedback.trim(), stele: rating,
        comentariu: mesajFeedback.trim(), aprobat: false, admin_id: adminId
      }]);
      if (!error) {
        setNumeFeedback(""); setMesajFeedback(""); setRating(0);
        setFeedbackTrimisSucces(true);
        const { data: fbs } = await supabase.from("feedbacks").select("*")
          .eq("admin_id", adminId).order("created_at", { ascending: false });
        setFeedbacks(fbs || []);
      } else {
        console.error("❌ Eroare feedback:", error);
        alert(`Eroare feedback: ${error.message}`);
      }
    } catch (err: any) { alert(`Eroare: ${err.message}`); }
    finally { setIncarcareFeedback(false); }
  };

  // Slug inexistent / link invalid
  if (adminIdReady && !adminId) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-center p-8">
      <div className="text-6xl mb-6">❌</div>
      <h2 className="text-white font-black uppercase italic text-2xl mb-4">Link Invalid</h2>
      <p className="text-slate-400 font-bold">Acest link de rezervare nu există sau a expirat.</p>
    </div>
  );

  if (fetchingConfig) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
      <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="font-black uppercase italic text-amber-500 tracking-widest">Sincronizare în timp real...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#fcfcfc] flex flex-col items-center p-4 md:p-12 font-sans text-slate-900">
      <style jsx global>{`
        nav, .menu-button, header:not(.local-header) { display: none !important; }
        select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23f59e0b' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 1.5rem center; background-size: 1.2rem; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {trimis ? (
        <div className="w-full max-w-2xl bg-white rounded-[55px] p-20 text-center shadow-2xl border-t-8 border-amber-500">
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-3xl font-black uppercase italic mb-4">Rezervare Trimisă!</h2>
          <p className="text-slate-500 font-bold mb-8 text-lg">Rezervarea a fost trimisă în calendar.</p>
          <button onClick={() => {
            setTrimis(false);
            setForm({ nume: "", telefon: "", email: "", data: today, ora: "00:00", serviciu_id: "", specialist_id: "", detalii: "" });
          }} className="w-full max-w-xs bg-slate-900 text-white px-10 py-5 rounded-2xl font-black uppercase italic hover:bg-amber-500 hover:text-black transition-all border-b-4 border-slate-700 active:translate-y-1 active:border-b-0">
            EFECTUEAZĂ ALTĂ REZERVARE
          </button>
        </div>
      ) : (
        <div className="w-full max-w-2xl bg-white rounded-[55px] shadow-2xl border border-slate-100 overflow-hidden mb-20">
          <div className="bg-slate-900 p-12 text-white text-center local-header relative flex flex-col items-center">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500"></div>
            <div className="mb-6 relative w-24 h-24">
              <Image src="/logo-chronos.png" alt="Logo" fill className="object-contain" priority />
            </div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter">CHRONOS <span className="text-amber-500">BOOKING</span></h1>
          </div>

          <form onSubmit={trimiteRezervare} className="p-8 md:p-14 space-y-10">
            <div className="space-y-6">
              <input type="text" required placeholder="NUME COMPLET"
                className="w-full bg-slate-50 border-2 border-amber-500 rounded-[30px] py-6 px-8 text-[18px] uppercase italic font-black outline-none focus:bg-white transition-all"
                value={form.nume} onChange={e => setForm({ ...form, nume: e.target.value })} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input type="tel" required placeholder="TELEFON"
                  className="w-full bg-slate-50 border-2 border-amber-500 rounded-[30px] py-6 px-8 text-[18px] font-black outline-none focus:bg-white transition-all"
                  value={form.telefon} onChange={e => setForm({ ...form, telefon: e.target.value })} />
                <input type="email" required placeholder="EMAIL"
                  className="w-full bg-slate-50 border-2 border-amber-500 rounded-[30px] py-6 px-8 text-[18px] font-black outline-none focus:bg-white transition-all"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 p-8 bg-slate-50 rounded-[45px] border-2 border-slate-100">
              <div className="space-y-2">
                <label className="text-[12px] font-black uppercase italic text-slate-400 ml-4">Serviciu</label>
                <select required
                  className="w-full bg-white border-2 border-amber-500 rounded-[25px] py-6 px-8 text-[16px] font-black uppercase italic outline-none cursor-pointer"
                  value={form.serviciu_id}
                  onChange={e => setForm({ ...form, serviciu_id: e.target.value, specialist_id: "" })}>
                  <option value="">ALEGE SERVICIUL</option>
                  {filteredServicii.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name.toUpperCase()}{s.price ? ` — ${s.price} RON` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-black uppercase italic text-slate-400 ml-4">Expert</label>
                <select
                  className="w-full bg-white border-2 border-amber-500 rounded-[25px] py-6 px-8 text-[16px] font-black uppercase italic outline-none cursor-pointer"
                  value={form.specialist_id}
                  onChange={e => setForm({ ...form, specialist_id: e.target.value })}>
                  <option value="">PRIMA DISPONIBILITATE</option>
                  {filteredSpecialisti.map(sp => (
                    <option key={sp.id} value={sp.id}>{sp.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 mt-4">
                <label className="text-[12px] font-black uppercase italic text-slate-400 ml-4">MENȚIUNI SPECIALE</label>
                <textarea placeholder="Ai vreo preferință?"
                  className="w-full bg-white border-2 border-amber-500 rounded-[25px] py-6 px-8 text-[16px] font-bold outline-none focus:bg-slate-50 transition-all min-h-[120px] resize-none"
                  value={form.detalii} onChange={e => setForm({ ...form, detalii: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="relative group flex items-center bg-slate-900 rounded-[35px] h-[100px] cursor-pointer"
                onClick={() => dateInputRef.current?.showPicker()}>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <span className="text-white group-hover:text-amber-500 font-black text-[22px] uppercase italic transition-colors">
                    {new Date(form.data).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </span>
                </div>
                <input ref={dateInputRef} type="date" min={today}
                  className="w-full h-full opacity-0 relative z-30 cursor-pointer"
                  value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
              </div>
              <button type="button" onClick={() => setShowPicker(true)}
                className="w-full h-[100px] bg-slate-900 text-white rounded-[35px] font-black text-[22px] uppercase italic hover:text-amber-500 transition-all">
                {form.ora}
              </button>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-10 bg-slate-900 text-white rounded-[35px] font-black text-[14px] uppercase tracking-[0.4em] italic shadow-2xl hover:bg-amber-500 hover:text-black transition-all border-b-8 border-slate-800 active:translate-y-2 active:border-b-0 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? "SE PROCESEAZĂ..." : "CONFIRMĂ REZERVAREA"}
            </button>
          </form>
        </div>
      )}

      {showPicker && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4"
          onClick={() => { setShowPicker(false); setPickerStep("hours"); }}>
          <div ref={pickerRef} className="bg-white w-full max-w-[480px] rounded-[50px] p-10 relative shadow-[0_0_50px_rgba(245,158,11,0.2)] border-[6px] border-slate-900 flex flex-col animate-in fade-in zoom-in duration-300"
            onClick={e => e.stopPropagation()}>
            <button onClick={() => { setShowPicker(false); setPickerStep("hours"); }}
              className="absolute top-6 right-8 text-slate-300 hover:text-red-500 text-2xl font-black transition-colors" title="Închide">✕</button>

            <div className="flex justify-between items-center mb-10">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-amber-500 tracking-[0.4em] uppercase">
                  {pickerStep === "hours" ? "Pasul 1: Selectează Ora" : "Pasul 2: Selectează Minutul"}
                </p>
                <h2 className="font-black uppercase italic text-3xl text-slate-900 tracking-tighter">
                  {pickerStep === "hours" ? "Ora" : "Minute"}
                </h2>
              </div>
              <div className="bg-slate-900 px-6 py-4 rounded-[25px] flex items-center gap-3 border-b-4 border-amber-500 shadow-lg">
                <span className={`text-3xl font-black ${pickerStep === "hours" ? "text-amber-500 animate-pulse" : "text-white"}`}>
                  {selectedHour.toString().padStart(2, "0")}
                </span>
                <span className="text-amber-500 font-black text-2xl">:</span>
                <span className={`text-3xl font-black ${pickerStep === "minutes" ? "text-amber-500 animate-pulse" : "text-white"}`}>
                  {selectedMinute.toString().padStart(2, "0")}
                </span>
              </div>
            </div>

            <div className="flex-1 bg-slate-50/50 rounded-[40px] border-2 border-slate-100 p-8">
              {pickerStep === "hours" ? (
                <div className="grid grid-cols-4 gap-4 max-h-[380px] overflow-y-auto pr-2 scrollbar-hide">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <button key={i}
                      onClick={() => { setSelectedHour(i); setPickerStep("minutes"); }}
                      className={`relative aspect-square rounded-[22px] font-black text-lg flex items-center justify-center transition-all duration-200 ${
                        selectedHour === i
                          ? "bg-amber-500 text-slate-900 shadow-[0_10px_20px_rgba(245,158,11,0.4)] scale-110 z-10"
                          : "text-slate-900 bg-white border-2 border-transparent hover:border-amber-500 hover:shadow-md active:scale-95"
                      }`}>
                      {i.toString().padStart(2, "0")}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {[0, 15, 30, 45].map(m => (
                    <button key={m}
                      onClick={() => { setSelectedMinute(m); setShowPicker(false); setPickerStep("hours"); }}
                      className={`w-full py-8 rounded-[30px] font-black text-4xl transition-all duration-300 border-4 flex items-center justify-center gap-4 ${
                        selectedMinute === m
                          ? "bg-slate-900 text-amber-500 border-amber-500 shadow-2xl scale-[1.02]"
                          : "bg-white text-slate-300 border-slate-100 hover:border-amber-200 hover:text-slate-900 hover:translate-x-2"
                      }`}>
                      <span className="text-sm opacity-40 uppercase tracking-widest font-black">Minutul</span>
                      {m.toString().padStart(2, "0")}
                    </button>
                  ))}
                  <button onClick={() => setPickerStep("hours")}
                    className="mt-4 py-4 text-slate-400 font-black uppercase italic text-xs hover:text-amber-500 transition-colors flex items-center justify-center gap-2">
                    ← Înapoi la ore
                  </button>
                </div>
              )}
            </div>
            <p className="mt-8 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 italic">
              Apasă în exterior pentru a anula
            </p>
          </div>
        </div>
      )}

      {/* RECENZII */}
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 mb-10">
        <div className="bg-white p-12 rounded-[55px] shadow-xl border border-slate-100 relative overflow-hidden h-fit">
          {feedbackTrimisSucces && (
            <div className="absolute inset-0 bg-slate-900/95 z-50 flex flex-col items-center justify-center text-center p-8" onClick={e => e.stopPropagation()}>
              <div ref={feedbackSuccessRef} className="flex flex-col items-center">
                <div className="text-5xl mb-4">⭐</div>
                <h3 className="text-amber-500 font-black uppercase italic text-2xl mb-2">MULȚUMIM!</h3>
                <p className="text-white font-bold italic">Opinia ta a fost trimisă spre aprobare.</p>
                <button onClick={() => setFeedbackTrimisSucces(false)} className="mt-6 text-[10px] text-slate-400 uppercase font-black tracking-widest underline">Trimite alt review</button>
              </div>
            </div>
          )}
          <h3 className="text-2xl font-black uppercase italic mb-8 border-l-8 border-amber-500 pl-4">LASĂ O RECENZIE</h3>
          <div className="flex justify-center gap-2 mb-8">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} onClick={() => setRating(s)}
                className={`text-4xl transition-transform hover:scale-125 ${s <= (hover || rating) ? "" : "grayscale opacity-20"}`}>⭐</button>
            ))}
          </div>
          <input type="text" placeholder="NUMELE TĂU"
            className="w-full p-6 bg-slate-50 rounded-2xl border-2 border-amber-500 mb-4 font-black uppercase outline-none focus:bg-white transition-all"
            value={numeFeedback} onChange={e => setNumeFeedback(e.target.value)} />
          <textarea placeholder="COMENTARIU SAU SUGESTIE"
            className="w-full p-6 bg-slate-50 rounded-2xl border-2 border-amber-500 mb-6 font-bold outline-none h-32 resize-none focus:bg-white transition-all"
            value={mesajFeedback} onChange={e => setMesajFeedback(e.target.value)} />
          <button onClick={trimiteFeedback}
            className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black uppercase hover:bg-amber-500 hover:text-black transition-all shadow-lg border-b-4 border-slate-700 active:translate-y-1 active:border-b-0">
            {incarcareFeedback ? "SE TRIMITE..." : "TRIMITE REVIEW"}
          </button>
        </div>

        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 scrollbar-hide flex flex-col">
          <h3 className="text-2xl font-black uppercase italic mb-8 border-l-8 border-amber-500 pl-4">RECENZII RECENTE</h3>
          {feedbacks.length > 0 ? feedbacks.map((f, idx) => (
            <div key={f.id || idx} className="bg-white p-8 rounded-[40px] shadow-md border border-slate-50 hover:border-amber-200 transition-all">
              <div className="flex gap-1 mb-2">{Array.from({ length: Number(f.stele) || 5 }).map((_, i) => <span key={i} className="text-sm">⭐</span>)}</div>
              <p className="font-black text-[12px] text-amber-500 uppercase mb-2">{f.nume_client}</p>
              <p className="font-bold italic text-slate-700">"{f.comentariu}"</p>
            </div>
          )) : (
            <div className="bg-slate-50 p-12 rounded-[40px] text-center border-2 border-dashed border-slate-200">
              <div className="text-4xl mb-4 opacity-20">💬</div>
              <p className="text-slate-400 italic font-bold">Fii primul care lasă o recenzie!</p>
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-2xl text-center py-10 opacity-30">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">Powered by Chronos Resource Management</p>
      </div>
    </main>
  );
}

export default function RezervarePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-black uppercase italic text-amber-500">Încărcare...</div>}>
      <RezervareContent />
    </Suspense>
  );
}