"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/trackEvent";

// Next.js App Router doesn't fire full page loads on client-side
// navigation, so Firebase Analytics' automatic page_view tracking misses
// most route changes. This logs one manually whenever the path changes.
export default function AnalyticsPageviews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams?.toString();
    trackEvent("page_view", {
      page_path: query ? `${pathname}?${query}` : pathname,
    });
  }, [pathname, searchParams]);

  return null;
}
