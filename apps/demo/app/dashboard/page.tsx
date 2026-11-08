import React from "react";
import Link from "next/link";
import { getInstagramServerClient, isInstagramEnvConfigured } from "@/lib/instagram";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const client = getInstagramServerClient();
  const envConfigured = isInstagramEnvConfigured();

  let profile = null;
  let recentMedia = null;
  let errorMessage: string | null = null;

  try {
    profile = await client.profile.get();
    recentMedia = await client.media.list({ limit: 6 });
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Not connected to an Instagram account.";
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Instagram Account Dashboard</h1>
          <p className="text-sm text-gray-400">
            Overview of your connected Instagram Professional (Business / Creator) account.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/feed"
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium hover:bg-gray-700"
          >
            View Full Feed
          </Link>
          <Link
            href="/dashboard/settings"
            className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-500"
          >
            Manage Connection
          </Link>
        </div>
      </div>

      {!envConfigured && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-300">
          Environment variables (`INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`,
          `INSTAGRAM_REDIRECT_URI`) are not set. Visit{" "}
          <Link href="/dashboard/settings" className="font-semibold underline">
            Settings
          </Link>{" "}
          for setup instructions.
        </div>
      )}

      {profile ? (
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <span className="text-xs uppercase tracking-wider text-gray-400">Connected Handle</span>
            <p className="mt-2 text-2xl font-bold text-white">@{profile.username}</p>
            <span className="mt-2 inline-block rounded-full bg-pink-500/20 px-2.5 py-0.5 text-xs font-medium text-pink-400">
              {profile.accountType}
            </span>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <span className="text-xs uppercase tracking-wider text-gray-400">Total Media</span>
            <p className="mt-2 text-2xl font-bold text-white">{profile.mediaCount}</p>
            <p className="mt-1 text-xs text-gray-400">Posts, Reels & Carousels</p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <span className="text-xs uppercase tracking-wider text-gray-400">Loaded Items</span>
            <p className="mt-2 text-2xl font-bold text-white">{recentMedia?.data.length ?? 0}</p>
            <p className="mt-1 text-xs text-gray-400">
              Next page available: {recentMedia?.paging.hasNextPage ? "Yes" : "No"}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center">
          <h2 className="text-lg font-semibold text-white">No Instagram Account Authorized</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-gray-400">{errorMessage}</p>
          <div className="mt-6">
            <a
              href="/api/instagram/connect"
              className="inline-flex items-center rounded-xl bg-gradient-to-r from-amber-500 via-pink-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Authorize with Instagram Login
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

