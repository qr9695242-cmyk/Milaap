"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/rooms", label: "Rooms", icon: "◈" },
  { href: "/leaderboard", label: "Rank", icon: "▲" },
  { href: "/wallet", label: "Wallet", icon: "◆" },
  { href: "/profile", label: "Profile", icon: "●" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/5 bg-panel/90 backdrop-blur-lg pb-safe">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-1.5 py-4 text-sm transition-colors active:opacity-70 ${
                  active ? "text-ink" : "text-mist"
                }`}
              >
                <span
                  className={`text-2xl leading-none ${
                    active ? "glow-text" : ""
                  }`}
                >
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
