---
inclusion: always
---

### 项目架构规则

1. **核心应用**: 简帖（jiantie）是主要业务应用，其他包都是工具库
2. **monorepo 结构**: 使用 pnpm workspace 管理，共享代码通过 workspace 引用

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

## Date数据类型

数据库date字段为utc时间，而业务的时间为东8区，需要特别注意,最好是涉及到日期筛选的传完整时间而不是日期字符串
