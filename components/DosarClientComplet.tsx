"use client";
import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useTranslations } from "next-intl";

// ============================================================
// TIPURI
// ============================================================
interface Material {
  id: string;
  nume: string;
  cantitate: number;
  unitate: string;
  pret_unitar: number;
}

interface FisierAtasat {
  id: string;
  nume: string;
  url: string;
  tip: "imagine" | "video" | "audio" | "document";
  dimensiune?: number;
  created_at?: string;
}

interface Lucrare {
  id: string;
  nume: string;
  pret_serviciu: number;
  durata_minute: number;
  materiale: Material[];
  fisiere: FisierAtasat[];
  created_at: string;
}

interface DosarClientProps {
  dosar: any;
  userId: string;
  onClose: () => void;
  onUpdate: (camp: string, valoare: any) => void;
  onSterge: (id: string) => void;
}

// ============================================================
// UTILITARE
// ============================================================
const genId = () => Math.random().toString(36).slice(2, 10);

const tipFisier = (numeFisier: string): FisierAtasat["tip"] => {
  const ext = numeFisier.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(ext)) return "imagine";
  if (["mp4", "mov", "avi", "webm", "mkv"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "aac", "m4a"].includes(ext)) return "audio";
  return "document";
};

const iconTip = (tip: FisierAtasat["tip"]) => {
  if (tip === "imagine") return "🖼️";
  if (tip === "video") return "🎬";
  if (tip === "audio") return "🎵";
  return "📄";
};

const formatBytes = (bytes?: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ============================================================
// SUB-COMPONENTĂ: Calculator Lucrare
// ============================================================
function CalculatorLucrare({
  lucrare,
  onChange,
  onDelete,
}: {
  lucrare: Lucrare;
  onChange: (l: Lucrare) => void;
  onDelete: () => void;
}) {
  const t = useTranslations("dosarClient");
  const costMateriale = lucrare.materiale.reduce(
    (acc, m) => acc + m.cantitate * m.pret_unitar,
    0
  );
  const profit = lucrare.pret_serviciu - costMateriale;
  const marja = lucrare.pret_serviciu > 0 ? (profit / lucrare.pret_serviciu) * 100 : 0;

  const addMaterial = () => {
    onChange({
      ...lucrare,
      materiale: [
        ...lucrare.materiale,
        { id: genId(), nume: "", cantitate: 1, unitate: "g", pret_unitar: 0 },
      ],
    });
  };

  const updateMaterial = (idx: number, field: keyof Material, val: any) => {
    const updated = lucrare.materiale.map((m, i) =>
      i === idx ? { ...m, [field]: val } : m
    );
    onChange({ ...lucrare, materiale: updated });
  };

  const removeMaterial = (idx: number) => {
    onChange({ ...lucrare, materiale: lucrare.materiale.filter((_, i) => i !== idx) });
  };

  const profitColor =
    profit > 0
      ? "text-green-600 bg-green-50"
      : profit === 0
      ? "text-slate-500 bg-slate-50"
      : "text-red-600 bg-red-50";

  return (
    <div className="bg-white border border-slate-100 rounded-[30px] p-6 mb-4 shadow-sm">
      {/* Header lucrare */}
      <div className="flex items-start justify-between mb-5 gap-4">
        <input
          className="flex-1 font-black italic text-lg text-slate-900 bg-transparent outline-none border-b-2 border-transparent focus:border-amber-400 uppercase"
          placeholder={t("workNamePlaceholder")}
          value={lucrare.nume}
          onChange={(e) => onChange({ ...lucrare, nume: e.target.value })}
        />
        <button
          onClick={onDelete}
          className="text-[10px] text-red-400 hover:text-red-600 font-black uppercase italic shrink-0"
        >
          {t("deleteBtn")}
        </button>
      </div>

      {/* Preț serviciu + Durată */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-slate-50 p-4 rounded-[20px]">
          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{t("serviceePriceLabel")}</p>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full bg-transparent font-black italic text-2xl text-amber-600 outline-none"
            value={lucrare.pret_serviciu || ""}
            placeholder="0.00"
            onChange={(e) => onChange({ ...lucrare, pret_serviciu: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="bg-slate-50 p-4 rounded-[20px]">
          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{t("durationLabel")}</p>
          <input
            type="number"
            min="0"
            className="w-full bg-transparent font-black italic text-2xl text-slate-700 outline-none"
            value={lucrare.durata_minute || ""}
            placeholder="0"
            onChange={(e) => onChange({ ...lucrare, durata_minute: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      {/* Materiale utilizate */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
            {t("materialsUsedLabel")}
          </p>
          <button
            onClick={addMaterial}
            className="text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl hover:bg-amber-100 transition-all uppercase italic"
          >
            {t("addMaterialBtn")}
          </button>
        </div>

        {lucrare.materiale.length === 0 && (
          <p className="text-center text-slate-300 font-bold italic text-sm py-4">
            {t("noMaterials")}
          </p>
        )}

        <div className="space-y-2">
          {lucrare.materiale.map((mat, idx) => (
            <div
              key={mat.id}
              className="grid grid-cols-[1fr_80px_80px_100px_32px] gap-2 items-center"
            >
              <input
                className="bg-slate-50 px-3 py-2 rounded-xl text-sm font-bold italic outline-none focus:bg-amber-50 transition-all"
                placeholder={t("materialNamePlaceholder")}
                value={mat.nume}
                onChange={(e) => updateMaterial(idx, "nume", e.target.value)}
              />
              <input
                type="number"
                min="0"
                step="0.1"
                className="bg-slate-50 px-3 py-2 rounded-xl text-sm font-bold italic outline-none text-center focus:bg-amber-50 transition-all"
                placeholder="50"
                value={mat.cantitate || ""}
                onChange={(e) => updateMaterial(idx, "cantitate", parseFloat(e.target.value) || 0)}
              />
              <select
                className="bg-slate-50 px-2 py-2 rounded-xl text-sm font-bold italic outline-none focus:bg-amber-50 transition-all"
                value={mat.unitate}
                onChange={(e) => updateMaterial(idx, "unitate", e.target.value)}
              >
                <option value="g">{t("unitGram")}</option>
                <option value="ml">{t("unitMl")}</option>
                <option value="buc">{t("unitPiece")}</option>
                <option value="l">{t("unitLiter")}</option>
                <option value="kg">{t("unitKg")}</option>
              </select>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{t("ronPerUnit")}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full bg-slate-50 pl-12 pr-2 py-2 rounded-xl text-sm font-black italic outline-none text-right focus:bg-amber-50 transition-all"
                  placeholder="0"
                  value={mat.pret_unitar || ""}
                  onChange={(e) => updateMaterial(idx, "pret_unitar", parseFloat(e.target.value) || 0)}
                />
              </div>
              <button
                onClick={() => removeMaterial(idx)}
                className="text-slate-300 hover:text-red-400 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Header coloane */}
        {lucrare.materiale.length > 0 && (
          <div className="grid grid-cols-[1fr_80px_80px_100px_32px] gap-2 mt-1 px-1">
            {[t("colProduct"), t("colQuantity"), t("colUnit"), t("colPricePerUnit"), ""].map((h, i) => (
              <p key={i} className="text-[8px] text-slate-300 font-black uppercase text-center">{h}</p>
            ))}
          </div>
        )}
      </div>

      {/* Sumar financiar */}
      <div className="border-t border-slate-100 pt-4 grid grid-cols-3 gap-3">
        <div className="text-center bg-slate-50 p-3 rounded-2xl">
          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{t("materialsCostLabel")}</p>
          <p className="font-black italic text-slate-700 text-lg">{costMateriale.toFixed(2)} <span className="text-xs text-slate-400">RON</span></p>
        </div>
        <div className={`text-center p-3 rounded-2xl ${profitColor}`}>
          <p className="text-[8px] font-black uppercase mb-1 opacity-60">
            {profit >= 0 ? t("netProfitLabel") : t("lossLabel")}
          </p>
          <p className="font-black italic text-lg">{Math.abs(profit).toFixed(2)} <span className="text-xs opacity-60">RON</span></p>
        </div>
        <div className="text-center bg-slate-50 p-3 rounded-2xl">
          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{t("profitMarginLabel")}</p>
          <p className={`font-black italic text-lg ${marja >= 30 ? "text-green-600" : marja >= 10 ? "text-amber-600" : "text-red-600"}`}>
            {marja.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Indicator vizual profitabilitate */}
      <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            marja >= 30 ? "bg-green-400" : marja >= 10 ? "bg-amber-400" : "bg-red-400"
          }`}
          style={{ width: `${Math.min(Math.max(marja, 0), 100)}%` }}
        />
      </div>
      <p className="text-[8px] text-slate-300 font-bold text-right mt-1 uppercase">
        {marja >= 30 ? t("profitGood") : marja >= 10 ? t("profitMedium") : marja >= 0 ? t("profitLow") : t("profitBelow")}
      </p>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTĂ: Manager Fișiere
// ============================================================
function ManagerFisiere({
  fisiere,
  onAdd,
  onDelete,
  dosarId,
}: {
  fisiere: FisierAtasat[];
  onAdd: (f: FisierAtasat) => void;
  onDelete: (id: string) => void;
  dosarId: string;
}) {
  const t = useTranslations("dosarClient");
  const [incarcare, setIncarcare] = useState(false);
  const [previzualizare, setPrevizualizare] = useState<FisierAtasat | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setIncarcare(true);
    for (const file of files) {
      try {
        const ext = file.name.split(".").pop();
        const fileName = `dosare/${dosarId}/${genId()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("appointment-photos")
          .upload(fileName, file);
        if (uploadErr) throw uploadErr;
        const { data: { publicUrl } } = supabase.storage
          .from("appointment-photos")
          .getPublicUrl(fileName);
        onAdd({
          id: genId(),
          nume: file.name,
          url: publicUrl,
          tip: tipFisier(file.name),
          dimensiune: file.size,
          created_at: new Date().toISOString(),
        });
      } catch {
        alert(`${t("uploadErrorPrefix")}${file.name}`);
      }
    }
    setIncarcare(false);
    e.target.value = "";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
          {t("filesAttachedLabel")} ({fisiere.length})
        </p>
        <label className={`text-[10px] font-black px-4 py-2 rounded-xl cursor-pointer uppercase italic transition-all ${incarcare ? "bg-slate-100 text-slate-400" : "bg-amber-50 text-amber-600 hover:bg-amber-100"}`}>
          {incarcare ? t("uploading") : t("addFilesBtn")}
          <input
            type="file"
            className="hidden"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
            onChange={handleUpload}
            disabled={incarcare}
          />
        </label>
      </div>

      {fisiere.length === 0 && (
        <div className="border-2 border-dashed border-slate-100 rounded-[25px] py-8 text-center">
          <p className="text-slate-300 font-bold italic text-sm">{t("noFilesAttached")}</p>
          <p className="text-slate-200 text-xs mt-1">{t("supportsTypes")}</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {fisiere.map((f) => (
          <div
            key={f.id}
            className="group relative bg-white border border-slate-100 rounded-[20px] overflow-hidden hover:border-amber-300 transition-all cursor-pointer"
            onClick={() => setPrevizualizare(f)}
          >
            {f.tip === "imagine" ? (
              <img src={f.url} className="w-full h-24 object-cover" alt={f.nume} />
            ) : (
              <div className="w-full h-24 bg-slate-50 flex items-center justify-center text-3xl">
                {iconTip(f.tip)}
              </div>
            )}
            <div className="p-2">
              <p className="text-[10px] font-black text-slate-600 truncate">{f.nume}</p>
              <p className="text-[9px] text-slate-300">{formatBytes(f.dimensiune)}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(f.id); }}
              className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-black opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Previzualizare fișier */}
      {previzualizare && (
        <div
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4"
          onClick={() => setPrevizualizare(null)}
        >
          <div className="max-w-3xl w-full bg-white rounded-[40px] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 bg-slate-900 text-white">
              <p className="font-black italic text-sm truncate">{previzualizare.nume}</p>
              <div className="flex gap-3">
                <a
                  href={previzualizare.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] bg-amber-500 text-white px-4 py-2 rounded-xl font-black uppercase hover:bg-amber-400 transition-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t("openLink")}
                </a>
                <button onClick={() => setPrevizualizare(null)} className="text-slate-400 hover:text-white transition-colors text-xl">×</button>
              </div>
            </div>
            <div className="p-6 max-h-[70vh] overflow-auto flex items-center justify-center bg-slate-50">
              {previzualizare.tip === "imagine" && (
                <img src={previzualizare.url} className="max-w-full max-h-[60vh] rounded-2xl object-contain" alt={previzualizare.nume} />
              )}
              {previzualizare.tip === "video" && (
                <video src={previzualizare.url} controls className="max-w-full max-h-[60vh] rounded-2xl" />
              )}
              {previzualizare.tip === "audio" && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🎵</div>
                  <audio src={previzualizare.url} controls className="w-full" />
                  <p className="text-slate-500 font-bold italic mt-4 text-sm">{previzualizare.nume}</p>
                </div>
              )}
              {previzualizare.tip === "document" && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📄</div>
                  <p className="text-slate-700 font-black italic text-lg">{previzualizare.nume}</p>
                  <p className="text-slate-400 text-sm mt-2">{formatBytes(previzualizare.dimensiune)}</p>
                  <a href={previzualizare.url} target="_blank" rel="noreferrer" className="mt-6 inline-block px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase hover:bg-amber-600 transition-all">
                    {t("downloadFileBtn")}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMPONENTA PRINCIPALĂ: Pop-up Dosar Client
// ============================================================
export default function DosarClientComplet({
  dosar,
  userId,
  onClose,
  onUpdate,
  onSterge,
}: DosarClientProps) {
  const t = useTranslations("dosarClient");

  // Guard: dacă dosarul nu e încă disponibil, nu randăm nimic
  if (!dosar) return null;

  // Parsăm lucrările și fișierele din câmpurile JSON ale dosarului
  const [lucrari, setLucrari] = useState<Lucrare[]>(() => {
    try { return JSON.parse(dosar.lucrari || "[]"); } catch { return []; }
  });
  const [fisiere, setFisiere] = useState<FisierAtasat[]>(() => {
    try { return JSON.parse(dosar.fisiere_atasate || "[]"); } catch { return []; }
  });
  const [tabActiv, setTabActiv] = useState<"profil" | "lucrari" | "fisiere">("profil");
  const [dosarLocal, setDosarLocal] = useState(dosar);
  const dosarId = dosar?.id ?? dosarLocal?.id ?? null;

  // Salvare automată lucrări în Supabase
  const salveazaLucrari = useCallback(async (l: Lucrare[]) => {
    if (!dosarId) return;
    setLucrari(l);
    const { error } = await supabase
      .from("client_cases")
      .update({ lucrari: JSON.stringify(l) })
      .eq("id", dosarId);
    if (error) console.error("Eroare salvare lucrări:", error.message);
  }, [dosarId]);

  // Salvare automată fișiere
  const salveazaFisiere = useCallback(async (f: FisierAtasat[]) => {
    if (!dosarId) return;
    setFisiere(f);
    const { error } = await supabase
      .from("client_cases")
      .update({ fisiere_atasate: JSON.stringify(f) })
      .eq("id", dosarId);
    if (error) console.error("Eroare salvare fișiere:", error.message);
  }, [dosarId]);

  const adaugaLucrare = () => {
    const noua: Lucrare = {
      id: genId(),
      nume: "",
      pret_serviciu: 0,
      durata_minute: 0,
      materiale: [],
      fisiere: [],
      created_at: new Date().toISOString(),
    };
    salveazaLucrari([...lucrari, noua]);
  };

  const updateLucrare = (idx: number, l: Lucrare) => {
    const updated = lucrari.map((item, i) => (i === idx ? l : item));
    salveazaLucrari(updated);
  };

  const stergeLucrare = (idx: number) => {
    if (!confirm(t("confirmDeleteWork"))) return;
    salveazaLucrari(lucrari.filter((_, i) => i !== idx));
  };

  const actualizeazaCamp = async (camp: string, valoare: any) => {
    if (!dosarId || dosarLocal[camp] === valoare) return;
    setDosarLocal((prev: any) => ({ ...prev, [camp]: valoare }));
    const { error } = await supabase
      .from("client_cases")
      .update({ [camp]: valoare })
      .eq("id", dosarId);
    if (!error) onUpdate(camp, valoare);
  };

  // Stats totale
  const totalPretServicii = lucrari.reduce((acc, l) => acc + (l.pret_serviciu || 0), 0);
  const totalCostMateriale = lucrari.reduce(
    (acc, l) => acc + l.materiale.reduce((a, m) => a + m.cantitate * m.pret_unitar, 0),
    0
  );
  const totalProfit = totalPretServicii - totalCostMateriale;

  const tabs = [
    { key: "profil" as const, label: t("tabProfile"), icon: "👤" },
    { key: "lucrari" as const, label: `${t("tabWorks")} (${lucrari.length})`, icon: "🔧" },
    { key: "fisiere" as const, label: `${t("tabFiles")} (${fisiere.length})`, icon: "📎" },
  ];

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-4xl rounded-[60px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-8 bg-slate-900 text-white shrink-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-amber-500 rounded-[25px] flex items-center justify-center text-2xl font-black italic overflow-hidden border-2 border-amber-400">
                {dosarLocal.poza ? (
                  <img src={dosarLocal.poza} className="w-full h-full object-cover" alt="" />
                ) : (
                  (dosarLocal.client_name || "C").charAt(0)
                )}
              </div>
              <div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">
                  {t("headerTitle")} <span className="text-amber-500">{t("headerHighlight")}</span>
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">
                  {dosarLocal.client_name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-12 h-12 flex items-center justify-center bg-white/10 rounded-2xl hover:bg-red-500 transition-all text-lg"
            >
              ✕
            </button>
          </div>

          {/* Stats financiare header */}
          {lucrari.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white/10 rounded-2xl p-3 text-center">
                <p className="text-[8px] text-slate-400 font-black uppercase">{t("statTotalRevenue")}</p>
                <p className="font-black italic text-amber-400 text-xl">{totalPretServicii.toFixed(0)} RON</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-3 text-center">
                <p className="text-[8px] text-slate-400 font-black uppercase">{t("statMaterialsCost")}</p>
                <p className="font-black italic text-slate-300 text-xl">{totalCostMateriale.toFixed(0)} RON</p>
              </div>
              <div className={`rounded-2xl p-3 text-center ${totalProfit >= 0 ? "bg-green-500/20" : "bg-red-500/20"}`}>
                <p className="text-[8px] text-slate-400 font-black uppercase">{t("statNetProfit")}</p>
                <p className={`font-black italic text-xl ${totalProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {totalProfit.toFixed(0)} RON
                </p>
              </div>
            </div>
          )}

          {/* Tab-uri */}
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setTabActiv(tab.key)}
                className={`px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase italic transition-all ${
                  tabActiv === tab.key
                    ? "bg-amber-500 text-white"
                    : "bg-white/10 text-slate-400 hover:bg-white/20"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* BODY */}
        <div className="p-8 overflow-y-auto bg-slate-50 flex-grow">

          {/* TAB: PROFIL */}
          {tabActiv === "profil" && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-5 rounded-[25px] shadow-sm border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase italic mb-2">{t("fullNameLabel")}</p>
                  <input
                    className="w-full bg-transparent font-black italic text-xl outline-none focus:text-amber-600 uppercase"
                    value={dosarLocal.client_name || ""}
                    onChange={(e) => setDosarLocal({ ...dosarLocal, client_name: e.target.value })}
                    onBlur={(e) => actualizeazaCamp("client_name", e.target.value)}
                  />
                </div>
                <div className="bg-white p-5 rounded-[25px] shadow-sm border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase italic mb-2">{t("statusLabel")}</p>
                  <select
                    className="w-full bg-transparent font-black italic text-amber-600 outline-none uppercase"
                    value={dosarLocal.status}
                    onChange={(e) => actualizeazaCamp("status", e.target.value)}
                  >
                    <option value="Activ">{t("statusActive")}</option>
                    <option value="Inchis">{t("statusArchived")}</option>
                  </select>
                </div>
                <div className="bg-white p-5 rounded-[25px] shadow-sm border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase italic mb-2">{t("emailLabel")}</p>
                  <input className="w-full bg-transparent font-bold italic outline-none text-slate-600" value={dosarLocal.client_email || ""} readOnly />
                </div>
                <div className="bg-white p-5 rounded-[25px] shadow-sm border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase italic mb-2">{t("phoneLabel")}</p>
                  <input className="w-full bg-transparent font-bold italic outline-none text-slate-600" value={dosarLocal.phone_number || ""} readOnly />
                </div>
              </div>
              <div className="px-1">
                <p className="text-[9px] font-black text-slate-400 uppercase italic mb-2 ml-1">{t("historyNotesLabel")}</p>
                <textarea
                  className="w-full p-6 bg-white border border-slate-100 rounded-[30px] min-h-[200px] outline-none font-medium italic text-slate-600 text-sm focus:border-amber-200 shadow-sm transition-all"
                  value={dosarLocal.description || ""}
                  onChange={(e) => setDosarLocal({ ...dosarLocal, description: e.target.value })}
                  onBlur={(e) => actualizeazaCamp("description", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* TAB: LUCRĂRI */}
          {tabActiv === "lucrari" && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {t("worksTabTitle")}
                </p>
                <button
                  onClick={adaugaLucrare}
                  className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase italic hover:bg-amber-600 transition-all shadow-sm"
                >
                  {t("newWorkBtn")}
                </button>
              </div>

              {lucrari.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
                  <span className="text-5xl block mb-3">🔧</span>
                  <p className="font-black text-slate-400 text-lg uppercase italic">{t("noWorksTitle")}</p>
                  <p className="text-slate-300 text-sm mt-2">{t("noWorksSubtitle")}</p>
                </div>
              ) : (
                lucrari.map((l, idx) => (
                  <CalculatorLucrare
                    key={l.id}
                    lucrare={l}
                    onChange={(updated) => updateLucrare(idx, updated)}
                    onDelete={() => stergeLucrare(idx)}
                  />
                ))
              )}
            </div>
          )}

          {/* TAB: FIȘIERE */}
          {tabActiv === "fisiere" && (
            <ManagerFisiere
              fisiere={fisiere}
              dosarId={dosarId ?? ""}
              onAdd={(f) => salveazaFisiere([...fisiere, f])}
              onDelete={(id) => salveazaFisiere(fisiere.filter((f) => f.id !== id))}
            />
          )}
        </div>

        {/* FOOTER */}
        <div className="px-10 py-6 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
          <button
            onClick={() => onSterge(dosar.id)}
            className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase italic tracking-widest"
          >
            {t("removeClientBtn")}
          </button>
          <button
            onClick={onClose}
            className="px-10 py-4 bg-slate-900 text-white rounded-[20px] font-black text-[11px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg"
          >
            {t("finalizeBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}