'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

const LIMITE = {
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
  const [newItem, setNewItem] = useState({ type: 'service', name: '', price: '', duration: '' });
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  // Inițializare stabilă a clientului Supabase
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const editContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      // 1. Verificăm dacă modul Demo este activ în local storage
      const demoActive = typeof window !== 'undefined' && localStorage.getItem("chronos_demo") === "true";
      
      if (demoActive) {
        if (!mounted) return;
        setUserId("demo_user");
        setIsDemo(true);
        setServices([
          { id: 'd1', nume: 'Tuns (Exemplu)', pret: '50', durata: '30' },
          { id: 'd2', nume: 'Barba (Exemplu)', pret: '30', durata: '20' }
        ]);
        setStaff([{ id: 's1', nume: 'Echipa Chronos', servicii: ['Tuns (Exemplu)'] }]);
        setLoading(false);
        return;
      }

      // 2. Verificăm sesiunea reală din Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        if (!mounted) return;
        setUserId(session.user.id);
        setIsDemo(false);
        await fetchResurse(session.user.id);
      } else {
        // Fallback la getUser pentru siguranță
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          if (!mounted) return;
          setUserId(user.id);
          setIsDemo(false);
          await fetchResurse(user.id);
        } else {
          // Dacă nu există sesiune, redirect la login
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
        setUserPlan(data.plan_type?.toLowerCase() || "start (gratuit)");
        
        const proceseaza = (val: any) => {
          if (!val) return [];
          // Verificăm dacă datele vin ca string (JSON) sau obiect direct
          let curat = typeof val === 'string' ? JSON.parse(val) : val;
          return Array.isArray(curat) ? curat : [];
        };

        setServices(proceseaza(data.services));
        setStaff(proceseaza(data.staff));
      } else if (error && error.code !== 'PGRST116') {
        console.error("Eroare la baza de date:", error.message);
      }
    } catch (err) {
      console.error("Eroare la preluarea datelor:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newItem.name || !userId || isDemo) return;

    const id = crypto.randomUUID();
    let listaActualizata, coloana;

    if (newItem.type === 'service') {
      listaActualizata = [...services, { id, nume: newItem.name, pret: newItem.price, durata: newItem.duration }];
      coloana = 'services';
    } else {
      listaActualizata = [...staff, { id, nume: newItem.name, servicii: [] }];
      coloana = 'staff';
    }

    const { error } = await supabase.from('profiles').update({ [coloana]: listaActualizata }).eq('id', userId);
    if (!error) {
      if (newItem.type === 'service') setServices(listaActualizata);
      else setStaff(listaActualizata);
      setNewItem({ ...newItem, name: '', price: '', duration: '' });
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
    setEditForm({ ...item, tip, nume: item.nume || item.name || "" });
    setEditingId(item.id);
  };

  const salveazaEditare = async () => {
    if (isDemo || !editForm || !editingId || !userId) return;
    const coloana = editForm.tip === 'service' ? 'services' : 'staff';
    const listaVeche = editForm.tip === 'service' ? services : staff;
    const listaActualizata = listaVeche.map(item => item.id === editingId ? { ...editForm } : item);

    const { error } = await supabase.from('profiles').update({ [coloana]: listaActualizata }).eq('id', userId);
    if (!error) {
      if (editForm.tip === 'service') setServices(listaActualizata);
      else setStaff(listaActualizata);
      setEditingId(null);
      setEditForm(null);
    }
  };

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
            className="px-8 py-4 bg-white border-2 border-slate-900 rounded-[20px] font-black uppercase text-[10px] italic hover:bg-slate-900 hover:text-white transition-all shadow-lg border-b-4 border-slate-900 active:translate-y-1 active:border-b-0"
          >
            ← PANOU PRINCIPAL
          </button>
        </header>

        {/* Formular Adăugare */}
        <div className={`bg-white p-5 rounded-[35px] shadow-2xl mb-16 flex flex-wrap gap-4 border border-slate-100 items-center transition-all ${isDemo ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
          <select 
            title="Tip resursă"
            className="bg-slate-50 p-5 rounded-2xl font-black uppercase italic text-[11px] outline-none"
            value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value})}
          >
            <option value="service">SERVICIU NOU</option>
            <option value="staff">MEMBRU ECHIPĂ</option>
          </select>

          <input 
            title="Nume"
            className="flex-1 min-w-[200px] bg-slate-50 p-5 rounded-2xl font-black uppercase italic text-[11px] outline-none" 
            placeholder="DENUMIRE..." 
            value={newItem.name} 
            onChange={e => setNewItem({...newItem, name: e.target.value})} 
          />

          <button 
            title="Adaugă resursă"
            onClick={handleAdd} 
            className="bg-slate-900 text-amber-500 px-10 py-5 rounded-2xl font-black uppercase italic text-[11px] hover:bg-amber-500 hover:text-white transition-all shadow-lg border-b-4 border-slate-800"
          >
            CONFIRMĂ +
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* SECȚIUNE SERVICII */}
          <div className="bg-white p-10 rounded-[50px] shadow-xl border border-slate-50">
            <h2 className="text-[11px] font-black uppercase italic text-slate-400 mb-10 tracking-[0.3em] border-b pb-6">
              SERVICII ACTIVate ({services.length})
            </h2>
            <div className="space-y-4">
              {services.map(s => (
                <div key={s.id} className="group bg-slate-50 rounded-[28px] border-l-8 border-amber-500 hover:bg-white transition-all border border-transparent hover:border-slate-100 overflow-hidden relative">
                  {editingId === s.id ? (
                    <div ref={editContainerRef} className="p-8 space-y-4 bg-white">
                      <input className="w-full p-4 rounded-xl border-2 border-slate-100 font-black uppercase italic text-[11px]" value={editForm?.nume || ""} onChange={e => setEditForm({...editForm, nume: e.target.value})} placeholder="NUME" />
                      <div className="flex gap-2">
                        <input className="w-1/2 p-4 rounded-xl border-2 border-slate-100 font-black uppercase italic text-[11px]" value={editForm?.pret || ""} onChange={e => setEditForm({...editForm, pret: e.target.value})} placeholder="PREȚ" />
                        <input className="w-1/2 p-4 rounded-xl border-2 border-slate-100 font-black uppercase italic text-[11px]" value={editForm?.durata || ""} onChange={e => setEditForm({...editForm, durata: e.target.value})} placeholder="DURATA" />
                      </div>
                      <div className="flex gap-3">
                        <button onClick={salveazaEditare} className="flex-1 bg-slate-900 text-amber-500 p-4 rounded-xl text-[10px] font-black uppercase italic">SALVEAZĂ</button>
                        <button onClick={() => { setEditingId(null); setEditForm(null); }} className="flex-1 bg-slate-100 p-4 rounded-xl text-[10px] font-black uppercase italic text-slate-400">ANULEAZĂ</button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 flex justify-between items-center cursor-pointer" onClick={() => activeazaEditare(s, 'service')}>
                      <div title={`Editează ${s.nume || s.name}`}>
                        <p className="font-black uppercase italic text-[13px] text-slate-900">{s.nume || s.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase italic tracking-widest">{s.pret || s.price} RON — {s.durata || s.duration} MIN</p>
                      </div>
                      {!isDemo && (
                        <button title="Șterge serviciu" onClick={(e) => { e.stopPropagation(); handleDelete(s.id, 'services'); }} className="opacity-0 group-hover:opacity-100 bg-white text-red-500 p-4 rounded-2xl shadow-md border border-red-500 transition-opacity">✕</button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SECȚIUNE ECHIPĂ */}
          <div className="bg-white p-10 rounded-[50px] shadow-xl border border-slate-50">
            <h2 className="text-[11px] font-black uppercase italic text-slate-400 mb-10 tracking-[0.3em] border-b pb-6 text-right">
              ECHIPĂ CHRONOS ({staff.length})
            </h2>
            <div className="space-y-4">
              {staff.map(p => (
                <div key={p.id} className="group bg-slate-900 rounded-[28px] border-l-8 border-slate-700 hover:border-amber-500 transition-all overflow-hidden relative">
                  {editingId === p.id ? (
                    <div ref={editContainerRef} className="p-8 space-y-4 bg-slate-800">
                      <input className="w-full p-4 rounded-xl border-2 border-slate-700 bg-slate-900 text-white font-black uppercase italic text-[11px]" value={editForm?.nume || ""} onChange={e => setEditForm({...editForm, nume: e.target.value})} />
                      <div className="flex gap-3">
                        <button onClick={salveazaEditare} className="flex-1 bg-amber-500 text-slate-900 p-4 rounded-xl text-[10px] font-black uppercase italic">SALVEAZĂ</button>
                        <button onClick={() => { setEditingId(null); setEditForm(null); }} className="flex-1 bg-slate-700 p-4 rounded-xl text-[10px] font-black uppercase italic text-slate-300">ANULEAZĂ</button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 flex justify-between items-center cursor-pointer" onClick={() => activeazaEditare(p, 'staff')}>
                      <div className="flex-1" title={`Editează membru: ${p.nume || p.name}`}>
                        <p className="font-black uppercase italic text-[13px] text-white group-hover:text-amber-500 transition-colors">{p.nume || p.name}</p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {(p.servicii || []).map((serv: string, idx: number) => (
                            <span key={idx} className="text-[8px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700 uppercase font-black">{serv}</span>
                          ))}
                        </div>
                      </div>
                      {!isDemo && (
                        <button title="Șterge membru echipă" onClick={(e) => { e.stopPropagation(); handleDelete(p.id, 'staff'); }} className="opacity-0 group-hover:opacity-100 bg-slate-800 text-red-400 p-4 rounded-2xl border border-slate-700 transition-opacity">✕</button>
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