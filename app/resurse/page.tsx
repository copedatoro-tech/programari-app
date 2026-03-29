'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

// CONFIGURARE LIMITE STRICTE
const LIMITE: Record<string, any> = {
  STAFF: { "start (gratuit)": 1, "chronos pro": 1, "chronos elite": 5, "chronos team": 50 },
  SERVICII: { "start (gratuit)": 5, "chronos pro": 15, "chronos elite": 999, "chronos team": 999 }
};

export default function ResursePage() {
  const router = useRouter();
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [userPlan, setUserPlan] = useState("start (gratuit)");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  
  const [newItem, setNewItem] = useState({ 
    type: 'service', 
    name: '', 
    price: '', 
    hour: '0', 
    minute: '30' 
  });
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const editContainerRef = useRef<HTMLDivElement>(null);

  const oreOptiuni = Array.from({ length: 25 }, (_, i) => i);
  const minuteOptiuni = [0, 15, 30, 45];

  // Regula de închidere la click exterior pentru pop-up/editare
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      const demoActive = typeof window !== 'undefined' && localStorage.getItem("chronos_demo") === "true";
      
      if (demoActive) {
        if (!mounted) return;
        setUserId("demo_user");
        setIsDemo(true);
        setServices([
          { id: 'd1', nume: 'Tuns (Exemplu)', pret: '50', durata: '30' },
          { id: 'd2', nume: 'Barba (Exemplu)', pret: '30', durata: '15' }
        ]);
        setStaff([{ id: 's1', nume: 'ECHIPĂ EXPERȚI CHRONOS', servicii: ['Tuns (Exemplu)'] }]);
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
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          if (!mounted) return;
          setUserId(user.id);
          setIsDemo(false);
          await fetchResurse(user.id);
        } else {
          if (mounted) router.replace("/login");
        }
      }
    }

    initAuth();

    const handleClickOutside = (event: MouseEvent) => {
      if (editContainerRef.current && !editContainerRef.current.contains(event.target as Node)) {
        setEditingId(null);
        setEditForm(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      mounted = false;
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [router, supabase]);

  async function fetchResurse(uid: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('services, staff, plan_type')
        .eq('id', uid)
        .single();
        
      if (data && !error) {
        const plan = data.plan_type?.toLowerCase() || "start (gratuit)";
        setUserPlan(plan);
        
        const proceseaza = (val: any) => {
          if (!val) return [];
          let curat = typeof val === 'string' ? JSON.parse(val) : val;
          return Array.isArray(curat) ? curat : [];
        };

        setServices(proceseaza(data.services));
        setStaff(proceseaza(data.staff));
      }
    } catch (err) {
      console.error("Eroare la preluarea datelor:", err);
    } finally {
      setLoading(false);
    }
  }

  // Verificări stricte de limite înainte de adăugare
  async function handleAdd() {
    if (!newItem.name || !userId || isDemo) return;

    const limitaServicii = LIMITE.SERVICII[userPlan] || 5;
    const limitaStaff = LIMITE.STAFF[userPlan] || 1;

    if (newItem.type === 'service' && services.length >= limitaServicii) {
        alert(`⚠️ Limită atinsă! Planul tău actual (${userPlan.toUpperCase()}) permite doar ${limitaServicii} servicii.`);
        return;
    }

    if (newItem.type === 'staff' && staff.length >= limitaStaff) {
        alert(`⚠️ Limită atinsă! Planul tău actual (${userPlan.toUpperCase()}) permite doar ${limitaStaff} experți.`);
        return;
    }

    const id = crypto.randomUUID();
    let listaActualizata, coloana;
    const durataTotala = (parseInt(newItem.hour) * 60) + parseInt(newItem.minute);

    if (newItem.type === 'service') {
      listaActualizata = [...services, { 
        id, 
        nume: newItem.name, 
        pret: newItem.price || "0", 
        durata: durataTotala.toString()
      }];
      coloana = 'services';
    } else {
      listaActualizata = [...staff, { id, nume: newItem.name, servicii: [] }];
      coloana = 'staff';
    }

    const { error } = await supabase.from('profiles').update({ [coloana]: listaActualizata }).eq('id', userId);
    if (!error) {
      if (newItem.type === 'service') setServices(listaActualizata);
      else setStaff(listaActualizata);
      setNewItem({ type: 'service', name: '', price: '', hour: '0', minute: '30' });
    }
  }

  async function handleDelete(id: any, type: 'services' | 'staff') {
    if (isDemo || !userId) return;
    const listaVeche = type === 'services' ? services : staff;
    const listaNoua = listaVeche.filter(x => x.id !== id);
    const { error } = await supabase.from('profiles').update({ [type]: listaNoua }).eq('id', userId);
    if (!error) {
      if (type === 'services') setServices(listaNoua);
      else setStaff(listaNoua);
    }
  }

  const activeazaEditare = (item: any, tip: 'service' | 'staff') => {
    if (isDemo) return;
    let editData = { ...item, tip, nume: item.nume || item.name || "" };
    if (tip === 'service') {
      const d = parseInt(item.durata || "0");
      editData.hour = Math.floor(d / 60).toString();
      editData.minute = (d % 60).toString();
    } else {
        editData.servicii = Array.isArray(item.servicii) ? item.servicii : [];
    }
    setEditForm(editData);
    setEditingId(item.id);
  };

  const toggleServiciuStaff = (numeServiciu: string) => {
    if (!editForm) return;
    const serviciiActuale = [...(editForm.servicii || [])];
    const index = serviciiActuale.indexOf(numeServiciu);
    if (index > -1) {
      serviciiActuale.splice(index, 1);
    } else {
      serviciiActuale.push(numeServiciu);
    }
    setEditForm({ ...editForm, servicii: serviciiActuale });
  };

  const salveazaEditare = async () => {
    if (isDemo || !editForm || !editingId || !userId) return;
    const coloana = editForm.tip === 'service' ? 'services' : 'staff';
    const listaVeche = editForm.tip === 'service' ? services : staff;
    let finalData = { ...editForm };
    if (editForm.tip === 'service') {
      finalData.durata = ((parseInt(editForm.hour) * 60) + parseInt(editForm.minute)).toString();
      delete finalData.hour;
      delete finalData.minute;
    }
    delete finalData.tip;
    const listaActualizata = listaVeche.map(item => item.id === editingId ? finalData : item);
    const { error } = await supabase.from('profiles').update({ [coloana]: listaActualizata }).eq('id', userId);
    if (!error) {
      if (editForm.tip === 'service') setServices(listaActualizata);
      else setStaff(listaActualizata);
      setEditingId(null);
      setEditForm(null);
    }
  };

  const limitaCurentaAtingata = newItem.type === 'service' 
    ? services.length >= (LIMITE.SERVICII[userPlan] || 5)
    : staff.length >= (LIMITE.STAFF[userPlan] || 1);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center font-black italic text-amber-600 animate-pulse uppercase tracking-[0.3em] text-[10px]">
        Sincronizare Chronos...
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fcfcfc] p-4 md:p-16 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-slate-900 border-l-8 border-amber-500 pl-6 leading-none">
              Gestiune <span className="text-amber-600">Resurse</span>
            </h1>
            <div className="flex items-center gap-2 ml-8 mt-4">
              <span className={`w-2 h-2 rounded-full animate-pulse ${isDemo ? 'bg-blue-500' : 'bg-amber-500'}`}></span>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                {isDemo ? "MOD VIZUALIZARE (DEMO)" : `ACCES TOTAL: ${userPlan.toUpperCase()}`}
              </p>
            </div>
          </div>
          <button 
            onClick={() => router.push('/programari')}
            className="px-8 py-4 bg-white border-2 border-slate-900 rounded-[20px] font-black uppercase text-[10px] italic hover:bg-slate-900 hover:text-white transition-all shadow-lg border-b-4 border-slate-900 active:translate-y-1 active:border-b-0 active:scale-95"
            title="Întoarce-te la panoul principal de programări"
          >
            ← PANOU PRINCIPAL
          </button>
        </header>

        {/* Secțiune Adăugare - Cu feedback pentru limite */}
        <div className={`bg-white p-6 rounded-[35px] shadow-2xl mb-16 flex flex-wrap gap-4 border border-slate-100 items-center transition-all ${isDemo ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
          <div className="flex flex-col gap-1">
             <span className="text-[8px] font-black text-slate-400 ml-3 uppercase">Categorie</span>
             <select 
                title="Alege tipul de resursă pe care dorești să o adaugi"
                className="bg-slate-50 p-5 rounded-2xl font-black uppercase italic text-[11px] outline-none border-2 border-transparent focus:border-amber-500 transition-all cursor-pointer"
                value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value})}
             >
                <option value="service">SERVICIU NOU</option>
                <option value="staff">EXPERT NOU</option>
             </select>
          </div>

          <div className="flex-1 min-w-[180px] flex flex-col gap-1">
             <span className="text-[8px] font-black text-slate-400 ml-3 uppercase">Denumire</span>
             <input 
                title={newItem.type === 'service' ? "Introdu numele serviciului (ex: Tuns Clasic)" : "Introdu numele angajatului sau al expertului"}
                className="bg-slate-50 p-5 rounded-2xl font-black uppercase italic text-[11px] outline-none border-2 border-transparent focus:border-amber-500 transition-all shadow-inner" 
                placeholder={newItem.type === 'service' ? "EX: TUNS BARBĂ..." : "EX: ANDREI POPESCU..."} 
                value={newItem.name} 
                onChange={e => setNewItem({...newItem, name: e.target.value})} 
             />
          </div>

          {newItem.type === 'service' && (
            <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200">
              <div className="flex flex-col">
                <span className="text-[8px] font-black ml-3 mb-1 text-slate-400 uppercase">Durată</span>
                <div className="flex gap-1">
                    <select 
                      title="Selectează numărul de ore pentru durata serviciului"
                      className="bg-white px-4 py-3 rounded-xl font-black text-[11px] outline-none shadow-sm"
                      value={newItem.hour} onChange={e => setNewItem({...newItem, hour: e.target.value})}
                    >
                      {oreOptiuni.map(h => <option key={h} value={h}>{h} H</option>)}
                    </select>
                    <select 
                      title="Selectează numărul de minute pentru durata serviciului"
                      className="bg-white px-4 py-3 rounded-xl font-black text-[11px] outline-none shadow-sm"
                      value={newItem.minute} onChange={e => setNewItem({...newItem, minute: e.target.value})}
                    >
                      {minuteOptiuni.map(m => <option key={m} value={m}>{m} MIN</option>)}
                    </select>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black ml-3 mb-1 text-slate-400 uppercase">Preț (RON)</span>
                <input 
                    title="Introdu prețul acestui serviciu în RON"
                    type="number"
                    className="w-24 bg-white p-4 rounded-xl font-black uppercase italic text-[11px] outline-none shadow-sm" 
                    placeholder="RON" 
                    value={newItem.price} 
                    onChange={e => setNewItem({...newItem, price: e.target.value})} 
                />
              </div>
            </div>
          )}

          <button 
            title={limitaCurentaAtingata ? `Ai atins numărul maxim de ${newItem.type === 'service' ? 'servicii' : 'experți'} pentru acest plan` : "Confirmă și salvează noua resursă"}
            onClick={handleAdd} 
            disabled={limitaCurentaAtingata}
            className={`px-10 py-5 self-end h-[60px] rounded-2xl font-black uppercase italic text-[11px] transition-all shadow-lg border-b-4 active:translate-y-1 active:border-b-0 active:scale-95 ${
              limitaCurentaAtingata 
              ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed opacity-60' 
              : 'bg-slate-900 text-amber-500 border-slate-800 hover:bg-amber-500 hover:text-black'
            }`}
          >
            {limitaCurentaAtingata ? 'LIMITĂ PLAN ATINSĂ ⚠️' : 'CONFIRMĂ ADAUGARE +'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* SECȚIUNE SERVICII */}
          <div className="bg-white p-10 rounded-[50px] shadow-xl border border-slate-50 relative">
            <h2 className="text-[11px] font-black uppercase italic text-slate-400 mb-10 tracking-[0.3em] border-b pb-6">
              SERVICII ACTIVE ({services.length} / {LIMITE.SERVICII[userPlan] || 5})
            </h2>
            <div className="space-y-4">
              {services.map(s => (
                <div key={s.id} className="group bg-slate-50 rounded-[28px] border-l-8 border-amber-500 hover:bg-white transition-all border border-transparent hover:border-slate-100 overflow-hidden relative shadow-sm">
                  {editingId === s.id ? (
                    <div ref={editContainerRef} className="p-8 space-y-4 bg-white animate-in slide-in-from-top-2 duration-200">
                      <input className="w-full p-4 rounded-xl border-2 border-slate-100 font-black uppercase italic text-[11px] shadow-inner" value={editForm?.nume || ""} onChange={e => setEditForm({...editForm, nume: e.target.value})} placeholder="DENUMIRE SERVICIU" />
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="text-[9px] font-black text-slate-400 ml-1">PREȚ RON</label>
                          <input className="w-full p-4 rounded-xl border-2 border-slate-100 font-black text-[11px] shadow-inner" value={editForm?.pret || ""} onChange={e => setEditForm({...editForm, pret: e.target.value})} />
                        </div>
                        <div className="flex-1">
                          <label className="text-[9px] font-black text-slate-400 ml-1">ORE</label>
                          <select className="w-full p-4 rounded-xl border-2 border-slate-100 font-black text-[11px] shadow-inner" value={editForm?.hour || "0"} onChange={e => setEditForm({...editForm, hour: e.target.value})}>
                            {oreOptiuni.map(h => <option key={h} value={h}>{h} H</option>)}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="text-[9px] font-black text-slate-400 ml-1">MIN</label>
                          <select className="w-full p-4 rounded-xl border-2 border-slate-100 font-black text-[11px] shadow-inner" value={editForm?.minute || "0"} onChange={e => setEditForm({...editForm, minute: e.target.value})}>
                            {minuteOptiuni.map(m => <option key={m} value={m}>{m} MIN</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-4">
                        <button onClick={salveazaEditare} className="flex-1 bg-slate-900 text-amber-500 p-4 rounded-xl text-[10px] font-black uppercase italic hover:bg-amber-600 hover:text-white transition-all active:scale-95 shadow-md">SALVEAZĂ MODIFICĂRI</button>
                        <button onClick={() => { setEditingId(null); setEditForm(null); }} className="flex-1 bg-slate-100 p-4 rounded-xl text-[10px] font-black uppercase italic text-slate-400 hover:bg-slate-200 transition-all active:scale-95">ANULEAZĂ</button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform" onClick={() => activeazaEditare(s, 'service')} title="Click pentru a edita detaliile acestui serviciu">
                      <div>
                        <p className="font-black uppercase italic text-[13px] text-slate-900 group-hover:text-amber-600 transition-colors">{s.nume || s.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase italic tracking-widest">
                          {s.pret || s.price} RON — {Math.floor(parseInt(s.durata)/60) > 0 ? `${Math.floor(parseInt(s.durata)/60)}H ` : ''}{parseInt(s.durata)%60} MIN
                        </p>
                      </div>
                      {!isDemo && (
                        <button title="Șterge definitiv acest serviciu din listă" onClick={(e) => { e.stopPropagation(); handleDelete(s.id, 'services'); }} className="opacity-0 group-hover:opacity-100 bg-white text-red-500 w-10 h-10 flex items-center justify-center rounded-xl shadow-md border border-red-100 hover:bg-red-500 hover:text-white transition-all active:scale-90">✕</button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {services.length === 0 && <p className="text-[10px] font-black text-slate-300 uppercase italic text-center py-10">Nu ai adăugat niciun serviciu încă.</p>}
            </div>
          </div>

          {/* SECȚIUNE ECHIPĂ */}
          <div className="bg-white p-10 rounded-[50px] shadow-xl border border-slate-50 relative">
            <h2 className="text-[11px] font-black uppercase italic text-slate-400 mb-10 tracking-[0.3em] border-b pb-6 text-right">
              ECHIPĂ EXPERȚI ({staff.length} / {LIMITE.STAFF[userPlan] || 1})
            </h2>
            <div className="space-y-4">
              {staff.map(p => (
                <div key={p.id} className="group bg-slate-900 rounded-[28px] border-l-8 border-slate-700 hover:border-amber-500 transition-all overflow-hidden relative shadow-lg">
                  {editingId === p.id ? (
                    <div ref={editContainerRef} className="p-8 space-y-6 bg-slate-800 animate-in slide-in-from-bottom-2 duration-200">
                      <div>
                        <label className="text-[9px] font-black text-slate-500 ml-1 uppercase mb-1 block">Nume Expert</label>
                        <input className="w-full p-4 rounded-xl border-2 border-slate-700 bg-slate-900 text-white font-black uppercase italic text-[11px] shadow-inner" value={editForm?.nume || ""} onChange={e => setEditForm({...editForm, nume: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-500 ml-1 uppercase mb-3 block">Servicii Alocate</label>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2 scrollbar-hide">
                          {services.map(s => (
                            <button
                              key={s.id}
                              onClick={() => toggleServiciuStaff(s.nume || s.name)}
                              className={`p-3 rounded-xl text-[9px] font-black uppercase italic transition-all border-2 active:scale-95 ${
                                (editForm?.servicii || []).includes(s.nume || s.name)
                                  ? 'bg-amber-500 border-amber-500 text-slate-900 shadow-md'
                                  : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'
                              }`}
                              title={`Alocă serviciul ${s.nume || s.name} acestui expert`}
                            >
                              {s.nume || s.name}
                            </button>
                          ))}
                        </div>
                        {services.length === 0 && <p className="text-[9px] italic text-slate-600 mt-2">⚠️ Adaugă servicii în lista din stânga mai întâi.</p>}
                      </div>
                      <div className="flex gap-3 pt-4">
                        <button onClick={salveazaEditare} className="flex-1 bg-amber-500 text-slate-900 p-4 rounded-xl text-[10px] font-black uppercase italic hover:bg-white transition-all active:scale-95 shadow-md">SALVEAZĂ EXPERT</button>
                        <button onClick={() => { setEditingId(null); setEditForm(null); }} className="flex-1 bg-slate-700 p-4 rounded-xl text-[10px] font-black uppercase italic text-slate-300 hover:bg-slate-600 transition-all active:scale-95">ÎNCHIDE</button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform" onClick={() => activeazaEditare(p, 'staff')} title="Click pentru a edita profilul sau serviciile acestui expert">
                      <div className="flex-1">
                        <p className="font-black uppercase italic text-[13px] text-white group-hover:text-amber-500 transition-colors">{p.nume || p.name}</p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {(p.servicii || []).length > 0 ? (
                            p.servicii.map((serv: string, idx: number) => (
                              <span key={idx} className="text-[8px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700 uppercase font-black tracking-tighter">{serv}</span>
                            ))
                          ) : (
                            <span className="text-[8px] text-red-500/50 uppercase font-black italic">Niciun serviciu alocat momentan</span>
                          )}
                        </div>
                      </div>
                      {!isDemo && (
                        <button title="Șterge definitiv acest expert" onClick={(e) => { e.stopPropagation(); handleDelete(p.id, 'staff'); }} className="opacity-0 group-hover:opacity-100 bg-slate-800 text-red-400 w-10 h-10 flex items-center justify-center rounded-xl border border-slate-700 hover:bg-red-500 hover:text-white transition-all active:scale-90">✕</button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {staff.length === 0 && <p className="text-[10px] font-black text-slate-600 uppercase italic text-center py-10">Nu ai adăugat niciun expert încă.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}