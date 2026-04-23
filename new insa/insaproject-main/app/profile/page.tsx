"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

interface ProfileData {
  id: string;
  email: string;
  role: string;
  name?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disabling, setDisabling] = useState(false);
  const [disableError, setDisableError] = useState("");
  const [disableMessage, setDisableMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      try {
        const res = await fetch("/api/users/me");
        if (!res.ok) {
          if (res.status === 401) {
            router.replace("/login");
            return;
          }
          const data = await res.json().catch(() => ({}));
          if (!cancelled) {
            setError(data.error || "Failed to load profile");
          }
          return;
        }
        const data = (await res.json()) as ProfileData;
        if (!cancelled) {
          setProfile(data);
          setName(data.name || "");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("An error occurred while loading your profile.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    async function loadMfaStatus() {
      setMfaLoading(true);
      setMfaError("");
      try {
        const res = await fetch("/api/auth/mfa/status");
        if (!res.ok) {
          // MFA status is optional for the UI; don't fail the page
          return;
        }
        const data = await res.json().catch(() => null as any);
        if (!cancelled && data) {
          setMfaEnabled(!!data.totpEnabled);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setMfaError("Could not load MFA status.");
        }
      } finally {
        if (!cancelled) {
          setMfaLoading(false);
        }
      }
    }
    loadProfile();
    loadMfaStatus();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaveError("");
    setSaveMessage("");
    setSaving(true);

    try {
      const updates: { name?: string; password?: string } = {};
      if (name.trim() && name.trim() !== (profile.name || "")) {
        updates.name = name.trim();
      }

      if (newPassword || confirmPassword) {
        if (newPassword !== confirmPassword) {
          setSaveError("New password and confirmation do not match.");
          return;
        }
        if (!currentPassword) {
          setSaveError("Please enter your current password.");
          return;
        }

        const result = await signIn("credentials", {
          email: profile.email,
          password: currentPassword,
          redirect: false,
        });
        if (result?.error) {
          setSaveError("Current password is incorrect.");
          return;
        }

        updates.password = newPassword;
      }

      if (!updates.name && !updates.password) {
        setSaveError("No changes to save.");
        return;
      }

      const res = await fetch("/api/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error || "Failed to update profile.");
        return;
      }

      const updated = (await res.json()) as ProfileData;
      setProfile(updated);
      setName(updated.name || "");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSaveMessage("Profile updated successfully.");
    } catch (err) {
      console.error(err);
      setSaveError("An error occurred while saving your changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setDisableError("");
    setDisableMessage("");
    setDisabling(true);

    try {
      if (!disablePassword) {
        setDisableError("Please enter your password to disable MFA.");
        return;
      }

      const res = await fetch("/api/auth/mfa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDisableError(data.error || "Failed to disable MFA.");
        return;
      }

      setDisablePassword("");
      setMfaEnabled(false);
      setDisableMessage("Two-factor authentication has been disabled.");
    } catch (err) {
      console.error(err);
      setDisableError("An error occurred while disabling MFA.");
    } finally {
      setDisabling(false);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-slate-800 rounded-lg shadow-xl p-8 border border-slate-700">
        <h1 className="text-2xl font-bold text-white mb-6">My Profile</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-md">
            {error}
          </div>
        )}

        {profile && (
          <>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4 text-slate-200">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Display name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your display name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Email</label>
                  <div className="px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-slate-200">
                    {profile.email}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Role</label>
                  <div className="px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-slate-200">
                    {profile.role}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700">
                <h2 className="text-lg font-semibold text-white mb-3">Change Password (optional)</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Current password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">New password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Confirm new password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {saveError && (
                <div className="mt-3 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-md">
                  {saveError}
                </div>
              )}
              {saveMessage && (
                <div className="mt-3 p-3 bg-emerald-900/40 border border-emerald-700 text-emerald-200 rounded-md">
                  {saveMessage}
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-700">
              <h2 className="text-lg font-semibold text-white mb-2">Two-Factor Authentication</h2>
              <p className="text-sm text-slate-300 mb-4">Add an extra layer of security.</p>

              {mfaLoading ? (
                <p className="text-sm text-slate-400">Loading MFA status...</p>
              ) : (
                <div className="space-y-3">
                  {mfaError && (
                    <div className="p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-md">
                      {mfaError}
                    </div>
                  )}
                  {mfaEnabled ? (
                    <>
                      <div className="text-sm text-emerald-300">
                        MFA is active on your account.
                      </div>
                      <form onSubmit={handleDisableMfa} className="space-y-3 mt-3">
                        <label className="block text-sm text-slate-400 mb-1">
                          Enter your password to disable MFA
                        </label>
                        <input
                          type="password"
                          value={disablePassword}
                          onChange={(e) => setDisablePassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="••••••••"
                        />
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={disabling}
                            className="inline-flex items-center px-4 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {disabling ? "Disabling..." : "Disable MFA"}
                          </button>
                        </div>
                        {disableError && (
                          <div className="mt-2 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-md">
                            {disableError}
                          </div>
                        )}
                        {disableMessage && (
                          <div className="mt-2 p-3 bg-emerald-900/40 border border-emerald-700 text-emerald-200 rounded-md">
                            {disableMessage}
                          </div>
                        )}
                      </form>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">Disabled</span>
                        <Link
                          href="/profile/mfa"
                          className="inline-flex items-center px-4 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-medium"
                        >
                          Enable MFA
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
