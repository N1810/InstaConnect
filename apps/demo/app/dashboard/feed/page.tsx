"use client";

import React, { useState } from "react";
import { InstagramFeed, InstagramReels } from "@neerajkr1810/instaconnect-react";

export default function DashboardFeedPage() {
  const [activeTab, setActiveTab] = useState<"all" | "reels">("all");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Instagram Feed & Reels</h1>
          <p className="text-sm text-gray-400">
            Live posts, multi-item carousels, and vertical Reels fetched via `@instaconnect/react`.
          </p>
        </div>
        <div className="flex rounded-lg border border-gray-800 bg-gray-900 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${
              activeTab === "all" ? "bg-pink-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            All Posts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reels")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${
              activeTab === "reels" ? "bg-pink-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Reels Only
          </button>
        </div>
      </div>

      {activeTab === "all" ? (
        <InstagramFeed limit={12} columns={3} showCaptions showReels showLoadMore />
      ) : (
        <InstagramReels limit={6} columns={3} autoplay={false} showControls />
      )}
    </div>
  );
}

