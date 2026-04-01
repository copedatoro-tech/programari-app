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
  const [userPlan, setUserPlan] = useState("CRONOS FREE");
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

        const { data: profileData } = await supabase
          .from('profiles')
          .select('subscription_plan')
          .eq('id', currentId)
          .maybeSingle();

        if (profileData) {
          setUserPlan(profileData.subscription_plan || "CRONOS FREE");
        }

        // Executăm sincronizarea și apoi preluarea
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
      const { data: programari } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', currentUserId);

      if (!programari) return;

      for (const prog of programari) {
        if (!prog.phone && !prog.email) continue;

        const numeComplet = [prog.prenume, prog.nume].filter(Boolean).join(" ") || "Client Necunoscut";
        const dataProgr = prog.date ? new Date(prog.date).toLocaleDateString() : 'nespecificată';
        const linieIstoric = `• ${dataProgr}: ${prog.title || 'Consultare'}`;

        // Căutăm orice dosar care se potrivește cu telefonul sau email-ul
        const { data: existente } = await supabase
          .from('client_cases')
          .select('id, description')
          .eq('user_id', currentUserId)
          .or(`phone_number.eq.${prog.phone},client_email.eq.${prog.email}`);

        if (!existente || existente.length === 0) {
          // Creăm dosar nou dacă nu există deloc
          await supabase.from('client_cases').insert([{
            user_id: currentUserId,
            client_name: numeComplet,
            client_email: prog.email || "",
            phone_number: prog.phone || "",
            case_type: "Dosar Client",
            status: "Activ",
            description: `ISTORIC:\n${linieIstoric}`
          }]);
        } else {
          // Dacă există deja (posibil mai multe), îl actualizăm pe primul găsit
          const primuDosar = existente[0];
          if (!primuDosar.description?.includes(dataProgr)) {
            await supabase.from('client_cases')
              .update({ description: `${primuDosar.description}\n${linieIstoric}` })
              .eq('id', primuDosar.id);
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
      // Curățăm cheia (eliminăm spații) pentru o grupare precisă
      const telCurat = dosar.phone_number?.replace(/\s+/g, '') || "";
      const emailCurat = dosar.client_email?.toLowerCase().trim() || "";
      const cheie = telCurat || emailCurat || dosar.id;
      
      if (!clientiUnici[cheie]) {
        clientiUnici[cheie] = { ...dosar };
      } else {
        // Combinăm descrierile dacă avem duplicate în DB
        const liniiExistente = clientiUnici[cheie].description?.split('\n') || [];
        const liniiNoi = dosar.description?.split('\n') || [];
        
        liniiNoi.forEach((linie: string) => {
          if (linie && !liniiExistente.includes(linie)) {
            clientiUnici[cheie].description += `\n${linie}`;
          }
        });
      }
    });

    setDosare(Object.values(clientiUnici).sort((a, b) => 
      (a.client_name || "").localeCompare(b.client_name || "")
    ));
  };

  const actualizeazaCampDosar = async (camp: string, valoare: string) => {
    if (!dosarSelectat) return;
    
    const { error } = await supabase
      .from('client_cases')
      .update({ [camp]: valoare })
      .eq('id', dosarSelectat.id);

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

  // LOGICA DE CĂUTARE REPARATĂ
  const rezultateFiltrate = dosare.filter(d => {
    const termen = cautare.toLowerCase();
    const nume = (d.client_name || "").toLowerCase();
    const tel = (d.phone_number || "").toLowerCase();
    return nume.includes(termen) || tel.includes(termen);
  });

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[50px] shadow-2xl shadow-slate-200/50 border-2 border-slate-50">
          <div>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
              CLIENȚI <span className="text-amber-600">UNICI</span>
            </h1>
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mt-4 italic">
              SISTEM DE GRUPARE ACTIV • {dosare.length} PROFILE
            </p>
          </div>
          <div className="bg-slate-900 text-white px-8 py-5 rounded-[25px] shadow-2xl border-b-4 border-slate-700">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1 italic">PLAN ACTIV</span>
              <div className="text-[14px] font-black uppercase italic">{userPlan}</div>
          </div>
        </div>

        {/* SEARCH BAR - REPARATĂ */}
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

        {/* GRID CLIENȚI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {incarcare ? (
            <div className="col-span-full py-32 text-center">
                <div className="w-20 h-20 border-8 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <p className="font-black text-slate-300 uppercase italic">Se grupează datele...</p>
            </div>
          ) : rezultateFiltrate.length > 0 ? (
            rezultateFiltrate.map((dosar) => (
              <div
                key={dosar.id}
                onClick={() => setDosarSelectat(dosar)}
                className="bg-white p-10 rounded-[45px] border-2 border-slate-50 hover:border-amber-400 shadow-xl hover:scale-[1.03] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-slate-900 text-amber-500 rounded-[22px] flex items-center justify-center text-3xl font-black italic">
                    {(dosar.client_name || "C").charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase italic leading-none mb-2">{dosar.client_name || "Fără Nume"}</h3>
                    <p className="text-xs font-black text-amber-600 italic uppercase">{dosar.phone_number || "Fără Telefon"}</p>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] font-black px-4 py-2 rounded-full uppercase italic bg-slate-100 text-slate-600">
                      {dosar.status}
                    </span>
                    <span className="text-[10px] font-black text-amber-600 italic uppercase">
                      VEZI FIȘA
                    </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-20">
              <p className="font-black text-slate-300 uppercase italic text-2xl">Nu am găsit niciun rezultat.</p>
              <p className="text-slate-400 text-xs uppercase mt-2 italic tracking-widest">Verifică ortografia sau numărul de telefon</p>
            </div>
          )}
        </div>

        {/* POP-UP DETALII */}
        {dosarSelectat && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4" onClick={() => setDosarSelectat(null)}>
            <div className="bg-white w-full max-w-4xl rounded-[60px] overflow-hidden shadow-2xl relative flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
              
              {/* HEADER POPUP */}
              <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-8 w-full mr-10">
                  <div className="w-20 h-20 bg-amber-600 rounded-[25px] flex items-center justify-center text-3xl font-black italic shrink-0">
                    {(dosarSelectat.client_name || "C").charAt(0)}
                  </div>
                  <input 
                    className="bg-transparent text-4xl font-black uppercase italic tracking-tighter border-none outline-none focus:ring-2 focus:ring-amber-500 rounded-xl w-full px-2"
                    value={dosarSelectat.client_name || ""}
                    onChange={(e) => actualizeazaCampDosar('client_name', e.target.value)}
                  />
                </div>
                <button onClick={() => setDosarSelectat(null)} className="bg-white/10 hover:bg-red-500 w-14 h-14 rounded-[20px] transition-all shrink-0">✕</button>
              </div>
              
              {/* BODY POPUP */}
              <div className="p-12 overflow-y-auto bg-slate-50 flex-grow">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="bg-white p-8 rounded-[35px] border-2 border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase italic mb-4">CONTACT</p>
                    <div className="space-y-4">
                        <input 
                            className="w-full bg-slate-50 p-4 rounded-2xl font-black italic outline-none focus:ring-2 focus:ring-amber-500"
                            value={dosarSelectat.phone_number || ""}
                            onChange={(e) => actualizeazaCampDosar('phone_number', e.target.value)}
                            placeholder="TELEFON"
                        />
                        <input 
                            className="w-full bg-slate-50 p-4 rounded-2xl font-black italic outline-none focus:ring-2 focus:ring-amber-500"
                            value={dosarSelectat.client_email || ""}
                            onChange={(e) => actualizeazaCampDosar('client_email', e.target.value)}
                            placeholder="EMAIL"
                        />
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[35px] border-2 border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase italic mb-4">DETALII</p>
                    <div className="space-y-4">
                        <select 
                            className="w-full bg-slate-50 p-4 rounded-2xl font-black italic uppercase outline-none"
                            value={dosarSelectat.status}
                            onChange={(e) => actualizeazaCampDosar('status', e.target.value)}
                        >
                            <option value="Activ">🟢 ACTIV</option>
                            <option value="Inchis">🔴 ÎNCHIS</option>
                        </select>
                        <input 
                            className="w-full bg-slate-50 p-4 rounded-2xl font-black italic uppercase outline-none"
                            value={dosarSelectat.case_type || ""}
                            onChange={(e) => actualizeazaCampDosar('case_type', e.target.value)}
                            placeholder="TIP..."
                        />
                    </div>
                  </div>
                </div>

                <p className="text-[10px] font-black text-slate-400 uppercase italic mb-4 ml-4">ISTORIC ȘI NOTE</p>
                <textarea 
                    className="w-full bg-white p-10 rounded-[40px] border-2 border-slate-100 mb-10 font-medium italic text-slate-700 leading-relaxed min-h-[200px] outline-none focus:border-amber-400"
                    value={dosarSelectat.description || ""}
                    onChange={(e) => actualizeazaCampDosar('description', e.target.value)}
                />

                <div className="flex justify-center">
                  <button onClick={() => stergeDosarDefinitiv(dosarSelectat.id)} className="px-10 py-5 bg-red-50 text-red-600 border-2 border-red-100 rounded-[22px] font-black text-[11px] uppercase italic">
                    🗑️ ELIMINĂ CLIENTUL
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}