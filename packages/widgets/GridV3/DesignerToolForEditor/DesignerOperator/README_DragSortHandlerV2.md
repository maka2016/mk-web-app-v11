# DragSortHandlerV2 更新说明

## 概述

`DragSortHandlerV2` 组件已更新以适配新的 v2 数据结构，移除了 cell 概念，改为支持无限嵌套的 Row 结构。

## 主要变更

### 1. 数据结构适配

- **移除**: `type="grid"` 和 `type="cell"`
- **新增**: `type="row"` 和 `type="element"`
- **替换**: `cellsMap` → `gridsData`
- **替换**: `activeRowId` + `activeCellId` → `activeRowDepth`

### 2. 新增属性

```typescript
interface DragSortHandlerProps {
  // ... 其他属性
  /** 当前行的深度路径，用于确定拖拽目标 */
  currentRowDepth?: number[];
}
```

### 3. 增强的回调数据

```typescript
onSortEnd?: (payload: {
  dragId: string;
  actualTargetIndex: number;
  targetId: string;
  position: "top" | "bottom";
  targetRowDepth?: number[]; // 新增：目标行的深度信息
}) => void;
```

## 功能特性

### Row 拖拽排序

- 只能在同一级内进行排序
- 通过 `getSiblingRows` 获取同级行
- 支持无限嵌套的层级结构

### Element 跨行拖拽

- 可以跨 Row 放入
- 通过 `getAllRows` 递归获取所有可拖拽目标
- 提供目标行的深度信息用于精确定位

## 使用示例

### 基本用法

```tsx
import DragSortHandlerV2 from './DragSortHandlerV2';

// Row 拖拽排序
<DragSortHandlerV2
  type="row"
  targetId={rowId}
  currentRowDepth={[0, 1]} // 当前行的深度路径
  domSelector={(id) => `#editor_row_${id}`}
  onSortEnd={(payload) => {
    console.log('拖拽到位置:', payload.actualTargetIndex);
    console.log('目标行深度:', payload.targetRowDepth);
    // 实现行排序逻辑
  }}
/>

// Element 跨行拖拽
<DragSortHandlerV2
  type="element"
  targetId={elemId}
  currentRowDepth={[0, 1]} // 当前元素所在行的深度路径
  domSelector={(id) => `#layer_root_${id}`}
  onSortEnd={(payload) => {
    console.log('拖拽到行:', payload.targetRowDepth);
    // 实现跨行拖拽逻辑
  }}
/>
```

### 在 IndicatorDesignerV2 中的使用

```tsx
// Row 指示器
<DragSortHandlerV2
  type="row"
  targetId={activeRowId || ""}
  currentRowDepth={activeRowDepth}
  domSelector={(id) => `#editor_row_${id}`}
  onSortEnd={({ dragId, actualTargetIndex, targetRowDepth }) => {
    // 使用 v2 的 moveRowByIdV2 方法实现行排序逻辑
    const allRows = getAllRowsFromGridsData(gridsData);
    const targetBlockId = allRows[actualTargetIndex]?.groupByRowDepth;
    moveRowByIdV2(dragId, actualTargetIndex, targetBlockId);
  }}
/>

// Element 指示器
<DragSortHandlerV2
  type="element"
  targetId={editingElemId || ""}
  currentRowDepth={activeRowDepth}
  domSelector={(id) => `#layer_root_${id}`}
  onSortEnd={({ dragId, actualTargetIndex, targetRowDepth }) => {
    // 支持跨行拖拽
    if (targetRowDepth) {
      console.log('元素拖拽到行:', targetRowDepth);
    }
    // 实现元素移动逻辑
    moveElemByIndex(dragId, actualTargetIndex);
  }}
/>
```

## 深度路径说明

`currentRowDepth` 是一个数字数组，表示当前行在嵌套结构中的位置：

```typescript
// 例如：[0, 1, 2] 表示：
// - 第0层（根级别）的第0个元素
// - 其子级中的第1个元素
// - 再下一级中的第2个元素
```

## 迁移指南

### 从 v1 迁移到 v2

1. **更新类型**:

   ```tsx
   // 旧版本
   type="grid" → type="row"
   type="cell" → type="row" (如果用于行排序)
   type="element" → type="element" (保持不变)
   ```

2. **添加深度信息**:

   ```tsx
   // 新增必需属性
   currentRowDepth = { activeRowDepth };
   ```

3. **更新回调处理**:

   ```tsx
   // 新增 targetRowDepth 参数
   onSortEnd={({ dragId, actualTargetIndex, targetRowDepth }) => {
     // 使用 targetRowDepth 实现更精确的拖拽逻辑
   }}
   ```

4. **更新方法调用**:

   ```tsx
   // v1 版本
   moveRowByIndex(dragId, actualTargetIndex, targetBlockId);

   // v2 版本
   moveRowByIdV2(dragId, actualTargetIndex, targetBlockId);
   ```

## 注意事项

1. **向后兼容**: v1 版本的 `IndicatorDesigner.tsx` 保持不变，确保向后兼容
2. **性能考虑**: 递归获取所有行可能在大规模数据时影响性能，建议添加适当的缓存机制
3. **错误处理**: 确保 `currentRowDepth` 和 `domSelector` 的正确性，避免拖拽失败

## 技术实现

### 核心函数

- `getAllRows`: 递归获取所有行，支持跨行拖拽
- `getSiblingRows`: 获取同级行，用于行排序
- `getRowByDepth`: 根据深度路径获取特定行

### 拖拽逻辑

- **Row 拖拽**: 限制在同一级内，通过 `getSiblingRows` 实现
- **Element 拖拽**: 支持跨行，通过 `getAllRows` 实现
- **位置计算**: 智能计算实际插入位置，避免位置偏移

## 更新日志

- **v2.0.0**: 完全重构，支持新的数据结构
- **v2.0.1**: 修复 TypeScript 类型错误
- **v2.0.2**: 添加详细的使用文档和示例
- **v2.0.3**: 重命名 moveRowByIndex 为 moveRowByIdV2，避免与 v1 版本冲突
- **v2.0.4**: 完善 moveRowByIdV2 实现，支持通过 rowId 查找和移动行
