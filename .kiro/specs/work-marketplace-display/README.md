# 模板商城展示功能 - 文档导航

## 📚 文档列表

### 核心文档

1. **requirements.md** - 功能需求和验收标准
2. **design.md** - 技术设计和实现方案
3. **tasks.md** - 开发任务清单

### 完成文档

4. **COMPLETED.md** ⭐ - 总体完成总结（**从这里开始**）
5. **QUICK-START.md** - 快速启动指南
6. **TEST-GUIDE.md** - 完整测试指南
7. **CORRECTION.md** - API 设计修正说明
8. **FINAL-IMPLEMENTATION.md** - 最终实现方案

### 组件文档

9. **MarketplaceConfig/README.md** - 配置组件使用文档

---

## 🚀 快速开始

### 1. 启动项目

```bash
pnpm dev:jiantie
```

### 2. 设计师配置模板

```
访问: /editor-designer?works_id={模板ID}&is_template=true
操作: 更多 → 商城展示设置
配置: 添加图片、标题、描述
启用: 点击"启用商城展示"
```

### 3. 用户浏览商城

```
访问: /mobile/marketplace
浏览: 模板列表
查看: 点击模板查看详情
使用: 点击"使用此模板"
```

---

## ⚡ 关键要点

### 数据存储

```typescript
IWorksData.templateShowcaseInfo; // ⭐ 核心数据结构
```

### API 使用

```typescript
// ✅ 正确方式：复用现有 API
GET / api / template - items; // 商城列表（CMS API）
getTemplateDetail2(id); // 模板详情（现有）

// ❌ 错误方式：不需要新 API
// GET /api/marketplace/templates
```

### 数据过滤

```typescript
// ✅ 前端负责过滤
templates.filter(t => t.works_data?.templateShowcaseInfo?.enabled === true);
```

---

## 📂 目录结构

### 设计师端

```
packages/widgets/GridV3/DesignerToolForEditor/
├── RichTextEditor/              # 富文本编辑器
├── MarketplaceConfig/           # 商城配置组件
└── HeaderV2/index.tsx           # 入口按钮
```

### 用户端

```
packages/jiantie/
├── services/marketplace.ts      # 商城服务
└── app/mobile/marketplace/
    ├── page.tsx                 # 列表页
    ├── components/              # 列表组件
    └── [templateId]/
        ├── page.tsx             # 详情页
        └── components/          # 详情组件
```

### 数据层

```
packages/works-store/
├── types/interface.ts           # 类型定义
└── store/WorksStore.ts          # API 实现
```

---

## ✅ 功能清单

### 设计师端

- [x] 添加/删除预览图（最多9张）
- [x] 设置封面图
- [x] 编辑展示标题（1-100字符）
- [x] 编辑展示描述（最多5000字符）
- [x] 启用/禁用商城展示
- [x] 自动保存配置
- [x] 数据验证

### 用户端

- [x] 浏览商城列表（2列网格）
- [x] 排序切换（最新/热门/推荐）
- [x] 查看模板详情
- [x] 图片轮播（左右切换、全屏）
- [x] 富文本描述（展开/收起）
- [x] 使用模板按钮
- [x] SEO 优化

### 数据层

- [x] 类型定义（3个接口）
- [x] WorksStore API（11个方法）
- [x] 自动保存机制
- [x] 数据验证逻辑

---

## 🔧 技术栈

### 前端

- React 19 + Next.js 15
- TypeScript
- MobX (状态管理)
- Tailwind CSS (样式)
- lucide-react (图标)

### 数据

- WorksStore (状态管理)
- 现有 CMS API
- 现有模板 API

### 工具

- @workspace/ui (UI 组件)
- @mk/utils (工具函数)
- react-hot-toast (提示)

---

## 📞 问题排查

### 看不到"商城展示设置"？

→ 确认 URL 包含 `is_template=true`

### 图片没有实时更新？

→ 确认组件使用了 `observer`

### 配置没有保存？

→ 检查 `worksStore.isSaved` 状态

### 商城列表为空？

→ 确认至少有一个模板 `enabled=true`

---

## 📖 推荐阅读顺序

### 快速了解

1. **COMPLETED.md** - 5分钟了解全貌
2. **QUICK-START.md** - 快速上手

### 深入学习

3. **FINAL-IMPLEMENTATION.md** - 技术实现细节
4. **TEST-GUIDE.md** - 完整测试方法

### 修正说明

5. **CORRECTION.md** - API 设计修正（重要！）

### 原始设计

6. **design.md** - 技术设计文档
7. **requirements.md** - 功能需求文档

---

**状态**: ✅ P0 开发完成，整体流程可用
**测试**: 准备就绪，可以开始测试
**部署**: 无需后端改动，前端可直接部署
