# Viewer 数据获取架构重构

## 📋 重构目标

将复杂的 `getInitialPropsCommonAppRouter` 简化为清晰的分层架构：
- **数据层**：纯数据获取，无业务逻辑
- **业务层**：权限判断、状态控制等核心业务逻辑

## 🏗️ 新架构

### 1. 数据层：`getViewerData.ts`

```typescript
// 纯数据获取函数
getViewerData({
  worksId: string,
  uid?: string,
  version?: string
})
```

**职责：**
- 获取作品详情（worksDetail + specInfo）
- 获取作品数据（worksData from OSS）
- 获取 Widget Metadata
- **不包含任何业务逻辑**

### 2. 辅助函数：`getUserPermissions`

```typescript
// 获取用户权限
getUserPermissions({
  uid: string | number,
  worksId: string,
  appid?: string
})
```

### 3. 业务层：页面组件

各页面在 `getWorksData` 函数中处理业务逻辑：
- 权限判断（canShare, canExport）
- 水印控制（showWatermark）
- 品牌信息（brandLogoUrl, brandText）
- 链接状态（isTempLink, isExpire）

## 📦 使用示例

### 模板页面（简单场景）

```typescript
// app/mobile/template/page.tsx
const viewerData = await getViewerData({
  worksId: id,
  version: searchParamsRes.version,
});

// 直接使用数据，无需复杂业务逻辑
const initProps = {
  ...viewerData,
  websiteControl: {
    isTempLink: false,
    isExpire: false,
    viewMode: 'viewer',
    showWatermark: false,
    floatAD: false,
  },
  permissionData: {},
};
```

### 作品查看器（复杂场景）

```typescript
// app/viewer2/[worksId]/page.tsx
async function getWorksData(paramsRes) {
  // 1. 获取基础数据
  const viewerData = await getViewerData({
    worksId: paramsRes.worksId,
    uid: paramsRes.uid,
    version: paramsRes.version,
  });

  // 2. 获取用户权限
  const permissionData = await getUserPermissions({
    uid: viewerData.worksDetail.uid,
    worksId: paramsRes.worksId,
    appid: paramsRes.appid,
  });

  // 3. 核心业务逻辑：权限判断
  const websiteControl = {
    isTempLink: false,
    isExpire: false,
    viewMode: 'viewer',
    showWatermark: false,
    floatAD: false,
  };

  if (paramsRes.back_door) {
    // 后门模式：无限制
  } else if (viewerData.worksDetail.template_id) {
    // 从模板创建的作品：根据分享类型判断
    const { websiteSupport, videoSupport, posterSupport } =
      getShareInfo(viewerData.worksDetail);

    if (websiteSupport) {
      const canShare = await checkCanShare(paramsRes);
      // 根据权限设置控制参数
    }
  }

  return { ...viewerData, permissionData, websiteControl };
}
```

## ✅ 重构优势

### 1. **关注点分离**
- 数据获取 ≠ 业务逻辑
- 每个函数职责单一明确

### 2. **可维护性提升**
- 数据层变化不影响业务逻辑
- 业务逻辑可独立测试

### 3. **代码复用**
- `getViewerData` 可在多个页面复用
- 业务逻辑按需组合

### 4. **易于理解**
```typescript
// ❌ 之前：复杂的 getInitialPropsCommonAppRouter
// 混合了数据获取、权限判断、状态控制等多种逻辑
// 难以理解和维护

// ✅ 现在：清晰的分层
// 1. getViewerData() - 纯数据
// 2. getUserPermissions() - 权限数据
// 3. 页面层 - 业务逻辑
```

## 🔄 迁移指南

### 从旧 API 迁移

```typescript
// 旧方式
const initData = await getInitialPropsCommonAppRouter({
  headers: headObj,
  pathname: pathname,
  query: paramsRes,
});

// 新方式
const viewerData = await getViewerData({
  worksId: paramsRes.worksId,
  uid: paramsRes.uid,
  version: paramsRes.version,
});

const permissionData = await getUserPermissions({
  uid: viewerData.worksDetail.uid,
  worksId: paramsRes.worksId,
  appid: paramsRes.appid,
});

// 在页面层处理业务逻辑
const websiteControl = {
  // ... 你的业务逻辑
};
```

## 📂 文件结构

```
components/viewer/utils/
├── getViewerData.ts          # 新：纯数据获取
├── getInitialPropsCommon2.ts # 旧：待废弃
└── README.md                 # 本文档

server/src/routers/
└── viewer.ts                 # tRPC API（供客户端组件使用）
```

## 🎯 核心原则

1. **数据层纯净**：只负责数据获取，不做判断
2. **业务逻辑上移**：在页面层处理，易于维护
3. **服务端直调**：服务端组件直接调用函数，不走 HTTP
4. **灵活组合**：按需使用数据和权限函数
