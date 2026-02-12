# 属性类和属性实例化功能设计文档

## 概述

本设计文档描述了如何在 GridV3 组件系统中实现属性类和属性实例化功能。该功能将扩展现有的 ComponentGroupDataItem 和 ComponentData 数据结构，并在 MaterialComponents 组件中添加相应的 UI 交互。

## 架构设计

### 数据结构设计

#### 属性类型定义

```typescript
// 属性类型枚举
export type PropertyType = 'text' | 'boolean' | 'select';

// 单选项配置
export interface SelectOption {
  label: string;
  value: string;
}

// 属性类定义
export interface PropertyClass {
  id: string;
  name: string;
  type: PropertyType;
  // 单选项类型的选项配置
  options?: SelectOption[];
  // 创建时间
  createdAt: number;
  // 更新时间
  updatedAt: number;
}

// 属性实例值
export type PropertyValue = string | boolean | string;

// 属性实例定义
export interface PropertyInstance {
  id: string;
  // 关联的属性类 ID
  propertyClassId: string;
  // 属性值
  value: PropertyValue;
  // 创建时间
  createdAt: number;
  // 更新时间
  updatedAt: number;
}
```

#### 扩展现有数据结构

```typescript
// 扩展 ComponentGroupDataItem
export interface ComponentGroupDataItem {
  groupId: string;
  datas: ComponentData[];
  groupName: string;
  // 新增：属性类列表
  propertyClasses?: PropertyClass[];
}

// 扩展 ComponentData
export interface ComponentData {
  compId: string;
  compSourceRowId: string | undefined;
  compName: string;
  data: CopyRowData;
  // 新增：属性实例列表
  propertyInstances?: PropertyInstance[];
}
```

### 组件架构设计

#### 新增组件结构

```
MaterialComponents/
├── PropertyClassManager/          # 属性类管理组件
│   ├── PropertyClassPanel.tsx    # 属性类设置面板
│   ├── PropertyClassForm.tsx     # 属性类创建/编辑表单
│   └── PropertyClassList.tsx     # 属性类列表
├── PropertyInstanceManager/       # 属性实例管理组件
│   ├── PropertyInstanceDialog.tsx # 属性实例编辑弹窗
│   ├── PropertyInstanceForm.tsx   # 属性实例表单
│   └── PropertyInstanceList.tsx   # 属性实例列表
└── PropertyComponents/            # 属性输入组件
    ├── TextPropertyInput.tsx      # 文本属性输入
    ├── BooleanPropertyInput.tsx   # 布尔属性输入
    └── SelectPropertyInput.tsx    # 单选属性输入
```

## 组件设计

### 1. GroupHeader 扩展

在现有的 GroupHeader 组件中添加属性设置按钮：

```typescript
// 在删除按钮左边添加属性设置按钮
<Button
  size='xs'
  variant='ghost'
  onClick={onPropertySettings}
  className='h-7 w-7 p-0'
  title='属性设置'
>
  <Settings size={14} className='text-gray-600' />
</Button>
```

### 2. PropertyClassPanel 设计

属性类设置面板的主要功能：

- 显示当前分组的所有属性类
- 提供创建、编辑、删除属性类的操作
- 显示每个属性类的使用情况

```typescript
interface PropertyClassPanelProps {
  groupId: string;
  propertyClasses: PropertyClass[];
  onCreatePropertyClass: (
    propertyClass: Omit<PropertyClass, 'id' | 'createdAt' | 'updatedAt'>
  ) => void;
  onUpdatePropertyClass: (id: string, updates: Partial<PropertyClass>) => void;
  onDeletePropertyClass: (id: string) => void;
  onClose: () => void;
}
```

### 3. PropertyInstanceDialog 设计

组件属性实例编辑弹窗的主要功能：

- 显示当前组件的所有属性实例
- 基于分组的属性类创建新的属性实例
- 编辑和删除现有的属性实例

```typescript
interface PropertyInstanceDialogProps {
  component: ComponentData;
  groupPropertyClasses: PropertyClass[];
  onUpdatePropertyInstances: (
    componentId: string,
    instances: PropertyInstance[]
  ) => void;
  onClose: () => void;
}
```

### 4. 属性输入组件设计

#### TextPropertyInput

```typescript
interface TextPropertyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}
```

#### BooleanPropertyInput

```typescript
interface BooleanPropertyInputProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}
```

#### SelectPropertyInput

```typescript
interface SelectPropertyInputProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}
```

## 数据管理设计

### 属性类管理

扩展现有的 `createGroupDataManager` 工厂函数，添加属性类相关的操作方法：

```typescript
// 在 useThemePackV3Data 中添加属性类管理方法
const propertyClassManager = {
  // 创建属性类
  createPropertyClass: (
    groupId: string,
    propertyClass: Omit<PropertyClass, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    // 实现逻辑
  },

  // 更新属性类
  updatePropertyClass: (
    groupId: string,
    propertyClassId: string,
    updates: Partial<PropertyClass>
  ) => {
    // 实现逻辑
  },

  // 删除属性类
  deletePropertyClass: (groupId: string, propertyClassId: string) => {
    // 实现逻辑，同时删除相关的属性实例
  },

  // 获取属性类的使用情况
  getPropertyClassUsage: (groupId: string, propertyClassId: string) => {
    // 返回使用该属性类的组件列表
  },
};
```

### 属性实例管理

```typescript
const propertyInstanceManager = {
  // 创建属性实例
  createPropertyInstance: (
    componentId: string,
    propertyClassId: string,
    value: PropertyValue
  ) => {
    // 实现逻辑
  },

  // 更新属性实例
  updatePropertyInstance: (
    componentId: string,
    instanceId: string,
    value: PropertyValue
  ) => {
    // 实现逻辑
  },

  // 删除属性实例
  deletePropertyInstance: (componentId: string, instanceId: string) => {
    // 实现逻辑
  },

  // 批量更新组件的属性实例
  updateComponentPropertyInstances: (
    componentId: string,
    instances: PropertyInstance[]
  ) => {
    // 实现逻辑
  },
};
```

## 界面交互设计

### 属性类设置流程

1. 用户点击 GroupHeader 中的属性设置按钮
2. 弹出 PropertyClassPanel 面板
3. 面板显示当前分组的所有属性类
4. 用户可以：
   - 点击"新增属性类"创建新的属性类
   - 点击编辑按钮修改现有属性类
   - 点击删除按钮删除属性类（需确认）

### 属性实例设置流程

1. 用户在组件的下拉菜单中点击"属性设置"
2. 弹出 PropertyInstanceDialog 弹窗
3. 弹窗显示：
   - 当前组件已有的属性实例列表
   - 可以基于分组属性类创建的新实例
4. 用户可以：
   - 选择属性类创建新的属性实例
   - 修改现有属性实例的值
   - 删除不需要的属性实例

## 错误处理

### 数据一致性处理

1. **属性类删除时的处理**：
   - 检查是否有组件使用该属性类
   - 如果有使用，显示警告并列出使用的组件
   - 用户确认后，删除属性类和所有相关的属性实例

2. **属性类修改时的处理**：
   - 修改属性类名称：更新所有相关属性实例的引用
   - 修改单选项选项：检查现有实例值是否仍然有效，无效的设为默认值

3. **数据迁移处理**：
   - 为现有数据结构添加默认的空属性数组
   - 保持向后兼容性

### 用户输入验证

1. **属性类名称验证**：
   - 不能为空
   - 在同一分组内必须唯一
   - 长度限制（1-50字符）

2. **属性值验证**：
   - 文本类型：长度限制
   - 布尔类型：必须是 true/false
   - 单选类型：必须是有效的选项值

## 测试策略

### 单元测试

1. **数据管理测试**：
   - 属性类的 CRUD 操作
   - 属性实例的 CRUD 操作
   - 数据一致性验证

2. **组件测试**：
   - 属性输入组件的交互
   - 表单验证逻辑
   - 错误状态处理

### 集成测试

1. **完整流程测试**：
   - 创建属性类 → 创建属性实例 → 修改值 → 删除
   - 属性类修改对属性实例的影响
   - 数据持久化和恢复

2. **边界情况测试**：
   - 大量属性类和实例的性能
   - 并发操作的数据一致性
   - 异常情况的恢复

## 性能考虑

1. **数据结构优化**：
   - 使用 Map 结构优化属性类和实例的查找
   - 避免深度嵌套的数据结构

2. **渲染优化**：
   - 使用 React.memo 优化属性输入组件
   - 避免不必要的重新渲染

3. **数据持久化优化**：
   - 批量更新操作
   - 防抖保存机制
