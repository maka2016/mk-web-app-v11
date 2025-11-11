# 海报分享工具函数使用说明

## 概述

`poster-share.ts` 提供了统一的海报生成和分享功能，解决了跨平台分享的兼容性问题。

## 核心问题

在不同设备/App版本中，分享功能的支持情况不同：
- **支持海报分享**: 使用 `type: 'images'` + `fileUri` 进行图片分享
- **不支持海报分享**: 降级为 `type: 'link'` 进行链接分享

## API

### 1. `checkSupportSharePoster()` - 检测设备支持情况

检测当前设备是否支持海报分享功能。

```typescript
const isSupported = await checkSupportSharePoster();
```

**返回值**: `Promise<boolean>`

**内部逻辑**:
- RN环境: 检测 `MKShare` feature
- Android环境: 检测 `WechatSharePoster` feature
- 其他环境: 默认返回 `true`

---

### 2. `generateWorkPoster()` - 生成作品海报

根据作品ID生成海报图片，并可选择保存到APP获取fileUri。

```typescript
const result = await generateWorkPoster(worksId, {
  saveToApp: true, // 可选，默认 true
});

// result = { urls: string[], fileUri?: string }
```

**参数**:
- `worksId: string` - 作品ID
- `options?: { saveToApp?: boolean }` - 配置选项

**返回值**: `Promise<{ urls: string[], fileUri?: string } | undefined>`

**使用场景**: 当你只需要生成海报，但不立即分享时。

---

### 3. `sharePoster()` - 执行海报分享

根据设备支持情况智能选择分享方式。

```typescript
sharePoster({
  worksId: 'work123',
  title: '我的邀请函',
  desc: '欢迎参加活动',
  cover: 'https://example.com/cover.jpg',
  shareType: 'wechat', // 'wechat' | 'wechatTimeline' | 'system' | 'copyLink' | 'qrCode'
  urls: ['https://cdn.com/poster1.jpg'],
  fileUri: 'file:///path/to/image.jpg', // 可选
  isSupportSharePoster: true,
});
```

**参数**: `SharePosterParams`
- `worksId` - 作品ID
- `title` - 分享标题
- `desc` - 作品描述（link类型需要）
- `cover` - 作品封面URL（link类型需要）
- `shareType` - 分享渠道
- `urls` - 海报图片URLs
- `fileUri` - 本地文件URI（可选）
- `isSupportSharePoster` - 是否支持海报分享

**使用场景**: 当你已经有了生成好的海报和相关信息，只需要执行分享时。

---

### 4. `generateAndSharePoster()` - 一键生成并分享 ⭐️ 推荐

**最简化的使用方式**，适合大多数场景。

```typescript
const success = await generateAndSharePoster({
  worksId: 'work123',
  title: '我的邀请函',
  desc: '欢迎参加活动',
  cover: 'https://example.com/cover.jpg',
  shareType: 'wechat',
});

if (!success) {
  toast.error('分享失败');
}
```

**参数**: `Omit<SharePosterParams, 'urls' | 'fileUri' | 'isSupportSharePoster'>`

**返回值**: `Promise<boolean>` - 是否分享成功

**内部流程**:
1. 自动检测设备支持情况
2. 生成海报（如支持则保存获取fileUri）
3. 智能选择分享方式执行分享

---

## 完整使用示例

### 示例 1: 分享到微信好友（推荐方式）

```typescript
import { generateAndSharePoster } from '@/utils/poster-share';

const handleShareToWechat = async () => {
  if (!work) return;

  // 权限检查...
  const hasPermission = await checkSharePermission();
  if (!hasPermission) {
    showVipInterceptor();
    return;
  }

  try {
    setIsGeneratingPoster(true);

    const success = await generateAndSharePoster({
      worksId: work.id,
      title: work.title || '邀请函',
      desc: work.desc || '',
      cover: work.cover,
      shareType: 'wechat',
    });

    if (!success) {
      toast.error('分享失败，请重试');
    }
  } finally {
    setIsGeneratingPoster(false);
  }
};
```

### 示例 2: 系统分享

```typescript
const handleMoreShare = async () => {
  if (!work) return;

  try {
    setIsGeneratingPoster(true);

    await generateAndSharePoster({
      worksId: work.id,
      title: work.title || '邀请函',
      desc: work.desc || '',
      cover: work.cover,
      shareType: 'system', // 使用系统分享
    });
  } finally {
    setIsGeneratingPoster(false);
  }
};
```

### 示例 3: 自定义流程（高级用法）

如果你需要更细粒度的控制：

```typescript
import {
  checkSupportSharePoster,
  generateWorkPoster,
  sharePoster
} from '@/utils/poster-share';

const handleCustomShare = async () => {
  // 1. 检测支持情况
  const isSupportSharePoster = await checkSupportSharePoster();

  // 2. 生成海报
  const result = await generateWorkPoster(workId, {
    saveToApp: isSupportSharePoster,
  });

  if (!result) {
    toast.error('生成失败');
    return;
  }

  // 3. 自定义处理...
  console.log('生成了', result.urls.length, '张海报');

  // 4. 执行分享
  sharePoster({
    worksId: workId,
    title: '标题',
    desc: '描述',
    cover: coverUrl,
    shareType: 'wechat',
    urls: result.urls,
    fileUri: result.fileUri,
    isSupportSharePoster,
  });
};
```

---

## 设计原则

1. **智能降级**: 不支持海报分享时自动降级为链接分享
2. **类型安全**: 完整的TypeScript类型定义
3. **易于使用**: 提供简单的一键分享和灵活的组合API
4. **错误处理**: 统一的错误提示和日志记录
5. **可扩展**: 支持更多分享渠道的扩展

---

## 常见问题

### Q1: 为什么要区分 images 和 link 两种分享方式？

A: 因为不同版本的APP对图片分享的支持不同。老版本不支持直接分享图片，需要降级为链接分享。

### Q2: fileUri 的作用是什么？

A: fileUri 是图片保存到本地后的文件路径，某些Android设备需要这个参数才能正确分享图片。

### Q3: 什么时候使用 generateAndSharePoster，什么时候用分步API？

A:
- **90%的场景**: 使用 `generateAndSharePoster()` 一键完成
- **需要自定义处理**: 使用分步API（检测→生成→处理→分享）

### Q4: 如何添加新的分享渠道？

A: 在 `SharePosterParams` 的 `shareType` 中添加新的类型，并在 `sharePoster()` 函数中处理对应逻辑。

---

## 相关文件

- `/packages/jiantie/utils/poster-share.ts` - 工具函数
- `/packages/jiantie/app/mobile/works2/components/WorkDetailContent.tsx` - 使用示例（作品详情分享）
- `/packages/jiantie/app/mobile/poster-share/components/main.tsx` - 使用示例（海报导出页）

## 已在使用的页面

以下页面已经使用了通用函数：

1. **作品详情页** (`WorkDetailContent.tsx`)
   - 使用 `generateAndSharePoster()` 实现微信分享和系统分享

2. **海报导出页** (`poster-share/main.tsx`)
   - 使用 `checkSupportSharePoster()` 检测设备支持
   - 使用 `sharePoster()` 执行分享
