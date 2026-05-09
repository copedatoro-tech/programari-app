"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";

// ─── TIPURI ────────────────────────────────────────────────
type ContactUniversal = {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  role: string;
  image_url: string | null;
  email: string;
  note: string;
  folder_id: string | null;
};

type Folder = {
  id: string;
  user_id: string;
  nume: string;
  culoare: string;
  created_at?: string;
};

// ─── CULORI FOLDERE ────────────────────────────────────────
const CULORI = [
  { val: "amber",  dot: "bg-amber-500",   pill: "bg-amber-100 text-amber-700"    },
  { val: "blue",   dot: "bg-blue-500",    pill: "bg-blue-100 text-blue-700"      },
  { val: "green",  dot: "bg-emerald-500", pill: "bg-emerald-100 text-emerald-700"},
  { val: "purple", dot: "bg-violet-500",  pill: "bg-violet-100 text-violet-700"  },
  { val: "red",    dot: "bg-rose-500",    pill: "bg-rose-100 text-rose-700"      },
  { val: "slate",  dot: "bg-slate-500",   pill: "bg-slate-100 text-slate-600"    },
  { val: "cyan",   dot: "bg-cyan-500",    pill: "bg-cyan-100 text-cyan-700"      },
  { val: "orange", dot: "bg-orange-500",  pill: "bg-orange-100 text-orange-700"  },
];

const getCuloare = (val: string) => CULORI.find(c => c.val === val) ?? CULORI[5];

// ─── SELECTOR FOLDER (refolosit în formular + modal editare) ─
function FolderSelector({
  foldere,
  folderSelectat,
  onChange,
}: {
  foldere: Folder[];
  folderSelectat: string | null;
  onChange: (id: string | null) => void;
}) {
  if (foldere.length === 0) return null;
  return (
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
        Folder (opțional)
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase italic transition-all border ${
            !folderSelectat
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300"
          }`}
        >
          Fără Folder
        </button>
        {foldere.map(f => {
          const col = getCuloare(f.culoare);
          const eSelectat = folderSelectat === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onChange(eSelectat ? null : f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase italic transition-all border ${
                eSelectat
                  ? `${col.pill} border-transparent shadow`
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
              {f.nume}
              {eSelectat && <span className="text-[8px]">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── MODAL FOLDER NOU / EDITARE ───────────────────────────
// FIX PRINCIPAL: eliminat useEffect cu mousedown care provoca
// închiderea prematură la click pe butoanele interne.
// Acum se închide DOAR prin overlay-click, butonul ✕ sau "Anulează".
function ModalFolder({
  folder,
  onSalveaza,
  onClose,
  onSterge,
}: {
  folder?: Folder | null;
  onSalveaza: (date: { nume: string; culoare: string }) => void;
  onClose: () => void;
  onSterge?: () => void;
}) {
  const [nume, setNume] = useState(folder?.nume ?? "");
  const [culoare, setCuloare] = useState(folder?.culoare ?? "amber");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const col = getCuloare(culoare);

  const handleSalveaza = () => {
    if (!nume.trim()) return;
    onSalveaza({ nume: nume.trim(), culoare });
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-sm rounded-[36px] shadow-2xl p-8 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 bg-white border-2 border-amber-400 rounded-full flex items-center justify-center text-amber-600 font-black text-sm hover:bg-amber-50 transition-all"
        >
          ✕
        </button>

        <h3 className="text-xl font-black italic uppercase text-slate-900 mb-6 text-center">
          {folder ? "Editează" : "Folder"} <span className="text-amber-500">Nou</span>
        </h3>

        {/* Preview live */}
        <div className="flex justify-center mb-5">
          <div className={`px-5 py-2 rounded-full ${col.pill} font-black text-xs uppercase italic tracking-widest transition-all`}>
            {nume || "NUME FOLDER"}
          </div>
        </div>

        <input
          autoFocus
          type="text"
          placeholder="NUME FOLDER..."
          value={nume}
          onChange={e => setNume(e.target.value.toUpperCase())}
          onKeyDown={e => { if (e.key === "Enter") handleSalveaza(); }}
          className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-amber-400 rounded-[16px] outline-none font-black italic uppercase text-sm mb-5 transition-all"
        />

        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Culoare</p>
        <div className="flex gap-3 mb-7 flex-wrap">
          {CULORI.map(c => (
            <button
              key={c.val}
              type="button"
              onClick={() => setCuloare(c.val)}
              className={`w-8 h-8 rounded-full ${c.dot} transition-all ${
                culoare === c.val
                  ? "scale-125 ring-4 ring-offset-2 ring-slate-400 shadow-lg"
                  : "hover:scale-110"
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-[16px] font-black text-[11px] uppercase italic hover:bg-slate-200 transition-all"
          >
            Anulează
          </button>
          <button
            type="button"
            onClick={handleSalveaza}
            disabled={!nume.trim()}
            className="flex-1 py-3 bg-slate-900 text-white rounded-[16px] font-black text-[11px] uppercase italic hover:bg-amber-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {folder ? "Actualizează" : "Creează"}
          </button>
        </div>

        {folder && onSterge && (
          <button
            type="button"
            onClick={onSterge}
            className="w-full mt-4 py-2 text-red-500 font-black text-[10px] uppercase italic opacity-60 hover:opacity-100 transition-all"
          >
            Șterge Folderul ✕
          </button>
        )}
      </div>
    </div>
  );
}

// ─── PAGINA PRINCIPALĂ ────────────────────────────────────
export default function ContacteUtilePage() {
  const [contacte, setContacte] = useState<ContactUniversal[]>([]);
  const [foldere, setFoldere] = useState<Folder[]>([]);
  const [form, setForm] = useState({
    nume: "", rol: "", telefon: "", email: "", note: "", folder_id: null as string | null,
  });
  const [contactEditat, setContactEditat] = useState<ContactUniversal | null>(null);
  const [folderActiv, setFolderActiv] = useState<string | null>(null);
  const [showModalFolder, setShowModalFolder] = useState(false);
  const [folderEditat, setFolderEditat] = useState<Folder | null>(null);
  const [showFoldereDropdown, setShowFoldereDropdown] = useState(false);
  const [userPlan, setUserPlan] = useState("START (GRATUIT)");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const limitaContacte =
    userPlan === "START (GRATUIT)" ? 5 :
    userPlan === "CHRONOS PRO" ? 100 : 9999;

  // ── Init ──
  useEffect(() => {
    let mounted = true;
    const initFetch = async () => {
      setLoading(true);
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!mounted || error || !user) { setLoading(false); return; }
        setCurrentUser(user);

        const [profileRes, contactsRes, foldereRes] = await Promise.all([
          supabase.from("profiles").select("plan_type").eq("id", user.id).single(),
          supabase.from("contacts").select("*").eq("user_id", user.id).order("name", { ascending: true }),
          supabase.from("contact_folders").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
        ]);

        if (profileRes.data) setUserPlan(profileRes.data.plan_type ?? "START (GRATUIT)");

        if (!contactsRes.error) {
          const raw: any[] = contactsRes.data ?? [];
          setContacte(raw.map(c => ({
            id: c.id ?? "",
            user_id: c.user_id ?? "",
            name: c.name ?? c.nume ?? "",
            phone: c.phone ?? c.telefon ?? "",
            role: c.role ?? c.rol ?? "",
            image_url: c.image_url ?? null,
            email: c.email ?? "",
            note: c.note ?? c.nota ?? c.notes ?? "",
            folder_id: c.folder_id ?? null,
          })));
        } else {
          console.error("Eroare contacts:", contactsRes.error);
        }

        if (!foldereRes.error) {
          setFoldere(foldereRes.data ?? []);
        } else {
          console.error("Eroare contact_folders:", foldereRes.error);
        }
      } catch (err) {
        console.error("Eroare init:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    initFetch();
    return () => { mounted = false; };
  }, []);

  // ── Click outside doar pentru dropdown ──
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setShowFoldereDropdown(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // ── Contacte filtrate ──
  const contacteFiltrate = useMemo(() =>
    folderActiv ? contacte.filter(c => c.folder_id === folderActiv) : contacte,
    [contacte, folderActiv]
  );

  const folderActivObj = useMemo(
    () => foldere.find(f => f.id === folderActiv),
    [foldere, folderActiv]
  );

  // ── CRUD Foldere ──
  const creeazaFolder = async (date: { nume: string; culoare: string }) => {
    if (!currentUser) return;
    try {
      const { data, error } = await supabase
        .from("contact_folders")
        .insert([{ user_id: currentUser.id, ...date }])
        .select()
        .single();
      if (error) { alert("EROARE FOLDER: " + error.message); return; }
      if (data) {
        setFoldere(prev => [...prev, data as Folder]);
        setShowModalFolder(false);
      }
    } catch (err: any) {
      alert("EROARE: " + err.message);
    }
  };

  const actualizeazaFolder = async (date: { nume: string; culoare: string }) => {
    if (!folderEditat) return;
    const { error } = await supabase
      .from("contact_folders").update(date).eq("id", folderEditat.id);
    if (!error) {
      setFoldere(prev => prev.map(f => f.id === folderEditat.id ? { ...f, ...date } : f));
      setFolderEditat(null);
    } else {
      alert("EROARE: " + error.message);
    }
  };

  const stergeFolder = async (id: string) => {
    if (!confirm("Ștergi folderul? Contactele rămân, dar nu vor mai fi atribuite.")) return;
    const { error } = await supabase.from("contact_folders").delete().eq("id", id);
    if (!error) {
      setFoldere(prev => prev.filter(f => f.id !== id));
      setContacte(prev => prev.map(c => c.folder_id === id ? { ...c, folder_id: null } : c));
      if (folderActiv === id) setFolderActiv(null);
      setFolderEditat(null);
    } else {
      alert("EROARE: " + error.message);
    }
  };

  // ── CRUD Contacte ──
  const adaugaContact = async () => {
    if (!form.nume.trim()) return alert("NUMELE ESTE OBLIGATORIU!");
    if (!form.telefon.trim()) return alert("TELEFONUL ESTE OBLIGATORIU!");
    if (form.email && !form.email.includes("@")) return alert("EMAIL INVALID!");
    if (contacte.length >= limitaContacte) return alert(`LIMITA PLANULUI ${userPlan} ATINSĂ!`);
    if (!currentUser) return alert("SESIUNE EXPIRATĂ.");

    try {
      const { data, error } = await supabase
        .from("contacts")
        .insert([{
          user_id: currentUser.id,
          name: form.nume.trim().toUpperCase(),
          phone: form.telefon.trim(),
          role: form.rol.trim().toUpperCase(),
          email: form.email.trim().toUpperCase(),
          note: form.note.trim().toUpperCase(),
          folder_id: form.folder_id ?? null,
        }])
        .select()
        .single();

      if (error) { alert("EROARE: " + error.message); return; }

      if (data) {
        const raw: any = data;
        const nou: ContactUniversal = {
          id: raw.id ?? "",
          user_id: raw.user_id ?? "",
          name: raw.name ?? raw.nume ?? "",
          phone: raw.phone ?? raw.telefon ?? "",
          role: raw.role ?? raw.rol ?? "",
          image_url: raw.image_url ?? null,
          email: raw.email ?? "",
          note: raw.note ?? raw.nota ?? raw.notes ?? "",
          folder_id: raw.folder_id ?? null,
        };
        setContacte(prev => [...prev, nou].sort((a, b) => a.name.localeCompare(b.name)));
        setForm({ nume: "", rol: "", telefon: "", email: "", note: "", folder_id: null });
        alert("CONTACT SALVAT!");
      }
    } catch (err: any) {
      alert("EROARE: " + err.message);
    }
  };

  const stergeContact = async (id: string) => {
    if (!confirm("ȘTERGI DEFINITIV?")) return;
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (!error) {
      setContacte(prev => prev.filter(c => c.id !== id));
      setContactEditat(null);
    }
  };

  const salveazaEditare = async () => {
    if (!contactEditat) return;
    if (contactEditat.email && !contactEditat.email.includes("@")) return alert("EMAIL INVALID!");
    const { error } = await supabase.from("contacts").update({
      name: contactEditat.name.toUpperCase(),
      role: contactEditat.role.toUpperCase(),
      phone: contactEditat.phone,
      email: contactEditat.email.toUpperCase(),
      note: contactEditat.note.toUpperCase(),
      folder_id: contactEditat.folder_id ?? null,
    }).eq("id", contactEditat.id);
    if (!error) {
      setContacte(prev => prev.map(c => c.id === contactEditat.id ? contactEditat : c));
      setContactEditat(null);
    } else {
      alert("EROARE: " + error.message);
    }
  };

  // ─── RENDER ──────────────────────────────────────────────
  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto mb-20 font-black italic uppercase">

      {/* ── HEADER ── */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-[40px] shadow-2xl border border-slate-100">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">
            Contacte <span className="text-amber-600">Utile</span>
          </h2>
          <p className="text-slate-400 font-black mt-1 uppercase text-[9px] tracking-[0.3em] italic">
            Management Parteneri • {userPlan}
          </p>
        </div>
        <div className="bg-slate-900 text-white px-6 py-3 rounded-[20px] shadow-xl text-[10px] font-black uppercase tracking-widest italic border-b-4 border-slate-700 self-start md:self-center">
          {contacte.length} / {limitaContacte > 1000 ? "∞" : limitaContacte} Capacitate
        </div>
      </div>

      {/* ── FORMULAR ADAUGARE ── */}
      <section className="bg-white p-6 md:p-8 rounded-[40px] shadow-2xl border border-slate-100 mb-6 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-2 h-full bg-amber-500 group-hover:w-3 transition-all" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <input
            type="text" placeholder="NUME COMPLET *" value={form.nume}
            onChange={e => setForm({ ...form, nume: e.target.value.toUpperCase() })}
            className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-[18px] outline-none focus:border-amber-500 font-bold text-xs italic uppercase transition-all"
          />
          <input
            type="text" placeholder="ROL / CATEGORIE" value={form.rol}
            onChange={e => setForm({ ...form, rol: e.target.value.toUpperCase() })}
            className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-[18px] outline-none focus:border-amber-500 font-bold text-xs italic uppercase transition-all"
          />
          <input
            type="tel" placeholder="TELEFON *" value={form.telefon}
            onChange={e => setForm({ ...form, telefon: e.target.value.replace(/[^0-9+]/g, "") })}
            className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-[18px] outline-none focus:border-amber-500 font-bold text-xs italic uppercase transition-all"
          />
          <input
            type="email" placeholder="EMAIL (OPȚIONAL)" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value.toUpperCase() })}
            className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-[18px] outline-none focus:border-amber-500 font-bold text-xs italic uppercase transition-all"
          />
        </div>

        <div className="mt-4 flex flex-col md:flex-row gap-4">
          <input
            type="text" placeholder="NOTE SAU DETALII SPECIALE..." value={form.note}
            onChange={e => setForm({ ...form, note: e.target.value.toUpperCase() })}
            className="flex-1 p-4 bg-slate-50 border-2 border-slate-50 rounded-[18px] outline-none focus:border-amber-500 font-bold text-xs italic uppercase transition-all"
          />
          <button
            onClick={adaugaContact}
            className="px-10 bg-slate-900 text-white rounded-[20px] font-black text-[11px] uppercase tracking-[0.2em] italic hover:bg-amber-600 transition-all shadow-xl border-b-4 border-slate-700 py-4"
          >
            + Salvează
          </button>
        </div>

        {/* Selector folder în formularul de adăugare */}
        {foldere.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <FolderSelector
              foldere={foldere}
              folderSelectat={form.folder_id}
              onChange={id => setForm({ ...form, folder_id: id })}
            />
          </div>
        )}
      </section>

      {/* ── BARA FOLDERE ── */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">

        <button
          onClick={() => setFolderActiv(null)}
          className={`px-4 py-2 rounded-[12px] text-[10px] font-black uppercase italic transition-all border-2 ${
            folderActiv === null
              ? "bg-slate-900 text-white border-slate-900 shadow-md"
              : "bg-white text-slate-500 border-slate-100 hover:border-slate-300"
          }`}
        >
          Toate ({contacte.length})
        </button>

        {foldere.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowFoldereDropdown(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-[12px] text-[10px] font-black uppercase italic transition-all border-2 ${
                folderActiv
                  ? `${getCuloare(folderActivObj?.culoare ?? "slate").pill} border-transparent shadow-md`
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              <span>
                {folderActiv && folderActivObj
                  ? `${folderActivObj.nume} (${contacteFiltrate.length})`
                  : `Foldere (${foldere.length})`}
              </span>
              <span className={`transition-transform duration-200 ${showFoldereDropdown ? "rotate-180" : ""}`}>▾</span>
            </button>

            {showFoldereDropdown && (
              <div className="absolute top-full mt-2 left-0 bg-white rounded-[20px] shadow-2xl border border-slate-100 py-2 px-2 z-50 min-w-[220px]">
                <button
                  onClick={() => { setFolderActiv(null); setShowFoldereDropdown(false); }}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-[12px] text-[10px] font-black uppercase italic transition-all ${
                    folderActiv === null ? "bg-slate-900 text-white" : "hover:bg-slate-50 text-slate-500"
                  }`}
                >
                  <span>Toate Contactele</span>
                  <span className="opacity-50">{contacte.length}</span>
                </button>

                <div className="h-px bg-slate-100 my-1.5 mx-2" />

                {foldere.map(f => {
                  const col = getCuloare(f.culoare);
                  const nr = contacte.filter(c => c.folder_id === f.id).length;
                  const eActiv = folderActiv === f.id;
                  return (
                    <div key={f.id} className="flex items-center gap-1">
                      <button
                        onClick={() => { setFolderActiv(eActiv ? null : f.id); setShowFoldereDropdown(false); }}
                        className={`flex-1 flex items-center justify-between gap-3 px-4 py-2.5 rounded-[12px] text-[10px] font-black uppercase italic transition-all ${
                          eActiv
                            ? "bg-slate-900 text-white"
                            : `${col.pill} opacity-80 hover:opacity-100`
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${col.dot} shrink-0`} />
                          <span className="truncate">{f.nume}</span>
                        </span>
                        <span className="opacity-60 shrink-0">{nr}</span>
                      </button>
                      <button
                        onClick={() => { setFolderEditat(f); setShowFoldereDropdown(false); }}
                        className="w-7 h-7 rounded-full hover:bg-amber-100 text-slate-400 hover:text-amber-600 flex items-center justify-center transition-all text-xs"
                        title="Editează folder"
                      >
                        ✎
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="w-px h-5 bg-slate-200 mx-1" />
        <button
          onClick={() => setShowModalFolder(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[12px] text-[10px] font-black uppercase italic transition-all border-2 border-dashed border-amber-300 text-amber-600 bg-amber-50 hover:bg-amber-100 hover:border-amber-400"
        >
          + Folder Nou
        </button>

        {folderActiv && folderActivObj && (
          <div className="ml-auto flex items-center gap-2">
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase ${getCuloare(folderActivObj.culoare).pill}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${getCuloare(folderActivObj.culoare).dot}`} />
              {folderActivObj.nume}
            </span>
            <button
              onClick={() => setFolderEditat(folderActivObj)}
              className="text-[9px] font-black uppercase italic text-slate-400 hover:text-amber-600 transition-all"
            >
              ✎ Editează
            </button>
          </div>
        )}
      </div>

      {/* ── GRID CONTACTE ── */}
      {loading ? (
        <div className="text-center py-16 font-black text-slate-300 animate-pulse uppercase text-xs tracking-widest">
          Sincronizare bază de date...
        </div>
      ) : contacteFiltrate.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100">
          <p className="font-black text-slate-400 text-sm uppercase italic">
            {folderActiv ? "Niciun contact în acest folder" : "Niciun contact adăugat încă"}
          </p>
        </div>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
        >
          {contacteFiltrate.map(c => {
            const folder = foldere.find(f => f.id === c.folder_id);
            const col = folder ? getCuloare(folder.culoare) : null;
            return (
              <div
                key={c.id}
                onClick={() => setContactEditat(c)}
                title={`CLICK PENTRU EDITARE: ${c.name}`}
                className="bg-white border border-slate-100 rounded-[22px] p-4 shadow-md transition-all cursor-pointer group hover:scale-[1.02] hover:border-amber-200 hover:shadow-lg flex flex-col relative overflow-hidden"
              >
                {col && <div className={`absolute top-0 left-0 right-0 h-1 ${col.dot}`} />}

                <div className="flex items-center gap-3 mb-3 mt-1">
                  <div className="w-9 h-9 bg-slate-900 text-amber-500 rounded-xl flex items-center justify-center text-sm font-black italic shadow shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-900 italic uppercase truncate leading-tight">{c.name}</h4>
                    <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest truncate block">
                      {c.role || "PARTENER"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 mb-3 flex-grow">
                  <div className="bg-slate-50 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-600 truncate">{c.phone}</div>
                  {c.email && (
                    <div className="bg-slate-50 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-400 truncate">{c.email}</div>
                  )}
                  {folder && col && (
                    <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase inline-flex items-center gap-1 ${col.pill}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                      {folder.nume}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5" onClick={e => e.stopPropagation()}>
                  <a href={`tel:${c.phone}`} className="py-2 bg-slate-900 text-white rounded-[12px] font-black text-[8px] text-center uppercase italic hover:bg-black transition-all">
                    Apel
                  </a>
                  <a href={`https://wa.me/${c.phone.replace(/\D/g, "")}`} target="_blank" className="py-2 bg-[#25D366] text-white rounded-[12px] font-black text-[8px] text-center uppercase italic hover:scale-105 transition-all">
                    Wapp
                  </a>
                  <a href={c.email ? `mailto:${c.email}` : "#"} className={`py-2 ${c.email ? "bg-amber-500" : "bg-slate-100 text-slate-300"} text-white rounded-[12px] font-black text-[8px] text-center uppercase italic transition-all`}>
                    Mail
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL EDITARE CONTACT ── */}
      {contactEditat && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setContactEditat(null); }}
        >
          <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl relative border border-slate-100 p-8 flex flex-col max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setContactEditat(null)}
              className="absolute top-5 right-5 w-9 h-9 bg-white border-2 border-amber-400 rounded-full flex items-center justify-center text-amber-600 font-black text-sm hover:bg-amber-50 transition-all shadow z-10"
            >
              ✕
            </button>
            <h3 className="text-2xl font-black text-center mb-6 italic uppercase">
              Editare <span className="text-amber-600">Contact</span>
            </h3>

            <div className="space-y-3">
              <input
                type="text" value={contactEditat.name}
                onChange={e => setContactEditat({ ...contactEditat, name: e.target.value.toUpperCase() })}
                className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-[18px] outline-none font-bold italic uppercase focus:border-amber-500 text-sm transition-all"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text" value={contactEditat.role} placeholder="ROL"
                  onChange={e => setContactEditat({ ...contactEditat, role: e.target.value.toUpperCase() })}
                  className="p-4 bg-slate-50 border-2 border-slate-50 rounded-[18px] outline-none font-bold italic uppercase focus:border-amber-500 text-sm transition-all"
                />
                <input
                  type="tel" value={contactEditat.phone}
                  onChange={e => setContactEditat({ ...contactEditat, phone: e.target.value.replace(/[^0-9+]/g, "") })}
                  className="p-4 bg-slate-50 border-2 border-slate-50 rounded-[18px] outline-none font-bold italic uppercase focus:border-amber-500 text-sm transition-all"
                />
              </div>
              <input
                type="email" value={contactEditat.email} placeholder="EMAIL"
                onChange={e => setContactEditat({ ...contactEditat, email: e.target.value.toUpperCase() })}
                className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-[18px] outline-none font-bold italic uppercase focus:border-amber-500 text-sm transition-all"
              />
              <textarea
                value={contactEditat.note} placeholder="NOTE..."
                onChange={e => setContactEditat({ ...contactEditat, note: e.target.value.toUpperCase() })}
                className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-[18px] outline-none font-bold italic uppercase focus:border-amber-500 h-20 resize-none text-sm transition-all"
              />

              {/* Selector folder în modal editare */}
              <FolderSelector
                foldere={foldere}
                folderSelectat={contactEditat.folder_id}
                onChange={id => setContactEditat({ ...contactEditat, folder_id: id })}
              />

              <button
                onClick={salveazaEditare}
                className="w-full py-5 bg-slate-900 text-white rounded-[20px] font-black text-[11px] tracking-[0.3em] shadow-lg border-b-4 border-slate-700 uppercase italic hover:bg-amber-600 transition-all"
              >
                Actualizează
              </button>
              <button
                onClick={() => stergeContact(contactEditat.id)}
                className="w-full py-2 text-red-500 font-black text-[10px] uppercase italic opacity-50 hover:opacity-100 transition-all"
              >
                Șterge Contact ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL FOLDER NOU ── */}
      {showModalFolder && (
        <ModalFolder
          onSalveaza={creeazaFolder}
          onClose={() => setShowModalFolder(false)}
        />
      )}

      {/* ── MODAL EDITARE FOLDER ── */}
      {folderEditat && (
        <ModalFolder
          folder={folderEditat}
          onSalveaza={actualizeazaFolder}
          onClose={() => setFolderEditat(null)}
          onSterge={() => stergeFolder(folderEditat.id)}
        />
      )}
    </div>
  );
}