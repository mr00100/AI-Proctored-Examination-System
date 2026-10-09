"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    fetchNotifications();
    const notifTimer = setInterval(fetchNotifications, 30000);
    return () => {
      clearInterval(timer);
      clearInterval(notifTimer);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch {}
  };

  const unread = notifications.filter(n => !n.isRead).length;

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const typeColors: Record<string, string> = {
    critical: "text-red-400",
    warning: "text-amber-400",
    info: "text-blue-400",
    success: "text-emerald-400",
  };

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-50">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Clock */}
        <div className="hidden md:block text-right">
          <p className="text-sm font-mono text-slate-300">{now.toLocaleTimeString()}</p>
          <p className="text-xs text-slate-500">{formatDateTime(now)}</p>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          >
            <span className="text-xl">🔔</span>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-12 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                <h3 className="font-semibold text-white text-sm">Notifications</h3>
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-indigo-400 hover:text-indigo-300">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-sm">No notifications</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`px-4 py-3 border-b border-slate-700/50 ${!n.isRead ? "bg-slate-700/30" : ""}`}>
                      <p className={`text-xs font-semibold ${typeColors[n.type] || "text-slate-300"}`}>{n.title}</p>
                      <p className="text-xs text-slate-400 mt-1">{n.message}</p>
                      <p className="text-xs text-slate-600 mt-1">{formatDateTime(n.createdAt)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
