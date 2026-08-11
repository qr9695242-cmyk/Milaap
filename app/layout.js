import { Manrope, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import { InstallProvider } from "@/lib/InstallContext";
import InstallPrompt from "@/components/InstallPrompt";

const display = Manrope({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["700", "800"],
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
  themeColor: "#0B0714",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-body bg-void min-h-screen">
        <ThemeProvider>
          <AuthProvider>
            <InstallProvider>
              {children}
              <InstallPrompt />
            </InstallProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
