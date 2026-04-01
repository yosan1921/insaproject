"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";

interface TotpSetupResponse {
  secret: string;
  otpauthUrl: string;
}

export default function ProfileMfaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [secret, setSecret] = useState<string>("");
  const [otpauthUrl, setOtpauthUrl] = useState<string>("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function setup() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/auth/mfa/totp-setup", { method: "POST" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (!cancelled) {
            setError(data.error || `Setup failed (${res.status}). Please try again.`);
          }
          return;
        }
        const data = (await res.json()) as TotpSetupResponse;
        if (!cancelled) {
          setSecret(data.secret);
          setOtpauthUrl(data.otpauthUrl);
          setInfo(
            "Scan the URL with Google Authenticator/Authy or enter the secret manually, then confirm with a code."
          );
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("An error occurred while initializing MFA setup.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    setup();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/mfa/totp-verify-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Invalid code");
      } else {
        setInfo("MFA successfully enabled! Redirecting...");
        setCode("");
        setTimeout(() => router.push("/mfa"), 1500);
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while verifying your code.");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-slate-800 rounded-lg shadow-xl p-8 border border-slate-700">
        <h1 className="text-2xl font-bold text-white mb-4">Multi-Factor Authentication</h1>
        <p className="text-slate-300 text-sm mb-4">
          Set up Time-based One-Time Password (TOTP) MFA using an authenticator app like Google
          Authenticator or Authy. Scan the QR code below, then enter the 6-digit code from your
          app to confirm.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-md">
            {error}
          </div>
        )}
        {info && (
          <div className="mb-4 p-3 bg-emerald-900/50 border border-emerald-700 text-emerald-300 rounded-md">
            {info}
          </div>
        )}

        {secret && (
          <div className="mb-6 text-sm text-slate-200 space-y-3">
            {otpauthUrl && (
              <div className="flex flex-col items-center space-y-2">
                <span className="font-semibold">MFA QR Code</span>
                <p className="text-xs text-slate-400 text-center">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code below.
                </p>
                <div className="bg-white p-2 rounded">
                  <QRCode value={otpauthUrl} size={200} />
                </div>
              </div>
            )}
            <div>
              <span className="font-semibold">Can't scan? Enter manually</span>
            </div>
            <div>
              <span className="font-semibold">Secret:</span>{" "}
              <code className="break-all">{secret}</code>
            </div>
            <div>
              <span className="font-semibold">OTPAuth URL:</span>
              <div className="break-all text-slate-300 text-xs">{otpauthUrl}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Enter the 6-digit code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-widest"
              placeholder="000000"
            />
          </div>
          <button
            type="submit"
            disabled={verifying}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verifying ? "Verifying..." : "Confirm"}
          </button>
        </form>
      </div>
    </div>
  );
}
