'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://zzrubdbngjfwurdwxtwf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6cnViZGJuZ2pmd3VyZHd4dHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDkyMTgsImV4cCI6MjA4ODQ4NTIxOH0.6uw6yzCs5OfCP7xqWshzPQP36bCPxi2LU0QtpwsvnOo";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const MY_DIRECT_ID = "ed9cd915-6684-422c-a214-4ac5c25e98f3";

// --- CONFIGURARE LIMITE STRICTE ---
const LIMITE = {
  STAFF: {
    "start (gratuit)": 1,
    "chronos pro": 1,
    "chronos elite": 5,
    "chronos team": 50
  },
  SERVICII: {
    "start (gratuit)": 5,
    "chronos pro": 15,
    "chronos elite": 999,
    "chronos team": 999
  }
};

export default function ResursePage() {
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [userPlan, setUserPlan] = useState("start (gratuit)");
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({ type: 'service', name: '', price: '', duration: '' });
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  useEffect(() => {
    fetchResurse();
  }, []);

  async function fetchResurse() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('services, staff, plan_type')
        .eq('id', MY_DIRECT_ID)
        .single();

      if (data) {
        // Normalizăm numele planului pentru a se potrivi cu obiectul LIMITE
        const planSeta = data.plan_type?.toLowerCase() || "start (gratuit)";
        setUserPlan(planSeta);
        
        const proceseaza = (val: any) => {
          if (!val) return [];
          let curat = typeof val === 'string' ? JSON.parse(val) : val;
          if (typeof curat === 'string') curat = JSON.parse(curat);
          return Array.isArray(curat) ? curat : [];
        };
        setServices(proceseaza(data.services));
        setStaff(proceseaza(data.staff));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newItem.name) return;

    // --- LOGICĂ VERIFICARE LIMITE ---
    if (newItem.type === 'service') {
      const limitaServicii = LIMITE.SERVICII[userPlan as keyof typeof LIMITE.SERVICII] || 5;
      if (services.length >= limitaServicii) {
        alert(`⚠️ LIMITĂ SERVICII: Planul tău actual (${userPlan.toUpperCase()}) permite maxim ${limitaServicii} servicii. Te rugăm să faci upgrade pentru a adăuga mai multe.`);
        return;
      }
    } else {
      const limitaStaff = LIMITE.STAFF[userPlan as keyof typeof LIMITE.STAFF] || 1;
      if (staff.length >= limitaStaff) {
        alert(`⚠️ LIMITĂ STAFF: Planul ${userPlan.toUpperCase()} permite maxim ${limitaStaff} membru de echipă. Treci la ELITE pentru 5 persoane sau la TEAM pentru 50.`);
        return;
      }
    }

    const id = crypto.randomUUID();
    let listaActualizata, coloana;

    if (newItem.type === 'service') {
      listaActualizata = [...services, { id, nume: newItem.name, pret: newItem.price, durata: newItem.duration }];
      coloana = 'services';
    } else {
      listaActualizata = [...staff, { id, nume: newItem.name, servicii: [] }];
      coloana = 'staff';
    }

    const { error } = await supabase.from('profiles').update({ [coloana]: listaActualizata }).eq('id', MY_DIRECT_ID);
    if (!error) {
      if (newItem.type === 'service') setServices(listaActualizata);
      else setStaff(listaActualizata);
      setNewItem({ ...newItem, name: '', price: '', duration: '' });
    }
  }

  async function handleDelete(id: any, type: 'services' | 'staff') {
    const listaNoua = type === 'services' ? services.filter(x => x.id !== id) : staff.filter(x => x.id !== id);
    const { error } = await supabase.from('profiles').update({ [type]: listaNoua }).eq('id', MY_DIRECT_ID);
    if (!error) type === 'services' ? setServices(listaNoua) : setStaff(listaNoua);
  }

  const pornesteEditare = (item: any, tip: 'service' | 'staff') => {
    setEditingId(item.id);
    setEditForm({ ...item, tip });
  };

  const salveazaEditare = async () => {
    const coloana = editForm.tip === 'service' ? 'services' : 'staff';
    const listaVeche = editForm.tip === 'service' ? services : staff;
    
    const listaActualizata = listaVeche.map(item => 
      item.id === editingId ? { ...editForm } : item
    );

    const { error } = await supabase.from('profiles').update({ [coloana]: listaActualizata }).eq('id', MY_DIRECT_ID);
    
    if (!error) {
      if (editForm.tip === 'service') setServices(listaActualizata);
      else setStaff(listaActualizata);
      setEditingId(null);
      setEditForm(null);
    }
  };

  const toggleServiciuStaff = (serviciuNume: string) => {
    const serviciiCurente = editForm.servicii || [];
    const listaNoua = serviciiCurente.includes(serviciuNume)
      ? serviciiCurente.filter((s: string) => s !== serviciuNume)
      : [...serviciiCurente, serviciuNume];
    setEditForm({ ...editForm, servicii: listaNoua });
  };

  if (loading) return <div className="p-20 text-center font-black italic text-amber-600 animate-pulse uppercase tracking-[0.3em]">Sincronizare resurse...</div>;

  return (
    <div className="min-h-screen bg-[#fcfcfc] p-8 md:p-16">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900 border-l-8 border-amber-500 pl-6">
              Gestiune <span className="text-amber-600">Servicii și Staff</span>
            </h1>
            <div className="flex items-center gap-2 ml-8 mt-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Plan activ: <span className="text-slate-900">{userPlan}</span></p>
            </div>
          </div>
        </header>

        {/* Panou Adăugare */}
        <div className="bg-white p-4 rounded-[28px] shadow-2xl mb-16 flex flex-wrap gap-3 border border-slate-100">
          <select 
            title="Alege tipul"
            className="bg-slate-50 p-5 rounded-2xl font-black uppercase italic text-[11px] outline-none border-2 border-transparent focus:border-amber-500 transition-all cursor-pointer"
            value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value})}
          >
            <option value="service">SERVICIU NOU</option>
            <option value="staff">MEMBRU ECHIPĂ</option>
          </select>
          <input title="Introdu numele" className="flex-1 bg-slate-50 p-5 rounded-2xl font-black uppercase italic text-[11px] outline-none focus:bg-white border-2 border-transparent focus:border-slate-100 transition-all" placeholder="DENUMIRE..." value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
          {newItem.type === 'service' && (
            <>
              <input title="Preț" className="w-28 bg-slate-50 p-5 rounded-2xl font-black uppercase italic text-[11px] outline-none text-center" placeholder="PRET (RON)" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
              <input title="Minute" className="w-28 bg-slate-50 p-5 rounded-2xl font-black uppercase italic text-[11px] outline-none text-center" placeholder="MIN" value={newItem.duration} onChange={e => setNewItem({...newItem, duration: e.target.value})} />
            </>
          )}
          <button onClick={handleAdd} className="bg-slate-900 text-amber-500 px-10 py-5 rounded-2xl font-black uppercase italic text-[11px] hover:bg-amber-500 hover:text-white transition-all transform active:scale-95 shadow-lg border-b-4 border-slate-800 hover:border-amber-600">ADĂUGĂ +</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* CATALOG SERVICII */}
          <div className="bg-white p-10 rounded-[40px] shadow-xl border border-slate-50">
            <h2 className="text-[11px] font-black uppercase italic text-slate-400 mb-10 tracking-[0.3em] border-b pb-4 flex justify-between items-center">
              Catalog Servicii <span>{services.length} unități</span>
            </h2>
            <div className="space-y-4">
              {services.length === 0 && <p className="text-center py-10 text-slate-300 italic font-bold uppercase text-[10px]">Așteptăm date noi...</p>}
              {services.map(s => (
                <div key={s.id} className="group bg-slate-50 p-6 rounded-[24px] border-l-8 border-amber-500 hover:bg-amber-50 transition-all">
                  {editingId === s.id ? (
                    <div className="space-y-3">
                      <input className="w-full p-2 rounded-lg border font-bold text-xs" value={editForm.nume || editForm.name} onChange={e => setEditForm({...editForm, nume: e.target.value})} />
                      <div className="flex gap-2">
                        <input className="w-1/2 p-2 rounded-lg border text-xs" placeholder="Preț" value={editForm.pret || editForm.price} onChange={e => setEditForm({...editForm, pret: e.target.value})} />
                        <input className="w-1/2 p-2 rounded-lg border text-xs" placeholder="Minute" value={editForm.durata || editForm.duration} onChange={e => setEditForm({...editForm, durata: e.target.value})} />
                      </div>
                      <div className="flex gap-2">
                        <button title="Salvează" onClick={salveazaEditare} className="flex-1 bg-slate-900 text-white p-2 rounded-xl text-[10px] font-black">SALVEAZĂ</button>
                        <button title="Anulează" onClick={() => setEditingId(null)} className="flex-1 bg-slate-200 p-2 rounded-xl text-[10px] font-black">ANULEAZĂ</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center cursor-pointer" title="Click pentru editare" onClick={() => pornesteEditare(s, 'service')}>
                      <div>
                        <p className="font-black uppercase italic text-sm text-slate-900 group-hover:text-amber-600 transition-colors">{s.nume || s.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter tracking-[0.1em]">{s.pret || s.price} RON — {s.durata || s.duration} MIN</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id, 'services'); }} className="opacity-0 group-hover:opacity-100 bg-white text-red-500 p-3 rounded-xl shadow-md hover:bg-red-500 hover:text-white transition-all">✕</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ECHIPA */}
          <div className="bg-white p-10 rounded-[40px] shadow-xl border border-slate-50">
            <h2 className="text-[11px] font-black uppercase italic text-slate-400 mb-10 tracking-[0.3em] border-b pb-4 flex justify-between items-center">
              Echipă <span>{staff.length} persoane</span>
            </h2>
            <div className="space-y-4">
              {staff.length === 0 && <p className="text-center py-10 text-slate-300 italic font-bold uppercase text-[10px]">Niciun membru adăugat...</p>}
              {staff.map(p => (
                <div key={p.id} className="group bg-slate-900 p-6 rounded-[24px] border-l-8 border-slate-700 hover:border-amber-500 transition-all">
                  {editingId === p.id ? (
                    <div className="space-y-4">
                      <input className="w-full p-2 rounded-lg border font-bold text-xs" value={editForm.nume || editForm.name} onChange={e => setEditForm({...editForm, nume: e.target.value})} />
                      <div>
                        <p className="text-[9px] text-slate-400 font-black mb-2 uppercase tracking-tighter">Atribuie Servicii:</p>
                        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                          {services.map(ser => (
                            <label key={ser.id} className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                              <input 
                                type="checkbox" 
                                className="accent-amber-500"
                                checked={(editForm.servicii || []).includes(ser.nume || ser.name)}
                                onChange={() => toggleServiciuStaff(ser.nume || ser.name)}
                              />
                              <span className="text-[9px] text-white font-bold uppercase truncate">{ser.nume || ser.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button title="Salvează" onClick={salveazaEditare} className="flex-1 bg-amber-500 text-white p-2 rounded-xl text-[10px] font-black">SALVEAZĂ</button>
                        <button title="Anulează" onClick={() => setEditingId(null)} className="flex-1 bg-slate-700 text-white p-2 rounded-xl text-[10px] font-black">ANULEAZĂ</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center cursor-pointer" title="Click pentru editare" onClick={() => pornesteEditare(p, 'staff')}>
                      <div className="flex-1">
                        <p className="font-black uppercase italic text-sm text-white group-hover:text-amber-500 transition-colors">{p.nume || p.name}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(p.servicii || []).length > 0 ? (p.servicii || []).map((serv: string, idx: number) => (
                            <span key={idx} className="text-[8px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700 uppercase font-black tracking-tighter">
                              {serv}
                            </span>
                          )) : <span className="text-[8px] text-slate-600 uppercase font-bold tracking-widest italic">Niciun serviciu atribuit</span>}
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id, 'staff'); }} className="opacity-0 group-hover:opacity-100 bg-slate-800 text-red-400 p-3 rounded-xl shadow-md hover:bg-red-500 hover:text-white transition-all">✕</button>
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