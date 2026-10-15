"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthShell from "@/components/AuthShell";
import { ErrorNote } from "@/components/Feedback";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading, register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register(name, email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Plant your first seed" subtitle="Create your LifeOS account.">
      <form onSubmit={onSubmit} className="space-y-3">
        <ErrorNote message={error} />
        <label className="block text-sm font-bold">
          Name
          <input className="input mt-1" autoComplete="name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block text-sm font-bold">
          Email
          <input className="input mt-1" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block text-sm font-bold">
          Password <span className="font-semibold text-deep/60">(min. 8 characters)</span>
          <input className="input mt-1" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
      </form>
      <p className="mt-4 text-center text-sm font-semibold">
        Already have an account? <Link href="/login" className="font-extrabold underline">Log in</Link>
      </p>
    </AuthShell>
  );
}
