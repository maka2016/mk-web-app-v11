# 配置指南

## 环境变量配置

### 1. 创建 .env.local 文件

在项目根目录 `/Users/zhangalex/Documents/works/maka/mk-web-app-v11/` 创建或编辑 `.env.local` 文件：

```bash
# Figma Access Token (必需)
FIGMA_ACCESS_TOKEN=figd_your_token_here
```

### 2. 获取 Figma Access Token

1. 登录 [Figma](https://www.figma.com/)
2. 点击头像 → **Settings**
3. 滚动到 **Personal access tokens** 部分
4. 点击 **Create new token**
5. 输入名称（如 "React Converter"）
6. 复制生成的 token（格式：`figd_...`）
7. 粘贴到 `.env.local` 文件中

### 3. 验证配置

在终端运行：

```bash
# 检查环境变量
echo $FIGMA_ACCESS_TOKEN

# 或在 Cursor 中让 AI 检查
```

## 在 Cursor 中使用

### 方法 1: 直接对话（最简单）

在 Cursor 中直接告诉 AI：

```
请将这个 Figma 设计转换为 React 组件：
https://www.figma.com/design/xxx/...?node-id=7426-25858

保存到: packages/jiantie/components/MyComponent.tsx
组件名: MyComponent
```

AI 会自动：
1. 读取 `FIGMA_ACCESS_TOKEN` 环境变量
2. 调用 `convertFigmaToFile` 函数
3. 生成并保存组件
4. 告诉你结果

### 方法 2: 使用测试脚本

```
请运行 packages/jiantie/app/figma2cursor/test-convert.ts
将 Figma [URL] 转换为 [ComponentName]
保存到 [路径]
```

### 方法 3: 编写自定义脚本

让 AI 帮你创建转换脚本：

```
请创建一个脚本 scripts/import-buttons.ts
从 Figma 批量导入所有按钮组件：
- Primary: node-id=111-222
- Secondary: node-id=333-444
- Outline: node-id=555-666

保存到 components/buttons/ 目录
```

## 实际使用示例

### 示例 1: 创建单个组件

在 Cursor 中说：

```
从 Figma 创建一个分享按钮组件

Figma: https://www.figma.com/design/abc123/Design?node-id=7426-25858
路径: packages/jiantie/components/ShareButton.tsx
名称: ShareButton

请添加：
- 点击事件处理
- loading 状态
- TypeScript 类型
```

AI 会帮你完成所有工作！

### 示例 2: 批量创建组件库

```
从 Figma 批量创建组件库

基础 URL: https://www.figma.com/design/abc123/Design?node-id=

组件列表：
1. Header (7426-25858) → components/layout/Header.tsx
2. Footer (7426-25859) → components/layout/Footer.tsx
3. Card (7426-25860) → components/ui/Card.tsx

请一次性创建所有组件并创建 index.ts 导出文件
```

### 示例 3: 更新现有组件

```
设计师更新了 ShareCard 组件的 Figma 设计

新设计: https://www.figma.com/design/abc123/Design?node-id=7426-25861
现有文件: packages/jiantie/components/RSVP/ShareCard.tsx

请：
1. 转换新设计
2. 保留现有的事件处理逻辑
3. 更新样式部分
4. 保持类型定义不变
```

## 配置选项

### 基本选项

```typescript
{
  accessToken: string,        // Figma Access Token
  figmaUrl: string,          // Figma 节点链接
  outputPath: string,        // 输出文件路径
  componentName?: string,    // 组件名称（可选）
  addComments?: boolean,     // 是否添加注释（默认 false）
}
```

### 高级选项（未来）

```typescript
{
  // 样式配置
  useEmotionCSS?: boolean,   // 使用 Emotion CSS
  useTailwind?: boolean,     // 使用 Tailwind（默认 true）

  // 代码配置
  useTypeScript?: boolean,   // 使用 TypeScript（默认 true）
  addPropTypes?: boolean,    // 添加 PropTypes

  // 优化配置
  optimizeImages?: boolean,  // 优化图片
  lazyLoad?: boolean,        // 图片懒加载（默认 true）
  responsive?: boolean,      // 响应式设计（默认 true）
}
```

## 工作流集成

### 1. 开发流程

```
设计 → Cursor → 代码 → 审查 → 提交
  ↓       ↓       ↓       ↓       ↓
Figma   AI对话   自动   人工    Git
```

### 2. 团队协作

**设计师**:
1. 在 Figma 完成设计
2. 右键复制链接
3. 分享给开发者

**开发者（在 Cursor 中）**:
1. 粘贴链接给 AI
2. 说明保存路径和组件名
3. AI 自动转换并创建文件
4. 审查和调整
5. 提交代码

### 3. 持续同步

创建定时任务：

```typescript
// cron job 或 GitHub Action
// 每天从 Figma 同步设计更新
import { syncDesignSystem } from './scripts/sync-design';

await syncDesignSystem({
  figmaFile: 'YOUR_DESIGN_SYSTEM_FILE',
  outputDir: './components/ui',
});
```

## 故障排查

### 问题 1: 找不到 Token

```bash
# 检查环境变量
echo $FIGMA_ACCESS_TOKEN

# 如果为空，设置它
export FIGMA_ACCESS_TOKEN="figd_your_token"

# 或者在 Cursor 中让 AI 检查
```

### 问题 2: node-id 格式错误

确保你复制的是正确的链接：

```
✅ 正确: https://www.figma.com/design/abc/...?node-id=7426-25858
❌ 错误: https://www.figma.com/design/abc/... (缺少 node-id)
```

### 问题 3: 权限问题

```
确保：
1. Token 有效且未过期
2. 你有该文件的访问权限
3. 文件未被设为私有
```

## 快速参考

### 在 Cursor 中的一句话指令

```
// 创建组件
"转换 Figma [URL] 为 [组件名]，保存到 [路径]"

// 批量创建
"批量转换这些 Figma 组件: [URL1, URL2, URL3]"

// 更新组件
"用新的 Figma 设计 [URL] 更新 [文件路径]"

// 带功能创建
"从 Figma [URL] 创建 [组件名]，添加 [功能列表]"
```

### Node ID 格式转换

Figma URL 中的格式会自动转换：

```
URL 中:  node-id=7426-25858
API 中:  7426:25858
         ↑ 自动转换
```

## 完整示例

### 在 Cursor 中执行

对 AI 说：

```
我需要从 Figma 创建一个 RSVP 分享卡片组件。

Figma 设计链接:
https://www.figma.com/design/abc123/Design?node-id=7426-25858

要求：
1. 组件名称: ShareInviteCard
2. 保存路径: packages/jiantie/components/RSVP/ShareInviteCard.tsx
3. 添加以下功能:
   - 分享按钮点击事件
   - 复制链接功能
   - 成功提示
   - loading 状态
4. 使用 Tailwind CSS
5. 使用 lucide-react 图标
6. 添加 TypeScript 类型定义

请开始！
```

AI 会执行：

```typescript
import { convertFigmaToFile } from './packages/jiantie/app/figma2cursor/services/figma-api';
import fs from 'fs';

// 1. 转换基础代码
await convertFigmaToFile({
  accessToken: process.env.FIGMA_ACCESS_TOKEN!,
  figmaUrl: 'https://www.figma.com/design/abc123/Design?node-id=7426-25858',
  outputPath: './packages/jiantie/components/RSVP/ShareInviteCard.tsx',
  componentName: 'ShareInviteCard',
  addComments: true,
});

// 2. 读取并增强
let code = fs.readFileSync('./packages/jiantie/components/RSVP/ShareInviteCard.tsx', 'utf-8');

// 3. 添加导入
code = code.replace(
  "import React from 'react';",
  `import React, { useState } from 'react';
import { Copy, Check, Share2, Loader2 } from 'lucide-react';`
);

// 4. 添加接口
const propsInterface = `
interface ShareInviteCardProps {
  shareUrl: string;
  onShare?: () => void;
  onCopy?: () => void;
}
`;

code = code.replace(
  'export default function ShareInviteCard()',
  `${propsInterface}

export default function ShareInviteCard({ shareUrl, onShare, onCopy }: ShareInviteCardProps)`
);

// 5. 添加状态和逻辑
const stateAndHandlers = `
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy?.();
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const handleShare = async () => {
    setLoading(true);
    try {
      await onShare?.();
    } finally {
      setLoading(false);
    }
  };
`;

code = code.replace(
  'export default function ShareInviteCard({ shareUrl, onShare, onCopy }: ShareInviteCardProps) {',
  `export default function ShareInviteCard({ shareUrl, onShare, onCopy }: ShareInviteCardProps) {${stateAndHandlers}`
);

// 6. 写回文件
fs.writeFileSync('./packages/jiantie/components/RSVP/ShareInviteCard.tsx', code, 'utf-8');

console.log('✅ ShareInviteCard 组件已创建并增强！');
```

## 总结

在 Cursor 中使用 Figma to React Converter 只需要：

1. **设置一次** `FIGMA_ACCESS_TOKEN` 环境变量
2. **告诉 AI** Figma URL 和保存路径
3. **AI 自动** 转换、增强、保存
4. **你审查** 代码并提交

就这么简单！🚀

---

**需要帮助？** 查看 [CURSOR_USAGE.md](./CURSOR_USAGE.md) 获取更多示例和技巧。
