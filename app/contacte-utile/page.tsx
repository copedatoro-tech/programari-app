"use client";

import { useState, useEffect, useRef } from "react";

type ContactUniversal = {
  id: number;
  nume: string;
  rol: string; 
  telefon: string;
  email: string;
  note: string;
};

export default function ContacteUtilePage() {
  const [contacte, setContacte] = useState<ContactUniversal[]>([]);
  const [form, setForm] = useState({ nume: "", rol: "", telefon: "", email: "", note: "" });
  const [contactEditat, setContactEditat] = useState<ContactUniversal | null>(null);
  const [userPlan, setUserPlan] = useState("START (GRATUIT)");
  const modalRef = useRef<HTMLDivElement>(null);

  const limitaContacte = userPlan === "START (GRATUIT)" ? 5 : 
                         userPlan === "CHRONOS PRO" ? 100 : 9999;

  // Încărcare date
  useEffect(() => {
    const saved = localStorage.getItem("contacte_universale");
    const savedPlan = localStorage.getItem("user_plan") || "START (GRATUIT)";
    setUserPlan(savedPlan);
    if (saved) {
      try { setContacte(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  // Salvare automată
  useEffect(() => {
    localStorage.setItem("contacte_universale", JSON.stringify(contacte));
  }, [contacte]);

  // Închidere la click exterior pentru modal
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setContactEditat(null);
      }
    };
    if (contactEditat) document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [contactEditat]);

  const adaugaContact = () => {
    if (!form.nume || !form.telefon) {
      alert("Numele și Telefonul sunt obligatorii!");
      return;
    }
    if (contacte.length >= limitaContacte) {
      alert(`Limita planului ${userPlan} atinsă! Treceți la un plan superior pentru mai multe contacte.`);
      return;
    }
    const nou = { ...form, id: Date.now() };
    setContacte([...contacte, nou]);
    setForm({ nume: "", rol: "", telefon: "", email: "", note: "" });
  };

  const stergeContact = (id: number) => {
    if (confirm("Sigur dorești să elimini acest contact definitiv?")) {
      setContacte(contacte.filter(c => c.id !== id));
      setContactEditat(null);
    }
  };

  const salveazaEditare = () => {
    if (!contactEditat) return;
    setContacte(contacte.map(c => c.id === contactEditat.id ? contactEditat : c));
    setContactEditat(null);
  };

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto mb-20">
      
      {/* HEADER PAGINĂ */}
      <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[50px] shadow-2xl shadow-slate-200/50 border border-slate-100">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">
            Contacte <span className="text-amber-600 font-black">Utile</span>
          </h2>
          <p className="text-slate-400 font-black mt-2 uppercase text-[10px] tracking-[0.3em] italic">
            Managementul Rețelei de Parteneri • {userPlan}
          </p>
        </div>
        <div 
          title="Capacitatea actuală conform planului tău"
          className="bg-slate-900 text-white px-8 py-4 rounded-[25px] shadow-xl text-[11px] font-black uppercase tracking-widest italic border-b-4 border-slate-700"
        >
           {contacte.length} / {limitaContacte > 1000 ? "∞" : limitaContacte} Capacitate
        </div>
      </div>

      {/* FORMULAR ADĂUGARE */}
      <section className="bg-white p-8 md:p-10 rounded-[50px] shadow-2xl shadow-slate-200/50 border border-slate-100 mb-12 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-2 h-full bg-amber-500 group-hover:w-3 transition-all"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nume Complet</label>
            <input type="text" placeholder="EX: POPESCU ION" value={form.nume} onChange={e => setForm({...form, nume: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[22px] outline-none focus:border-amber-500 font-bold text-xs transition-all italic uppercase" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Rol / Categorie</label>
            <input type="text" placeholder="EX: FURNIZOR, MEDIC" value={form.rol} onChange={e => setForm({...form, rol: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[22px] outline-none focus:border-amber-500 font-bold text-xs transition-all italic uppercase" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Telefon Contact</label>
            <input type="tel" placeholder="07XX XXX XXX" value={form.telefon} onChange={e => setForm({...form, telefon: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[22px] outline-none focus:border-amber-500 font-bold text-xs transition-all italic uppercase" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Email (Opțional)</label>
            <input type="email" placeholder="CONTACT@EMAIL.COM" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[22px] outline-none focus:border-amber-500 font-bold text-xs transition-all italic uppercase" />
          </div>
        </div>
        <div className="mt-8 flex flex-col md:flex-row gap-6">
            <input type="text" placeholder="DETALII SPECIALE, CODURI SAU PROGRAM..." value={form.note} onChange={e => setForm({...form, note: e.target.value})} className="flex-1 p-5 bg-slate-50 border-2 border-slate-50 rounded-[22px] outline-none focus:border-amber-500 font-bold text-xs transition-all italic uppercase" />
            <button 
              onClick={adaugaContact} 
              title="Salvează acest partener în baza de date securizată"
              className="px-12 bg-slate-900 text-white rounded-[25px] font-black text-[12px] uppercase tracking-[0.2em] italic hover:bg-amber-600 transition-all shadow-xl border-b-4 border-slate-700 active:border-b-0 active:translate-y-1 py-5 md:py-0"
            >
              + SALVEAZĂ CONTACT
            </button>
        </div>
      </section>

      {/* GRID CONTACTE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {contacte.map(c => (
          <div 
            key={c.id} 
            onClick={() => setContactEditat(c)} 
            title="Apasă pentru a edita detaliile contactului"
            className="bg-white border-2 border-slate-50 rounded-[45px] p-8 shadow-xl shadow-slate-200/40 transition-all cursor-pointer group hover:scale-[1.03] hover:shadow-2xl hover:border-amber-200 flex flex-col min-h-[300px] relative overflow-hidden"
          >
            <div className="flex items-center gap-5 mb-8">
              <div className="w-16 h-16 bg-slate-900 text-amber-500 rounded-2xl flex items-center justify-center text-2xl font-black italic shadow-lg group-hover:rotate-6 transition-transform">
                {c.nume.charAt(0)}
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-900 tracking-tighter italic uppercase">{c.nume}</h4>
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{c.rol || "PARTENER"}</span>
              </div>
            </div>

            <div className="space-y-3 mb-8 flex-grow">
              <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-4 rounded-2xl">
                 <span className="text-[10px] font-black italic uppercase text-slate-400">TEL:</span>
                 <span className="text-sm font-bold">{c.telefon}</span>
              </div>
              {c.email && (
                <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-4 rounded-2xl">
                   <span className="text-[10px] font-black italic uppercase text-slate-400">MAIL:</span>
                   <span className="text-sm font-bold truncate">{c.email}</span>
                </div>
              )}
              {c.note && (
                <div className="mt-4 p-5 bg-amber-50/50 rounded-[25px] border border-amber-100 italic relative">
                  <p className="text-[11px] text-slate-700 font-bold leading-relaxed">"{c.note}"</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3" onClick={e => e.stopPropagation()}>
              <a href={`tel:${c.telefon}`} title="Sună acum partenerul" className="py-4 bg-slate-900 text-white rounded-[18px] font-black text-[10px] text-center uppercase tracking-widest italic hover:bg-black transition-all">APEL</a>
              <a href={`https://wa.me/${c.telefon.replace(/\D/g, '')}`} target="_blank" title="Trimite mesaj pe WhatsApp" className="py-4 bg-[#25D366] text-white rounded-[18px] font-black text-[10px] text-center uppercase tracking-widest italic hover:scale-105 transition-all">WAPP</a>
              {c.email ? (
                <a href={`mailto:${c.email}`} title="Trimite un email rapid" className="py-4 bg-amber-600 text-white rounded-[18px] font-black text-[10px] text-center uppercase tracking-widest italic hover:bg-amber-700 transition-all">MAIL</a>
              ) : (
                <div className="py-4 bg-slate-100 text-slate-300 rounded-[18px] font-black text-[10px] text-center uppercase tracking-widest italic cursor-not-allowed">MAIL</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL EDITARE */}
      {contactEditat && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div 
            ref={modalRef}
            className="bg-white w-full max-w-xl rounded-[50px] p-10 shadow-2xl relative border-2 border-slate-50" 
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-10">
                <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Editare <span className="text-amber-600 font-black">Contact</span></h3>
                <div className="h-2 w-20 bg-amber-500 mx-auto mt-4 rounded-full shadow-lg shadow-amber-200"></div>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Nume Complet</label>
                <input type="text" value={contactEditat.nume} onChange={e => setContactEditat({...contactEditat, nume: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[25px] outline-none font-bold text-sm focus:border-amber-500 italic uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Rol</label>
                  <input type="text" value={contactEditat.rol} onChange={e => setContactEditat({...contactEditat, rol: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[25px] outline-none font-bold text-sm focus:border-amber-500 italic uppercase" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Telefon</label>
                  <input type="tel" value={contactEditat.telefon} onChange={e => setContactEditat({...contactEditat, telefon: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[25px] outline-none font-bold text-sm focus:border-amber-500 italic uppercase" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Email</label>
                <input type="email" value={contactEditat.email} onChange={e => setContactEditat({...contactEditat, email: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[25px] outline-none font-bold text-sm focus:border-amber-500 italic uppercase" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Note / Detalii</label>
                <textarea rows={3} value={contactEditat.note} onChange={e => setContactEditat({...contactEditat, note: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[25px] outline-none font-bold text-sm focus:border-amber-500 resize-none italic uppercase" />
              </div>
            </div>

            <div className="mt-10 space-y-4">
              <button 
                onClick={salveazaEditare} 
                title="Actualizează informațiile partenerului"
                className="w-full py-6 bg-slate-900 text-white rounded-[25px] font-black text-[12px] tracking-[0.3em] shadow-xl border-b-4 border-slate-700 uppercase italic hover:bg-amber-600 transition-all active:translate-y-1 active:border-b-0"
              >
                Actualizează Datele
              </button>
              <button 
                onClick={() => stergeContact(contactEditat.id)} 
                title="Elimină definitiv acest contact din sistem"
                className="w-full py-4 text-red-500 font-black text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity italic"
              >
                Elimină Contactul ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}