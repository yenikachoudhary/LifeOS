"use client";

import { useEffect, useState } from "react";
import { ErrorNote, Loading, PageHeader } from "@/components/Feedback";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [dsaGoal, setDsaGoal] = useState(1);
  const [focusGoal, setFocusGoal] = useState(120);
  const [defaultReminder, setDefaultReminder] = useState("1_day");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Email Integration State
  const [emailStatus, setEmailStatus] = useState(null);
  const [emailBusy, setEmailBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/settings"),
      api.get("/email/status").catch(() => null),
    ])
      .then(([s, em]) => {
        if (s.dsa_daily_goal) setDsaGoal(s.dsa_daily_goal);
        if (s.focus_daily_goal_minutes) setFocusGoal(s.focus_daily_goal_minutes);
        if (em) setEmailStatus(em);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveGoals(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.put("/settings", {
        dsa_daily_goal: Number(dsaGoal),
        focus_daily_goal_minutes: Number(focusGoal),
      });
      setSuccess("Productivity and notification preferences updated successfully! 🌸");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleConnectEmail() {
    setEmailBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.post("/email/connect");
      setSuccess(res.message);
      const st = await api.get("/email/status");
      setEmailStatus(st);
    } catch (err) {
      setError(err.message);
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleDisconnectEmail() {
    setEmailBusy(true);
    setError("");
    try {
      await api.post("/email/disconnect");
      const st = await api.get("/email/status");
      setEmailStatus(st);
      setSuccess("Email integration disconnected.");
    } catch (err) {
      setError(err.message);
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleTestSampleSync() {
    setEmailBusy(true);
    setError("");
    try {
      const res = await api.post("/email/test-sample");
      setSuccess(`Parsed ${res.opportunities_created} new opportunities from sample contest emails! 🚀`);
      const st = await api.get("/email/status");
      setEmailStatus(st);
    } catch (err) {
      setError(err.message);
    } finally {
      setEmailBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Preferences"
        subtitle="Manage your profile, daily goals, Gmail integration, and reminder preferences."
      />

      <ErrorNote message={error} />
      {success && (
        <div className="rounded-2xl bg-lime/80 px-4 py-3 font-semibold text-deep transition-all">
          {success}
        </div>
      )}

      {loading ? (
        <Loading />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Daily Productivity Goals */}
          <section className="card space-y-4 bg-white">
            <h2 className="text-xl">Daily Productivity Goals 🎯</h2>
            <p className="text-sm font-semibold text-deep/70">
              Set realistic targets for focused work and coding practice.
            </p>

            <form onSubmit={handleSaveGoals} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-deep mb-1">
                  Daily LeetCode / DSA Target (Problems)
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  className="input"
                  value={dsaGoal}
                  onChange={(e) => setDsaGoal(e.target.value)}
                  required
                />
                <span className="text-xs text-deep/60 mt-1 block">
                  Recommended: 1–3 problems a day for steady consistency.
                </span>
              </div>

              <div>
                <label className="block text-sm font-bold text-deep mb-1">
                  Daily Focus Goal (Minutes)
                </label>
                <input
                  type="number"
                  min={10}
                  max={720}
                  step={5}
                  className="input"
                  value={focusGoal}
                  onChange={(e) => setFocusGoal(e.target.value)}
                  required
                />
                <span className="text-xs text-deep/60 mt-1 block">
                  e.g., 120 minutes = 4 to 5 standard Pomodoro sessions.
                </span>
              </div>

              <div>
                <label className="block text-sm font-bold text-deep mb-1">
                  Default Contest & Opportunity Reminder
                </label>
                <select
                  className="input"
                  value={defaultReminder}
                  onChange={(e) => setDefaultReminder(e.target.value)}
                >
                  <option value="1_hour">1 Hour before deadline</option>
                  <option value="1_day">1 Day before deadline</option>
                  <option value="3_days">3 Days before deadline</option>
                  <option value="1_week">1 Week before deadline</option>
                </select>
              </div>

              <button type="submit" className="btn" disabled={saving}>
                {saving ? "Saving…" : "Save Preferences"}
              </button>
            </form>
          </section>

          {/* Email & Opportunity Notifications */}
          <section className="card space-y-4 bg-white">
            <h2 className="text-xl">Email & Contest Discovery ✉️</h2>
            <p className="text-sm font-semibold text-deep/70">
              Automatically detect upcoming competitions, hackathons, and contest announcements from Gmail.
            </p>

            <div className="rounded-2xl bg-sky/30 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-deep/70">Status</span>
                <span className={`chip text-xs font-black uppercase ${
                  emailStatus?.connected ? "bg-lime text-deep" : "bg-gray-200 text-deep/60"
                }`}>
                  {emailStatus?.connected ? "Connected" : "Disconnected"}
                </span>
              </div>

              <p className="text-sm font-bold text-deep">
                Provider: <strong>{emailStatus?.provider || "Gmail"}</strong> ({emailStatus?.email || "yenikachoudhary@gmail.com"})
              </p>
              <p className="text-xs text-deep/70">
                Mode: Automatically extracts Unstop competitions, deadlines, and Codeforces/LeetCode announcements.
              </p>
              {emailStatus?.total_notifications !== undefined && (
                <p className="text-xs font-semibold text-deep/80">
                  Total notifications parsed: <strong>{emailStatus.total_notifications}</strong>
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {emailStatus?.connected ? (
                <>
                  <button
                    type="button"
                    onClick={handleTestSampleSync}
                    disabled={emailBusy}
                    className="btn py-1.5 px-4 text-xs"
                  >
                    {emailBusy ? "Processing…" : "↻ Test Parse Sample Emails"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnectEmail}
                    disabled={emailBusy}
                    className="btn-soft py-1.5 px-4 text-xs text-red-500"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectEmail}
                  disabled={emailBusy}
                  className="btn py-2 px-5 text-xs"
                >
                  {emailBusy ? "Connecting…" : "+ Connect Gmail Integration"}
                </button>
              )}
            </div>
          </section>

          {/* Account Profile */}
          <section className="card space-y-4 bg-white md:col-span-2">
            <h2 className="text-xl">Account Profile 👤</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#F5F3FF] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-deep/60">Display Name</p>
                <p className="font-display text-lg font-black">{user?.name || "LifeOS Explorer"}</p>
              </div>

              <div className="rounded-2xl bg-[#F5F3FF] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-deep/60">Email Address</p>
                <p className="font-display text-lg font-black">{user?.email || "—"}</p>
              </div>

              <div className="rounded-2xl bg-lime/30 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-deep/60">Data Storage</p>
                <p className="text-sm font-semibold text-deep">
                  Persistent MongoDB (Atlas / Local)
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={logout}
                className="btn-soft text-sm text-[#c0267a] hover:bg-blush"
              >
                Log Out of LifeOS
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
