"use client";

import { useMemo } from "react";
import ActivityGarden from "@/components/ActivityGarden";
import { Flower, Sparkle } from "@/components/Decor";
import { ErrorNote, Loading, PageHeader } from "@/components/Feedback";
import StatCard from "@/components/StatCard";
import { api } from "@/lib/api";
import { addDays, todayStr } from "@/lib/dates";
import { useFetch } from "@/lib/useFetch";

export default function ActivityPage() {
  const today = todayStr();
  const start = useMemo(() => addDays(today, -364), [today]);
  const { data, error, loading, reload } = useFetch(
    () => api.get(`/activity?start=${start}&end=${today}`),
    [start, today]
  );
  const streakRes = useFetch(() => api.get(`/activity/streak?today=${today}`), [today]);

  const stats = useMemo(() => {
    if (!data) return null;
    const totals = { tasks: 0, habits: 0, focus: 0, dsa: 0, git: 0, total: 0 };
    let activeDays = 0;

    for (const d of Object.values(data)) {
      if (d.total > 0) activeDays++;
      totals.tasks += d.tasks || 0;
      totals.habits += d.habits || 0;
      totals.focus += d.focus || 0;
      totals.dsa += d.dsa || 0;
      totals.git += d.git || 0;
      totals.total += d.total || 0;
    }

    return { totals, activeDays };
  }, [data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Garden"
        subtitle="A yearly visual map of your consistency across tasks, habits, focus, LeetCode, and code commits."
      />

      <ErrorNote message={error || streakRes.error} onRetry={() => { reload(); streakRes.reload(); }} />

      {loading ? (
        <Loading />
      ) : (
        stats && (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon="🌸"
                label="Active Days"
                value={`${stats.activeDays} / 365`}
                subtitle="days with activity"
                color="#E3FC87"
              />
              <StatCard
                icon="⚡"
                label="Total Actions"
                value={String(stats.totals.total)}
                subtitle="things completed"
                color="#C0E0FF"
              />
              <StatCard
                icon="🔥"
                label="Current Streak"
                value={`${streakRes.data?.streak ?? 0} days`}
                subtitle="keep the chain going"
                color="#FFB2F7"
              />
              <StatCard
                icon="🏆"
                label="Consistency"
                value={`${Math.round((stats.activeDays / 365) * 100)}%`}
                subtitle="of the past 365 days"
                color="#AB9DFF"
              />
            </section>

            <ActivityGarden />

            <section className="card space-y-4 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl">Annual Activity Breakdown</h2>
                  <p className="text-sm font-semibold text-deep/70">
                    Everything you logged over the past 365 days
                  </p>
                </div>
                <Flower className="h-8 w-8 text-peri" />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <div className="rounded-2xl bg-lime/40 p-4 text-center">
                  <span className="text-2xl">✅</span>
                  <p className="font-display text-2xl font-black">{stats.totals.tasks}</p>
                  <p className="text-xs font-bold text-deep/70">Tasks Done</p>
                </div>
                <div className="rounded-2xl bg-blush/40 p-4 text-center">
                  <span className="text-2xl">🌱</span>
                  <p className="font-display text-2xl font-black">{stats.totals.habits}</p>
                  <p className="text-xs font-bold text-deep/70">Habits Checked</p>
                </div>
                <div className="rounded-2xl bg-sky/40 p-4 text-center">
                  <span className="text-2xl">⏱️</span>
                  <p className="font-display text-2xl font-black">{stats.totals.focus}</p>
                  <p className="text-xs font-bold text-deep/70">Focus Sessions</p>
                </div>
                <div className="rounded-2xl bg-lav/40 p-4 text-center">
                  <span className="text-2xl">🧩</span>
                  <p className="font-display text-2xl font-black">{stats.totals.dsa}</p>
                  <p className="text-xs font-bold text-deep/70">DSA Problems</p>
                </div>
                <div className="rounded-2xl bg-peri/40 p-4 text-center col-span-2 sm:col-span-1">
                  <span className="text-2xl">🐙</span>
                  <p className="font-display text-2xl font-black">{stats.totals.git}</p>
                  <p className="text-xs font-bold text-deep/70">Git Pushes</p>
                </div>
              </div>

              <div className="rounded-2xl bg-[#F5F3FF] p-4 flex items-center gap-3">
                <Sparkle className="h-6 w-6 shrink-0 text-peri" />
                <p className="text-sm font-semibold text-deep/80">
                  <strong className="text-deep">Growth Philosophy:</strong> Every small step adds up. Missed days aren&apos;t failures — they are just breaks before you bloom again.
                </p>
              </div>
            </section>
          </>
        )
      )}
    </div>
  );
}
