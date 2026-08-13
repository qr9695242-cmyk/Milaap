"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { listenUnreadCount } from "@/lib/notifications";
import { useEffect, useState } from "react";
// NOTE: import icons the normal way, straight from "lucide-react". Do NOT
// hand-write deep paths like "lucide-react/dist/esm/icons/house" — those
// file names shift between lucide-react versions (e.g. rename/alias
// changes), so a hand-guessed path can simply not exist in whatever
// version npm actually installs, which is what broke the Vercel build
// ("Module not found: Can't resolve 'lucide-react/dist/esm/icons/house'").
// Next.js's built-in optimizePackageImports handles lucide-react by
// scanning the *installed* package's real barrel file, so it always maps
// these named imports to whatever paths actually exist — no guessing.
//
// This project is pinned to lucide-react ^0.383.0, and that version does
// NOT export a "House" icon yet (that name was added in a later lucide
// release) — it only has "Home". Importing House on this version silently
// resolves to `undefined` (no build error, since it's a valid barrel
// import syntactically) and then crashes every page that renders
// BottomNav at prerender time with "Element type is invalid ... got:
// undefined". So we import it as HomeIcon here instead.
import { Home as HomeIcon, Radio, MessageCircle, Gamepad2, CircleUser } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

// Real vector icons (lucide-react) instead of text/emoji glyphs — emoji
// glyphs render as low-res bitmap fonts on a lot of devices/browsers
// (fuzzy at small sizes, inconsistent across OSes). SVG icons stay crisp
// at any size and scale with the active/inactive color state below.
const TABS = [
  { href: "/", labelKey: "nav_home", Icon: HomeIcon },
  { href: "/rooms", labelKey: "nav_live", Icon: Radio },
  { href: "/messages", labelKey: "nav_chat", Icon: MessageCircle },
  { href: "/games", labelKey: "nav_games", Icon: Gamepad2 },
  { href: "/profile", labelKey: "nav_me", Icon: CircleUser },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    return listenUnreadCount(user.uid, setUnread);
  }, [user]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0b0714]/88 backdrop-blur-2xl pb-safe shadow-[0_-10px_40px_rgba(0,0,0,.28)]">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.Icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link href={tab.href} className={`relative flex flex-col items-center gap-1 py-3.5 text-[11px] font-semibold transition-all active:scale-95 ${active ? "text-white" : "text-white/45"}`}>
                {active && <span className="absolute top-0 h-1 w-8 rounded-b-full bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-300" />}
                <span className={`relative flex h-7 w-7 items-center justify-center ${active ? "drop-shadow-[0_0_12px_rgba(192,132,252,.8)]" : ""}`}>
                  <Icon size={22} strokeWidth={active ? 2.4 : 2} fill={active && tab.href === "/rooms" ? "currentColor" : "none"} />
                  {tab.href === "/messages" && unread > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">{unread > 9 ? "9+" : unread}</span>
                  )}
                </span>
                {t(tab.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
