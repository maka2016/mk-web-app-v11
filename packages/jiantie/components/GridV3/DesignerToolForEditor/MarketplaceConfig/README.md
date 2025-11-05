# 模板商城展示功能 - P0 版本

## 功能概述

为简帖模板商城系统添加展示功能，允许设计师为模板配置展示信息。

## 已完成功能（P0）

### 1. 数据结构 ✅
- **位置**: `packages/works-store/types/interface.ts`
- **新增类型**:
  - `TemplateShowcasePreviewImage` - 预览图配置
  - `TemplateShowcaseRichText` - 富文本内容
  - `TemplateShowcaseInfo` - 模板商城展示信息
- **扩展**: `IWorksData` 类新增 `templateShowcaseInfo` 字段

### 2. WorksStore API ✅
- **位置**: `packages/works-store/store/WorksStore.ts`
- **新增方法**: `WorksStore.templateShowcase.*`
  - `getShowcaseInfo()` - 获取展示信息
  - `setShowcaseInfo(info)` - 设置展示信息
  - `updateTitle(title)` - 更新标题
  - `updateDescription(desc)` - 更新描述
  - `addPreviewImage(image)` - 添加预览图
  - `removePreviewImage(imageId)` - 删除预览图
  - `setCoverImage(imageId)` - 设置封面图
  - `reorderPreviewImages(ids)` - 重新排序
  - `setEnabled(enabled)` - 启用/禁用
  - `validate()` - 验证配置
  - `getDefaultInfo()` - 获取默认配置

### 3. 配置界面组件 ✅
- **位置**: `packages/widgets/GridV3/DesignerToolForEditor/MarketplaceConfig/`
- **组件列表**:
  - `ConfigPanel.tsx` - 主配置面板
  - `PreviewImageManager.tsx` - 预览图管理（使用现有图片选择器）
  - `TitleEditor.tsx` - 标题编辑器（1-100字符）
  - `DescriptionEditor.tsx` - 描述编辑器（最多5000字符）

### 4. 富文本编辑器 ✅
- **位置**: `packages/widgets/GridV3/DesignerToolForEditor/RichTextEditor/`
- **说明**: P0 版本使用简化的 textarea 实现，支持基本文本编辑和字数统计
- **后续**: 可升级为完整的富文本编辑器（Tiptap/Lexical）

### 5. 编辑器集成 ✅
- **位置**: `packages/widgets/GridV3/DesignerToolForEditor/HeaderV2/index.tsx`
- **入口**: 编辑器顶部工具栏 → 更多 → 商城展示设置
- **条件**: 仅在 `is_template=true` 时显示

## 测试流程

### 前置条件
1. 以设计师身份登录
2. 打开一个模板编辑器（URL 包含 `is_template=true`）

### 测试步骤

#### 1. 打开配置面板
- 点击编辑器顶部的"更多"按钮
- 在下拉菜单中点击"商城展示设置"
- 应该看到配置面板弹窗

#### 2. 添加预览图
- 点击"添加图片"按钮
- 选择图片（会调用现有的图片选择器）
- 图片应该显示在预览图列表中
- 第一张图片自动设为封面（显示"封面"标识）
- 可以添加最多 9 张预览图

#### 3. 设置封面图
- 悬停在非封面图上
- 点击"设为封面"按钮
- 封面标识应该移动到新选择的图片上

#### 4. 删除预览图
- 悬停在预览图上
- 点击删除按钮（X 图标）
- 确认删除
- 图片应该从列表中移除
- 如果删除的是封面图，第一张图片自动成为新封面

#### 5. 编辑标题
- 在"展示标题"输入框中输入标题
- 实时显示字数统计（0-100）
- 超过 100 字符显示错误提示
- 修改后自动保存（观察"已保存"/"保存中..."提示）

#### 6. 编辑描述
- 在描述编辑器中输入内容
- 实时显示字数统计（0-5000）
- 超过 5000 字符显示警告
- 修改后自动保存

#### 7. 验证配置
- 点击"启用商城展示"按钮
- 系统会验证：
  - 标题不能为空且不超过 100 字符
  - 描述不超过 5000 字符
  - 至少有 1 张预览图
  - 有且只有一张封面图
- 验证通过后显示"已启用商城展示"

#### 8. 数据持久化
- 关闭配置面板
- 刷新页面
- 重新打开"商城展示设置"
- 所有配置应该正确恢复

## 数据流程

```
设计师操作
  ↓
调用 WorksStore.templateShowcase.*
  ↓
更新 worksData.templateShowcaseInfo
  ↓
_version += 1
  ↓
自动调用 saveWorksDebounce()
  ↓
POST /api/works/save（或 /api/template/save）
  ↓
保存到数据库 works_data 字段
```

## 关键技术点

### 1. 数据存储
- 数据存储在 `IWorksData.templateShowcaseInfo`
- 无需修改数据库表结构
- 完全向后兼容

### 2. 自动保存
- 所有 WorksStore API 调用后自动触发保存
- 无需手动调用 `saveWorks()`
- 监听 `worksStore.isSaved` 查看保存状态

### 3. 图片上传
- 使用现有的 `editorCtx.utils.showSelector()`
- 使用 `getImgInfo2(ossPath)` 获取图片尺寸
- 使用 `random()` 生成唯一 ID
- 无需创建新的图片上传服务

### 4. 数据验证
- 标题：1-100 字符，必填
- 描述：最多 5000 字符
- 预览图：1-9 张，至少 1 张
- 封面图：有且只有一张

## 后续优化（非P0）

1. **完整富文本编辑器**
   - 使用 Tiptap 或 Lexical
   - 支持粗体、斜体、列表、链接等格式

2. **图片拖拽排序**
   - 支持拖拽重新排序预览图

3. **展示预览**
   - 实现展示效果预览
   - 模拟商城列表卡片和详情页

4. **用户端页面**
   - 商城列表页
   - 模板详情页
   - 后端 API（/api/marketplace/templates）

## 问题排查

### 配置没有自动保存？
1. 确认调用了 WorksStore API（如 `updateTitle`）
2. 确认 `worksData._version` 有增加
3. 查看 `worksStore.isSaved` 状态
4. 检查是否有保存错误（`worksStore.saveError`）

### 图片选择器没有打开？
1. 确认 `editorCtx` 不为空
2. 检查 `showSelector` 方法是否存在
3. 查看浏览器控制台是否有错误

### 无法看到"商城展示设置"按钮？
1. 确认 URL 包含 `is_template=true`
2. 检查 `isTemplate` 变量的值
3. 确认使用的是 HeaderV2（不是 Header）

## 文件清单

### 新增文件
```
packages/works-store/types/interface.ts（修改）
packages/works-store/store/WorksStore.ts（修改）
packages/widgets/GridV3/DesignerToolForEditor/MarketplaceConfig/
  ├── ConfigPanel.tsx
  ├── PreviewImageManager.tsx
  ├── TitleEditor.tsx
  ├── DescriptionEditor.tsx
  ├── index.ts
  └── README.md
packages/widgets/GridV3/DesignerToolForEditor/RichTextEditor/
  ├── RichTextEditor.tsx
  ├── Toolbar.tsx
  └── index.ts
packages/widgets/GridV3/DesignerToolForEditor/HeaderV2/index.tsx（修改）
```

### 无需修改
- 图片上传服务（使用现有）
- 数据库表结构（无需修改）
- 保存 API（使用现有）

## 开发者说明

P0 版本聚焦于核心功能的可用性，实现了完整的数据流程和基础的用户界面。所有功能都使用现有的系统组件和服务，确保与现有代码库的兼容性。
