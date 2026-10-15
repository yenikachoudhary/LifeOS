"use client";

import { useMemo, useState } from "react";
import { Empty, ErrorNote, Loading, PageHeader } from "@/components/Feedback";
import ProgressRing from "@/components/ProgressRing";
import { api } from "@/lib/api";
import { formatShort, todayStr } from "@/lib/dates";
import { useFetch } from "@/lib/useFetch";

const PRIORITY_COLOR = { High: "bg-blush", Medium: "bg-lime", Low: "bg-sky" };
const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };
const RECURRENCE_LABEL = { none: "One-time", daily: "Every day", weekly: "Every week" };

function TaskForm({ today, onCreated }) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [recurrence, setRecurrence] = useState("none");
  const [deadline, setDeadline] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api.post("/tasks", { title, priority, recurrence, deadline: deadline || null, start_date: today });
      setTitle("");
      setDeadline("");
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3 bg-peri">
      <ErrorNote message={error} />
      <input className="input" placeholder="What do you want to get done?" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Task title" />
      <div className="flex flex-wrap gap-2">
        <select className="input w-auto" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority">
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <select className="input w-auto" value={recurrence} onChange={(e) => setRecurrence(e.target.value)} aria-label="Repeat">
          <option value="none">One-time</option>
          <option value="daily">Every day</option>
          <option value="weekly">Every week</option>
        </select>
        <label className="flex items-center gap-2 text-sm font-bold">
          Deadline
          <input className="input w-auto" type="date" value={deadline} min={today} onChange={(e) => setDeadline(e.target.value)} />
        </label>
        <button className="btn ml-auto" disabled={busy || !title.trim()}>{busy ? "Adding…" : "Add task"}</button>
      </div>
    </form>
  );
}

function TaskItem({ task, today, onChange, onError }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState(task.priority);
  const [deadline, setDeadline] = useState(task.deadline || "");

  const run = async (fn) => {
    try {
      await fn();
      onChange();
    } catch (e) {
      onError(e.message);
    }
  };

  const toggle = () => run(() => api.put(`/tasks/${task.id}/completion/${today}`, { completed: !task.completed }));
  const remove = () => {
    const warn = task.recurrence === "none" ? "Delete this task?" : "Delete this recurring task and ALL its history?";
    if (window.confirm(warn)) run(() => api.del(`/tasks/${task.id}`));
  };
  const save = () =>
    run(async () => {
      await api.patch(`/tasks/${task.id}`, { title, priority, deadline: deadline || null });
      setEditing(false);
    });

  if (editing) {
    return (
      <li className="space-y-2 rounded-3xl bg-sky/60 p-3">
        <input className="input" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} aria-label="Edit title" />
        <div className="flex flex-wrap gap-2">
          <select className="input w-auto" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Edit priority">
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <input className="input w-auto" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} aria-label="Edit deadline" />
          <button className="btn ml-auto" onClick={save} disabled={!title.trim()}>Save</button>
          <button className="btn-soft" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </li>
    );
  }

  return (
    <li className={`flex items-center gap-3 rounded-full px-4 py-2.5 transition ${task.completed ? "bg-lime/60" : "bg-white ring-2 ring-sky"}`}>
      <input
        type="checkbox"
        checked={task.completed}
        onChange={toggle}
        className="h-5 w-5 shrink-0 cursor-pointer accent-[#253A82]"
        aria-label={`Mark "${task.title}" ${task.completed ? "not done" : "done"}`}
      />
      <div className="min-w-0 flex-1">
        <p className={`truncate font-bold ${task.completed ? "line-through opacity-60" : ""}`}>{task.title}</p>
        <p className="flex flex-wrap gap-x-2 text-xs font-semibold text-deep/60">
          <span>{RECURRENCE_LABEL[task.recurrence]}</span>
          {task.deadline && (
            <span className={task.overdue ? "font-extrabold text-[#c0267a]" : ""}>
              {task.overdue ? "Overdue · " : "Due "}
              {formatShort(task.deadline)}
            </span>
          )}
        </p>
      </div>
      <span className={`chip ${PRIORITY_COLOR[task.priority]}`}>{task.priority}</span>
      <button onClick={() => setEditing(true)} className="text-sm font-bold underline" aria-label={`Edit ${task.title}`}>Edit</button>
      <button onClick={remove} className="text-lg" aria-label={`Delete ${task.title}`}>🗑️</button>
    </li>
  );
}

export default function TasksPage() {
  const today = todayStr();
  const { data: tasks, error, loading, reload } = useFetch(() => api.get(`/tasks?date=${today}`), [today]);
  const [sort, setSort] = useState("priority");
  const [actionError, setActionError] = useState("");

  const sorted = useMemo(() => {
    if (!tasks) return [];
    const list = [...tasks];
    list.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (sort === "deadline") return (a.deadline || "9999").localeCompare(b.deadline || "9999") || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || (a.deadline || "9999").localeCompare(b.deadline || "9999");
    });
    return list;
  }, [tasks, sort]);

  const done = tasks ? tasks.filter((t) => t.completed).length : 0;
  const total = tasks ? tasks.length : 0;

  return (
    <div className="space-y-5">
      <PageHeader title="My Tasks" subtitle="Daily and weekly tasks reappear on their own — completing today never affects other days." />
      <TaskForm today={today} onCreated={reload} />
      <ErrorNote message={actionError} />
      <ErrorNote message={error} onRetry={reload} />

      {loading ? (
        <Loading />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <section className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg">Today · {done}/{total} done</h2>
              <select className="input w-auto py-1.5 text-sm" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort tasks">
                <option value="priority">Sort: priority</option>
                <option value="deadline">Sort: deadline</option>
              </select>
            </div>
            {sorted.length === 0 ? (
              <Empty>Nothing scheduled for today. Add a task above 🌼</Empty>
            ) : (
              <ul className="space-y-2">
                {sorted.map((t) => (
                  <TaskItem key={t.id} task={t} today={today} onChange={() => { setActionError(""); reload(); }} onError={setActionError} />
                ))}
              </ul>
            )}
          </section>
          <div className="card flex items-center justify-center">
            <ProgressRing percent={total ? (done / total) * 100 : 0} label="today" color="#8BA2FF" />
          </div>
        </div>
      )}
    </div>
  );
}
