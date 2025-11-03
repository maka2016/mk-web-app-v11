import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import prettier from "eslint-plugin-prettier";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([{
    extends: [...nextCoreWebVitals, ...compat.extends("prettier")],

    plugins: {
        "@typescript-eslint": typescriptEslint,
        prettier,
    },

    rules: {
        "@typescript-eslint/no-unused-vars": [1],
        "@typescript-eslint/no-explicit-any": "off",
        "prettier/prettier": [1],
    },
}]);