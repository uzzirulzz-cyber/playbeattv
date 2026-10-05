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
  title: "PlayBeat TV — Free Movies, Series & Documentaries",
  description: "Stream thousands of free, legal movies, web series, documentaries, animations and short films. Sourced exclusively from public-domain, Creative Commons, and official embeddable sources.",
  keywords: ["free movies", "public domain films", "creative commons", "free streaming", "web series", "documentaries", "PlayBeat TV"],
  authors: [{ name: "PlayBeat TV" }],
  openGraph: {
    title: "PlayBeat TV — Free Movies, Series & Documentaries",
    description: "Stream thousands of free, legal movies, web series, documentaries, animations and short films.",
    url: "https://playbeattv.buzz",
    siteName: "PlayBeat TV",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlayBeat TV",
    description: "Stream free, legal movies, series, documentaries and more.",
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
