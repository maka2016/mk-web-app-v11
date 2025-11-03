import { random } from '@mk/utils';
import {
  AddComponentParams,
  EditorSDK,
  IPositionLink,
  LayerElemItem,
  PositionLinkMap,
} from '@mk/works-store/types';
import {
  ComponentData,
  CopyRowData,
  deepClone,
  GridProps,
  GridRow,
  GridState,
} from '../../shared';
import { defaultGridStyle, mergeDeep2 } from './utils';

const convertV1ToV2 = (rowData: GridRow[]): GridRow[] => {
  return rowData.map(row => {
    if (row.children) return row;
    const { cells, ...restRow } = row;
    if (cells && Array.isArray(cells)) {
      return {
        ...restRow,
        children: cells.map(cell => ({
          ...cell,
          tag: cell.tag || 'grid_cell_root',
          cells: [],
        })) as unknown as GridRow[],
        cells: [],
      } as GridRow;
    }
    return row;
  });
};

// 类似lodash get的实现，通过路径数组获取嵌套对象的值
const getByPath = <T = any>(
  obj: Record<string | number, any> | null | undefined,
  path: (string | number)[]
): T | undefined => {
  if (!obj || !path || path.length === 0) {
    return obj as T;
  }

  let current: Record<string | number, any> = obj;
  let parentRowIds: string[] = [];
  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    if (current == null || current[key] === undefined) {
      return undefined;
    }
    current = current[key];
    if (current && current.id) {
      parentRowIds.push(current.id);
    }
  }
  current.parentRowIds = parentRowIds;
  return current as T;
};

const setByPath = <T = any>(
  obj: Record<string | number, any> | null | undefined,
  path: (string | number)[],
  value: T
): void => {
  if (!obj || !path || path.length === 0) {
    return;
  }

  let current: Record<string | number, any> = obj;
  // 遍历到倒数第二个路径，因为最后一个路径是用来设置值的
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (current[key] === undefined) {
      // 如果中间路径不存在，创建空对象
      current[key] = {};
    }
    current = current[key];
  }

  // 设置最后一个路径的值
  const lastKey = path[path.length - 1];
  current[lastKey] = value;
};

const getPathByRowDepth = (
  rowDepth: readonly number[]
): (string | number)[] => {
  const path: (string | number)[] = [];
  for (let i = 0; i < rowDepth.length; i++) {
    if (i === 0) {
      // 第一层直接是索引
      path.push(rowDepth[i]);
    } else {
      // 后续层级需要先进入children，再进入索引
      path.push('children', rowDepth[i]);
    }
  }
  return path;
};

// 数组元素移动函数
const sortArrItem = <T>(
  arr: T[],
  sourceIdx: number,
  targetIdx: number
): T[] => {
  const result = [...arr];
  const item = result[sourceIdx];
  result.splice(sourceIdx, 1);
  result.splice(targetIdx, 0, item);
  return result;
};

// 递归赋值id
export function assignIds(row: GridRow, renew = true) {
  if (!row.id || renew) {
    row.id = random();
  }
  if (Array.isArray(row.children)) {
    row.children.forEach(child => assignIds(child, renew));
  }
  return row;
}

export interface OperatorProps {
  /** v2 api 数据，无限嵌套的GridRow */
  gridsData: GridProps['gridsData'];
  /** v1 api 数据，二维数组 */
  editorSDK?: EditorSDK<GridProps, GridState>;
  widgetState: GridState;
}

export interface GetCopyRowCodeResult {
  /** V1版本旧数据 */
  row?: GridRow;
  rows: GridRow[];
  elemComps: LayerElemItem[];
  positionLink: Record<string, IPositionLink>;
}

export default class GridOperatorV2 {
  gridsData!: GridProps['gridsData'];
  editorSDK?: EditorSDK<GridProps, GridState>;
  widgetState!: GridState;
  constructor(props?: OperatorProps) {
    if (props) {
      const gridsData = props.gridsData;
      this.gridsData = gridsData;
      this.editorSDK = props.editorSDK;
      this.widgetState = props.widgetState;
    } else {
      // console.log('GridOperatorV2 未传入值');
    }
  }

  update(props: Partial<OperatorProps>) {
    if (props.gridsData) {
      const gridsData = props.gridsData;
      this.gridsData = gridsData;
    }
    if (props.widgetState) {
      this.widgetState = props.widgetState;
    }
    if (props.editorSDK) {
      this.editorSDK = props.editorSDK;
    }
  }

  commitChangeV2 = (gridsData: GridProps['gridsData']) => {
    console.log('commitChangeV2 gridsData', gridsData);
    // const stack = new Error().stack
    //   ?.split('\n')
    //   .slice(2, 8)
    //   .map(line => {
    //     const match = line.match(/at\s+(.+?)\s+\(/);
    //     return match ? match[1] : line.trim();
    //   });
    // console.log('调用堆栈函数名:', stack);
    this.editorSDK?.onFormValueChange({
      gridsData: gridsData,
      cellsMap: null,
    } as any);
    this.update({
      gridsData: gridsData,
      widgetState: this.widgetState,
    });
  };

  /**
   * --------------
   * v2 api，采用无限嵌套的GridRow
   */

  getActiveRootRow = (
    widgetState = this.widgetState,
    gridsData = this.gridsData
  ): GridRow | undefined => {
    const { activeRowDepth } = widgetState;

    // 如果没有activeRowDepth，返回undefined
    if (!activeRowDepth || activeRowDepth.length === 0) {
      return undefined;
    }

    // 构建路径数组，例如：[0, 'children', 1, 'children', 2]
    const path = getPathByRowDepth([activeRowDepth[0]]);

    // 使用getByPath获取目标GridRow
    const targetRow = getByPath(gridsData, path);
    return deepClone(targetRow);
  };

  getActiveRow = (
    widgetState = this.widgetState,
    gridsData = this.gridsData
  ): GridRow | undefined => {
    const { activeRowDepth } = widgetState;

    // 如果没有activeRowDepth，返回undefined
    if (!activeRowDepth || activeRowDepth.length === 0) {
      return undefined;
    }

    // 构建路径数组，例如：[0, 'children', 1, 'children', 2]
    const path = getPathByRowDepth(activeRowDepth);

    // 使用getByPath获取目标GridRow
    const targetRow = getByPath(gridsData, path);
    return deepClone(targetRow);
  };

  /**
   * 添加空白画布
   */
  addBlankBlock = (
    widgetState = this.widgetState,
    gridsData = this.gridsData
  ) => {
    const blankBlock = assignIds({
      isRepeatList: false,
      tag: 'block',
      style: {
        display: 'flex',
        flexDirection: 'column',
      },
      children: [
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            ...defaultGridStyle,
          },
        },
      ],
      childrenIds: [],
      alias: 'Grid',
    } as any);
    const { activeRowDepth } = widgetState;

    const insertIdx = activeRowDepth
      ? activeRowDepth[0]
      : this.gridsData.length;

    const nextGridsData = deepClone(gridsData);
    nextGridsData.splice(insertIdx, 0, blankBlock);
    this.commitChangeV2(nextGridsData);
    return {
      insertIdx,
      blankBlock,
    };
  };

  getRowByDepth = (
    activeRowDepth: number[],
    gridsData = this.gridsData
  ): GridRow | undefined => {
    // 如果没有activeRowDepth，返回undefined
    if (!activeRowDepth || activeRowDepth.length === 0) {
      return undefined;
    }

    // 构建路径数组，例如：[0, 'children', 1, 'children', 2]
    const path = getPathByRowDepth(activeRowDepth);

    // 使用getByPath获取目标GridRow
    const targetRow = getByPath(gridsData, path);
    return deepClone(targetRow);
  };

  /**
   * 根据行ID查找行
   */
  getRowById = (
    rowId: string,
    gridsData = this.gridsData
  ): GridRow | undefined => {
    // 使用队列实现广度优先搜索，同时记录路径
    const queue: Array<{ row: GridRow; path: number[] }> = gridsData.map(
      (row, index) => ({ row, path: [index] })
    );

    while (queue.length > 0) {
      const item = queue.shift()!;
      const { row, path } = item;

      // 给 row 赋值 depth（路径数组）
      row.depth = path;

      if (row.id === rowId) {
        return row;
      }

      if (row.children && row.children.length > 0) {
        queue.push(
          ...row.children.map((child, index) => ({
            row: child,
            path: [...path, index],
          }))
        );
      }
    }

    return undefined;
  };

  /**
   * 根据行ID查找行的路径和索引
   */
  findRowPathAndIndex = (
    rowId: string,
    gridsData = this.gridsData
  ): { rowPath: (string | number)[]; rowIndex: number } => {
    const findPathRecursively = (
      rows: GridRow[],
      currentPath: (string | number)[] = []
    ): { rowPath: (string | number)[]; rowIndex: number } | null => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.id === rowId) {
          return { rowPath: currentPath, rowIndex: i };
        }
        if (row.children && row.children.length > 0) {
          const childPath = [...currentPath, i, 'children'];
          const found = findPathRecursively(row.children, childPath);
          if (found) {
            return found;
          }
        }
      }
      return null;
    };

    const result = findPathRecursively(gridsData);
    if (!result) {
      return { rowPath: [], rowIndex: -1 };
    }
    return result;
  };

  addRowToRight = () => {
    const nextGridsData = deepClone(this.gridsData);
    const activeRowDepth = this.widgetState.activeRowDepth;
    const activeRow = this.getActiveRow(this.widgetState, nextGridsData);

    if (!activeRow) {
      console.warn('No active row found');
      return;
    }

    const setPath = getPathByRowDepth(activeRowDepth || []);
    if (
      activeRow.style?.display === 'flex' &&
      activeRow.style?.flexDirection === 'row'
    ) {
      /** 如果已经是横排，则在尾部添加即可 */
      const newId = random();
      const newGridRowInner: GridRow = {
        id: newId,
        cells: [],
        childrenIds: [],
        style: {
          display: 'flex',
          flexDirection: 'row',
        },
      };
      if (!activeRow.children) {
        activeRow.children = [];
      }
      activeRow.children.push(newGridRowInner);
      setByPath(nextGridsData, setPath, activeRow);
      this.commitChangeV2(nextGridsData);
      return;
    } else {
      /** 如果不是横排（包括grid布局），则需要创建一个新行 */
      const newId = random();
      const originActiveRowId = activeRow.id;
      activeRow.id = newId;
      const newGridRowInner: GridRow = {
        id: random(),
        cells: [],
        childrenIds: [],
        style: {
          display: 'flex',
          flexDirection: 'row',
        },
      };
      const newGridRow: GridRow = {
        id: originActiveRowId,
        cells: [],
        childrenIds: [],
        style: {
          display: 'flex',
          flexDirection: 'row',
        },
        children: [activeRow, newGridRowInner],
      };
      setByPath(nextGridsData, setPath, newGridRow);

      this.commitChangeV2(nextGridsData);
    }
  };

  addRowToBottom = () => {
    const nextGridsData = deepClone(this.gridsData);
    const activeRowDepth = this.widgetState.activeRowDepth;
    const activeRow = this.getActiveRow(this.widgetState, nextGridsData);

    if (!activeRow) {
      console.warn('No active row found');
      return;
    }

    const setPath = getPathByRowDepth(activeRowDepth || []);
    if (
      activeRow.style?.display === 'flex' &&
      activeRow.style?.flexDirection === 'column'
    ) {
      /** 如果已经是竖排，则在尾部添加即可 */
      const newId = random();
      const newGridRowInner: GridRow = {
        id: newId,
        cells: [],
        childrenIds: [],
        style: {
          display: 'flex',
          flexDirection: 'row',
          minHeight: 30,
        },
      };
      if (!activeRow.children) {
        activeRow.children = [];
      }
      activeRow.children.push(newGridRowInner);
      activeRow.style = {
        ...activeRow.style,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 30,
      };
      setByPath(nextGridsData, setPath, activeRow);
      this.commitChangeV2(nextGridsData);
      return;
    } else {
      /** 如果不是竖排（包括grid布局），则需要创建一个新行 */
      const newId = random();
      const originActiveRowId = activeRow.id;
      activeRow.id = newId;
      const newGridRowInner: GridRow = {
        id: random(),
        cells: [],
        childrenIds: [],
        style: {
          display: 'flex',
          flexDirection: 'row',
          minHeight: 30,
        },
      };
      const newGridRow: GridRow = {
        id: originActiveRowId,
        cells: [],
        childrenIds: [],
        style: {
          display: 'flex',
          flexDirection: 'column',
        },
        children: [activeRow, newGridRowInner],
      };
      setByPath(nextGridsData, setPath, newGridRow);

      this.commitChangeV2(nextGridsData);
    }
  };

  setRowAttrsV2 = (
    nextAttrs: Partial<GridRow>,
    widgetState = this.widgetState,
    replaceRow = false
  ) => {
    const { activeRowDepth } = widgetState;
    const nextGridsData = deepClone(this.gridsData);
    const activeRow = this.getActiveRow(widgetState, nextGridsData);

    if (!activeRow) {
      console.warn('No active row found');
      return;
    }

    const nextRow = !replaceRow ? mergeDeep2(activeRow, nextAttrs) : nextAttrs;
    const setPath = getPathByRowDepth(activeRowDepth || []);
    setByPath(nextGridsData, setPath, nextRow);
    this.commitChangeV2(nextGridsData);
  };

  setRowAttrsByIdV2 = (
    rowId: string,
    nextAttrs: Partial<GridRow>,
    replaceRow = false
  ) => {
    const nextGridsData = deepClone(this.gridsData);
    const activeRow = this.getRowById(rowId, nextGridsData);

    if (!activeRow) {
      console.warn('No active row found');
      return;
    }
    this.setRowAttrsV2(
      nextAttrs,
      {
        activeRowDepth: activeRow.depth,
      },
      replaceRow
    );
  };

  addComponentV2 = (
    {
      layer,
      link,
      toIndex,
    }: {
      layer: AddComponentParams;
      link?: IPositionLink;
      toIndex?: number;
    },
    widgetState = this.widgetState
  ) => {
    const { editingElemId, activeRowDepth } = widgetState;

    if (!activeRowDepth || activeRowDepth.length <= 1) {
      console.log('不能添加元素到根结点');
      return;
    }

    // 深拷贝gridsData以避免直接修改原数据
    const nextGridsData = deepClone(this.gridsData);

    // 根据activeRowDepth获取目标行
    const targetRow = this.getActiveRow(widgetState, nextGridsData);
    if (!targetRow) {
      console.warn('Target row not found in cloned data');
      return;
    }

    // 通过editorSDK添加组件到作品数据中
    const compId = this.editorSDK?.addComponent(
      layer,
      {
        x: 0,
        y: 0,
        ...(link || {}),
        visibility: false,
        lock: true,
        disabled: true,
      },
      false
    );
    if (!compId) {
      console.error('Failed to add component');
      return;
    }

    // 确保childrenIds数组存在
    if (!targetRow.childrenIds) {
      targetRow.childrenIds = [];
    }

    const nextChildrenIds = deepClone(targetRow.childrenIds);

    let insertIndex: number;

    // 优先使用toIndex参数，如果提供了的话
    if (typeof toIndex === 'number' && toIndex >= 0) {
      // 确保toIndex在有效范围内
      insertIndex = Math.min(toIndex, targetRow.childrenIds.length);
    } else if (editingElemId) {
      // 如果有editingElemId，找到其在childrenIds中的位置，并在其后一位添加
      const editingIndex = targetRow.childrenIds.indexOf(editingElemId);
      if (editingIndex !== -1) {
        insertIndex = editingIndex + 1;
      } else {
        // 如果找不到editingElemId，则添加到末尾
        insertIndex = targetRow.childrenIds.length;
      }
    } else {
      // 如果没有editingElemId，则添加到末尾
      insertIndex = targetRow.childrenIds.length;
    }

    // 在指定位置插入新组件的ID
    nextChildrenIds.splice(insertIndex, 0, compId);

    this.setRowAttrsV2({
      childrenIds: nextChildrenIds,
    });

    return compId;
  };

  addRowToRootV2 = (
    rows: GridRow[] | GridRow,
    widgetState = this.widgetState
  ) => {
    const { gridsData } = this;
    const { activeRowDepth } = widgetState;
    const insertRootIdx = (activeRowDepth?.[0] || 0) + 1;
    const nextGridsData = deepClone(gridsData);
    const nextRows = Array.isArray(rows) ? rows : [rows];

    nextRows.forEach(row => assignIds(row, true));
    nextGridsData.splice(insertRootIdx, 0, ...nextRows);
    this.commitChangeV2(nextGridsData);

    return [insertRootIdx];
  };

  addRowToRowChildV2 = (
    rows: GridRow[] | GridRow,
    widgetState = this.widgetState
  ) => {
    const { gridsData } = this;
    const { activeRowDepth } = widgetState;
    const nextGridsData = deepClone(gridsData);
    const targetRowDepth = activeRowDepth || [];
    const targetRow = this.getRowByDepth(targetRowDepth);
    if (!targetRow) {
      console.warn('Target row not found in cloned data');
      return;
    }
    const insertIdx = targetRow.children?.length || 0;
    const nextRows = Array.isArray(rows) ? rows : [rows];
    nextRows.forEach(row => assignIds(row, true));
    if (!targetRow.children) {
      targetRow.children = [];
    }
    targetRow.children?.splice(insertIdx, 0, ...nextRows);

    const setPath = getPathByRowDepth(targetRowDepth || []);
    setByPath(nextGridsData, setPath, targetRow);
    this.commitChangeV2(nextGridsData);

    return [...targetRowDepth, insertIdx];
  };

  /**
   * 用于复制元素的代码，返回一个对象，包含元素的复制数据
   * @param elemId
   */
  getElemCopyData = (elemId: string) => {
    const { editorSDK } = this;
    const { activeRowDepth } = this.widgetState;
    const activeRow = this.getActiveRow(this.widgetState, this.gridsData);
    if (!activeRow) {
      console.error('No active row found');
    }
  };

  // ========== 新增的V2 API方法 ==========

  /**
   * 删除元素
   */
  deleteElemV2 = (widgetState = this.widgetState) => {
    const { editingElemId } = widgetState;
    if (!editingElemId) {
      console.log('没有选择元素');
      return;
    }

    const nextGridsData = deepClone(this.gridsData);
    const activeRow = this.getActiveRow(widgetState, nextGridsData);

    if (!activeRow) {
      console.error('Active row not found');
      return;
    }

    // 从行中删除元素
    if (activeRow.childrenIds) {
      const childIdx = activeRow.childrenIds.indexOf(editingElemId);
      if (childIdx !== -1) {
        activeRow.childrenIds.splice(childIdx, 1);

        // 删除组件实体
        this.editorSDK?.deleteCompEntity(editingElemId);

        // 更新数据
        const setPath = getPathByRowDepth(widgetState.activeRowDepth || []);
        setByPath(nextGridsData, setPath, activeRow);

        // 检查当前行是否为空，如果为空则删除该行
        if (
          (!activeRow.childrenIds || activeRow.childrenIds.length === 0) &&
          (!activeRow.children || activeRow.children.length === 0)
        ) {
          // 当前行已为空，删除该行
          const delRes = this.deleteRowBatchV2WithoutCommit([activeRow.id]);
          if (delRes) {
            this.commitChangeV2(delRes.nextGridsData);
            // 删除行内的所有组件（如果还有的话）
            if (delRes.deleteIds.length > 0) {
              this.editorSDK?.deleteCompEntity(delRes.deleteIds);
            }
            return;
          }
        }

        // 如果当前行不为空，直接提交更改
        this.commitChangeV2(nextGridsData);
      }
    }
  };

  /**
   * 移动元素
   */
  moveElemV2 = (direction: 'up' | 'down', widgetState = this.widgetState) => {
    const { editingElemId } = widgetState;
    if (!editingElemId) {
      console.error('editingElemId is undefined');
      return;
    }

    const nextGridsData = deepClone(this.gridsData);
    const activeRow = this.getActiveRow(widgetState, nextGridsData);

    if (!activeRow || !activeRow.childrenIds) {
      console.error('Active row or childrenIds not found');
      return;
    }

    const childIds = [...activeRow.childrenIds];
    const currIdx = childIds.indexOf(editingElemId);

    if (currIdx === -1) {
      console.error('Element not found in row');
      return;
    }

    // 计算目标索引
    const nextIdx =
      direction === 'up'
        ? Math.max(currIdx - 1, 0)
        : Math.min(currIdx + 1, childIds.length - 1);

    if (nextIdx === currIdx) {
      return nextGridsData; // 无需移动
    }

    // 交换位置
    const nextVal = childIds[nextIdx];
    childIds[nextIdx] = editingElemId;
    childIds[currIdx] = nextVal;

    // 更新数据
    const setPath = getPathByRowDepth(widgetState.activeRowDepth || []);
    setByPath(nextGridsData, setPath, { ...activeRow, childrenIds: childIds });
    this.commitChangeV2(nextGridsData);

    return nextGridsData;
  };

  /**
   * 根据索引直接移动元素到指定位置
   */
  moveElemByIndexV2 = (
    elemId: string,
    targetIndex: number,
    widgetState = this.widgetState
  ) => {
    const { editingElemId } = widgetState;
    if (!editingElemId) {
      console.error('editingElemId is undefined');
      return;
    }

    const nextGridsData = deepClone(this.gridsData);
    const activeRow = this.getActiveRow(widgetState, nextGridsData);

    if (!activeRow || !activeRow.childrenIds) {
      console.error('Active row or childrenIds not found');
      return;
    }

    const childIds = [...activeRow.childrenIds];
    const currentIndex = childIds.indexOf(elemId);

    if (currentIndex === -1) {
      console.error('Element not found in row');
      return;
    }

    // 确保目标索引在有效范围内
    const maxIndex = childIds.length - 1;
    const safeTargetIndex = Math.max(0, Math.min(targetIndex, maxIndex));

    if (currentIndex === safeTargetIndex) {
      return nextGridsData;
    }

    // 使用 sortArrItem 函数进行移动
    const newChildIds = sortArrItem(childIds, currentIndex, safeTargetIndex);

    // 更新数据
    const setPath = getPathByRowDepth(widgetState.activeRowDepth || []);
    setByPath(nextGridsData, setPath, {
      ...activeRow,
      childrenIds: newChildIds,
    });
    this.commitChangeV2(nextGridsData);

    return nextGridsData;
  };

  /**
   * 复制元素
   */
  duplicateElemV2 = (widgetState = this.widgetState) => {
    const { editingElemId } = widgetState;
    if (!editingElemId) {
      console.error('editingElemId is undefined');
      return;
    }

    const nextGridsData = deepClone(this.gridsData);
    const activeRow = this.getActiveRow(widgetState, nextGridsData);

    if (!activeRow) {
      console.error('Active row not found');
      return;
    }

    // 复制组件
    const duplicateCompIds = this.editorSDK?.duplicateComp(
      editingElemId,
      false
    );
    const nextCompId = Array.isArray(duplicateCompIds)
      ? duplicateCompIds
      : [duplicateCompIds || ''];

    if (!activeRow.childrenIds) {
      activeRow.childrenIds = [];
    }

    // 在编辑元素后插入复制的组件
    const currIdx = activeRow.childrenIds.indexOf(editingElemId);
    if (currIdx !== -1) {
      activeRow.childrenIds.splice(currIdx + 1, 0, ...nextCompId);
    } else {
      activeRow.childrenIds.push(...nextCompId);
    }

    // 更新数据
    const setPath = getPathByRowDepth(widgetState.activeRowDepth || []);
    setByPath(nextGridsData, setPath, activeRow);
    this.commitChangeV2(nextGridsData);

    return nextCompId[0];
  };

  /**
   * 移动行
   */
  moveRowV2 = (direction: 'up' | 'down', widgetState = this.widgetState) => {
    const { activeRowDepth } = widgetState;

    if (!activeRowDepth || activeRowDepth.length === 0) {
      console.error('activeRowDepth is undefined');
      return;
    }

    const nextGridsData = deepClone(this.gridsData);

    // 获取父级路径和当前行在父级中的索引
    const parentPath =
      activeRowDepth.length > 1
        ? getPathByRowDepth(activeRowDepth.slice(0, -1))
        : [];
    const currentIndex = activeRowDepth[activeRowDepth.length - 1];

    let parentArray: GridRow[];
    if (parentPath.length === 0) {
      // 根级别
      parentArray = nextGridsData;
    } else {
      // 子级别
      const parent = getByPath(nextGridsData, parentPath);
      parentArray = parent?.children || [];
    }

    if (currentIndex < 0 || currentIndex >= parentArray.length) {
      console.error('Invalid row index');
      return;
    }

    // 计算目标索引
    const nextIdx =
      direction === 'up'
        ? Math.max(currentIndex - 1, 0)
        : Math.min(currentIndex + 1, parentArray.length - 1);

    if (nextIdx === currentIndex) {
      return nextGridsData; // 无需移动
    }

    // 交换位置
    const temp = parentArray[currentIndex];
    parentArray[currentIndex] = parentArray[nextIdx];
    parentArray[nextIdx] = temp;

    this.commitChangeV2(nextGridsData);
    return nextGridsData;
  };

  /**
   * 移动Row到目标位置
   * @param widgetState 当前状态
   * @param targetRowDepth 目标Row的深度
   * @param mode 移动模式：'group' = 移动到目标Row内部（作为children），'sibling' = 移动到与目标Row平行的层级
   */
  moveRowToTargetV2 = (
    widgetState = this.widgetState,
    targetRowDepth: number[],
    mode: 'group' | 'sibling' = 'sibling'
  ) => {
    const { activeRowDepth } = widgetState;
    if (!activeRowDepth || activeRowDepth.length === 0) {
      console.error('activeRowDepth is undefined');
      return;
    }

    // 不能移动到自己（使用数组比较，避免 JSON.stringify）
    const isSameTarget =
      activeRowDepth.length === targetRowDepth.length &&
      activeRowDepth.every((v, i) => v === targetRowDepth[i]);
    if (isSameTarget) {
      console.error('Cannot move row to itself');
      return;
    }

    // 检查是否试图移动到自己的子节点
    const isMovingToOwnChild =
      targetRowDepth.length > activeRowDepth.length &&
      activeRowDepth.every((v, i) => v === targetRowDepth[i]);
    if (isMovingToOwnChild) {
      console.error('Cannot move row to its own child');
      return;
    }

    const nextGridsData = deepClone(this.gridsData);

    // 获取源Row
    const sourceRowPath = getPathByRowDepth(activeRowDepth);
    const sourceRow = getByPath<GridRow>(nextGridsData, sourceRowPath);
    if (!sourceRow) {
      console.error('Source row not found');
      return;
    }

    // 获取源Row的父级信息
    const sourceParentPath =
      activeRowDepth.length > 1
        ? getPathByRowDepth(activeRowDepth.slice(0, -1))
        : [];
    const sourceIndex = activeRowDepth[activeRowDepth.length - 1];

    // 获取源父级数组
    let sourceParentArray: GridRow[];
    if (sourceParentPath.length === 0) {
      sourceParentArray = nextGridsData;
    } else {
      const sourceParent = getByPath<GridRow>(nextGridsData, sourceParentPath);
      sourceParentArray = sourceParent?.children || [];
    }

    if (sourceIndex < 0 || sourceIndex >= sourceParentArray.length) {
      console.error('Invalid source row index');
      return;
    }

    // 从源父级中移除Row
    const [removedRow] = sourceParentArray.splice(sourceIndex, 1);

    let newRowDepth: number[];

    if (mode === 'group') {
      // 模式1：移动到目标Row内部（作为children）
      const targetRowPath = getPathByRowDepth(targetRowDepth);
      const targetRow = getByPath<GridRow>(nextGridsData, targetRowPath);
      if (!targetRow) {
        console.error('Target row not found');
        return;
      }

      // 确保目标Row有children数组
      if (!targetRow.children) {
        targetRow.children = [];
      }

      // 将Row添加到目标Row的children中
      targetRow.children.push(removedRow);

      // 更新目标Row
      setByPath(nextGridsData, targetRowPath, targetRow);

      // 计算新的activeRowDepth（现在Row在目标Row的children的最后）
      newRowDepth = [...targetRowDepth, targetRow.children.length - 1];
    } else {
      // 模式2：移动到与目标Row平行的层级（作为sibling）
      const targetParentPath =
        targetRowDepth.length > 1
          ? getPathByRowDepth(targetRowDepth.slice(0, -1))
          : [];
      const targetIndex = targetRowDepth[targetRowDepth.length - 1];

      // 获取目标父级数组
      let targetParentArray: GridRow[];
      if (targetParentPath.length === 0) {
        targetParentArray = nextGridsData;
      } else {
        const targetParent = getByPath<GridRow>(
          nextGridsData,
          targetParentPath
        );
        targetParentArray = targetParent?.children || [];
      }

      // 计算插入位置
      // 如果源和目标在同一个父级，且源在目标之前，需要调整插入索引
      let insertIndex = targetIndex + 1;
      const isSameParent =
        sourceParentPath.length === targetParentPath.length &&
        sourceParentPath.every((v, i) => v === targetParentPath[i]);
      if (isSameParent && sourceIndex < targetIndex) {
        insertIndex = targetIndex; // 因为已经删除了源Row，所以不需要+1
      }

      // 将Row插入到目标位置
      targetParentArray.splice(insertIndex, 0, removedRow);

      // 更新目标父级（如果与源父级不同）
      if (targetParentPath.length > 0 && !isSameParent) {
        const targetParent = getByPath<GridRow>(
          nextGridsData,
          targetParentPath
        );
        if (targetParent) {
          targetParent.children = targetParentArray;
        }
      }

      // 计算新的activeRowDepth
      const targetParentDepth = targetRowDepth.slice(0, -1);
      newRowDepth = [...targetParentDepth, insertIndex];
    }

    // 更新源父级
    if (sourceParentPath.length > 0) {
      const sourceParent = getByPath<GridRow>(nextGridsData, sourceParentPath);
      if (sourceParent) {
        sourceParent.children = sourceParentArray;
      }
    }

    // 提交更改
    this.commitChangeV2(nextGridsData);

    return newRowDepth;
  };

  /**
   * 根据索引直接移动行到指定位置
   */
  moveRowByIndexV2 = (targetIndex: number, widgetState = this.widgetState) => {
    const { activeRowDepth } = widgetState;
    if (!activeRowDepth || activeRowDepth.length === 0) {
      console.error('activeRowDepth is undefined');
      return;
    }

    const nextGridsData = deepClone(this.gridsData);

    // 获取父级路径和当前行在父级中的索引
    const parentPath =
      activeRowDepth.length > 1
        ? getPathByRowDepth(activeRowDepth.slice(0, -1))
        : [];
    const currentIndex = activeRowDepth[activeRowDepth.length - 1];

    let parentArray: GridRow[];
    if (parentPath.length === 0) {
      // 根级别
      parentArray = nextGridsData;
    } else {
      // 子级别
      const parent = getByPath<GridRow>(nextGridsData, parentPath);
      parentArray = parent?.children || [];
    }

    if (currentIndex < 0 || currentIndex >= parentArray.length) {
      console.error('Invalid row index');
      return;
    }

    // 确保目标索引在有效范围内
    const maxIndex = parentArray.length - 1;
    const safeTargetIndex = Math.max(0, Math.min(targetIndex, maxIndex));

    if (currentIndex === safeTargetIndex) {
      return nextGridsData;
    }

    // 使用 sortArrItem 函数进行移动
    const newParentArray = sortArrItem(
      parentArray,
      currentIndex,
      safeTargetIndex
    );

    // 更新父级数组
    if (parentPath.length === 0) {
      // 根级别
      nextGridsData.splice(0, nextGridsData.length, ...newParentArray);
    } else {
      // 子级别
      const parent = getByPath<GridRow>(nextGridsData, parentPath);
      if (parent) {
        parent.children = newParentArray;
      }
    }

    this.commitChangeV2(nextGridsData);

    return nextGridsData;
  };

  /**
   * 根据行ID移动行到指定位置（与v1版本兼容）
   * @param rowId 要移动的行ID
   * @param targetIndex 目标索引位置
   * @param toBlockId 可选的块ID（用于分组处理）
   */
  moveRowByIdV2 = (rowId: string, targetIndex: number) => {
    const nextGridsData = deepClone(this.gridsData);

    // 递归查找行及其位置
    const findRowAndParent = (
      rows: GridRow[],
      targetId: string,
      parentPath: number[] = []
    ): { row: GridRow; parentPath: number[]; index: number } | null => {
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].id === targetId) {
          return { row: rows[i], parentPath, index: i };
        }

        // 递归查找子行
        if (rows[i].children && Array.isArray(rows[i].children)) {
          const result = findRowAndParent(rows[i].children!, targetId, [
            ...parentPath,
            i,
          ]);
          if (result) return result;
        }
      }
      return null;
    };

    // 查找目标行
    const rowInfo = findRowAndParent(nextGridsData, rowId);
    if (!rowInfo) {
      console.error(`Row with ID ${rowId} not found`);
      return nextGridsData;
    }

    const { row, parentPath, index: currentIndex } = rowInfo;

    // 获取父级数组
    let parentArray: GridRow[];
    if (parentPath.length === 0) {
      // 根级别
      parentArray = nextGridsData;
    } else {
      // 子级别
      const parent = getByPath<GridRow>(nextGridsData, parentPath);
      parentArray = parent?.children || [];
    }

    // 如果目标索引超出父级数组范围，则移动到根级别
    if (targetIndex >= parentArray.length) {
      // 从原位置删除
      if (parentPath.length === 0) {
        parentArray.splice(currentIndex, 1);
      } else {
        const parent = getByPath<GridRow>(nextGridsData, parentPath);
        if (parent && parent.children) {
          parent.children.splice(currentIndex, 1);
        }
      }
      nextGridsData.splice(targetIndex, 0, row);
    } else {
      // 确保目标索引在有效范围内
      const maxIndex = parentArray.length - 1;
      const safeTargetIndex = Math.max(0, Math.min(targetIndex, maxIndex));

      if (currentIndex === safeTargetIndex) {
        return nextGridsData;
      }

      // 使用 sortArrItem 函数进行移动
      const newParentArray = sortArrItem(
        parentArray,
        currentIndex,
        safeTargetIndex
      );

      // 更新父级数组
      if (parentPath.length === 0) {
        // 根级别
        nextGridsData.splice(0, nextGridsData.length, ...newParentArray);
      } else {
        // 子级别
        const parent = getByPath<GridRow>(nextGridsData, parentPath);
        if (parent) {
          parent.children = newParentArray;
        }
      }
    }

    this.commitChangeV2(nextGridsData);

    return nextGridsData;
  };

  /**
   * 复制行
   */
  duplicateRowV2 = (widgetState = this.widgetState) => {
    const { activeRowDepth } = widgetState;
    if (!activeRowDepth || activeRowDepth.length === 0) {
      console.error('activeRowDepth is undefined');
      return;
    }

    const nextGridsData = deepClone(this.gridsData);
    const activeRow = this.getActiveRow(widgetState, nextGridsData);

    if (!activeRow) {
      console.error('Active row not found');
      return;
    }

    // 复制行
    const nextRow = deepClone(activeRow);
    nextRow.id = random();

    // 复制行内的组件
    if (nextRow.childrenIds && nextRow.childrenIds.length > 0) {
      const duplicateCompIds = this.editorSDK?.duplicateComp(
        nextRow.childrenIds,
        false
      );
      if (duplicateCompIds) {
        nextRow.childrenIds = Array.isArray(duplicateCompIds)
          ? duplicateCompIds
          : [duplicateCompIds];
      }
    }

    // 递归复制子行
    if (nextRow.children && nextRow.children.length > 0) {
      nextRow.children = nextRow.children.map(child => {
        const newChild = deepClone(child);
        newChild.id = random();

        // 复制子行内的组件
        if (newChild.childrenIds && newChild.childrenIds.length > 0) {
          const duplicateCompIds = this.editorSDK?.duplicateComp(
            newChild.childrenIds,
            false
          );
          if (duplicateCompIds) {
            newChild.childrenIds = Array.isArray(duplicateCompIds)
              ? duplicateCompIds
              : [duplicateCompIds];
          }
        }

        return newChild;
      });
    }

    // 插入到当前行之后
    const parentPath =
      activeRowDepth.length > 1
        ? getPathByRowDepth(activeRowDepth.slice(0, -1))
        : [];
    const currentIndex = activeRowDepth[activeRowDepth.length - 1];

    if (parentPath.length === 0) {
      // 根级别
      nextGridsData.splice(currentIndex + 1, 0, nextRow);
    } else {
      // 子级别
      const parent = getByPath(nextGridsData, parentPath);
      if (parent && parent.children) {
        parent.children.splice(currentIndex + 1, 0, nextRow);
      }
    }

    this.commitChangeV2(nextGridsData);
    return nextRow.id;
  };

  duplicateRowRecursively = (row: GridRow): GridRow => {
    const newRow = deepClone(row);
    newRow.id = random();

    // 复制行内的组件
    if (newRow.childrenIds && newRow.childrenIds.length > 0) {
      const duplicateCompIds = this.editorSDK?.duplicateComp(
        newRow.childrenIds,
        false
      );
      if (duplicateCompIds) {
        newRow.childrenIds = Array.isArray(duplicateCompIds)
          ? duplicateCompIds
          : [duplicateCompIds];
      }
    }

    // 递归复制子行
    if (newRow.children && newRow.children.length > 0) {
      newRow.children = newRow.children.map(child =>
        this.duplicateRowRecursively(child)
      );
    }

    return newRow;
  };

  /**
   * 批量复制行
   */
  duplicateRowBatchV2 = (
    rowIds: string[],
    {
      repeatCount = 1,
      /**
       * true: 插入到被复制行的父级
       * false: 插入到被复制行的里面
       */
      insertToParent = false,
    },
    widgetState = this.widgetState
  ) => {
    if (!rowIds || rowIds.length === 0) {
      console.error('rowIds is empty');
      return [];
    }
    const { activeRowDepth } = widgetState;

    if (repeatCount < 1) {
      console.error('repeatCount must be at least 1');
      return [];
    }

    const nextGridsData = deepClone(this.gridsData);
    const newRowIds: string[] = [];

    // 根据 repeatCount 重复复制
    for (let repeat = 0; repeat < repeatCount; repeat++) {
      // 按顺序复制每一行
      rowIds.forEach((rowId, index) => {
        const row = this.getRowById(rowId, nextGridsData);
        if (!row) {
          console.error(`Row with id ${rowId} not found`);
          return;
        }

        // 递归复制行及其所有子行

        // 复制当前行
        const duplicatedRow = this.duplicateRowRecursively(row);
        newRowIds.push(duplicatedRow.id);

        const parentRowDepth =
          (insertToParent ? activeRowDepth?.slice(0, -1) : activeRowDepth) ||
          [];
        const parentRow = this.getRowByDepth(parentRowDepth, nextGridsData);

        // 根据 activeRowDepth 决定插入位置
        if (activeRowDepth && activeRowDepth.length > 0) {
          console.log('activeRowDepth', activeRowDepth);
          // 使用 activeRowDepth 作为插入位置
          const insertIndex = insertToParent
            ? activeRowDepth[activeRowDepth.length - 1]
            : parentRow?.children?.length || 0;

          if (activeRowDepth.length === 0) {
            // 根级别
            nextGridsData.splice(insertIndex + 1, 0, duplicatedRow);
          } else {
            // 子级别
            const insertPath = getPathByRowDepth(
              insertToParent ? parentRowDepth : activeRowDepth
            );
            const parent = getByPath(nextGridsData, insertPath);
            if (parent && parent.children) {
              parent.children.splice(insertIndex + 1, 0, duplicatedRow);
              setByPath(nextGridsData, insertPath, parent);
            }
          }
        } else {
          // 如果没有 activeRowDepth，则使用原来的逻辑（插入到被复制行的后面）
          const { rowPath, rowIndex } = this.findRowPathAndIndex(
            rowId,
            nextGridsData
          );
          if (rowPath.length === 0) {
            // 根级别
            nextGridsData.splice(rowIndex + 1, 0, duplicatedRow);
          } else {
            // 子级别
            const parent = getByPath(nextGridsData, rowPath);
            if (parent && parent.children) {
              parent.children.splice(rowIndex + 1, 0, duplicatedRow);
              setByPath(nextGridsData, rowPath, parent);
            }
          }
        }
      });
    }

    // 提交变更
    this.commitChangeV2(nextGridsData);

    return newRowIds;
  };

  /**
   * 批量删除行
   */
  deleteRowBatchV2WithoutCommit = (deletedRowIds: string[]) => {
    if (!deletedRowIds || deletedRowIds.length === 0) {
      console.error('deletedRowIds is empty');
      return;
    }

    const nextGridsData = deepClone(this.gridsData);
    const deleteIds: string[] = [];

    // 按索引从大到小排序，避免删除时索引变化的问题
    const rowInfos = deletedRowIds
      .map(rowId => {
        const { rowPath, rowIndex } = this.findRowPathAndIndex(
          rowId,
          nextGridsData
        );
        return { rowId, rowPath, rowIndex };
      })
      .filter(info => info.rowIndex !== -1)
      .sort((a, b) => {
        // 如果路径长度不同，先按路径长度排序，再按索引排序
        if (a.rowPath.length !== b.rowPath.length) {
          return a.rowPath.length - b.rowPath.length;
        }
        // 路径长度相同时，按索引从大到小排序
        return b.rowIndex - a.rowIndex;
      });

    // 批量删除行
    rowInfos.forEach(({ rowId, rowPath, rowIndex }) => {
      const currRowDepth = [
        ...rowPath.filter(i => typeof i === 'number'),
        rowIndex,
      ];
      const parentRowPath = currRowDepth.slice(0, -1);
      const row = this.getRowByDepth(currRowDepth, nextGridsData);
      if (!row) {
        return;
      }

      // 递归收集需要删除的行ID和组件ID
      const collectDeleteInfo = (row: GridRow) => {
        // 收集当前行的组件ID
        if (row.childrenIds && row.childrenIds.length > 0) {
          deleteIds.push(...row.childrenIds);
        }

        // 递归收集子行的信息
        if (row.children && row.children.length > 0) {
          row.children.forEach(child => {
            collectDeleteInfo(child);
          });
        }
      };

      // 收集当前行及其所有子行的删除信息
      collectDeleteInfo(row);

      if (parentRowPath.length > 0) {
        // 删除最后一位
        // 子级别：从父行的 children 中删除
        const parent = getByPath(
          nextGridsData,
          getPathByRowDepth(parentRowPath)
        );
        parent?.children?.splice(rowIndex, 1);
        setByPath(nextGridsData, parentRowPath, parent);
      } else {
        nextGridsData.splice(rowIndex, 1);
      }
    });

    return {
      nextGridsData,
      deleteIds,
    };
  };

  /**
   * 批量删除行
   */
  deleteRowBatchV2 = (deletedRowIds: string[]) => {
    const delRes = this.deleteRowBatchV2WithoutCommit(deletedRowIds);
    if (!delRes) {
      console.error('delRes is empty');
      return;
    }
    const { nextGridsData, deleteIds } = delRes;

    // 删除对应的组件实体
    if (deleteIds.length > 0) {
      console.log('deleteIds', deleteIds);
      this.editorSDK?.deleteCompEntity(deleteIds);
    }
    this.commitChangeV2(nextGridsData);
    return;
    // if (!deletedRowIds || deletedRowIds.length === 0) {
    //   console.error('deletedRowIds is empty');
    //   return;
    // }

    // const nextGridsData = deepClone(this.gridsData);
    // const deleteIds: string[] = [];

    // // 按索引从大到小排序，避免删除时索引变化的问题
    // const rowInfos = deletedRowIds
    //   .map(rowId => {
    //     const { rowPath, rowIndex } = this.findRowPathAndIndex(
    //       rowId,
    //       nextGridsData
    //     );
    //     return { rowId, rowPath, rowIndex };
    //   })
    //   .filter(info => info.rowIndex !== -1)
    //   .sort((a, b) => {
    //     // 如果路径长度不同，先按路径长度排序，再按索引排序
    //     if (a.rowPath.length !== b.rowPath.length) {
    //       return a.rowPath.length - b.rowPath.length;
    //     }
    //     // 路径长度相同时，按索引从大到小排序
    //     return b.rowIndex - a.rowIndex;
    //   });

    // // 批量删除行
    // rowInfos.forEach(({ rowId, rowPath, rowIndex }) => {
    //   const currRowDepth = [
    //     ...rowPath.filter(i => typeof i === 'number'),
    //     rowIndex,
    //   ];
    //   const parentRowPath = currRowDepth.slice(0, -1);
    //   const row = this.getRowByDepth(currRowDepth, nextGridsData);
    //   if (!row) {
    //     return;
    //   }

    //   // 递归收集需要删除的行ID和组件ID
    //   const collectDeleteInfo = (row: GridRow) => {
    //     // 收集当前行的组件ID
    //     if (row.childrenIds && row.childrenIds.length > 0) {
    //       deleteIds.push(...row.childrenIds);
    //     }

    //     // 递归收集子行的信息
    //     if (row.children && row.children.length > 0) {
    //       row.children.forEach(child => {
    //         collectDeleteInfo(child);
    //       });
    //     }
    //   };

    //   // 收集当前行及其所有子行的删除信息
    //   collectDeleteInfo(row);

    //   if (parentRowPath.length > 0) {
    //     // 删除最后一位
    //     // 子级别：从父行的 children 中删除
    //     const parent = getByPath(
    //       nextGridsData,
    //       getPathByRowDepth(parentRowPath)
    //     );
    //     parent?.children?.splice(rowIndex, 1);
    //     setByPath(nextGridsData, parentRowPath, parent);
    //   } else {
    //     nextGridsData.splice(rowIndex, 1);
    //   }
    // });

    // // 删除对应的组件实体
    // if (deleteIds.length > 0) {
    //   console.log('deleteIds', deleteIds);
    //   this.editorSDK?.deleteCompEntity(deleteIds);
    // }

    // // 提交变更
    // this.commitChangeV2(nextGridsData);
  };

  /**
   * 从模板添加行 - 与 addRowFromTemplate 行为一致，兼容 v2 数据结构
   * @param copyRowData 复制行数据
   * @param widgetState 当前状态
   * @param replaceRow 替换当前激活的Row，将会删除Row中所有的元素
   */
  addRowFromTemplateV2 = (
    copyRowData: CopyRowData,
    widgetState = this.widgetState,
    replaceRow = false
  ) => {
    const pastedRes = this.pasteRow(copyRowData, widgetState, replaceRow);
    return pastedRes;
  };

  /**
   * 获取复制行代码
   */
  getCopyRowCodeV2 = (widgetState = this.widgetState) => {
    const { activeRowDepth } = widgetState;
    if (!activeRowDepth || activeRowDepth.length === 0) {
      console.error('activeRowDepth is undefined');
      return;
    }

    const activeRow = this.getActiveRow(widgetState);
    if (!activeRow) {
      console.error('Active row not found');
      return;
    }

    const layers: LayerElemItem[] = [];
    const positionLink: PositionLinkMap = {};

    // 收集当前行的组件信息
    const collectRowComponents = (row: GridRow) => {
      if (row.childrenIds) {
        row.childrenIds.forEach(id => {
          const layer = this.editorSDK?.getLayer(id);
          const link = this.editorSDK?.getLink(id);
          if (layer && link) {
            layers.push(layer);
            positionLink[layer.elemId] = link;
          }
        });
      }

      // 递归处理子行
      if (row.children && row.children.length > 0) {
        row.children.forEach(child => collectRowComponents(child));
      }
    };

    // 根据 activeRowDepth 获取完整的行结构
    const getCompleteRowStructure = (): GridRow[] => {
      if (activeRowDepth.length === 0) {
        // 根级别，返回整个 gridsData
        return this.gridsData;
      }
      delete activeRow._id;

      // 有层级的情况，需要找到父级行
      const parentDepth = activeRowDepth.slice(0, -1);
      const currentIndex = activeRowDepth[activeRowDepth.length - 1];

      if (parentDepth.length === 0) {
        // 父级是根级别
        const parentRow = this.gridsData[currentIndex];
        delete parentRow._id;
        if (parentRow && parentRow.children) {
          return [parentRow];
        }
        return [activeRow];
      } else {
        // 父级有层级，需要递归查找
        const parentRow = this.getRowByDepth(parentDepth);
        if (parentRow && parentRow.children) {
          delete parentRow._id;
          const targetRow = parentRow.children[currentIndex];
          if (targetRow) {
            delete targetRow._id;
            return [targetRow];
          }
        }
        return [activeRow];
      }
    };

    const rows = getCompleteRowStructure();
    if (!rows || rows.length === 0) return;

    // 收集所有行的组件信息
    rows.forEach(row => {
      collectRowComponents(row);
    });

    const copyCode = {
      rows,
      elemComps: layers,
      positionLink,
    };
    return copyCode;
  };

  /**
   * 获取复制行代码（支持分组复制）
   */
  getCopyRowCodeWithGroup = (widgetState = this.widgetState) => {
    const { activeRowDepth } = widgetState || {};
    if (!activeRowDepth || activeRowDepth.length === 0 || !this.editorSDK) {
      console.error('activeRowDepth is undefined');
      return;
    }
    return getCopyRowCodeWithGroupPure({
      activeRowDepth: activeRowDepth,
      gridsData: this.gridsData,
      getLayer: this.editorSDK?.getLayer,
      getLink: this.editorSDK?.getLink,
    });
  };

  /**
   * 复制行数据到剪贴板
   */
  copyRowV2 = (widgetState = this.widgetState) => {
    const copyData = this.getCopyRowCodeV2(widgetState);
    // console.log('copyData', copyData);
    if (!copyData) {
      console.error('Failed to get copy data');
      return false;
    }

    try {
      // 将数据存储到localStorage作为临时剪贴板
      const clipboardData = {
        type: 'grid_row',
        timestamp: Date.now(),
        data: copyData,
      };
      localStorage.setItem('grid_clipboard', JSON.stringify(clipboardData));
      console.log('Row copied to clipboard:', copyData);
      return true;
    } catch (error) {
      console.error('Failed to copy row:', error);
      return false;
    }
  };

  moveElemToGroupV2 = (
    widgetState = this.widgetState,
    targetRowDepth: number[]
  ) => {
    const { activeRowDepth, editingElemId } = widgetState;
    if (
      !activeRowDepth ||
      activeRowDepth.length === 0 ||
      !editingElemId ||
      !targetRowDepth
    ) {
      console.error('activeRowDepth is undefined');
      return;
    }

    const nextGridsData = deepClone(this.gridsData);

    // 获取源行（当前编辑元素所在的行）
    const sourceRow = this.getActiveRow(widgetState, nextGridsData);
    if (!sourceRow || !sourceRow.childrenIds) {
      console.error('Source row or childrenIds not found');
      return;
    }

    // 获取目标行
    const targetRowPath = getPathByRowDepth(targetRowDepth);
    const targetRow = getByPath<GridRow>(nextGridsData, targetRowPath);
    if (!targetRow) {
      console.error('Target row not found');
      return;
    }

    // 确保目标行有 childrenIds 数组
    if (!targetRow.childrenIds) {
      targetRow.childrenIds = [];
    }

    // 从源行中移除元素
    const sourceChildIds = [...sourceRow.childrenIds];
    const elemIndex = sourceChildIds.indexOf(editingElemId);

    if (elemIndex === -1) {
      console.error('Element not found in source row');
      return;
    }

    // 移除元素
    sourceChildIds.splice(elemIndex, 1);

    // 将元素添加到目标行
    const targetChildIds = [...targetRow.childrenIds];
    targetChildIds.push(editingElemId);

    // 更新源行
    const sourceRowPath = getPathByRowDepth(activeRowDepth);
    setByPath(nextGridsData, sourceRowPath, {
      ...sourceRow,
      childrenIds: sourceChildIds,
    });

    // 更新目标行
    setByPath(nextGridsData, targetRowPath, {
      ...targetRow,
      childrenIds: targetChildIds,
    });

    // 提交更改
    this.commitChangeV2(nextGridsData);

    return targetRowDepth;
  };

  groupElemV2 = (widgetState = this.widgetState) => {
    const { activeRowDepth, editingElemId } = widgetState;
    if (!activeRowDepth || activeRowDepth.length === 0 || !editingElemId) {
      console.error('activeRowDepth is undefined');
      return;
    }
    if (editingElemId) {
      const targetRow = this.getActiveRow(widgetState);
      if (!targetRow) {
        console.error('targetRow is undefined');
        return;
      }
      const addResRowDepth = this.addRowToRowChildV2(
        {
          id: random(),
          cells: [],
          childrenIds: [],
          children: [],
          style: {
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          },
        },
        widgetState
      );
      if (addResRowDepth) {
        return this.moveElemToGroupV2(widgetState, addResRowDepth);
      }
    }
  };

  ungroupElemV2 = (widgetState = this.widgetState) => {
    const { activeRowDepth, editingElemId } = widgetState;
    if (!activeRowDepth || activeRowDepth.length === 0 || !editingElemId) {
      console.error('activeRowDepth is undefined');
      return;
    }
    const nextRowDepth = activeRowDepth.slice(0, -1);
    this.moveElemToGroupV2(widgetState, nextRowDepth);
    const targetRow = this.getRowByDepth(this.widgetState.activeRowDepth || []);
    if (
      targetRow &&
      targetRow.children?.length === 0 &&
      targetRow?.childrenIds?.length === 0
    ) {
      // 删除空Row
      this.deleteRowBatchV2([targetRow.id]);
    }
    return nextRowDepth;
  };

  /**
   * 复制元素到剪贴板
   */
  copyElementV2 = (elemId: string, widgetState = this.widgetState) => {
    if (!elemId) {
      console.error('No element ID provided');
      return false;
    }

    const layer = this.editorSDK?.getLayer(elemId);
    const link = this.editorSDK?.getLink(elemId);

    if (!layer || !link) {
      console.error('Element not found');
      return false;
    }

    try {
      const copyData = {
        type: 'grid_element',
        timestamp: Date.now(),
        data: {
          layer: deepClone(layer),
          link: deepClone(link),
        },
      };
      localStorage.setItem('grid_clipboard', JSON.stringify(copyData));
      console.log('Element copied to clipboard:', copyData);
      return true;
    } catch (error) {
      console.error('Failed to copy element:', error);
      return false;
    }
  };

  handleChangeRepeatList = (
    nextItemCount: number,
    widgetState = this.widgetState
  ) => {
    const { activeRowDepth } = widgetState;
    if (!activeRowDepth || activeRowDepth.length === 0) {
      console.error('activeRowDepth is undefined');
      return;
    }
    const currRow = this.getActiveRow(widgetState);
    if (!currRow) {
      return;
    }
    const targetRow = currRow.children?.[0];
    if (!targetRow) {
      console.log('targetRow is undefined');
      return;
    }
    const childrenCount = currRow.children?.length || 0;
    const rowDiff = nextItemCount - childrenCount;
    const columnCount =
      currRow.repeatColumnCount ||
      String(currRow.style?.gridTemplateColumns)?.split(' ')?.length ||
      1;
    if (rowDiff > 0) {
      // children的余数取模
      let targetIdx = 0;
      if (currRow.listReverse) {
        if (childrenCount) {
          targetIdx = childrenCount % 2;
        }
      }
      console.log('targetIdx', targetIdx);
      const duplicateRows = currRow.children?.[targetIdx];
      if (duplicateRows) {
        this.duplicateRowBatchV2([duplicateRows.id], {
          repeatCount: rowDiff,
          insertToParent: false,
        });
      }
      /** 备份 */
      // const duplicateRows = currRow.children?.slice(0, nextColCount);
      // const duplicateRowIds = duplicateRows?.map((row) => row.id);
      // if (duplicateRowIds) {
      //   duplicateRowBatchV2(duplicateRowIds, {
      //     repeatCount: Math.ceil(rowDiff / nextColCount),
      //     insertToParent: false,
      //   });
      // }
    } else {
      // 正确的做法是从后往前取 rowDiff 个
      const deleteRowIds = currRow.children
        ?.slice(-Math.abs(rowDiff))
        .map(row => row.id);
      if (deleteRowIds) {
        this.deleteRowBatchV2(deleteRowIds);
      }
    }
  };

  handleChangeTableView = (
    nextColumnCount: number,
    nextRowCount: number,
    widgetState = this.widgetState
  ) => {
    const { activeRowDepth } = widgetState;
    if (!activeRowDepth || activeRowDepth.length === 0) {
      console.error('activeRowDepth is undefined');
      return;
    }
    const currRow = this.getActiveRow(widgetState);
    if (!currRow) {
      return;
    }
    const children = deepClone(currRow.children || []);
    const currentChildrenCount = children.length;

    // 确保最小结构为1x1
    if (nextColumnCount < 1) nextColumnCount = 1;
    if (nextRowCount < 1) nextRowCount = 1;

    const targetTotalCount = nextColumnCount * nextRowCount;

    // 如果目标总数量为0，删除所有子元素
    if (targetTotalCount === 0) {
      if (currentChildrenCount > 0) {
        this.deleteRowBatchV2(children.map(child => child.id));
      }
      return;
    }

    // 如果当前没有子元素，需要创建初始元素
    if (currentChildrenCount === 0) {
      return;
    }

    // 推断当前的行列数
    const { currentColumnCount, currentRowCount } =
      this.inferCurrentTableLayout(currentChildrenCount, currRow);

    // 如果当前和目标相同，无需操作
    if (
      currentColumnCount === nextColumnCount &&
      currentRowCount === nextRowCount
    ) {
      return;
    }

    // 先处理列变化，再处理行变化
    let workingChildren = children;
    let workingColumnCount = currentColumnCount;

    // 处理列数变化
    if (currentColumnCount !== nextColumnCount) {
      workingChildren = this.handleColumnChange(
        workingChildren,
        currentColumnCount,
        currentRowCount,
        nextColumnCount
      );
      workingColumnCount = nextColumnCount;
    }

    // 处理行数变化
    if (currentRowCount !== nextRowCount) {
      workingChildren = this.handleRowChange(
        workingChildren,
        workingColumnCount,
        currentRowCount,
        nextRowCount
      );
    }
  };

  /**
   * 推断当前表格的行列布局
   */
  private inferCurrentTableLayout(
    totalCount: number,
    currRow?: any
  ): {
    currentColumnCount: number;
    currentRowCount: number;
  } {
    if (totalCount <= 1) {
      return { currentColumnCount: 1, currentRowCount: 1 };
    }

    // 优先从 currRow 获取实际的列数
    let currentColumnCount = 1;
    if (currRow) {
      currentColumnCount =
        currRow?.repeatColumnCount ||
        String(currRow?.style?.gridTemplateColumns)?.split(' ')?.length ||
        1;
    }

    const currentRowCount = Math.ceil(totalCount / currentColumnCount);

    return { currentColumnCount, currentRowCount };
  }

  /**
   * 处理列数变化
   */
  private handleColumnChange(
    children: GridRow[],
    currentColumnCount: number,
    currentRowCount: number,
    nextColumnCount: number
  ): GridRow[] {
    const columnDiff = nextColumnCount - currentColumnCount;

    if (columnDiff === 0) {
      return children;
    }

    if (columnDiff > 0) {
      // 增加列数：以最右边列为模板复制
      const rightmostColumnElements = this.getRightmostColumnElements(
        children,
        currentColumnCount,
        currentRowCount
      );

      if (rightmostColumnElements.length > 0) {
        // 为每一行复制最右边的元素，并插入到正确位置
        this.duplicateAndInsertColumns(
          rightmostColumnElements,
          columnDiff,
          currentColumnCount,
          currentRowCount
        );
      }
    } else {
      // 减少列数：删除最右边的列
      const rightmostColumnElements = this.getRightmostColumnElements(
        children,
        currentColumnCount,
        currentRowCount
      );
      const elementsToDelete = rightmostColumnElements.map(el => el.id);

      if (elementsToDelete.length > 0) {
        this.deleteRowBatchV2(elementsToDelete);
      }
    }

    return children; // 返回更新后的children（通过引用更新）
  }

  /**
   * 处理行数变化
   */
  private handleRowChange(
    children: any[],
    columnCount: number,
    currentRowCount: number,
    nextRowCount: number
  ): any[] {
    const rowDiff = nextRowCount - currentRowCount;

    if (rowDiff === 0) {
      return children;
    }

    if (rowDiff > 0) {
      // 增加行数：以最下边行为模板复制
      const bottomRowElements = this.getBottomRowElements(
        children,
        columnCount,
        currentRowCount
      );

      if (bottomRowElements.length > 0) {
        const elementsToDuplicate = bottomRowElements.map(el => el.id);
        this.duplicateRowBatchV2(elementsToDuplicate, {
          repeatCount: rowDiff,
          insertToParent: false,
        });
      }
    } else {
      // 减少行数：删除最下边的行
      const bottomRowElements = this.getBottomRowElements(
        children,
        columnCount,
        currentRowCount
      );
      const elementsToDelete = bottomRowElements.map(el => el.id);

      if (elementsToDelete.length > 0) {
        this.deleteRowBatchV2(elementsToDelete);
      }
    }

    return children; // 返回更新后的children（通过引用更新）
  }

  /**
   * 获取最右边列的元素
   */
  private getRightmostColumnElements(
    children: any[],
    columnCount: number,
    rowCount: number
  ): any[] {
    const rightmostColumnElements = [];

    for (let i = 0; i < rowCount; i++) {
      const rightmostIndex = (i + 1) * columnCount - 1;
      if (rightmostIndex < children.length && children[rightmostIndex]) {
        rightmostColumnElements.push(children[rightmostIndex]);
      }
    }

    return rightmostColumnElements;
  }

  /**
   * 获取最下边行的元素
   */
  private getBottomRowElements(
    children: any[],
    columnCount: number,
    rowCount: number
  ): any[] {
    const bottomRowStartIndex = (rowCount - 1) * columnCount;
    const bottomRowEndIndex = Math.min(
      bottomRowStartIndex + columnCount,
      children.length
    );

    return children.slice(bottomRowStartIndex, bottomRowEndIndex);
  }

  /**
   * 复制并插入新列到正确位置
   */
  private duplicateAndInsertColumns(
    templateElements: any[],
    columnDiff: number,
    currentColumnCount: number,
    currentRowCount: number
  ) {
    const { activeRowDepth } = this.widgetState;
    if (!activeRowDepth || activeRowDepth.length === 0) {
      console.error('activeRowDepth is undefined');
      return;
    }

    const currRow = this.getActiveRow(this.widgetState);
    if (!currRow) {
      return;
    }

    const nextGridsData = deepClone(this.gridsData);

    // 获取父级路径
    const insertPath = getPathByRowDepth(activeRowDepth);
    const parent = getByPath(nextGridsData, insertPath);

    if (!parent || !parent.children) {
      console.error('Parent row not found');
      return;
    }

    // 从后往前插入，避免位置计算问题
    for (let rowIndex = currentRowCount - 1; rowIndex >= 0; rowIndex--) {
      const templateElement = templateElements[rowIndex];
      if (!templateElement) continue;

      // 复制模板元素
      const duplicatedElement = this.duplicateRowRecursively(templateElement);

      // 计算插入位置：每行的末尾（当前行的最后一个元素之后）
      const insertIndex = (rowIndex + 1) * currentColumnCount;

      // 直接操作 nextGridsData 中的 children 数组
      parent.children.splice(insertIndex, 0, duplicatedElement);
      setByPath(nextGridsData, insertPath, parent);
    }

    // 提交变更
    this.commitChangeV2(nextGridsData);
  }

  /**
   * 从剪贴板粘贴数据，智能选择粘贴位置
   */
  pasteRowV2 = (
    widgetState = this.widgetState
  ): {
    // 如果复制的是元素，则返回元素的id，否则是空
    copiedElemId?: string;
    // 如果复制的是行，则返回行深度，否则是空
    copiedRowDepth?: number[];
  } => {
    const res: { copiedElemId?: string; copiedRowDepth?: number[] } = {
      copiedElemId: undefined,
      copiedRowDepth: widgetState.activeRowDepth,
    };
    try {
      const clipboardDataStr = localStorage.getItem('grid_clipboard');
      if (!clipboardDataStr) {
        console.log('No data in clipboard');
        return res;
      }

      const clipboardData = JSON.parse(clipboardDataStr);
      if (!clipboardData) {
        console.log('Invalid clipboard data');
        return res;
      }

      // 检查剪贴板数据是否过期（24小时）
      const now = Date.now();
      if (now - clipboardData.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('grid_clipboard');
        console.log('Clipboard data expired');
        return res;
      }

      const { type, data } = clipboardData;

      if (type === 'grid_element') {
        // 粘贴元素
        const copiedElemId = this.pasteElement(data, widgetState);
        if (copiedElemId) {
          res.copiedElemId = copiedElemId;
        }
      } else if (type === 'grid_row') {
        // 粘贴行
        const pastedRes = this.pasteRow(data, widgetState);
        if (pastedRes?.copiedRowDepth) {
          res.copiedRowDepth = pastedRes.copiedRowDepth;
        }
        if (pastedRes?.copiedElemId) {
          res.copiedElemId = pastedRes.copiedElemId;
        }
      } else {
        console.log('Unknown clipboard data type');
      }
    } catch (error) {
      console.error('Failed to paste data:', error);
    }
    return res;
  };

  /**
   * 粘贴元素
   */
  private pasteElement = (
    data: { layer: LayerElemItem; link: IPositionLink },
    widgetState = this.widgetState
  ) => {
    const { editingElemId, activeRowDepth } = widgetState;

    if (!activeRowDepth || activeRowDepth.length === 0) {
      console.error('No active row depth');
      return;
    }

    const nextGridsData = deepClone(this.gridsData);
    const activeRow = this.getActiveRow(widgetState, nextGridsData);

    if (!activeRow) {
      console.error('Active row not found');
      return;
    }

    // 创建新的元素
    const newLayer = deepClone(data.layer);
    const newElemId = random();
    newLayer.elemId = newElemId;

    // 添加新组件到编辑器
    const compId = this.editorSDK?.addComponent(
      newLayer,
      {
        x: 0,
        y: 0,
        visibility: false,
        lock: true,
        disabled: true,
      },
      false
    );

    if (!compId) {
      console.error('Failed to add component');
      return;
    }

    // 更新位置链接
    this.editorSDK?.setLinkBatch([
      {
        elemId: newElemId,
        nextContainerInfo: {
          ...data.link,
          x: data.link.x || 0,
          y: data.link.y || 0,
        },
      },
    ]);

    // 确保childrenIds数组存在
    if (!activeRow.childrenIds) {
      activeRow.childrenIds = [];
    }

    let insertIndex: number;

    if (editingElemId) {
      // 场景4：复制Element D，选中Row B的Element C，粘贴到Element C的下方
      const currentIndex = activeRow.childrenIds.indexOf(editingElemId);
      if (currentIndex !== -1) {
        insertIndex = currentIndex + 1;
      } else {
        insertIndex = activeRow.childrenIds.length;
      }
    } else {
      // 场景3：复制Element D，选中Row B时，粘贴到Row B的子元素的最后一个
      insertIndex = activeRow.childrenIds.length;
    }

    // 在指定位置插入新元素
    activeRow.childrenIds.splice(insertIndex, 0, newElemId);

    // 更新数据
    const setPath = getPathByRowDepth(activeRowDepth);
    setByPath(nextGridsData, setPath, activeRow);
    this.commitChangeV2(nextGridsData);

    return compId;
  };

  /**
   * 粘贴行
   */
  private pasteRow = (
    data: GetCopyRowCodeResult,
    widgetState = this.widgetState,
    replaceRow = false
  ): {
    // 如果复制的是元素，则返回元素的id，否则是空
    copiedElemId?: string;
    // 如果复制的是行，则返回行深度，否则是空
    copiedRowDepth?: number[];
  } => {
    const { editingElemId, activeRowDepth } = widgetState;
    const { row, rows: _rows, elemComps, positionLink } = data;
    const rows = row ? [row, ..._rows] : _rows;
    const newElemIds: string[] = [];

    const processChildren = (_targetRows: GridRow[]) => {
      const targetRows = deepClone(_targetRows);
      /** 批量复制元素 */
      for (let i = 0; i < targetRows.length; i++) {
        // 记录来源id
        targetRows[i].sourceRowId = targetRows[i].id;

        // 重新赋值
        targetRows[i].id = random();

        // 删除废弃属性
        delete targetRows[i].groupByRowId;
        delete targetRows[i].cmsSettingForThemePack2;

        /** 批量复制元素 */
        const batchAddElem = (layers: LayerElemItem[]) => {
          const newLayers = deepClone(layers);
          const nextPositionLink: Record<string, IPositionLink> = {};
          newLayers.forEach(layer => {
            const originId = layer.elemId;
            const newId = random();
            layer.elemId = newId;
            nextPositionLink[newId] = positionLink[originId];
          });
          this.editorSDK?.fullSDK.addComponentBatch(
            newLayers,
            nextPositionLink
          );
          return newLayers.map(i => i.elemId);
        };
        if (Array.isArray(targetRows[i].childrenIds)) {
          const layers = elemComps.filter(layer =>
            targetRows[i].childrenIds?.includes(layer.elemId)
          );
          const newIds = batchAddElem(layers);
          newElemIds.push(...newIds);
          targetRows[i].childrenIds = newIds;
        }

        const hasChildren =
          targetRows[i] &&
          targetRows[i].children &&
          !!targetRows[i].children?.length;

        // 递归处理更深层的子行
        if (hasChildren) {
          targetRows[i].children = processChildren(
            deepClone(targetRows[i]?.children) || []
          );
        }
      }
      return targetRows;
    };

    const newRows = processChildren(deepClone(convertV1ToV2(rows)));

    if (!newRows || newRows.length === 0) {
      return {
        copiedElemId: undefined,
        copiedRowDepth: undefined,
      };
    }

    const nextGridsData = deepClone(this.gridsData);
    if (editingElemId) {
      const activeRow = this.getActiveRow(widgetState, nextGridsData);

      if (!activeRow) {
        console.error('Active row not found');
        return {
          copiedElemId: undefined,
          copiedRowDepth: undefined,
        };
      }

      if (!activeRow.children) {
        activeRow.children = [];
      }
      // 添加到children数组的末尾（下方）
      activeRow.children.push(...newRows);

      // 重要：需要将修改后的activeRow更新到nextGridsData中
      if (activeRowDepth && activeRowDepth.length > 0) {
        const setPath = getPathByRowDepth(activeRowDepth);
        setByPath(nextGridsData, setPath, activeRow);
        // 已将修改后的activeRow更新到nextGridsData中
      } else {
        console.error('activeRowDepth无效，无法更新数据');
      }
    } else {
      if (activeRowDepth && activeRowDepth.length > 0) {
        const parentDepth = activeRowDepth.slice(0, -1);

        if (parentDepth.length > 0) {
          // 有父级的情况
          console.log('有父级的情况，更新GridsData下的Row数据');
          const parentPath = getPathByRowDepth(parentDepth);
          const parentRow = getByPath(nextGridsData, parentPath);

          if (parentRow && parentRow.children) {
            const currentIndex = activeRowDepth[activeRowDepth.length - 1];
            // 在当前行下方插入新行
            parentRow.children.splice(
              replaceRow ? currentIndex : currentIndex + 1,
              replaceRow ? 1 : 0,
              ...newRows
            );
            // 更新父级对象到nextGridsData中
            setByPath(nextGridsData, parentPath, parentRow);
          } else {
            console.log('有父级的情况else');
          }
        } else {
          // 父级是根级别的情况
          console.log('父级是根级别的情况，直接更新GridsData');
          const currentIndex = activeRowDepth[0];
          nextGridsData.splice(
            replaceRow ? currentIndex : currentIndex + 1,
            replaceRow ? 1 : 0,
            ...newRows
          );
        }
      } else {
        console.log('no activeRowDepth');
        // 如果没有activeRowDepth，添加到根级别
        nextGridsData.push(...newRows);
      }
    }

    this.commitChangeV2(nextGridsData);

    const lastDepth = (activeRowDepth?.slice(-1)[0] || 0) + 1;
    const nextRowDepth = activeRowDepth?.slice(0, -1) || [];

    return {
      copiedElemId: newElemIds[0],
      copiedRowDepth: [...nextRowDepth, lastDepth],
    };
  };

  createComponent2 = (widgetState = this.widgetState, groupId?: string) => {
    const { activeRowDepth } = widgetState;
    const currRow = this.getRowByDepth(activeRowDepth || []);
    if (!currRow) {
      console.log('找不到row');
      return;
    }

    /**
     * 当Grid是来源于画布的复制Grid时，使用被复制的Grid的componentGroupRefId和sourceComponentId
     * 否则使用随机生成的componentGroupRefId和sourceComponentId
     */
    const componentGroupId = groupId || currRow.componentGroupRefId || random();
    const componentId = currRow.sourceComponentId || random();

    this.setRowAttrsV2(
      {
        componentGroupRefId: componentGroupId,
        sourceComponentId: componentId,
      },
      widgetState
    );

    const copyRowCode = this.getCopyRowCodeWithGroup(widgetState);

    return {
      componentGroupId,
      data: {
        compId: componentId,
        compSourceRowId: currRow.id,
        compName: currRow.name || '未命名',
        data: copyRowCode,
      } as ComponentData,
    };
  };

  ublinkComponent = (componentId: string) => {
    const nextGridsData = deepClone(this.gridsData);
    for (let i = 0; i < nextGridsData.length; i++) {
      const row = nextGridsData[i];
      if (row.sourceComponentId === componentId) {
        delete nextGridsData[i].sourceComponentId;
      }
      if (row.children) {
        for (let j = 0; j < row.children.length; j++) {
          const child = row.children[j];
          if (child.sourceComponentId === componentId) {
            delete nextGridsData[i].children?.[j]?.sourceComponentId;
          }
        }
      }
    }
    this.commitChangeV2(nextGridsData);
  };
  ublinkComponentByGroup = (componentGroupId: string) => {
    const nextGridsData = deepClone(this.gridsData);
    for (let i = 0; i < nextGridsData.length; i++) {
      const row = nextGridsData[i];
      if (row.componentGroupRefId === componentGroupId) {
        delete nextGridsData[i].componentGroupRefId;
      }
      if (row.children) {
        for (let j = 0; j < row.children.length; j++) {
          const child = row.children[j];
          if (child.componentGroupRefId === componentGroupId) {
            delete nextGridsData[i].children?.[j]?.componentGroupRefId;
          }
        }
      }
    }
    this.commitChangeV2(nextGridsData);
  };
}

export const getCopyRowCodeWithGroupPure = ({
  activeRowDepth,
  gridsData,
  getLayer,
  getLink,
}: {
  activeRowDepth: number[];
  gridsData: GridProps['gridsData'];
  getLayer: (id: string) => LayerElemItem | undefined;
  getLink: (id: string) => IPositionLink | undefined;
}): CopyRowData | undefined => {
  if (!activeRowDepth || activeRowDepth.length === 0) {
    console.error('activeRowDepth is undefined');
    return;
  }
  const getRowByDepth = (rowDepth: number[]): GridRow | undefined => {
    // 如果没有activeRowDepth，返回undefined
    if (!rowDepth || rowDepth.length === 0) {
      return undefined;
    }

    // 构建路径数组，例如：[0, 'children', 1, 'children', 2]
    const path = getPathByRowDepth(rowDepth);

    // 使用getByPath获取目标GridRow
    const targetRow = getByPath(gridsData, path);
    return deepClone(targetRow);
  };
  const path = getPathByRowDepth(activeRowDepth);
  const activeRow = getByPath(gridsData, path);
  if (!activeRow) {
    console.error('Active row not found');
    return;
  }

  const layers: LayerElemItem[] = [];
  const positionLink: PositionLinkMap = {};

  // 递归收集行及其子行的组件信息
  const collectRowComponents = (row: GridRow) => {
    // 收集行级别的组件
    if (row.childrenIds) {
      row.childrenIds.forEach(id => {
        const layer = getLayer(id);
        const link = getLink(id);
        if (layer && link) {
          layers.push(layer);
          positionLink[layer.elemId] = link;
        }
      });
    }

    // 递归处理子行（v2 结构）
    if (row.children && row.children.length > 0) {
      row.children.forEach(child => collectRowComponents(child));
    }
  };

  // 根据 activeRowDepth 获取完整的行结构
  const getCompleteRowStructure = (): GridRow[] => {
    if (activeRowDepth.length === 0) {
      // 根级别，返回整个 gridsData
      return deepClone([...gridsData]);
    }

    // 有层级的情况，需要找到父级行
    const parentDepth = activeRowDepth.slice(0, -1);
    const currentIndex = activeRowDepth[activeRowDepth.length - 1];

    if (parentDepth.length === 0) {
      // 父级是根级别
      const parentRow = gridsData[currentIndex];
      if (parentRow && parentRow.children) {
        return deepClone([parentRow]);
      }
      return [deepClone(activeRow)];
    } else {
      // 父级有层级，需要递归查找
      const parentRow = getRowByDepth(parentDepth);
      if (parentRow && parentRow.children) {
        const targetRow = parentRow.children[currentIndex];
        if (targetRow) {
          return deepClone([targetRow]);
        }
      }
      return [deepClone(activeRow)];
    }
  };

  const rows = getCompleteRowStructure();
  if (!rows || rows.length === 0) return;

  // 收集所有行的组件信息
  rows.forEach(row => {
    collectRowComponents(row);
  });

  const copyCode = {
    rows,
    elemComps: layers,
    positionLink,
  } as CopyRowData;
  return copyCode;
};
