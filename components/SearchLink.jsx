"use client";

import Link from "next/link";

export default function SearchLink() {
  return (
    <Link
      href="/search"
      className="flex h-9 w-9 items-center justify-center rounded-full bg-panel text-base ring-1 ring-white/5"
      aria-label="Search users"
    >
      🔍
    </Link>
  );
}
