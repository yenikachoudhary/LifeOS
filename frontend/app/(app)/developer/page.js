"use client";

import { useState } from "react";
import { ErrorNote, Loading, PageHeader } from "@/components/Feedback";
import StatCard from "@/components/StatCard";
import { api } from "@/lib/api";
import { formatLong, formatShort } from "@/lib/dates";
import { useFetch } from "@/lib/useFetch";

const STATUS_COLOR = {
  connected: "bg-lime text-deep",
  syncing: "bg-sky text-deep",
  error: "bg-blush text-deep",
  disconnected: "bg-gray-200 text-deep/60",
};

export default function DeveloperHubPage() {
  const { data: profiles, error, loading, reload } = useFetch(() => api.get("/developer/profiles"), []);
  const { data: summary, reload: reloadSummary } = useFetch(() => api.get("/developer/summary"), []);

  const [syncingPlatform, setSyncingPlatform] = useState(null);
  const [syncAllBusy, setSyncAllBusy] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState(null);
  const [handleInput, setHandleInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const refreshAll = () => {
    reload();
    reloadSummary();
  };

  async function handleSync(platform) {
    setSyncingPlatform(platform);
    setActionError("");
    setActionSuccess("");
    try {
      await api.post(`/developer/sync/${platform}`);
      setActionSuccess(`Successfully synchronized ${platform}! 🚀`);
      refreshAll();
    } catch (err) {
      setActionError(`Sync failed for ${platform}: ${err.message}`);
    } finally {
      setSyncingPlatform(null);
    }
  }

  async function handleSyncAll() {
    setSyncAllBusy(true);
    setActionError("");
    setActionSuccess("");
    try {
      await api.post("/developer/sync-all");
      setActionSuccess("All connected developer platforms synchronized! ✨");
      refreshAll();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSyncAllBusy(false);
    }
  }

const DEFAULT_HANDLES = {
  github: "yenikachoudhary",
  leetcode: "Yenika",
  codeforces: "glitch_1207",
  codechef: "glitch_1207",
  unstop: "yenikcho37621",
};

  function startEdit(p) {
    setEditingPlatform(p.platform);
    setHandleInput(p.handle || DEFAULT_HANDLES[p.platform] || "");
    setUrlInput(p.profile_url || "");
    setActionError("");
  }

  async function handleQuickConnectAll() {
    setSyncAllBusy(true);
    setActionError("");
    setActionSuccess("");
    try {
      for (const [platform, handle] of Object.entries(DEFAULT_HANDLES)) {
        await api.put(`/developer/profiles/${platform}`, { handle });
      }
      setActionSuccess("All 5 developer profiles connected and synchronized! 🚀");
      refreshAll();
    } catch (err) {
      setActionError(`Quick connect error: ${err.message}`);
    } finally {
      setSyncAllBusy(false);
    }
  }

  async function saveProfile(platform) {
    if (!handleInput.trim()) return;
    setActionError("");
    try {
      await api.put(`/developer/profiles/${platform}`, {
        handle: handleInput.trim(),
        profile_url: urlInput.trim() || null,
      });
      setEditingPlatform(null);
      setActionSuccess(`Updated and synchronized ${platform}! 🌸`);
      refreshAll();
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function disconnect(platform) {
    if (!confirm(`Are you sure you want to disconnect ${platform}?`)) return;
    try {
      await api.del(`/developer/profiles/${platform}`);
      setActionSuccess(`Disconnected ${platform}.`);
      refreshAll();
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Developer Hub"
          subtitle="Unified profile, automatic activity sync, and stats across GitHub, LeetCode, Codeforces, CodeChef, and Unstop."
        />
        <div className="flex items-center gap-2">
          {summary?.connected_count === 0 && (
            <button
              onClick={handleQuickConnectAll}
              disabled={syncAllBusy || loading}
              className="btn-soft font-bold text-xs"
            >
              🚀 Quick-Connect My Profiles
            </button>
          )}
          <button
            onClick={handleSyncAll}
            disabled={syncAllBusy || loading}
            className="btn shadow-sm text-xs"
          >
            {syncAllBusy ? "Syncing All…" : "⚡ Sync All Platforms"}
          </button>
        </div>
      </div>

      <ErrorNote message={actionError || error} onRetry={refreshAll} />
      {actionSuccess && (
        <div className="rounded-2xl bg-lime/80 px-4 py-3 font-bold text-deep transition-all">
          {actionSuccess}
        </div>
      )}

      {/* Summary KPI Cards */}
      {summary && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon="🧩"
            label="Total Solved"
            value={String(summary.total_solved)}
            subtitle={`LC: ${summary.leetcode_solved} · CF rating: ${summary.codeforces_rating || "—"}`}
            color="#AB9DFF"
          />
          <StatCard
            icon="🐙"
            label="GitHub Repos"
            value={String(summary.github_repos)}
            subtitle={`${summary.github_followers} followers`}
            color="#8BA2FF"
          />
          <StatCard
            icon="⭐"
            label="Competitive Rating"
            value={summary.codeforces_rating ? `${summary.codeforces_rating} CF` : `${summary.codechef_rating || 0} CC`}
            subtitle={`Rank: ${summary.codeforces_rank || "Unrated"} · CC ${summary.codechef_stars || "1 Star"}`}
            color="#E3FC87"
          />
          <StatCard
            icon="🚀"
            label="Active Profiles"
            value={`${summary.connected_count} / 5`}
            subtitle="platforms connected"
            color="#FFB2F7"
          />
        </section>
      )}

      {/* Platform Cards */}
      {loading ? (
        <Loading />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {profiles?.map((p) => {
            const isEditing = editingPlatform === p.platform;
            const isConnected = p.status === "connected";
            const isSyncing = syncingPlatform === p.platform;

            return (
              <div key={p.platform} className="card relative flex flex-col justify-between border-2 border-sky/40 bg-white">
                <div>
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl" aria-hidden="true">{p.meta.icon}</span>
                      <div>
                        <h3 className="text-lg font-black">{p.meta.name}</h3>
                        <p className="text-xs font-semibold text-deep/60">
                          {p.handle ? `@${p.handle}` : "Not connected yet"}
                        </p>
                      </div>
                    </div>
                    <span className={`chip text-xs font-black uppercase ${STATUS_COLOR[p.status]}`}>
                      {p.status}
                    </span>
                  </div>

                  {/* Edit Form */}
                  {isEditing ? (
                    <div className="space-y-2 rounded-2xl bg-[#F5F3FF] p-3 text-sm">
                      <div>
                        <label className="block text-xs font-bold text-deep/70">Username or Handle</label>
                        <input
                          className="input mt-1 py-1.5 text-sm"
                          placeholder={`Enter ${p.meta.name} handle`}
                          value={handleInput}
                          onChange={(e) => setHandleInput(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-deep/70">Profile URL (optional)</label>
                        <input
                          className="input mt-1 py-1.5 text-sm"
                          placeholder={`${p.meta.baseUrl}...`}
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => saveProfile(p.platform)}
                          className="btn py-1 text-xs"
                          disabled={!handleInput.trim()}
                        >
                          Save & Connect
                        </button>
                        <button onClick={() => setEditingPlatform(null)} className="btn-soft py-1 text-xs">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Stats */
                    <div className="space-y-3 py-1">
                      {isConnected ? (
                        <div className="rounded-2xl bg-sky/30 p-3 space-y-1.5 text-xs font-semibold">
                          {p.platform === "github" && (
                            <>
                              <p className="text-sm font-bold text-deep">
                                {p.stats.name || p.handle} · {p.stats.public_repos || 0} repositories
                              </p>
                              <p className="text-deep/70">{p.stats.bio || "Active GitHub contributor"}</p>
                              <p className="font-bold text-deep/80">Followers: {p.stats.followers || 0}</p>
                            </>
                          )}
                          {p.platform === "leetcode" && (
                            <>
                              <p className="text-sm font-bold text-deep">
                                {p.stats.total_solved || 0} Problems Solved
                              </p>
                              <div className="flex gap-2 font-bold">
                                <span className="text-[#00b8a3]">Easy: {p.stats.easy_solved || 0}</span>
                                <span className="text-[#ffc01e]">Med: {p.stats.medium_solved || 0}</span>
                                <span className="text-[#ff375f]">Hard: {p.stats.hard_solved || 0}</span>
                              </div>
                              <p className="text-deep/70">Global Rank: #{p.stats.ranking?.toLocaleString() || "—"}</p>
                            </>
                          )}
                          {p.platform === "codeforces" && (
                            <>
                              <p className="text-sm font-bold text-deep">
                                Rating: {p.stats.rating || 0} ({p.stats.rank || "Unrated"})
                              </p>
                              <p className="text-deep/70">Max Rating: {p.stats.max_rating || 0} ({p.stats.max_rank || "—"})</p>
                              <p className="font-bold text-deep/80">Accepted: {p.stats.total_solved || 0} problems</p>
                            </>
                          )}
                          {p.platform === "codechef" && (
                            <>
                              <p className="text-sm font-bold text-deep">
                                Rating: {p.stats.rating || 0} ({p.stats.stars || "1 Star"})
                              </p>
                              <p className="text-deep/70">Division: {p.stats.division || "Div 4"}</p>
                              <p className="font-bold text-deep/80">Contests: {p.stats.contests_count || 0}</p>
                            </>
                          )}
                          {p.platform === "unstop" && (
                            <>
                              <p className="text-sm font-bold text-deep">Profile: @{p.handle}</p>
                              <p className="text-deep/70">Hackathons, engineering challenges & opportunities tracked</p>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-2xl bg-gray-50 p-4 text-center text-xs font-semibold text-deep/60">
                          {p.error_message ? (
                            <span className="text-red-600 font-bold">Error: {p.error_message}</span>
                          ) : (
                            "No credentials or account configured. Tap below to connect."
                          )}
                        </div>
                      )}

                      {p.last_synced && (
                        <p className="text-[11px] font-semibold text-deep/50">
                          Last synced: {formatShort(p.last_synced.slice(0, 10))} at {p.last_synced.slice(11, 16)} UTC
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {!isEditing && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-sky/30 pt-3">
                    {isConnected ? (
                      <>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleSync(p.platform)}
                            disabled={isSyncing}
                            className="btn-soft py-1 px-3 text-xs"
                          >
                            {isSyncing ? "Syncing…" : "↻ Sync"}
                          </button>
                          <a
                            href={p.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-soft py-1 px-3 text-xs"
                          >
                            Visit ↗
                          </a>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => startEdit(p)} className="text-xs font-bold underline text-deep/70">
                            Edit
                          </button>
                          <button onClick={() => disconnect(p.platform)} className="text-xs font-bold text-red-500 underline ml-2">
                            Remove
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(p)}
                        className="btn py-1 px-4 text-xs w-full"
                      >
                        + Connect {p.meta.name}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Webhook Configuration Note */}
      <section className="card bg-lime/30 space-y-2">
        <h3 className="text-base font-black flex items-center gap-2">
          <span>⚡ Real-Time Push Webhooks (Optional)</span>
        </h3>
        <p className="text-xs font-semibold text-deep/80">
          Want instant GitHub push detection without waiting for sync? Add a webhook in your repository settings pointing to:
        </p>
        <code className="block rounded-xl bg-white p-2 font-mono text-xs text-deep border border-lime select-all">
          http://localhost:8000/webhooks/github/[your_user_id]
        </code>
      </section>
    </div>
  );
}
