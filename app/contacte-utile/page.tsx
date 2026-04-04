"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

type ContactUniversal = {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  role: string;
  image_url: string | null;
  email: string;
  note: string;
};

export default function ContacteUtilePage() {
  const [contacte, setContacte] = useState<ContactUniversal[]>([]);
  const [form, setForm] = useState({ nume: "", rol: "", telefon: "", email: "", note: "" });
  const [contactEditat, setContactEditat] = useState<ContactUniversal | null>(null);
  const [userPlan, setUserPlan] = useState("START (GRATUIT)");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const limitaContacte = userPlan === "START (GRATUIT)" ? 5 :
                         userPlan === "CHRONOS PRO" ? 100 : 9999;

  useEffect(() => {
    let mounted = true;

    const initFetch = async () => {
      setLoading(true);
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (!mounted) return;

        if (error || !user) {
          console.error("Utilizator negăsit:", error?.message);
          setLoading(false);
          return;
        }

        setCurrentUser(user);

        const [profileRes, contactsRes] = await Promise.all([
          supabase.from("profiles").select("plan_type").eq("id", user.id).single(),
          supabase.from("contacts").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
        ]);

        if (profileRes.data) setUserPlan(profileRes.data.plan_type || "START (GRATUIT)");

        if (!contactsRes.error && contactsRes.data) {
          setContacte(contactsRes.data.map(c => ({
            id: c.id,
            user_id: c.user_id,
            name: c.name || "",
            phone: c.phone || "",
            role: c.role || "",
            image_url: c.image_url || null,
            email: c.email || "",
            note: c.note || ""
          })));
        }
      } catch (err) {
        console.error("Eroare la inițializare:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initFetch();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setContactEditat(null);
      }
    };
    if (contactEditat) document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [contactEditat]);

  const adaugaContact = async () => {
    if (!form.nume || !form.telefon) return alert("NUMELE ȘI TELEFONUL SUNT OBLIGATORII!");
    
    if (form.email && !form.email.includes("@")) {
        return alert("TE RUGĂM SĂ INTRODUCI O ADRESĂ DE EMAIL VALIDĂ!");
    }

    if (contacte.length >= limitaContacte) return alert(`LIMITA PLANULUI ${userPlan} ATINSĂ!`);
    if (!currentUser) return alert("SESIUNE EXPIRATĂ. REÎNCARCĂ PAGINA.");

    try {
      const { data, error } = await supabase
        .from("contacts")
        .insert([{
          user_id: currentUser.id,
          name: form.nume.toUpperCase(),
          phone: form.telefon,
          role: form.rol.toUpperCase(),
          email: form.email.toUpperCase(),
          note: form.note.toUpperCase()
        }])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        setContacte([{ ...data[0] }, ...contacte]);
        setForm({ nume: "", rol: "", telefon: "", email: "", note: "" });
        alert("CONTACT SALVAT!");
      }
    } catch (error: any) {
      alert("EROARE: " + (error.message || "VERIFICĂ CONEXIUNEA"));
    }
  };

  const stergeContact = async (id: string) => {
    if (!confirm("ȘTERGI DEFINITIV?")) return;
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (!error) {
      setContacte(contacte.filter(c => c.id !== id));
      setContactEditat(null);
    }
  };

  const salveazaEditare = async () => {
    if (!contactEditat) return;
    if (!currentUser) return alert("SESIUNE EXPIRATĂ. REÎNCARCĂ PAGINA.");

    if (contactEditat.email && !contactEditat.email.includes("@")) {
        return alert("TE RUGĂM SĂ INTRODUCI O ADRESĂ DE EMAIL VALIDĂ!");
    }

    try {
      const { error } = await supabase.from("contacts").update({
        name: contactEditat.name.toUpperCase(),
        role: contactEditat.role.toUpperCase(),
        phone: contactEditat.phone,
        email: contactEditat.email.toUpperCase(),
        note: contactEditat.note.toUpperCase(),
      }).eq("id", contactEditat.id);

      if (error) throw error;
      setContacte(contacte.map(c => c.id === contactEditat.id ? contactEditat : c));
      setContactEditat(null);
      alert("MODIFICĂRI SALVATE!");
    } catch (error: any) {
      alert("EROARE: " + error.message);
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto mb-20 font-black italic uppercase">

      {/* HEADER UNITAR */}
      <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[50px] shadow-2xl border border-slate-100">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">
            Contacte <span className="text-amber-600">Utile</span>
          </h2>
          <p className="text-slate-400 font-black mt-2 uppercase text-[10px] tracking-[0.3em] italic">
            Management Parteneri • {userPlan}
          </p>
        </div>
        <div
          onMouseEnter={(e) => e.currentTarget.title = "CAPACITATEA TA DE STOCARE CONTACTE"}
          className="bg-slate-900 text-white px-8 py-4 rounded-[25px] shadow-xl text-[11px] font-black uppercase tracking-widest italic border-b-4 border-slate-700"
        >
          {contacte.length} / {limitaContacte > 1000 ? "∞" : limitaContacte} CAPACITATE
        </div>
      </div>

      {/* FORMULAR ADAUGARE */}
      <section className="bg-white p-8 md:p-10 rounded-[50px] shadow-2xl border border-slate-100 mb-12 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-2 h-full bg-amber-500 group-hover:w-3 transition-all"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <input type="text" placeholder="NUME COMPLET" value={form.nume} onChange={e => setForm({...form, nume: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[22px] outline-none focus:border-amber-500 font-bold text-xs italic uppercase transition-all" />
          <input type="text" placeholder="ROL / CATEGORIE" value={form.rol} onChange={e => setForm({...form, rol: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[22px] outline-none focus:border-amber-500 font-bold text-xs italic uppercase transition-all" />
          <input type="tel" placeholder="TELEFON" value={form.telefon} onChange={e => setForm({...form, telefon: e.target.value.replace(/[^0-9+]/g, '')})} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[22px] outline-none focus:border-amber-500 font-bold text-xs italic uppercase transition-all" />
          <input type="email" placeholder="EMAIL (OPȚIONAL)" value={form.email} onChange={e => setForm({...form, email: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[22px] outline-none focus:border-amber-500 font-bold text-xs italic uppercase transition-all" />
        </div>
        <div className="mt-8 flex flex-col md:flex-row gap-6">
          <input type="text" placeholder="NOTE SAU DETALII SPECIALE..." value={form.note} onChange={e => setForm({...form, note: e.target.value.toUpperCase()})} className="flex-1 p-5 bg-slate-50 border-2 border-slate-50 rounded-[22px] outline-none focus:border-amber-500 font-bold text-xs italic uppercase transition-all" />
          <button
            onClick={adaugaContact}
            title="APASĂ PENTRU A SALVA NOUL CONTACT"
            className="px-12 bg-slate-900 text-white rounded-[25px] font-black text-[12px] uppercase tracking-[0.2em] italic hover:bg-amber-600 transition-all shadow-xl border-b-4 border-slate-700 py-5"
          >
            + SALVEAZĂ
          </button>
        </div>
      </section>

      {/* GRID CONTACTE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full text-center py-20 font-black text-slate-400 animate-pulse uppercase">SINCRONIZARE BAZĂ DE DATE...</div>
        ) : (
          contacte.map(c => (
            <div
              key={c.id}
              onClick={() => setContactEditat(c)}
              title={`CLICK PENTRU EDITARE: ${c.name}`}
              className="bg-white border-2 border-slate-50 rounded-[45px] p-8 shadow-xl transition-all cursor-pointer group hover:scale-[1.02] hover:border-amber-200 flex flex-col min-h-[280px]"
            >
              <div className="flex items-center gap-5 mb-8">
                <div className="w-16 h-16 bg-slate-900 text-amber-500 rounded-2xl flex items-center justify-center text-2xl font-black italic shadow-lg">
                  {c.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900 italic uppercase">{c.name}</h4>
                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{c.role || "PARTENER"}</span>
                </div>
              </div>

              <div className="space-y-3 mb-8 flex-grow">
                <div className="bg-slate-50 p-4 rounded-2xl text-sm font-bold">{c.phone}</div>
                {c.email && <div className="bg-slate-50 p-4 rounded-2xl text-sm font-bold truncate">{c.email}</div>}
              </div>

              <div className="grid grid-cols-3 gap-3" onClick={e => e.stopPropagation()}>
                <a href={`tel:${c.phone}`} title="APEL TELEFONIC" className="py-4 bg-slate-900 text-white rounded-[18px] font-black text-[10px] text-center uppercase italic hover:bg-black transition-all">APEL</a>
                <a href={`https://wa.me/${c.phone.replace(/\D/g, '')}`} target="_blank" title="WHATSAPP" className="py-4 bg-[#25D366] text-white rounded-[18px] font-black text-[10px] text-center uppercase italic hover:scale-105 transition-all">WAPP</a>
                <a href={c.email ? `mailto:${c.email}` : "#"} title="EMAIL" className={`py-4 ${c.email ? 'bg-amber-600' : 'bg-slate-100 text-slate-300'} text-white rounded-[18px] font-black text-[10px] text-center uppercase italic transition-all`}>MAIL</a>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL EDITARE UNITAR */}
      {contactEditat && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div ref={modalRef} className="bg-white w-full max-w-xl rounded-[50px] shadow-2xl relative border-2 border-slate-50 p-10 flex flex-col">
            
            {/* BUTON ÎNCHIDERE (X) */}
            <button 
              onClick={() => setContactEditat(null)}
              title="ÎNCHIDE FEREASTRA"
              className="absolute top-6 right-6 w-10 h-10 bg-white border-2 border-amber-500 rounded-full flex items-center justify-center text-amber-600 font-black text-lg hover:bg-amber-50 transition-all shadow-md z-10"
            >
              ✕
            </button>

            <h3 className="text-3xl font-black text-center mb-8 italic uppercase">EDITARE <span className="text-amber-600">CONTACT</span></h3>

            <div className="space-y-6">
              <input type="text" value={contactEditat.name} onChange={e => setContactEditat({...contactEditat, name: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[25px] outline-none font-bold italic uppercase focus:border-amber-500" />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" value={contactEditat.role} onChange={e => setContactEditat({...contactEditat, role: e.target.value.toUpperCase()})} className="p-5 bg-slate-50 border-2 border-slate-50 rounded-[25px] outline-none font-bold italic uppercase focus:border-amber-500" />
                <input type="tel" value={contactEditat.phone} onChange={e => setContactEditat({...contactEditat, phone: e.target.value.replace(/[^0-9+]/g, '')})} className="p-5 bg-slate-50 border-2 border-slate-50 rounded-[25px] outline-none font-bold italic uppercase focus:border-amber-500" />
              </div>
              <input type="email" value={contactEditat.email} onChange={e => setContactEditat({...contactEditat, email: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[25px] outline-none font-bold italic uppercase focus:border-amber-500" />
              <textarea value={contactEditat.note} onChange={e => setContactEditat({...contactEditat, note: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[25px] outline-none font-bold italic uppercase focus:border-amber-500 h-24 resize-none" />

              <button
                onClick={salveazaEditare}
                title="SALVEAZĂ MODIFICĂRILE"
                className="w-full py-6 bg-slate-900 text-white rounded-[25px] font-black text-[12px] tracking-[0.3em] shadow-xl border-b-4 border-slate-700 uppercase italic hover:bg-amber-600 transition-all"
              >
                ACTUALIZEAZĂ
              </button>
              <button onClick={() => stergeContact(contactEditat.id)} className="w-full py-2 text-red-500 font-black text-[10px] uppercase italic opacity-60 hover:opacity-100">ȘTERGE CONTACT ✕</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}