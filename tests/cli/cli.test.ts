import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { detectProjectStructure, runInitCommand } from "../../cli/src/index.js";

describe("instaconnect CLI", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it("detects Next.js App Router projects and generates route handlers without overwriting existing files", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "instaconnect-cli-test-"));
    tempDirs.push(tmpDir);

    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ dependencies: { next: "14.2.0" } }),
      "utf8"
    );
    fs.mkdirSync(path.join(tmpDir, "app"), { recursive: true });

    const detection = detectProjectStructure(tmpDir);
    expect(detection.isNextJs).toBe(true);
    expect(detection.routerType).toBe("app");

    const firstRun = runInitCommand(tmpDir);
    expect(firstRun.createdFiles).toContain(".env.example");
    expect(firstRun.createdFiles.length).toBeGreaterThanOrEqual(5);

    // Second run without --force skips all existing files
    const secondRun = runInitCommand(tmpDir);
    expect(secondRun.createdFiles).toHaveLength(0);
    expect(secondRun.skippedFiles.length).toBeGreaterThanOrEqual(5);
  });
});

