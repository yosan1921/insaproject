"use client";

import { useEffect, useState } from "react";

interface ToastNotification {
    id: string;
    title: string;
    message: string;
    link?: string;
}

export default function CriticalRiskToast() {
    const [toasts, setToasts] = useState<ToastNotification[]>([]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const es = new EventSource("/api/notifications/stream");

        es.addEventListener("notification", (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.severity === "critical") {
                    const toast: ToastNotification = {
                        id: data.id || String(Date.now()),
                        title: data.title,
                        message: data.message,
                        link: data.link,
                    };
                    setToasts(prev => [...prev, toast]);
                    // Auto-dismiss after 8 seconds
                    setTimeout(() => {
                        setToasts(prev => prev.filter(t => t.id !== toast.id));
                    }, 8000);
                }
            } catch { }
        });

        return () => es.close();
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[9999] space-y-3 max-w-sm">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className="bg-red-900 border border-red-500 rounded-lg p-4 shadow-2xl animate-in slide-in-from-right"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2">
                            <span className="text-red-400 text-xl mt-0.5">🚨</span>
                            <div>
                                <p className="text-white font-bold text-sm">{toast.title}</p>
                                <p className="text-red-200 text-xs mt-1">{toast.message}</p>
                                {toast.link && (
                                    <a
                                        href={toast.link}
                                        className="text-red-300 hover:text-white text-xs underline mt-1 inline-block"
                                    >
                                        View Details →
                                    </a>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                            className="text-red-400 hover:text-white text-lg leading-none"
                        >
                            ×
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
