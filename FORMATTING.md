# 代码格式化配置说明

本项目已配置统一的代码格式化规范，确保所有开发人员的代码风格保持一致。

## 配置概览

### 1. Prettier 配置 (`.prettierrc.json`)

- **缩进**: 2个空格
- **引号**: 单引号 (JS/TS), 双引号 (JSX)
- **分号**: 必须
- **行宽**: 80字符
- **尾随逗号**: ES5 兼容
- **换行符**: LF (Unix)

### 2. ESLint 配置 (`.eslintrc.json`)

- 基于 Next.js 核心规则
- 集成 Prettier 规则
- TypeScript 支持
- 自动修复功能

### 3. EditorConfig (`.editorconfig`)

- 统一编辑器设置
- 字符编码: UTF-8
- 换行符: LF
- 缩进: 2个空格

### 4. VS Code 配置 (`.vscode/`)

- 保存时自动格式化
- 自动修复 ESLint 错误
- 自动整理导入
- 推荐扩展列表

## 使用方法

### 安装依赖

```bash
pnpm install
```

### 格式化命令

#### 格式化所有文件

```bash
pnpm format
```

#### 检查格式化状态

```bash
pnpm format:check
```

#### 修复 ESLint 错误

```bash
pnpm lint:fix
```

#### 检查 ESLint 错误

```bash
pnpm lint:check
```

#### 一键格式化 + 修复

```bash
pnpm format:all
```

### Git Hooks

项目配置了 `lint-staged`，在提交代码时会自动：

1. 运行 ESLint 修复
2. 运行 Prettier 格式化

## 支持的文件类型

- TypeScript (`.ts`, `.tsx`)
- JavaScript (`.js`, `.jsx`)
- JSON (`.json`)
- CSS (`.css`)
- SCSS (`.scss`)
- HTML (`.html`)
- Markdown (`.md`)

## 编辑器设置

### VS Code

1. 安装推荐的扩展
2. 打开项目时会自动应用配置
3. 保存时自动格式化

### 其他编辑器

- 安装 Prettier 插件
- 配置 ESLint 插件
- 应用 EditorConfig 设置

## 忽略文件

以下文件/目录会被忽略，不进行格式化：

- `node_modules/`
- `dist/`, `build/`, `.next/`
- 环境文件 (`.env*`)
- 日志文件
- 锁文件 (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`)

## 团队协作

1. **提交前**: 确保运行 `pnpm format:all`
2. **代码审查**: 检查格式化是否一致
3. **CI/CD**: 可以添加格式化检查步骤

## 故障排除

### 格式化不生效

1. 检查是否安装了 Prettier 扩展
2. 确认 VS Code 设置正确
3. 重启编辑器

### ESLint 错误

1. 运行 `pnpm lint:fix` 自动修复
2. 检查 ESLint 配置
3. 确认依赖已安装

### 配置冲突

1. 检查是否有其他格式化工具配置
2. 确认 EditorConfig 设置
3. 检查 VS Code 工作区设置
