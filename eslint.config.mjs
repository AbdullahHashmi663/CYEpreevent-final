import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".agents/**",
    ".npm-cache/**",
    "test-results/**",
  ]),
  // Retained offline asset utilities use Node's CommonJS API.
  { files: ["scripts/extract.js", "scripts/reencode_frames.js"], rules: { "@typescript-eslint/no-require-imports": "off" } },
]);

export default eslintConfig;
