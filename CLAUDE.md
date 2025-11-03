# MK Web App V10 工程结构分析 - 系统提示词

## 项目概述

这是一个基于 **Next.js 15** 和 **pnpm workspace** 的现代化 Web 应用项目，采用 **monorepo** 架构。**简帖（jiantie）** 是整个项目的主要 Web 入口和核心业务应用，主要业务是设计模版（海报、互动网页等物料）的分发、创作、编辑、分享。其他包作为工具库，为简帖应用服务。

## 核心技术栈

- **前端框架**: Next.js 15.3.4 (App Router)
- **React**: 19.1.0
- **TypeScript**: 5.x
- **包管理**: pnpm 9.12.3
- **状态管理**: MobX 6.3.2
- **样式方案**: Tailwind CSS + Emotion + SCSS
- **UI组件**: Radix UI + 自定义组件库
- **构建工具**: Turbopack (开发环境)

## 项目架构

### 1. 根目录结构

```
mk-web-app-v10/
├── packages/           # 工作区包目录
├── public/            # 公共资源
├── package.json       # 根包配置
├── pnpm-workspace.yaml # 工作区配置
└── tailwind.config.ts # Tailwind配置
```

### 2. 核心包结构

**@mk/jiantie** (简帖应用 - 主要业务应用)

- 路径: `packages/jiantie/`
- 功能: **整个项目的主要 Web 入口**，设计模版（海报、互动网页等物料）的分发、创作、编辑、分享
- 技术: Next.js App Router, MobX, Tailwind CSS
- 业务模块: 设计编辑器、模版库、分享系统、用户管理等
- 说明: 这是项目的核心业务应用，其他包都为其服务

**@workspace/ui** (共享UI组件库)

- 路径: `packages/ui/`
- 功能: 基于Radix UI的现代化组件库
- 技术: Radix UI, Tailwind CSS, Framer Motion
- 导出: 组件、样式、配置、工具函数

**@mk/widgets** (业务组件库)

- 路径: `packages/widgets/`
- 功能: 业务相关的可复用组件
- 组件类型:
  - `GridV3/` - **流式布局编辑器和播放器**，基于HTML的flex和grid实现，承载简帖模版、作品的内容展示和内容编辑交互，整体设计理念与Figma和NicePage接近
  - `MkMapV4/` - 地图组件
  - `MkImageGroup_v2/` - 图片组组件
  - `MkGift/` - 礼物组件
  - `MkBulletScreen_v2/` - 弹幕组件
  - `MkPinTuan/` - 拼团组件

**@mk/services** (服务层)

- 路径: `packages/services/`
- 功能: 业务逻辑和API服务

**@mk/app-bridge** (Web与原生App通讯SDK)

- 路径: `packages/app-bridge/`
- 功能: Web 与原生 App 通讯的 SDK，提供跨平台通信能力

**@mk/works-store** (作品数据操作SDK)

- 路径: `packages/works-store/`
- 功能: 作品数据的操作 SDK，主要提供作品数据获取、修改、更新等功能

**@mk/viewer** (作品查看组件库)

- 路径: `packages/viewer/`
- 功能: 作品查看组件库，提供作品预览和展示功能

**@mk/logger** (日志系统)

- 路径: `packages/logger/`
- 功能: 统一的日志管理

### 3. 应用架构特点

#### 应用架构

- **主要应用**: 简帖（jiantie）是整个项目的核心 Web 入口
- **业务定位**: 设计模版（海报、互动网页等物料）的分发、创作、编辑、分享
- **其他包**: 作为工具库，为简帖应用服务

#### 状态管理

- 使用 **MobX** 进行状态管理
- 支持用户权限、VIP状态、登录状态等
- 提供 `useStore` Hook 供组件使用

#### 样式系统

- **Tailwind CSS** 作为主要样式框架
- **Emotion** 用于组件级样式
- **SCSS** 用于复杂样式逻辑
- 支持主题切换和响应式设计

#### 组件设计原则

- 基于 **Radix UI** 构建无障碍组件
- 使用 **class-variance-authority** 管理组件变体
- 支持 **Framer Motion** 动画效果
- 组件库采用 **shadcn/ui** 设计模式

### 4. 开发规范

#### 代码风格

- 使用 **TypeScript** 进行类型检查
- 遵循 **ESLint** 和 **Prettier** 规范
- 支持 **Husky** 和 **lint-staged** 预提交检查

#### 文件组织

- 采用 **功能模块化** 组织代码
- 每个包独立维护自己的依赖和配置
- 共享代码通过 workspace 引用

#### 构建部署

- 支持 **Docker** 容器化部署
- 提供多个 Dockerfile 用于不同环境
- 支持 **standalone** 输出模式

### 5. 开发命令

```bash
# 开发环境
pnpm dev:jiantie      # 启动简帖应用（主要业务应用）

# 构建
pnpm build:jiantie    # 构建简帖应用

# 生产环境
pnpm start:jiantie    # 启动简帖应用生产服务器
```

### 6. 技术特点总结

1. **现代化架构**: Next.js 15 + App Router + TypeScript
2. **模块化设计**: 清晰的包结构和职责分离
3. **组件化开发**: 可复用的UI组件和业务组件
4. **状态管理**: MobX提供响应式状态管理
5. **样式系统**: Tailwind CSS + Emotion + SCSS 混合方案
6. **开发体验**: Turbopack + 热重载 + 类型检查
7. **部署灵活**: Docker支持 + 多环境配置

## 用户偏好和开发规范

### 样式偏好

- **页面实现编写规则优先级**: `workspace ui` > `tailwind css` > `emotion/style`
- **严格禁止使用 SCSS**，所有样式必须使用上述优先级方案
- 优先使用 **Tailwind CSS** 或 **Emotion** 进行样式开发

### 代码复杂度控制

- 避免使用 `useCallback` 和 `useMemo` 等复杂Hook
- 保持代码简单可读，避免过度优化
- 优先使用最简单的可运行代码方案

### 图标使用规范

- **优先使用 `lucide-react` 图标库**，这是标准且维护性好的选择
- **避免使用 workspace ui 的 Icon 组件**，因为这是非标准实现，维护性差
- 所有 `IconInput` 组件必须使用 `icon2` 属性
- 图标来源统一使用 `lucide-react` 库

### UI/UX 最佳实践

- 数据加载时保持现有数据可见，避免界面跳动
- 提供流畅的用户体验，减少加载状态的视觉干扰

## 项目特色

这个项目展现了企业级前端应用的最佳实践，具有良好的可维护性、可扩展性和开发体验。通过 monorepo 架构实现了代码复用和模块化管理。

**核心特点**:

- **简帖应用** 是项目的核心业务，专注于设计模版的分发、创作、编辑、分享
- **工具库架构** 其他包作为工具库，为简帖应用提供支持
- **现代化技术栈** Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **组件化开发** 可复用的UI组件和业务组件，提高开发效率

---

## 🎯 Cursor Rules (用于 Cursor Rule Setting)

### 项目架构规则

1. **核心应用**: 简帖（jiantie）是主要业务应用，其他包都是工具库
3. **monorepo 结构**: 使用 pnpm workspace 管理，共享代码通过 workspace 引用

### 技术栈规则

4. **React 19 + Next.js 15**: 使用最新的 App Router 架构
5. **TypeScript 优先**: 所有新代码必须使用 TypeScript
6. **状态管理**: 使用 MobX 进行状态管理，提供 useStore Hook

### 样式开发规则

7. **样式优先级**: `@workspace/ui` > `tailwind css` > `emotion/style`
8. **禁止 SCSS**: 严格禁止使用 SCSS，所有样式使用上述优先级方案
9. **响应式设计**: 优先考虑移动端，使用 Tailwind 的响应式类

### 组件开发规则

10. **图标使用**: 优先使用 `lucide-react`，避免使用 workspace ui 的 Icon 组件
11. **UI组件**: 基于 Radix UI 构建，使用 class-variance-authority 管理变体
12. **GridV3**: 这是流式布局编辑器的核心，设计理念对标 Figma/NicePage

### 代码质量规则

13. **避免复杂Hook**: 不要使用 useCallback、useMemo 等复杂优化
14. **保持简单**: 优先使用最简单的可运行代码方案
15. **数据加载**: 保持现有数据可见，避免界面跳动

### 开发流程规则

16. **启动命令**: 主要使用 `pnpm dev:jiantie` 启动简帖应用
17. **包管理**: 使用 pnpm 9.12.3+ 作为包管理器
18. **构建输出**: 支持 standalone 模式和 Docker 容器化部署
