import { Playfair_Display, Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import InstallPrompt from "@/components/InstallPrompt";
import UpdateAvailableBanner from "@/components/UpdateAvailableBanner";
import AnalyticsPageviews from "@/components/AnalyticsPageviews";

const display = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["700", "800", "900"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

export const metadata = {
  title: "Milaap — Streaming, Rooms & Rewards",
  description: "Go live, join audio rooms, and earn.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Milaap",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0806",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-body bg-void min-h-screen">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <InstallPrompt />
            <UpdateAvailableBanner />
            <Suspense fallback={null}>
              <AnalyticsPageviews />
            </Suspense>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
