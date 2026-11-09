#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

export interface ProjectDetectionResult {
  isNextJs: boolean;
  routerType: "app" | "pages" | "none";
  baseDir: string;
  usesSrcDir: boolean;
}

/**
 * Detects whether the target directory is a Next.js project and whether it uses App Router or Pages Router.
 */
export function detectProjectStructure(cwd: string): ProjectDetectionResult {
  const pkgPath = path.join(cwd, "package.json");
  let isNextJs = false;

  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      isNextJs = Boolean(pkg.dependencies?.next || pkg.devDependencies?.next);
    } catch {
      isNextJs = false;
    }
  }

  const srcAppDir = path.join(cwd, "src", "app");
  const rootAppDir = path.join(cwd, "app");
  const srcPagesDir = path.join(cwd, "src", "pages");
  const rootPagesDir = path.join(cwd, "pages");

  if (fs.existsSync(srcAppDir)) {
    return { isNextJs: true, routerType: "app", baseDir: srcAppDir, usesSrcDir: true };
  }
  if (fs.existsSync(rootAppDir)) {
    return { isNextJs: true, routerType: "app", baseDir: rootAppDir, usesSrcDir: false };
  }
  if (fs.existsSync(srcPagesDir)) {
    return { isNextJs: true, routerType: "pages", baseDir: srcPagesDir, usesSrcDir: true };
  }
  if (fs.existsSync(rootPagesDir)) {
    return { isNextJs: true, routerType: "pages", baseDir: rootPagesDir, usesSrcDir: false };
  }

  return { isNextJs, routerType: "none", baseDir: cwd, usesSrcDir: fs.existsSync(path.join(cwd, "src")) };
}

const ENV_TEMPLATE = `# InstaConnect - Meta Instagram API Configuration
INSTAGRAM_APP_ID=your_instagram_app_id
INSTAGRAM_APP_SECRET=your_instagram_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/instagram/callback
INSTAGRAM_API_VERSION=v21.0
INSTACONNECT_STATE_SECRET=replace_with_32_byte_random_hex
`;

const LIB_CLIENT_TEMPLATE = `import { InstagramClient } from "@neerajkr1810/instaconnect-core";

export const instagram = new InstagramClient({
  appId: process.env.INSTAGRAM_APP_ID!,
  appSecret: process.env.INSTAGRAM_APP_SECRET!,
  redirectUri: process.env.INSTAGRAM_REDIRECT_URI!,
  apiVersion: process.env.INSTAGRAM_API_VERSION ?? "v21.0",
  stateSecret: process.env.INSTACONNECT_STATE_SECRET
});
`;

const APP_ROUTER_CALLBACK_TEMPLATE = `import { createInstagramCallbackHandler } from "@neerajkr1810/instaconnect-next/server";
import { instagram } from "@/lib/instagram";

export const GET = createInstagramCallbackHandler({
  client: instagram,
  successRedirectUrl: "/dashboard",
  onSuccess: async (account) => {
    console.info("Connected Instagram account:", account.accountId);
  }
});
`;

const APP_ROUTER_CONNECT_TEMPLATE = `import { createInstagramConnectHandler } from "@neerajkr1810/instaconnect-next/server";
import { instagram } from "@/lib/instagram";

export const GET = createInstagramConnectHandler({
  client: instagram
});
`;

const APP_ROUTER_MEDIA_TEMPLATE = `import { createInstagramMediaHandler } from "@neerajkr1810/instaconnect-next/server";
import { instagram } from "@/lib/instagram";

export const GET = createInstagramMediaHandler({
  client: instagram
});
`;

const APP_ROUTER_PROFILE_TEMPLATE = `import { createInstagramProfileHandler } from "@neerajkr1810/instaconnect-next/server";
import { instagram } from "@/lib/instagram";

export const GET = createInstagramProfileHandler({
  client: instagram
});
`;

function writeFileSafely(filePath: string, content: string, force = false): "created" | "skipped" {
  if (fs.existsSync(filePath) && !force) {
    return "skipped";
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  return "created";
}

export interface InitCommandResult {
  detection: ProjectDetectionResult;
  createdFiles: string[];
  skippedFiles: string[];
}

/**
 * Executes `instaconnect init` in the given directory.
 * Never overwrites existing files unless `force: true` is explicitly passed.
 */
export function runInitCommand(
  cwd: string,
  options: { force?: boolean; createRoutes?: boolean } = {}
): InitCommandResult {
  const detection = detectProjectStructure(cwd);
  const createdFiles: string[] = [];
  const skippedFiles: string[] = [];
  const force = options.force ?? false;
  const createRoutes = options.createRoutes ?? true;

  const record = (relPath: string, status: "created" | "skipped") => {
    if (status === "created") {
      createdFiles.push(relPath);
    } else {
      skippedFiles.push(relPath);
    }
  };

  // 1. Write .env.example
  const envExamplePath = path.join(cwd, ".env.example");
  record(".env.example", writeFileSafely(envExamplePath, ENV_TEMPLATE, force));

  if (createRoutes && detection.routerType === "app") {
    const libRoot = detection.usesSrcDir ? path.join(cwd, "src", "lib") : path.join(cwd, "lib");
    const clientFile = path.join(libRoot, "instagram.ts");
    record(
      path.relative(cwd, clientFile),
      writeFileSafely(clientFile, LIB_CLIENT_TEMPLATE, force)
    );

    const routes: Array<[string, string]> = [
      [path.join(detection.baseDir, "api", "instagram", "connect", "route.ts"), APP_ROUTER_CONNECT_TEMPLATE],
      [path.join(detection.baseDir, "api", "instagram", "callback", "route.ts"), APP_ROUTER_CALLBACK_TEMPLATE],
      [path.join(detection.baseDir, "api", "instagram", "media", "route.ts"), APP_ROUTER_MEDIA_TEMPLATE],
      [path.join(detection.baseDir, "api", "instagram", "profile", "route.ts"), APP_ROUTER_PROFILE_TEMPLATE]
    ];

    for (const [fullPath, tpl] of routes) {
      record(path.relative(cwd, fullPath), writeFileSafely(fullPath, tpl, force));
    }
  }

  return {
    detection,
    createdFiles,
    skippedFiles
  };
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? "init";
  const force = args.includes("--force");
  const noRoutes = args.includes("--no-routes");

  if (command === "--help" || command === "-h" || command === "help") {
    console.info(`
InstaConnect CLI (v1.0.0)
Usage:
  npx instaconnect init [--force] [--no-routes]
`);
    return;
  }

  if (command !== "init") {
    console.error(`Unknown command "${command}". Run "npx instaconnect --help" for usage.`);
    process.exitCode = 1;
    return;
  }

  const cwd = process.cwd();
  const result = runInitCommand(cwd, {
    force,
    createRoutes: !noRoutes
  });

  console.info(`InstaConnect Project Detection:
  - Next.js Detected: ${result.detection.isNextJs ? "Yes" : "No"}
  - Router Type: ${result.detection.routerType}
  - Created Files (${result.createdFiles.length}): ${result.createdFiles.join(", ") || "None"}
  - Skipped Existing Files (${result.skippedFiles.length}): ${result.skippedFiles.join(", ") || "None"}
`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("instaconnect")) {
  main();
}

