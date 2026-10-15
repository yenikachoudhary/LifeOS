"use client";

import { useState } from "react";
import { Empty, ErrorNote, Loading, PageHeader } from "@/components/Feedback";
import { api } from "@/lib/api";
import { addDays, todayStr } from "@/lib/dates";
import { useFetch } from "@/lib/useFetch";

function HistoryStrip({ history, today }) {
  const set = new Set(history);
  const days = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29));
  return (
    <div className="flex gap-1" aria-label="Last 30 days">
      {days.map((d) => (
        <span key={d} title={`${d}${set.has(d) ? " ✓" : ""}`} className={`h-3 flex-1 rounded-full ${set.has(d) ? "bg-deep" : "bg-deep/10"}`} />
      ))}
    </div>
  );
}

export default function HabitsPage() {
  const today = todayStr();
  const { data: habits, error, loading, reload } = useFetch(() => api.get(`/habits?date=${today}`), [today]);
  const [name, setName] = useState("");
  const [actionError, setActionError] = useState("");

  const run = async (fn) => {
    try {
      setActionError("");
      await fn();
      reload();
    } catch (e) {
      setActionError(e.message);
    }
  };

  const add = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    run(async () => {
      await api.post("/habits", { name });
      setName("");
    });
  };

  const done = habits ? habits.filter((h) => h.checked).length : 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Habits" subtitle={habits ? `${done}/${habits.length} checked off today` : "Small things, every day."} />
      <form onSubmit={add} className="card flex flex-wrap gap-2 bg-blush">
        <input className="input flex-1" placeholder="New habit, e.g. Read 20 pages" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} aria-label="Habit name" />
        <button className="btn" disabled={!name.trim()}>Add habit</button>
      </form>
      <ErrorNote message={actionError} />
      <ErrorNote message={error} onRetry={reload} />

      {loading ? (
        <Loading />
      ) : habits.length === 0 ? (
        <Empty>No habits yet. Start with one you can do in two minutes 🌱</Empty>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {habits.map((h) => (
            <li key={h.id} className={`card space-y-3 ${h.checked ? "bg-lime" : ""}`}>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={h.checked}
                  onChange={() => run(() => api.put(`/habits/${h.id}/check/${today}`, { completed: !h.checked }))}
                  className="h-6 w-6 cursor-pointer accent-[#253A82]"
                  aria-label={`Check off ${h.name}`}
                />
                <h2 className="min-w-0 flex-1 truncate text-lg">{h.name}</h2>
                <button
                  className="text-sm font-bold underline"
                  onClick={() => {
                    const next = window.prompt("Rename habit", h.name);
                    if (next && next.trim()) run(() => api.patch(`/habits/${h.id}`, { name: next }));
                  }}
                >
                  Rename
                </button>
                <button
                  aria-label={`Delete ${h.name}`}
                  onClick={() => window.confirm(`Delete "${h.name}" and its history?`) && run(() => api.del(`/habits/${h.id}`))}
                >
                  🗑️
                </button>
              </div>
              <div className="flex gap-2 text-sm font-bold">
                <span className="chip bg-sky">🔥 Current {h.current_streak}</span>
                <span className="chip bg-lav/50">🏆 Best {h.best_streak}</span>
              </div>
              <HistoryStrip history={h.history} today={today} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
