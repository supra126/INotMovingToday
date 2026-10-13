import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOTS = ["app", "components"];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : /\.tsx?$/.test(name) ? [full] : [];
  });
}

describe("accent colour", () => {
  it("never pairs the near-white accent background with white text", () => {
    const offenders = ROOTS.flatMap(files).flatMap((file) =>
      (readFileSync(file, "utf8").match(/["'`][^"'`]*bg-accent(?![-\w])[^"'`]*["'`]/g) ?? [])
        .filter((cls) => /\btext-white\b/.test(cls))
        .map((cls) => `${file}: ${cls}`)
    );
    expect(offenders).toEqual([]);
  });
});
