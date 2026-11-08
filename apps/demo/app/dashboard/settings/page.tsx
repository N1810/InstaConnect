"use client";

import React from "react";
import { InstagramConnectButton, useInstagramConnection } from "@instaconnect/react";

export default function DashboardSettingsPage() {
  const { connected, profile, loading, disconnect } = useInstagramConnection();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Connection & Account Settings</h1>
        <p className="text-sm text-gray-400">
          Manage your Meta OAuth credentials, token lifecycle, and account authorization.
        </p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
        <h2 className="text-lg font-semibold">OAuth Connection Status</h2>
        {loading ? (
          <p className="text-sm text-gray-400">Checking connection status...</p>
        ) : connected && profile ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-emerald-400">
                Connected as @{profile.username} ({profile.accountType})
              </p>
              <p className="text-xs text-gray-400">Instagram Account ID: {profile.id}</p>
            </div>
            <button
              type="button"
              onClick={() => void disconnect()}
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20"
            >
              Disconnect Account
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              No Instagram Professional account is currently authorized.
            </p>
            <InstagramConnectButton />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-3">
        <h2 className="text-lg font-semibold">Required Environment Variables</h2>
        <pre className="overflow-x-auto rounded-lg bg-gray-950 p-4 text-xs text-gray-300">
{`INSTAGRAM_APP_ID=your_meta_instagram_app_id
INSTAGRAM_APP_SECRET=your_meta_instagram_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/instagram/callback
INSTAGRAM_API_VERSION=v21.0
INSTACONNECT_STATE_SECRET=your_32_byte_random_secret`}
        </pre>
      </div>
    </div>
  );
}

