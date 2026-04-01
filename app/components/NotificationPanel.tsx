"use client";

import { useEffect, useState, useCallback } from "react";

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

const SEVERITY_STYLES: Record<string, string> = {
    critical: "border-l-4 border-red-500 bg-red-500/10",
    high: "border-l-4 border-orange-500 bg-orange-500/10",
    medium: "border-l-4 border-yellow-500 bg-yellow-500/10",
    low: "border-l-4 border-green-500 bg-green-500/10",
    info: "border-l-4 border-blue-500 bg-blue-500/10",
};

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
    questionnaire: { label: "New Response", color: "bg-blue-900 text-blue-200" },
    analysis: { label: "Analysis Done", color: "bg-green-900 text-green-200" },
    critical: { label: "🚨 Critical Risk", color: "bg-red-900 text-red-200" },
    asset: { label: "Asset Scan", color: "bg-purple-900 text-purple-200" },
    threat: { label: "Threat Alert", color: "bg-orange-900 text-orange-200" },
};

const FILTER_OPTIONS = ["all", "critical", "questionnaire", "analysis", "asset", "threat"];

export default function NotificationPanel({ onClose, onCountChange }: {
    onClose: () => void;
    onCountChange?: (count: number) => void;
}) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch("/api/notifications");
            const data = await res.json();
            if (Array.isArray(data)) {
                setNotifications(data);
                const unread = data.filter((n: Notification) => !n.read).length;
                onCountChange?.(unread);
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    }, [onCountChange]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Real-time updates via SSE
    useEffect(() => {
        if (typeof window === "undefined") return;
        const es = new EventSource("/api/notifications/stream");
        es.addEventListener("notification", () => {
            fetchNotifications();
        });
        return () => es.close();
    }, [fetchNotifications]);

    const markAsRead = async (id: string) => {
        await fetch("/api/notifications/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notificationId: id }),
        });
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
        const unread = notifications.filter(n => !n.read && n.id !== id).length;
        onCountChange?.(unread);
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

    const filtered = filter === "all"
        ? notifications
        : notifications.filter(n => n.type === filter || n.severity === filter);

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="absolute left-full bottom-12 ml-2 w-96 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-100">Notifications</h3>
                    {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="text-xs text-blue-400 hover:text-blue-300 transition"
                        >
                            Mark all read
                        </button>
                    )}
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 p-2 border-b border-slate-700 overflow-x-auto">
                {FILTER_OPTIONS.map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap transition capitalize ${filter === f
                                ? "bg-blue-600 text-white"
                                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Notifications list */}
            <div className="overflow-y-auto flex-1 p-2 space-y-2">
                {loading ? (
                    <div className="text-center p-4 text-slate-400">Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center p-4 text-slate-400">No notifications</div>
                ) : (
                    filtered.map((notif) => {
                        const badge = TYPE_BADGE[notif.type] || TYPE_BADGE.analysis;
                        const severityStyle = SEVERITY_STYLES[notif.severity] || SEVERITY_STYLES.info;
                        return (
                            <div
                                key={notif.id}
                                onClick={() => {
                                    if (!notif.read) markAsRead(notif.id);
                                    if (notif.link) window.location.href = notif.link;
                                }}
                                className={`p-3 rounded-md transition cursor-pointer ${severityStyle} ${notif.read ? "opacity-60" : "opacity-100"
                                    } hover:opacity-100`}
                            >
                                <div className="flex items-start justify-between mb-1">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${badge.color}`}>
                                        {badge.label}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {new Date(notif.date).toLocaleDateString()}
                                    </span>
                                </div>
                                <h4 className={`text-sm mb-1 ${notif.read ? "font-normal text-slate-300" : "font-bold text-white"}`}>
                                    {notif.title}
                                </h4>
                                <p className="text-xs text-slate-400">{notif.message}</p>
                                {!notif.read && (
                                    <div className="mt-1 flex justify-end">
                                        <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
