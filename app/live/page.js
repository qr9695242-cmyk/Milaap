"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LivePage() {
 const router = useRouter();
 useEffect(() => {
 router.replace("/live-match");
 }, [router]);
 return <main className="min-h-screen bg-void text-ink flex items-center justify-center"><p className="text-sm text-mist">Opening Video / Music…</p></main>;
}
