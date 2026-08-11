/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    // NOTE: this array only ADDS extra packages to Next's optimizer — it
    // cannot be used to turn optimization OFF for lucide-react, since
    // lucide-react is hardcoded into Next's own default list regardless of
    // what's here. That's fine: the optimizer scans the actually-installed
    // lucide-react package's barrel file to resolve named imports (e.g.
    // `import { House } from "lucide-react"` in components/BottomNav.jsx),
    // so it stays correct across lucide-react versions.
    optimizePackageImports: [],
  },
};

module.exports = nextConfig;
