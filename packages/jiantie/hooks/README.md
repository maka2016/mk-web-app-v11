# useTemplateSpec Hook 使用指南

## 🚀 功能特性

- ✅ 智能批量请求 (10个ID或100ms超时)
- ✅ 多层缓存 (客户端 + 服务端 + HTTP)
- ✅ 自动去重和错误处理
- ✅ TypeScript 支持

## 📦 使用方法

### 1. 基础用法

```tsx
import { useTemplateSpec } from '@/hooks/useTemplateSpec';

const TemplateCard = ({ template_id }) => {
  const { specName, isLoading, error } = useTemplateSpec(template_id);

  if (isLoading) return <div>加载中...</div>;
  if (error) return <div>加载失败</div>;

  return <div>{specName}</div>;
};
```

### 2. 列表预加载

```tsx
import { useTemplateListPreload } from '@/hooks/useTemplateListPreload';

const TemplateList = ({ templates }) => {
  // 自动预加载所有模板的规格数据
  useTemplateListPreload(templates);

  return (
    <div>
      {templates.map(template => (
        <TemplateCard
          key={template.template_id}
          template_id={template.template_id}
        />
      ))}
    </div>
  );
};
```

### 3. 无限滚动

```tsx
import { useIncrementalTemplatePreload } from '@/hooks/useTemplateListPreload';

const InfiniteList = () => {
  const [templates, setTemplates] = useState([]);
  const [previousLength, setPreviousLength] = useState(0);

  // 自动预加载新增模板
  useIncrementalTemplatePreload(templates, previousLength);

  const loadMore = async () => {
    const currentLength = templates.length;
    const newTemplates = await fetchMore();
    setTemplates(prev => [...prev, ...newTemplates]);
    setPreviousLength(currentLength);
  };

  return (
    <InfiniteScroll loadMore={loadMore}>
      {templates.map(t => (
        <TemplateCard key={t.template_id} template_id={t.template_id} />
      ))}
    </InfiniteScroll>
  );
};
```

## 🎯 API 参考

- `useTemplateSpec(template_id)` - 获取单个模板规格
- `useTemplateListPreload(templates, options?)` - 自动预加载列表
- `useIncrementalTemplatePreload(templates, previousLength)` - 增量预加载
- `preloadTemplateSpecs(template_ids)` - 手动预加载

## ⚡ 性能优势

- 20个模板: 从20次请求 → 2次批量请求
- 缓存命中: 接近100%命中率，秒级响应
- 预加载: 用户查看时数据已就绪
