# 模板商城展示页面 (Marketplace)

## 概述

这是简帖模板商城的详情展示页面，采用类似小红书的上图下文布局，为用户提供沉浸式的模板浏览体验。

## 功能特性

### ✨ 核心功能

1. **上图下文布局** - 类似小红书的沉浸式浏览体验
2. **图片轮播** - 支持多张预览图展示，原生滚动实现，流畅的触摸交互
3. **富文本描述** - 支持 HTML/Markdown 格式的模板介绍
4. **响应式设计** - 移动端优先，完美适配各种屏幕尺寸
5. **SEO 优化** - 完整的 Open Graph 元数据支持

### 📱 用户体验优化

- ✅ Embla Carousel 高性能轮播
- ✅ 流畅的触摸手势支持
- ✅ 自动吸附到当前图片
- ✅ 图片懒加载和 CDN 优化
- ✅ 全屏图片查看模式
- ✅ 展开/收起长文本功能
- ✅ 平滑动画和过渡效果

## 文件结构

```
packages/jiantie/app/mobile/marketplace/
├── page.tsx                    # 主页面路由
├── loading.tsx                 # 加载状态
├── README.md                   # 本文档
└── components/                 # 页面组件
    ├── header.tsx              # 顶部导航栏
    ├── createBtn.tsx           # 使用模板按钮
    ├── ImageCarousel.tsx       # 图片轮播组件
    ├── RichTextDisplay.tsx     # 富文本展示组件
    ├── DetailContent.tsx       # 详情内容主组件
    └── ScrollableContent.tsx   # 可滚动容器组件
```

## 组件说明

### ImageCarousel

图片轮播组件，基于 Embla Carousel 实现，支持：
- 3:4 比例的缩略图展示
- **封面图优先**: 封面图始终显示在第一位
- 流畅的触摸滑动切换
- 自动吸附到当前图片
- 指示器和计数器
- 全屏查看模式
- 桌面端左右切换按钮
- 高性能轮播动画

**Props:**
```typescript
interface ImageCarouselProps {
  images: Array<{
    url: string;
    alt?: string;
  }>;
  onImageClick?: (index: number) => void;
}
```

### RichTextDisplay

富文本展示组件，支持：
- HTML/Markdown/纯文本格式
- 展开/收起功能
- 自定义最大高度
- 渐变遮罩效果

**Props:**
```typescript
interface RichTextDisplayProps {
  content: string;
  format?: 'html' | 'markdown' | 'plain';
  maxHeight?: number;
  showExpandButton?: boolean;
}
```

### DetailContent

详情内容主组件，整合所有子组件：
- 图片轮播区域（固定在顶部）
- 标题和元信息
- 富文本描述
- 可滚动内容区域

**Props:**
```typescript
interface DetailContentProps {
  showcaseInfo?: {
    displayTitle: string;
    displayDescription: {
      format: 'html' | 'markdown';
      content: string;
      plainText: string;
    };
    previewImages: Array<{
      id: string;
      url: string;
      order: number;
      isCover: boolean;
    }>;
    enabled: boolean;
  };
  worksDetail?: {
    title: string;
    cover: string;
    created_at?: string;
    view_count?: number;
    designer_name?: string;
  };
}
```

## 数据来源

### 优先级

1. **模板商城展示信息** (`templateShowcaseInfo`) - 如果启用且配置完整
2. **作品基本信息** (`worksDetail`) - 作为后备方案

### 数据结构

页面从 `IWorksData.templateShowcaseInfo` 中获取商城展示数据：

```typescript
// 存储在 works_data.templateShowcaseInfo
{
  displayTitle: string;                    // 展示标题
  displayDescription: {                    // 展示描述
    format: 'html' | 'markdown';
    content: string;                       // 格式化内容
    plainText: string;                     // 纯文本版本
  };
  previewImages: Array<{                   // 预览图列表
    id: string;
    url: string;
    thumbnailUrl: string;
    order: number;
    isCover: boolean;
  }>;
  enabled: boolean;                        // 是否启用商城展示
}
```

## 技术栈

- **React 19** + **Next.js 15** (App Router)
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式方案（无 SCSS）
- **Embla Carousel** - 高性能图片轮播库
- **lucide-react** - 图标库
- **@mk/services** - CDN 和 API 服务
- **@workspace/ui** - UI 组件库

## 样式规范

遵循项目规则：
1. ✅ `@workspace/ui` 组件优先
2. ✅ Tailwind CSS 布局和样式
3. ✅ lucide-react 图标
4. ❌ 禁止使用 SCSS

## 性能优化

### 图片优化
- 使用 CDN 自动缩放 (`cdnApi(url, { resizeWidth: 800 })`)
- 首屏图片 `loading="eager"`，其他 `loading="lazy"`
- 响应式图片尺寸

### 轮播优化
- Embla Carousel - 高性能轮播引擎
- 触摸拖拽支持
- 自动吸附动画
- 平滑的过渡效果

### 性能指标
- LCP < 2.5s（图片懒加载）
- FID < 100ms（原生交互）
- CLS < 0.1（固定布局）

## SEO 优化

### Open Graph 元数据

```typescript
export const generateMetadata = async ({ searchParams }) => {
  // 获取模板数据
  const showcaseInfo = worksData.templateShowcaseInfo;

  return {
    title: showcaseInfo?.displayTitle || worksDetail?.title,
    description: showcaseInfo?.displayDescription?.plainText,
    openGraph: {
      images: [coverImage],
      url: `https://jiantieapp.com/mobile/marketplace?id=${id}`,
    },
  };
};
```

## 使用方式

### 访问 URL

```
https://jiantieapp.com/mobile/marketplace?id={templateId}
```

### 参数说明

- `id` - 模板 ID（必填）
- `screenshot` - 截图模式（可选）
- `pre_works_id` - 来源作品 ID（可选）

## 兼容性

### 浏览器支持
- ✅ iOS Safari 12+
- ✅ Android Chrome 80+
- ✅ 微信内置浏览器
- ✅ 微信小程序 WebView

### 后备方案
- 如果 `templateShowcaseInfo` 不存在，使用 `worksDetail` 数据
- 如果预览图列表为空，显示作品封面
- 支持旧版本模板（向后兼容）

## 开发指南

### 本地开发

```bash
# 启动开发服务器
pnpm dev:jiantie

# 访问页面
http://localhost:3000/mobile/marketplace?id={templateId}
```

### 调试技巧

1. **查看模板数据**
   ```typescript
   console.log(initProps.worksData.templateShowcaseInfo);
   ```

2. **测试不同状态**
   - 有商城展示配置的模板
   - 无商城展示配置的模板（使用后备数据）
   - 多张预览图的轮播效果
   - 长文本的展开/收起

3. **性能分析**
   - Chrome DevTools - Lighthouse
   - 移动端真机测试
   - 网络限速测试

## 后续优化

### 待实现功能
- [ ] 图片预加载策略
- [ ] 虚拟滚动（长列表）
- [ ] 离线缓存支持
- [ ] 更多分享选项

### 性能提升
- [ ] 图片 WebP 格式支持
- [ ] Service Worker 缓存
- [ ] 骨架屏加载状态

## 相关文档

- [需求文档](/.kiro/specs/work-marketplace-display/requirements.md)
- [设计文档](/.kiro/specs/work-marketplace-display/design.md)
- [任务清单](/.kiro/specs/work-marketplace-display/tasks.md)

## 注意事项

1. **数据验证** - 始终检查 `templateShowcaseInfo` 是否存在和启用
2. **图片加载** - 使用 CDN 优化，避免原图直接加载
3. **用户体验** - 保持流畅的滚动和切换动画
4. **错误处理** - 提供合理的后备方案和错误提示

## 更新日志

### 2025-10-23
- ✅ 初始版本完成
- ✅ 实现上图下文布局
- ✅ 图片轮播组件（基于 Embla Carousel）
- ✅ 富文本展示支持
- ✅ 移动端优化
- ✅ SEO 元数据配置
- ✅ 删除 SCSS，使用 Tailwind CSS
- ✅ 添加预览效果和使用模板按钮
