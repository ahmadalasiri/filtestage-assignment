import globals from "globals";
import js from "@eslint/js";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import playwright from "eslint-plugin-playwright";

export default [
  js.configs.recommended,
  {
    ...playwright.configs["flat/recommended"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  prettierRecommended,
];
