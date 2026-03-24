"use client";

import { useState, useEffect } from "react";

type ContactUniversal = {
  id: number;
  nume: string;
  rol: string; 
  telefon: string;
  email: string;
  note: string; // Câmp nou pentru detalii
};

export default function ContacteUtilePage() {
  const [contacte, setContacte] = useState<ContactUniversal[]>([]);
  const [form, setForm] = useState({ nume: "", rol: "", telefon: "", email: "", note: "" });
  const [contactEditat, setContactEditat] = useState<ContactUniversal | null>(null);
  const [userPlan, setUserPlan] = useState("START (GRATUIT)");

  const limitaContacte = userPlan === "START (GRATUIT)" ? 5 : 
                         userPlan === "CHRONOS PRO" ? 100 : 9999;

  useEffect(() => {
    const saved = localStorage.getItem("contacte_universale");
    const savedPlan = localStorage.getItem("user_plan") || "START (GRATUIT)";
    setUserPlan(savedPlan);
    if (saved) {
      try { setContacte(JSON.parse(saved)); } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("contacte_universale", JSON.stringify(contacte));
  }, [contacte]);

  const adaugaContact = () => {
    if (!form.nume || !form.telefon) return;
    if (contacte.length >= limitaContacte) {
      alert(`Limita planului ${userPlan} atinsă!`);
      return;
    }
    const nou = { ...form, id: Date.now() };
    setContacte([...contacte, nou]);
    setForm({ nume: "", rol: "", telefon: "", email: "", note: "" });
  };

  const stergeContact = (id: number) => {
    setContacte(contacte.filter(c => c.id !== id));
    setContactEditat(null);
  };

  const salveazaEditare = () => {
    if (!contactEditat) return;
    setContacte(contacte.map(c => c.id === contactEditat.id ? contactEditat : c));
    setContactEditat(null);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto mb-20">
      
      {/* HEADER PAGINĂ */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase">
            Contacte <span className="text-amber-600">Utile</span>
          </h2>
          <p className="text-slate-400 font-bold mt-1 uppercase text-[9px] tracking-[0.2em]">
            Rețeaua de parteneri • {userPlan}
          </p>
        </div>
        <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg shadow-sm text-[10px] font-black uppercase tracking-widest">
           {contacte.length} / {limitaContacte > 1000 ? "∞" : limitaContacte} Contacte
        </div>
      </div>

      {/* FORMULAR ADĂUGARE COMPACT */}
      <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <input type="text" placeholder="Nume Complet" value={form.nume} onChange={e => setForm({...form, nume: e.target.value})} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 ring-amber-500/20 focus:border-amber-500 font-bold text-xs transition-all" />
          <input type="text" placeholder="Rol (ex: Furnizor, Medic)" value={form.rol} onChange={e => setForm({...form, rol: e.target.value})} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 ring-amber-500/20 focus:border-amber-500 font-bold text-xs transition-all" />
          <input type="tel" placeholder="Telefon" value={form.telefon} onChange={e => setForm({...form, telefon: e.target.value})} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 ring-amber-500/20 focus:border-amber-500 font-bold text-xs transition-all" />
          <input type="email" placeholder="Email (opțional)" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 ring-amber-500/20 focus:border-amber-500 font-bold text-xs transition-all" />
        </div>
        <div className="mt-3 flex gap-3">
            <input type="text" placeholder="Detalii speciale sau note importante..." value={form.note} onChange={e => setForm({...form, note: e.target.value})} className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 ring-amber-500/20 focus:border-amber-500 font-bold text-xs transition-all" />
            <button onClick={adaugaContact} className="px-6 bg-slate-900 text-white rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-md active:scale-95">
              + SALVEAZĂ
            </button>
        </div>
      </section>

      {/* LISTA CONTACTE - CARDURI ELEGANTE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacte.map(c => (
          <div key={c.id} onClick={() => setContactEditat(c)} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between hover:border-amber-300">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 text-slate-900 rounded-lg flex items-center justify-center text-xs font-black uppercase">{c.nume.charAt(0)}</div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 tracking-tight leading-none">{c.nume}</h4>
                    <span className="text-[8px] font-black text-amber-600 uppercase tracking-tighter">{c.rol || "Partener"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-slate-500">
                   <span className="text-[10px] font-bold">📞 {c.telefon}</span>
                </div>
                {c.email && (
                  <div className="flex items-center gap-2 text-slate-500">
                     <span className="text-[10px] font-bold truncate">📧 {c.email}</span>
                  </div>
                )}
                {c.note && (
                  <div className="mt-2 p-2 bg-amber-50/50 rounded-lg border border-amber-100/50 italic">
                    <p className="text-[9px] text-slate-600 font-medium leading-relaxed">"{c.note}"</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 mt-auto pt-2 border-t border-slate-50" onClick={e => e.stopPropagation()}>
              <a href={`tel:${c.telefon}`} className="py-1.5 bg-slate-900 text-white rounded-md font-black text-[8px] text-center uppercase tracking-widest hover:bg-slate-800">APEL</a>
              <a href={`https://wa.me/${c.telefon.replace(/\D/g, '')}`} target="_blank" className="py-1.5 bg-[#25D366] text-white rounded-md font-black text-[8px] text-center uppercase tracking-widest">WAPP</a>
              {c.email ? (
                <a href={`mailto:${c.email}`} className="py-1.5 bg-amber-500 text-white rounded-md font-black text-[8px] text-center uppercase tracking-widest">MAIL</a>
              ) : (
                <div className="py-1.5 bg-slate-100 text-slate-300 rounded-md font-black text-[8px] text-center uppercase tracking-widest">MAIL</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL EDITARE COMPLET */}
      {contactEditat && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setContactEditat(null)}>
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
                <h3 className="text-sm font-black text-slate-900 uppercase italic">Detalii Contact</h3>
                <div className="h-1 w-12 bg-amber-500 mx-auto mt-1 rounded-full"></div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Nume Complet</label>
                <input type="text" value={contactEditat.nume} onChange={e => setContactEditat({...contactEditat, nume: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-xs focus:border-amber-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Rol</label>
                  <input type="text" value={contactEditat.rol} onChange={e => setContactEditat({...contactEditat, rol: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-xs focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Telefon</label>
                  <input type="tel" value={contactEditat.telefon} onChange={e => setContactEditat({...contactEditat, telefon: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-xs focus:border-amber-500" />
                </div>
              </div>
              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Email</label>
                <input type="email" value={contactEditat.email} onChange={e => setContactEditat({...contactEditat, email: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-xs focus:border-amber-500" />
              </div>
              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Note / Detalii Speciale</label>
                <textarea rows={3} value={contactEditat.note} onChange={e => setContactEditat({...contactEditat, note: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-xs focus:border-amber-500 resize-none" placeholder="Notează aici coduri de reducere, program sau detalii specifice..." />
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <button onClick={salveazaEditare} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] tracking-widest shadow-lg shadow-slate-200 uppercase">Actualizează Contact</button>
              <button onClick={() => stergeContact(contactEditat.id)} className="w-full py-2 text-red-500 font-black text-[9px] uppercase tracking-tighter opacity-50 hover:opacity-100 transition-opacity">Elimină definitiv</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}