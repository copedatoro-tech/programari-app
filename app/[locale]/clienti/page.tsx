"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import DosarClientComplet from "@/components/DosarClientComplet";

export default function BazaDateClienti() {
  const router = useRouter();
  const t = useTranslations("clienti");
  const [userId, setUserId] = useState<string | null>(null);
  const [dosare, setDosare] = useState<any[]>([]);
  const [incarcare, setIncarcare] = useState(true);
  const [cautare, setCautare] = useState("");
  const [dosarSelectat, setDosarSelectat] = useState<any | null>(null);

  const incarcaDateClienti = useCallback(async (currentUserId: string) => {
    const { data, error } = await supabase
      .from("client_cases")
      .select("*")
      .eq("user_id", currentUserId)
      .order("client_name", { ascending: true });

    if (error) {
      console.error("❌ Eroare Supabase la citire:", error.message);
      return;
    }
    if (data) setDosare(data);
  }, []);

  const sincronizareBackground = useCallback(async (currentUserId: string) => {
    try {
      const [aptRes, casesRes] = await Promise.all([
        supabase.from("appointments").select("*").eq("user_id", currentUserId),
        supabase.from("client_cases").select("*").eq("user_id", currentUserId),
      ]);

      if (aptRes.error || !aptRes.data) return;

      const programari = aptRes.data;
      const existenteInDB = casesRes.data || [];

      const mapDB = new Map();
      existenteInDB.forEach((d) => {
        const telKey = d.phone_number?.replace(/\D/g, "");
        if (telKey) mapDB.set(telKey, d);
      });

      const deProcesat = new Map();

      for (const prog of programari) {
        const tel = (prog.phone || "").replace(/\D/g, "");
        if (!tel) continue;

        const dataProgr = prog.date
          ? new Date(prog.date).toLocaleDateString("ro-RO")
          : "---";
        const oraProgr = prog.time ? ` la ora ${prog.time}` : "";
        const linieIstoric = `• ${dataProgr}${oraProgr}: ${prog.nume_serviciu || "Serviciu"}`;

        const numeDinProgr =
          prog.nume && prog.nume !== "Client Nou" && prog.nume.trim() !== ""
            ? prog.nume
            : null;
        const emailDinProgr = prog.email ? prog.email.toLowerCase().trim() : null;

        const existent = mapDB.get(tel);

        if (existent) {
          const currentData = deProcesat.get(tel) || { ...existent };
          let modified = false;

          const numeActual = currentData.client_name?.trim();
          if ((!numeActual || numeActual === "Client Nou") && numeDinProgr) {
            currentData.client_name = numeDinProgr;
            modified = true;
          }

          if (!currentData.client_email && emailDinProgr) {
            currentData.client_email = emailDinProgr;
            modified = true;
          }

          if (!currentData.description?.includes(dataProgr)) {
            currentData.description = `${currentData.description || ""}\n${linieIstoric}`;
            modified = true;
          }

          if (modified) deProcesat.set(tel, currentData);
        } else {
          const inCurs = deProcesat.get(tel);
          if (inCurs) {
            if (
              numeDinProgr &&
              (inCurs.client_name === "Client Nou" || !inCurs.client_name)
            ) {
              inCurs.client_name = numeDinProgr;
            }
            if (!inCurs.description.includes(dataProgr)) {
              inCurs.description += `\n${linieIstoric}`;
            }
          } else {
            deProcesat.set(tel, {
              user_id: currentUserId,
              client_name: numeDinProgr || "Client Nou",
              client_email: emailDinProgr || "",
              phone_number: tel,
              case_type: "Dosar Client",
              status: "Activ",
              description: `ISTORIC:\n${linieIstoric}`,
              poza: prog.poza || null,
              lucrari: "[]",
              fisiere_atasate: "[]",
            });
          }
        }
      }

      if (deProcesat.size > 0) {
        const { error: upsertErr } = await supabase
          .from("client_cases")
          .upsert(Array.from(deProcesat.values()), {
            onConflict: "user_id,phone_number",
          });

        if (!upsertErr) {
          incarcaDateClienti(currentUserId);
        }
      }
    } catch (e) {
      console.error("🔥 Eroare critică la sincronizare:", e);
    }
  }, [incarcaDateClienti]);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/login");
        return;
      }
      const uid = session.user.id;
      setUserId(uid);
      await incarcaDateClienti(uid);
      setIncarcare(false);
      sincronizareBackground(uid);
    };
    init();
  }, [router, incarcaDateClienti, sincronizareBackground]);

  const handleUpdate = useCallback(
    (camp: string, valoare: any) => {
      if (!dosarSelectat) return;
      const updated = { ...dosarSelectat, [camp]: valoare };
      setDosarSelectat(updated);
      setDosare((prev) =>
        prev.map((d) => (d.id === dosarSelectat.id ? updated : d))
      );
    },
    [dosarSelectat]
  );

  const handleSterge = useCallback(
    async (id: string) => {
      if (!confirm(t("confirmDelete"))) return;
      const { error } = await supabase
        .from("client_cases")
        .delete()
        .eq("id", id);
      if (!error) {
        setDosare((prev) => prev.filter((d) => d.id !== id));
        setDosarSelectat(null);
      }
    },
    [t]
  );

  const filtrati = useMemo(() => {
    const tt = cautare.toLowerCase().trim();
    if (!tt) return dosare;
    return dosare.filter(
      (d) =>
        (d.client_name || "").toLowerCase().includes(tt) ||
        (d.phone_number || "").replace(/\D/g, "").includes(tt.replace(/\D/g, "")) ||
        (d.phone_number || "").includes(tt) ||
        (d.client_email || "").toLowerCase().includes(tt)
    );
  }, [dosare, cautare]);

  return (
    <main className="min-h-screen bg-slate-50/50 p-4 md:p-12 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">

        <div className="mb-12 bg-white p-10 rounded-[50px] shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900">
              {t("title")}{" "}
              <span className="text-amber-500 underline decoration-4 underline-offset-8">
                {t("titleHighlight")}
              </span>
            </h1>
            <p id="onboarding-clienti-sync" className="text-slate-400 font-bold text-[10px] uppercase mt-4 tracking-[0.3em] flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              {t("profilesFound", { count: dosare.length })}
            </p>
          </div>

          <div id="onboarding-clienti-search" className="relative w-full md:w-96">
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              className="w-full p-6 pl-16 bg-slate-50 border-2 border-transparent focus:border-amber-500 rounded-[30px] outline-none font-black italic shadow-inner transition-all uppercase text-sm"
              value={cautare}
              onChange={(e) => setCautare(e.target.value)}
            />
            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl opacity-20">
              🔍
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {incarcare && dosare.length === 0 ? (
            <div className="col-span-full py-32 text-center font-black text-slate-200 text-3xl italic uppercase animate-pulse tracking-widest">
              {t("syncing")}
            </div>
          ) : filtrati.length === 0 ? (
            <div className="col-span-full py-32 text-center bg-white rounded-[50px] border-2 border-dashed border-slate-100">
              <span className="text-6xl block mb-4">📭</span>
              <p className="font-black text-slate-400 text-xl uppercase italic">
                {t("noneFound")}
              </p>
            </div>
          ) : (
            filtrati.map((d) => (
              <div
                key={d.id}
                onClick={() => setDosarSelectat(d)}
                className="group bg-white p-6 rounded-[40px] border border-slate-100 hover:border-amber-400 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex items-center gap-6"
              >
                <div className="w-20 h-20 shrink-0 bg-slate-900 rounded-[25px] overflow-hidden flex items-center justify-center border-4 border-slate-50 group-hover:scale-105 transition-transform shadow-lg">
                  {d.poza ? (
                    <img
                      src={d.poza}
                      className="w-full h-full object-cover"
                      alt="Client"
                    />
                  ) : (
                    <span className="text-2xl font-black text-amber-500 italic">
                      {(d.client_name || "C").charAt(0)}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-slate-900 uppercase italic truncate tracking-tight text-lg">
                    {d.client_name}
                  </h3>
                  <p className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md inline-block mt-1">
                    {d.phone_number || t("noPhone")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {dosarSelectat && userId && (
          <DosarClientComplet
            key={dosarSelectat.id}
            dosar={dosarSelectat}
            userId={userId}
            onClose={() => setDosarSelectat(null)}
            onUpdate={handleUpdate}
            onSterge={handleSterge}
          />
        )}
      </div>
    </main>
  );
}