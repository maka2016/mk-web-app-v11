#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// 获取暂存的文件（从 lint-staged 传递的参数）
const files = process.argv
  .slice(2)
  .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

if (files.length === 0) {
  process.exit(0);
}

let hasError = false;

// 1. 先运行 ESLint 自动修复
console.log('🔍 Running ESLint...');
try {
  const eslintResult = execSync(
    `pnpm exec eslint --fix ${files.map(f => resolve(rootDir, f)).join(' ')}`,
    { cwd: rootDir, stdio: 'pipe', encoding: 'utf-8' }
  );
  // 输出 ESLint 的结果
  if (eslintResult) {
    console.log(eslintResult);
  }
} catch (error) {
  // ESLint 有错误或警告时都会抛出错误
  const eslintOutput = error.stdout || error.stderr || '';
  if (eslintOutput) {
    console.error(eslintOutput);
  }
  // 检查是否有错误（不仅仅是警告）
  if (eslintOutput.includes('error')) {
    console.error('❌ ESLint found errors that cannot be auto-fixed');
    hasError = true;
  } else if (eslintOutput.includes('warning')) {
    // 警告不会阻止提交，但会显示
    console.warn('⚠️  ESLint found warnings (these will not block commit)');
  }
}

// 2. 运行 TypeScript 类型检查
console.log('🔍 Running TypeScript type check...');

// 为每个文件找到对应的 tsconfig.json
const configMap = new Map();
for (const file of files) {
  const filePath = resolve(rootDir, file);
  let currentDir = dirname(filePath);
  let tsconfigPath = null;

  // 向上查找 tsconfig.json
  while (currentDir !== rootDir && currentDir !== dirname(currentDir)) {
    const potentialConfig = resolve(currentDir, 'tsconfig.json');
    if (existsSync(potentialConfig)) {
      tsconfigPath = potentialConfig;
      break;
    }
    currentDir = dirname(currentDir);
  }

  // 如果没找到，使用根目录的 tsconfig.json
  if (!tsconfigPath) {
    tsconfigPath = resolve(rootDir, 'tsconfig.json');
  }

  if (!configMap.has(tsconfigPath)) {
    configMap.set(tsconfigPath, []);
  }
  configMap.get(tsconfigPath).push(file);
}

// 对每个 tsconfig.json 运行类型检查
for (const [tsconfigPath, fileList] of configMap.entries()) {
  try {
    const relativeConfig = tsconfigPath.replace(rootDir + '/', '');

    // 使用 --project 参数明确指定 tsconfig.json，确保路径别名正确解析
    // 使用 --skipLibCheck 跳过库文件的类型检查
    const result = execSync(
      `pnpm exec tsc --noEmit --skipLibCheck --project ${relativeConfig}`,
      {
        cwd: rootDir,
        stdio: 'pipe',
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      }
    );

    // 如果有输出，检查是否包含我们关心的文件的错误
    if (result) {
      const filePaths = fileList.map(f => f.replace(rootDir + '/', ''));
      const hasRelevantError = filePaths.some(file => result.includes(file));

      if (hasRelevantError) {
        // 过滤输出，只显示我们关心的文件的错误
        const lines = result.split('\n');
        const relevantLines = lines.filter(line => {
          return filePaths.some(file => {
            return line.includes(file + '(') || line.includes(file + ':');
          });
        });

        if (relevantLines.length > 0) {
          console.error(relevantLines.join('\n'));
          hasError = true;
        }
      }
    }
  } catch (error) {
    // execSync 抛出错误时，说明有类型错误
    const errorOutput = error.stdout || error.stderr || error.message || '';

    if (errorOutput) {
      // 过滤输出，只显示我们关心的文件的错误
      const lines = errorOutput.split('\n');
      const relevantLines = [];
      const filePaths = fileList.map(f => f.replace(rootDir + '/', ''));

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // 检查这一行是否包含我们关心的文件路径
        const isRelevant = filePaths.some(file => {
          // 匹配格式：filepath(line,col): error ...
          return line.includes(file + '(') || line.includes(file + ':');
        });

        if (isRelevant) {
          relevantLines.push(line);
          // 如果下一行是错误消息的延续，也包含进来
          if (i + 1 < lines.length && !lines[i + 1].match(/^\w+.*\(/)) {
            relevantLines.push(lines[i + 1]);
            i++;
          }
        }
      }

      if (relevantLines.length > 0) {
        console.error('❌ TypeScript type errors found:');
        console.error(relevantLines.join('\n'));
        hasError = true;
      }
    } else {
      // 如果没有输出但抛出了错误，可能是其他问题
      hasError = true;
    }
  }
}

if (hasError) {
  console.error('\n❌ Lint check failed. Please fix the errors above.');
  process.exit(1);
} else {
  console.log('✅ All checks passed!');
  process.exit(0);
}
