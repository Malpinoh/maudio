import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // ── MAUDIO client boundaries ────────────────────────────────────────────
  // MAUDIO has exactly two clients: the Web Client (src/web) and the Mobile
  // Client (src/mobile). They share src/shared + the Supabase backend only.
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@web/*", "@mobile/*", "**/web/**", "**/mobile/**"], message: "src/shared must not depend on a client. Move client-specific code into src/web or src/mobile." },
          ],
        },
      ],
    },
  },
  {
    files: ["src/web/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@mobile/*/**"], message: "Reach native capabilities through the '@mobile' capability layer (src/mobile/index.ts), which no-ops on the web." },
          ],
        },
      ],
    },
  },
  {
    files: ["src/mobile/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@web/pages/*", "@web/components/*"], message: "The Mobile Client must not import Web Client pages or components." },
          ],
        },
      ],
    },
  }
);
