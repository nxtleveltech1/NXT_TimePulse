import tseslint from "typescript-eslint"
import nextPlugin from "@next/eslint-plugin-next"

export default tseslint.config(
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  {
    extends: [
      ...tseslint.configs.recommended,
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "warn",
    },
  },
  {
    ignores: [
      ".next/**",
      "generated/**",
      "node_modules/**",
      "prisma/migrations/**",
      "types/**",
    ],
  }
)
