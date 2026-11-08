import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "InstaConnect SDK – Instagram Integration for Next.js",
  description:
    "Official Meta Instagram OAuth, Feeds, Reels, Carousels, and Profile SDK for React & Next.js"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        <header className="border-b border-gray-800 bg-gray-900/70 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <span className="inline-block h-3 w-3 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600" />
              <span>InstaConnect</span>
            </Link>
            <nav className="flex items-center gap-6 text-sm font-medium text-gray-300">
              <Link href="/dashboard" className="hover:text-white">
                Dashboard
              </Link>
              <Link href="/dashboard/feed" className="hover:text-white">
                Feed & Reels
              </Link>
              <Link href="/dashboard/profile" className="hover:text-white">
                Profile
              </Link>
              <Link href="/dashboard/settings" className="hover:text-white">
                Settings
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}

