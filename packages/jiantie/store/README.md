# 统一基建 Store 使用指南

## 📋 概述

统一的全局 Store 架构，提供三大核心功能：

1. **环境检测** (EnvironmentStore) - 运行环境、设备信息、浏览器信息
2. **路由跳转** (NavigationStore) - 自动处理 Web/APP/小程序跳转
3. **分享功能** (ShareStore) - 统一的分享接口

## 🎯 快速开始

### 基础使用

```typescript
import { useStore, useEnvironment, useNavigation, useShare } from '@/store';
import { observer } from 'mobx-react';

const MyComponent = observer(() => {
  // 方式1: 获取完整 store
  const store = useStore();

  // 方式2: 使用便捷 Hook
  const env = useEnvironment();
  const nav = useNavigation();
  const share = useShare();

  return (
    <div>
      {/* 环境检测 */}
      {env.isInApp && <p>运行在 APP 内</p>}
      {env.isIOS && <p>iOS 设备</p>}

      {/* 路由跳转 */}
      <button onClick={() => nav.push('/editor')}>
        跳转编辑器
      </button>

      {/* 分享功能 */}
      <button onClick={() => share.shareWork({
        workId: '123',
        title: '我的作品'
      })}>
        分享作品
      </button>
    </div>
  );
});
```

## 1️⃣ 环境检测 (EnvironmentStore)

### 可用属性

```typescript
const env = useEnvironment();

// ===== 运行环境 =====
env.isInApp        // 是否在 APP 内
env.isInMiniP      // 是否在小程序内
env.runtime        // 'IOS' | 'ANDROID' | 'MINIPROGRAM' | 'WEB'

// ===== 设备信息 =====
env.isIOS          // 是否 iOS 设备
env.isAndroid      // 是否 Android 设备
env.isIPadOS       // 是否 iPad OS
env.isMakaAppIOS   // 是否 MAKA iOS APP
env.isMakaAppAndroid // 是否 MAKA Android APP

// ===== 浏览器环境 =====
env.isWechat       // 是否微信浏览器
env.isAlipay       // 是否支付宝浏览器
env.isUCBrowser    // 是否 UC 浏览器

// ===== 状态 =====
env.isInitialized  // 是否已初始化
```

### 使用示例

#### 之前的写法 ❌

```typescript
const [isMiniP, setIsMiniP] = useState(false);
const [isInApp, setIsInApp] = useState(false);

useEffect(() => {
  setIsMiniP(APPBridge.judgeIsInMiniP());
  setIsInApp(APPBridge.judgeIsInApp());
}, []);

if (isInApp) {
  // ...
}
```

#### 现在的写法 ✅

```typescript
const env = useEnvironment();

if (env.isInApp) {
  // ...
}
```

## 2️⃣ 路由跳转 (NavigationStore)

### 基础方法

```typescript
const nav = useNavigation();

// 页面跳转
nav.push(path, options?)
nav.replace(path, options?)
nav.back()
```

### 快捷方法

```typescript
// 跳转编辑器
nav.toEditor(worksId, uid, options?)

// 跳转分享页
nav.toShare(worksId, uid, options?)

// 跳转视频分享
nav.toVideoShare(worksId, uid?, options?)

// 跳转海报分享
nav.toPosterShare(worksId, uid?, options?)

// 跳转通知中心
nav.toNotificationCenter(options?)
```

### NavigationOptions 配置

```typescript
interface NavigationOptions {
  replace?: boolean;        // 是否使用 replace
  fullScreen?: boolean;     // 是否全屏（APP内，默认 true）
  popEnable?: boolean;      // 是否启用手势返回（APP内）
  query?: Record<string, any>; // 额外查询参数
}
```

### 使用示例

#### 之前的写法 ❌

```typescript
if (APPBridge.judgeIsInApp()) {
  APPBridge.navToPage({
    url: `${location.origin}/editor?works_id=${works_id}&uid=${uid}&is_full_screen=1&popEnable=0`,
    type: 'URL',
  });
} else {
  router.push(
    getUrlWithParam(
      `/editor?works_id=${works_id}&uid=${uid}&appid=${appid}`,
      'clickid'
    )
  );
}
```

#### 现在的写法 ✅

```typescript
const nav = useNavigation();

// 方式1: 使用快捷方法
nav.toEditor(works_id, uid, {
  fullScreen: true,
  popEnable: false
});

// 方式2: 使用通用方法
nav.push('/editor', {
  fullScreen: true,
  popEnable: false,
  query: {
    works_id,
    uid,
    appid
  }
});
```

#### 更多示例

```typescript
// 普通跳转
nav.push('/mobile/home');

// 带参数跳转
nav.push('/mobile/template', {
  query: {
    category: 'poster',
    page: 1
  }
});

// 替换当前页面
nav.replace('/mobile/works');

// 返回上一页
nav.back();

// 小程序自动处理
nav.toVideoShare(worksId); // 在小程序内会自动使用小程序路径
```

## 3️⃣ 分享功能 (ShareStore)

### 核心方法

```typescript
const share = useShare();

// 分享链接
share.shareLink(params: ShareLinkParams)

// 分享图片
share.shareImages(params: ShareImagesParams)

// 分享微信视频
share.shareWechatVideo(params: ShareVideoParams)

// 分享抖音视频
share.shareDouyinVideo()

// 分享小程序
share.shareMiniProgram(params: ShareMiniProgramParams)

// 快捷：分享作品
share.shareWork(params)
```

### 类型定义

```typescript
// 分享类型
type ShareType = 'wechat' | 'wechatTimeline' | 'system' | 'douyin' | 'miniprogram';

// 分享链接参数
interface ShareLinkParams {
  title: string;
  content?: string;
  thumb?: string;
  url: string;
  shareType?: ShareType;
  appid?: string;
}

// 分享图片参数
interface ShareImagesParams {
  title: string;
  urls: string[];
  fileUri?: string;
  shareType?: ShareType;
  appid?: string;
}

// 分享视频参数
interface ShareVideoParams {
  title: string;
  content?: string;
  thumb?: string;
  url: string;
  scene?: '0' | '1'; // 0-好友，1-朋友圈
  appid?: string;
}
```

### 使用示例

#### 之前的写法 ❌

```typescript
APPBridge.appCall({
  type: 'MKShare',
  appid: 'jiantie',
  params: {
    title: work.title || '邀请函',
    content: work.desc || '',
    thumb: thumbUrl,
    type: 'link',
    shareType: 'wechat',
    url: `${location.origin}/viewer2/${work.id}?appid=${getAppId()}`,
  },
});
```

#### 现在的写法 ✅

```typescript
const share = useShare();

// 方式1: 使用快捷方法
share.shareWork({
  workId: work.id,
  title: work.title || '邀请函',
  desc: work.desc,
  cover: work.cover,
  shareType: 'wechat'
});

// 方式2: 使用通用方法
share.shareLink({
  title: work.title || '邀请函',
  content: work.desc || '',
  thumb: thumbUrl,
  url: `${location.origin}/viewer2/${work.id}?appid=${appid}`,
  shareType: 'wechat'
});
```

#### 更多示例

```typescript
// 分享图片
share.shareImages({
  title: '我的海报',
  urls: [imageUrl1, imageUrl2],
  shareType: 'wechatTimeline'
});

// 分享视频到微信好友
share.shareWechatVideo({
  title: '我的视频',
  content: '精彩视频',
  url: videoUrl,
  scene: '0' // 0-好友
});

// 分享视频到朋友圈
share.shareWechatVideo({
  title: '我的视频',
  url: videoUrl,
  scene: '1' // 1-朋友圈
});

// 分享到抖音
share.shareDouyinVideo();

// 分享小程序
share.shareMiniProgram({
  webpageUrl: 'https://maka.im/works/123',
  path: '/pages/works/detail?id=123',
  title: '精美作品',
  description: '快来看看我的作品'
});
```

### 🔒 权限检查

分享功能**内置了权限检查和 VIP 拦截**，无需手动处理。

#### 自动权限检查

```typescript
const share = useShare();

// shareWork 默认开启权限检查
await share.shareWork({
  workId: '123',
  title: '我的作品',
  templateId: 'template_id',
  shareType: 'wechat',
  checkPermission: true, // 默认为 true
});

// 如果用户没有权限，会自动：
// 1. 检查 VIP 状态
// 2. 调用权限检查 API
// 3. 如果无权限，弹出 VIP 付费拦截页
// 4. 不执行分享操作
```

#### 跳过权限检查

某些场景下可以跳过权限检查：

```typescript
// 分享链接时手动控制权限检查
await share.shareLink({
  title: '分享标题',
  url: 'https://...',
  worksId: '123',
  templateId: 'template_id',
  checkPermission: true, // 开启权限检查
});

// 或跳过权限检查（不推荐）
await share.shareWork({
  workId: '123',
  title: '我的作品',
  checkPermission: false, // 跳过权限检查
});
```

#### 权限检查逻辑

权限检查的判断逻辑：

1. **VIP 用户** → 直接通过
2. **非 VIP 用户** → 调用 API 检查是否有分享权限
3. **无权限** → 弹出 VIP 付费拦截页，阻止分享
4. **有权限** → 继续执行分享操作

#### 权限检查的集成

权限检查已自动集成在 Store 初始化时，无需手动配置：

```typescript
// store/index.ts 中已自动设置
constructor() {
  this.environment = environmentStore;
  this.navigation = new NavigationStore(this.environment);
  this.share = new ShareStore(this.environment);

  // 自动设置分享权限检查
  this.setupSharePermissionCheck();
}
```

## 🎨 实际应用场景

### 场景1: 作品详情页

```typescript
import { useEnvironment, useNavigation, useShare } from '@/store';
import { observer } from 'mobx-react';

const WorkDetail = observer(({ work }) => {
  const env = useEnvironment();
  const nav = useNavigation();
  const share = useShare();

  return (
    <div>
      {/* 编辑按钮 */}
      <button onClick={() => nav.toEditor(work.id, work.uid)}>
        编辑
      </button>

      {/* 分享按钮 */}
      <button onClick={() => share.shareWork({
        workId: work.id,
        title: work.title,
        desc: work.desc,
        cover: work.cover
      })}>
        分享
      </button>

      {/* APP 特有功能 */}
      {env.isInApp && (
        <button onClick={() => share.shareDouyinVideo()}>
          分享到抖音
        </button>
      )}
    </div>
  );
});
```

### 场景2: 导航组件

```typescript
import { useNavigation } from '@/store';
import { observer } from 'mobx-react';

const Header = observer(() => {
  const nav = useNavigation();

  return (
    <header>
      <button onClick={() => nav.back()}>返回</button>
      <button onClick={() => nav.push('/mobile/home')}>首页</button>
      <button onClick={() => nav.toNotificationCenter()}>通知</button>
    </header>
  );
});
```

### 场景3: 分享面板

```typescript
import { useShare, useEnvironment } from '@/store';
import { observer } from 'mobx-react';

const SharePanel = observer(({ work }) => {
  const share = useShare();
  const env = useEnvironment();

  const shareToWechat = () => {
    share.shareWork({
      workId: work.id,
      title: work.title,
      shareType: 'wechat'
    });
  };

  const shareToMoments = () => {
    share.shareWork({
      workId: work.id,
      title: work.title,
      shareType: 'wechatTimeline'
    });
  };

  const shareToSystem = () => {
    share.shareWork({
      workId: work.id,
      title: work.title,
      shareType: 'system'
    });
  };

  return (
    <div>
      <button onClick={shareToWechat}>微信好友</button>
      <button onClick={shareToMoments}>朋友圈</button>
      <button onClick={shareToSystem}>更多</button>

      {env.isInApp && (
        <button onClick={() => share.shareDouyinVideo()}>
          抖音
        </button>
      )}
    </div>
  );
});
```

## 💡 最佳实践

### 1. 使用 observer 包装组件

由于使用 MobX，需要用 `observer` 包装组件以响应状态变化：

```typescript
import { observer } from 'mobx-react';

const MyComponent = observer(() => {
  const env = useEnvironment();
  // ...
});
```

### 2. 优先使用便捷 Hook

```typescript
// ✅ 推荐：按需导入
const env = useEnvironment();
const nav = useNavigation();
const share = useShare();

// ❌ 不推荐：全部导入
const store = useStore();
const env = store.environment;
const nav = store.navigation;
const share = store.share;
```

### 3. 结合用户信息使用

```typescript
const MyComponent = observer(() => {
  const store = useStore();

  // 同时使用环境和用户信息
  if (store.environment.isInApp && store.isVip) {
    // VIP 用户在 APP 内的特殊功能
  }
});
```

### 4. 类型安全

所有方法都有完整的 TypeScript 类型定义，IDE 会提供自动补全。

## 🔧 高级用法

### 手动更新环境信息

```typescript
import { environmentStore } from '@/store';

// 特殊场景下手动更新
environmentStore.updateEnvironment('isWechat', true);
```

### 监听环境变化

```typescript
import { reaction } from 'mobx';
import { environmentStore } from '@/store';

reaction(
  () => environmentStore.isInApp,
  (isInApp) => {
    console.log('APP 环境变化:', isInApp);
  }
);
```

## 📊 对比总结

| 项目         | 之前         | 现在     |
| ------------ | ------------ | -------- |
| **代码量**   | 8-10 行/组件 | 1 行     |
| **重复代码** | 81+ 处重复   | 0 处重复 |
| **环境检测** | 每个组件独立 | 全局统一 |
| **路由跳转** | 手动判断环境 | 自动处理 |
| **分享功能** | 分散各处     | 统一接口 |
| **类型安全** | ❌            | ✅        |
| **可维护性** | ⭐⭐           | ⭐⭐⭐⭐⭐    |

## ❓ 常见问题

### Q: 为什么要用 observer？

A: 因为使用 MobX 管理状态，需要 `observer` 让组件响应状态变化。

### Q: 是否会影响性能？

A: 不会。环境检测只在应用启动时执行一次，后续都是读取缓存。

### Q: 如何在非 React 组件中使用？

A: 可以直接导入 store 实例：

```typescript
import { environmentStore, activitiveStore } from '@/store';

if (environmentStore.isInApp) {
  // ...
}
```

### Q: 支持服务端渲染吗？

A: 环境检测只在客户端执行，服务端会使用默认值，不会报错。
