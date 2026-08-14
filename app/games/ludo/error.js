"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function LudoError({ error, reset }) {
  useEffect(() => { console.error("Ludo error:", error); }, [error]);
  return (
    <main className="min-h-screen bg-void text-ink flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-3xl bg-panel p-6 text-center ring-1 ring-white/10">
        <h1 className="font-display text-xl font-bold">Ludo could not open</h1>
        <p className="mt-2 text-sm text-mist">Try again. If this is an online match, make sure your Firebase login is active.</p>
        <div className="mt-5 flex gap-2 justify-center">
          <button onClick={() => reset()} className="rounded-xl bg-gold px-4 py-2 text-sm font-bold text-black">Try again</button>
          <Link href="/" className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold">Home</Link>
        </div>
      </div>
    </main>
  );
}
