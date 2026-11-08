"use client";

import React from "react";
import { InstagramProfile } from "@instaconnect/react";

export default function DashboardProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Instagram Profile</h1>
        <p className="text-sm text-gray-400">
          Retrieved from the official Meta Graph API `/me` endpoint.
        </p>
      </div>
      <InstagramProfile showAvatar showUsername showMediaCount showBio />
    </div>
  );
}

