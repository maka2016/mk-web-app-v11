import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import { defineConfig } from 'eslint/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

// 从 nextCoreWebVitals 中提取 @typescript-eslint 插件实例
const typescriptPluginConfig = nextCoreWebVitals.find(
  config => config.plugins?.['@typescript-eslint']
);
const typescriptPlugin =
  typescriptPluginConfig?.plugins?.['@typescript-eslint'] || typescriptEslint;

export default defineConfig([
  ...nextCoreWebVitals,
  ...compat.extends('prettier'),
  {
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      // 仅使用 Prettier 作为独立格式化工具，避免与 ESLint 循环冲突
      // 如果以后需要在 ESLint 中开启 Prettier 校验，可以再打开这一行
      // prettier,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [1],
      '@typescript-eslint/no-explicit-any': 'off',
      // 关闭通过 ESLint 触发的 Prettier 校验，避免和 Prettier 插件/格式化保存互相触发
      'prettier/prettier': 'off',
      'react-hooks/set-state-in-effect': [1],
      '@next/next/no-img-element': 'off',
      'react-hooks/rules-of-hooks': 'off',
    },
  },
]);
