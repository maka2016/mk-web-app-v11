# AI 使用指南 - Figma to React Converter

> 本文档专门为 Cursor AI 提供调用 Figma 转换服务的指南

## 快速开始

当用户要求从 Figma 创建组件时，请按以下步骤操作：

### 步骤 1: 确认 Access Token

```typescript
// 优先从环境变量读取
const accessToken = process.env.FIGMA_ACCESS_TOKEN;

// 如果没有，提示用户设置
if (!accessToken) {
  throw new Error('请设置环境变量 FIGMA_ACCESS_TOKEN');
}
```

### 步骤 2: 调用转换服务

```typescript
import { convertFigmaToFile } from './packages/jiantie/app/figma2cursor/services/figma-api';

await convertFigmaToFile({
  accessToken: process.env.FIGMA_ACCESS_TOKEN!,
  figmaUrl: '[用户提供的 Figma URL]',
  outputPath: '[用户指定的文件路径]',
  componentName: '[组件名称]',
  addComments: true,
});
```

### 步骤 3: 根据需要添加功能

转换生成的是基础代码，根据用户需求添加：
- 事件处理
- 状态管理
- Props 接口
- 业务逻辑

## API 参考

### convertFigmaToCode

返回代码字符串，不写入文件。

```typescript
const result = await convertFigmaToCode({
  accessToken: string,
  figmaUrl: string,
  componentName?: string,
  addComments?: boolean,
});

// result.code - 生成的代码
// result.componentName - 组件名称
// result.metadata - 元数据（fileKey, nodeId, timestamp）
```

### convertFigmaToFile

转换并直接写入文件（最常用）。

```typescript
const outputPath = await convertFigmaToFile({
  accessToken: string,
  figmaUrl: string,
  outputPath: string,
  componentName?: string,
  addComments?: boolean,
});

// 返回写入的文件路径
```

### batchConvert

批量转换多个组件。

```typescript
const results = await batchConvert({
  accessToken: string,
  conversions: Array<{
    url: string,
    outputPath: string,
    componentName?: string,
  }>,
});

// 返回成功转换的文件路径数组
```

## 用户请求模式识别

### 模式 1: 单个组件转换

**用户说**: "将这个 Figma 设计转换为 React 组件"

**你应该做**:
1. 提取 Figma URL
2. 询问或推断组件名称和保存路径
3. 调用 `convertFigmaToFile`
4. 告知用户结果

```typescript
await convertFigmaToFile({
  accessToken: process.env.FIGMA_ACCESS_TOKEN!,
  figmaUrl: '[URL]',
  outputPath: './components/[ComponentName].tsx',
  componentName: '[ComponentName]',
  addComments: true,
});
```

### 模式 2: 批量转换

**用户说**: "将这些 Figma 组件批量转换"

**你应该做**:
1. 提取所有 URL 和对应的组件名
2. 组织转换列表
3. 调用 `batchConvert`
4. 报告成功/失败情况

```typescript
await batchConvert({
  accessToken: process.env.FIGMA_ACCESS_TOKEN!,
  conversions: [
    // ... 从用户消息中提取
  ],
});
```

### 模式 3: 转换并集成

**用户说**: "从 Figma 创建一个按钮组件，添加点击事件处理"

**你应该做**:
1. 先转换基础代码
2. 读取生成的文件
3. 添加用户要求的功能
4. 保存最终文件

```typescript
// 1. 转换基础代码
const result = await convertFigmaToCode({
  accessToken: process.env.FIGMA_ACCESS_TOKEN!,
  figmaUrl: '[URL]',
  componentName: 'MyButton',
});

// 2. 添加功能
let finalCode = result.code;
finalCode = addClickHandler(finalCode);
finalCode = addTypeDefinitions(finalCode);

// 3. 写入文件
fs.writeFileSync('[output-path]', finalCode);
```

### 模式 4: 更新现有组件

**用户说**: "Figma 设计更新了，请更新我的组件"

**你应该做**:
1. 读取现有组件代码
2. 提取业务逻辑和事件处理
3. 转换新的 Figma 设计
4. 合并业务逻辑到新代码
5. 保存

```typescript
// 1. 读取现有代码
const existingCode = fs.readFileSync('[path]', 'utf-8');

// 2. 提取业务逻辑（你需要智能识别）
const businessLogic = extractBusinessLogic(existingCode);

// 3. 转换新设计
const newDesign = await convertFigmaToCode({...});

// 4. 合并
const finalCode = mergeCode(newDesign.code, businessLogic);

// 5. 保存
fs.writeFileSync('[path]', finalCode);
```

## 错误处理

### 常见错误和解决方案

```typescript
try {
  await convertFigmaToFile({...});
} catch (error) {
  // 错误已经被 FigmaErrorHandler 处理
  // 直接告诉用户友好的错误信息
  console.error(error.message);

  // 根据错误类型给出建议
  if (error.message.includes('Token')) {
    console.log('💡 请确保 FIGMA_ACCESS_TOKEN 环境变量已设置');
  } else if (error.message.includes('node-id')) {
    console.log('💡 请确保 Figma URL 包含 node-id 参数');
    console.log('   右键元素 → Copy/Paste as → Copy link');
  }
}
```

## 代码增强指南

转换后的代码是基础结构，你应该根据用户需求添加：

### 1. Props 接口

```typescript
interface MyButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
}

export default function MyButton({ onClick, disabled, loading, children }: MyButtonProps) {
  // ... 生成的代码
}
```

### 2. 事件处理

```typescript
const handleClick = () => {
  if (disabled || loading) return;
  onClick?.();
};

<div onClick={handleClick} className="...">
```

### 3. 状态管理

```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

### 4. 响应式优化

检查生成的 Tailwind 类，确保包含响应式断点：

```typescript
// 好的
className="w-full md:w-auto lg:w-1/2"

// 需要添加
className="w-80" → "w-full md:w-80"
```

## 项目规范检查

转换后，检查代码是否符合项目规范：

### ✅ 必须符合

1. **使用 'use client'**: 客户端组件必须声明
2. **Tailwind CSS 优先**: 样式优先使用 Tailwind
3. **避免复杂 Hook**: 不使用 useCallback, useMemo
4. **lucide-react 图标**: 如需图标，使用 lucide-react
5. **TypeScript**: 所有代码必须有类型

### 🔧 可能需要调整

1. **图片路径**: 替换占位符图片为实际路径
2. **事件处理**: 添加实际的事件逻辑
3. **数据绑定**: 连接到数据源或 Store
4. **国际化**: 如需要，添加 i18n

## 智能判断指南

### 何时使用 convertFigmaToCode

- 用户需要先看代码
- 需要在写入前修改代码
- 转换后要集成到现有组件

### 何时使用 convertFigmaToFile

- 用户明确指定保存路径
- 创建新组件
- 快速原型开发

### 何时使用 batchConvert

- 用户提供多个 Figma URL
- 批量更新组件库
- 同步设计系统

## 实际对话示例

### 对话 1: 创建新组件

**User**: "从这个 Figma 创建一个按钮: https://figma.com/...?node-id=123-456，保存到 components/Button.tsx"

**AI 应该**:
```typescript
// 1. 调用转换
await convertFigmaToFile({
  accessToken: process.env.FIGMA_ACCESS_TOKEN!,
  figmaUrl: 'https://figma.com/...?node-id=123-456',
  outputPath: './packages/jiantie/components/Button.tsx',
  componentName: 'Button',
  addComments: true,
});

// 2. 告诉用户
console.log('✅ Button 组件已创建: packages/jiantie/components/Button.tsx');
```

### 对话 2: 添加功能

**User**: "将这个 Figma 设计转换为登录表单，添加表单验证"

**AI 应该**:
```typescript
// 1. 先转换基础结构
const result = await convertFigmaToCode({
  accessToken: process.env.FIGMA_ACCESS_TOKEN!,
  figmaUrl: '[URL]',
  componentName: 'LoginForm',
});

// 2. 添加表单逻辑
const enhancedCode = `
${result.code}

// 添加表单验证
import { useState } from 'react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// ... 表单处理逻辑
`;

// 3. 写入文件
fs.writeFileSync('[path]', enhancedCode);
```

### 对话 3: 更新现有组件

**User**: "设计更新了，请更新 Button.tsx 但保留现有的点击逻辑"

**AI 应该**:
```typescript
// 1. 读取现有代码
const existingCode = fs.readFileSync('./components/Button.tsx', 'utf-8');

// 2. 提取事件处理器
const onClickHandler = existingCode.match(/const handleClick = [\s\S]*?}/)?.[0];

// 3. 转换新设计
const newCode = await convertFigmaToCode({...});

// 4. 合并
const mergedCode = newCode.code.replace(
  'export default function Button',
  `${onClickHandler}\n\nexport default function Button`
);

// 5. 写入
fs.writeFileSync('./components/Button.tsx', mergedCode);
```

## 输出格式建议

当完成转换后，使用友好的格式告诉用户：

```
✅ Figma 设计已成功转换！

📁 文件路径: packages/jiantie/components/ShareButton.tsx
📝 组件名称: ShareButton
🎨 样式方案: Tailwind CSS
📱 响应式: 已支持

生成的代码包含：
- 完整的组件结构
- Tailwind CSS 类名
- TypeScript 类型安全
- 性能优化（图片懒加载）

下一步：
1. 检查生成的代码
2. 根据需要添加事件处理
3. 测试组件
4. 集成到页面中
```

## 注意事项

### ⚠️ 重要提醒

1. **不要暴露 Token**: 永远不要在日志或消息中显示完整的 Access Token
2. **验证输入**: 始终验证 URL 和 Token 格式
3. **错误提示**: 使用 FigmaErrorHandler 提供友好的错误信息
4. **路径处理**: 确保输出路径是相对于项目根目录的正确路径
5. **覆盖确认**: 如果文件已存在，先询问用户是否覆盖

### 🎯 优化建议

1. **智能命名**: 如果用户没有指定组件名，从 Figma 节点名称推断
2. **路径推断**: 根据组件类型推断合适的保存路径
3. **自动优化**: 转换后自动检查并优化代码
4. **依赖检查**: 提醒用户需要安装的依赖

## 完整示例：AI 处理用户请求

**用户消息**:
```
请从这个 Figma 设计创建一个分享卡片组件：
https://www.figma.com/design/ABC/Design?node-id=7426-25858

要求：
- 保存到 components/RSVP/ShareCard.tsx
- 添加分享按钮的点击事件
- 支持复制链接功能
```

**AI 执行**:

```typescript
// 1. 导入所需模块
import { convertFigmaToFile } from './packages/jiantie/app/figma2cursor/services/figma-api';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

// 2. 转换基础代码
const outputPath = await convertFigmaToFile({
  accessToken: process.env.FIGMA_ACCESS_TOKEN!,
  figmaUrl: 'https://www.figma.com/design/ABC/Design?node-id=7426-25858',
  outputPath: './packages/jiantie/components/RSVP/ShareCard.tsx',
  componentName: 'ShareCard',
  addComments: true,
});

// 3. 读取生成的代码
let code = fs.readFileSync(outputPath, 'utf-8');

// 4. 添加功能
// 添加状态管理
code = code.replace(
  'export default function ShareCard() {',
  `interface ShareCardProps {
  shareUrl: string;
  onShare?: () => void;
}

export default function ShareCard({ shareUrl, onShare }: ShareCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShare?.();
  };
`
);

// 添加导入
code = code.replace(
  "import React from 'react';",
  "import React, { useState } from 'react';\nimport { Copy, Check } from 'lucide-react';"
);

// 5. 写回文件
fs.writeFileSync(outputPath, code, 'utf-8');

// 6. 告诉用户
console.log(`
✅ ShareCard 组件已创建！

📁 文件: packages/jiantie/components/RSVP/ShareCard.tsx

功能已添加：
- ✓ 基础 UI（从 Figma 转换）
- ✓ 复制链接功能
- ✓ 复制成功提示
- ✓ TypeScript 类型定义
- ✓ lucide-react 图标

使用方法：
\`\`\`tsx
import ShareCard from '@/components/RSVP/ShareCard';

<ShareCard
  shareUrl="https://example.com/invite/123"
  onShare={() => console.log('Shared!')}
/>
\`\`\`
`);
```

## 调试和日志

### 开发模式

在转换过程中提供详细日志：

```typescript
console.log('🔍 解析 Figma URL...');
console.log('   File Key:', fileKey);
console.log('   Node ID:', nodeId);

console.log('🌐 连接 Figma API...');
console.log('✨ 转换中...');
console.log('💾 写入文件...');
console.log('✅ 完成！');
```

### 生产模式

只显示关键信息：

```typescript
console.log('✅ 组件已创建: ', outputPath);
```

## 检查清单

每次转换后，检查：

- [ ] 文件已成功创建
- [ ] 代码格式正确（可以运行 prettier）
- [ ] 符合项目规范
- [ ] 包含必要的导入
- [ ] TypeScript 类型正确
- [ ] Tailwind 类名有效
- [ ] 响应式设计合理

## 总结

作为 Cursor AI，当用户请求从 Figma 创建组件时：

1. ✅ **优先使用** `convertFigmaToFile` - 最简单直接
2. ✅ **从环境变量读取** Token - 安全
3. ✅ **添加必要功能** - 不只是转换，要满足用户需求
4. ✅ **提供清晰反馈** - 告诉用户做了什么
5. ✅ **检查代码质量** - 确保符合项目规范

**关键代码**:

```typescript
import { convertFigmaToFile } from './packages/jiantie/app/figma2cursor/services/figma-api';

await convertFigmaToFile({
  accessToken: process.env.FIGMA_ACCESS_TOKEN!,
  figmaUrl: '[用户提供的 URL]',
  outputPath: '[用户指定的路径]',
  componentName: '[推断或用户指定的名称]',
  addComments: true,
});
```

就这么简单！🚀
