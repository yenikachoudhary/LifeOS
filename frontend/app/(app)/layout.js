"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Loading } from "@/components/Feedback";
import { useAuth } from "@/context/AuthContext";

export default function AppLayout({ children }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <Loading text="Opening your garden…" />;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
