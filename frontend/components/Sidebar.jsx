"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { todayStr } from "@/lib/dates";
import { Flower, Sparkle } from "./Decor";

const links = [
  { href: "/dashboard", label: "Overview", icon: "🏠" },
  { href: "/developer", label: "Developer Hub", icon: "💻" },
  { href: "/feed", label: "Activity Feed", icon: "⚡" },
  { href: "/contests", label: "Contest Calendar", icon: "🏆" },
  { href: "/opportunities", label: "Opportunities", icon: "🚀" },
  { href: "/tasks", label: "My Tasks", icon: "✅" },
  { href: "/focus", label: "Focus Timer", icon: "⏱️" },
  { href: "/leetcode", label: "LeetCode", icon: "🧩" },
  { href: "/habits", label: "Habits", icon: "🌱" },
  { href: "/git", label: "Git & Projects", icon: "🐙" },
  { href: "/activity", label: "Activity Garden", icon: "🌸" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [streak, setStreak] = useState(null);

  useEffect(() => {
    api.get(`/activity/streak?today=${todayStr()}`).then((r) => setStreak(r.streak)).catch(() => setStreak(null));
  }, [pathname]);

  return (
    <aside className="flex flex-col gap-4 bg-deep p-4 text-white md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:p-5">
      <div className="flex items-center justify-between md:block">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Flower className="h-9 w-9 animate-float" />
          <span className="font-display text-2xl font-black">LifeOS</span>
        </Link>
        <button onClick={logout} className="text-sm font-bold text-sky underline md:hidden">
          Log out
        </button>
      </div>

      <nav className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible" aria-label="Main">
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 font-display font-bold transition hover:translate-x-1 ${
                active ? "bg-lime text-deep" : "text-white/90 hover:bg-white/10"
              }`}
            >
              <span aria-hidden="true">{l.icon}</span>
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden space-y-3 md:block">
        <div className="relative overflow-hidden rounded-bubble bg-peri p-4 text-deep">
          <Sparkle className="absolute right-3 top-3 h-5 w-5" />
          <p className="text-xs font-bold uppercase tracking-wide">Active streak</p>
          <p className="font-display text-3xl font-black">{streak === null ? "–" : `${streak} day${streak === 1 ? "" : "s"}`}</p>
          <p className="text-xs font-semibold">
            {streak ? "Keep the chain going!" : "Do one thing today to start a streak."}
          </p>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="truncate font-bold" title={user?.email}>{user?.name}</span>
          <button onClick={logout} className="font-bold text-sky underline">
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}
