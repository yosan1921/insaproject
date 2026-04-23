"use client";

import { useEffect, useState, useCallback } from "react";
import {
  HiBell, HiX, HiCheckCircle, HiExclamationCircle,
  HiInformationCircle, HiShieldExclamation, HiChip,
} from "react-icons/hi";
import { MdOutlineAssessment } from "react-icons/md";

interface Notification {
  id: string;
  type: "questionnaire" | "analysis" | "critical" | "asset" | "threat";
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  message: string;
  link?: string;
  date: string;
  read: boolean;
}

const SEVERITY_CONFIG: Record<string, {
  dot: string; bg: string; border: string; icon: React.ReactNode;
}> = {
  critical: {
    dot: "bg-red-500",
    bg: "bg-red-50",
    border: "border-red-200",
    icon: <HiExclamationCircle className="w-4 h-4 text-red-500" />,
  },
  high: {
    dot: "bg-orange-500",
    bg: "bg-orange-50",
    border: "border-orange-200",
    icon: <HiShieldExclamation className="w-4 h-4 text-orange-500" />,
  },
  medium: {
    dot: "bg-yellow-400",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    icon: <HiInformationCircle className="w-4 h-4 text-yellow-500" />,
  },
  low: {
    dot: "bg-green-500",
    bg: "bg-green-50",
    border: "border-green-200",
    icon: <HiCheckCircle className="w-4 h-4 text-green-500" />,
  },
  info: {
    dot: "bg-blue-500",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: <HiInformationCircle className="w-4 h-4 text-blue-500" />,
  },
};

const TYPE_CONFIG: Record<string, { label: string; pill: string; icon: React.ReactNode }> = {
  questionnaire: {
    label: "Assessment",
    pill: "bg-blue-100 text-blue-700",
    icon: <MdOutlineAssessment className="w-3.5 h-3.5" />,
  },
  analysis: {
    label: "Analysis",
    pill: "bg-emerald-100 text-emerald-700",
    icon: <HiChip className="w-3.5 h-3.5" />,
  },
  critical: {
    label: "Critical Risk",
    pill: "bg-red-100 text-red-700",
    icon: <HiExclamationCircle className="w-3.5 h-3.5" />,
  },
  asset: {
    label: "Asset Scan",
    pill: "bg-purple-100 text-purple-700",
    icon: <HiChip className="w-3.5 h-3.5" />,
  },
  threat: {
    label: "Threat Alert",
    pill: "bg-orange-100 text-orange-700",
    icon: <HiShieldExclamation className="w-3.5 h-3.5" />,
  },
};

const FILTERS = ["All", "Critical", "High", "Medium", "Info"] as const;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationPanel({ onClose, onCountChange }: {
  onClose: () => void;
  onCountChange?: (count: number) => void;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("All");

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (Array.isArray(data)) {
        setNotifications(data);
        onCountChange?.(data.filter((n: Notification) => !n.read).length);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const es = new EventSource("/api/notifications/stream");
    es.addEventListener("notification", () => fetchNotifications());
    return () => es.close();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      onCountChange?.(updated.filter(n => !n.read).length);
      return updated;
    });
  };

  const markAllAsRead = async () => {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    onCountChange?.(0);
  };

  const filtered = notifications.filter(n => {
    if (filter === "All") return true;
    return n.severity === filter.toLowerCase();
  });

  const unread = notifications.filter(n => !n.read).length;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-2 z-50 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
        style={{ maxHeight: "calc(100vh - 80px)" }}>

        {/* ── Header ── */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <HiBell className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Notifications</p>
              <p className="text-xs text-gray-400">{unread > 0 ? `${unread} unread` : "All caught up"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            >
              <HiX className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Filter pills ── */}
        <div className="px-4 py-2.5 border-b border-gray-100 flex gap-1.5 overflow-x-auto shrink-0">
          {FILTERS.map(f => {
            const count = f === "All"
              ? notifications.filter(n => !n.read).length
              : notifications.filter(n => n.severity === f.toLowerCase() && !n.read).length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition
                  ${filter === f
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
              >
                {f}
                {count > 0 && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full leading-none
                    ${filter === f ? "bg-white/30 text-white" : "bg-gray-300 text-gray-600"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── List ── */}
        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-xs text-gray-400">Loading notifications...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                <HiBell className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-400">No notifications</p>
              <p className="text-xs text-gray-300">You&apos;re all caught up!</p>
            </div>
          ) : (
            filtered.map(notif => {
              const sev = SEVERITY_CONFIG[notif.severity] || SEVERITY_CONFIG.info;
              const typ = TYPE_CONFIG[notif.type] || TYPE_CONFIG.analysis;
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.read) markAsRead(notif.id);
                    if (notif.link) window.location.href = notif.link;
                  }}
                  className={`relative flex gap-3 p-3.5 rounded-xl border cursor-pointer transition-all
                    ${notif.read
                      ? "bg-white border-gray-100 hover:bg-gray-50"
                      : `${sev.bg} ${sev.border} hover:brightness-95`
                    }`}
                >
                  {/* Unread dot */}
                  {!notif.read && (
                    <span className={`absolute top-3 right-3 w-2 h-2 rounded-full ${sev.dot}`} />
                  )}

                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5
                    ${notif.read ? "bg-gray-100" : "bg-white shadow-sm"}`}>
                    {sev.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${typ.pill}`}>
                        {typ.icon}
                        {typ.label}
                      </span>
                    </div>
                    <p className={`text-sm leading-snug mb-0.5 ${notif.read ? "text-gray-500 font-normal" : "text-gray-800 font-semibold"}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-gray-400 line-clamp-2">{notif.message}</p>
                    <p className="text-xs text-gray-300 mt-1.5">{timeAgo(notif.date)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer ── */}
        {notifications.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 shrink-0">
            <p className="text-xs text-center text-gray-400">
              {notifications.length} total · {unread} unread
            </p>
          </div>
        )}
      </div>
    </>
  );
}
