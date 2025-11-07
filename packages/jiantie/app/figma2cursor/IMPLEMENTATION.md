# Figma to React Converter - 实现说明

## 项目概述

这是一个基于 Next.js 15 + React 19 的 Figma 设计稿转 React 组件工具，支持智能布局识别、Tailwind CSS 生成和 MCP 集成。

## 技术架构

### 技术栈

```
├── Next.js 15 (App Router)
├── React 19
├── TypeScript
├── Tailwind CSS
├── Figma API
├── lucide-react (图标)
└── axios (HTTP 客户端)
```

### 目录结构

```
packages/jiantie/app/figma2cursor/
├── components/           # React 组件
│   ├── FigmaImporter.tsx    # Figma 导入组件
│   └── CodePreview.tsx      # 代码预览组件
├── services/            # 核心服务
│   ├── figma.ts            # Figma API 客户端
│   ├── figma-converter.ts  # 设计稿转换器
│   ├── code-optimizer.ts   # 代码优化器
│   └── error-handler.ts    # 错误处理器
├── page.tsx             # 主页面
├── README.md            # 使用文档
├── MCP_INTEGRATION.md   # MCP 集成指南
└── IMPLEMENTATION.md    # 本文件
```

## 核心功能实现

### 1. Figma API 客户端 (`services/figma.ts`)

**功能**: 封装 Figma REST API 调用

**主要方法**:
- `getFile(fileKey)` - 获取文件信息
- `getNode(fileKey, nodeId)` - 获取特定节点数据
- `getImageFills(fileKey, nodeIds)` - 获取图片填充

**特点**:
- 使用 axios 进行 HTTP 请求
- 自动添加认证头
- 统一错误处理

```typescript
class FigmaService {
  private accessToken: string;
  private baseUrl = 'https://api.figma.com/v1';

  async getNode(fileKey: string, nodeId: string) {
    const response = await axios.get(
      `${this.baseUrl}/files/${fileKey}/nodes?ids=${nodeId}`,
      { headers: this.getHeaders() }
    );
    return response.data;
  }
}
```

### 2. 设计稿转换器 (`services/figma-converter.ts`)

**功能**: 将 Figma 节点转换为 React 组件代码

**核心算法**:

#### 2.1 布局检测 (`detectLayout`)

智能识别 Figma 的 Auto Layout 并转换为 Tailwind CSS 类：

```typescript
// Horizontal Layout → flex flex-row
if (node.layoutMode === 'HORIZONTAL') {
  classes.push('flex', 'flex-row');

  // 对齐方式
  if (node.counterAxisAlignItems === 'CENTER') {
    classes.push('items-center');
  }

  // 间距
  if (node.itemSpacing) {
    classes.push(`gap-${Math.round(node.itemSpacing / 4)}`);
  }
}
```

#### 2.2 样式转换

**颜色处理**:
1. RGB → Hex 转换
2. 常见颜色映射到 Tailwind 预设色
3. 特殊颜色使用自定义样式

```typescript
private getTailwindColor(color: any): string | null {
  const hex = this.rgbToHex(color.r, color.g, color.b);
  const colorMap: Record<string, string> = {
    '#ffffff': 'white',
    '#3b82f6': 'blue-500',
    // ...
  };
  return colorMap[hex.toLowerCase()] || null;
}
```

**尺寸处理**:
1. 小尺寸（≤384px）使用 Tailwind 类
2. 大尺寸（≥1024px）使用 `w-full`
3. 中间尺寸使用自定义像素值

**圆角处理**:
1. 小圆角（≤24px）映射到 Tailwind
2. 大圆角使用自定义样式

#### 2.3 节点类型处理

```typescript
private convertNode(node: FigmaNode): ComponentData {
  switch (node.type) {
    case 'TEXT':
      return this.convertText(node);
    case 'IMAGE':
    case 'RECTANGLE':
      return this.convertImage(node);
    case 'FRAME':
    case 'GROUP':
    case 'COMPONENT':
    case 'INSTANCE':
      return this.convertContainer(node);
    default:
      return this.convertContainer(node);
  }
}
```

#### 2.4 代码生成

递归生成 JSX 代码：

```typescript
generateReactCode(componentData: ComponentData, indent = 0): string {
  const className = tailwindClasses.join(' ');
  const attrsStr = `className="${className}"`;

  if (text) {
    return `<${component}${attrsStr}>${text}</${component}>`;
  }

  if (children) {
    const childrenStr = children
      .map(child => this.generateReactCode(child, indent + 1))
      .join('\n');
    return `<${component}${attrsStr}>${childrenStr}</${component}>`;
  }
}
```

### 3. 代码优化器 (`services/code-optimizer.ts`)

**功能**: 优化生成的代码质量

**优化策略**:

1. **类名优化**: 移除重复、冲突的类
2. **响应式处理**: 添加响应式断点
3. **性能优化**: 添加 lazy loading
4. **代码格式化**: 统一代码风格
5. **注释生成**: 添加有意义的注释

```typescript
static optimizeTailwindClasses(classes: string[]): string[] {
  // 处理冲突的类（后者覆盖前者）
  const category = this.getClassCategory(cls);
  // 移除旧的同类别类
  // ...
}
```

### 4. 错误处理器 (`services/error-handler.ts`)

**功能**: 提供友好的错误信息和解决方案

**错误类型**:

- 网络错误 (`NETWORK_ERROR`)
- 认证错误 (`AUTH_ERROR`)
- 找不到资源 (`NOT_FOUND`)
- 权限不足 (`PERMISSION_DENIED`)
- 请求频率限制 (`RATE_LIMIT`)
- URL 格式错误 (`INVALID_URL`)
- 数据转换错误 (`CONVERSION_ERROR`)

**验证功能**:

```typescript
static validateFigmaUrl(url: string) {
  // 检查域名
  if (!parsedUrl.hostname.includes('figma.com')) {
    return { valid: false, error: 'URL 必须来自 figma.com' };
  }

  // 检查路径
  if (!parsedUrl.pathname.includes('/design/')) {
    return { valid: false, error: '链接必须包含 /design/ 路径' };
  }

  // 检查 node-id
  const nodeId = parsedUrl.searchParams.get('node-id');
  if (!nodeId) {
    return { valid: false, error: '链接必须包含 node-id 参数' };
  }
}
```

### 5. UI 组件

#### 5.1 FigmaImporter 组件

**功能**: 处理用户输入和导入流程

**状态管理**:
```typescript
const [accessToken, setAccessToken] = useState('');
const [sectionLink, setSectionLink] = useState('');
const [componentName, setComponentName] = useState('FigmaComponent');
const [loading, setLoading] = useState(false);
const [error, setError] = useState<ErrorDetails | null>(null);
const [success, setSuccess] = useState(false);
const [progress, setProgress] = useState<string[]>([]);
```

**转换流程**:
1. 验证输入（Token + URL）
2. 解析 Figma 链接
3. 初始化 Figma 服务
4. 获取节点数据
5. 转换为组件数据
6. 生成 React 代码
7. 显示结果

**进度反馈**:
```typescript
const addProgress = (message: string) => {
  setProgress(prev => [...prev, message]);
};

// 使用
addProgress('解析 Figma 链接...');
addProgress('获取 Figma 节点数据...');
addProgress('生成 React 代码...');
```

#### 5.2 CodePreview 组件

**功能**: 代码预览和操作

**特性**:
- 双视图切换（JSX 片段 / 完整组件）
- 代码复制
- 文件下载
- 使用提示

```typescript
const [activeTab, setActiveTab] = useState<'jsx' | 'full'>('jsx');
const displayCode = activeTab === 'jsx' ? code : fullComponent;

const handleCopy = async () => {
  await navigator.clipboard.writeText(displayCode);
  setCopied(true);
};

const handleDownload = () => {
  const blob = new Blob([fullComponent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  // 触发下载...
};
```

## 设计决策

### 为什么选择 Tailwind CSS？

1. **项目规范**: 符合项目的样式开发规则
2. **可维护性**: 类名语义化，易于理解和修改
3. **性能**: 生产环境自动 purge 未使用的样式
4. **响应式**: 内置响应式设计支持
5. **一致性**: 保持与项目其他部分的一致性

### 为什么不完全依赖内联样式？

虽然内联样式可以精确还原设计，但有以下问题：

1. 代码冗长，难以维护
2. 无法利用 Tailwind 的工具类
3. 难以实现响应式设计
4. 性能较差（每个元素都有独立样式对象）

**解决方案**: Tailwind 为主，内联样式为辅

```typescript
// 优先使用 Tailwind
if (tailwindColor) {
  classes.push(`bg-${tailwindColor}`);
} else {
  // 回退到自定义样式
  customStyles.backgroundColor = this.convertColor(fill.color);
}
```

### 布局识别策略

**目标**: 生成语义化、可维护的布局代码

**策略**:

1. **识别 Auto Layout**
   - HORIZONTAL → `flex flex-row`
   - VERTICAL → `flex flex-col`
   - 对齐方式 → `items-*` / `justify-*`
   - 间距 → `gap-*`

2. **尺寸处理**
   - 固定小尺寸 → Tailwind 类
   - 响应式大尺寸 → `w-full` + 最大宽度
   - 特殊尺寸 → 自定义样式

3. **嵌套处理**
   - 递归转换子节点
   - 保持层级关系
   - 优化嵌套深度

## 性能优化

### 1. 图片懒加载

自动为图片添加 `loading="lazy"` 属性：

```typescript
static optimizePerformance(code: string): string {
  return code.replace(
    /<img([^>]*?)>/g,
    '<img$1 loading="lazy">'
  );
}
```

### 2. 类名去重

避免重复和冲突的类名：

```typescript
static optimizeTailwindClasses(classes: string[]): string[] {
  const classSet = new Set<string>();
  // 处理冲突...
  return Array.from(classSet);
}
```

### 3. 代码分割

对于大型组件，建议拆分为多个小组件：

```typescript
static identifySubcomponents(componentData: any): any[] {
  // 识别可以提取的子组件
  // 返回建议的拆分方案
}
```

## 测试建议

### 单元测试

```typescript
describe('FigmaConverter', () => {
  it('should convert flex layout correctly', () => {
    const node = {
      layoutMode: 'HORIZONTAL',
      counterAxisAlignItems: 'CENTER',
      itemSpacing: 16
    };
    const result = converter.detectLayout(node);
    expect(result.classes).toContain('flex');
    expect(result.classes).toContain('flex-row');
    expect(result.classes).toContain('items-center');
    expect(result.classes).toContain('gap-4');
  });
});
```

### 集成测试

```typescript
describe('Figma to React conversion', () => {
  it('should convert a simple button', async () => {
    const result = await converter.convertToReactComponent(
      'test-file-key',
      'test-node-id'
    );
    expect(result.component).toBe('div');
    expect(result.tailwindClasses.length).toBeGreaterThan(0);
  });
});
```

### E2E 测试

使用 Playwright 或 Cypress 测试完整流程：

```typescript
test('convert figma design to react component', async ({ page }) => {
  await page.goto('/figma2cursor');
  await page.fill('[placeholder*="token"]', TEST_TOKEN);
  await page.fill('[placeholder*="link"]', TEST_LINK);
  await page.click('button:has-text("开始转换")');
  await expect(page.locator('.code-preview')).toBeVisible();
});
```

## 部署说明

### 环境变量

```env
# 可选：如果使用服务端代理
FIGMA_API_BASE_URL=https://api.figma.com/v1
```

### 构建

```bash
pnpm build:jiantie
```

### Docker 部署

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm build:jiantie
CMD ["pnpm", "start:jiantie"]
```

## 未来改进

### 短期计划

1. **组件库支持**: 识别和复用 Figma 组件库
2. **变体处理**: 支持组件变体的转换
3. **主题支持**: 提取设计 token 生成主题配置
4. **图片优化**: 自动下载和优化图片资源

### 长期计划

1. **双向同步**: 代码变更同步回 Figma
2. **AI 优化**: 使用 AI 优化生成的代码
3. **协作功能**: 团队共享和模板管理
4. **插件开发**: 开发 Figma 插件简化流程

## 常见问题

### Q: 转换结果不理想怎么办？

**A**:
1. 检查 Figma 设计是否使用了 Auto Layout
2. 确保命名规范和结构清晰
3. 对于复杂设计，建议分步转换
4. 生成后手动调整和优化

### Q: 如何处理自定义字体？

**A**:
1. 在项目中配置字体文件
2. 更新 Tailwind 配置添加字体家族
3. 手动替换生成代码中的字体引用

### Q: 支持哪些 Figma 功能？

**A**:
- ✅ Auto Layout
- ✅ 基本形状和文本
- ✅ 颜色和渐变
- ✅ 阴影效果
- ⚠️ 图片（需手动处理）
- ❌ 动画和交互
- ❌ 复杂矢量图

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

内部项目，仅供团队使用。

## 致谢

- Figma API 团队
- Tailwind CSS 团队
- Next.js 团队
- 所有贡献者

---

**最后更新**: 2025-01-01
**版本**: 1.0.0
**维护者**: 开发团队
