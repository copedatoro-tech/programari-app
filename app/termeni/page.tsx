"use client";

export default function TermeniPage() {
  return (
    <main className="min-h-screen bg-white p-8 font-sans max-w-2xl mx-auto">
      <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-8 border-b-4 border-amber-500 pb-2">
        Termeni și <span className="text-amber-500">Condiții</span>
      </h1>
      <div className="space-y-6 text-slate-700 leading-relaxed font-medium">
        <section>
          <h2 className="font-black uppercase text-sm text-slate-900 mb-2 italic">1. Natura Serviciului</h2>
          <p>Chronos este o platformă de programări online. Rezervarea efectuată reprezintă o intenție de servicii și nu constituie un contract ferm până la confirmarea noastră oficială.</p>
        </section>
        <section>
          <h2 className="font-black uppercase text-sm text-slate-900 mb-2 italic">2. Programul de Operare</h2>
          <p>Sistemul acceptă rezervări 24/7. Totuși, programările efectuate în afara intervalului 08:00 - 20:00 vor fi vizualizate și procesate începând cu ora 08:00 a următoarei zile lucrătoare.</p>
        </section>
        <section>
          <h2 className="font-black uppercase text-sm text-slate-900 mb-2 italic">3. Anulări și Modificări</h2>
          <p>Ne rezervăm dreptul de a anula rezervările care conțin date de contact eronate sau motive de programare neclare/inadecvate.</p>
        </section>
      </div>
      <button onClick={() => window.history.back()} className="mt-12 py-3 px-8 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] italic tracking-widest">Înapoi la Rezervare</button>
    </main>
  );
}