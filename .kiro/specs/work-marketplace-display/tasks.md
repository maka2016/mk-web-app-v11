# 模板商城展示功能开发任务

## 业务说明

- **模板（Template）**: 设计师创作并上架到简帖商城的商品
- **作品（Work）**: 简帖用户基于模板创作的内容
- 本功能只针对**模板**添加商城展示配置，作品不需要

## 阶段 1: 数据结构和 WorksStore 扩展

### Task 1.1: 扩展 IWorksData 类型定义 ⭐

- [ ] 在 `packages/works-store/types/interface.ts` 中添加类型定义
- [ ] 定义 `TemplateShowcasePreviewImage` 接口
- [ ] 定义 `TemplateShowcaseRichText` 接口
- [ ] 定义 `TemplateShowcaseInfo` 接口
- [ ] 在 `IWorksData` 类中添加 `templateShowcaseInfo?: TemplateShowcaseInfo` 字段

### Task 1.2: 扩展 WorksStore API ⭐

- [ ] 在 `packages/works-store/store/WorksStore.ts` 中添加 `templateShowcase` 对象
- [ ] 实现 `getShowcaseInfo()` 方法
- [ ] 实现 `setShowcaseInfo(info)` 方法
- [ ] 实现 `updateTitle(title)` 方法
- [ ] 实现 `updateDescription(description)` 方法
- [ ] 实现 `addPreviewImage(image)` 方法
- [ ] 实现 `removePreviewImage(imageId)` 方法
- [ ] 实现 `setCoverImage(imageId)` 方法
- [ ] 实现 `reorderPreviewImages(imageIds)` 方法
- [ ] 实现 `setEnabled(enabled)` 方法
- [ ] 实现 `getDefaultInfo()` 方法
- [ ] 实现 `validate()` 方法
- [ ] 注意：WorksStore 会自动保存，无需手动调用 `saveWorksDebounce()`

### Task 1.3: 商城服务 API（后端）

- [ ] 在后端添加 `/api/marketplace/templates` API（商城列表）
- [ ] 查询 `is_template=true` 且 `showcase_enabled=true` 的模板
- [ ] 解析 `works_data` 中的 `templateShowcaseInfo`
- [ ] 添加分页、排序支持
- [ ] 注意：图片上传使用现有系统，无需新增 API

## 阶段 2: 基础组件开发

### Task 2.1: 富文本编辑器组件（设计师功能）

- [ ] 创建 `packages/widgets/GridV3/DesignerToolForEditor/RichTextEditor/` 目录
- [ ] 实现 `RichTextEditor.tsx` 主组件
- [ ] 实现编辑器工具栏 `Toolbar.tsx`
- [ ] 支持基础格式（粗体、斜体、下划线）
- [ ] 支持列表（有序、无序）
- [ ] 支持链接插入
- [ ] 添加字数统计功能
- [ ] 确保移动端友好

### Task 2.2: 富文本显示组件（用户端）

- [ ] 在 `packages/jiantie/app/mobile/marketplace/[templateId]/components/` 创建 `RichTextDisplay.tsx`
- [ ] 实现 HTML 格式渲染
- [ ] 实现 Markdown 格式渲染（如果需要）
- [ ] 添加"展开/收起"功能（长内容）
- [ ] 样式美化（使用 Tailwind prose 类）

### Task 2.3: 图片轮播组件（用户端）

- [ ] 在 `packages/jiantie/app/mobile/marketplace/[templateId]/components/` 创建 `ImageCarousel.tsx`
- [ ] 集成 embla-carousel-react
- [ ] 实现图片滑动切换
- [ ] 添加指示器（显示当前位置）
- [ ] 实现点击图片进入全屏查看
- [ ] 优化触摸交互（移动端）
- [ ] 添加响应式支持

### Task 2.4: 预览图管理器组件（设计师功能）

- [ ] 在 `packages/widgets/GridV3/DesignerToolForEditor/MarketplaceConfig/` 创建 `PreviewImageManager.tsx`
- [ ] 使用 `editorCtx.utils.showSelector()` 调用现有图片选择器
- [ ] 使用 `getImgInfo2(ossPath)` 获取图片尺寸信息
- [ ] 实现图片列表展示（网格布局）
- [ ] 实现"设为封面"功能
- [ ] 实现"删除图片"功能
- [ ] 添加图片数量限制提示（最多9张）
- [ ] 使用 @workspace/ui 组件

## 阶段 3: 配置界面开发（设计师功能）

### Task 3.1: 配置面板组件

- [ ] 创建 `packages/widgets/GridV3/DesignerToolForEditor/MarketplaceConfig/ConfigPanel.tsx`
- [ ] 通过 `useGridContext()` 获取 `editorSDK.fullSDK`（WorksStore）
- [ ] 使用 `worksStore.templateShowcase.getShowcaseInfo()` 读取配置
- [ ] 实现面板布局（使用 ResponsiveDialog）
- [ ] 集成预览图管理器
- [ ] 集成标题编辑器
- [ ] 集成描述编辑器
- [ ] 使用 `worksStore.templateShowcase.validate()` 验证
- [ ] 所有更新操作直接调用 WorksStore API（自动保存）
- [ ] 添加保存状态提示（监听 `worksStore.isSaved`）

### Task 3.2: 预览图管理器集成

- [ ] 在 ConfigPanel 中集成 PreviewImageManager 组件
- [ ] 从 props 接收 `worksStore` 和 `images`
- [ ] 显示预览图列表（网格布局）
- [ ] 使用 `editorCtx.utils.showSelector()` 添加图片（无需上传器）
- [ ] 实现拖拽排序（可选，调用 worksStore.reorderPreviewImages）
- [ ] 添加"设为封面"按钮（调用 worksStore.setCoverImage）
- [ ] 添加"删除"按钮（调用 worksStore.removePreviewImage）
- [ ] 实现图片点击预览（可选）
- [ ] 显示封面图标识
- [ ] 在 UI 层限制最多 9 张（WorksStore 也会验证）

### Task 3.3: 标题编辑器

- [ ] 创建 `packages/widgets/GridV3/DesignerToolForEditor/MarketplaceConfig/TitleEditor.tsx`
- [ ] 从 props 接收 `worksStore` 和当前标题
- [ ] 实现文本输入框（使用 @workspace/ui 的 Input）
- [ ] 添加字数统计（最多 100 字符）
- [ ] onChange 时调用 `worksStore.templateShowcase.updateTitle()`
- [ ] 显示实时错误提示

### Task 3.4: 描述编辑器

- [ ] 创建 `packages/widgets/GridV3/DesignerToolForEditor/MarketplaceConfig/DescriptionEditor.tsx`
- [ ] 从 props 接收 `worksStore` 和当前描述
- [ ] 集成富文本编辑器
- [ ] 添加字数统计（最多 5000 字符）
- [ ] onChange 时调用 `worksStore.templateShowcase.updateDescription()`
- [ ] 添加超长警告

### Task 3.5: 展示预览组件

- [ ] 创建 `packages/widgets/GridV3/DesignerToolForEditor/MarketplaceConfig/DisplayPreview.tsx`
- [ ] 从 props 接收 showcaseInfo
- [ ] 模拟商城卡片预览
- [ ] 模拟详情页预览
- [ ] 添加关闭按钮

### Task 3.6: 辅助工具说明

- [ ] 注意：使用 `@mk/utils` 中的 `random()` 函数生成唯一 ID
- [ ] 注意：图片上传使用现有的 `editorCtx.utils.showSelector()`
- [ ] 注意：图片信息使用现有的 `getImgInfo2(ossPath)` 获取
- [ ] 无需创建额外的工具文件

## 阶段 4: 商城展示界面（用户端，参考 mobile/template 结构）

### Task 4.1: 商城列表页

- [ ] 创建 `packages/jiantie/app/mobile/marketplace/page.tsx`
- [ ] 创建 `packages/jiantie/app/mobile/marketplace/components/main.tsx`
- [ ] 创建 `packages/jiantie/app/mobile/marketplace/components/header.tsx`
- [ ] 创建 `packages/jiantie/app/mobile/marketplace/loading.tsx`
- [ ] 实现模板列表加载（调用 getMarketplaceTemplates）
- [ ] 使用响应式网格布局
- [ ] 实现分页或无限滚动
- [ ] 添加筛选和排序功能（热门、最新、趋势）
- [ ] 添加搜索功能
- [ ] 优化 SEO（使用 Next.js metadata）

### Task 4.2: 模板卡片组件

- [ ] 创建 `packages/jiantie/app/mobile/marketplace/components/TemplateCard.tsx`
- [ ] 显示封面图
- [ ] 显示展示标题
- [ ] 显示设计师信息
- [ ] 显示统计信息（浏览、使用次数）
- [ ] 实现点击跳转到详情页
- [ ] 参考 mobile/channel/components/template-card 实现
- [ ] 使用 Tailwind CSS 样式
- [ ] 响应式设计

### Task 4.3: 模板详情路由页

- [ ] 创建 `packages/jiantie/app/mobile/marketplace/[templateId]/page.tsx`
- [ ] 创建 `packages/jiantie/app/mobile/marketplace/[templateId]/loading.tsx`
- [ ] 实现模板数据获取（SSG/SSR）
- [ ] 实现 generateMetadata 配置 SEO
- [ ] 添加错误处理（模板不存在等）
- [ ] 实现 Open Graph 分享配置

### Task 4.4: 模板详情页组件

- [ ] 创建 `packages/jiantie/app/mobile/marketplace/[templateId]/components/main.tsx`
- [ ] 创建 `packages/jiantie/app/mobile/marketplace/[templateId]/components/header.tsx`
- [ ] 创建 `packages/jiantie/app/mobile/marketplace/[templateId]/components/index.module.scss`
- [ ] 实现上图下文布局（类似小红书）
- [ ] 集成图片轮播组件（顶部）
- [ ] 显示展示标题和描述
- [ ] 集成富文本显示组件
- [ ] 显示设计师信息和统计信息
- [ ] 添加"使用此模板"按钮（核心功能）
- [ ] 参考 mobile/template 的实现方式
- [ ] 响应式设计（移动端优先）

### Task 4.5: 商城服务 API（前端）

- [ ] 创建 `packages/jiantie/services/marketplace.ts`
- [ ] 实现 `getMarketplaceTemplates()` - 调用 `/api/marketplace/templates`
- [ ] 实现 `getTemplateDetail()` - 复用现有的 `/api/works/:id`
- [ ] 添加类型定义和错误处理

### Task 4.6: 商城服务 API（后端）

- [ ] 在后端创建 `/api/marketplace/templates` 路由
- [ ] 查询 `works` 表，筛选 `is_template=true` 且 `showcase_enabled=true`
- [ ] 解析 `works_data` JSON 中的 `templateShowcaseInfo`
- [ ] 实现分页、排序功能
- [ ] 返回包含封面图的列表数据
- [ ] 注意：图片上传使用现有系统，无需新增路由

## 阶段 5: 编辑器集成

### Task 5.1: 在设计师编辑器中添加配置入口

- [ ] 在 `packages/widgets/GridV3/DesignerToolForEditor/HeaderV2/index.tsx` 中添加"商城展示设置"按钮
- [ ] 使用 `lucide-react` 的 `Store` 或 `ShoppingBag` 图标
- [ ] 按钮只在 `isTemplate === true` 时显示
- [ ] 实现按钮点击打开 ResponsiveDialog
- [ ] 将配置面板组件集成到对话框中
- [ ] 参考现有的 CoverManager、MusicManager 的实现方式
- [ ] 添加权限检查（基于 designerInfo.isDesigner）
- [ ] 确保不影响现有编辑器功能

### Task 5.2: 模板保存验证

- [ ] 利用现有的 `WorksStore.api.saveWorks()` 机制
- [ ] 无需修改保存逻辑（templateShowcaseInfo 会自动包含在 worksData 中）
- [ ] 确认后端正确保存 works_data JSON 字段
- [ ] 测试保存和读取流程

### Task 5.3: 模板加载时恢复商城配置

- [ ] 模板加载时 worksData 自动包含 templateShowcaseInfo
- [ ] 配置面板通过 `worksStore.templateShowcase.getShowcaseInfo()` 读取
- [ ] 处理向后兼容（没有配置返回 null，使用默认值）
- [ ] 根据用户角色显示不同界面（设计师可编辑 vs 用户只读）

## 阶段 6: 图片处理和优化

### Task 6.1: 图片展示优化

- [ ] 使用现有的 CDN 服务（已配置）
- [ ] 注意：图片上传和 OSS 配置使用现有系统

### Task 6.2: 图片响应式处理

- [ ] 实现不同尺寸图片生成
- [ ] 使用 Next.js Image 组件
- [ ] 配置 srcset 和 sizes
- [ ] 实现懒加载
- [ ] 添加占位符（blur）

### Task 6.3: 图片查看器

- [ ] 集成 yet-another-react-lightbox 或类似库
- [ ] 实现全屏查看
- [ ] 支持缩放和手势
- [ ] 添加关闭按钮
- [ ] 优化移动端体验

## 阶段 7: 样式和响应式

### Task 7.1: 移动端适配

- [ ] 使用 Tailwind 响应式类优化所有组件
- [ ] 测试不同移动设备（iPhone、Android）
- [ ] 优化触摸交互
- [ ] 调整字体大小和间距
- [ ] 确保按钮和点击区域足够大

### Task 7.2: 平板和桌面端优化

- [ ] 优化大屏幕布局
- [ ] 调整网格列数
- [ ] 优化图片展示尺寸
- [ ] 添加悬停效果（桌面端）

### Task 7.3: 暗色模式支持（可选）

- [ ] 为所有组件添加暗色模式样式
- [ ] 确保图片在暗色模式下正常显示
- [ ] 调整文本对比度

## 阶段 8: 数据迁移和兼容性

### Task 8.1: 后端 API 实现

- [ ] 实现 `/api/marketplace/templates` API（商城列表）
- [ ] 测试 API 功能和性能
- [ ] 注意：图片上传使用现有系统，无需新增 API

### Task 8.2: 数据迁移（可选）

- [ ] 如果需要，创建迁移脚本为现有模板添加默认 templateShowcaseInfo
- [ ] 测试迁移脚本
- [ ] 注意：因为字段是可选的，实际上不迁移也可以正常工作

### Task 8.3: 向后兼容处理

- [ ] 确保 `worksStore.templateShowcase.getShowcaseInfo()` 返回 null 时的处理
- [ ] 在配置面板中使用 `getDefaultInfo()` 提供默认值
- [ ] 测试旧模板（没有 templateShowcaseInfo）正常加载
- [ ] 确保用户作品（Work）不受影响

## 阶段 9: 测试

### Task 9.1: 单元测试

- [ ] 图片上传工具函数测试
- [ ] 数据验证函数测试
- [ ] 富文本编辑器测试
- [ ] 组件渲染测试

### Task 9.2: 集成测试

- [ ] 完整配置流程测试
- [ ] 预览图管理流程测试
- [ ] 详情页展示测试
- [ ] 响应式布局测试

### Task 9.3: 端到端测试

- [ ] 用户完整使用流程测试
- [ ] 跨浏览器兼容性测试
- [ ] 性能测试
- [ ] 移动端真机测试

## 阶段 10: 文档和发布

### Task 10.1: 用户文档

- [ ] 编写用户使用指南
- [ ] 创建功能介绍视频/动图
- [ ] 编写 FAQ 文档

### Task 10.2: 开发文档

- [ ] 更新 API 文档
- [ ] 更新组件文档
- [ ] 编写维护指南

### Task 10.3: 发布准备

- [ ] 代码审查
- [ ] 性能优化
- [ ] 安全检查
- [ ] 准备发布说明

### Task 10.4: 监控和反馈

- [ ] 设置错误监控
- [ ] 添加用户行为分析
- [ ] 收集用户反馈
- [ ] 制定迭代计划

## 优先级说明

- **P0 (高优先级)**: 阶段 1、2、3、4 - 核心功能（模板展示、配置界面）
- **P1 (中优先级)**: 阶段 5、6、7 - 集成和优化（编辑器集成、图片优化）
- **P2 (低优先级)**: 阶段 8、9、10 - 测试和文档

## 关键注意事项 ⭐

1. **数据存储**: 数据存储在 `IWorksData.templateShowcaseInfo`，而非单独的数据库表
2. **操作封装**: 所有数据操作都通过 `WorksStore.templateShowcase.*` API
3. **自动保存**: 所有 WorksStore API 调用后自动触发 `saveWorksDebounce()`
4. **图片上传**: 使用现有的 `editorCtx.utils.showSelector()` 和 `getImgInfo2(ossPath)`，无需新建图片上传服务
5. **权限管理**: 只有设计师可以配置模板的商城展示，简帖用户只能浏览
6. **数据隔离**: 只有模板（is_template=true）需要商城展示配置，用户作品不需要
7. **核心流程**: 设计师配置 → 简帖用户浏览 → 点击"使用此模板"→ 开始创作
8. **编辑器集成位置**:
   - 入口文件：`packages/widgets/GridV3/DesignerToolForEditor/index.tsx`
   - 按钮添加位置：`packages/widgets/GridV3/DesignerToolForEditor/HeaderV2/index.tsx`
   - 通过 GridContext 获取：`useGridContext().editorSDK.fullSDK`（WorksStore）和 `editorCtx`
9. **条件显示**: 只在 `isTemplate === true` 且 `designerInfo.isDesigner === true` 时显示配置入口

## 依赖关系

```
阶段1 (数据结构)
  ↓
阶段2 (基础组件) ← 可并行
  ↓
阶段3 (配置界面) ← 依赖阶段2
  ↓
阶段4 (展示界面) ← 依赖阶段2
  ↓
阶段5 (编辑器集成) ← 依赖阶段3、4
  ↓
阶段6 (图片优化) ← 可并行
阶段7 (样式优化) ← 可并行
  ↓
阶段8 (数据迁移)
  ↓
阶段9 (测试)
  ↓
阶段10 (发布)
```
