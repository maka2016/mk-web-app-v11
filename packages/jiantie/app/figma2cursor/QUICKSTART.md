# 快速开始指南

## 5 分钟上手 Figma to React Converter

### 步骤 1: 启动应用 (30 秒)

```bash
cd /Users/zhangalex/Documents/works/maka/mk-web-app-v11
pnpm dev:jiantie
```

访问: `http://localhost:3000/figma2cursor`

### 步骤 2: 获取 Figma Access Token (2 分钟)

1. 打开 [Figma](https://www.figma.com/)
2. 点击右上角头像 → Settings
3. 滚动到 **Personal access tokens**
4. 点击 **Create new token**
5. 输入名称（如 "React Converter"）
6. 复制生成的 token（`figd_...`）

### 步骤 3: 复制 Figma 节点链接 (1 分钟)

1. 在 Figma 设计文件中选择任意元素
2. 右键点击 → **Copy/Paste as** → **Copy link**
3. 链接格式：`https://www.figma.com/design/xxx/...?node-id=xxx`

### 步骤 4: 开始转换 (30 秒)

1. 将 Access Token 粘贴到第一个输入框
2. 将节点链接粘贴到第二个输入框
3. 输入组件名称（如 `MyButton`）
4. 点击 **开始转换**

### 步骤 5: 使用生成的代码 (1 分钟)

1. 点击 **复制** 按钮复制代码
2. 或点击 **下载** 按钮下载 `.tsx` 文件
3. 粘贴到你的项目中
4. 根据需要调整样式和逻辑

## 示例

### 示例 1: 转换一个按钮

**Figma 设计**:
```
Button (Frame)
  ├── Background (Rectangle)
  └── Label (Text)
```

**生成的代码**:
```tsx
'use client';

import React from 'react';

export default function MyButton() {
  return (
    <div className="flex items-center justify-center px-6 py-3 bg-blue-500 rounded-lg">
      <div className="text-white text-base font-semibold">
        Click Me
      </div>
    </div>
  );
}
```

### 示例 2: 转换一个卡片

**Figma 设计**:
```
Card (Frame)
  ├── Image (Rectangle)
  ├── Title (Text)
  └── Description (Text)
```

**生成的代码**:
```tsx
'use client';

import React from 'react';

export default function ProductCard() {
  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-xl shadow">
      <img
        src="/placeholder.png"
        alt="Product"
        className="w-full h-48 object-cover rounded-lg"
        loading="lazy"
      />
      <div className="text-2xl font-bold text-gray-900">
        Product Title
      </div>
      <div className="text-base text-gray-600">
        Product description goes here
      </div>
    </div>
  );
}
```

## 常见使用场景

### 场景 1: 快速原型

```bash
# 1. 设计师在 Figma 完成设计
# 2. 开发者复制链接
# 3. 转换为代码
# 4. 快速验证交互
```

### 场景 2: 组件库开发

```bash
# 1. 从 Figma 组件库批量转换
# 2. 生成基础组件代码
# 3. 添加交互逻辑
# 4. 发布到组件库
```

### 场景 3: 设计系统同步

```bash
# 1. 定期从 Figma 更新设计
# 2. 转换为新代码
# 3. 对比差异
# 4. 更新代码库
```

## 技巧和窍门

### ✅ 最佳实践

1. **使用 Auto Layout**: 在 Figma 中使用 Auto Layout 可以生成更好的布局代码
2. **规范命名**: 使用语义化的名称（如 `Button/Primary`）
3. **组件化**: 将大设计拆分为小组件分别转换
4. **先简后繁**: 从简单元素开始，逐步增加复杂度

### ❌ 避免的坑

1. **不要转换整个页面**: 一次转换太多会导致代码冗长
2. **检查权限**: 确保有文件访问权限
3. **验证链接**: 复制正确的节点链接（包含 `node-id`）
4. **更新 Token**: Token 过期需要重新生成

## 快速参考

### Figma 快捷键

| 操作 | 快捷键 |
|------|--------|
| 复制链接 | 右键 → Copy/Paste as → Copy link |
| 选择父级 | `Shift + Enter` |
| 显示布局 | `Shift + A` (Auto Layout) |

### 生成的代码结构

```
Component
├── className="..."      # Tailwind 类
├── style={{...}}        # 自定义样式（如需要）
└── children             # 子元素
```

### Tailwind 类映射

| Figma | Tailwind |
|-------|----------|
| Horizontal Auto Layout | `flex flex-row` |
| Vertical Auto Layout | `flex flex-col` |
| Center Align | `items-center justify-center` |
| 16px Gap | `gap-4` |
| 8px Padding | `p-2` |

## 问题排查

### 问题 1: Token 无效

**症状**: 显示 "Access Token 无效"

**解决**:
```bash
1. 检查 token 是否完整复制
2. 确认 token 未过期
3. 重新生成新的 token
```

### 问题 2: 找不到节点

**症状**: 显示 "找不到设计文件或节点"

**解决**:
```bash
1. 确认链接包含 node-id 参数
2. 检查是否有文件访问权限
3. 验证节点是否存在
```

### 问题 3: 转换结果不理想

**症状**: 生成的代码布局不符合预期

**解决**:
```bash
1. 在 Figma 中使用 Auto Layout
2. 简化节点结构
3. 手动调整生成的代码
```

## 进阶用法

### 批量转换

```bash
# 1. 准备节点链接列表
# 2. 依次转换
# 3. 合并到组件库
```

### 与 MCP 集成

```bash
# 在 Cursor 中直接使用 AI
"请将 Figma 文件 ABC123 中的按钮组件转换为 React"
```

### 自定义配置

```typescript
// 在代码中调整转换选项
const converter = new FigmaConverter(figmaService);
const code = converter.generateOptimizedComponent(data, 'MyComponent', {
  addComments: true,
  optimizePerformance: true
});
```

## 下一步

### 学习更多

- 📚 [完整文档](./README.md)
- 🔧 [实现细节](./IMPLEMENTATION.md)
- 🔌 [MCP 集成](./MCP_INTEGRATION.md)

### 反馈和支持

- 💬 遇到问题？联系开发团队
- 🐛 发现 Bug？提交问题报告
- 💡 有想法？分享你的建议

---

**开始转换你的第一个 Figma 设计吧！** 🚀
