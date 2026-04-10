'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// LIMITE PLANURI
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

const PLAN_LABELS: Record<string, string> = {
  "chronos free":  "CHRONOS FREE",
  "chronos pro":   "CHRONOS PRO",
  "chronos elite": "CHRONOS ELITE",
  "chronos team":  "CHRONOS TEAM",
};

function normalizeazaPlan(plan: string): string {
  const p = (plan || "").toLowerCase().trim();
  if (p.includes("team"))  return "chronos team";
  if (p.includes("elite")) return "chronos elite";
  if (p.includes("pro"))   return "chronos pro";
  return "chronos free";
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

  // State-uri separate pentru cele două formulare
  const [newService, setNewService] = useState({ name: '', price: '', hour: '0', minute: '30' });
  const [newStaff, setNewStaff]     = useState({ name: '' });

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

  const fetchResurse = useCallback(async (uid: string) => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // CORECȚIE EROARE: Folosim select fără single pentru a evita crash-ul pe conturi noi
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('plan_type')
        .eq('id', uid);

      if (profileError) console.error("Eroare profil:", profileError.message);
      
      const profile = profiles && profiles.length > 0 ? profiles[0] : null;
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

      if (errSvs) setErrorMsg(`Eroare bază de date: ${errSvs.message}`);
      setServices(svs ?? []);
      setStaff(stf ?? []);
    } catch (err) {
      console.error("Eroare la preluarea datelor:", err);
      setErrorMsg("Eroare la încărcarea datelor.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

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

  // Click outside închide editarea
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

  const getLimitaServicii = () => LIMITE.SERVICII[userPlan as keyof typeof LIMITE.SERVICII] ?? LIMITE.SERVICII["chronos free"];
  const getLimitaStaff    = () => LIMITE.STAFF[userPlan as keyof typeof LIMITE.STAFF]       ?? LIMITE.STAFF["chronos free"];
  const getPlanLabel      = () => PLAN_LABELS[userPlan] ?? userPlan.toUpperCase();

  // ─── HANDLERS SEPARATE ─────────────────────────────────────────────────────
  
  async function handleAddService() {
    if (!newService.name.trim() || !userId || isDemo) return;
    if (services.length >= getLimitaServicii()) {
      alert(`⚠️ Limită atinsă! Planul tău permite doar ${getLimitaServicii()} servicii.`);
      return;
    }
    const durataTotala = (parseInt(newService.hour) * 60) + parseInt(newService.minute);
    const { error } = await supabase.from('services').insert([{
      nume_serviciu: newService.name.trim(),
      price: parseFloat(newService.price) || 0,
      duration: durataTotala,
      user_id: userId
    }]);
    if (error) { alert(`Eroare: ${error.message}`); return; }
    setNewService({ name: '', price: '', hour: '0', minute: '30' });
    await fetchResurse(userId);
  }

  async function handleAddStaff() {
    if (!newStaff.name.trim() || !userId || isDemo) return;
    if (staff.length >= getLimitaStaff()) {
      alert(`⚠️ Limită atinsă! Planul tău permite doar ${getLimitaStaff()} experți.`);
      return;
    }
    const { error } = await supabase.from('staff').insert([{
      name: newStaff.name.trim(),
      services: [],
      user_id: userId
    }]);
    if (error) { alert(`Eroare: ${error.message}`); return; }
    setNewStaff({ name: '' });
    await fetchResurse(userId);
  }

  async function handleDelete(id: string, type: 'services' | 'staff') {
    if (isDemo || !userId) return;
    if (!confirm("Sigur vrei să ștergi resursa?")) return;
    const { error } = await supabase.from(type).delete().eq('id', id);
    if (error) alert(error.message);
    await fetchResurse(userId);
  }

  const activeazaEditare = (item: any, tip: 'service' | 'staff') => {
    if (isDemo) return;
    let editData = {
      ...item, tip,
      name: tip === 'service' ? (item.nume_serviciu || "") : (item.name || ""),
      price: item.price || "0",
      duration: item.duration || "0"
    };
    if (tip === 'service') {
      const d = parseInt(editData.duration) || 0;
      editData.hour = Math.floor(d / 60).toString();
      editData.minute = (d % 60).toString();
    } else {
      editData.services = Array.isArray(item.services) ? item.services : [];
    }
    setEditForm(editData);
    setEditingId(item.id);
  };

  const salveazaEditare = async () => {
    if (isDemo || !editForm || !editingId || !userId) return;
    const tabela = editForm.tip === 'service' ? 'services' : 'staff';
    let payload: any = {};
    if (editForm.tip === 'service') {
      payload.nume_serviciu = editForm.name;
      payload.price = parseFloat(editForm.price) || 0;
      payload.duration = (parseInt(editForm.hour) * 60) + parseInt(editForm.minute);
    } else {
      payload.name = editForm.name;
      payload.services = editForm.services ?? [];
    }
    const { error } = await supabase.from(tabela).update(payload).eq('id', editingId);
    if (error) alert(error.message);
    setEditingId(null); setEditForm(null);
    await fetchResurse(userId);
  };

  const toggleServiciuStaff = (serviceId: string) => {
    if (!editForm) return;
    const lista = [...(editForm.services || [])];
    const idx = lista.indexOf(serviceId);
    if (idx > -1) lista.splice(idx, 1); else lista.push(serviceId);
    setEditForm({ ...editForm, services: lista });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center font-black italic text-amber-600 animate-pulse uppercase tracking-[0.3em] text-[10px]">Sincronizare Chronos...</div>
    </div>
  );

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
          </div>
          <button
            onClick={() => router.push('/programari')}
            className="px-8 py-4 bg-white border-2 border-slate-900 rounded-[20px] font-black uppercase text-[10px] italic hover:bg-slate-900 hover:text-white transition-all shadow-lg border-b-4 active:translate-y-1 active:border-b-0 active:scale-95"
          >
            ← PANOU PRINCIPAL
          </button>
        </header>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-[11px] font-black uppercase italic">⚠️ {errorMsg}</div>
        )}

        {/* ─── SECȚIUNI ADĂUGARE (UNA SUB ALTA) ─── */}
        <div className="space-y-6 mb-16">
          
          {/* Formular SERVICIU */}
          <div className={`bg-white p-8 rounded-[35px] shadow-xl border border-slate-100 transition-all ${isDemo ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
            <h3 className="text-[10px] font-black uppercase italic text-amber-600 mb-6 tracking-widest">Adaugă Serviciu Nou</h3>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px] flex flex-col gap-1">
                <span className="text-[8px] font-black text-slate-400 ml-3 uppercase">Denumire Serviciu</span>
                <input
                  className="bg-slate-50 p-5 rounded-2xl font-black uppercase italic text-[11px] outline-none border-2 border-transparent focus:border-amber-500 transition-all shadow-inner"
                  placeholder="EX: TUNS MODERN, VOPSIT..."
                  value={newService.name}
                  onChange={e => setNewService({ ...newService, name: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[8px] font-black text-slate-400 ml-3 uppercase">Durată</span>
                <div className="flex gap-1 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                  <select
                    className="bg-white px-3 py-3 rounded-xl font-black text-[11px] outline-none shadow-sm"
                    value={newService.hour}
                    onChange={e => setNewService({ ...newService, hour: e.target.value })}
                  >
                    {oreOptiuni.map(h => <option key={h} value={h}>{h} H</option>)}
                  </select>
                  <select
                    className="bg-white px-3 py-3 rounded-xl font-black text-[11px] outline-none shadow-sm"
                    value={newService.minute}
                    onChange={e => setNewService({ ...newService, minute: e.target.value })}
                  >
                    {minuteOptiuni.map(m => <option key={m} value={m}>{m} MIN</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[8px] font-black text-slate-400 ml-3 uppercase">Preț (RON)</span>
                <input
                  type="number"
                  className="w-28 bg-slate-50 p-5 rounded-2xl font-black uppercase italic text-[11px] outline-none border-2 border-transparent focus:border-amber-500 transition-all shadow-inner"
                  placeholder="RON"
                  value={newService.price}
                  onChange={e => setNewService({ ...newService, price: e.target.value })}
                />
              </div>
              <button
                onClick={handleAddService}
                disabled={services.length >= getLimitaServicii()}
                className="px-8 py-5 rounded-2xl font-black uppercase italic text-[11px] bg-slate-900 text-amber-500 border-b-4 border-slate-800 hover:bg-amber-500 hover:text-black transition-all active:translate-y-1 active:border-b-0 shadow-lg"
              >
                + ADAUGĂ SERVICIU
              </button>
            </div>
          </div>

          {/* Formular EXPERT */}
          <div className={`bg-white p-8 rounded-[35px] shadow-xl border border-slate-100 transition-all ${isDemo ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
            <h3 className="text-[10px] font-black uppercase italic text-slate-400 mb-6 tracking-widest">Adaugă Expert Nou</h3>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px] flex flex-col gap-1">
                <span className="text-[8px] font-black text-slate-400 ml-3 uppercase">Nume Expert</span>
                <input
                  className="bg-slate-50 p-5 rounded-2xl font-black uppercase italic text-[11px] outline-none border-2 border-transparent focus:border-slate-900 transition-all shadow-inner"
                  placeholder="EX: ION MARIN..."
                  value={newStaff.name}
                  onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                />
              </div>
              <button
                onClick={handleAddStaff}
                disabled={staff.length >= getLimitaStaff()}
                className="px-8 py-5 rounded-2xl font-black uppercase italic text-[11px] bg-slate-100 text-slate-900 border-b-4 border-slate-200 hover:bg-slate-900 hover:text-white transition-all active:translate-y-1 active:border-b-0 shadow-lg"
              >
                + ADAUGĂ EXPERT
              </button>
            </div>
          </div>

        </div>

        {/* ─── GRID AFIȘARE ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* Servicii Listă */}
          <div className="bg-white p-10 rounded-[50px] shadow-xl border border-slate-50 relative">
            <h2 className="text-[11px] font-black uppercase italic text-slate-400 mb-10 tracking-[0.3em] border-b pb-6">
              SERVICII ACTIVE ({services.length} / {getLimitaServicii() >= 999 ? '∞' : getLimitaServicii()})
            </h2>
            <div className="space-y-4">
              {services.map(s => (
                <div key={s.id} className="group bg-slate-50 rounded-[28px] border-l-8 border-amber-500 hover:bg-white transition-all border border-transparent hover:border-slate-100 overflow-hidden relative shadow-sm">
                  {editingId === s.id ? (
                    <div ref={editServiciuRef} className="p-8 space-y-4 bg-white animate-in slide-in-from-top-2 duration-200">
                      <input className="w-full p-4 rounded-xl border-2 border-slate-100 font-black uppercase italic text-[11px]"
                        value={editForm?.name || ""} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                      <div className="flex gap-2">
                         <input className="flex-1 p-4 rounded-xl border-2 border-slate-100 font-black text-[11px]"
                          value={editForm?.price || ""} onChange={e => setEditForm({ ...editForm, price: e.target.value })} />
                         <select className="flex-1 p-4 rounded-xl border-2 border-slate-100 font-black text-[11px]"
                          value={editForm?.hour || "0"} onChange={e => setEditForm({ ...editForm, hour: e.target.value })}>
                            {oreOptiuni.map(h => <option key={h} value={h}>{h} H</option>)}
                         </select>
                         <select className="flex-1 p-4 rounded-xl border-2 border-slate-100 font-black text-[11px]"
                          value={editForm?.minute || "0"} onChange={e => setEditForm({ ...editForm, minute: e.target.value })}>
                            {minuteOptiuni.map(m => <option key={m} value={m}>{m} MIN</option>)}
                         </select>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={salveazaEditare} className="flex-1 bg-slate-900 text-amber-500 p-4 rounded-xl text-[10px] font-black uppercase italic">SALVEAZĂ</button>
                        <button onClick={() => { setEditingId(null); setEditForm(null); }} className="flex-1 bg-slate-100 p-4 rounded-xl text-[10px] font-black uppercase italic text-slate-400">ANULEAZĂ</button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 flex justify-between items-center cursor-pointer" onClick={() => activeazaEditare(s, 'service')}>
                      <div>
                        <p className="font-black uppercase italic text-[13px] text-slate-900 group-hover:text-amber-600 transition-colors">{s.nume_serviciu}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase italic tracking-widest">
                          {s.price} RON — {Math.floor(s.duration / 60) > 0 ? `${Math.floor(s.duration / 60)}H ` : ''}{s.duration % 60} MIN
                        </p>
                      </div>
                      {!isDemo && (
                        <button onClick={e => { e.stopPropagation(); handleDelete(s.id, 'services'); }} className="opacity-0 group-hover:opacity-100 bg-white text-red-500 w-10 h-10 flex items-center justify-center rounded-xl shadow-md border border-red-100 hover:bg-red-500 hover:text-white transition-all">✕</button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Experți Listă */}
          <div className="bg-white p-10 rounded-[50px] shadow-xl border border-slate-50 relative">
            <h2 className="text-[11px] font-black uppercase italic text-slate-400 mb-10 tracking-[0.3em] border-b pb-6 text-right">
              ECHIPĂ EXPERȚI ({staff.length} / {getLimitaStaff() >= 999 ? '∞' : getLimitaStaff()})
            </h2>
            <div className="space-y-4">
              {staff.map(p => (
                <div key={p.id} className="group bg-slate-900 rounded-[28px] border-l-8 border-slate-700 hover:border-amber-500 transition-all overflow-hidden relative shadow-lg">
                  {editingId === p.id ? (
                    <div ref={editStaffRef} className="p-8 space-y-6 bg-slate-800 animate-in slide-in-from-bottom-2 duration-200">
                      <input className="w-full p-4 rounded-xl border-2 border-slate-700 bg-slate-900 text-white font-black uppercase italic text-[11px]"
                        value={editForm?.name || ""} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2">
                        {services.map(s => (
                          <button key={s.id} onClick={() => toggleServiciuStaff(s.id)}
                            className={`p-3 rounded-xl text-[9px] font-black uppercase italic transition-all border-2 ${(editForm?.services || []).includes(s.id) ? 'bg-amber-500 border-amber-500 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
                            {s.nume_serviciu}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-3">
                        <button onClick={salveazaEditare} className="flex-1 bg-amber-500 text-slate-900 p-4 rounded-xl text-[10px] font-black uppercase italic">SALVEAZĂ</button>
                        <button onClick={() => { setEditingId(null); setEditForm(null); }} className="flex-1 bg-slate-700 p-4 rounded-xl text-[10px] font-black uppercase italic text-slate-300">ÎNCHIDE</button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 flex justify-between items-center cursor-pointer" onClick={() => activeazaEditare(p, 'staff')}>
                      <div className="flex-1">
                        <p className="font-black uppercase italic text-[13px] text-white group-hover:text-amber-500 transition-colors">{p.name}</p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {(p.services || []).map((servId: string, idx: number) => {
                            const service = services.find(s => s.id === servId);
                            return (
                              <span key={idx} className="text-[8px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700 uppercase font-black">
                                {service ? service.nume_serviciu : "Serviciu șters"}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      {!isDemo && (
                        <button onClick={e => { e.stopPropagation(); handleDelete(p.id, 'staff'); }} className="opacity-0 group-hover:opacity-100 bg-slate-800 text-red-400 w-10 h-10 flex items-center justify-center rounded-xl border border-slate-700 hover:bg-red-500 hover:text-white transition-all">✕</button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}