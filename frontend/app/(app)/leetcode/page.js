"use client";

import { useState } from "react";
import { Empty, ErrorNote, Loading, PageHeader } from "@/components/Feedback";
import MiniBars from "@/components/MiniBars";
import { api } from "@/lib/api";
import { formatShort, todayStr } from "@/lib/dates";
import { useFetch } from "@/lib/useFetch";

const DIFF_COLOR = { Easy: "bg-lime", Medium: "bg-sky", Hard: "bg-blush" };

export default function LeetCodePage() {
  const today = todayStr();
  const summary = useFetch(() => api.get(`/dsa/summary?date=${today}`), [today]);
  const recent = useFetch(() => api.get("/dsa/recent?limit=30"), []);
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [url, setUrl] = useState("");
  const [goal, setGoal] = useState("");
  const [error, setError] = useState("");

  const reloadAll = () => {
    summary.reload();
    recent.reload();
  };

  async function add(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/dsa", { date: today, title, difficulty, url: url || null });
      setTitle("");
      setUrl("");
      reloadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveGoal(e) {
    e.preventDefault();
    setError("");
    try {
      const current = await api.get("/settings");
      await api.put("/settings", { ...current, dsa_daily_goal: Number(goal) });
      setGoal("");
      summary.reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    try {
      await api.del(`/dsa/${id}`);
      reloadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  const s = summary.data;

  return (
    <div className="space-y-5">
      <PageHeader title="LeetCode / DSA" subtitle="Log what you solve. Entries are manual — there is no LeetCode sync yet." />
      <ErrorNote message={error || summary.error || recent.error} onRetry={reloadAll} />

      {summary.loading ? (
        <Loading />
      ) : (
        s && (
          <section className="grid gap-4 md:grid-cols-3">
            <div className="card bg-lav">
              <p className="text-sm font-bold">Today</p>
              <p className="font-display text-4xl font-black">{s.today}/{s.goal}</p>
              <p className="text-sm font-semibold">{s.today >= s.goal ? "Daily goal reached 🎉" : `${s.goal - s.today} to go`}</p>
              <form onSubmit={saveGoal} className="mt-3 flex gap-2">
                <input className="input py-1.5 text-sm" type="number" min={1} max={50} placeholder="New daily goal" value={goal} onChange={(e) => setGoal(e.target.value)} aria-label="Daily goal" />
                <button className="btn py-1.5 text-sm" disabled={!goal}>Set</button>
              </form>
            </div>
            <div className="card bg-lime">
              <p className="text-sm font-bold">Total solved</p>
              <p className="font-display text-4xl font-black">{s.total}</p>
              <p className="text-sm font-semibold">
                Easy {s.by_difficulty.Easy} · Medium {s.by_difficulty.Medium} · Hard {s.by_difficulty.Hard}
              </p>
              <p className="mt-2 text-sm font-bold">🔥 Streak: {s.streak} day{s.streak === 1 ? "" : "s"}</p>
            </div>
            <div className="card">
              <p className="mb-2 text-sm font-bold">Last 14 days</p>
              <MiniBars data={s.last_14_days.map((d) => ({ date: d.date, value: d.count }))} color="#AB9DFF" />
            </div>
          </section>
        )
      )}

      <form onSubmit={add} className="card grid gap-2 bg-sky md:grid-cols-[1fr_140px_1fr_auto]">
        <input className="input" required maxLength={200} placeholder="Problem title, e.g. Two Sum" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Problem title" />
        <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label="Difficulty">
          <option>Easy</option>
          <option>Medium</option>
          <option>Hard</option>
        </select>
        <input className="input" type="url" placeholder="Problem URL (optional)" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Problem URL" />
        <button className="btn" disabled={!title.trim()}>Log it</button>
      </form>

      <section className="card space-y-2">
        <h2 className="text-lg">Recent problems</h2>
        {recent.loading ? (
          <Loading />
        ) : recent.data?.length ? (
          <ul className="space-y-2">
            {recent.data.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-full bg-[#F5F3FF] px-4 py-2">
                <span className={`chip ${DIFF_COLOR[e.difficulty]}`}>{e.difficulty}</span>
                <span className="min-w-0 flex-1 truncate font-bold">
                  {e.url ? (
                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="underline">{e.title}</a>
                  ) : (
                    e.title
                  )}
                </span>
                <span className="text-xs font-semibold text-deep/60">{formatShort(e.date)}</span>
                <button onClick={() => remove(e.id)} aria-label={`Delete ${e.title}`}>🗑️</button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No problems logged yet. Solve one and log it 🧩</Empty>
        )}
      </section>
    </div>
  );
}
