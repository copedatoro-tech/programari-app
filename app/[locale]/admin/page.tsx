"use client";
import { useState, useEffect, useMemo } from "react";

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

const ALL_PLANS = ["CHRONOS FREE", "CHRONOS PRO", "CHRONOS ELITE", "CHRONOS TEAM"];

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

function exportToCsv(profiles: Profile[]) {
  const headers = ["Nume", "Email", "Telefon", "Plan", "Status", "Trial activ", "Termeni acceptati", "Stripe Customer ID"];
  const rows = profiles.map((p) => [
    p.full_name || "",
    p.email || "",
    p.phone || "",
    p.plan_type || "",
    p.subscription_status || "",
    isTrialActive(p.trial_started_at) ? "Da" : "Nu",
    p.terms_accepted_at ? new Date(p.terms_accepted_at).toLocaleDateString("ro-RO") : "Neacceptat",
    p.stripe_customer_id || "",
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chronos-useri-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    if (res.ok) {
      setProfiles(data.profiles);
    } else {
      setError(data.error || "Eroare necunoscută.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const runAction = async (userId: string, action: string, plan?: string) => {
    setActionLoading(userId + action);
    try {
      const res = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Eroare la acțiune.");
      } else {
        if (action === "reset_2fa") alert(`2FA resetat (${data.removed || 0} factori eliminați).`);
        if (action === "delete_user") alert("Cont șters complet.");
        await fetchData();
      }
    } catch (e: any) {
      alert(e.message || "Eroare la acțiune.");
    } finally {
      setActionLoading(null);
    }
  };

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
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">
            Panou <span className="text-amber-500">Admin</span>
          </h1>
          <button
            onClick={() => exportToCsv(profiles)}
            className="px-5 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] hover:bg-amber-500 hover:text-slate-900 transition-all"
          >
            📥 Export CSV
          </button>
        </div>

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
                <th className="p-4 text-[10px] font-black uppercase text-slate-400">Stripe</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const planKey = (p.plan_type || "").toUpperCase();
                const trialActive = isTrialActive(p.trial_started_at);
                const isBusy = (action: string) => actionLoading === p.id + action;

                return (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors align-top">
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

                    {/* ✅ Link direct către clientul Stripe, dacă există */}
                    <td className="p-4 text-xs">
                      {p.stripe_customer_id ? (
                        <a
                          href={`https://dashboard.stripe.com/customers/${p.stripe_customer_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-600 font-bold hover:underline"
                        >
                          Vezi în Stripe ↗
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* ✅ Acțiuni rapide, fără să mai umbli prin Supabase */}
                    <td className="p-4 space-y-2 min-w-[190px]">
                      {trialActive ? (
                        <button
                          onClick={() => {
                            if (confirm(`Oprești trial-ul pentru ${p.email}?`)) runAction(p.id, "end_trial");
                          }}
                          disabled={isBusy("end_trial")}
                          className="w-full px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase hover:bg-red-100 disabled:opacity-40"
                        >
                          {isBusy("end_trial") ? "..." : "Oprește trial"}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (confirm(`Resetezi trial-ul (10 zile noi) pentru ${p.email}?`)) runAction(p.id, "reset_trial");
                          }}
                          disabled={isBusy("reset_trial")}
                          className="w-full px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black uppercase hover:bg-amber-100 disabled:opacity-40"
                        >
                          {isBusy("reset_trial") ? "..." : "Reset trial"}
                        </button>
                      )}

                      <select
                        value={p.plan_type || "CHRONOS FREE"}
                        onChange={(e) => {
                          const newPlan = e.target.value;
                          if (confirm(`Schimbi manual planul lui ${p.email} in ${newPlan}?\n\nAtentie: NU porneste nicio taxare Stripe, doar acces.`)) {
                            runAction(p.id, "set_plan", newPlan);
                          }
                        }}
                        disabled={isBusy("set_plan")}
                        className="w-full p-1.5 border border-slate-200 rounded-lg text-[10px] font-bold"
                      >
                        {ALL_PLANS.map((pl) => (
                          <option key={pl} value={pl}>{pl}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => {
                          if (confirm(`Resetezi 2FA pentru ${p.email}? Userul va putea reactiva 2FA de la zero.`)) runAction(p.id, "reset_2fa");
                        }}
                        disabled={isBusy("reset_2fa")}
                        className="w-full px-3 py-1.5 bg-sky-50 text-sky-700 rounded-lg text-[10px] font-black uppercase hover:bg-sky-100 disabled:opacity-40"
                      >
                        {isBusy("reset_2fa") ? "..." : "Reset 2FA"}
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`ȘTERGI COMPLET contul ${p.email}?\n\nAceastă acțiune este ireversibilă.`)) {
                            if (confirm("Ești absolut sigur? Nu se poate anula.")) runAction(p.id, "delete_user");
                          }
                        }}
                        disabled={isBusy("delete_user")}
                        className="w-full px-3 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-red-700 disabled:opacity-40"
                      >
                        {isBusy("delete_user") ? "..." : "🗑️ Șterge cont"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-slate-400 py-10 text-sm">Niciun rezultat.</p>
          )}
        </div>

        <p className="text-[10px] text-slate-400 font-medium mt-4">
          ⚠️ Schimbarea manuală a planului acordă acces fără taxare Stripe. Ștergerea contului este ireversibilă. Folosește cu atenție.
        </p>
      </div>
    </main>
  );
}