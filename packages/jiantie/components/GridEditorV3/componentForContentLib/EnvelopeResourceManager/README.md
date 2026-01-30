# 信封管理

## 用户故事

主要面对的设计师生产流程

### 设计师

#### 资源管理

在设计师编辑器的左侧内容面板有一个信封管理入口，可以管理分类和信封项，数据相关的具体功能参考`packages/jiantie/components/GridEditorV3/componentForContentLib/ThemePackManagement.tsx`

#### 信封编辑

信封编辑器已经完成，参考：

```js
import EnvelopeEditor from '../../Envelope/EnvelopeEditor';

<EnvelopeEditor
  value={envelopeConfig}
  onChange={handleSave}
  onRemove={handleRemove}
/>;
```

### 用户

使用流程不在编辑器内，所以这个需求不包含用户的改动
