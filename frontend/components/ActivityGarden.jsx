"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { addDays, formatLong, parseDate, todayStr } from "@/lib/dates";
import { useFetch } from "@/lib/useFetch";
import { ErrorNote } from "./Feedback";

const LEVEL_COLORS = ["#FFFFFF", "#E3FC87", "#8BA2FF", "#FFB2F7", "#253A82"];
const LEVEL_LABELS = ["No activity", "1", "2–3", "4–5", "6+"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

export const levelFor = (n) => (n <= 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4);

const CATEGORIES = [
  { id: "all", label: "All Activities", icon: "🌸" },
  { id: "git", label: "GitHub / Git", icon: "🐙" },
  { id: "dsa", label: "LeetCode / DSA", icon: "🧩" },
  { id: "codeforces", label: "Codeforces", icon: "🏆" },
  { id: "codechef", label: "CodeChef", icon: "⭐" },
  { id: "competitions", label: "Competitions", icon: "🚀" },
  { id: "tasks", label: "Tasks", icon: "✅" },
  { id: "habits", label: "Habits", icon: "🌱" },
  { id: "focus", label: "Focus", icon: "⏱️" },
];

function describe(a) {
  const parts = [];
  if (a.git) parts.push(`${a.git} GitHub push/session${a.git > 1 ? "s" : ""}`);
  if (a.dsa) parts.push(`${a.dsa} DSA problem${a.dsa > 1 ? "s" : ""}`);
  if (a.codeforces) parts.push(`${a.codeforces} Codeforces accepted`);
  if (a.codechef) parts.push(`${a.codechef} CodeChef item${a.codechef > 1 ? "s" : ""}`);
  if (a.competitions) parts.push(`${a.competitions} competition event${a.competitions > 1 ? "s" : ""}`);
  if (a.tasks) parts.push(`${a.tasks} task${a.tasks > 1 ? "s" : ""}`);
  if (a.habits) parts.push(`${a.habits} habit${a.habits > 1 ? "s" : ""}`);
  if (a.focus) parts.push(`${a.focus} focus session${a.focus > 1 ? "s" : ""}`);
  return parts.length ? parts.join(", ") : "No activity recorded";
}

function buildColumns(today) {
  const t = parseDate(today);
  const start = addDays(today, -(52 * 7 + t.getDay()));
  const cols = [];
  let prevMonth = null;
  for (let w = 0; w < 53; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) days.push(addDays(start, w * 7 + d));
    const owner = parseDate(days[3]).getMonth();
    const newMonth = prevMonth !== null && owner !== prevMonth;
    cols.push({ days, month: owner, newMonth, label: prevMonth === null || newMonth ? MONTHS[owner] : "" });
    prevMonth = owner;
  }
  return { start, cols };
}

export default function ActivityGarden({ onRefresh }) {
  const today = todayStr();
  const [category, setCategory] = useState("all");
  const { start, cols } = useMemo(() => buildColumns(today), [today]);

  const queryUrl = `/activity?start=${start}&end=${today}${category !== "all" ? `&category=${category}` : ""}`;
  const { data, error, loading, reload } = useFetch(() => api.get(queryUrl), [queryUrl]);
  const [hover, setHover] = useState(null);

  const activeDays = data ? Object.values(data).filter((d) => d.total > 0).length : 0;
  const totalActions = data ? Object.values(data).reduce((s, d) => s + d.total, 0) : 0;

  return (
    <section className="card bg-sky" aria-label="Yearly activity">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl">Activity garden 🌸</h2>
            <button
              onClick={() => { reload(); if (onRefresh) onRefresh(); }}
              className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold text-deep hover:bg-white"
              title="Refresh garden"
            >
              ↻ Refresh
            </button>
          </div>
          <p className="text-sm font-semibold text-deep/70">
            {loading ? "Growing…" : `${activeDays} active days · ${totalActions} actions in the last 365 days`}
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`chip transition ${
                category === cat.id
                  ? "bg-deep text-white shadow-sm"
                  : "bg-white/80 text-deep hover:bg-white"
              }`}
            >
              <span>{cat.icon}</span>
              <span className="ml-1">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-2 min-h-6 flex items-center justify-between text-xs font-bold text-deep/80" aria-live="polite">
        <p>
          {hover ? (
            <span className="rounded-full bg-white px-3 py-1 shadow-sm">
              🗓️ <strong>{formatLong(hover.date)}</strong>: {describe(hover.a)}
            </span>
          ) : (
            <span className="text-deep/60">Hover or tap any square to inspect platform breakdowns</span>
          )}
        </p>
      </div>

      <ErrorNote message={error} onRetry={reload} />

      <div className="overflow-x-auto pb-2">
        <div className="flex w-max gap-1.5">
          <div className="flex flex-col gap-1.5 pr-1 pt-[22px] text-[11px] font-bold text-deep/60">
            {WEEKDAY_LABELS.map((l, i) => (
              <span key={i} className="flex h-4 items-center">{l}</span>
            ))}
          </div>
          {cols.map((col, i) => (
            <div key={i} className={`flex flex-col gap-1.5 ${col.newMonth ? "ml-3" : ""}`}>
              <span className="h-4 text-[11px] font-extrabold leading-4 text-deep/70">{col.label}</span>
              {col.days.map((d) => {
                if (d > today) return <span key={d} className="h-4 w-4" />;
                const a = data?.[d] || {
                  tasks: 0,
                  habits: 0,
                  focus: 0,
                  dsa: 0,
                  git: 0,
                  codeforces: 0,
                  codechef: 0,
                  competitions: 0,
                  total: 0,
                };
                const level = levelFor(a.total);
                return (
                  <button
                    key={d}
                    type="button"
                    onMouseEnter={() => setHover({ date: d, a })}
                    onFocus={() => setHover({ date: d, a })}
                    onMouseLeave={() => setHover(null)}
                    onBlur={() => setHover(null)}
                    aria-label={`${formatLong(d)}: ${describe(a)}`}
                    title={`${formatLong(d)}: ${describe(a)}`}
                    className="h-4 w-4 rounded-[6px] border border-deep/10 transition hover:scale-125 focus:ring-2 focus:ring-deep"
                    style={{ backgroundColor: LEVEL_COLORS[level] }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs font-bold text-deep/70">
        <span className="italic text-deep/60">
          Showing: {CATEGORIES.find((c) => c.id === category)?.label}
        </span>
        <div className="flex items-center gap-2">
          <span>Less</span>
          {LEVEL_COLORS.map((c, i) => (
            <span
              key={c}
              title={LEVEL_LABELS[i]}
              className="h-4 w-4 rounded-[6px] border border-deep/10"
              style={{ backgroundColor: c }}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </section>
  );
}
