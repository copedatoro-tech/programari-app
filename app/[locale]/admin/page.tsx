"use client";
import { useState, useEffect, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";

const PLAN_PRICES: Record<string, number> = {
  "CHRONOS PRO": 49,
  "CHRONOS ELITE": 99,
  "CHRONOS TEAM": 199,
};

const PLAN_COLORS: Record<string, string> = {
  "CHRONOS FREE": "bg-slate-100 text-slate-600",
  "CHRONOS PRO": "bg-amber-100 text-amber-700",
  "CHRONOS ELITE": "bg-sky-100 text-sky-700",
  "CHRONOS TEAM": "bg-violet-100 text-violet-700",
  "START (GRATUIT)": "bg-slate-100 text-slate-600",
};

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  plan_type: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  subscription_cancel_at_period_end: boolean | null;
  trial_started_at: string | null;
  trial_used: boolean | null;
  terms_accepted_at: string | null;
  stripe_customer_id: string | null;
  updated_at: string | null;
}

function isTrialActive(trial_started_at: string | null): boolean {
  if (!trial_started_at) return false;
  const start = new Date(trial_started_at);
  const end = new Date(start.getTime() + 10 * 24 * 60 * 60 * 1000);
  return new Date() < end;
}

function daysLeft(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (res.ok) {
        setProfiles(data.profiles);
      } else {
        setError(data.error || "Eroare necunoscută.");
      }
    };
    fetchData();
  }, []);

  const stats = useMemo(() => {
    if (!profiles) return null;
    const total = profiles.length;
    const paying = profiles.filter((p) => PLAN_PRICES[(p.plan_type || "").toUpperCase()]);
    const trialing = profiles.filter((p) => isTrialActive(p.trial_started_at));
    const mrr = paying.reduce((sum, p) => sum + (PLAN_PRICES[(p.plan_type || "").toUpperCase()] || 0), 0);
    const pastDue = profiles.filter((p) => p.subscription_status === "past_due");
    return { total, payingCount: paying.length, trialingCount: trialing.length, mrr, pastDueCount: pastDue.length };
  }, [profiles]);

  const filtered = useMemo(() => {
    if (!profiles) return [];
    return profiles.filter((p) => {
      const matchesSearch =
        !search ||
        p.email?.toLowerCase().includes(search.toLowerCase()) ||
        p.full_name?.toLowerCase().includes(search.toLowerCase());
      const matchesPlan = planFilter === "all" || (p.plan_type || "").toUpperCase() === planFilter;
      return matchesSearch && matchesPlan;
    });
  }, [profiles, search, planFilter]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-sm">
          <p className="text-red-600 font-black uppercase italic text-sm">{error}</p>
        </div>
      </main>
    );
  }

  if (!profiles) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-400 font-black uppercase italic text-xs">Se încarcă...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 md:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 mb-8">
          Panou <span className="text-amber-500">Admin</span>
        </h1>

        {/* Statistici rapide */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <p className="text-[10px] font-black uppercase text-slate-400">Total useri</p>
              <p className="text-2xl font-black text-slate-900">{stats.total}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <p className="text-[10px] font-black uppercase text-slate-400">Plătitori</p>
              <p className="text-2xl font-black text-emerald-600">{stats.payingCount}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <p className="text-[10px] font-black uppercase text-slate-400">În trial</p>
              <p className="text-2xl font-black text-amber-600">{stats.trialingCount}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <p className="text-[10px] font-black uppercase text-slate-400">MRR estimat</p>
              <p className="text-2xl font-black text-slate-900">{stats.mrr} RON</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <p className="text-[10px] font-black uppercase text-slate-400">Plăți restante</p>
              <p className={`text-2xl font-black ${stats.pastDueCount > 0 ? "text-red-600" : "text-slate-900"}`}>
                {stats.pastDueCount}
              </p>
            </div>
          </div>
        )}

        {/* Filtre */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Caută după nume sau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 p-3 bg-white border-2 border-slate-100 rounded-xl font-medium text-sm focus:border-amber-500 outline-none"
          />
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="p-3 bg-white border-2 border-slate-100 rounded-xl font-bold text-sm"
          >
            <option value="all">Toate planurile</option>
            <option value="CHRONOS FREE">Free</option>
            <option value="CHRONOS PRO">Pro</option>
            <option value="CHRONOS ELITE">Elite</option>
            <option value="CHRONOS TEAM">Team</option>
          </select>
        </div>

        {/* Tabel */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="p-4 text-[10px] font-black uppercase text-slate-400">Nume / Email</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400">Plan</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400">Status</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400">Trial</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400">Reînnoire</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400">Termeni</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400">Telefon</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const planKey = (p.plan_type || "").toUpperCase();
                const trialActive = isTrialActive(p.trial_started_at);
                const daysUntilRenewal = daysLeft(p.subscription_current_period_end);

                return (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{p.full_name || "—"}</p>
                      <p className="text-slate-400 text-xs">{p.email}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${PLAN_COLORS[planKey] || "bg-slate-100 text-slate-600"}`}>
                        {p.plan_type || "—"}
                      </span>
                    </td>
                    <td className="p-4">
                      {p.subscription_status === "past_due" ? (
                        <span className="text-red-600 font-black text-xs uppercase">⚠ Restanță</span>
                      ) : p.subscription_status === "canceled" ? (
                        <span className="text-slate-400 font-bold text-xs uppercase">Anulat</span>
                      ) : p.subscription_status === "active" ? (
                        <span className="text-emerald-600 font-bold text-xs uppercase">Activ</span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      {trialActive ? (
                        <span className="text-amber-600 font-bold text-xs">
                          {daysLeft(new Date(new Date(p.trial_started_at!).getTime() + 10 * 24 * 60 * 60 * 1000).toISOString())} zile rămase
                        </span>
                      ) : p.trial_used ? (
                        <span className="text-slate-300 text-xs">Folosit</span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-slate-500">
                      {p.subscription_current_period_end ? (
                        <>
                          {new Date(p.subscription_current_period_end).toLocaleDateString("ro-RO")}
                          {p.subscription_cancel_at_period_end && (
                            <span className="block text-red-500 font-bold">se anulează</span>
                          )}
                        </>
                      ) : "—"}
                    </td>
                    <td className="p-4">
                      {p.terms_accepted_at ? (
                        <span className="text-emerald-600 text-xs">✓ {new Date(p.terms_accepted_at).toLocaleDateString("ro-RO")}</span>
                      ) : (
                        <span className="text-red-500 text-xs font-bold">✕ Neacceptat</span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-slate-500">{p.phone || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-slate-400 py-10 text-sm">Niciun rezultat.</p>
          )}
        </div>
      </div>
    </main>
  );
}