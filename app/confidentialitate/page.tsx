"use client";

export default function ConfidentialitatePage() {
  return (
    <main className="min-h-screen bg-white p-8 font-sans max-w-2xl mx-auto">
      <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-8 border-b-4 border-amber-500 pb-2">
        Politica <span className="text-amber-500">GDPR</span>
      </h1>
      <div className="space-y-6 text-slate-700 leading-relaxed font-medium text-sm">
        <p>Conform Regulamentului European 2016/679 (GDPR), te informăm despre modul în care gestionăm datele tale:</p>
        <ul className="list-disc pl-5 space-y-3">
          <li><strong>Date colectate:</strong> Nume, Număr de telefon, Adresă de Email și detaliile programării.</li>
          <li><strong>Scop:</strong> Utilizăm aceste date exclusiv pentru a te contacta în vederea confirmării sau modificării programării tale.</li>
          <li><strong>Stocare:</strong> Datele sunt stocate securizat în baza de date Supabase și nu sunt partajate cu terțe părți în scopuri publicitare.</li>
          <li><strong>Drepturile tale:</strong> Poți solicita oricând ștergerea datelor tale din sistemul nostru contactându-ne direct.</li>
        </ul>
      </div>
      <button onClick={() => window.history.back()} className="mt-12 py-3 px-8 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] italic tracking-widest">Am înțeles</button>
    </main>
  );
}