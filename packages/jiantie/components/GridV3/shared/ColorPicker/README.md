# ColorPicker 颜色选择器组件

一个功能完整的颜色选择器组件，支持纯色、渐变色选择，以及主题颜色管理。

## 功能特性

- ✅ 纯色选择
- ✅ 渐变色选择
- ✅ 主题颜色支持
- ✅ 取色器功能（浏览器支持时）
- ✅ 颜色值验证和标准化
- ✅ 完整的TypeScript类型支持
- ✅ 错误处理和边界情况处理
- ✅ 无障碍访问支持

## 组件结构

```text
ColorPicker/
├── index.tsx                 # 主组件入口
├── types.ts                 # 类型定义
├── utils.ts                 # 工具函数
├── ColorItems.tsx           # 颜色项组件
├── ColorPanelWithTab.tsx    # 带标签页的颜色面板
├── ColorPanel/
│   └── index.tsx           # 颜色面板组件（包含推荐颜色功能）
└── README.md               # 使用文档
```

## 基本用法

```tsx
import ColorPicker from './ColorPicker';

function App() {
  const [color, setColor] = useState('#3B82F6');

  const handleColorChange = changeValue => {
    console.log('颜色变更:', changeValue);
    setColor(changeValue.value);
  };

  return (
    <ColorPicker
      value={color}
      onChange={handleColorChange}
      useThemeColor={true}
      showRemoveButton={true}
    />
  );
}
```

## Props 接口

### ColorPickerProps

| 属性               | 类型                                             | 默认值       | 描述               |
| ------------------ | ------------------------------------------------ | ------------ | ------------------ |
| `value`            | `string`                                         | `"#1D1D1D"`  | 当前选中的颜色值   |
| `onChange`         | `(value: ColorPickerChangeValue) => void`        | -            | 颜色变更回调       |
| `disableGradient`  | `boolean`                                        | `false`      | 是否禁用渐变功能   |
| `disableAlpha`     | `boolean`                                        | `false`      | 是否禁用透明度     |
| `disablePicture`   | `boolean`                                        | `false`      | 是否禁用图片功能   |
| `useThemeColor`    | `boolean`                                        | `true`       | 是否使用主题颜色   |
| `themeColors`      | `ThemeColorType[]`                               | `[]`         | 主题颜色列表       |
| `className`        | `string`                                         | -            | 自定义类名         |
| `showRemoveButton` | `boolean`                                        | `true`       | 是否显示清除按钮   |
| `removeButtonText` | `string`                                         | `"清除颜色"` | 清除按钮文字       |
| `onRemove`         | `() => void`                                     | -            | 清除颜色回调       |
| `wrapper`          | `(children: React.ReactNode) => React.ReactNode` | -            | 自定义触发器包装器 |

### ColorPickerChangeValue

颜色变更回调的参数类型：

```tsx
interface ColorPickerChangeValue {
  colors: Colors | null; // 渐变颜色数据
  type: 'color' | 'gradient'; // 颜色类型
  hex: string; // hex颜色值
  rgb: RGB; // RGB数据
  value: string; // 颜色值字符串
  colorRefId?: string; // 颜色引用ID
  opacity?: number; // 不透明度
}
```

## 高级用法

### 自定义触发器

```tsx
<ColorPicker
  value={color}
  onChange={handleColorChange}
  wrapper={children => (
    <div className='custom-trigger'>
      <span>选择颜色</span>
      {children}
    </div>
  )}
/>
```

### 禁用特定功能

```tsx
<ColorPicker
  value={color}
  onChange={handleColorChange}
  disableGradient={true} // 禁用渐变
  disableAlpha={true} // 禁用透明度
  showRemoveButton={false} // 隐藏清除按钮
/>
```

### 使用主题颜色

```tsx
const themeColors = [
  {
    colorId: 'primary',
    tag: 'primary',
    type: 'color',
    name: '主要颜色',
    value: '#3B82F6',
  },
  {
    colorId: 'custom-1',
    tag: 'custom',
    type: 'color',
    name: '自定义颜色1',
    value: '#EF4444',
  },
];

<ColorPicker
  value={color}
  onChange={handleColorChange}
  themeColors={themeColors}
  useThemeColor={true}
/>;
```

## 工具函数

### normalizeColorValue

标准化颜色值，确保格式正确：

```tsx
import { normalizeColorValue } from './utils';

const validColor = normalizeColorValue('#3B82F6'); // '#3B82F6'
const fixedColor = normalizeColorValue('3B82F6'); // '#3B82F6'
const defaultColor = normalizeColorValue('invalid'); // '#000000'
```

### isValidColorValue

验证颜色值格式：

```tsx
import { isValidColorValue } from './utils';

isValidColorValue('#3B82F6'); // true
isValidColorValue('rgba(59,130,246,1)'); // true
isValidColorValue('linear-gradient(...)'); // true
isValidColorValue('invalid'); // false
```

### createColorChangeValue

创建颜色变更值对象：

```tsx
import { createColorChangeValue } from './utils';

const changeValue = createColorChangeValue({
  hex: '#3B82F6',
  value: '#3B82F6',
});
```

## 错误处理

组件内置了完善的错误处理机制：

- 自动验证和修复无效的颜色值
- 处理取色器API调用失败
- 优雅降级处理不支持的浏览器功能
- 详细的错误日志输出

## 无障碍访问

- 支持键盘导航（Tab、Enter、Space）
- 提供适当的ARIA标签
- 支持屏幕阅读器
- 高对比度颜色显示

## 浏览器兼容性

- Chrome 95+
- Firefox 90+
- Safari 14+
- Edge 95+

取色器功能需要支持 `EyeDropper` API 的浏览器。

## 注意事项

1. 确保在使用前正确导入必要的依赖
2. 主题颜色需要从 `useGridContext` 获取
3. 颜色值会自动标准化，但建议传入标准格式
4. 组件会自动处理边界情况和错误，但建议监听控制台警告
