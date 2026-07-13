import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { ADSENSE_CLIENT } from "@/lib/ads";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PlayBeat TV — Stream Live TV, Movies & Series",
  description:
    "PlayBeat TV — premium streaming for Live TV, Movies and Series. Watch anywhere, anytime.",
  keywords: ["PlayBeat TV", "IPTV", "Live TV", "Movies", "Series", "Streaming"],
  authors: [{ name: "PlayBeat TV" }],
  metadataBase: new URL("https://playbeat.live"),
  alternates: { canonical: "https://playbeat.live" },
  openGraph: {
    title: "PlayBeat TV",
    description: "Premium streaming for Live TV, Movies & Series.",
    url: "https://playbeat.live",
    siteName: "PlayBeat TV",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlayBeat TV",
    description: "Premium streaming for Live TV, Movies & Series.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google AdSense loader */}
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
          <SonnerToaster />
        </Providers>
      </body>
    </html>
  );
}
