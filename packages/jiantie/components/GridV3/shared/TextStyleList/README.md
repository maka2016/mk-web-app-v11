# 文字列表样式功能

## 功能概述

文字列表样式功能支持三种模式：

1. **常规样式** - 使用CSS原生的列表样式（圆点、方块、数字等）
2. **SVG图标** - 使用内置的Lucide图标库
3. **自定义图标** - 用户可以上传自己的SVG或PNG图标

## 自定义图标功能

### 使用方法

1. 在文字编辑器中启用"文字列表"功能
2. 选择"自定义图标"模式
3. 点击"上传SVG或PNG图标"按钮
4. 选择要上传的图标文件
5. 可以调整图标颜色

### 支持的文件格式

- SVG文件
- PNG文件
- JPG/JPEG文件

### 技术实现

自定义图标使用以下格式存储：

```
custom-icon: [图标URL] [颜色]
```

例如：

```
custom-icon: https://example.com/icon.png #ff0000
```

### 颜色处理

- 支持自定义图标颜色调整
- 使用CSS filter实现颜色变换
- 支持常见颜色（红、橙、黄、绿、青、蓝、紫等）

### 图标大小

图标大小会根据文字大小自动调整：

- 默认大小：12px
- 计算公式：`Math.max(8, Math.min(32, fontSize * 0.8))`
- 限制范围：8px - 32px

## API 函数

### parseListStyle(listStyle: string)

解析列表样式字符串，返回类型、值和颜色信息。

### formatListStyle(type: ListStyleMode, value: string, color?: string)

格式化列表样式为字符串格式。

### getListIconSvgString(listStyle: string, defaultColor?: string, fontSize?: number | string)

生成图标的SVG字符串，支持所有三种模式。

### getCustomIconSvgString(iconUrl: string, color: string, fontSize?: number | string)

专门处理自定义图标的SVG生成。

## 组件

### ListStyleSelector

列表样式选择器组件，提供完整的UI界面。

### 使用示例

```tsx
import { ListStyleSelector } from './ListStyleSelector';

<ListStyleSelector
  listStyle={attrs?.listStyle}
  onChange={listStyle => onChange({ listStyle })}
/>;
```
