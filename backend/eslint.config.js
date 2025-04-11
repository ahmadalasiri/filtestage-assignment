import globals from "globals";
import js from "@eslint/js";
import prettierRecommended from "eslint-plugin-prettier/recommended";

export default [
  js.configs.recommended,
  { languageOptions: { globals: globals.node } },
  prettierRecommended,
];
