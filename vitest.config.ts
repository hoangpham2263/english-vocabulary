import { existsSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

// The course content lives in a private repo; its tests run only where it is checked out.
const contentTests = existsSync("data") ? [] : ["src/lib/*-data.test.ts", "src/lib/ipa-audio.test.ts"];

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", exclude: [...configDefaults.exclude, "dist/**", ".wrangler/**", ...contentTests] },
});
