"use client";

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-white p-8 font-sans max-w-2xl mx-auto">
      <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-8 border-b-4 border-amber-500 pb-2">
        Politica <span className="text-amber-500">Cookies</span>
      </h1>
      <div className="space-y-6 text-slate-700 leading-relaxed font-medium">
        <p>Platforma noastră utilizează doar cookies tehnice esențiale pentru funcționare:</p>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <p className="font-bold text-slate-900 mb-2 italic uppercase text-xs tracking-wider">Cookies Necesare:</p>
          <p className="text-xs">Acestea sunt folosite pentru securitate și pentru a menține sesiunea activă în timpul procesului de rezervare. Nu utilizăm cookies de tracking publicitar sau profilare (marketing).</p>
        </div>
      </div>
      <button onClick={() => window.history.back()} className="mt-12 py-3 px-8 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] italic tracking-widest">Înapoi</button>
    </main>
  );
}