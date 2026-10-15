"use client";

import { useState } from "react";
import { Empty, ErrorNote, Loading, PageHeader } from "@/components/Feedback";
import MiniBars from "@/components/MiniBars";
import { api } from "@/lib/api";
import { formatShort, todayStr } from "@/lib/dates";
import { useFetch } from "@/lib/useFetch";

export default function GitPage() {
  const today = todayStr();
  const summary = useFetch(() => api.get(`/git/summary?date=${today}`), [today]);
  const recent = useFetch(() => api.get("/git/recent?limit=40"), []);
  const [project, setProject] = useState("");
  const [kind, setKind] = useState("push");
  const [note, setNote] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [error, setError] = useState("");

  const reloadAll = () => {
    summary.reload();
    recent.reload();
  };

  async function add(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/git", { date: today, project, kind, note, repo_url: repoUrl || null });
      setNote("");
      reloadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    try {
      await api.del(`/git/${id}`);
      reloadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  const s = summary.data;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Git & Projects"
        subtitle="Log pushes and coding sessions per project. Entries are marked “manual” — verified GitHub activity comes later."
      />
      <ErrorNote message={error || summary.error || recent.error} onRetry={reloadAll} />

      {summary.loading ? (
        <Loading />
      ) : (
        s && (
          <section className="grid gap-4 md:grid-cols-3">
            <div className="card bg-peri">
              <p className="text-sm font-bold">Today</p>
              <p className="font-display text-4xl font-black">{s.today}</p>
              <p className="text-sm font-semibold">{s.today ? "Logged — nice!" : "Nothing logged yet"}</p>
              <p className="mt-2 text-sm font-bold">🔥 Streak: {s.streak} day{s.streak === 1 ? "" : "s"}</p>
            </div>
            <div className="card bg-blush">
              <p className="text-sm font-bold">All time</p>
              <p className="font-display text-4xl font-black">{s.total}</p>
              <p className="text-sm font-semibold">{s.pushes} pushes · {s.sessions} sessions</p>
              {s.projects.length > 0 && (
                <p className="mt-2 text-sm font-semibold">Top: {s.projects.slice(0, 3).map((p) => `${p.project} (${p.count})`).join(", ")}</p>
              )}
            </div>
            <div className="card">
              <p className="mb-2 text-sm font-bold">Last 14 days</p>
              <MiniBars data={s.last_14_days.map((d) => ({ date: d.date, value: d.count }))} color="#253A82" />
            </div>
          </section>
        )
      )}

      <form onSubmit={add} className="card space-y-2 bg-sky">
        <div className="grid gap-2 md:grid-cols-[1fr_160px_1fr]">
          <input className="input" required maxLength={100} placeholder="Project, e.g. LifeOS" value={project} onChange={(e) => setProject(e.target.value)} aria-label="Project" />
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Type">
            <option value="push">Git push</option>
            <option value="session">Coding session</option>
          </select>
          <input className="input" type="url" placeholder="Repository URL (optional)" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} aria-label="Repository URL" />
        </div>
        <div className="flex gap-2">
          <input className="input" maxLength={300} placeholder="What did you build or learn?" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note" />
          <button className="btn" disabled={!project.trim()}>Log it</button>
        </div>
      </form>

      <section className="card space-y-2">
        <h2 className="text-lg">Recent activity</h2>
        {recent.loading ? (
          <Loading />
        ) : recent.data?.length ? (
          <ul className="space-y-2">
            {recent.data.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-3xl bg-[#F5F3FF] px-4 py-2">
                <span className={`chip ${e.kind === "push" ? "bg-lime" : "bg-lav/50"}`}>{e.kind === "push" ? "push" : "session"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">
                    {e.repo_url ? (
                      <a href={e.repo_url} target="_blank" rel="noopener noreferrer" className="underline">{e.project}</a>
                    ) : (
                      e.project
                    )}
                  </p>
                  {e.note && <p className="truncate text-xs font-semibold text-deep/60">{e.note}</p>}
                </div>
                <span className="chip bg-white text-deep/60">{e.source}</span>
                <span className="text-xs font-semibold text-deep/60">{formatShort(e.date)}</span>
                <button onClick={() => remove(e.id)} aria-label={`Delete ${e.project} entry`}>🗑️</button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No activity logged yet. Push something and log it 🐙</Empty>
        )}
      </section>
    </div>
  );
}
