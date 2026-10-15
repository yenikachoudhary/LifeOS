"use client";

import { useEffect, useState } from "react";
import { Empty, ErrorNote, Loading, PageHeader } from "@/components/Feedback";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";

function Countdown({ targetTime }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function update() {
      const diff = new Date(targetTime).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Live or Ended");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / (1000 * 60)) % 60);

      if (days > 0) setTimeLeft(`${days}d ${hours}h left`);
      else if (hours > 0) setTimeLeft(`${hours}h ${mins}m left`);
      else setTimeLeft(`${mins}m left`);
    }

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [targetTime]);

  return <span className="chip bg-sky/60 font-bold text-deep">{timeLeft}</span>;
}

export default function ContestsPage() {
  const [platform, setPlatform] = useState("all");
  const [status, setStatus] = useState("all");
  const [busyReminder, setBusyReminder] = useState(null);

  const query = `/contests?platform=${platform}&status=${status}`;
  const { data, error, loading, reload } = useFetch(() => api.get(query), [platform, status]);

  async function handleToggleReminder(contest) {
    setBusyReminder(contest.id);
    try {
      await api.post("/contests/remind", {
        target_type: "contest",
        target_id: contest.id,
        title: contest.name,
        event_time: contest.start_time,
        interval: "1_day",
      });
      reload();
    } catch (err) {
      alert(`Could not toggle reminder: ${err.message}`);
    } finally {
      setBusyReminder(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Contest Calendar"
          subtitle="Auto-discovered upcoming contests from Codeforces, LeetCode, and CodeChef in your local timezone."
        />
        <button onClick={() => reload()} className="btn-soft text-sm">
          ↻ Fetch Latest Schedules
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {["all", "Codeforces", "LeetCode", "CodeChef"].map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`chip px-3.5 py-1.5 text-xs font-bold transition ${
                platform === p ? "bg-deep text-white shadow-sm" : "bg-white text-deep hover:bg-sky/50"
              }`}
            >
              {p === "all" ? "🌐 All Platforms" : p}
            </button>
          ))}
        </div>

        <div className="flex gap-2 text-xs font-bold">
          {["all", "upcoming", "live"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-3 py-1 capitalize transition ${
                status === s ? "bg-peri text-deep font-black" : "bg-white text-deep/60 hover:text-deep"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <ErrorNote message={error} onRetry={reload} />

      {loading ? (
        <Loading />
      ) : data?.contests?.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.contests.map((c) => {
            const startDate = new Date(c.start_time);
            const localFormatted = startDate.toLocaleString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={c.id}
                className="card flex flex-col justify-between border-2 border-sky/40 bg-white transition hover:-translate-y-1"
              >
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="chip bg-lav/40 text-xs font-extrabold text-deep">
                      {c.icon} {c.platform}
                    </span>
                    {c.status === "live" ? (
                      <span className="chip bg-blush font-black text-deep animate-pulse">● LIVE NOW</span>
                    ) : (
                      <Countdown targetTime={c.start_time} />
                    )}
                  </div>

                  <h3 className="font-display font-extrabold text-base text-deep line-clamp-2">
                    {c.name}
                  </h3>

                  <div className="mt-3 space-y-1 text-xs font-semibold text-deep/70">
                    <p>
                      📅 <strong>Start:</strong> {localFormatted}
                    </p>
                    <p>
                      ⏱️ <strong>Duration:</strong> {Math.floor(c.duration_minutes / 60)}h{" "}
                      {c.duration_minutes % 60 ? `${c.duration_minutes % 60}m` : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-sky/30 pt-3">
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn py-1.5 px-4 text-xs"
                  >
                    Register ↗
                  </a>
                  <button
                    onClick={() => handleToggleReminder(c)}
                    disabled={busyReminder === c.id}
                    className={`text-xs font-bold transition ${
                      c.has_reminder ? "text-deep underline font-black" : "text-deep/60 hover:text-deep"
                    }`}
                  >
                    {c.has_reminder ? "🔔 Reminded" : "＋ Set Reminder"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty>No scheduled contests found matching your filters. Check back soon! 🏆</Empty>
      )}
    </div>
  );
}
