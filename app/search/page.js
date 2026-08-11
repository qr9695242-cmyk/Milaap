"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { searchUsers } from "@/lib/search";
import UserRow from "@/components/UserRow";

export default function SearchPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [text, setText] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const rows = await searchUsers(text);
        setResults(rows.filter((r) => r.id !== user?.uid));
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [text, user?.uid]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void">
        <p className="text-mist text-sm">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-void pb-10">
      <header className="flex items-center gap-3 px-5 pt-6">
        <Link href="/" className="text-lg text-ink/80">←</Link>
        <h1 className="font-display text-xl font-extrabold text-ink">Search</h1>
      </header>

      <div className="mx-5 mt-4">
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search by name…"
          className="w-full rounded-full bg-panel px-4 py-2.5 text-sm text-ink ring-1 ring-white/10 placeholder:text-mist"
        />
      </div>

      <section className="mx-5 mt-4 space-y-2">
        {searching && <p className="text-center text-xs text-mist">Searching…</p>}
        {!searching && text.trim() && results.length === 0 && (
          <p className="text-center text-xs text-mist">No users found for "{text}"</p>
        )}
        {results.map((u) => (
          <UserRow key={u.id} u={u} />
        ))}
      </section>
    </main>
  );
}
