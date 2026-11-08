import React from "react";

export function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        connected
          ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border border-gray-700 bg-gray-800 text-gray-400"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-gray-500"}`}
      />
      {connected ? "Connected to Meta API" : "Disconnected"}
    </span>
  );
}

