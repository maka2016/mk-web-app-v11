# MK Web App V10

## 项目概述

MK Web App V11 是一个基于 Next.js 的现代化 Web 应用套件，采用 monorepo 架构设计，集成了多个功能模块，包括 AI 应用、查看器、移动认证等多个子应用。

## 技术栈

- **前端框架**: Next.js 15.1.2
- **UI 框架**: React 19.0.0
- **状态管理**: MobX
- **样式解决方案**:
  - Tailwind CSS
  - Emotion
  - SASS
- **包管理工具**: pnpm
- **开发语言**: TypeScript

## 项目结构

项目采用 monorepo 架构，主要包含以下模块：

- `viewer`: 文档查看器
- `ai-editor`: AI 编辑器
- `jiantie`: 剪贴板功能
- `mobile-auth`: 移动端认证
- `ui`: 通用 UI 组件库
- `widgets`: 可复用组件
- `services`: 服务层
- `works-store`: 工作区存储
- `logger`: 日志系统
- `app-bridge`: 应用桥接层

## 开发指南

### 环境要求

- Node.js
- pnpm 9.12.3+

### 安装依赖

```bash
pnpm install
```

### 开发命令

- 启动剪贴板应用开发服务器：

  ```bash
  pnpm dev:jiantie
  ```

### 构建命令

每个子应用都有对应的构建命令：

```bash
pnpm build:jiantie
```

## 部署

项目支持 Docker 容器化部署，提供了多个 Dockerfile 用于不同模块的部署：

- `Dockerfile`: 主应用
- `DockerfileAIApp-xuanbao`: AI 应用
- `DockerfileViewer`: 查看器
- `Dockerfile-jiantie`: 剪贴板应用
- `Dockerfile-mobileAuth`: 移动认证
- `Dockerfile-invoice`: 发票相关
- `DockerfileSyt`: 系统相关

## 主要功能

1. AI 应用集成
2. 文档查看与编辑
3. 移动端认证
4. 剪贴板功能
5. 组件化开发
6. 多主题支持
7. 响应式设计

## 贡献指南

1. 遵循项目的代码规范
2. 使用 TypeScript 进行开发
3. 确保代码通过 ESLint 检查
4. 提交前运行测试确保功能正常

## 许可证

私有项目，未经授权不得使用。
