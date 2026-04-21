"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import NotificationPanel from "./NotificationPanel";
import CriticalRiskToast from "./CriticalRiskToast";

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupName)
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };

  useEffect(() => {
    // Fetch unread count on mount
    fetch("/api/notifications/count")
      .then(r => r.json())
      .then(d => setUnreadCount(d.count || 0))
      .catch(() => { });

    // Real-time badge update via SSE
    if (typeof window === "undefined") return;

    const es = new EventSource("/api/notifications/stream");
    es.addEventListener("notification", () => {
      fetch("/api/notifications/count")
        .then(r => r.json())
        .then(d => setUnreadCount(d.count || 0))
        .catch(() => { });
    });

    return () => es.close();
  }, []);

  const navigationGroups = [
    {
      type: 'single' as const,
      name: "Dashboard",
      href: "/dashboard",
    },
    {
      type: 'single' as const,
      name: "National Benchmarking",
      href: "/benchmarking",
    },
    {
      type: 'group' as const,
      name: "Assessment & Analysis",
      icon: "📊",
      items: [
        { name: "Assessment", href: "/questionnaires" },
        { name: "Risk Evaluation", href: "/risk-evaluation" },
        { name: "ALE Analysis", href: "/ale-analysis" },
        { name: "Trend Analysis", href: "/trends" },
      ]
    },
    {
      type: 'group' as const,
      name: "Risk Management",
      icon: "🎯",
      items: [
        { name: "Risk Treatment", href: "/risk-treatment" },
        { name: "Risk Matrix", href: "/risk-matrix" },
        { name: "Risk Register", href: "/risks" },
        { name: "Assignments", href: "/assignments" },
      ]
    },
    {
      type: 'group' as const,
      name: "Assets & Threats",
      icon: "🛡️",
      items: [
        { name: "Asset Inventory", href: "/assets" },
        { name: "Threat Intelligence", href: "/threats" },
      ]
    },
    {
      type: 'group' as const,
      name: "Reports & Compliance",
      icon: "📄",
      items: [
        { name: "Reports", href: "/reports" },
        { name: "Certificates", href: "/certificates" },
      ]
    },
    {
      type: 'single' as const,
      name: "Performance",
      href: "/performance",
    },
    {
      type: 'single' as const,
      name: "Feedback",
      href: "/feedback",
    },
    {
      type: 'single' as const,
      name: "Profile",
      href: "/profile",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 border border-slate-700 rounded-md text-white hover:bg-slate-700 transition shadow-lg"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isMobileMenuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="flex h-screen">
        <aside className={`
          w-64 bg-slate-800 border-r border-slate-700 flex flex-col
          fixed lg:static inset-y-0 left-0 z-40
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Logo - Fixed at top */}
          <div className="p-4 border-b border-slate-700 flex items-center justify-center flex-shrink-0">
            <div className="w-full flex items-center justify-center">
              <Image src="/logo2.png" alt="CSRARS Logo" width={180} height={60} className="object-contain" priority />
            </div>
          </div>

          {/* Navigation - Scrollable */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {navigationGroups.map((item) => {
                if (item.type === 'single') {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`block px-4 py-2 rounded-md transition ${isActive
                          ? "bg-slate-700 text-white"
                          : "text-slate-300 hover:bg-slate-700 hover:text-white"
                          }`}
                      >
                        {item.name}
                      </Link>
                    </li>
                  );
                }

                // Group item
                const isExpanded = expandedGroups.includes(item.name);
                const hasActiveChild = item.items.some(child => pathname === child.href);

                return (
                  <li key={item.name}>
                    <button
                      onClick={() => toggleGroup(item.name)}
                      className={`w-full flex items-center justify-between px-4 py-2 rounded-md transition ${hasActiveChild
                        ? "bg-slate-700/50 text-white"
                        : "text-slate-300 hover:bg-slate-700 hover:text-white"
                        }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{item.icon}</span>
                        <span>{item.name}</span>
                      </span>
                      <svg
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isExpanded && (
                      <ul className="mt-1 ml-4 space-y-1">
                        {item.items.map((subItem) => {
                          const isActive = pathname === subItem.href;
                          return (
                            <li key={subItem.name}>
                              <Link
                                href={subItem.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`block px-4 py-2 rounded-md text-sm transition ${isActive
                                  ? "bg-slate-700 text-white"
                                  : "text-slate-400 hover:bg-slate-700 hover:text-white"
                                  }`}
                              >
                                {subItem.name}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Bottom area: Notifications & Sign Out - Fixed at bottom */}
          <div className="p-4 border-t border-slate-700 space-y-2 relative flex-shrink-0">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition flex items-center justify-center gap-2 relative"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
              </svg>
              Notifications
              {unreadCount > 0 && (
                <span className="absolute top-1 right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <NotificationPanel
                onClose={() => setShowNotifications(false)}
                onCountChange={setUnreadCount}
              />
            )}

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition"
            >
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content - Scrollable with responsive padding */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">{children}</main>
      </div>
      <CriticalRiskToast />
    </div>
  );
}
