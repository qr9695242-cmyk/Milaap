"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function OnboardingGate() {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user || !profile) return;
    const complete = profile.onboardingComplete === true;
    if (!complete && pathname !== "/onboarding") router.replace("/onboarding");
  }, [loading, user, profile, pathname, router]);

  return null;
}
