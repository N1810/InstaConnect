import React from "react";
import Link from "next/link";
import { isInstagramEnvConfigured } from "@/lib/instagram";

export default function LandingPage() {
  const configured = isInstagramEnvConfigured();

  return (
    <div className="space-y-12 py-8">
      <section className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900 to-purple-950/40 p-10">
        <div className="max-w-3xl space-y-6">
          <span className="inline-flex items-center rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-xs font-semibold text-pink-400">
            Official Meta Instagram Login API • Next.js App Router
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Connect Instagram Professional Accounts to Next.js in Minutes
          </h1>
          <p className="text-lg text-gray-300">
            InstaConnect provides zero-config OAuth route handlers, automatic 60-day token
            management, cursor pagination, and accessible React components for Posts, Reels, and
            Carousels.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a
              href="/api/instagram/connect"
              className="rounded-xl bg-gradient-to-r from-amber-500 via-pink-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-95"
            >
              Connect Instagram Account
            </a>
            <Link
              href="/dashboard"
              className="rounded-xl border border-gray-700 bg-gray-800/80 px-6 py-3 text-sm font-semibold text-gray-200 hover:bg-gray-800"
            >
              Open Dashboard
            </Link>
          </div>
          {!configured && (
            <p className="text-xs text-amber-400">
              Note: Environment variables (INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET,
              INSTAGRAM_REDIRECT_URI) are not yet set in `.env.local`. Configure them in{" "}
              <Link href="/dashboard/settings" className="underline">
                Settings
              </Link>{" "}
              before initiating OAuth.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
          <h2 className="text-base font-semibold text-white">1. Official Meta OAuth</h2>
          <p className="mt-2 text-sm text-gray-400">
            Built-in CSRF state verification, short-lived to 60-day long-lived token exchange, and
            automatic refresh before expiration.
          </p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
          <h2 className="text-base font-semibold text-white">2. Posts, Reels & Carousels</h2>
          <p className="mt-2 text-sm text-gray-400">
            Normalized TypeScript models for IMAGE, VIDEO, CAROUSEL_ALBUM, and REELS with child
            media traversal and cursor pagination.
          </p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
          <h2 className="text-base font-semibold text-white">3. Headless Hooks & UI</h2>
          <p className="mt-2 text-sm text-gray-400">
            Use ready-made <code>&lt;InstagramFeed /&gt;</code> and{" "}
            <code>&lt;InstagramReels /&gt;</code> components or build custom experiences with{" "}
            <code>useInstagramFeed()</code>.
          </p>
        </div>
      </section>
    </div>
  );
}

