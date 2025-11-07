# Figma to React Converter

这是一个将 Figma 设计稿自动转换为 React + Tailwind CSS 组件的工具。

## 功能特性

- ✨ **智能布局识别**: 自动识别 Flex、Grid 等布局模式
- 🎨 **Tailwind CSS 优先**: 生成符合项目规范的 Tailwind 类名
- 📱 **响应式设计**: 考虑移动端适配
- 🚀 **性能优化**: 自动添加性能优化属性
- 💡 **代码优化**: 生成高质量、可维护的代码
- 📝 **实时预览**: 支持代码预览和编辑

## 使用步骤

### 1. 获取 Figma Access Token

1. 登录 [Figma](https://www.figma.com/)
2. 进入 Settings → Account
3. 找到 "Personal access tokens" 部分
4. 点击 "Create new token"
5. 输入 token 名称（如 "Figma to React"）
6. 复制生成的 token（格式：`figd_...`）

### 2. 复制 Figma 节点链接

1. 在 Figma 设计文件中，选择要转换的元素
2. 右键点击该元素
3. 选择 "Copy/Paste as" → "Copy link"
4. 链接格式示例：`https://www.figma.com/design/xxx/...?node-id=xxx`

### 3. 开始转换

1. 将 Access Token 粘贴到输入框
2. 将节点链接粘贴到输入框
3. 输入组件名称（可选，默认为 FigmaComponent）
4. 点击"开始转换"按钮
5. 等待转换完成

### 4. 使用生成的代码

转换完成后，你可以：

- 📋 **复制代码**: 点击"复制"按钮复制到剪贴板
- 💾 **下载文件**: 点击"下载"按钮保存为 `.tsx` 文件
- 👁️ **切换视图**: 在"JSX 片段"和"完整组件"之间切换

## 支持的 Figma 元素

### ✅ 完全支持

- Frame（框架）
- Group（组）
- Text（文本）
- Rectangle（矩形）
- Component（组件）
- Instance（实例）
- Auto Layout（自动布局）

### 🔄 部分支持

- Image（图片） - 需要手动替换图片链接
- Vector（矢量图形） - 转换为基本形状
- Effects（效果） - 基本阴影效果

### ❌ 暂不支持

- Prototyping（原型交互）
- Animations（动画）
- Complex vectors（复杂矢量图）
- Plugins（插件效果）

## 生成的代码特点

### 样式方案

1. **Tailwind CSS 优先**: 优先使用 Tailwind 类名
2. **内联样式补充**: 无法用 Tailwind 表达的样式使用内联样式
3. **响应式设计**: 自动考虑移动端适配

### 布局识别

- **Flex 布局**: 识别 Auto Layout 的方向、对齐、间距
- **尺寸处理**: 智能处理固定尺寸和自适应尺寸
- **间距系统**: 使用 Tailwind 的间距体系（4px 基准）

### 组件结构

```tsx
'use client';

import React from 'react';

export default function ComponentName() {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* 生成的组件内容 */}
    </div>
  );
}
```

## 最佳实践

### 设计规范

1. **使用 Auto Layout**: 在 Figma 中使用 Auto Layout 可以生成更好的布局代码
2. **规范命名**: 给元素命名有助于理解组件结构
3. **适当分组**: 合理的分组可以生成更清晰的组件层级
4. **统一样式**: 使用一致的颜色、字体、间距

### 转换建议

1. **从小到大**: 先转换小组件，再组合成大组件
2. **验证布局**: 转换后检查布局是否符合预期
3. **调整样式**: 根据实际需求微调生成的代码
4. **提取变量**: 将重复的样式值提取为变量或配置

### 性能优化

1. **图片优化**: 替换生成的图片链接为优化后的资源
2. **懒加载**: 为图片添加 `loading="lazy"` 属性（自动添加）
3. **代码分割**: 将大组件拆分为多个小组件
4. **条件渲染**: 根据需要添加条件渲染逻辑

## 常见问题

### Q: 为什么转换失败？

**A:** 可能的原因：

1. Access Token 无效或过期
2. 没有权限访问该文件
3. 节点链接格式不正确
4. 网络连接问题

### Q: 生成的代码不完美怎么办？

**A:** 这是正常的：

1. 自动转换工具无法处理所有情况
2. 建议将生成的代码作为起点
3. 根据实际需求进行调整和优化
4. 复杂的交互逻辑需要手动添加

### Q: 如何处理图片？

**A:** 图片处理建议：

1. 生成的代码包含占位符图片链接
2. 需要手动替换为实际的图片资源
3. 建议使用 CDN 或优化后的图片
4. 考虑使用响应式图片方案

### Q: 支持哪些浏览器？

**A:** 支持现代浏览器：

- Chrome/Edge (最新版本)
- Firefox (最新版本)
- Safari (最新版本)

## 技术栈

- **Next.js 15**: 服务端渲染和路由
- **React 19**: UI 组件框架
- **TypeScript**: 类型安全
- **Tailwind CSS**: 样式框架
- **Figma API**: 设计数据获取
- **lucide-react**: 图标库

## 项目规范

遵循以下项目规范：

1. 使用 `'use client'` 标记客户端组件
2. 优先使用 Tailwind CSS
3. 避免使用复杂的 Hook（useCallback, useMemo）
4. 保持代码简单可读
5. 使用 lucide-react 图标库

## 更新日志

### v1.0.0 (2025-01-01)

- ✨ 初始版本发布
- 🎨 支持 Tailwind CSS 生成
- 📱 支持响应式设计
- 🚀 智能布局识别
- 💡 代码优化功能

## 许可证

本项目仅供内部使用。

## 联系方式

如有问题或建议，请联系开发团队。
