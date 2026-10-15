"use client";

import { useState } from "react";
import { Empty, ErrorNote, Loading, PageHeader } from "@/components/Feedback";
import { api } from "@/lib/api";
import { formatLong, formatShort } from "@/lib/dates";
import { useFetch } from "@/lib/useFetch";

const PLATFORMS = [
  { id: "all", label: "All Platforms", icon: "🌐" },
  { id: "github", label: "GitHub", icon: "🐙" },
  { id: "leetcode", label: "LeetCode", icon: "🧩" },
  { id: "codeforces", label: "Codeforces", icon: "🏆" },
  { id: "codechef", label: "CodeChef", icon: "⭐" },
  { id: "unstop", label: "Unstop", icon: "🚀" },
  { id: "email", label: "Email", icon: "✉️" },
];

export default function UnifiedFeedPage() {
  const [platform, setPlatform] = useState("all");
  const query = `/feed?limit=50${platform !== "all" ? `&platform=${platform}` : ""}`;
  const { data, error, loading, reload } = useFetch(() => api.get(query), [query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Unified Activity Feed"
          subtitle="Real-time timeline combining GitHub pushes, LeetCode solves, Codeforces submissions, and opportunities."
        />
        <button onClick={reload} className="btn-soft text-sm">
          ↻ Refresh Feed
        </button>
      </div>

      {/* Platform Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => {
          const count = p.id === "all" ? data?.total : (data?.source_counts?.[p.id] || 0);
          const active = platform === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={`chip py-1.5 px-3.5 text-xs font-bold transition ${
                active ? "bg-deep text-white shadow-sm" : "bg-white text-deep hover:bg-sky/50"
              }`}
            >
              <span>{p.icon}</span>
              <span className="ml-1.5">{p.label}</span>
              {count !== undefined && count > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.2 text-[10px] ${active ? "bg-white/20" : "bg-sky/60"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <ErrorNote message={error} onRetry={reload} />

      {loading ? (
        <Loading />
      ) : data?.items?.length ? (
        <div className="space-y-3">
          {data.items.map((ev) => (
            <div
              key={ev.id}
              className="card flex flex-wrap items-center justify-between gap-3 border border-sky/30 bg-white p-4 transition hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky/30 text-xl">
                  {ev.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chip bg-sky/50 text-[10px] uppercase font-black tracking-wider text-deep">
                      {ev.source}
                    </span>
                    <span className="text-xs font-bold text-deep/60">
                      {formatShort(ev.date)} · {ev.timestamp ? ev.timestamp.slice(11, 16) : ""}
                    </span>
                  </div>
                  <h4 className="mt-1 font-display font-extrabold text-base text-deep truncate">
                    {ev.url ? (
                      <a href={ev.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {ev.title} ↗
                      </a>
                    ) : (
                      ev.title
                    )}
                  </h4>
                  {ev.description && (
                    <p className="mt-0.5 text-xs font-semibold text-deep/70 line-clamp-2">
                      {ev.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty>
          No activity recorded for this platform yet. Connect your account in the Developer Hub to automatically populate your timeline! 🌸
        </Empty>
      )}
    </div>
  );
}
