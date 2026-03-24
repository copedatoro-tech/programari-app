"use client";
import { useState, useEffect } from "react";

export default function ContulMeuPage() {
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setName(localStorage.getItem("user_name") || "Utilizator");
    setPlan(localStorage.getItem("user_plan") || "FREE (GRATUIT)");
  }, []);

  const handleUpdate = () => {
    localStorage.setItem("user_name", name);
    setIsEditing(false);
    alert("Profil actualizat cu succes!");
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const changePassword = () => {
    const newPass = prompt("Introdu noua parolă:");
    if (newPass) alert("Parola a fost actualizată!");
  };

  return (
    <main className="min-h-screen bg-slate-50 p-12">
      <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-12 italic">CONTUL MEU<span className="text-amber-500">.</span></h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 bg-white p-12 rounded-[40px] shadow-2xl border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">Gestionare Date Profil</h3>
            
            <div className="space-y-10">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Nume Utilizator</p>
                {isEditing ? (
                  <input 
                    className="text-2xl font-black text-slate-900 border-b-2 border-amber-500 outline-none w-full bg-slate-50 p-2"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                ) : (
                  <p className="text-2xl font-black text-slate-900">{name}</p>
                )}
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Tip Abonament</p>
                <p className="text-2xl font-black text-amber-600">{plan}</p>
              </div>

              <div className="pt-4">
                {isEditing ? (
                  <button onClick={handleUpdate} className="px-8 py-4 bg-amber-500 text-slate-900 rounded-2xl font-black shadow-lg hover:bg-amber-400 transition-all">SALVEAZĂ MODIFICĂRILE</button>
                ) : (
                  <button onClick={() => setIsEditing(true)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg hover:bg-slate-800 transition-all">EDITEAZĂ PROFILUL</button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-12 rounded-[40px] shadow-2xl text-white flex flex-col justify-between">
            <div>
              <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-10 italic">Centru de Acțiuni</h3>
              <div className="space-y-4">
                <button onClick={changePassword} className="w-full py-5 bg-slate-800 rounded-2xl font-black text-xs hover:bg-slate-700 transition shadow-inner">SCHIMBĂ PAROLA</button>
                <button onClick={() => window.location.href = "/abonamente"} className="w-full py-5 bg-amber-500 text-slate-900 rounded-2xl font-black text-xs hover:bg-amber-400 transition">UPGRADE PLAN</button>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full py-5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-black text-xs hover:bg-red-500 hover:text-white transition mt-10">DECONECTARE</button>
          </div>
        </div>
      </div>
    </main>
  );
}