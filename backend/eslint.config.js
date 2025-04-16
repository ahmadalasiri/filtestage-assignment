import globals from "globals";
import js from "@eslint/js";
import prettierRecommended from "eslint-plugin-prettier/recommended";

export default [
  {
    ignores: ["node_modules/**", "uploads/**", "logs/**", "docs/swagger.yaml"],
  },
  js.configs.recommended,
  { languageOptions: { globals: globals.node } },
  prettierRecommended,
  {
    rules: {
      "prettier/prettier": [
        "error",
        {
          endOfLine: "auto",
          singleQuote: false,
          trailingComma: "all",
        },
      ],
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_|next|error|req|res",
          varsIgnorePattern: "^_|cookie|cookieParser|morgan|docsPath",
        },
      ],
      "no-empty": "warn",
      "no-undef": "warn",
      "no-useless-catch": "warn",
    },
  },
];
