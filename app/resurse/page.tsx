'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://zzrubdbngjfwurdwxtwf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6cnViZGJuZ2pmd3VyZHd4dHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDkyMTgsImV4cCI6MjA4ODQ4NTIxOH0.6uw6yzCs5OfCP7xqWshzPQP36bCPxi2LU0QtpwsvnOo";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Folosim ID-ul tău fix pentru a garanta conexiunea cu datele tale
const MY_DIRECT_ID = "ed9cd915-6684-422c-a214-4ac5c25e98f3";

export default function ResursePage() {
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({ type: 'service', name: '', price: '', duration: '' });

  useEffect(() => {
    fetchResurse();
  }, []);

  async function fetchResurse() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('services, staff')
        .eq('id', MY_DIRECT_ID)
        .single();

      if (data) {
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
    const id = crypto.randomUUID();
    let listaActualizata, coloana;

    if (newItem.type === 'service') {
      listaActualizata = [...services, { id, nume: newItem.name, pret: newItem.price, durata: newItem.duration }];
      coloana = 'services';
    } else {
      listaActualizata = [...staff, { id, nume: newItem.name }];
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

  if (loading) return <div className="p-20 text-center font-black italic text-amber-600 animate-pulse">SINCRONIZARE DATE...</div>;

  return (
    <div className="min-h-screen bg-[#fcfcfc] p-8 md:p-16">
      <div className="max-w-6xl mx-auto">
        {/* TITLU SOLICITAT */}
        <header className="mb-12">
          <h1 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900 border-l-8 border-amber-500 pl-6">
            Gestiune <span className="text-amber-600">Servicii și Staff</span>
          </h1>
        </header>

        {/* Zona de adăugare - Acum cu hover tooltips */}
        <div className="bg-white p-4 rounded-[28px] shadow-2xl mb-16 flex flex-wrap gap-3 border border-slate-100">
          <select 
            title="Alege tipul de resursă"
            className="bg-slate-50 p-5 rounded-2xl font-black uppercase italic text-[11px] outline-none border-2 border-transparent focus:border-amber-500 transition-all"
            value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value})}
          >
            <option value="service">SERVICIU NOU</option>
            <option value="staff">MEMBRU ECHIPĂ</option>
          </select>
          <input title="Introdu numele" className="flex-1 bg-slate-50 p-5 rounded-2xl font-black uppercase italic text-[11px] outline-none" placeholder="DENUMIRE..." value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
          {newItem.type === 'service' && (
            <>
              <input title="Prețul în RON" className="w-28 bg-slate-50 p-5 rounded-2xl font-black uppercase italic text-[11px] outline-none text-center" placeholder="PRET" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
              <input title="Durata în minute" className="w-28 bg-slate-50 p-5 rounded-2xl font-black uppercase italic text-[11px] outline-none text-center" placeholder="MIN" value={newItem.duration} onChange={e => setNewItem({...newItem, duration: e.target.value})} />
            </>
          )}
          <button onClick={handleAdd} className="bg-slate-900 text-amber-500 px-10 py-5 rounded-2xl font-black uppercase italic text-[11px] hover:bg-amber-500 hover:text-white transition-all transform active:scale-95 shadow-lg">ADĂUGĂ +</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* CATALOG SERVICII - SECȚIUNE ACTIVĂ */}
          <div className="bg-white p-10 rounded-[40px] shadow-xl border border-slate-50">
            <h2 className="text-[11px] font-black uppercase italic text-slate-400 mb-10 tracking-[0.3em] border-b pb-4">Catalog Servicii</h2>
            <div className="space-y-4">
              {services.length === 0 && <p className="text-center py-10 text-slate-300 italic font-bold uppercase text-[10px]">Așteptăm date noi...</p>}
              {services.map(s => (
                <div key={s.id} title={`Serviciu: ${s.nume || s.name}`} className="group flex justify-between items-center bg-slate-50 p-6 rounded-[24px] border-l-8 border-amber-500 hover:bg-amber-50 hover:scale-[1.02] transition-all cursor-default">
                  <div>
                    <p className="font-black uppercase italic text-sm text-slate-900">{s.nume || s.name}</p>
                    <p className="text-[10px] font-bold text-amber-600 mt-1">{s.pret || s.price} RON — {s.durata || s.duration} MIN</p>
                  </div>
                  <button onClick={() => handleDelete(s.id, 'services')} className="opacity-0 group-hover:opacity-100 bg-white text-red-500 p-3 rounded-xl shadow-md hover:bg-red-500 hover:text-white transition-all">✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* ECHIPA - SECȚIUNE ACTIVĂ */}
          <div className="bg-white p-10 rounded-[40px] shadow-xl border border-slate-50">
            <h2 className="text-[11px] font-black uppercase italic text-slate-400 mb-10 tracking-[0.3em] border-b pb-4">Echipă</h2>
            <div className="space-y-4">
              {staff.length === 0 && <p className="text-center py-10 text-slate-300 italic font-bold uppercase text-[10px]">Niciun membru adăugat...</p>}
              {staff.map(p => (
                <div key={p.id} title={`Membru: ${p.nume || p.name}`} className="group flex justify-between items-center bg-slate-900 p-6 rounded-[24px] border-l-8 border-slate-700 hover:border-amber-500 hover:scale-[1.02] transition-all cursor-default">
                  <p className="font-black uppercase italic text-sm text-white group-hover:text-amber-500">{p.nume || p.name}</p>
                  <button onClick={() => handleDelete(p.id, 'staff')} className="opacity-0 group-hover:opacity-100 bg-slate-800 text-red-400 p-3 rounded-xl shadow-md hover:bg-red-500 hover:text-white transition-all">✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}