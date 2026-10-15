"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorNote, PageHeader } from "@/components/Feedback";
import MiniBars from "@/components/MiniBars";
import { api } from "@/lib/api";
import { todayStr } from "@/lib/dates";
import { useFetch } from "@/lib/useFetch";

const MODES = {
  work: { label: "Focus", seconds: 25 * 60, color: "#8BA2FF" },
  short: { label: "Short break", seconds: 5 * 60, color: "#E3FC87" },
  long: { label: "Long break", seconds: 15 * 60, color: "#FFB2F7" },
};

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.25, 0.5].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.22);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    /* audio blocked by the browser — the visual change still tells the user */
  }
}

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function FocusPage() {
  const today = todayStr();
  const [mode, setMode] = useState("work");
  const [secondsLeft, setSecondsLeft] = useState(MODES.work.seconds);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0); // work sessions finished in this sitting
  const [saveError, setSaveError] = useState("");
  const endRef = useRef(0);

  const day = useFetch(() => api.get(`/focus?date=${today}`), [today]);
  const history = useFetch(() => api.get(`/focus/history?today=${today}&days=7`), [today]);

  const finish = useCallback(async () => {
    setRunning(false);
    beep();
    if (mode === "work") {
      const next = cycles + 1;
      setCycles(next);
      const nextMode = next % 4 === 0 ? "long" : "short";
      setMode(nextMode);
      setSecondsLeft(MODES[nextMode].seconds);
      try {
        setSaveError("");
        await api.post("/focus", { date: today, minutes: 25 });
        day.reload();
        history.reload();
      } catch (e) {
        setSaveError(`Session finished but could not be saved: ${e.message}`);
      }
    } else {
      setMode("work");
      setSecondsLeft(MODES.work.seconds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, cycles, today]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        clearInterval(id);
        finish();
      }
    }, 250);
    return () => clearInterval(id);
  }, [running, finish]);

  useEffect(() => {
    document.title = running ? `${fmt(secondsLeft)} · LifeOS` : "LifeOS — Plan less. Do more.";
    return () => {
      document.title = "LifeOS — Plan less. Do more.";
    };
  }, [running, secondsLeft]);

  const start = () => {
    endRef.current = Date.now() + secondsLeft * 1000;
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    setSecondsLeft(MODES[mode].seconds);
  };
  const switchMode = (m) => {
    setRunning(false);
    setMode(m);
    setSecondsLeft(MODES[m].seconds);
  };

  const total = MODES[mode].seconds;
  const started = secondsLeft !== total;
  const pct = ((total - secondsLeft) / total) * 100;

  return (
    <div className="space-y-5">
      <PageHeader title="Focus Timer" subtitle="25 min focus · 5 min break · 15 min long break after 4 sessions." />
      <ErrorNote message={saveError} />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="card flex flex-col items-center gap-5 py-8" style={{ backgroundColor: MODES[mode].color }}>
          <div className="flex gap-2" role="tablist">
            {Object.entries(MODES).map(([key, m]) => (
              <button
                key={key}
                role="tab"
                aria-selected={mode === key}
                onClick={() => switchMode(key)}
                className={`rounded-full px-4 py-1.5 font-display text-sm font-bold ${mode === key ? "bg-deep text-white" : "bg-white/60"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="font-display text-7xl font-black tabular-nums md:text-8xl" aria-live="off">{fmt(secondsLeft)}</p>
          <div className="h-3 w-64 overflow-hidden rounded-full bg-white/60" aria-hidden="true">
            <div className="h-full rounded-full bg-deep transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex gap-3">
            {running ? (
              <button className="btn" onClick={pause}>Pause</button>
            ) : (
              <button className="btn" onClick={start}>{started ? "Resume" : "Start"}</button>
            )}
            <button className="btn-soft bg-white" onClick={reset}>Reset</button>
          </div>
          <p className="text-sm font-bold">Sessions finished this sitting: {cycles} {cycles % 4 === 3 && mode === "work" ? "· long break next!" : ""}</p>
        </section>

        <aside className="space-y-4">
          <div className="card bg-lime">
            <p className="text-sm font-bold">Focused today</p>
            <p className="font-display text-4xl font-black">{day.data?.total_minutes ?? 0} min</p>
            <p className="text-sm font-semibold">{day.data?.sessions.length ?? 0} completed session(s)</p>
          </div>
          <div className="card">
            <p className="mb-2 text-sm font-bold">Last 7 days (minutes)</p>
            {history.data ? (
              <MiniBars data={history.data.map((d) => ({ date: d.date, value: d.minutes }))} unit=" min" />
            ) : (
              <p className="text-sm">Loading…</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
