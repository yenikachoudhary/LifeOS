"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthShell from "@/components/AuthShell";
import { ErrorNote } from "@/components/Feedback";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();
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
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to keep your streak blooming.">
      <form onSubmit={onSubmit} className="space-y-3">
        <ErrorNote message={error} />
        <label className="block text-sm font-bold">
          Email
          <input className="input mt-1" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block text-sm font-bold">
          Password
          <input className="input mt-1" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn w-full" disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
      </form>
      <p className="mt-4 text-center text-sm font-semibold">
        New here? <Link href="/register" className="font-extrabold underline">Create an account</Link>
      </p>
    </AuthShell>
  );
}
