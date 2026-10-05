import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "PlayBeat M3U — IPTV Playlist Manager",
  description: "Create, organize, and export IPTV playlists as M3U / M3U8 files. Import existing playlists, manage channels with stream URLs, logos, categories, and EPG URLs.",
  keywords: ["IPTV", "M3U", "M3U8", "playlist", "playlist manager", "channel", "streaming", "PlayBeat"],
  authors: [{ name: "PlayBeat TV" }],
  openGraph: {
    title: "PlayBeat M3U — IPTV Playlist Manager",
    description: "Create, organize, and export IPTV playlists as M3U / M3U8 files.",
    url: "https://playbeattv.buzz",
    siteName: "PlayBeat M3U",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlayBeat M3U",
    description: "IPTV Playlist Manager — create, organize, export M3U8.",
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#070912] text-zinc-100`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
