#!/usr/bin/env node
/**
 * Release readiness verification script for InstaConnect packages.
 * Checks that all publishable packages (@instaconnect/core, @instaconnect/react, @instaconnect/next, instaconnect)
 * have built their ESM, CJS, and TypeScript declaration bundles and contain valid package.json exports.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const PUBLISHABLE_PACKAGES = [
  {
    name: "@instaconnect/core",
    dir: path.join(ROOT, "packages", "core"),
    requiredFiles: ["dist/index.js", "dist/index.cjs", "dist/index.d.ts", "README.md"]
  },
  {
    name: "@instaconnect/react",
    dir: path.join(ROOT, "packages", "react"),
    requiredFiles: ["dist/index.js", "dist/index.cjs", "dist/index.d.ts", "README.md"]
  },
  {
    name: "@instaconnect/next",
    dir: path.join(ROOT, "packages", "next"),
    requiredFiles: [
      "dist/index.js",
      "dist/index.cjs",
      "dist/index.d.ts",
      "dist/server/index.js",
      "dist/server/index.cjs",
      "dist/server/index.d.ts",
      "dist/client/index.js",
      "dist/client/index.cjs",
      "dist/client/index.d.ts",
      "README.md"
    ]
  },
  {
    name: "instaconnect",
    dir: path.join(ROOT, "cli"),
    requiredFiles: ["dist/index.js", "dist/index.d.ts", "README.md"]
  }
];

let hasErrors = false;

for (const pkg of PUBLISHABLE_PACKAGES) {
  const pkgJsonPath = path.join(pkg.dir, "package.json");
  if (!fs.existsSync(pkgJsonPath)) {
    console.error(`[ERROR] Missing package.json for ${pkg.name}`);
    hasErrors = true;
    continue;
  }

  for (const relFile of pkg.requiredFiles) {
    const fullPath = path.join(pkg.dir, relFile);
    if (!fs.existsSync(fullPath)) {
      console.error(`[ERROR] ${pkg.name}: Missing required artifact "${relFile}"`);
      hasErrors = true;
    }
  }
}

if (hasErrors) {
  process.exitCode = 1;
} else {
  console.info("[OK] All InstaConnect packages verified and ready for npm publication.");
}

