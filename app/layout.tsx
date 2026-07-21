import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hanzi-horizon-learn.vaplat31.chatgpt.site"),
  applicationName: "Hanzi Horizon",
  title: { default: "Hanzi Horizon", template: "%s · Hanzi Horizon" },
  description: "Apprendre le chinois avec 11 092 mots HSK, des quiz et des révisions intelligentes.",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Hanzi Horizon",
    title: "Hanzi Horizon",
    description: "Un mot, une révision, puis un défi.",
    images: [{ url: "/og.png", width: 1730, height: 909, alt: "Hanzi Horizon" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hanzi Horizon",
    description: "Un mot, une révision, puis un défi.",
    images: ["/og.png"],
  },
  appleWebApp: { capable: true, title: "Hanzi Horizon", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icon-192.png", type: "image/png", sizes: "192x192" }],
    shortcut: "/icon-192.png",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#315f52",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        {process.env.NODE_ENV === "production" && <script src="/register-sw.js" defer />}
      </body>
    </html>
  );
}
