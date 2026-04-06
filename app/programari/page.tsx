"use client";

import { useState, useEffect, Suspense, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";
import { ChronosTimePicker, ChronosDatePicker } from "@/components/ChronosDateTimePickers";

type DocumentAttachment = { id: number; name: string; url: string };

type StaffRow = { id: string; name: string; services: string[] };
type ServiceRow = { id: string; nume_serviciu: string; price: number; duration: number };

type Programare = {
  id: any;
  nume: string;
  email: string;
  data: string;
  ora: string;
  motiv: string;
  telefon: string;
  poza: string | null;
  reminderMinutes: number;
  reminderSound: boolean;
  reminderVibration: boolean;
  reminderVolume: number;
  sendToClient: boolean;
  documente: DocumentAttachment[];
  angajat_id: string;
  serviciu_id: string;
  created_by_client?: boolean;
};

type ManualBlocksMap = Record<string, string[]>;

const LIMITE_ABONAMENTE: Record<string, number> = {
  "chronos free": 30,
  "start (gratuit)": 30,
  "chronos pro": 150,
  "chronos elite": 500,
  "chronos team": 999999,
};

const DAY_NAMES_LONG = ["Duminică","Luni","Marți","Miercuri","Joi","Vineri","Sâmbătă"];

function ProgramariContent() {
  const [programari, setProgramari] = useState<Programare[]>([]);
  const [loadingDB, setLoadingDB] = useState(true);
  const [popupProgramare, setPopupProgramare] = useState<Programare | null>(null);
  const [userPlan, setUserPlan] = useState<string>("chronos free");
  const [isTrialing, setIsTrialing] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  const [angajati, setAngajati] = useState<StaffRow[]>([]);
  const [servicii, setServicii] = useState<ServiceRow[]>([]);

  const [manualBlocks, setManualBlocks] = useState<ManualBlocksMap>({});
  const [workingHours, setWorkingHours] = useState<any[]>([]);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Chronos pickers state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const [formular, setFormular] = useState<Programare>({
    id: 0,
    nume: "",
    email: "",
    data: today,
    ora: "09:00",
    motiv: "",
    telefon: "",
    poza: null,
    reminderMinutes: 10,
    reminderSound: true,
    reminderVibration: true,
    reminderVolume: 70,
    sendToClient: true,
    documente: [],
    angajat_id: "",
    serviciu_id: "",
  });

  const fetchProgramari = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (data) {
      setProgramari(
        data.map((item: any) => ({
          id: item.id,
          nume: item.title || item.prenume || item.nume || "",
          email: item.email || "",
          data: item.date || "",
          ora: item.time || "",
          motiv: item.details || "",
          telefon: item.phone || "",
          poza: item.file_url || null,
          reminderMinutes: item.notifications?.minutes || 10,
          reminderSound: item.notifications?.sound ?? true,
          reminderVibration: item.notifications?.vibration ?? true,
          reminderVolume: item.notifications?.volume || 70,
          sendToClient: item.notifications?.sendToClient ?? true,
          documente: item.notifications?.docs || [],
          angajat_id: item.angajat_id || "",
          serviciu_id: item.serviciu_id || "",
          created_by_client: item.is_client_booking ?? false,
        }))
      );
    }
  }, []);

  const fetchResurse = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data: profileData } = await supabase
      .from("profiles")
      .select("plan_type, trial_started_at, manual_blocks, working_hours")
      .eq("id", userId)
      .single();

    if (profileData) {
      let plan = profileData.plan_type?.toLowerCase() || "chronos free";
      if (profileData.trial_started_at) {
        const start = new Date(profileData.trial_started_at).getTime();
        const acum = new Date().getTime();
        const zeceZileInMs = 10 * 24 * 60 * 60 * 1000;
        if (acum - start < zeceZileInMs) {
          const dLeft = Math.ceil((start + zeceZileInMs - acum) / (1000 * 60 * 60 * 24));
          setIsTrialing(true);
          setDaysLeft(dLeft);
          plan = "chronos team";
        } else {
          setIsTrialing(false);
          setDaysLeft(null);
        }
      }
      setUserPlan(plan);

      const rawBlocks = profileData.manual_blocks;
      if (rawBlocks && typeof rawBlocks === "object" && !Array.isArray(rawBlocks)) {
        setManualBlocks(rawBlocks as ManualBlocksMap);
      } else {
        setManualBlocks({});
      }

      setWorkingHours(
        Array.isArray(profileData.working_hours) ? profileData.working_hours : []
      );
    }

    const { data: st } = await supabase
      .from("staff")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    const { data: sv } = await supabase
      .from("services")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (st) setAngajati(st);
    if (sv) setServicii(sv);
  }, []);

  const fetchInitialData = useCallback(async () => {
    if (!supabase) return;
    setLoadingDB(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await Promise.all([
        fetchProgramari(session.user.id),
        fetchResurse(session.user.id),
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDB(false);
    }
  }, [fetchProgramari, fetchResurse]);

  const serviciiFiltrate = useMemo(() => {
    if (!formular.angajat_id) return servicii;
    const specialist = angajati.find((a) => a.id === formular.angajat_id);
    if (!specialist || !specialist.services || specialist.services.length === 0)
      return servicii;
    return servicii.filter((s) => specialist.services.includes(s.id));
  }, [formular.angajat_id, servicii, angajati]);

  const angajatiFiltrati = useMemo(() => {
    if (!formular.serviciu_id) return angajati;
    return angajati.filter((a) => a.services?.includes(formular.serviciu_id));
  }, [formular.serviciu_id, angajati]);

  useEffect(() => {
    fetchInitialData();
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (suggestionsRef.current && !suggestionsRef.current.contains(target))
        setShowSuggestions(false);
      if (popupRef.current && !popupRef.current.contains(target))
        setPopupProgramare(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [fetchInitialData]);

  const handleNumeChange = (val: string) => {
    setFormular({ ...formular, nume: val });
    if (val.length > 1) {
      const unique = Array.from(
        new Map(programari.map((item) => [item.nume.toLowerCase(), item])).values()
      );
      const filtered = unique
        .filter((c) => c.nume.toLowerCase().includes(val.toLowerCase()))
        .slice(0, 5);
      setFilteredClients(filtered);
      setShowSuggestions(filtered.length > 0);
    } else setShowSuggestions(false);
  };

  const selecteazaClient = (client: any) => {
    setFormular({
      ...formular,
      nume: client.nume,
      email: client.email || "",
      telefon: client.telefon || "",
      poza: client.poza || null,
    });
    setShowSuggestions(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          setFormular((prev) => ({
            ...prev,
            documente: [
              ...prev.documente,
              { id: Date.now() + Math.random(), name: file.name, url: reader.result as string },
            ],
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const eliminaDocument = (id: number) =>
    setFormular((prev) => ({
      ...prev,
      documente: prev.documente.filter((d) => d.id !== id),
    }));

  const verificaDisponibilitate = (): { valid: boolean; motiv?: string } => {
    const { data, ora } = formular;
    const daySlots: string[] = manualBlocks[data] || [];
    if (daySlots.length > 0) {
      const [h, m] = ora.split(":").map(Number);
      const subSlots: string[] = [];
      for (let i = 0; i < 60; i += 15) {
        const totalMin = m + i;
        const sH = h + Math.floor(totalMin / 60);
        const sM = totalMin % 60;
        if (sH < 24)
          subSlots.push(
            `${sH.toString().padStart(2, "0")}:${sM.toString().padStart(2, "0")}`
          );
      }
      if (subSlots.some((slot) => daySlots.includes(slot))) {
        return { valid: false, motiv: "⚠️ Această oră este blocată în calendar. Alege altă oră." };
      }
    }

    const dateObj = new Date(data + "T00:00:00");
    const dayName = DAY_NAMES_LONG[dateObj.getDay()];
    const schedule = workingHours.find((h: any) => h.day === dayName);
    if (schedule?.closed) {
      return { valid: false, motiv: `⚠️ Ziua de ${dayName} este marcată ca închisă în setări.` };
    }
    if (schedule && (ora < schedule.start || ora > schedule.end)) {
      return {
        valid: false,
        motiv: `⚠️ Ora ${ora} este în afara programului de lucru (${schedule.start} - ${schedule.end}).`,
      };
    }

    return { valid: true };
  };

  const salveazaInCloud = async () => {
    if (!supabase) return;
    if (!formular.nume || !formular.telefon) {
      alert("Atenționare: Completează Numele și Telefonul.");
      return;
    }

    const disponibilitate = verificaDisponibilitate();
    if (!disponibilitate.valid) {
      alert(disponibilitate.motiv);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (!isTrialing) {
      const limit = LIMITE_ABONAMENTE[userPlan] || 30;
      const inceputLuna = new Date();
      inceputLuna.setDate(1);
      const firstDay = inceputLuna.toISOString().split("T")[0];
      const { count } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("date", firstDay);
      if ((count || 0) >= limit) {
        alert("Atenționare: Limita lunară de programări a fost atinsă!");
        return;
      }
    }

    const serviciuSelectat = servicii.find((s) => s.id === formular.serviciu_id);
    const angajatSelectat = angajati.find((a) => a.id === formular.angajat_id);

    const payload = {
      user_id: user.id,
      title: formular.nume,
      prenume: formular.nume,
      nume: formular.nume,
      email: formular.email,
      date: formular.data,
      time: formular.ora,
      details: formular.motiv,
      phone: formular.telefon,
      file_url: formular.poza,
      is_client_booking: false,
      angajat_id: formular.angajat_id || null,
      serviciu_id: formular.serviciu_id || null,
      specialist: angajatSelectat?.name || null,
      nume_serviciu: serviciuSelectat?.nume_serviciu || null,
      notifications: {
        sound: formular.reminderSound,
        vibration: formular.reminderVibration,
        sendToClient: formular.sendToClient,
        docs: formular.documente,
        minutes: formular.reminderMinutes,
        volume: formular.reminderVolume,
        angajat_id: formular.angajat_id || null,
        serviciu_id: formular.serviciu_id || null,
      },
    };

    const { error } = await supabase.from("appointments").insert([payload]);
    if (!error) window.location.reload();
    else alert("Eroare la salvare: " + error.message);
  };

  const eliminaProgramare = async (id: any, e: React.MouseEvent) => {
    if (!supabase) return;
    e.stopPropagation();
    if (confirm("Ștergi programarea?")) {
      await supabase.from("appointments").delete().eq("id", id);
      setProgramari((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const limitaCurenta = isTrialing ? 999999 : LIMITE_ABONAMENTE[userPlan] || 30;
  const esteLimitatUI =
    programari.filter((p) => {
      const inceputLuna = new Date();
      inceputLuna.setDate(1);
      return p.data >= inceputLuna.toISOString().split("T")[0];
    }).length >= limitaCurenta;

  const azi = new Date().toISOString().split("T")[0];
  const programariAzi = programari.filter((p) => p.data === azi);
  const totalAzi = programariAzi.length;
  const onlineAzi = programariAzi.filter((p) => p.created_by_client).length;
  const countLunaCurenta = programari.filter((p) => {
    const inceputLuna = new Date();
    inceputLuna.setDate(1);
    return p.data >= inceputLuna.toISOString().split("T")[0];
  }).length;

  if (loadingDB)
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Image
          src="/logo-chronos.png"
          alt="Chronos"
          width={100}
          height={100}
          className="animate-pulse mb-4"
        />
        <p className="text-[10px] font-black uppercase italic text-slate-400 tracking-widest">
          Se încarcă datele...
        </p>
      </div>
    );

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-12 text-slate-900 font-sans">
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Chronos Date Picker */}
      {showDatePicker && (
        <ChronosDatePicker
          value={formular.data}
          onChange={(val) => setFormular({ ...formular, data: val })}
          onClose={() => setShowDatePicker(false)}
          minDate={today}
        />
      )}

      {/* Chronos Time Picker */}
      {showTimePicker && (
        <ChronosTimePicker
          value={formular.ora}
          onChange={(val) => setFormular({ ...formular, ora: val })}
          onClose={() => setShowTimePicker(false)}
        />
      )}

      <div className="max-w-6xl mx-auto">
        {isTrialing && daysLeft !== null && (
          <div className="mb-10 bg-slate-900 border-l-[10px] border-amber-500 p-6 rounded-[35px] shadow-xl flex flex-col md:flex-row items-center justify-between overflow-hidden relative border border-white/5">
            <div className="flex items-center gap-5 relative z-10">
              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg animate-pulse">
                🎁
              </div>
              <div>
                <h4 className="text-white font-black uppercase italic tracking-tighter text-xl">
                  Trial Premium Activ
                </h4>
                <p className="text-amber-500 text-[9px] font-black uppercase tracking-[0.3em] mt-1">
                  Acces Chronos Team — {daysLeft} zile rămase
                </p>
              </div>
            </div>
            <div className="mt-4 md:mt-0 px-6 py-2 bg-white/5 rounded-full border border-white/10 relative z-10">
              <p className="text-[10px] font-black text-slate-300 uppercase italic">
                <span className="text-white text-lg mr-2">{daysLeft}</span> zile rămase
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
              Gestiune <span className="text-amber-600">Programări</span>
            </h1>
            <p className="text-[10px] font-black uppercase italic text-slate-400 mt-2">
              Plan: <span className="text-amber-600">{userPlan.toUpperCase()}</span> •{" "}
              {countLunaCurenta} / {isTrialing ? "∞" : limitaCurenta} luna aceasta
            </p>
          </div>
          <div className="flex flex-col gap-2 self-start md:self-auto items-end">
            <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-amber-100 flex items-center gap-3">
              <span className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></span>
              <p className="text-[11px] font-black uppercase italic text-slate-600">
                Azi: <span className="text-amber-600">{totalAzi} Total</span> •{" "}
                <span className="text-blue-500">{onlineAzi} Online</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/programari/calendar"
                className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3 hover:bg-slate-50 transition-all active:scale-95"
              >
                <span className="text-xs">📅</span>
                <p className="text-[11px] font-black uppercase italic text-slate-600">Calendar</p>
              </Link>
            </div>
          </div>
        </div>

        <section className="bg-white rounded-[50px] p-8 md:p-14 shadow-2xl border border-slate-100 mb-16 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-3 flex flex-col items-center">
              <div className="w-44 h-44 bg-slate-50 rounded-[45px] overflow-hidden border-8 border-white shadow-xl relative group flex items-center justify-center mb-6">
                {formular.poza ? (
                  <img src={formular.poza} className="w-full h-full object-cover" alt="Client" />
                ) : (
                  <div className="w-full h-full relative flex items-center justify-center bg-slate-50">
                    <Image
                      src="/logo-chronos.png"
                      alt="Chronos"
                      fill
                      sizes="176px"
                      style={{ objectFit: "contain", padding: "16px" }}
                    />
                  </div>
                )}
                <input
                  type="file"
                  id="f-pick"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      const r = new FileReader();
                      r.onload = () =>
                        setFormular({ ...formular, poza: r.result as string });
                      r.readAsDataURL(e.target.files[0]);
                    }
                  }}
                />
                <label htmlFor="f-pick" className="absolute inset-0 cursor-pointer z-10"></label>
              </div>
              <p className="text-[10px] font-black uppercase italic text-slate-400">
                Poza Profil Client
              </p>
            </div>

            <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 flex flex-col gap-2 relative" ref={suggestionsRef}>
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">
                  Nume Client
                </label>
                <input
                  type="text"
                  placeholder="Nume..."
                  className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner"
                  value={formular.nume}
                  onChange={(e) => handleNumeChange(e.target.value)}
                />
                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 z-[110] bg-white mt-2 rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                    {filteredClients.map((c, idx) => (
                      <button
                        key={idx}
                        onClick={() => selecteazaClient(c)}
                        className="w-full flex items-center gap-4 p-4 hover:bg-amber-50 border-b border-slate-50 last:border-0 text-left transition-colors"
                      >
                        <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center relative">
                          {c.poza ? (
                            <img src={c.poza} className="w-full h-full object-cover" />
                          ) : (
                            <Image
                              src="/logo-chronos.png"
                              alt="logo"
                              fill
                              sizes="40px"
                              style={{ objectFit: "contain", padding: "4px" }}
                            />
                          )}
                        </div>
                        <div>
                          <p className="font-black text-xs uppercase italic">{c.nume}</p>
                          <p className="text-[9px] font-bold text-slate-400">{c.telefon}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">
                  E-mail
                </label>
                <input
                  type="email"
                  placeholder="client@email.com"
                  className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner"
                  value={formular.email}
                  onChange={(e) => setFormular({ ...formular, email: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">
                  Telefon
                </label>
                <input
                  type="tel"
                  placeholder="07xxxxxxxx"
                  className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner"
                  value={formular.telefon}
                  onChange={(e) => setFormular({ ...formular, telefon: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">
                  Alege Specialist{" "}
                  {formular.serviciu_id && (
                    <span className="text-amber-500 ml-1">(filtrat)</span>
                  )}
                </label>
                <select
                  className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner cursor-pointer"
                  value={formular.angajat_id}
                  onChange={(e) => setFormular({ ...formular, angajat_id: e.target.value })}
                >
                  <option value="">Alege Specialist...</option>
                  {angajatiFiltrati.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">
                  Alege Serviciu{" "}
                  {formular.angajat_id && (
                    <span className="text-amber-500 ml-1">(filtrat)</span>
                  )}
                </label>
                <select
                  className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg outline-none shadow-inner cursor-pointer"
                  value={formular.serviciu_id}
                  onChange={(e) => setFormular({ ...formular, serviciu_id: e.target.value })}
                >
                  <option value="">Alege Serviciu...</option>
                  {serviciiFiltrate.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nume_serviciu} — {s.price} RON
                    </option>
                  ))}
                </select>
              </div>

              {/* ── DATA — buton Chronos ── */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">
                  Data
                </label>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(true)}
                  className="w-full p-5 bg-slate-50 rounded-[25px] border-2 border-transparent hover:border-amber-500 font-bold text-lg shadow-inner text-left flex justify-between items-center transition-all active:scale-95"
                >
                  <span>{formular.data}</span>
                  <span className="text-amber-600 text-[10px]">📅</span>
                </button>
              </div>

              {/* ── ORA — buton Chronos ── */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">
                  Ora
                </label>
                <button
                  type="button"
                  onClick={() => setShowTimePicker(true)}
                  className="w-full p-5 bg-slate-50 rounded-[25px] font-bold text-lg shadow-inner text-left flex justify-between items-center border-2 border-transparent hover:border-amber-500 transition-all active:scale-95"
                >
                  {formular.ora}
                  <span className="text-amber-600 text-[10px]">🕒</span>
                </button>
              </div>

              <div className="md:col-span-2 flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">
                  Observații
                </label>
                <textarea
                  placeholder="De ce vine clientul?"
                  className="p-5 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-amber-500 font-bold text-lg h-16 resize-none outline-none shadow-inner"
                  value={formular.motiv}
                  onChange={(e) => setFormular({ ...formular, motiv: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex-1 w-full bg-slate-100/50 p-4 rounded-[30px] border border-slate-200">
              <div className="flex items-center justify-between mb-3 px-2">
                <span className="text-[9px] font-black uppercase text-slate-500 italic">
                  Fișiere atașate
                </span>
                <input
                  type="file"
                  id="doc-upload"
                  className="hidden"
                  multiple
                  onChange={handleFileUpload}
                />
                <label
                  htmlFor="doc-upload"
                  className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase italic cursor-pointer hover:bg-amber-600 transition-colors shadow-sm active:scale-95"
                >
                  Adaugă Fișier +
                </label>
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                {formular.documente.map((doc) => (
                  <div
                    key={doc.id}
                    className="relative flex items-center gap-2 w-auto max-w-[180px] h-10 pr-8 pl-2 bg-white border border-slate-200 rounded-xl shadow-sm"
                  >
                    <div className="w-6 h-6 rounded-md bg-slate-50 flex-shrink-0 overflow-hidden">
                      {doc.url.startsWith("data:image") ? (
                        <img src={doc.url} className="w-full h-full object-cover" />
                      ) : (
                        <span className="flex items-center justify-center h-full text-[10px]">📄</span>
                      )}
                    </div>
                    <span className="text-[8px] font-black text-slate-600 truncate uppercase italic">
                      {doc.name}
                    </span>
                    <button
                      onClick={() => eliminaDocument(doc.id)}
                      className="absolute right-1.5 w-5 h-5 bg-red-50 text-red-500 rounded-lg flex items-center justify-center text-[10px] font-black hover:bg-red-500 hover:text-white transition-all active:scale-90"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={salveazaInCloud}
              disabled={esteLimitatUI}
              className={`w-full lg:w-[280px] h-[85px] rounded-[30px] font-black uppercase shadow-xl transition-all italic flex flex-col items-center justify-center gap-0.5 group active:scale-95 ${
                esteLimitatUI
                  ? "bg-slate-300 cursor-not-allowed text-slate-500 opacity-60"
                  : "bg-amber-600 text-white hover:bg-slate-900"
              }`}
            >
              <span className="text-[10px] opacity-70">
                {esteLimitatUI ? "LIMITA ATINSĂ" : "✓ FINALIZARE"}
              </span>
              <span className="text-sm tracking-tighter">
                {esteLimitatUI ? "Actualizează Planul" : "Salvează Programarea"}
              </span>
            </button>
          </div>
        </section>

        <div className="mb-6">
          <h2 className="text-sm font-black uppercase italic tracking-tighter text-slate-400">
            Programări Azi
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-40">
          {programariAzi.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white rounded-[35px] border-2 border-dashed border-slate-100">
              <p className="text-[10px] font-black uppercase italic text-slate-300">
                Nicio programare pentru azi.
              </p>
            </div>
          ) : (
            programariAzi.map((p) => (
              <div
                key={p.id}
                className="relative bg-white p-5 rounded-[35px] shadow-sm border border-amber-200 ring-2 ring-amber-100 transition-all cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-95"
                onClick={() => setPopupProgramare(p)}
              >
                <button
                  onClick={(e) => eliminaProgramare(p.id, e)}
                  className="absolute top-4 right-4 text-red-500 font-black text-[10px] z-10 hover:scale-125 transition-transform active:scale-90"
                >
                  ✕
                </button>
                <div className="flex gap-3 items-center mb-4 pr-6">
                  <div className="w-12 h-12 rounded-[18px] bg-slate-50 overflow-hidden border-2 border-white shadow-inner flex items-center justify-center relative">
                    {p.poza ? (
                      <img src={p.poza} className="w-full h-full object-cover" />
                    ) : (
                      <Image
                        src="/logo-chronos.png"
                        alt="logo"
                        fill
                        sizes="48px"
                        style={{ objectFit: "contain", padding: "4px" }}
                      />
                    )}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <h4 className="font-black text-slate-800 uppercase text-[11px] truncate italic leading-tight">
                      {p.nume}
                    </h4>
                    <p className="text-[9px] font-black text-amber-600 uppercase italic">
                      {p.ora} • {angajati.find((a) => a.id === p.angajat_id)?.name || "General"}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 italic uppercase">
                      {servicii.find((s) => s.id === p.serviciu_id)?.nume_serviciu || "Procedură"}
                    </p>
                  </div>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl">
                  <p className="text-[8px] font-black text-slate-400 uppercase italic truncate">
                    {p.motiv || "Fără detalii"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {popupProgramare && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
          onClick={() => setPopupProgramare(null)}
        >
          <div
            ref={popupRef}
            className="bg-white w-full max-w-lg rounded-[50px] overflow-hidden shadow-2xl border border-slate-100 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPopupProgramare(null)}
              className="absolute top-8 right-8 w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all z-10 active:scale-90"
            >
              ✕
            </button>
            <div className="h-32 bg-slate-900 relative">
              <div className="absolute -bottom-12 left-10 w-24 h-24 rounded-[30px] bg-white p-2 shadow-xl border border-slate-50">
                <div className="w-full h-full rounded-[22px] bg-slate-50 overflow-hidden relative flex items-center justify-center">
                  {popupProgramare.poza ? (
                    <img src={popupProgramare.poza} className="w-full h-full object-cover" />
                  ) : (
                    <Image
                      src="/logo-chronos.png"
                      alt="logo"
                      fill
                      sizes="80px"
                      style={{ objectFit: "contain", padding: "8px" }}
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="pt-16 p-10">
              <div className="mb-6">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
                  {popupProgramare.nume}
                </h3>
                <p className="text-amber-600 font-black text-[10px] uppercase italic mt-1 tracking-widest">
                  {popupProgramare.data} la ora {popupProgramare.ora}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Telefon</p>
                  <p className="font-black text-xs text-slate-700">{popupProgramare.telefon}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Email</p>
                  <p className="font-black text-xs text-slate-700 truncate">
                    {popupProgramare.email || "-"}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Specialist</p>
                  <p className="font-black text-xs text-slate-700">
                    {angajati.find((a) => a.id === popupProgramare.angajat_id)?.name || "General"}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Serviciu</p>
                  <p className="font-black text-xs text-slate-700">
                    {servicii.find((s) => s.id === popupProgramare.serviciu_id)?.nume_serviciu || "Procedură"}
                  </p>
                </div>
              </div>
              <div className="bg-slate-900 p-6 rounded-[35px] text-white">
                <p className="text-[8px] font-black text-amber-500 uppercase italic mb-2">
                  Motivul vizitei
                </p>
                <p className="text-xs font-medium italic opacity-90">
                  {popupProgramare.motiv || "Fără observații."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ProgramariPage() {
  return (
    <Suspense fallback={null}>
      <ProgramariContent />
    </Suspense>
  );
}