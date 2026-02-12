# 模板商城展示功能技术设计文档

## 文档导航

1. **requirements.md** - 功能需求和验收标准
2. **design.md**（本文档）- 技术设计和实现方案
3. **tasks.md** - 开发任务清单

## 业务背景

简帖是一个模板商城平台：

- **设计师**创作并上架**模板**（Template）到商城
- **简帖用户**浏览并选择**模板**进行创作
- 用户基于模板创作的内容称为**作品**（Work）

**本功能目标**：为模板添加商城展示配置（预览图、标题、描述）

---

## 第一部分：数据持久化设计（核心）⭐⭐⭐

### 1. 数据结构设计

#### 1.1 扩展 IWorksData（关键）

```typescript
// packages/works-store/types/interface.ts

/**
 * 预览图配置
 */
export interface TemplateShowcasePreviewImage {
  id: string; // 图片唯一标识（UUID）
  url: string; // 图片完整 URL（OSS）
  thumbnailUrl: string; // 缩略图 URL（用于列表，400x400）
  order: number; // 显示顺序（0-8，最多9张）
  isCover: boolean; // 是否为封面图（只能有一张）
  width?: number; // 原图宽度
  height?: number; // 原图高度
  uploadedAt: number; // 上传时间戳
}

/**
 * 富文本内容
 */
export interface TemplateShowcaseRichText {
  format: 'html' | 'markdown'; // 内容格式
  content: string; // 格式化内容
  plainText: string; // 纯文本版本（用于搜索和预览）
}

/**
 * 模板商城展示信息（核心数据结构）
 */
export interface TemplateShowcaseInfo {
  displayTitle: string; // 展示标题（1-100字符，必填）
  displayDescription: TemplateShowcaseRichText; // 展示描述（富文本，最多5000字符）
  previewImages: TemplateShowcasePreviewImage[]; // 预览图列表（1-9张，至少1张）
  enabled: boolean; // 是否启用商城展示
  createdAt: number; // 配置创建时间
  updatedAt: number; // 配置更新时间
}

/**
 * 作品数据（扩展）
 */
export class IWorksData {
  /** 操作版本，每次一个操作 +1 */
  _version!: number;

  /** 页面的画布的数据结构 */
  canvasData!: {
    /* ... 现有字段 */
  };

  /** 元素在画布中的容器的定位信息 */
  positionLink!: PositionLinkMap;

  /** 作品元数据 */
  meta?: IWorksMeta;

  /** 页面设置 */
  pageSetting!: PageSetting;

  /** 编辑器模式 */
  editorMode?: EditorMode;

  /** 作品样式表 */
  style?: {
    /* ... 现有字段 */
  };

  // ========== 新增字段 ==========
  /**
   * 模板商城展示信息
   * 注意：只有模板才有此字段，用户创作的作品不需要
   */
  templateShowcaseInfo?: TemplateShowcaseInfo;
}
```

**关键点说明：**

1. ✅ 字段名：`templateShowcaseInfo`（而不是 marketplaceDisplay）
2. ✅ 类型定义都以 `TemplateShowcase` 为前缀
3. ✅ 可选字段（`?`），保持向后兼容
4. ✅ 只有模板才有此字段，用户作品没有

#### 1.2 数据存储位置

**存储层次**：

```
works 表
  └─ works_data (JSON 字段)
      └─ IWorksData
          └─ templateShowcaseInfo ✅
              ├─ displayTitle
              ├─ displayDescription
              ├─ previewImages[]
              ├─ enabled
              └─ timestamps
```

**示例数据：**

```typescript
// WorksStore.worksData 包含完整的作品/模板数据
{
  _version: 123,
  canvasData: { /* 画布数据 */ },
  positionLink: { /* 定位数据 */ },
  meta: { /* 元数据 */ },
  pageSetting: { /* 页面设置 */ },

  // 新增：模板商城展示信息
  templateShowcaseInfo: {
    displayTitle: "简约企业宣传模板",
    displayDescription: {
      format: "html",
      content: "<p>适合企业宣传...</p>",
      plainText: "适合企业宣传..."
    },
    previewImages: [
      {
        id: "uuid-1",
        url: "https://cdn.example.com/preview1.jpg",
        thumbnailUrl: "https://cdn.example.com/preview1_thumb.jpg",
        order: 0,
        isCover: true,
        uploadedAt: 1698765432000
      }
    ],
    enabled: true,
    createdAt: 1698765430000,
    updatedAt: 1698765432000
  }
}
```

#### 1.3 数据库存储（无需修改表结构）

```typescript
// 后端存储结构（works 表）
{
  id: "template-xxx",
  designer_id: "designer-xxx",
  title: "模板标题",
  works_data: JSON.stringify({
    _version: 123,
    canvasData: { /* ... */ },
    positionLink: { /* ... */ },
    // ... 其他字段
    templateShowcaseInfo: { /* 商城展示信息 */ }
  }),
  created_at: 1698765430000,
  updated_at: 1698765432000
}
```

**无需修改数据库表结构**，因为：

- `templateShowcaseInfo` 作为 `worksData` 的一部分存储
- `worksData` 已经是 JSON 字段
- 完全向后兼容

### 2. WorksStore API 设计（重点）⭐⭐⭐

#### 2.1 在 WorksStore 中添加操作方法

```typescript
// packages/works-store/store/WorksStore.ts

export class WorksStore {
  worksData: IWorksData = getDefaultWorksData();

  // ... 现有字段和方法

  /**
   * 模板商城展示相关 API（新增）
   */
  templateShowcase = {
    /**
     * 获取模板商城展示信息
     */
    getShowcaseInfo: (): TemplateShowcaseInfo | null => {
      return this.worksData.templateShowcaseInfo || null;
    },

    /**
     * 设置模板商城展示信息
     */
    setShowcaseInfo: (info: TemplateShowcaseInfo) => {
      this.worksData.templateShowcaseInfo = {
        ...info,
        updatedAt: Date.now(),
      };
      this.worksData._version += 1;
      // 注意：WorksStore 会自动保存，无需手动调用 saveWorksDebounce()
    },

    /**
     * 更新展示标题
     */
    updateTitle: (title: string) => {
      if (!this.worksData.templateShowcaseInfo) {
        this.worksData.templateShowcaseInfo =
          this.templateShowcase.getDefaultInfo();
      }

      this.worksData.templateShowcaseInfo.displayTitle = title;
      this.worksData.templateShowcaseInfo.updatedAt = Date.now();
      this.worksData._version += 1;
    },

    /**
     * 更新展示描述
     */
    updateDescription: (description: TemplateShowcaseRichText) => {
      if (!this.worksData.templateShowcaseInfo) {
        this.worksData.templateShowcaseInfo =
          this.templateShowcase.getDefaultInfo();
      }

      this.worksData.templateShowcaseInfo.displayDescription = description;
      this.worksData.templateShowcaseInfo.updatedAt = Date.now();
      this.worksData._version += 1;
    },

    /**
     * 添加预览图
     */
    addPreviewImage: (image: TemplateShowcasePreviewImage) => {
      if (!this.worksData.templateShowcaseInfo) {
        this.worksData.templateShowcaseInfo =
          this.templateShowcase.getDefaultInfo();
      }

      const images = this.worksData.templateShowcaseInfo.previewImages;

      // 限制最多 9 张
      if (images.length >= 9) {
        throw new Error('最多只能添加 9 张预览图');
      }

      // 设置顺序
      image.order = images.length;

      // 如果是第一张图，自动设为封面
      if (images.length === 0) {
        image.isCover = true;
      }

      images.push(image);
      this.worksData.templateShowcaseInfo.updatedAt = Date.now();
      this.worksData._version += 1;
    },

    /**
     * 删除预览图
     */
    removePreviewImage: (imageId: string) => {
      if (!this.worksData.templateShowcaseInfo) return;

      const images = this.worksData.templateShowcaseInfo.previewImages;
      const index = images.findIndex(img => img.id === imageId);

      if (index === -1) return;

      const removed = images[index];
      images.splice(index, 1);

      // 如果删除的是封面图，自动设置第一张为封面
      if (removed.isCover && images.length > 0) {
        images[0].isCover = true;
      }

      // 重新排序
      images.forEach((img, i) => {
        img.order = i;
      });

      this.worksData.templateShowcaseInfo.updatedAt = Date.now();
      this.worksData._version += 1;
    },

    /**
     * 设置封面图
     */
    setCoverImage: (imageId: string) => {
      if (!this.worksData.templateShowcaseInfo) return;

      const images = this.worksData.templateShowcaseInfo.previewImages;

      images.forEach(img => {
        img.isCover = img.id === imageId;
      });

      this.worksData.templateShowcaseInfo.updatedAt = Date.now();
      this.worksData._version += 1;
    },

    /**
     * 重新排序预览图
     */
    reorderPreviewImages: (imageIds: string[]) => {
      if (!this.worksData.templateShowcaseInfo) return;

      const images = this.worksData.templateShowcaseInfo.previewImages;
      const imageMap = new Map(images.map(img => [img.id, img]));

      // 按新顺序重新排列
      const reordered = imageIds
        .map(id => imageMap.get(id))
        .filter(Boolean) as TemplateShowcasePreviewImage[];

      // 更新 order
      reordered.forEach((img, i) => {
        img.order = i;
      });

      this.worksData.templateShowcaseInfo.previewImages = reordered;
      this.worksData.templateShowcaseInfo.updatedAt = Date.now();
      this.worksData._version += 1;
    },

    /**
     * 启用/禁用商城展示
     */
    setEnabled: (enabled: boolean) => {
      if (!this.worksData.templateShowcaseInfo) {
        this.worksData.templateShowcaseInfo =
          this.templateShowcase.getDefaultInfo();
      }

      this.worksData.templateShowcaseInfo.enabled = enabled;
      this.worksData.templateShowcaseInfo.updatedAt = Date.now();
      this.worksData._version += 1;
    },

    /**
     * 验证配置是否有效
     */
    validate: (): { valid: boolean; errors: string[] } => {
      const info = this.worksData.templateShowcaseInfo;
      const errors: string[] = [];

      if (!info) {
        errors.push('商城展示信息未配置');
        return { valid: false, errors };
      }

      // 验证标题
      if (!info.displayTitle || info.displayTitle.length === 0) {
        errors.push('展示标题不能为空');
      }
      if (info.displayTitle.length > 100) {
        errors.push('展示标题不能超过100字符');
      }

      // 验证描述
      if (info.displayDescription.plainText.length > 5000) {
        errors.push('展示描述不能超过5000字符');
      }

      // 验证预览图
      if (info.previewImages.length === 0) {
        errors.push('至少需要添加1张预览图');
      }
      if (info.previewImages.length > 9) {
        errors.push('预览图最多9张');
      }

      // 验证封面图
      const coverCount = info.previewImages.filter(img => img.isCover).length;
      if (coverCount !== 1 && info.previewImages.length > 0) {
        errors.push('必须设置一张封面图');
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    },

    /**
     * 获取默认配置
     */
    getDefaultInfo: (): TemplateShowcaseInfo => {
      return {
        displayTitle: '',
        displayDescription: {
          format: 'html',
          content: '',
          plainText: '',
        },
        previewImages: [],
        enabled: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    },
  };
}
```

#### 2.2 自动保存机制

**关键特性：所有 API 调用后自动保存**

```typescript
// 数据流程
调用 WorksStore API
  ↓
更新 worksData.templateShowcaseInfo
  ↓
_version += 1
  ↓
WorksStore 自动保存机制 ← 无需手动调用
  ↓
POST /api/works/save
  ↓
保存整个 worksData（包括 templateShowcaseInfo）
  ↓
更新 works 表的 works_data 字段
```

#### 2.3 数据验证和约束

| 字段               | 约束            | 说明             |
| ------------------ | --------------- | ---------------- |
| displayTitle       | 1-100字符，必填 | 展示标题         |
| displayDescription | 最多5000字符    | 富文本描述       |
| previewImages      | 1-9张，必填     | 预览图数组       |
| isCover            | 有且只有一张    | 封面图标记       |
| enabled            | boolean         | 是否启用商城展示 |

### 3. 后端 API 设计

#### 3.1 保存 API（无需修改）

```typescript
// 现有的保存 API 已经支持
POST /api/works/save
Body: {
  worksData: {
    _version: 123,
    canvasData: { /* ... */ },
    templateShowcaseInfo: { /* 商城展示信息 */ }  ← 自动包含
  }
}

// 后端直接保存整个 worksData，无需额外处理
```

#### 3.2 商城列表 API（新增）

```typescript
// GET /api/marketplace/templates
// 查询参数：page, pageSize, sort

app.get('/api/marketplace/templates', async (req, res) => {
  const templates = await db.query(`
    SELECT id, title, works_data, designer_id, created_at
    FROM works
    WHERE is_template = true
      AND JSON_EXTRACT(works_data, '$.templateShowcaseInfo.enabled') = true
    ORDER BY created_at DESC
    LIMIT 20
  `);

  const result = templates.map(t => {
    const worksData = JSON.parse(t.works_data);
    return {
      id: t.id,
      title: t.title,
      showcaseInfo: worksData.templateShowcaseInfo,
      coverImage: worksData.templateShowcaseInfo.previewImages.find(
        img => img.isCover
      ),
    };
  });

  res.json({ templates: result, total: result.length });
});
```

**注意：** 图片上传使用现有的系统，通过 `editorCtx.utils.showSelector` 调用，无需新增图片上传 API。

### 4. 核心优势

**对比传统方案：**

| 方案               | 数据存储           | API设计            | 保存机制     | 数据库改动      |
| ------------------ | ------------------ | ------------------ | ------------ | --------------- |
| 传统方案           | 新建表             | 需要新增多个 API   | 手动保存     | 需要新建表      |
| **WorksStore方案** | **IWorksData字段** | **复用WorksStore** | **自动保存** | **无需改动** ✅ |

**核心优势：**

1. ✅ **无需修改数据库** - 复用 `works_data` JSON 字段
2. ✅ **统一状态管理** - 所有操作通过 WorksStore
3. ✅ **自动保存** - 调用 API 后自动触发保存
4. ✅ **向后兼容** - 字段是可选的，旧数据无影响
5. ✅ **版本控制** - 自动增加 `_version`，支持撤销/重做
6. ✅ **实时反馈** - 监听 `isSaved` 查看保存状态

---

## 第二部分：编辑器集成指南

### 1. 编辑器架构

#### 1.1 设计师编辑器位置

```
packages/widgets/GridV3/DesignerToolForEditor/
├── index.tsx                    # 主入口，包含整体布局和标签页
├── HeaderV2/
│   └── index.tsx               # 顶部工具栏（添加按钮的位置）⭐
├── MarketplaceConfig/          # 新建：商城配置组件目录
│   ├── ConfigPanel.tsx         # 配置面板主组件
│   ├── PreviewImageManager.tsx # 预览图管理（使用现有图片选择器）
│   ├── TitleEditor.tsx         # 标题编辑
│   ├── DescriptionEditor.tsx   # 描述编辑
│   └── DisplayPreview.tsx      # 展示预览
└── RichTextEditor/             # 新建：富文本编辑器
    ├── RichTextEditor.tsx      # 编辑器主组件
    └── Toolbar.tsx             # 编辑器工具栏
```

### 2. 集成步骤

#### 步骤 1: 在 HeaderV2 中添加按钮

**文件**: `packages/widgets/GridV3/DesignerToolForEditor/HeaderV2/index.tsx`

```tsx
// 1. 添加导入
import { Store } from 'lucide-react';
import { MarketplaceConfigPanel } from '../MarketplaceConfig/ConfigPanel';

// 2. 在组件内添加状态
export default function DesignerToolHeader() {
  // ... 现有代码

  const [showMarketplaceConfig, setShowMarketplaceConfig] = useState(false);

  // ... 现有代码
}

// 3. 在工具栏中添加按钮
{
  /* 商城展示设置按钮 - 只在模板模式下显示 */
}
{
  isTemplate && (
    <ResponsiveTooltip content='商城展示设置'>
      <Button
        variant='ghost'
        size='sm'
        className={styles.tool}
        onClick={() => setShowMarketplaceConfig(true)}
      >
        <Store className='h-4 w-4' />
        <span className='ml-1'>商城展示</span>
      </Button>
    </ResponsiveTooltip>
  );
}

// 4. 在组件末尾添加对话框
<ResponsiveDialog
  open={showMarketplaceConfig}
  onOpenChange={setShowMarketplaceConfig}
>
  <div className='p-4'>
    <h2 className='text-lg font-semibold mb-4'>商城展示设置</h2>
    <MarketplaceConfigPanel
      templateId={worksId}
      onClose={() => setShowMarketplaceConfig(false)}
    />
  </div>
</ResponsiveDialog>;
```

#### 步骤 2: 创建 ConfigPanel 组件

**文件**: `packages/widgets/GridV3/DesignerToolForEditor/MarketplaceConfig/ConfigPanel.tsx`

```tsx
import { useState } from 'react';
import { Button } from '@workspace/ui/components/button';
import toast from 'react-hot-toast';
import { useGridContext } from '../../../comp/provider';
import { PreviewImageManager } from './PreviewImageManager';
import { TitleEditor } from './TitleEditor';
import { DescriptionEditor } from './DescriptionEditor';
import { DisplayPreview } from './DisplayPreview';

interface ConfigPanelProps {
  onClose: () => void;
}

export const MarketplaceConfigPanel: React.FC<ConfigPanelProps> = ({
  onClose,
}) => {
  // 获取 WorksStore
  const { editorSDK } = useGridContext();
  const worksStore = editorSDK?.fullSDK;

  // 读取配置（直接从 WorksStore 读取）
  const showcaseInfo = worksStore?.templateShowcase.getShowcaseInfo();
  const config = showcaseInfo || worksStore?.templateShowcase.getDefaultInfo();

  const [showPreview, setShowPreview] = useState(false);

  // 验证并启用商城展示
  const handleEnable = () => {
    if (!worksStore) return;

    // 验证配置
    const validation = worksStore.templateShowcase.validate();

    if (!validation.valid) {
      toast.error(validation.errors[0]);
      return;
    }

    // 启用商城展示
    worksStore.templateShowcase.setEnabled(true);
    toast.success('已启用商城展示');
    onClose();
  };

  if (!worksStore || !config) {
    return <div className='flex justify-center p-8'>加载中...</div>;
  }

  if (showPreview) {
    return (
      <DisplayPreview config={config} onClose={() => setShowPreview(false)} />
    );
  }

  return (
    <div className='space-y-6'>
      {/* 预览图管理 - 直接操作 WorksStore */}
      <PreviewImageManager
        worksStore={worksStore}
        images={config.previewImages}
      />

      {/* 标题编辑 - 直接操作 WorksStore */}
      <TitleEditor worksStore={worksStore} title={config.displayTitle} />

      {/* 描述编辑 - 直接操作 WorksStore */}
      <DescriptionEditor
        worksStore={worksStore}
        description={config.displayDescription}
      />

      {/* 状态提示 */}
      <div className='text-sm text-gray-500'>
        {worksStore.isSaved ? '✓ 已保存' : '保存中...'}
      </div>

      {/* 操作按钮 */}
      <div className='flex justify-end gap-2 pt-4 border-t'>
        <Button variant='outline' onClick={() => setShowPreview(true)}>
          预览效果
        </Button>
        <Button variant='outline' onClick={onClose}>
          关闭
        </Button>
        <Button onClick={handleEnable}>
          {config.enabled ? '已启用商城展示' : '启用商城展示'}
        </Button>
      </div>
    </div>
  );
};
```

**关键点：**

1. ✅ 通过 `useGridContext()` 获取 WorksStore
2. ✅ 使用 `worksStore.templateShowcase.*` API 操作数据
3. ✅ 无需手动保存（WorksStore 自动保存）
4. ✅ 监听 `worksStore.isSaved` 显示保存状态

#### 步骤 3: 使用现有图片选择器（复用）

**无需创建新的图片上传服务**，直接使用 GridV3 现有的图片选择器：

```tsx
// 在 PreviewImageManager 组件中使用现有的图片选择器
import { useGridContext } from '../../../comp/provider';
import { getImgInfo2 } from '../../../utils';

function PreviewImageManager({ worksStore, images }: Props) {
  const { editorCtx } = useGridContext();

  // 使用现有的图片选择器（参考 ImgLiteCompV2 的实现）
  const handleAddImage = () => {
    editorCtx?.utils.showSelector({
      onSelected: async (params: any) => {
        const { url, type, ossPath } = params;

        // 获取图片尺寸信息（复用现有工具函数）
        const imgInfo = await getImgInfo2(ossPath);

        // 构造预览图数据
        const imageData: TemplateShowcasePreviewImage = {
          id: random(), // 使用现有的 random 函数生成唯一 ID
          url: ossPath, // OSS 路径
          thumbnailUrl: ossPath, // 缩略图使用相同路径，CDN会自动处理
          order: images.length,
          isCover: images.length === 0, // 第一张自动设为封面
          width: imgInfo.baseWidth,
          height: imgInfo.baseHeight,
          uploadedAt: Date.now(),
        };

        // 添加到 WorksStore（自动保存）
        worksStore.templateShowcase.addPreviewImage(imageData);
        toast.success('图片添加成功');
      },
      type: 'picture',
    });
  };

  return (
    <div className='space-y-4'>
      <div className='flex justify-between items-center'>
        <h3 className='text-sm font-medium'>预览图管理</h3>
        {images.length < 9 && (
          <Button size='sm' onClick={handleAddImage}>
            <Upload className='h-4 w-4 mr-1' />
            添加图片
          </Button>
        )}
      </div>

      {/* 图片列表 */}
      <div className='grid grid-cols-3 gap-2'>
        {images.map(img => (
          <ImageCard
            key={img.id}
            image={img}
            onSetCover={() => worksStore.templateShowcase.setCoverImage(img.id)}
            onRemove={() =>
              worksStore.templateShowcase.removePreviewImage(img.id)
            }
          />
        ))}
      </div>
    </div>
  );
}
```

**关键点：**

1. ✅ 使用 `editorCtx.utils.showSelector()` 打开图片选择器（现有功能）
2. ✅ 使用 `getImgInfo2(ossPath)` 获取图片尺寸（现有工具函数）
3. ✅ 使用 `random()` 函数生成唯一 ID（来自 `@mk/utils`）
4. ✅ 图片上传、压缩、CDN 处理都由现有系统自动完成
5. ✅ 无需自己实现图片处理逻辑

### 3. 关键集成点

#### 3.1 获取 WorksStore 和 EditorContext

```tsx
// 在组件中获取 WorksStore 和 EditorContext
import { useGridContext } from '../../../comp/provider';
import { getImgInfo2 } from '../../../shared/utils';
import { random } from '@/utils'; // 导入现有的 random 函数

function MyComponent() {
  const { editorSDK, editorCtx } = useGridContext();
  const worksStore = editorSDK?.fullSDK; // WorksStore 实例

  // 使用 WorksStore API
  const showcaseInfo = worksStore?.templateShowcase.getShowcaseInfo();

  // 使用 editorCtx 打开图片选择器
  const handleSelectImage = () => {
    editorCtx?.utils.showSelector({
      onSelected: async (params: any) => {
        const { ossPath } = params;
        const imgInfo = await getImgInfo2(ossPath);
        // 处理图片...
      },
      type: 'picture',
    });
  };

  return <div>...</div>;
}
```

#### 3.2 完整的图片管理示例

```tsx
// PreviewImageManager 组件完整实现
import { useGridContext } from '../../../comp/provider';
import { getImgInfo2 } from '../../../shared/utils';
import { random } from '@/utils'; // 导入现有的 random 函数
import { Button } from '@workspace/ui/components/button';
import toast from 'react-hot-toast';

interface PreviewImageManagerProps {
  worksStore: WorksStore;
  images: TemplateShowcasePreviewImage[];
}

function PreviewImageManager({ worksStore, images }: PreviewImageManagerProps) {
  const { editorCtx } = useGridContext();

  // 添加图片 - 使用现有的图片选择器
  const handleAddImage = () => {
    if (images.length >= 9) {
      toast.error('最多只能添加 9 张预览图');
      return;
    }

    editorCtx?.utils.showSelector({
      onSelected: async (params: any) => {
        try {
          const { ossPath } = params;

          // 获取图片信息
          const imgInfo = await getImgInfo2(ossPath);

          // 构造数据
          const imageData: TemplateShowcasePreviewImage = {
            id: random(), // 使用现有的 random 函数
            url: ossPath,
            thumbnailUrl: ossPath, // CDN 会自动处理缩略图
            order: images.length,
            isCover: images.length === 0,
            width: imgInfo.baseWidth,
            height: imgInfo.baseHeight,
            uploadedAt: Date.now(),
          };

          // 添加到 WorksStore（自动保存）
          worksStore.templateShowcase.addPreviewImage(imageData);
          toast.success('图片添加成功');
        } catch (error) {
          toast.error('图片加载失败');
        }
      },
      type: 'picture',
    });
  };

  // 设置封面
  const handleSetCover = (imageId: string) => {
    worksStore.templateShowcase.setCoverImage(imageId);
    toast.success('封面设置成功');
  };

  // 删除图片
  const handleRemove = (imageId: string) => {
    if (window.confirm('确定要删除这张图片吗？')) {
      worksStore.templateShowcase.removePreviewImage(imageId);
      toast.success('图片已删除');
    }
  };

  return (
    <div className='space-y-4'>
      <div className='flex justify-between items-center'>
        <h3 className='text-sm font-medium'>预览图管理</h3>
        {images.length < 9 && (
          <Button size='sm' onClick={handleAddImage}>
            添加图片 ({images.length}/9)
          </Button>
        )}
      </div>

      <div className='grid grid-cols-3 gap-2'>
        {images.map(img => (
          <ImageCard
            key={img.id}
            image={img}
            onSetCover={() => handleSetCover(img.id)}
            onRemove={() => handleRemove(img.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

### 4. 样式规范

遵循项目规则，使用以下样式方案：

1. **@workspace/ui 组件优先**

   ```tsx
   import { Button } from '@workspace/ui/components/button';
   import { Dialog } from '@workspace/ui/components/dialog';
   import { Input } from '@workspace/ui/components/input';
   ```

2. **Tailwind CSS 布局**

   ```tsx
   <div className='flex flex-col gap-4 p-4'>
     <div className='grid grid-cols-2 gap-2'>{/* 内容 */}</div>
   </div>
   ```

3. **lucide-react 图标**

   ```tsx
   import { Store, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
   ```

4. **禁止使用 SCSS**
   - 不要创建 `.scss` 文件
   - 不要使用 CSS Modules（除非是历史遗留）

---

## 第三部分：用户端页面设计

### 1. 页面架构

参考 `mobile/template` 结构：

```
packages/jiantie/app/mobile/marketplace/
├── page.tsx                    # 列表页路由
├── loading.tsx                 # 加载状态
├── components/                 # 列表页组件（业务组件，内聚到此页面）
│   ├── main.tsx                # 列表主组件
│   ├── header.tsx              # 顶部导航
│   ├── index.module.scss       # 样式文件
│   └── TemplateCard.tsx        # 模板卡片
└── [templateId]/               # 详情页
    ├── page.tsx                # 详情页路由
    ├── loading.tsx             # 加载状态
    └── components/             # 详情页组件（业务组件，内聚到此页面）
        ├── main.tsx            # 详情主组件
        ├── header.tsx          # 详情页头部
        ├── index.module.scss   # 样式
        ├── ImageCarousel.tsx   # 图片轮播
        └── RichTextDisplay.tsx # 富文本显示
```

### 2. 用户端服务 API

**文件**: `packages/jiantie/services/marketplace.ts`

```typescript
/**
 * 获取商城模板列表
 */
export async function getMarketplaceTemplates(params: {
  page: number;
  pageSize: number;
  sort?: 'popular' | 'latest';
}): Promise<{ templates: any[]; total: number }> {
  const query = new URLSearchParams({
    page: params.page.toString(),
    pageSize: params.pageSize.toString(),
    sort: params.sort || 'latest',
  });

  const res = await fetch(`/api/marketplace/templates?${query}`);
  return res.json();
}

/**
 * 获取模板详情（使用现有的 getWorksData API）
 */
export async function getTemplateDetail(templateId: string) {
  // 使用现有的 works API
  const res = await fetch(`/api/works/${templateId}`);
  const data = await res.json();

  // data.worksData.templateShowcaseInfo 包含商城展示信息
  return data;
}
```

### 3. 组件设计原则

1. **组件内聚** - 业务组件直接放在对应页面的 `components` 目录下
2. **参考现有结构** - 遵循 `mobile/template` 的实现方式
3. **使用 module.scss** - 用户端页面可以使用 `.module.scss`
4. **SEO 优化** - 使用 `generateMetadata` 配置 SEO 和 Open Graph

---

## 第四部分：测试和验证

### 1. 功能测试清单

#### WorksStore API 测试

- ✅ `getShowcaseInfo()` 返回正确数据
- ✅ `updateTitle()` 正确更新并自动保存
- ✅ `addPreviewImage()` 添加图片并自动设置顺序
- ✅ `setCoverImage()` 正确更新封面标记
- ✅ `validate()` 验证逻辑正确

#### 数据持久化测试

- ✅ 调用 WorksStore API 后触发自动保存
- ✅ 保存后重新加载，数据正确恢复
- ✅ `worksData.templateShowcaseInfo` 正确包含在保存数据中

#### 向后兼容测试

- ✅ 没有 templateShowcaseInfo 的旧模板正常加载
- ✅ `getShowcaseInfo()` 返回 null 时使用默认值
- ✅ 用户作品（Work）不受影响

### 2. 常见问题解答

**Q1: 为什么配置没有自动保存？**

检查项：

1. 确认调用了 WorksStore API（如 `updateTitle`）
2. 确认 `worksData._version` 有增加
3. 查看 `worksStore.isSaved` 状态
4. 检查是否有保存错误（`worksStore.saveError`）

**Q2: 如何获取 WorksStore 实例？**

```tsx
const { editorSDK } = useGridContext();
const worksStore = editorSDK?.fullSDK;
```

**Q3: 数据保存在哪里？**

- 存储位置：`worksStore.worksData.templateShowcaseInfo`
- 保存到：`works` 表的 `works_data` JSON 字段
- 无需新建数据库表或字段

---

## 第五部分：API 总览

### 设计师端 API

**无需新增任何 API**，完全使用现有功能：

- `worksStore.templateShowcase.*` - 所有数据操作（WorksStore API）
- `WorksStore.api.saveWorks()` - 数据保存（现有）
- `editorCtx.utils.showSelector()` - 图片选择和上传（现有）
- `getImgInfo2(ossPath)` - 获取图片尺寸（现有工具函数）
- `random()` - 生成唯一 ID（来自 `@mk/utils`）

---

## 核心要点总结 ⭐

### 数据持久化方案

```
数据存储位置：
  IWorksData.templateShowcaseInfo ✅

数据操作封装：
  WorksStore.templateShowcase.* ✅

数据保存机制：
  利用现有的 WorksStore.api.saveWorksDebounce() ✅

数据库存储：
  works 表的 works_data JSON 字段（无需修改表结构）✅
```

### 关键决策

| 决策点   | 方案                            | 原因                   |
| -------- | ------------------------------- | ---------------------- |
| 数据存储 | IWorksData.templateShowcaseInfo | 复用现有架构，无需新表 |
| 操作封装 | WorksStore.templateShowcase     | 统一的状态管理         |
| 保存机制 | 复用 saveWorksDebounce          | 自动防抖保存           |
| 字段命名 | templateShowcaseInfo            | 语义清晰               |
| 图片存储 | OSS + URL引用                   | 图片分离存储           |
| 启用控制 | enabled 字段                    | 默认禁用，手动启用     |

### 数据流转

```
设计师端：
  编辑配置
    ↓
  调用 worksStore.templateShowcase.*
    ↓
  更新 worksData.templateShowcaseInfo
    ↓
  自动调用 saveWorksDebounce()
    ↓
  保存到 works 表的 works_data 字段

用户端：
  访问商城
    ↓
  后端查询 works 表（筛选 is_template=true 且 enabled=true）
    ↓
  解析 works_data.templateShowcaseInfo
    ↓
  渲染商城列表/详情页
```

---

**完整的开发任务清单请参考：`tasks.md`**
