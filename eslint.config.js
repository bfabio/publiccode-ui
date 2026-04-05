import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ["**/*.astro"],
    rules: {
      "jsx-a11y/no-noninteractive-element-interactions": "off",
    },
  },
  {
    ignores: ["dist/", ".astro/"],
  },
);
