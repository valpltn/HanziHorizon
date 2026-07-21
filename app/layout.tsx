import type { Metadata } from "next";
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
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
      </body>
    </html>
  );
}
