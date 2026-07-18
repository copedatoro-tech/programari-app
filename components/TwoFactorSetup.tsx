"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function TwoFactorSetup() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);

  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadFactors = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error && data) {
      const verified = data.totp.find((f) => f.status === "verified");
      if (verified) {
        setEnrolled(true);
        setFactorId(verified.id);
      } else {
        setEnrolled(false);
        setFactorId(null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFactors();
  }, []);

  const handleStartEnroll = async () => {
    setError("");
    setSuccess("");
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error) {
      setError(error.message);
      return;
    }
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setPendingFactorId(data.id);
    setEnrolling(true);
  };

  const handleVerify = async () => {
    if (!pendingFactorId || verifyCode.length < 6) return;
    setError("");

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: pendingFactorId,
    });
    if (challengeError) {
      setError(challengeError.message);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: pendingFactorId,
      challengeId: challengeData.id,
      code: verifyCode,
    });

    if (verifyError) {
      setError("Cod incorect. Încearcă din nou.");
      return;
    }

    setSuccess("Autentificarea în 2 pași a fost activată cu succes.");
    setEnrolling(false);
    setQrCode(null);
    setSecret(null);
    setVerifyCode("");
    await loadFactors();
  };

  const handleCancelEnroll = async () => {
    if (pendingFactorId) {
      await supabase.auth.mfa.unenroll({ factorId: pendingFactorId });
    }
    setEnrolling(false);
    setQrCode(null);
    setSecret(null);
    setVerifyCode("");
    setError("");
  };

  const handleDisable = async () => {
    if (!factorId) return;
    if (!confirm("Sigur vrei să dezactivezi autentificarea în 2 pași?")) return;

    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      setError(error.message);
      return;
    }
    setSuccess("Autentificarea în 2 pași a fost dezactivată.");
    await loadFactors();
  };

  if (loading) {
    return <p className="text-slate-400 text-sm font-medium">Se încarcă...</p>;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <h3 className="text-lg font-black italic uppercase text-slate-900 mb-2">
        Autentificare în 2 pași
      </h3>
      <p className="text-slate-500 text-sm font-medium mb-4">
        Protejează-ți contul cu un cod generat de o aplicație precum Google Authenticator sau Authy,
        pe lângă parolă.
      </p>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold mb-4">{error}</div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold mb-4">{success}</div>
      )}

      {!enrolling && enrolled && (
        <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-4">
          <span className="text-emerald-700 font-bold text-sm">✓ Activată</span>
          <button
            onClick={handleDisable}
            className="text-red-600 font-bold text-xs uppercase hover:underline"
          >
            Dezactivează
          </button>
        </div>
      )}

      {!enrolling && !enrolled && (
        <button
          onClick={handleStartEnroll}
          className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black uppercase text-xs hover:bg-amber-500 hover:text-slate-900 transition-all"
        >
          Activează 2FA
        </button>
      )}

      {enrolling && qrCode && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-600">
            Scanează codul QR cu aplicația de autentificare, sau introdu manual codul de mai jos.
          </p>
          <div className="flex justify-center bg-slate-50 rounded-xl p-4">
            <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48" />
          </div>
          {secret && (
            <p className="text-center text-xs font-mono bg-slate-100 rounded-lg p-2 select-all">
              {secret}
            </p>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={6}
              placeholder="Cod din 6 cifre"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
              className="flex-1 p-3 border-2 border-slate-100 rounded-xl font-bold text-center tracking-widest"
            />
            <button
              onClick={handleVerify}
              disabled={verifyCode.length < 6}
              className="bg-amber-500 text-slate-900 px-6 py-3 rounded-xl font-black uppercase text-xs disabled:opacity-40"
            >
              Confirmă
            </button>
          </div>
          <button
            onClick={handleCancelEnroll}
            className="text-slate-400 text-xs font-bold uppercase hover:text-slate-600"
          >
            Anulează
          </button>
        </div>
      )}
    </div>
  );
}