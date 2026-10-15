"use client";

import { useState } from "react";
import { Empty, ErrorNote, Loading, PageHeader } from "@/components/Feedback";
import { api } from "@/lib/api";
import { formatShort } from "@/lib/dates";
import { useFetch } from "@/lib/useFetch";

const STATUSES = [
  "all",
  "discovered",
  "interested",
  "registered",
  "submitted",
  "shortlisted",
  "won",
  "lost",
];

const CATEGORIES = [
  { id: "all", label: "All Opportunities" },
  { id: "hackathon", label: "Hackathons" },
  { id: "innovation_challenge", label: "Challenges" },
  { id: "coding_competition", label: "Coding Competitions" },
  { id: "scholarship", label: "Scholarships & GSoC" },
];

const STATUS_CHIP_COLOR = {
  discovered: "bg-sky text-deep",
  interested: "bg-lav text-deep",
  registered: "bg-lime text-deep",
  submitted: "bg-peri text-white",
  shortlisted: "bg-yellow-200 text-deep",
  won: "bg-green-300 text-deep font-black",
  lost: "bg-gray-200 text-deep/60",
  expired: "bg-gray-100 text-deep/40",
};

export default function OpportunitiesHubPage() {
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [syncEmailBusy, setSyncEmailBusy] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  // New Opp Form State
  const [name, setName] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [oppCategory, setOppCategory] = useState("hackathon");
  const [url, setUrl] = useState("");
  const [deadline, setDeadline] = useState("");
  const [prize, setPrize] = useState("");

  const query = `/opportunities?category=${category}&status=${status}`;
  const { data, error, loading, reload } = useFetch(() => api.get(query), [category, status]);

  async function handleCreate(e) {
    e.preventDefault();
    setActionError("");
    try {
      await api.post("/opportunities", {
        name,
        organizer,
        category: oppCategory,
        url: url || null,
        registration_deadline: deadline || null,
        prize: prize || null,
        source: "direct",
        status: "discovered",
      });
      setShowAddModal(false);
      setName("");
      setOrganizer("");
      setUrl("");
      setDeadline("");
      setPrize("");
      setActionSuccess("New opportunity created! 🚀");
      reload();
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleStatusChange(oppId, newStatus) {
    try {
      await api.patch(`/opportunities/${oppId}`, { status: newStatus });
      reload();
    } catch (err) {
      alert(`Could not update status: ${err.message}`);
    }
  }

  async function handleDelete(oppId) {
    if (!confirm("Delete this opportunity?")) return;
    try {
      await api.del(`/opportunities/${oppId}`);
      reload();
    } catch (err) {
      alert(`Could not delete: ${err.message}`);
    }
  }

  async function handleSyncEmail() {
    setSyncEmailBusy(true);
    setActionError("");
    setActionSuccess("");
    try {
      const res = await api.post("/email/sync");
      setActionSuccess(`Email synchronization complete! Created ${res.opportunities_created} new opportunities.`);
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSyncEmailBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Opportunities Hub"
          subtitle="Discover, track, and manage hackathons, innovation challenges, and competitions from Unstop and email notifications."
        />
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncEmail}
            disabled={syncEmailBusy}
            className="btn-soft text-xs"
          >
            {syncEmailBusy ? "Scanning Emails…" : "✉️ Sync Emails"}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn text-xs"
          >
            ＋ Add Opportunity
          </button>
        </div>
      </div>

      <ErrorNote message={actionError || error} onRetry={reload} />
      {actionSuccess && (
        <div className="rounded-2xl bg-lime/80 px-4 py-3 font-bold text-deep">
          {actionSuccess}
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const count = c.id === "all" ? data?.total : (data?.category_counts?.[c.id] || 0);
          const active = category === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`chip py-1.5 px-3.5 text-xs font-bold transition ${
                active ? "bg-deep text-white shadow-sm" : "bg-white text-deep hover:bg-sky/50"
              }`}
            >
              {c.label} {count !== undefined && count > 0 ? `(${count})` : ""}
            </button>
          );
        })}
      </div>

      {/* Status Bar */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
        <span className="text-deep/60 mr-1">Status:</span>
        {STATUSES.map((s) => (
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

      {/* Add Opportunity Modal / Form */}
      {showAddModal && (
        <form onSubmit={handleCreate} className="card space-y-3 bg-[#F5F3FF] border-2 border-peri p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black">Add New Opportunity</h3>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="text-xs font-bold text-deep/60"
            >
              ✕ Cancel
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-deep/70">Opportunity Name</label>
              <input
                className="input mt-1 py-1.5 text-sm"
                required
                placeholder="e.g. Smart India Hackathon"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-deep/70">Organizer</label>
              <input
                className="input mt-1 py-1.5 text-sm"
                required
                placeholder="e.g. Unstop / Ministry of Education"
                value={organizer}
                onChange={(e) => setOrganizer(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-deep/70">Category</label>
              <select
                className="input mt-1 py-1.5 text-sm"
                value={oppCategory}
                onChange={(e) => setOppCategory(e.target.value)}
              >
                <option value="hackathon">Hackathon</option>
                <option value="innovation_challenge">Innovation Challenge</option>
                <option value="coding_competition">Coding Competition</option>
                <option value="scholarship">Scholarship & Program</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-deep/70">Registration Deadline</label>
              <input
                type="date"
                className="input mt-1 py-1.5 text-sm"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-deep/70">Registration URL</label>
              <input
                type="url"
                className="input mt-1 py-1.5 text-sm"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-deep/70">Prizes / Benefits</label>
              <input
                className="input mt-1 py-1.5 text-sm"
                placeholder="e.g. ₹5,00,000 + PPI"
                value={prize}
                onChange={(e) => setPrize(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="btn text-xs">
            Save Opportunity
          </button>
        </form>
      )}

      {/* Opportunities Cards */}
      {loading ? (
        <Loading />
      ) : data?.opportunities?.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.opportunities.map((opp) => (
            <div
              key={opp.id}
              className="card flex flex-col justify-between border-2 border-sky/40 bg-white transition hover:-translate-y-1"
            >
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="chip bg-sky/50 text-[11px] font-bold uppercase text-deep">
                    {opp.source === "unstop" ? "🚀 Unstop" : opp.source === "email" ? "✉️ Email" : "📌 Direct"}
                  </span>
                  <select
                    value={opp.status}
                    onChange={(e) => handleStatusChange(opp.id, e.target.value)}
                    className={`chip cursor-pointer text-xs font-extrabold capitalize outline-none ${
                      STATUS_CHIP_COLOR[opp.status] || "bg-gray-100"
                    }`}
                  >
                    {STATUSES.filter((s) => s !== "all").map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <h3 className="font-display font-extrabold text-base text-deep line-clamp-2">
                  {opp.name}
                </h3>
                <p className="text-xs font-bold text-deep/60 mt-0.5">By {opp.organizer}</p>

                {opp.description && (
                  <p className="mt-2 text-xs font-semibold text-deep/70 line-clamp-3">
                    {opp.description}
                  </p>
                )}

                <div className="mt-3 space-y-1 text-xs font-semibold text-deep/80">
                  {opp.registration_deadline && (
                    <p>
                      ⏳ <strong>Deadline:</strong> {formatShort(opp.registration_deadline)}
                    </p>
                  )}
                  {opp.prize && (
                    <p className="text-[#008f7a] font-bold">
                      🏆 <strong>Prize:</strong> {opp.prize}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-sky/30 pt-3">
                {opp.url ? (
                  <a
                    href={opp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn py-1.5 px-4 text-xs"
                  >
                    View Details ↗
                  </a>
                ) : (
                  <span />
                )}
                <button
                  onClick={() => handleDelete(opp.id)}
                  className="text-xs font-bold text-red-500 underline"
                  title="Remove"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty>
          No opportunities found in this category. Click &quot;Sync Emails&quot; or &quot;＋ Add Opportunity&quot; to begin tracking! 🌸
        </Empty>
      )}
    </div>
  );
}
