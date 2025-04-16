import globals from "globals";
import js from "@eslint/js";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import playwright from "eslint-plugin-playwright";

export default [
  { ignores: ["node_modules", "test-results", "playwright-report", ".cache"] },
  js.configs.recommended,
  {
    ...playwright.configs["flat/recommended"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  prettierRecommended,
  {
    rules: {
      "prettier/prettier": [
        "warn",
        {
          endOfLine: "auto",
          singleQuote: false,
          trailingComma: "all",
        },
      ],
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_|next|error|req|res|page|browser|context",
          varsIgnorePattern:
            "^_|cookie|cookieParser|morgan|docsPath|comment|commentWithUrl|formattedDisplayDate|e|err",
        },
      ],
      "no-empty": "warn",
      "no-undef": "warn",
      "playwright/no-wait-for-selector": "warn",
      "playwright/no-wait-for-timeout": "warn",
      "playwright/no-conditional-in-test": "warn",
      "playwright/no-conditional-expect": "warn",
      "playwright/no-networkidle": "warn",
    },
  },
];
