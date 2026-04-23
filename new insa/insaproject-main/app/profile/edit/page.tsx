"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ProfileData {
  id: string;
  email: string;
  role: string;
  name?: string;
}

export default function EditProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const body: { name?: string; password?: string } = {};
      if (name.trim()) body.name = name.trim();
      if (password) body.password = password;

      const res = await fetch("/api/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to update profile");
      } else {
        setSuccess("Profile updated successfully.");
        setPassword("");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while updating your profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-slate-800 rounded-lg shadow-xl p-8 border border-slate-700">
        <h1 className="text-2xl font-bold text-white mb-4">Edit Profile</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-md">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-900/50 border border-emerald-700 text-emerald-300 rounded-md">
            {success}
          </div>
        )}

        {profile && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                New password (optional)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
