'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// CHEILE TREBUIE SĂ COINCIDĂ CU VALORILE NORMALIZATE DIN normalizeazaPlan()
// Pagina de abonamente salvează: "CHRONOS FREE" / "CHRONOS PRO" / "CHRONOS ELITE" / "CHRONOS TEAM"
// ─────────────────────────────────────────────────────────────────────────────
const LIMITE = {
  STAFF: {
    "chronos free":  1,
    "chronos pro":   1,
    "chronos elite": 5,
    "chronos team":  50,
  },
  SERVICII: {
    "chronos free":  5,
    "chronos pro":   15,
    "chronos elite": 999,
    "chronos team":  999,
  },
};

// Label-uri afișate în UI pentru fiecare plan
const PLAN_LABELS: Record<string, string> = {
  "chronos free":  "CHRONOS FREE",
  "chronos pro":   "CHRONOS PRO",
  "chronos elite": "CHRONOS ELITE",
  "chronos team":  "CHRONOS TEAM",
};

/**
 * Normalizează orice variantă din DB → cheie internă consistentă.
 * Acoperă: "CHRONOS PRO", "chronos pro", "Chronos Pro", "pro", etc.
 */
function normalizeazaPlan(plan: string): string {
  const p = (plan || "").toLowerCase().trim();
  if (p.includes("team"))  return "chronos team";
  if (p.includes("elite")) return "chronos elite";
  if (p.includes("pro"))   return "chronos pro";
  return "chronos free"; // fallback — acoperă "free", "start", gol, null
}

export default function ResursePage() {
  const router = useRouter();
  const [services, setServices]   = useState<any[]>([]);
  const [staff, setStaff]         = useState<any[]>([]);
  const [userPlan, setUserPlan]   = useState("chronos free");
  const [loading, setLoading]     = useState(true);
  const [userId, setUserId]       = useState<string | null>(null);
  const [isDemo, setIsDemo]       = useState(false);
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);
  const [newItem, setNewItem]     = useState({ type: 'service', name: '', price: '', hour: '0', minute: '30' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm]   = useState<any>(null);

  const supabase = useMemo(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ), []);

  const editServiciuRef = useRef<HTMLDivElement>(null);
  const editStaffRef    = useRef<HTMLDivElement>(null);
  const oreOptiuni      = Array.from({ length: 25 }, (_, i) => i);
  const minuteOptiuni   = [0, 15, 30, 45];

  // ─── Fetch date din Supabase ───────────────────────────────────────────────
  const fetchResurse = useCallback(async (uid: string) => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('plan_type')
        .eq('id', uid)
        .single();

      if (profileError) {
        console.error("Eroare profil:", profileError.message);
      }

      // Normalizare robustă — indiferent cum e stocat în DB
      const planNormalizat = normalizeazaPlan(profile?.plan_type || "");
      setUserPlan(planNormalizat);

      const { data: svs, error: errSvs } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      const { data: stf, error: errStf } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (errSvs) {
        console.error('Eroare services:', errSvs.message);
        setErrorMsg(`Eroare bază de date: ${errSvs.message}`);
      }
      if (errStf) console.error('Eroare staff:', errStf.message);

      setServices(svs ?? []);
      setStaff(stf ?? []);
    } catch (err) {
      console.error("Eroare la preluarea datelor:", err);
      setErrorMsg("Eroare la încărcarea datelor. Reîncarcă pagina.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // ─── Inițializare auth ─────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    async function initAuth() {
      const demoActive = typeof window !== 'undefined' && localStorage.getItem("chronos_demo") === "true";
      if (demoActive) {
        if (!mounted) return;
        setUserId("demo_user");
        setIsDemo(true);
        setServices([
          { id: 'd1', nume_serviciu: 'Tuns (Exemplu)', price: '50', duration: '30' },
          { id: 'd2', nume_serviciu: 'Barba (Exemplu)', price: '30', duration: '15' }
        ]);
        setStaff([{ id: 's1', name: 'ECHIPĂ EXPERȚI CHRONOS', services: [] }]);
        setLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        if (!mounted) return;
        setUserId(session.user.id);
        setIsDemo(false);
        await fetchResurse(session.user.id);
      } else {
        if (mounted) router.replace("/login");
      }
    }
    initAuth();
    return () => { mounted = false; };
  }, [router, supabase, fetchResurse]);

  // ─── Re-fetch când userul revine pe tab (după upgrade abonament) ───────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userId && !isDemo) {
        fetchResurse(userId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userId, isDemo, fetchResurse]);

  // ─── Click outside închide editare ────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (editingId && !editServiciuRef.current?.contains(target) && !editStaffRef.current?.contains(target)) {
        setEditingId(null);
        setEditForm(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editingId]);

  // ─── Helpers limite ────────────────────────────────────────────────────────
  const getLimitaServicii = () => LIMITE.SERVICII[userPlan as keyof typeof LIMITE.SERVICII] ?? LIMITE.SERVICII["chronos free"];
  const getLimitaStaff    = () => LIMITE.STAFF[userPlan as keyof typeof LIMITE.STAFF]       ?? LIMITE.STAFF["chronos free"];
  const getPlanLabel      = () => PLAN_LABELS[userPlan] ?? userPlan.toUpperCase();

  const limitaCurentaAtingata = newItem.type === 'service'
    ? services.length >= getLimitaServicii()
    : staff.length >= getLimitaStaff();

  // ─── Adăugare resursă ──────────────────────────────────────────────────────
  async function handleAdd() {
    if (!newItem.name.trim() || !userId || isDemo) return;

    if (newItem.type === 'service' && services.length >= getLimitaServicii()) {
      alert(`⚠️ Limită atinsă!\n\nPlanul tău (${getPlanLabel()}) permite doar ${getLimitaServicii()} servicii.\n\nUpgradează abonamentul pentru mai multe servicii.`);
      return;
    }
    if (newItem.type === 'staff' && staff.length >= getLimitaStaff()) {
      alert(`⚠️ Limită atinsă!\n\nPlanul tău (${getPlanLabel()}) permite doar ${getLimitaStaff()} experți.\n\nUpgradează abonamentul pentru mai mulți experți.`);
      return;
    }

    const durataTotala = (parseInt(newItem.hour) * 60) + parseInt(newItem.minute);
    if (newItem.type === 'service') {
      const { error } = await supabase.from('services').insert([{
        nume_serviciu: newItem.name.trim(),
        price: parseFloat(newItem.price) || 0,
        duration: durataTotala,
        user_id: userId
      }]);
      if (error) { alert(`Eroare la salvare: ${error.message}`); return; }
    } else {
      const { error } = await supabase.from('staff').insert([{
        name: newItem.name.trim(),
        services: [],
        user_id: userId
      }]);
      if (error) { alert(`Eroare la salvare: ${error.message}`); return; }
    }

    setNewItem({ type: 'service', name: '', price: '', hour: '0', minute: '30' });
    await fetchResurse(userId);
  }

  // ─── Ștergere ──────────────────────────────────────────────────────────────
  async function handleDelete(id: string, type: 'services' | 'staff') {
    if (isDemo || !userId) return;
    if (!confirm("Ești sigur că vrei să ștergi această resursă?")) return;
    const { error } = await supabase.from(type).delete().eq('id', id);
    if (error) { alert(`Eroare la ștergere: ${error.message}`); return; }
    await fetchResurse(userId);
  }

  // ─── Editare ───────────────────────────────────────────────────────────────
  const activeazaEditare = (item: any, tip: 'service' | 'staff') => {
    if (isDemo) return;
    let editData = {
      ...item, tip,
      name:     tip === 'service' ? (item.nume_serviciu || "") : (item.name || ""),
      price:    item.price || "0",
      duration: item.duration || "0"
    };
    if (tip === 'service') {
      const d = parseInt(editData.duration) || 0;
      editData.hour   = Math.floor(d / 60).toString();
      editData.minute = (d % 60).toString();
    } else {
      editData.services = Array.isArray(item.services) ? item.services : [];
    }
    setEditForm(editData);
    setEditingId(item.id);
  };

  const toggleServiciuStaff = (serviceId: string) => {
    if (!editForm) return;
    const lista = [...(editForm.services || [])];
    const idx = lista.indexOf(serviceId);
    if (idx > -1) lista.splice(idx, 1); else lista.push(serviceId);
    setEditForm({ ...editForm, services: lista });
  };

  const salveazaEditare = async () => {
    if (isDemo || !editForm || !editingId || !userId) return;
    const tabela = editForm.tip === 'service' ? 'services' : 'staff';
    let payload: any = {};
    if (editForm.tip === 'service') {
      payload.nume_serviciu = editForm.name;
      payload.price         = parseFloat(editForm.price) || 0;
      payload.duration      = (parseInt(editForm.hour) * 60) + parseInt(editForm.minute);
    } else {
      payload.name     = editForm.name;
      payload.services = editForm.services ?? [];
    }
    const { error } = await supabase.from(tabela).update(payload).eq('id', editingId);
    if (error) { alert(`Eroare la salvare: ${error.message}`); return; }
    setEditingId(null);
    setEditForm(null);
    await fetchResurse(userId);
  };

  // ─── Loading screen ────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center font-black italic text-amber-600 animate-pulse uppercase tracking-[0.3em] text-[10px]">Sincronizare Chronos...</div>
    </div>
  );

  // ─── UI ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#fcfcfc] p-4 md:p-16 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-slate-900 border-l-8 border-amber-500 pl-6 leading-none">
              Gestiune <span className="text-amber-600">Resurse</span>
            </h1>
            <div className="flex items-center gap-2 ml-8 mt-4">
              <span className={`w-2 h-2 rounded-full animate-pulse ${isDemo ? 'bg-blue-500' : 'bg-amber-500'}`}></span>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                {isDemo ? "MOD VIZUALIZARE (DEMO)" : `ABONAMENT ACTIV: ${getPlanLabel()}`}
              </p>
            </div>

            {/* Badge-uri limite plan */}
            {!isDemo && (
              <div className="flex gap-3 ml-8 mt-3">
                <span className="text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full italic">
                  Servicii: {services.length} / {getLimitaServicii() >= 999 ? '∞' : getLimitaServicii()}
                </span>
                <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-full italic">
                  Experți: {staff.length} / {getLimitaStaff() >= 999 ? '∞' : getLimitaStaff()}
                </span>
              </div>
            )}
          </div>
          <button
            title="Revino la panoul principal de programări"
            onClick={() => router.push('/programari')}
            className="px-8 py-4 bg-white border-2 border-slate-900 rounded-[20px] font-black uppercase text-[10px] italic hover:bg-slate-900 hover:text-white transition-all shadow-lg border-b-4 active:translate-y-1 active:border-b-0 active:scale-95"
          >
            ← PANOU PRINCIPAL
          </button>
        </header>

        {/* Eroare */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-[11px] font-black uppercase italic">⚠️ {errorMsg}</div>
        )}

        {/* Banner upgrade dacă limita e aproape */}
        {!isDemo && (limitaCurentaAtingata) && (
          <div className="mb-8 p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-center justify-between gap-4">
            <p className="text-[11px] font-black uppercase italic text-amber-800">
              ⚠️ Ai atins limita planului {getPlanLabel()}. Upgradează pentru a adăuga mai multe resurse.
            </p>
            <button
              onClick={() => router.push('/abonamente')}
              className="px-6 py-3 bg-amber-500 text-black rounded-xl font-black uppercase text-[10px] italic hover:bg-slate-900 hover:text-amber-500 transition-all whitespace-nowrap shadow-md"
            >
              UPGRADE PLAN →
            </button>
          </div>
        )}

        {/* Formular adăugare */}
        <div className={`bg-white p-6 rounded-[35px] shadow-2xl mb-16 flex flex-wrap gap-4 border border-slate-100 items-center transition-all ${isDemo ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
          <div className="flex flex-col gap-1">
            <span className="text-[8px] font-black text-slate-400 ml-3 uppercase">Categorie</span>
            <select
              title="Alege între un serviciu nou sau un expert nou"
              className="bg-slate-50 p-5 rounded-2xl font-black uppercase italic text-[11px] outline-none border-2 border-transparent focus:border-amber-500 transition-all cursor-pointer"
              value={newItem.type}
              onChange={e => setNewItem({ ...newItem, type: e.target.value })}
            >
              <option value="service">SERVICIU NOU</option>
              <option value="staff">EXPERT NOU</option>
            </select>
          </div>
          <div className="flex-1 min-w-[180px] flex flex-col gap-1">
            <span className="text-[8px] font-black text-slate-400 ml-3 uppercase">Denumire</span>
            <input
              title="Introdu numele pentru identificare"
              className="bg-slate-50 p-5 rounded-2xl font-black uppercase italic text-[11px] outline-none border-2 border-transparent focus:border-amber-500 transition-all shadow-inner"
              placeholder={newItem.type === 'service' ? "EX: TUNS BARBĂ..." : "EX: ANDREI POPESCU..."}
              value={newItem.name}
              onChange={e => setNewItem({ ...newItem, name: e.target.value })}
            />
          </div>
          {newItem.type === 'service' && (
            <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200">
              <div className="flex flex-col">
                <span className="text-[8px] font-black ml-3 mb-1 text-slate-400 uppercase">Durată</span>
                <div className="flex gap-1">
                  <select
                    title="Ore de execuție"
                    className="bg-white px-4 py-3 rounded-xl font-black text-[11px] outline-none shadow-sm"
                    value={newItem.hour}
                    onChange={e => setNewItem({ ...newItem, hour: e.target.value })}
                  >
                    {oreOptiuni.map(h => <option key={h} value={h}>{h} H</option>)}
                  </select>
                  <select
                    title="Minute de execuție"
                    className="bg-white px-4 py-3 rounded-xl font-black text-[11px] outline-none shadow-sm"
                    value={newItem.minute}
                    onChange={e => setNewItem({ ...newItem, minute: e.target.value })}
                  >
                    {minuteOptiuni.map(m => <option key={m} value={m}>{m} MIN</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black ml-3 mb-1 text-slate-400 uppercase">Preț (RON)</span>
                <input
                  title="Costul serviciului în RON"
                  type="number"
                  className="w-24 bg-white p-4 rounded-xl font-black uppercase italic text-[11px] outline-none shadow-sm"
                  placeholder="RON"
                  value={newItem.price}
                  onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                />
              </div>
            </div>
          )}
          <button
            title="Confirmă adăugarea resursei în baza de date"
            onClick={handleAdd}
            disabled={limitaCurentaAtingata}
            className={`px-10 py-5 self-end h-[60px] rounded-2xl font-black uppercase italic text-[11px] transition-all shadow-lg border-b-4 active:translate-y-1 active:border-b-0 active:scale-95 ${limitaCurentaAtingata ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed opacity-60' : 'bg-slate-900 text-amber-500 border-slate-800 hover:bg-amber-500 hover:text-black'}`}
          >
            {limitaCurentaAtingata ? 'LIMITĂ PLAN ATINSĂ ⚠️' : 'CONFIRMĂ ADAUGARE +'}
          </button>
        </div>

        {/* Grid Servicii + Experți */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* Servicii */}
          <div className="bg-white p-10 rounded-[50px] shadow-xl border border-slate-50 relative">
            <h2 className="text-[11px] font-black uppercase italic text-slate-400 mb-10 tracking-[0.3em] border-b pb-6">
              SERVICII ACTIVE ({services.length} / {getLimitaServicii() >= 999 ? '∞' : getLimitaServicii()})
            </h2>
            <div className="space-y-4">
              {services.map(s => (
                <div key={s.id} className="group bg-slate-50 rounded-[28px] border-l-8 border-amber-500 hover:bg-white transition-all border border-transparent hover:border-slate-100 overflow-hidden relative shadow-sm">
                  {editingId === s.id ? (
                    <div ref={editServiciuRef} className="p-8 space-y-4 bg-white animate-in slide-in-from-top-2 duration-200">
                      <input
                        title="Modifică numele serviciului"
                        className="w-full p-4 rounded-xl border-2 border-slate-100 font-black uppercase italic text-[11px] shadow-inner"
                        value={editForm?.name || ""}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      />
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="text-[9px] font-black text-slate-400 ml-1">PREȚ RON</label>
                          <input
                            title="Actualizează tariful"
                            className="w-full p-4 rounded-xl border-2 border-slate-100 font-black text-[11px] shadow-inner"
                            value={editForm?.price || ""}
                            onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[9px] font-black text-slate-400 ml-1">ORE</label>
                          <select
                            title="Ajustează orele"
                            className="w-full p-4 rounded-xl border-2 border-slate-100 font-black text-[11px] shadow-inner"
                            value={editForm?.hour || "0"}
                            onChange={e => setEditForm({ ...editForm, hour: e.target.value })}
                          >
                            {oreOptiuni.map(h => <option key={h} value={h}>{h} H</option>)}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="text-[9px] font-black text-slate-400 ml-1">MIN</label>
                          <select
                            title="Ajustează minutele"
                            className="w-full p-4 rounded-xl border-2 border-slate-100 font-black text-[11px] shadow-inner"
                            value={editForm?.minute || "0"}
                            onChange={e => setEditForm({ ...editForm, minute: e.target.value })}
                          >
                            {minuteOptiuni.map(m => <option key={m} value={m}>{m} MIN</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-4">
                        <button title="Salvează modificările" onClick={salveazaEditare}
                          className="flex-1 bg-slate-900 text-amber-500 p-4 rounded-xl text-[10px] font-black uppercase italic hover:bg-amber-600 hover:text-white transition-all shadow-md active:translate-y-1">
                          SALVEAZĂ
                        </button>
                        <button title="Anulează" onClick={() => { setEditingId(null); setEditForm(null); }}
                          className="flex-1 bg-slate-100 p-4 rounded-xl text-[10px] font-black uppercase italic text-slate-400 hover:bg-slate-200 transition-all active:translate-y-1">
                          ANULEAZĂ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div title="Click pentru a edita" className="p-6 flex justify-between items-center cursor-pointer"
                      onClick={() => activeazaEditare(s, 'service')}>
                      <div>
                        <p className="font-black uppercase italic text-[13px] text-slate-900 group-hover:text-amber-600 transition-colors">{s.nume_serviciu}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase italic tracking-widest">
                          {s.price} RON — {Math.floor(s.duration / 60) > 0 ? `${Math.floor(s.duration / 60)}H ` : ''}{s.duration % 60} MIN
                        </p>
                      </div>
                      {!isDemo && (
                        <button title="Șterge serviciu"
                          onClick={e => { e.stopPropagation(); handleDelete(s.id, 'services'); }}
                          className="opacity-0 group-hover:opacity-100 bg-white text-red-500 w-10 h-10 flex items-center justify-center rounded-xl shadow-md border border-red-100 hover:bg-red-500 hover:text-white transition-all">
                          ✕
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {services.length === 0 && (
                <div className="text-center py-12 text-slate-300 font-black uppercase italic text-[10px]">
                  Niciun serviciu adăugat încă.
                </div>
              )}
            </div>
          </div>

          {/* Experți */}
          <div className="bg-white p-10 rounded-[50px] shadow-xl border border-slate-50 relative">
            <h2 className="text-[11px] font-black uppercase italic text-slate-400 mb-10 tracking-[0.3em] border-b pb-6 text-right">
              ECHIPĂ EXPERȚI ({staff.length} / {getLimitaStaff() >= 999 ? '∞' : getLimitaStaff()})
            </h2>
            <div className="space-y-4">
              {staff.map(p => (
                <div key={p.id} className="group bg-slate-900 rounded-[28px] border-l-8 border-slate-700 hover:border-amber-500 transition-all overflow-hidden relative shadow-lg">
                  {editingId === p.id ? (
                    <div ref={editStaffRef} className="p-8 space-y-6 bg-slate-800 animate-in slide-in-from-bottom-2 duration-200">
                      <div>
                        <label className="text-[9px] font-black text-slate-500 ml-1 uppercase mb-1 block">Nume Expert</label>
                        <input title="Modifică numele expertului"
                          className="w-full p-4 rounded-xl border-2 border-slate-700 bg-slate-900 text-white font-black uppercase italic text-[11px]"
                          value={editForm?.name || ""}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-500 ml-1 uppercase mb-3 block">Servicii Alocate</label>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2">
                          {services.map(s => (
                            <button key={s.id} title={`Aloca/elimina: ${s.nume_serviciu}`}
                              onClick={() => toggleServiciuStaff(s.id)}
                              className={`p-3 rounded-xl text-[9px] font-black uppercase italic transition-all border-2 ${(editForm?.services || []).includes(s.id) ? 'bg-amber-500 border-amber-500 text-slate-900 shadow-md scale-95' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}`}>
                              {s.nume_serviciu}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-3 pt-4">
                        <button title="Salvează" onClick={salveazaEditare}
                          className="flex-1 bg-amber-500 text-slate-900 p-4 rounded-xl text-[10px] font-black uppercase italic hover:bg-white transition-all shadow-md active:translate-y-1">
                          SALVEAZĂ
                        </button>
                        <button title="Închide" onClick={() => { setEditingId(null); setEditForm(null); }}
                          className="flex-1 bg-slate-700 p-4 rounded-xl text-[10px] font-black uppercase italic text-slate-300 hover:bg-slate-600 transition-all active:translate-y-1">
                          ÎNCHIDE
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div title="Click pentru a edita" className="p-6 flex justify-between items-center cursor-pointer"
                      onClick={() => activeazaEditare(p, 'staff')}>
                      <div className="flex-1">
                        <p className="font-black uppercase italic text-[13px] text-white group-hover:text-amber-500 transition-colors">{p.name}</p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {(p.services || []).length > 0 ? (
                            p.services.map((servId: string, idx: number) => {
                              const service = services.find(s => s.id === servId);
                              return (
                                <span key={idx} className="text-[8px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700 uppercase font-black tracking-tighter">
                                  {service ? service.nume_serviciu : "Serviciu șters"}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[8px] text-red-500/50 uppercase font-black italic">Niciun serviciu alocat</span>
                          )}
                        </div>
                      </div>
                      {!isDemo && (
                        <button title="Elimină expert"
                          onClick={e => { e.stopPropagation(); handleDelete(p.id, 'staff'); }}
                          className="opacity-0 group-hover:opacity-100 bg-slate-800 text-red-400 w-10 h-10 flex items-center justify-center rounded-xl border border-slate-700 hover:bg-red-500 hover:text-white transition-all">
                          ✕
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {staff.length === 0 && (
                <div className="text-center py-12 text-slate-600 font-black uppercase italic text-[10px]">
                  Niciun expert adăugat încă.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}