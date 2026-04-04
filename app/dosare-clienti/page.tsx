"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function IstoricPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [dosare, setDosare] = useState<any[]>([]);
  const [incarcare, setIncarcare] = useState(true);
  const [cautare, setCautare] = useState("");
  const [dosarSelectat, setDosarSelectat] = useState<any | null>(null);

  // --- Preluare dosare din baza de date ---
  const preiaSiGrupeazaDosare = useCallback(async (currentUserId: string) => {
    const { data, error } = await supabase
      .from('client_cases')
      .select('*')
      .eq('user_id', currentUserId);

    if (error) {
      console.error("Eroare preluare dosare:", error);
      return;
    }

    const clientiUnici: Record<string, any> = {};

    data.forEach(dosar => {
      const telCurat = dosar.phone_number?.replace(/\s+/g, '') || "";
      const emailCurat = dosar.client_email?.toLowerCase().trim() || "";
      const cheie = telCurat || emailCurat || dosar.id;
      
      if (!clientiUnici[cheie]) {
        clientiUnici[cheie] = { ...dosar };
      } else {
        const numeNou = (dosar.client_name || "").trim();
        const numeExistent = (clientiUnici[cheie].client_name || "").trim();
        
        const esteGeneric = (n: string) => 
          n.toLowerCase() === "client" || 
          n.toLowerCase().includes("necunoscut") || 
          n.toLowerCase() === "client nou";

        if (!esteGeneric(numeNou) && (esteGeneric(numeExistent) || numeNou.length > numeExistent.length)) {
          clientiUnici[cheie].client_name = numeNou;
        }
        
        if (dosar.poza && !clientiUnici[cheie].poza) {
          clientiUnici[cheie].poza = dosar.poza;
        }
        if (dosar.description && !clientiUnici[cheie].description.includes(dosar.description)) {
          clientiUnici[cheie].description += `\n${dosar.description}`;
        }
      }
    });

    const listaFinala = Object.values(clientiUnici).sort((a, b) => 
      (a.client_name || "").localeCompare(b.client_name || "")
    );

    setDosare(listaFinala);
  }, []);

  // --- Sincronizare simplificată ---
  const sincronizeazaProgramariInDosare = async (currentUserId: string) => {
    try {
      const { data: programari } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', currentUserId);

      const { data: dosareExistente } = await supabase
        .from('client_cases')
        .select('*')
        .eq('user_id', currentUserId);

      if (!programari) return;

      const mapDosare = new Map();
      dosareExistente?.forEach(d => {
        if (d.phone_number) mapDosare.set(d.phone_number.replace(/\s+/g, ''), d);
        if (d.client_email) mapDosare.set(d.client_email.toLowerCase().trim(), d);
      });

      for (const prog of programari) {
        if (!prog.phone && !prog.email) continue;

        // Luăm orice text găsim în câmpurile de nume și le unim simplu
        const numeDinCalendar = `${prog.prenume || ""} ${prog.nume || ""}`.trim();
        const numeFinal = numeDinCalendar || prog.phone || "Client Nou";

        const dataProgr = prog.date ? new Date(prog.date).toLocaleDateString('ro-RO') : 'Nespecificată';
        const linieIstoric = `• ${dataProgr}: ${prog.nume_serviciu || 'Serviciu'}`;
        
        const telCheie = prog.phone?.replace(/\s+/g, '');
        const emailCheie = prog.email?.toLowerCase().trim();
        const dosarExistent = mapDosare.get(telCheie) || mapDosare.get(emailCheie);

        if (!dosarExistent) {
          await supabase.from('client_cases').insert([{
            user_id: currentUserId,
            client_name: numeFinal,
            client_email: prog.email || "",
            phone_number: prog.phone || "",
            case_type: "Dosar Client",
            status: "Activ",
            description: `ISTORIC:\n${linieIstoric}`,
            poza: prog.poza || null
          }]);
        } else {
          let updateData: any = {};
          let needsUpdate = false;

          const numeActualInDosar = (dosarExistent.client_name || "").trim();
          
          // Dacă numele din calendar este mai lung sau cel actual e generic, actualizăm
          if (numeDinCalendar && (numeDinCalendar !== numeActualInDosar)) {
            const esteGeneric = numeActualInDosar.toLowerCase().includes("client") || numeActualInDosar === dosarExistent.phone_number;
            if (esteGeneric || numeDinCalendar.length > numeActualInDosar.length) {
              updateData.client_name = numeDinCalendar;
              needsUpdate = true;
            }
          }

          if (!dosarExistent.description?.includes(dataProgr)) {
            updateData.description = `${dosarExistent.description || ""}\n${linieIstoric}`;
            needsUpdate = true;
          }

          if (needsUpdate) {
            await supabase.from('client_cases').update(updateData).eq('id', dosarExistent.id);
            if (updateData.client_name) dosarExistent.client_name = updateData.client_name;
            if (updateData.description) dosarExistent.description = updateData.description;
          }
        }
      }
    } catch (e) {
      console.error("Eroare sincronizare:", e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIncarcare(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.push("/login"); return; }
      
      const currentId = session.user.id;
      setUserId(currentId);
      
      await sincronizeazaProgramariInDosare(currentId);
      await preiaSiGrupeazaDosare(currentId);
      
      setIncarcare(false);
    };
    init();
  }, [router, preiaSiGrupeazaDosare]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !dosarSelectat || !userId) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${dosarSelectat.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('appointment-photos').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('appointment-photos').getPublicUrl(fileName);
      await actualizeazaCampDosar('poza', publicUrl);
    } catch (err) {
      alert("Eroare la încărcare imagine.");
    }
  };

  const actualizeazaCampDosar = async (camp: string, valoare: string) => {
    if (!dosarSelectat || !userId) return;
    const { error } = await supabase.from('client_cases').update({ [camp]: valoare }).eq('id', dosarSelectat.id);
    if (!error) {
      setDosarSelectat((prev: any) => ({ ...prev, [camp]: valoare }));
      setDosare(prev => prev.map(d => d.id === dosarSelectat.id ? { ...d, [camp]: valoare } : d));
    }
  };

  const stergeDosarDefinitiv = async (idDosar: string) => {
    if (!userId || !confirm("Ștergi definitiv acest client?")) return;
    await supabase.from('client_cases').delete().eq('id', idDosar);
    setDosare(prev => prev.filter(d => d.id !== idDosar));
    setDosarSelectat(null);
  };

  const rezultateFiltrate = useMemo(() => {
    const termen = cautare.toLowerCase();
    return dosare.filter(d => 
      (d.client_name || "").toLowerCase().includes(termen) || 
      (d.phone_number || "").includes(termen)
    );
  }, [dosare, cautare]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 bg-white p-10 rounded-[50px] shadow-2xl border-2 border-slate-50">
          <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-slate-900">
            CLIENȚI <span className="text-amber-600">UNICI</span>
          </h1>
          <p className="text-slate-400 font-black text-[10px] uppercase mt-4 italic">Sistem Automat • {dosare.length} Profile active</p>
        </div>

        <div className="relative mb-16">
          <input
            type="text"
            placeholder="CAUTĂ CLIENT..."
            className="w-full p-8 pl-20 bg-white border-2 border-slate-100 rounded-[35px] outline-none focus:border-amber-500 font-black shadow-xl text-xl italic uppercase"
            value={cautare}
            onChange={(e) => setCautare(e.target.value)}
          />
          <span className="absolute left-8 top-1/2 -translate-y-1/2 text-3xl">🔍</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {incarcare ? (
            <div className="col-span-full py-32 text-center italic font-black text-slate-300">Sincronizare profile...</div>
          ) : (
            rezultateFiltrate.map((dosar) => (
              <div
                key={dosar.id}
                onClick={() => setDosarSelectat(dosar)}
                className="bg-white p-6 rounded-[40px] border-2 border-slate-50 hover:border-amber-400 shadow-lg hover:shadow-2xl transition-all cursor-pointer flex items-center gap-8 group"
              >
                <div className="w-28 h-28 shrink-0 bg-slate-900 rounded-[30px] overflow-hidden flex items-center justify-center border-4 border-slate-100 group-hover:border-amber-500">
                  {dosar.poza ? <img src={dosar.poza} className="w-full h-full object-cover" /> : <span className="text-4xl font-black text-amber-500 italic">{(dosar.client_name || "C").charAt(0)}</span>}
                </div>
                <div className="flex-grow min-w-0">
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic truncate">{dosar.client_name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-3 py-1 rounded-full">{dosar.phone_number || "Fără Tel"}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase italic">{dosar.status}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {dosarSelectat && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4" onClick={() => setDosarSelectat(null)}>
            <div className="bg-white w-full max-w-4xl rounded-[60px] overflow-hidden shadow-2xl flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
              <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-8 w-full mr-10">
                  <label className="cursor-pointer group relative shrink-0">
                    <div className="w-24 h-24 bg-amber-600 rounded-[30px] flex items-center justify-center text-3xl font-black italic overflow-hidden border-2 border-amber-400 group-hover:opacity-75 transition-all">
                      {dosarSelectat.poza ? <img src={dosarSelectat.poza} className="w-full h-full object-cover" /> : (dosarSelectat.client_name || "C").charAt(0)}
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                  <input 
                    className="bg-transparent text-4xl font-black uppercase italic tracking-tighter border-none outline-none focus:ring-2 focus:ring-amber-500 rounded-xl w-full"
                    value={dosarSelectat.client_name || ""}
                    onChange={(e) => setDosarSelectat({...dosarSelectat, client_name: e.target.value})}
                    onBlur={(e) => actualizeazaCampDosar('client_name', e.target.value)}
                  />
                </div>
                <button onClick={() => setDosarSelectat(null)} className="bg-white/10 hover:bg-red-500 w-14 h-14 rounded-[20px]">✕</button>
              </div>
              
              <div className="p-12 overflow-y-auto bg-slate-50 flex-grow scrollbar-hide">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="bg-white p-8 rounded-[35px] border-2 border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase italic mb-4">Contact client</p>
                    <div className="space-y-4">
                      <input className="w-full bg-slate-50 p-4 rounded-2xl font-black italic outline-none text-[11px]" value={dosarSelectat.phone_number || ""} readOnly />
                      <input className="w-full bg-slate-50 p-4 rounded-2xl font-black italic outline-none text-[11px]" value={dosarSelectat.client_email || ""} readOnly />
                    </div>
                  </div>
                  <div className="bg-white p-8 rounded-[35px] border-2 border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase italic mb-4">Status Dosar</p>
                    <select className="w-full bg-slate-50 p-4 rounded-2xl font-black italic uppercase outline-none text-[11px]" value={dosarSelectat.status} onChange={(e) => actualizeazaCampDosar('status', e.target.value)}>
                      <option value="Activ">🟢 ACTIV</option>
                      <option value="Inchis">🔴 ÎNCHIS</option>
                    </select>
                  </div>
                </div>

                <p className="text-[10px] font-black text-slate-400 uppercase italic mb-4 ml-4">Istoric Servicii</p>
                <textarea 
                  className="w-full bg-white p-10 rounded-[40px] border-2 border-slate-100 mb-10 font-medium italic text-slate-700 min-h-[300px] outline-none" 
                  value={dosarSelectat.description || ""} 
                  onChange={(e) => setDosarSelectat({...dosarSelectat, description: e.target.value})}
                  onBlur={(e) => actualizeazaCampDosar('description', e.target.value)}
                />

                <div className="flex justify-center">
                  <button onClick={() => stergeDosarDefinitiv(dosarSelectat.id)} className="px-10 py-5 bg-red-50 text-red-600 border-2 border-red-100 rounded-[22px] font-black text-[11px] uppercase hover:bg-red-500 hover:text-white transition-all">🗑️ ELIMINĂ CLIENT DIN ISTORIC</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}