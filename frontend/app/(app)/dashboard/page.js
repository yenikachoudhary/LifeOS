"use client";

import Link from "next/link";
import ActivityGarden from "@/components/ActivityGarden";
import { Flower } from "@/components/Decor";
import { ErrorNote, Loading } from "@/components/Feedback";
import ProgressRing from "@/components/ProgressRing";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatLong, todayStr } from "@/lib/dates";
import { useFetch } from "@/lib/useFetch";

function message(pct, total) {
  if (total === 0) return "Add a task to get today started ✨";
  if (pct === 100) return "Everything done — bloom time! 🌸";
  if (pct >= 50) return "Past halfway. Keep going!";
  if (pct > 0) return "Nice start. One more, then another.";
  return "A small first step beats a perfect plan.";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const today = todayStr();
  const { data, error, loading, reload } = useFetch(() => api.get(`/dashboard?date=${today}`), [today]);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorNote message={error || "Could not load dashboard"} onRetry={reload} />;

  const { tasks, focus, dsa, habits } = data;
  const pct = tasks.total ? (tasks.done / tasks.total) * 100 : 0;

  return (
    <div className="space-y-6">
      <section className="card relative overflow-hidden bg-peri">
        <Flower className="absolute -right-6 -top-6 h-32 w-32 animate-float" />
        <p className="font-bold text-deep/70">{formatLong(today)}</p>
        <h1 className="text-3xl md:text-4xl">Hi {user.name.split(" ")[0]}! 👋</h1>
        <p className="mt-1 max-w-md font-semibold">{message(pct, tasks.total)}</p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="✅" label="Tasks" value={`${tasks.done}/${tasks.total}`} subtitle="done today" color="#E3FC87" />
        <StatCard icon="⏱️" label="Focus" value={`${focus.minutes} min`} subtitle={`goal ${focus.goal} min`} color="#C0E0FF" />
        <StatCard icon="🧩" label="LeetCode" value={`${dsa.solved}/${dsa.goal}`} subtitle="problems today" color="#AB9DFF" />
        <StatCard
          icon="🌱"
          label="Habits"
          value={`${habits.done}/${habits.total}`}
          subtitle={habits.best_current_streak ? `best streak ${habits.best_current_streak} days` : "check one off today"}
          color="#FFB2F7"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card flex flex-col items-center justify-center gap-2">
          <h2 className="text-lg">Today&apos;s progress</h2>
          <ProgressRing percent={pct} label="of tasks" />
        </div>
        <div className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg">Today&apos;s priorities</h2>
            <Link href="/tasks" className="text-sm font-bold underline">All tasks</Link>
          </div>
          {tasks.priorities.length === 0 ? (
            <p className="rounded-2xl bg-lime/50 px-4 py-6 text-center font-semibold">
              {tasks.total ? "All caught up! 🎉" : "No tasks yet — add your first one."}
            </p>
          ) : (
            <ul className="space-y-2">
              {tasks.priorities.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-full bg-sky/50 px-4 py-2 font-semibold">
                  <span className="truncate">{t.title}</span>
                  <span className="chip ml-2 bg-white">{t.priority}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm font-semibold text-deep/70">
            {data.git_today} git entr{data.git_today === 1 ? "y" : "ies"} today · {data.active_days_year} active days this year
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Link href="/developer" className="card flex items-center justify-between bg-white border border-sky/40 transition hover:-translate-y-1">
          <div>
            <p className="text-xs font-bold uppercase text-deep/60">Developer Profile</p>
            <h3 className="text-base font-extrabold text-deep">Developer Hub</h3>
            <p className="text-xs font-semibold text-deep/70">GitHub, LeetCode, Codeforces</p>
          </div>
          <span className="text-3xl">💻</span>
        </Link>
        <Link href="/contests" className="card flex items-center justify-between bg-white border border-sky/40 transition hover:-translate-y-1">
          <div>
            <p className="text-xs font-bold uppercase text-deep/60">Upcoming Contests</p>
            <h3 className="text-base font-extrabold text-deep">Contest Calendar</h3>
            <p className="text-xs font-semibold text-deep/70">Countdowns & registration</p>
          </div>
          <span className="text-3xl">🏆</span>
        </Link>
        <Link href="/opportunities" className="card flex items-center justify-between bg-white border border-sky/40 transition hover:-translate-y-1">
          <div>
            <p className="text-xs font-bold uppercase text-deep/60">Competitions</p>
            <h3 className="text-base font-extrabold text-deep">Opportunities Hub</h3>
            <p className="text-xs font-semibold text-deep/70">Hackathons & challenges</p>
          </div>
          <span className="text-3xl">🚀</span>
        </Link>
      </section>

      <ActivityGarden />
    </div>
  );
}
