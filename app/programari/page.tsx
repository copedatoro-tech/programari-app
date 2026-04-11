"use client";

import { useState, useEffect, useRef, useMemo, useCallback, Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";
import debounce from "lodash/debounce";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

const ChronosTimePicker = lazy(() =>
  import("@/components/ChronosDateTimePickers").then((mod) => ({
    default: mod.ChronosTimePicker,
  }))
);
const ChronosDatePicker = lazy(() =>
  import("@/components/ChronosDateTimePickers").then((mod) => ({
    default: mod.ChronosDatePicker,
  }))
);

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

const LIMITE_ABONAMENTE: Record<string, number> = {
  "chronos free": 30,
  "start (gratuit)": 30,
  "chronos pro": 150,
  "chronos elite": 500,
  "chronos team": 999999,
};

// ─── Dialog confirmare dată / oră ────────────────────────────────────────────
const ConfirmationDialog = ({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <div
    className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[700] flex items-center justify-center p-4"
    onClick={onCancel}
  >
    <div
      className="bg-white rounded-[30px] p-8 shadow-2xl border border-slate-100 max-w-md w-full"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center">
          <span className="text-2xl">⏰</span>
        </div>
        <p className="text-center text-slate-800 font-bold text-lg">{message}</p>
        <div className="flex gap-4 w-full">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-[15px] font-bold uppercase text-sm hover:bg-slate-200 transition-all"
          >
            Anulează
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-amber-500 text-white rounded-[15px] font-bold uppercase text-sm hover:bg-amber-600 transition-all shadow-lg"
          >
            Confirmă
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ─── Wrapper overlay pentru picker-e (garantează z-index maxim) ───────────────
function PickerOverlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[650] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function ProgramariContent() {
  const today = new Date().toISOString().split("T")[0];
  const [formular, setFormular] = useState<Programare>({
    id: 0,
    nume: "",
    email: "",
    data: today,
    ora: "",
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

  const [popupProgramare, setPopupProgramare] = useState<any | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredClients, setFilteredClients] = useState<Programare[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDateConfirm, setShowDateConfirm] = useState(false);
  const [showTimeConfirm, setShowTimeConfirm] = useState(false);
  const [tempDate, setTempDate] = useState<string>(today);
  const [tempTime, setTempTime] = useState<string>("");

  const suggestionsRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const getUserSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  };

  const { data: programari, isLoading: loadingProgramari } = useQuery({
    queryKey: ["programari"],
    queryFn: async () => {
      const session = await getUserSession();
      if (!session) return [];
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - 30);
      const startDate = dateLimit.toISOString().split("T")[0];
      const { data } = await supabase
        .from("appointments")
        .select(
          "id, title, date, time, details, phone, email, file_url, is_client_booking, angajat_id, serviciu_id, documente, nume_serviciu"
        )
        .eq("user_id", session.user.id)
        .gte("date", startDate)
        .order("date", { ascending: false });
      return data || [];
    },
  });

  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const session = await getUserSession();
      if (!session) return null;
      const { data } = await supabase
        .from("profiles")
        .select("plan_type, trial_started_at, working_hours, manual_blocks")
        .eq("id", session.user.id)
        .single();
      return data;
    },
  });

  const { data: angajati } = useQuery({
    queryKey: ["angajati"],
    queryFn: async () => {
      const session = await getUserSession();
      if (!session) return [];
      const { data } = await supabase
        .from("staff")
        .select("id, name, services")
        .eq("user_id", session.user.id);
      return data || [];
    },
  });

  const { data: servicii } = useQuery({
    queryKey: ["servicii"],
    queryFn: async () => {
      const session = await getUserSession();
      if (!session) return [];
      const { data } = await supabase
        .from("services")
        .select("id, nume_serviciu, price, duration")
        .eq("user_id", session.user.id);
      return data || [];
    },
  });

  const userPlan = profileData?.plan_type?.toLowerCase() || "chronos free";
  const isTrialing = !!profileData?.trial_started_at;
  const daysLeft = useMemo(() => {
    if (!isTrialing || !profileData?.trial_started_at) return null;
    const start = new Date(profileData.trial_started_at).getTime();
    const acum = new Date().getTime();
    const zeceZileInMs = 10 * 24 * 60 * 60 * 1000;
    if (acum - start < zeceZileInMs) {
      return Math.ceil((start + zeceZileInMs - acum) / (1000 * 60 * 60 * 24));
    }
    return null;
  }, [profileData, isTrialing]);

  const serviciiFiltrate = useMemo(() => {
    if (!formular.angajat_id || !angajati) return servicii || [];
    const specialist = angajati.find((a: StaffRow) => a.id === formular.angajat_id);
    if (!specialist?.services?.length) return servicii || [];
    return (servicii || []).filter((s: ServiceRow) =>
      specialist.services.includes(s.id)
    );
  }, [formular.angajat_id, servicii, angajati]);

  const angajatiFiltrati = useMemo(() => {
    if (!formular.serviciu_id || !angajati) return angajati || [];
    return (angajati || []).filter((a: StaffRow) =>
      a.services?.includes(formular.serviciu_id)
    );
  }, [formular.serviciu_id, angajati]);

  const durataSelectata = useMemo(() => {
    return (
      servicii?.find((s: ServiceRow) => s.id === formular.serviciu_id)?.duration || 30
    );
  }, [formular.serviciu_id, servicii]);

  const programariAzi = useMemo(
    () => (programari || []).filter((p: any) => p.date === today),
    [programari, today]
  );
  const statsAzi = useMemo(
    () => ({
      total: programariAzi.length,
      online: programariAzi.filter((p: any) => p.is_client_booking).length,
    }),
    [programariAzi]
  );

  const countLunaCurenta = useMemo(() => {
    const firstDay = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    )
      .toISOString()
      .split("T")[0];
    return (programari || []).filter((p: any) => p.date >= firstDay).length;
  }, [programari]);

  const limitaCurenta = isTrialing ? 999999 : LIMITE_ABONAMENTE[userPlan] || 30;
  const esteLimitatUI = countLunaCurenta >= limitaCurenta;

  // ─── Program de lucru pentru ziua selectată ───────────────────────────────
  const currentWorkingHours = useMemo(() => {
    const defaultHours = { start: "08:00", end: "20:00" };
    if (!profileData?.working_hours) return defaultHours;

    const [year, month, day] = formular.data.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayNames = [
      "sunday","monday","tuesday","wednesday","thursday","friday","saturday",
    ];
    const dayKey = dayNames[dateObj.getDay()];
    const hoursData = profileData.working_hours;
    const daySchedule =
      hoursData[dayKey] ||
      hoursData[dayKey.charAt(0).toUpperCase() + dayKey.slice(1)];

    if (!daySchedule || daySchedule.closed) return defaultHours;

    return {
      start:
        daySchedule.start && daySchedule.start !== "" ? daySchedule.start : "08:00",
      end:
        daySchedule.end && daySchedule.end !== "" ? daySchedule.end : "20:00",
    };
  }, [profileData, formular.data]);

  // ─── blockedSlots normalizat întotdeauna ca array ─────────────────────────
  // manual_blocks poate veni din Supabase ca obiect {dată: [sloturi]} sau array
  // ChronosTimePicker se așteaptă la un array plat de sloturi pentru ziua curentă
  const blockedSlotsForDay = useMemo(() => {
    const raw = profileData?.manual_blocks;
    if (!raw) return [];
    // Dacă e obiect cu cheie = dată, extrage sloturile pentru ziua din formular
    if (!Array.isArray(raw) && typeof raw === "object") {
      return (raw as Record<string, string[]>)[formular.data] || [];
    }
    // Dacă e deja array, îl trimitem direct
    if (Array.isArray(raw)) return raw;
    return [];
  }, [profileData?.manual_blocks, formular.data]);

  // ─── Sugestii autocomplete nume ───────────────────────────────────────────
  const handleNumeChange = useCallback(
    debounce((val: string) => {
      setFormular((prev) => ({ ...prev, nume: val }));
      if (val.length > 1 && programari) {
        const unique = Array.from(
          new Map(
            (programari as any[])
              .filter((item) => item.title)
              .map((item) => [item.title.toLowerCase(), item])
          ).values()
        );
        const filtered = unique
          .filter((c: any) => c.title.toLowerCase().includes(val.toLowerCase()))
          .slice(0, 5);
        setFilteredClients(
          filtered.map((f) => ({ ...f, nume: f.title, telefon: f.phone }))
        );
        setShowSuggestions(filtered.length > 0);
      } else {
        setShowSuggestions(false);
      }
    }, 300),
    [programari]
  );

  const selecteazaClient = (client: any) => {
    setFormular((prev) => ({
      ...prev,
      nume: client.nume,
      email: client.email || "",
      telefon: client.phone || client.telefon || "",
      poza: client.file_url || null,
    }));
    setShowSuggestions(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !supabase) return;
    const newDocuments = [...formular.documente];
    for (const file of Array.from(e.target.files)) {
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      const { error: uploadError } = await supabase.storage
        .from("documente-programari")
        .upload(fileName, file);
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from("documente-programari")
          .getPublicUrl(fileName);
        newDocuments.push({
          id: Date.now() + Math.random(),
          name: file.name,
          url: publicUrlData.publicUrl,
        });
      }
    }
    setFormular((prev) => ({ ...prev, documente: newDocuments }));
  };

  const eliminaDocument = (id: number) => {
    setFormular((prev) => ({
      ...prev,
      documente: prev.documente.filter((d) => d.id !== id),
    }));
  };

  // ─── Handlers picker dată ─────────────────────────────────────────────────
  const handleDateSelect = (val: string) => {
    setTempDate(val);
    setShowDateConfirm(true);
  };

  const handleDateConfirm = () => {
    setFormular({ ...formular, data: tempDate });
    setShowDateConfirm(false);
    setShowDatePicker(false);
  };

  // ─── Handlers picker oră ──────────────────────────────────────────────────
  const handleTimeSelect = (val: string) => {
    setTempTime(val);
    setShowTimeConfirm(true);
  };

  const handleTimeConfirm = () => {
    setFormular({ ...formular, ora: tempTime });
    setShowTimeConfirm(false);
    setShowTimePicker(false);
  };

  // ─── Salvare programare ───────────────────────────────────────────────────
  const salveazaInCloud = async () => {
    if (!formular.nume || !formular.telefon || !formular.ora) {
      alert("Atenționare: Completează Numele, Telefonul și Ora programării.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const serviciuSelectat = servicii?.find(
      (s: ServiceRow) => s.id === formular.serviciu_id
    );
    const angajatSelectat = angajati?.find(
      (a: StaffRow) => a.id === formular.angajat_id
    );

    const telefonCurat = formular.telefon.replace(/\D/g, "");
    const dataRo = new Date(formular.data).toLocaleDateString("ro-RO");
    const numeServ = serviciuSelectat?.nume_serviciu || "Programare";
    const linieIstoric = `• ${dataRo} la ora ${formular.ora}: ${numeServ} (${angajatSelectat?.name || "General"})`;

    const { data: clientExistent } = await supabase
      .from("client_cases")
      .select("id, description")
      .eq("phone_number", telefonCurat)
      .eq("user_id", user.id)
      .maybeSingle();

    if (clientExistent) {
      const istoricNou = `${clientExistent.description || ""}\n${linieIstoric}`;
      await supabase
        .from("client_cases")
        .update({
          description: istoricNou,
          client_name: formular.nume,
          client_email: formular.email,
        })
        .eq("id", clientExistent.id);
    } else {
      await supabase.from("client_cases").insert([
        {
          user_id: user.id,
          client_name: formular.nume,
          phone_number: telefonCurat,
          client_email: formular.email,
          description: `ISTORIC PROGRAMĂRI:\n${linieIstoric}`,
          status: "Activ",
        },
      ]);
    }

    const payload = {
      user_id: user.id,
      title: formular.nume,
      nume: formular.nume,
      email: formular.email,
      date: formular.data,
      time: formular.ora,
      details: formular.motiv,
      phone: telefonCurat,
      file_url: formular.poza,
      is_client_booking: false,
      angajat_id: formular.angajat_id || null,
      serviciu_id: formular.serviciu_id || null,
      specialist: angajatSelectat?.name || null,
      nume_serviciu: numeServ,
      documente: formular.documente,
      notifications: {
        sound: true,
        vibration: true,
        sendToClient: true,
        minutes: 10,
        volume: 70,
      },
    };

    const { error } = await supabase.from("appointments").insert([payload]);
    if (!error) {
      alert("Programare salvată și dosar client actualizat!");
      window.location.reload();
    }
  };

  const eliminaProgramare = async (id: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Ștergi programarea?")) {
      await supabase.from("appointments").delete().eq("id", id);
      window.location.reload();
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (suggestionsRef.current && !suggestionsRef.current.contains(target))
        setShowSuggestions(false);
      if (popupRef.current && !popupRef.current.contains(target))
        setPopupProgramare(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          OVERLAY-URI GLOBALE — montate în afara <main>, la rădăcina DOM
          z-index 650+ garantează că apar deasupra oricărui alt element
      ════════════════════════════════════════════════════════════════════ */}

      {/* Picker Dată */}
      {showDatePicker && (
        <PickerOverlay onClose={() => setShowDatePicker(false)}>
          <Suspense
            fallback={
              <div className="bg-white rounded-[30px] p-8 w-80 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <ChronosDatePicker
              value={formular.data}
              onChange={handleDateSelect}
              onClose={() => setShowDatePicker(false)}
              minDate={today}
            />
          </Suspense>
        </PickerOverlay>
      )}

      {/* Picker Oră */}
      {showTimePicker && (
        <PickerOverlay onClose={() => setShowTimePicker(false)}>
          <Suspense
            fallback={
              <div className="bg-white rounded-[30px] p-8 w-80 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <ChronosTimePicker
              value={formular.ora || "09:00"}
              onChange={handleTimeSelect}
              onClose={() => setShowTimePicker(false)}
              workingStart={currentWorkingHours.start}
              workingEnd={currentWorkingHours.end}
              appointments={
                (programari || []).filter((p: any) => p.date === formular.data)
              }
              duration={durataSelectata}
              blockedSlots={blockedSlotsForDay}
            />
          </Suspense>
        </PickerOverlay>
      )}

      {/* Dialog confirmare dată */}
      {showDateConfirm && (
        <ConfirmationDialog
          message={`Confirmi data selectată: ${tempDate}?`}
          onConfirm={handleDateConfirm}
          onCancel={() => setShowDateConfirm(false)}
        />
      )}

      {/* Dialog confirmare oră */}
      {showTimeConfirm && (
        <ConfirmationDialog
          message={`Confirmi ora selectată: ${tempTime}?`}
          onConfirm={handleTimeConfirm}
          onCancel={() => setShowTimeConfirm(false)}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          CONȚINUT PRINCIPAL
      ════════════════════════════════════════════════════════════════════ */}
      <main className="min-h-screen bg-slate-50 p-4 md:p-12 text-slate-900 font-sans">
        <div className="max-w-6xl mx-auto">
          {/* Banner Trial */}
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

          {/* Header */}
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
            <div className="flex flex-col gap-2 items-end">
              <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-amber-100 flex items-center gap-3">
                <span className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></span>
                <p className="text-[11px] font-black uppercase italic text-slate-600">
                  Azi:{" "}
                  <span className="text-amber-600">{statsAzi.total} Total</span> •{" "}
                  <span className="text-blue-500">{statsAzi.online} Online</span>
                </p>
              </div>
              <Link
                href="/programari/calendar"
                className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3 hover:bg-slate-50 transition-all active:scale-95"
              >
                <span className="text-xs">📅</span>
                <p className="text-[11px] font-black uppercase italic text-slate-600">Calendar</p>
              </Link>
            </div>
          </div>

          {/* Formular */}
          <section className="bg-white rounded-[50px] p-8 md:p-14 shadow-2xl border border-slate-100 mb-16 relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Poza client */}
              <div className="lg:col-span-3 flex flex-col items-center">
                <div className="w-44 h-44 bg-slate-50 rounded-[45px] overflow-hidden border-8 border-white shadow-xl relative group flex items-center justify-center mb-6">
                  {formular.poza ? (
                    <img
                      src={formular.poza}
                      className="w-full h-full object-cover"
                      alt="Client"
                    />
                  ) : (
                    <div className="w-full h-full relative flex items-center justify-center bg-slate-50">
                      <Image
                        src="/logo-chronos.png"
                        alt="Chronos"
                        fill
                        sizes="176px"
                        style={{ objectFit: "contain", padding: "16px" }}
                        priority
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
                  <label
                    htmlFor="f-pick"
                    className="absolute inset-0 cursor-pointer z-10"
                  />
                </div>
                <p className="text-[10px] font-black uppercase italic text-slate-400">
                  Poza Profil Client
                </p>
              </div>

              {/* Câmpuri formular */}
              <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nume cu autocomplete */}
                <div className="md:col-span-2 flex flex-col gap-2 relative">
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
                    <div
                      ref={suggestionsRef}
                      className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[20px] shadow-xl z-50 overflow-hidden"
                    >
                      {filteredClients.map((client, idx) => (
                        <button
                          key={idx}
                          onClick={() => selecteazaClient(client)}
                          className="w-full px-6 py-3 text-left hover:bg-amber-50 text-sm font-bold text-slate-700 transition-colors"
                        >
                          {client.nume} — {client.telefon}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Email */}
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

                {/* Telefon */}
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

                {/* Specialist */}
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
                    onChange={(e) =>
                      setFormular({ ...formular, angajat_id: e.target.value })
                    }
                  >
                    <option value="">Alege Specialist...</option>
                    {angajatiFiltrati?.map((a: StaffRow) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Serviciu */}
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
                    onChange={(e) =>
                      setFormular({ ...formular, serviciu_id: e.target.value })
                    }
                  >
                    <option value="">Alege Serviciu...</option>
                    {serviciiFiltrate?.map((s: ServiceRow) => (
                      <option key={s.id} value={s.id}>
                        {s.nume_serviciu} — {s.price} RON
                      </option>
                    ))}
                  </select>
                </div>

                {/* Buton Dată */}
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

                {/* Buton Oră */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase ml-4 text-slate-400 italic">
                    Ora
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTimePicker(true)}
                    className="w-full p-5 bg-slate-50 rounded-[25px] font-bold text-lg shadow-inner text-left flex justify-between items-center border-2 border-transparent hover:border-amber-500 transition-all active:scale-95"
                  >
                    {formular.ora || "Selectează ora..."}
                    <span className="text-amber-600 text-[10px]">🕒</span>
                  </button>
                </div>

                {/* Observații */}
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

            {/* Fișiere + Buton Salvare */}
            <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col lg:flex-row gap-4 items-center">
              <div className="flex-1 w-full bg-slate-100/50 p-4 rounded-[30px] border border-slate-200">
                <div className="flex items-center justify-between mb-3 px-2">
                  <span className="text-[9px] font-black uppercase text-slate-500 italic">
                    Fișiere atașate ({formular.documente.length})
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
                  {formular.documente.length === 0 && (
                    <p className="text-[9px] font-bold text-slate-300 italic uppercase px-2">
                      Niciun fișier adăugat
                    </p>
                  )}
                  {formular.documente.map((doc) => (
                    <div
                      key={doc.id}
                      className="relative flex items-center gap-2 w-auto max-w-[180px] h-10 pr-8 pl-2 bg-white border border-slate-200 rounded-xl shadow-sm"
                    >
                      <div className="w-6 h-6 rounded-md bg-slate-50 flex-shrink-0 overflow-hidden">
                        <span className="flex items-center justify-center h-full text-[10px]">📄</span>
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

          {/* Lista programări azi */}
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
              programariAzi.map((p: any) => (
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
                      {p.file_url ? (
                        <img
                          src={p.file_url}
                          className="w-full h-full object-cover"
                          alt={p.title}
                        />
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
                        {p.title}
                      </h4>
                      <p className="text-[9px] font-black text-amber-600 uppercase italic">
                        {p.time} •{" "}
                        {angajati?.find((a: any) => a.id === p.angajat_id)?.name ||
                          "General"}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 italic uppercase">
                        {p.nume_serviciu || "Procedură"}
                      </p>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <p className="text-[8px] font-black text-slate-400 uppercase italic truncate">
                      {p.details || "Fără detalii"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Popup detalii programare */}
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
                    {popupProgramare.file_url ? (
                      <img
                        src={popupProgramare.file_url}
                        className="w-full h-full object-cover"
                        alt={popupProgramare.title}
                      />
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
                    {popupProgramare.title}
                  </h3>
                  <p className="text-amber-600 font-black text-[10px] uppercase italic mt-1 tracking-widest">
                    {popupProgramare.date} la ora {popupProgramare.time}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Telefon</p>
                    <p className="font-black text-xs text-slate-700">
                      {popupProgramare.phone || "N/A"}
                    </p>
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
                      {angajati?.find((a: any) => a.id === popupProgramare.angajat_id)
                        ?.name || "General"}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Serviciu</p>
                    <p className="font-black text-xs text-slate-700">
                      {popupProgramare.nume_serviciu || "Procedură"}
                    </p>
                  </div>
                </div>
                <div className="bg-slate-900 p-6 rounded-[35px] text-white">
                  <p className="text-[8px] font-black text-amber-500 uppercase italic mb-2">
                    Motivul vizitei
                  </p>
                  <p className="text-xs font-medium italic opacity-90">
                    {popupProgramare.details || "Fără observații."}
                  </p>
                </div>
                {popupProgramare.documente && popupProgramare.documente.length > 0 && (
                  <div className="mt-6 bg-slate-50 p-6 rounded-[35px] border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase italic mb-3">
                      Fișiere atașate
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {popupProgramare.documente.map((doc: any, idx: number) => (
                        <a
                          key={idx}
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100 hover:border-amber-500 transition-all group"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <span className="text-lg">📄</span>
                            <p className="text-[10px] font-black text-slate-700 truncate italic uppercase">
                              {doc.name || "Document"}
                            </p>
                          </div>
                          <span className="text-[10px] font-black text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity italic">
                            VEZI
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default function ProgramariPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense
        fallback={
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-24 h-24 bg-slate-200 rounded-full mb-4"></div>
              <div className="h-4 w-48 bg-slate-200 rounded"></div>
            </div>
          </div>
        }
      >
        <ProgramariContent />
      </Suspense>
    </QueryClientProvider>
  );
}