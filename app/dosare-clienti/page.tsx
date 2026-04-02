"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function IstoricPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [dosare, setDosare] = useState<any[]>([]);
  const [incarcare, setIncarcare] = useState(true);
  const [cautare, setCautare] = useState("");
  const [dosarSelectat, setDosarSelectat] = useState<any | null>(null);

  useEffect(() => {
    const initializeazaPagina = async () => {
      setIncarcare(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.push("/login");
          return;
        }
        const currentId = session.user.id;
        setUserId(currentId);

        await sincronizeazaProgramariInDosare(currentId);
        await preiaSiGrupeazaDosare(currentId);
      } catch (err) {
        console.error("Eroare inițializare:", err);
      } finally {
        setIncarcare(false);
      }
    };

    initializeazaPagina();
  }, [router]);

  const sincronizeazaProgramariInDosare = async (currentUserId: string) => {
    try {
      // Luăm programările sortate ASCENDENT după dată (cele mai noi la final)
      const { data: programari } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', currentUserId)
        .order('date', { ascending: true });

      if (!programari) return;

      for (const prog of programari) {
        if (!prog.phone && !prog.email) continue;

        const p_prenume = (prog.prenume || prog.first_name || "").trim();
        const p_nume = (prog.nume || prog.last_name || "").trim();
        const p_full = (prog.client_name || prog.full_name || prog.nume_complet || "").trim();

        let numeDinProgramare = "";
        if (p_nume && p_prenume) {
          numeDinProgramare = `${p_nume} ${p_prenume}`;
        } else {
          numeDinProgramare = p_full || p_nume || p_prenume || "Client Necunoscut";
        }
        
        const dataProgr = prog.date ? new Date(prog.date).toLocaleDateString('ro-RO') : 'Nespecificată';
        const linieIstoric = `• ${dataProgr}: ${prog.title || 'Consultare'}`;

        const conditii = [];
        if (prog.phone) conditii.push(`phone_number.eq.${prog.phone}`);
        if (prog.email) conditii.push(`client_email.eq.${prog.email}`);
        
        const { data: existente } = await supabase
          .from('client_cases')
          .select('*')
          .eq('user_id', currentUserId)
          .or(conditii.join(','));

        if (!existente || existente.length === 0) {
          // Creare dosar nou dacă nu există
          await supabase.from('client_cases').insert([{
            user_id: currentUserId,
            client_name: numeDinProgramare,
            client_email: prog.email || "",
            phone_number: prog.phone || "",
            case_type: "Dosar Client",
            status: "Activ",
            description: `ISTORIC COLECTAT AUTOMAT:\n${linieIstoric}`,
            avatar_url: prog.avatar_url || null
          }]);
        } else {
          const dosarExistent = existente[0];
          let updateData: any = {};

          // LOGICĂ FORȚATĂ DE ACTUALIZARE: 
          // Dacă numele din Calendar este valid și diferit de cel din Istoric, 
          // îl actualizăm pe cel din Istoric (pentru a prelua modificările gen Danny -> Dan)
          if (numeDinProgramare !== "Client Necunoscut" && numeDinProgramare !== dosarExistent.client_name) {
            updateData.client_name = numeDinProgramare;
          }

          const descriereCurenta = dosarExistent.description || "";
          if (!descriereCurenta.includes(dataProgr)) {
            updateData.description = `${descriereCurenta}\n${linieIstoric}`;
          }

          if (Object.keys(updateData).length > 0) {
            await supabase.from('client_cases')
              .update(updateData)
              .eq('id', dosarExistent.id);
          }
        }
      }
    } catch (e) {
      console.error("Eroare la sincronizare:", e);
    }
  };

  const preiaSiGrupeazaDosare = async (currentUserId: string) => {
    const { data } = await supabase
      .from('client_cases')
      .select('*')
      .eq('user_id', currentUserId);

    if (!data) return;

    const clientiUnici: Record<string, any> = {};

    data.forEach(dosar => {
      const telCurat = dosar.phone_number?.replace(/\s+/g, '') || "";
      const emailCurat = dosar.client_email?.toLowerCase().trim() || "";
      const cheie = telCurat || emailCurat || dosar.id;
      
      if (!clientiUnici[cheie]) {
        clientiUnici[cheie] = { ...dosar };
      } else {
        // Păstrăm numele cel mai recent/valid în caz de duplicate în DB
        if (dosar.client_name && dosar.client_name !== "Client Necunoscut") {
          clientiUnici[cheie].client_name = dosar.client_name;
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

    if (dosarSelectat) {
      const gasit = listaFinala.find(d => d.id === dosarSelectat.id);
      if (gasit) setDosarSelectat(gasit);
    }
  };

  const actualizeazaCampDosar = async (camp: string, valoare: string) => {
    if (!dosarSelectat) return;
    const { error } = await supabase.from('client_cases').update({ [camp]: valoare }).eq('id', dosarSelectat.id);
    if (!error) {
      setDosarSelectat({ ...dosarSelectat, [camp]: valoare });
      preiaSiGrupeazaDosare(userId!);
    }
  };

  const stergeDosarDefinitiv = async (idDosar: string) => {
    if (!userId || !confirm("Ștergi definitiv acest client și tot istoricul lui?")) return;
    const { error } = await supabase.from('client_cases').delete().eq('id', idDosar);
    if (!error) {
      preiaSiGrupeazaDosare(userId);
      setDosarSelectat(null);
    }
  };

  const rezultateFiltrate = dosare.filter(d => {
    const termen = cautare.toLowerCase();
    return (d.client_name || "").toLowerCase().includes(termen) || (d.phone_number || "").includes(termen);
  });

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-12 bg-white p-10 rounded-[50px] shadow-2xl shadow-slate-200/50 border-2 border-slate-50">
          <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
            CLIENȚI <span className="text-amber-600">UNICI</span>
          </h1>
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mt-4 italic">
            SISTEM DE GESTIUNE ACTIV • {dosare.length} PROFILE
          </p>
        </div>

        <div className="relative mb-16 group">
          <input
            type="text"
            placeholder="CAUTĂ DUPĂ NUME SAU TELEFON..."
            className="w-full p-8 pl-20 bg-white border-2 border-slate-100 rounded-[35px] outline-none focus:border-amber-500 font-black shadow-2xl shadow-slate-200/40 transition-all text-xl italic uppercase tracking-tight"
            value={cautare}
            onChange={(e) => setCautare(e.target.value)}
          />
          <span className="absolute left-8 top-1/2 -translate-y-1/2 text-3xl">🔍</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {incarcare ? (
            <div className="col-span-full py-32 text-center italic font-black text-slate-300">Sincronizare...</div>
          ) : rezultateFiltrate.length > 0 ? (
            rezultateFiltrate.map((dosar) => (
              <div
                key={dosar.id}
                onClick={() => setDosarSelectat(dosar)}
                className="bg-white p-6 rounded-[40px] border-2 border-slate-50 hover:border-amber-400 shadow-lg hover:shadow-2xl transition-all cursor-pointer flex items-center gap-8 group"
              >
                <div className="w-28 h-28 shrink-0 bg-slate-900 rounded-[30px] overflow-hidden flex items-center justify-center border-4 border-slate-100 group-hover:border-amber-500 transition-colors">
                  {dosar.avatar_url ? (
                    <img src={dosar.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-black text-amber-500 italic">{(dosar.client_name || "C").charAt(0)}</span>
                  )}
                </div>

                <div className="flex-grow min-w-0">
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic leading-tight truncate mb-1">
                    {dosar.client_name || "Fără Nume"}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-3 py-1 rounded-full uppercase italic">
                      {dosar.phone_number || "Fără Tel"}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase italic truncate">
                      {dosar.status}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-amber-600 uppercase italic group-hover:translate-x-2 transition-transform">
                    Deschide fișa completă →
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-20 text-slate-300 font-black uppercase italic">Niciun rezultat găsit.</div>
          )}
        </div>

        {dosarSelectat && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4" onClick={() => setDosarSelectat(null)}>
            <div className="bg-white w-full max-w-4xl rounded-[60px] overflow-hidden shadow-2xl relative flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
              <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-8 w-full mr-10">
                  <div className="w-20 h-20 bg-amber-600 rounded-[25px] flex items-center justify-center text-3xl font-black italic shrink-0 overflow-hidden">
                    {dosarSelectat.avatar_url ? <img src={dosarSelectat.avatar_url} className="w-full h-full object-cover" /> : (dosarSelectat.client_name || "C").charAt(0)}
                  </div>
                  <input 
                    className="bg-transparent text-4xl font-black uppercase italic tracking-tighter border-none outline-none focus:ring-2 focus:ring-amber-500 rounded-xl w-full px-2"
                    value={dosarSelectat.client_name || ""}
                    title="Modifică Numele"
                    onChange={(e) => actualizeazaCampDosar('client_name', e.target.value)}
                  />
                </div>
                <button onClick={() => setDosarSelectat(null)} className="bg-white/10 hover:bg-red-500 w-14 h-14 rounded-[20px] transition-all shrink-0">✕</button>
              </div>
              
              <div className="p-12 overflow-y-auto bg-slate-50 flex-grow">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="bg-white p-8 rounded-[35px] border-2 border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase italic mb-4">CONTACT</p>
                    <div className="space-y-4">
                        <input className="w-full bg-slate-50 p-4 rounded-2xl font-black italic outline-none focus:ring-2 focus:ring-amber-500 text-[11px]" value={dosarSelectat.phone_number || ""} onChange={(e) => actualizeazaCampDosar('phone_number', e.target.value)} placeholder="TELEFON" />
                        <input className="w-full bg-slate-50 p-4 rounded-2xl font-black italic outline-none focus:ring-2 focus:ring-amber-500 text-[11px]" value={dosarSelectat.client_email || ""} onChange={(e) => actualizeazaCampDosar('client_email', e.target.value)} placeholder="EMAIL" />
                    </div>
                  </div>
                  <div className="bg-white p-8 rounded-[35px] border-2 border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase italic mb-4">DETALII CLASIFICARE</p>
                    <div className="space-y-4">
                        <select className="w-full bg-slate-50 p-4 rounded-2xl font-black italic uppercase outline-none text-[11px]" value={dosarSelectat.status} onChange={(e) => actualizeazaCampDosar('status', e.target.value)}>
                            <option value="Activ">🟢 ACTIV</option>
                            <option value="Inchis">🔴 ÎNCHIS</option>
                        </select>
                        <input className="w-full bg-slate-50 p-4 rounded-2xl font-black italic uppercase outline-none text-[11px]" value={dosarSelectat.case_type || ""} onChange={(e) => actualizeazaCampDosar('case_type', e.target.value)} placeholder="TIP DOSAR" />
                    </div>
                  </div>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase italic mb-4 ml-4">ISTORIC ȘI NOTE EVOLUȚIE</p>
                <textarea className="w-full bg-white p-10 rounded-[40px] border-2 border-slate-100 mb-10 font-medium italic text-slate-700 leading-relaxed min-h-[300px] outline-none focus:border-amber-400" value={dosarSelectat.description || ""} onChange={(e) => actualizeazaCampDosar('description', e.target.value)} />
                <div className="flex justify-center">
                  <button onClick={() => stergeDosarDefinitiv(dosarSelectat.id)} className="px-10 py-5 bg-red-50 text-red-600 border-2 border-red-100 rounded-[22px] font-black text-[11px] uppercase italic">🗑️ ELIMINĂ CLIENTUL DEFINITIV</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}