import { mergeDeep, random } from '@mk/utils';
import {
  AddComponentParams,
  EditorSDK,
  IPositionLink,
  LayerElemItem,
  PositionLinkMap,
} from '@mk/works-store/types';
import { GridCell, GridProps, GridRow, GridState } from '../../shared';
import { cleanGridProps, deepClone } from '../../shared/utils';
import { BlockGroup, getGroupRows, getStableBlockGroups } from './utils';

export interface OperatorProps {
  /** v1 api 数据，二维数组 */
  cellsMap: GridProps['cellsMap'];
  editorSDK?: EditorSDK<GridProps, GridState>;
  widgetState: GridState;
}
const filterElementRef: readonly string[] = [
  'MkHuiZhi',
  'MkBulletScreen_v2',
  'MkMapV3',
  'MkGift',
] as const;

export interface CopyRowData {
  row: GridRow;
  rows: GridRow[];
  elemComps: LayerElemItem[];
  positionLink: Record<string, IPositionLink>;
  name?: string;
}

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

export default class GridOperator {
  cellsMap!: GridProps['cellsMap'];
  editorSDK?: EditorSDK<GridProps, GridState>;
  widgetState!: GridState;
  rowsGroup!: BlockGroup[];

  constructor(props?: OperatorProps) {
    if (props) {
      const { cellsMap, rowsGroup } = getGroupRows(
        cleanGridProps(deepClone(props.cellsMap))
      );
      this.cellsMap = cellsMap;
      this.rowsGroup = rowsGroup;
      this.editorSDK = props.editorSDK;
      this.widgetState = props.widgetState;
    } else {
      // console.log('GridOperatorV1 未传入值');
    }
  }

  update(props: Partial<OperatorProps>) {
    if (props.cellsMap) {
      const { cellsMap, rowsGroup } = getGroupRows(props.cellsMap);
      this.cellsMap = cellsMap;
      this.rowsGroup = rowsGroup;
    }
    if (props.widgetState) {
      this.widgetState = props.widgetState;
    }
    if (props.editorSDK) {
      this.editorSDK = props.editorSDK;
    }
  }

  commitChange = (nextCells: GridProps['cellsMap']) => {
    this.editorSDK?.onFormValueChange({
      cellsMap: nextCells,
    });
    this.update({
      cellsMap: nextCells,
      widgetState: this.widgetState,
    });

    return nextCells;
  };

  /**
   * --------------
   * v1 api
   */

  deleteComp = (widgetState = this.widgetState) => {
    const { editorSDK, cellsMap } = this;
    const { activeRowId, activeCellId, editingElemId } = widgetState;
    if (!editingElemId) {
      console.log('没有选择格子');
      return;
    }
    let nextCells = deepClone([...cellsMap]);
    const activeRowIdx = nextCells.findIndex(row => row.id === activeRowId);
    const activeCellIdx = nextCells[activeRowIdx]?.cells?.findIndex(
      cell => cell.id === activeCellId
    );
    console.log('activeRowIdx', activeRowIdx);
    console.log('activeCellIdx', activeCellIdx);
    console.log('editingElemId', editingElemId);
    if (activeCellIdx < 0 && activeRowIdx >= 0) {
      console.log('nextCells[activeRowIdx]', nextCells[activeRowIdx]);
      // 删除row中的元素
      const childIdx =
        nextCells[activeRowIdx].childrenIds?.indexOf(editingElemId);
      console.log('childIdx', childIdx);
      if (typeof childIdx === 'undefined' || childIdx === -1) {
        console.log('没有找到元素');
        return;
      }
      nextCells[activeRowIdx].childrenIds?.splice(childIdx, 1);
      editorSDK?.deleteCompEntity(editingElemId);
      this.commitChange(nextCells);
      return;
    } else {
      const childIdx = nextCells
        .find(row => row.id === activeRowId)
        ?.cells.find(cell => cell.id === activeCellId)
        ?.childrenIds?.indexOf(editingElemId);
      if (typeof childIdx === 'undefined' || childIdx === -1) {
        console.log('nextCells', nextCells);
        console.log('没有找到元素');
        return;
      }
      nextCells[activeRowIdx].cells[activeCellIdx].childrenIds?.splice(
        childIdx,
        1
      );
      editorSDK?.deleteCompEntity(editingElemId);

      if (
        nextCells[activeRowIdx].cells[activeCellIdx].childrenIds?.length === 0
      ) {
        // 如果目标所在的cell没有元素，则直接删除cell
        nextCells = deepClone([...cellsMap]);
        nextCells[activeRowIdx].cells.splice(activeCellIdx, 1);
        editorSDK?.changeWidgetState({
          editingElemId: undefined,
          activeCellId: undefined,
          activeRowId: undefined,
        });
      }
      this.commitChange(nextCells);
    }
  };

  moveElem = (direction: 'up' | 'down', widgetState = this.widgetState) => {
    const { cellsMap, editorSDK } = this;
    const { activeRowId, activeCellId, editingElemId } = widgetState;
    if (!editingElemId) {
      console.error('editingElemId is undefined');
      return;
    }
    const nextCells = deepClone([...cellsMap]);
    const activeRowIdx = nextCells.findIndex(row => row.id === activeRowId);
    const activeCellIdx = nextCells[activeRowIdx].cells.findIndex(
      cell => cell.id === activeCellId
    );
    if (activeCellIdx < 0 && activeRowIdx >= 0) {
      const childIdx =
        nextCells[activeRowIdx].childrenIds?.indexOf(editingElemId);
      if (typeof childIdx === 'undefined' || childIdx === -1) {
        console.log('没有找到元素');
        return;
      }
      if (!nextCells[activeRowIdx].childrenIds) {
        nextCells[activeRowIdx].childrenIds = [];
      }
      const nextIdx =
        direction === 'up'
          ? Math.max(childIdx - 1, 0)
          : Math.min(
              childIdx + 1,
              (nextCells[activeRowIdx].childrenIds?.length || 0) - 1
            );
      const nextVal = nextCells[activeRowIdx].childrenIds?.[nextIdx];
      nextCells[activeRowIdx].childrenIds[nextIdx] = editingElemId;
      nextCells[activeRowIdx].childrenIds[childIdx] = nextVal;
      this.commitChange(nextCells);
      return nextCells;
    } else {
      if (!nextCells[activeRowIdx].cells[activeCellIdx].style) {
        nextCells[activeRowIdx].cells[activeCellIdx].style = {};
      }
      const cellIds = [
        ...(nextCells[activeRowIdx].cells[activeCellIdx].childrenIds || []),
      ];
      const currIdx = cellIds.indexOf(editingElemId);
      // 与上一个元素交换位置
      const nextIdx =
        direction === 'up'
          ? Math.max(currIdx - 1, 0)
          : Math.min(currIdx + 1, cellIds.length - 1);
      const nextVal = cellIds[nextIdx];
      cellIds[nextIdx] = cellIds[currIdx];
      cellIds[currIdx] = nextVal;
      nextCells[activeRowIdx].cells[activeCellIdx].childrenIds = cellIds;

      this.commitChange(nextCells);

      return nextCells;
    }
  };

  // 新增：根据索引直接移动元素到指定位置
  moveElemByIndex = (
    elemId: string,
    targetIndex: number,
    widgetState = this.widgetState
  ) => {
    const { cellsMap, editorSDK } = this;
    const { activeRowId, activeCellId } = widgetState;

    if (!activeRowId) {
      console.error('activeRowId is undefined');
      return;
    }

    const nextCells = deepClone([...cellsMap]);
    const activeRowIdx = nextCells.findIndex(row => row.id === activeRowId);

    if (activeRowIdx === -1) {
      console.error('Active row not found');
      return;
    }

    // 处理行级别的元素
    const activeCellIdx = nextCells[activeRowIdx].cells.findIndex(
      cell => cell.id === activeCellId
    );

    if (!activeCellId || activeCellIdx < 0) {
      if (!nextCells[activeRowIdx].childrenIds) {
        nextCells[activeRowIdx].childrenIds = [];
      }

      const currentIndex = nextCells[activeRowIdx].childrenIds.indexOf(elemId);
      if (currentIndex === -1) {
        console.error('Element not found in row children');
        return;
      }

      // 确保目标索引在有效范围内
      const maxIndex = nextCells[activeRowIdx].childrenIds.length - 1;
      const safeTargetIndex = Math.max(0, Math.min(targetIndex, maxIndex));

      if (currentIndex === safeTargetIndex) {
        console.log('Element already at target position');
        return nextCells;
      }

      // 使用 sortArrItem 函数进行一步操作
      nextCells[activeRowIdx].childrenIds = sortArrItem(
        nextCells[activeRowIdx].childrenIds,
        currentIndex,
        safeTargetIndex
      );

      console.log(
        `Moved element ${elemId} from index ${currentIndex} to ${safeTargetIndex}`
      );
      this.commitChange(nextCells);
      return nextCells;
    } else {
      // 处理单元格内的元素
      const activeCellIdx = nextCells[activeRowIdx].cells.findIndex(
        cell => cell.id === activeCellId
      );

      if (activeCellIdx === -1) {
        console.error('Active cell not found');
        return;
      }

      if (!nextCells[activeRowIdx].cells[activeCellIdx].childrenIds) {
        nextCells[activeRowIdx].cells[activeCellIdx].childrenIds = [];
      }

      const cellIds = nextCells[activeRowIdx].cells[activeCellIdx].childrenIds;
      const currentIndex = cellIds.indexOf(elemId);

      if (currentIndex === -1) {
        console.error('Element not found in cell children');
        return;
      }

      // 确保目标索引在有效范围内
      const maxIndex = cellIds.length - 1;
      const safeTargetIndex = Math.max(0, Math.min(targetIndex, maxIndex));

      if (currentIndex === safeTargetIndex) {
        console.log('Element already at target position');
        return nextCells;
      }

      // 从原位置移除元素
      const [movedElem] = cellIds.splice(currentIndex, 1);

      // 插入到目标位置
      cellIds.splice(safeTargetIndex, 0, movedElem);

      console.log(
        `Moved element ${elemId} from index ${currentIndex} to ${safeTargetIndex}`
      );
      this.commitChange(nextCells);
      return nextCells;
    }
  };

  duplicateElem = (widgetState = this.widgetState) => {
    const { cellsMap, editorSDK } = this;
    const { activeRowId, activeCellId, editingElemId } = widgetState;
    console.log('widgetState', widgetState);
    if (!editingElemId) {
      console.error(
        'activeRowId or activeCellId or editingElemId is undefined'
      );
      return;
    }
    const nextCells = deepClone([...cellsMap]);
    const activeRowIdx = nextCells.findIndex(row => row.id === activeRowId);
    const activeCellIdx = nextCells[activeRowIdx].cells.findIndex(
      cell => cell.id === activeCellId
    );
    const duplicateCompIds = editorSDK?.duplicateComp(
      editingElemId || '',
      false
    );
    const nextCompId = Array.isArray(duplicateCompIds)
      ? duplicateCompIds
      : [duplicateCompIds || ''];
    if (activeRowIdx >= 0 && activeCellIdx < 0) {
      const newRow = deepClone(nextCells[activeRowIdx]);
      if (!newRow.childrenIds) {
        newRow.childrenIds = [...nextCompId];
      } else {
        const currIdx = newRow.childrenIds.indexOf(editingElemId);
        newRow.childrenIds.splice(currIdx + 1, 0, ...nextCompId);
      }
      nextCells[activeRowIdx] = newRow;
      this.commitChange(nextCells);
      return nextCompId[0];
    } else {
      const newCell = deepClone(nextCells[activeRowIdx].cells[activeCellIdx]);

      if (!newCell.childrenIds) return;

      const currIdx = newCell.childrenIds.indexOf(editingElemId);
      newCell.childrenIds.splice(currIdx + 1, 0, ...nextCompId);
      nextCells[activeRowIdx].cells[activeCellIdx] = newCell;
      this.commitChange(nextCells);

      return nextCompId;
    }
  };

  moveCell = (direction: 'up' | 'down', widgetState = this.widgetState) => {
    const { cellsMap, editorSDK } = this;
    const { activeRowId, activeCellId } = widgetState;
    if (!activeRowId || !activeCellId) {
      return;
    }

    const nextCells = deepClone([...cellsMap]);
    const activeRowIdx = nextCells.findIndex(row => row.id === activeRowId);
    const activeCellIdx = nextCells[activeRowIdx].cells.findIndex(
      cell => cell.id === activeCellId
    );
    if (!nextCells[activeRowIdx].cells[activeCellIdx].style) {
      nextCells[activeRowIdx].cells[activeCellIdx].style = {};
    }
    // 左移
    const currIdx = nextCells[activeRowIdx].cells.findIndex(
      i => i === nextCells[activeRowIdx].cells[activeCellIdx]
    );
    const nextIdx =
      direction === 'up'
        ? Math.max(currIdx - 1, 0)
        : Math.min(currIdx + 1, nextCells[activeRowIdx].cells.length - 1);
    const nextVal = nextCells[activeRowIdx].cells[nextIdx];
    nextCells[activeRowIdx].cells[nextIdx] =
      nextCells[activeRowIdx].cells[activeCellIdx];
    nextCells[activeRowIdx].cells[activeCellIdx] = nextVal;

    this.commitChange(nextCells);
  };

  // 新增：根据索引直接移动单元格到指定位置
  moveCellByIndex = (
    cellId: string,
    targetIndex: number,
    widgetState = this.widgetState
  ) => {
    const { cellsMap, editorSDK } = this;
    const { activeRowId } = widgetState;

    if (!activeRowId) {
      console.error('activeRowId is undefined');
      return;
    }

    const nextCells = deepClone([...cellsMap]);
    const activeRowIdx = nextCells.findIndex(row => row.id === activeRowId);

    if (activeRowIdx === -1) {
      console.error('Active row not found');
      return;
    }

    const cells = nextCells[activeRowIdx].cells;
    const currentIndex = cells.findIndex(cell => cell.id === cellId);

    if (currentIndex === -1) {
      console.error('Cell not found');
      return;
    }

    // 确保目标索引在有效范围内
    const maxIndex = cells.length - 1;
    const safeTargetIndex = Math.max(0, Math.min(targetIndex, maxIndex));

    if (currentIndex === safeTargetIndex) {
      console.log('Cell already at target position');
      return nextCells;
    }

    // 使用 sortArrItem 函数进行一步操作
    const newCells = sortArrItem(cells, currentIndex, safeTargetIndex);
    cells.splice(0, cells.length, ...newCells);

    console.log(
      `Moved cell ${cellId} from index ${currentIndex} to ${safeTargetIndex}`
    );
    this.commitChange(nextCells);
    return nextCells;
  };

  getDuplicateCellData = (widgetState = this.widgetState) => {
    const { cellsMap, editorSDK } = this;
    const { activeRowId, activeCellId } = widgetState;
    if (!activeRowId || !activeCellId) {
      console.error('activeRowId or activeCellId is undefined');
      return;
    }
    const nextCells = deepClone([...cellsMap]);
    const activeRowIdx = nextCells.findIndex(row => row.id === activeRowId);
    const activeCellIdx = nextCells[activeRowIdx].cells.findIndex(
      cell => cell.id === activeCellId
    );
    const newCell = deepClone(nextCells[activeRowIdx].cells[activeCellIdx]);
    const duplicateCompIds = editorSDK?.duplicateComp(
      newCell.childrenIds || '',
      false
    );
    const nextIds = Array.isArray(duplicateCompIds)
      ? duplicateCompIds
      : [duplicateCompIds || ''];
    newCell.id = random();
    newCell.childrenIds = nextIds;
    return newCell;
  };

  duplicateCell = (widgetState = this.widgetState) => {
    const { cellsMap } = this;
    const { activeRowId, activeCellId } = widgetState;
    if (!activeRowId || !activeCellId) {
      return;
    }

    const nextCells = deepClone([...cellsMap]);
    const newCell = this.getDuplicateCellData();
    if (!newCell) {
      console.error('newCell is undefined');
      return;
    }
    const activeRowIdx = nextCells.findIndex(row => row.id === activeRowId);
    const activeCellIdx = nextCells[activeRowIdx].cells.findIndex(
      cell => cell.id === activeCellId
    );
    nextCells[activeRowIdx].cells.splice(activeCellIdx + 1, 0, newCell);
    this.commitChange(nextCells);
  };

  duplicateCellBatch = (
    targetCells: GridCell[],
    count: number,
    widgetState = this.widgetState
  ) => {
    const { cellsMap, editorSDK } = this;
    const { activeRowId } = widgetState;
    if (!activeRowId || !targetCells.length || count <= 0) {
      console.log('first', activeRowId, targetCells, count);
      console.error(
        'activeRowId or targetCellId is undefined, or count is invalid'
      );
      return;
    }

    const nextCells = deepClone([...cellsMap]);
    const activeRowIdx = nextCells.findIndex(row => row.id === activeRowId);

    const newCells: GridCell[] = [];
    const lastTargetCell = targetCells[targetCells.length - 1];
    const lastTargetCellIdx = nextCells[activeRowIdx].cells.findIndex(
      cell => cell.id === lastTargetCell.id
    );

    // 批量复制 cell
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < targetCells.length; j++) {
        const newCell = deepClone(targetCells[j]);
        const duplicateCompIds = editorSDK?.duplicateComp(
          newCell.childrenIds || '',
          false
        );
        const nextIds = Array.isArray(duplicateCompIds)
          ? duplicateCompIds
          : [duplicateCompIds || ''];

        newCell.id = random();
        newCell.childrenIds = nextIds;
        newCells.push(newCell);
      }
    }

    nextCells[activeRowIdx].cells.splice(lastTargetCellIdx + 1, 0, ...newCells);

    this.commitChange(nextCells);

    return newCells.map(cell => cell.id);
  };

  deleteCellBatch = (
    deleteCellIds: string[],
    widgetState = this.widgetState
  ) => {
    const { cellsMap, editorSDK } = this;
    const { activeRowId } = widgetState;
    if (typeof activeRowId === 'undefined') {
      console.error('activeRowId is undefined, or count is invalid');
      return;
    }

    const nextCells = deepClone([...cellsMap]);
    const activeRowIdx = nextCells.findIndex(row => row.id === activeRowId);
    const cellsLen = nextCells[activeRowIdx].cells.length;

    if (cellsLen - deleteCellIds.length <= 0) {
      console.error('No cells available to delete');
      return;
    }

    // 批量删除 cell
    const deletedCells = nextCells[activeRowIdx].cells.filter(cell =>
      deleteCellIds.includes(cell.id)
    );
    nextCells[activeRowIdx].cells = nextCells[activeRowIdx].cells.filter(
      cell => !deleteCellIds.includes(cell.id)
    );

    this.commitChange(nextCells);

    // 删除对应的组件实体
    const deleteIds: string[] = [];
    deletedCells.forEach(cell => {
      if (cell.childrenIds) {
        deleteIds.push(...cell.childrenIds);
      }
    });

    if (deleteIds.length > 0) {
      editorSDK?.deleteCompEntity(deleteIds);
    }

    return deletedCells.map(cell => cell.id);
  };

  changeCellAttrs = (
    attrs: Partial<GridCell>,
    widgetState = this.widgetState
  ) => {
    const { cellsMap, editorSDK } = this;
    const { activeRowId, activeCellId } = widgetState;
    if (!activeRowId || !activeCellId) {
      return;
    }

    const nextCells = deepClone([...cellsMap]);
    const activeRowIdx = nextCells.findIndex(row => row.id === activeRowId);
    const activeCellIdx = nextCells[activeRowIdx].cells.findIndex(
      cell => cell.id === activeCellId
    );
    const nextCell = nextCells[activeRowIdx].cells[activeCellIdx];
    Object.assign(nextCell, attrs);
    this.commitChange(nextCells);
  };

  changeRowAttrs = (
    attrs: Partial<GridRow>,
    widgetState = this.widgetState
  ) => {
    const { cellsMap, editorSDK } = this;
    const { activeRowId } = widgetState;
    if (typeof activeRowId === 'undefined') {
      console.log('没有选择的row');
      return;
    }

    const nextCells = deepClone([...cellsMap]);
    const activeRowIdx = nextCells.findIndex(row => row.id === activeRowId);
    nextCells[activeRowIdx] = mergeDeep(
      nextCells[activeRowIdx],
      attrs
    ) as GridRow;
    this.commitChange(nextCells);
  };

  deleteCell = (widgetState = this.widgetState) => {
    const { cellsMap, editorSDK } = this;
    const { activeRowId, activeCellId } = widgetState;
    if (
      typeof activeRowId === 'undefined' ||
      typeof activeCellId === 'undefined'
    )
      return;

    const nextCells = deepClone([...cellsMap]);
    const activeRowIdx = nextCells.findIndex(row => row.id === activeRowId);
    const activeCellIdx = nextCells[activeRowIdx].cells.findIndex(
      cell => cell.id === activeCellId
    );
    const deletedCol = nextCells[activeRowIdx].cells.splice(activeCellIdx, 1);
    this.commitChange(nextCells);
    const deleteIds: string[] = [];
    deletedCol.forEach(i => {
      if (i.childrenIds) {
        deleteIds.push(...i.childrenIds);
      }
    });

    editorSDK?.deleteCompEntity(deleteIds);
  };

  moveRow = (direction: 'up' | 'down', widgetState = this.widgetState) => {
    const { cellsMap, editorSDK } = this;
    const { activeRowId } = widgetState;
    if (typeof activeRowId === 'undefined') return;

    const nextCells = deepClone([...cellsMap]);

    // 使用新的稳定分组数据结构
    const blockGroups = getStableBlockGroups(nextCells);

    // 找到当前行所在的 block
    const currentBlock = blockGroups.find(block =>
      block.rowIds.includes(activeRowId)
    );
    if (!currentBlock) {
      console.error('Current row not found in any block');
      return;
    }

    // 检查当前行是否是 block 的根节点
    const isRootNode = currentBlock.rootRowId === activeRowId;

    if (isRootNode) {
      // 移动整个 block
      const updatedCells = this.moveBlock(
        nextCells,
        currentBlock,
        direction,
        blockGroups
      );
      if (updatedCells) {
        this.commitChange(updatedCells);
      }
    } else {
      // 在 block 内移动单个 row
      const updatedCells = this.moveRowWithinBlock(
        nextCells,
        activeRowId,
        currentBlock,
        direction
      );
      if (updatedCells) {
        this.commitChange(updatedCells);
      }
    }
  };

  // 根据索引直接移动行到指定位置，支持 block 分组处理
  moveRowByIndex = (rowId: string, targetIndex: number, toBlockId?: string) => {
    const { cellsMap } = this;

    const nextCells = deepClone([...cellsMap]);
    const currentIndex = nextCells.findIndex(row => row.id === rowId);
    console.log('currentIndex', currentIndex);

    if (currentIndex === -1) {
      console.error('Row not found');
      return;
    }

    if (toBlockId) {
      nextCells[currentIndex].groupByRowId = toBlockId;
    }

    // 确保目标索引在有效范围内
    const maxIndex = nextCells.length - 1;
    const safeTargetIndex = Math.max(0, Math.min(targetIndex, maxIndex));

    if (currentIndex === safeTargetIndex) {
      console.log('Row already at target position');
      return nextCells;
    }

    const newCells = sortArrItem(nextCells, currentIndex, safeTargetIndex);
    nextCells.splice(0, nextCells.length, ...newCells);

    console.log(
      `Moved row ${rowId} from index ${currentIndex} to ${safeTargetIndex}`
    );
    this.commitChange(nextCells);
    return nextCells;
  };

  // 在 block 内移动单个 row
  moveRowWithinBlock = (
    cells: GridRow[],
    activeRowId: string,
    block: BlockGroup,
    direction: 'up' | 'down'
  ): GridRow[] | null => {
    const nextCells = deepClone(cells);

    // 找到当前行在 block 中的索引
    const blockRowIndex = block.rowIds.indexOf(activeRowId);
    if (blockRowIndex === -1) return null;

    // 计算目标索引，确保不超出 block 边界
    const targetBlockIndex =
      direction === 'up'
        ? Math.max(blockRowIndex - 1, 0)
        : Math.min(blockRowIndex + 1, block.rowIds.length - 1);

    // 如果目标位置相同，不需要移动
    if (targetBlockIndex === blockRowIndex) return nextCells;

    // 找到当前行和目标行在 cells 中的实际索引
    const currentRowIndex = nextCells.findIndex(row => row.id === activeRowId);
    const targetRowId = block.rowIds[targetBlockIndex];
    const targetRowIndex = nextCells.findIndex(row => row.id === targetRowId);

    if (currentRowIndex === -1 || targetRowIndex === -1) return null;

    // 交换位置
    const temp = nextCells[currentRowIndex];
    nextCells[currentRowIndex] = nextCells[targetRowIndex];
    nextCells[targetRowIndex] = temp;

    return nextCells;
  };

  // 在 block 内根据目标索引移动单个 row
  moveRowWithinBlockByIndex = (
    cells: GridRow[],
    activeRowId: string,
    block: BlockGroup,
    targetIndex: number
  ): GridRow[] | null => {
    const nextCells = deepClone(cells);

    // 找到当前行在 cells 中的实际索引
    const currentRowIndex = nextCells.findIndex(row => row.id === activeRowId);
    if (currentRowIndex === -1) return null;

    // 确保目标索引在有效范围内
    const maxIndex = nextCells.length - 1;
    const safeTargetIndex = Math.max(0, Math.min(targetIndex, maxIndex));

    if (currentRowIndex === safeTargetIndex) return nextCells;

    // 先移动行到目标位置
    const newCells = sortArrItem(nextCells, currentRowIndex, safeTargetIndex);
    nextCells.splice(0, nextCells.length, ...newCells);

    // 重新计算 block 分组以获取最新的分组信息
    const updatedBlockGroups = getStableBlockGroups(nextCells);

    // 检查目标位置是否在同一个 block 内
    const targetRow = nextCells[safeTargetIndex];
    const isTargetInSameBlock = block.rowIds.includes(targetRow.id);

    if (!isTargetInSameBlock) {
      // 跨 block 移动，需要更新 groupByRowId
      const targetBlock = updatedBlockGroups.find(b =>
        b.rowIds.includes(targetRow.id)
      );

      if (targetBlock) {
        // 更新当前行的 groupByRowId 为目标 block 的根节点
        const updatedRowIndex = nextCells.findIndex(
          row => row.id === activeRowId
        );
        if (updatedRowIndex !== -1) {
          nextCells[updatedRowIndex].groupByRowId = targetBlock.rootRowId;
        }
      }
    }

    return nextCells;
  };

  // 根据目标索引移动整个 block
  moveBlockByIndex = (
    cells: GridRow[],
    block: BlockGroup,
    targetIndex: number,
    blockGroups: BlockGroup[]
  ): GridRow[] | null => {
    const nextCells = deepClone(cells);

    // 找到当前 block 中所有行在 cells 中的索引
    const currentBlockRowIndices = block.rowIds
      .map(rowId => nextCells.findIndex(row => row.id === rowId))
      .filter(index => index !== -1)
      .sort((a, b) => a - b);

    if (currentBlockRowIndices.length === 0) return null;

    // 确保目标索引在有效范围内
    const maxIndex = nextCells.length - 1;
    const safeTargetIndex = Math.max(0, Math.min(targetIndex, maxIndex));

    // 计算当前 block 的起始和结束索引
    const currentStartIndex = Math.min(...currentBlockRowIndices);
    const currentEndIndex = Math.max(...currentBlockRowIndices);

    // 如果目标位置在当前 block 范围内，不需要移动
    if (
      safeTargetIndex >= currentStartIndex &&
      safeTargetIndex <= currentEndIndex
    ) {
      return nextCells;
    }

    // 提取当前 block 的所有行
    const currentBlockRows: GridRow[] = [];
    currentBlockRowIndices.forEach(index => {
      currentBlockRows.push(nextCells[index]);
    });

    // 从原位置删除当前 block 的行（从后往前删除，避免索引变化）
    const indicesToRemove = [...currentBlockRowIndices].sort((a, b) => b - a);
    indicesToRemove.forEach(index => {
      nextCells.splice(index, 1);
    });

    // 在目标位置插入 block 的行
    nextCells.splice(safeTargetIndex, 0, ...currentBlockRows);

    return nextCells;
  };

  // 移动整个 block
  moveBlock = (
    cells: GridRow[],
    block: BlockGroup,
    direction: 'up' | 'down',
    blockGroups: BlockGroup[]
  ): GridRow[] | null => {
    const nextCells = deepClone(cells);

    // 找到当前 block 在 blockGroups 中的索引
    const currentBlockIndex = blockGroups.findIndex(
      group => group.groupId === block.groupId
    );
    if (currentBlockIndex === -1) return null;

    // 计算目标 block 索引
    const targetBlockIndex =
      direction === 'up'
        ? Math.max(currentBlockIndex - 1, 0)
        : Math.min(currentBlockIndex + 1, blockGroups.length - 1);

    // 如果目标位置相同，不需要移动
    if (targetBlockIndex === currentBlockIndex) return nextCells;

    // 找到目标 block
    const targetBlock = blockGroups[targetBlockIndex];

    // 找到当前 block 和目标 block 中所有行在 cells 中的索引
    const currentBlockRowIndices = block.rowIds
      .map(rowId => nextCells.findIndex(row => row.id === rowId))
      .filter(index => index !== -1)
      .sort((a, b) => a - b);

    const targetBlockRowIndices = targetBlock.rowIds
      .map(rowId => nextCells.findIndex(row => row.id === rowId))
      .filter(index => index !== -1)
      .sort((a, b) => a - b);

    if (
      currentBlockRowIndices.length === 0 ||
      targetBlockRowIndices.length === 0
    )
      return null;

    // 提取两个 block 的所有行
    const currentBlockRows: GridRow[] = [];
    const targetBlockRows: GridRow[] = [];

    currentBlockRowIndices.forEach(index => {
      currentBlockRows.push(nextCells[index]);
    });

    targetBlockRowIndices.forEach(index => {
      targetBlockRows.push(nextCells[index]);
    });

    // 从原位置删除两个 block 的行（从后往前删除，避免索引变化）
    const allIndicesToRemove = [
      ...currentBlockRowIndices,
      ...targetBlockRowIndices,
    ].sort((a, b) => b - a); // 从大到小排序

    allIndicesToRemove.forEach(index => {
      nextCells.splice(index, 1);
    });

    // 确定插入位置：在较小的索引位置插入
    const minCurrentIndex = Math.min(...currentBlockRowIndices);
    const minTargetIndex = Math.min(...targetBlockRowIndices);
    const insertPosition = Math.min(minCurrentIndex, minTargetIndex);

    // 根据移动方向决定插入顺序
    if (direction === 'up') {
      // 向上移动：当前 block 在目标 block 之前
      nextCells.splice(
        insertPosition,
        0,
        ...currentBlockRows,
        ...targetBlockRows
      );
    } else {
      // 向下移动：目标 block 在当前 block 之前
      nextCells.splice(
        insertPosition,
        0,
        ...targetBlockRows,
        ...currentBlockRows
      );
    }

    return nextCells;
  };

  moveRowBetweenBlocks = (
    sourceRowId: string,
    targetRowId: string,
    sourceGroupId: string,
    targetGroupId: string
  ) => {
    const { cellsMap } = this;

    if (sourceGroupId === targetGroupId) {
      // 如果是同组内移动，使用现有的 moveRow 逻辑
      return;
    }

    // 保存原始数据用于完整性检查
    const originalCellsMap = deepClone([...cellsMap]);

    const nextCells = deepClone([...cellsMap]);

    // 找到源行和目标行
    const sourceRowIndex = nextCells.findIndex(row => row.id === sourceRowId);
    const targetRowIndex = nextCells.findIndex(row => row.id === targetRowId);

    if (sourceRowIndex === -1 || targetRowIndex === -1) {
      console.error('Cross-group move failed: Source or target row not found', {
        sourceRowId,
        targetRowId,
        sourceRowIndex,
        targetRowIndex,
      });
      return;
    }

    // 获取源行数据
    const sourceRow = nextCells[sourceRowIndex];

    // 从源位置删除行
    nextCells.splice(sourceRowIndex, 1);

    // 更新源行的 groupByRowId 为目标组的根节点
    const targetGroup = getStableBlockGroups(nextCells).find(
      group => group.groupId === targetGroupId
    );
    if (targetGroup) {
      sourceRow.groupByRowId = targetGroup.rootRowId;
    } else {
      console.error(
        'Cross-group move failed: Target group not found after removing source row',
        {
          targetGroupId,
          availableGroups: getStableBlockGroups(nextCells).map(g => g.groupId),
        }
      );
    }

    // 在目标位置插入行
    const newTargetIndex = nextCells.findIndex(row => row.id === targetRowId);
    if (newTargetIndex !== -1) {
      nextCells.splice(newTargetIndex, 0, sourceRow);
    } else {
      // 如果目标行不存在了，插入到末尾
      console.error(
        'Cross-group move warning: Target row not found after removal, inserting at end',
        {
          targetRowId,
        }
      );
      nextCells.push(sourceRow);
    }

    // 数据完整性检查
    if (originalCellsMap.length !== nextCells.length) {
      console.error('Cross-group move failed: Row count mismatch', {
        original: originalCellsMap.length,
        new: nextCells.length,
      });
      return;
    }

    // 检查所有行的ID是否都存在
    const originalIds = new Set(originalCellsMap.map(row => row.id));
    const newIds = new Set(nextCells.map(row => row.id));

    for (const id of originalIds) {
      if (!newIds.has(id)) {
        console.error('Cross-group move failed: Missing row ID', id);
        return;
      }
    }

    // 更新数据
    this.commitChange(nextCells);

    return nextCells;
  };

  duplicateRowBatch = (rowIds: string[], mergeRowProps?: Partial<GridRow>) => {
    const { cellsMap, editorSDK } = this;
    if (!rowIds || rowIds.length === 0) {
      console.error('rowIds is empty');
      return [];
    }

    const nextCells = deepClone([...cellsMap]);
    const newRowIds: string[] = [];

    let newGroupRowId = '';
    // 按顺序复制每一行
    rowIds.forEach((rowId, index) => {
      const rowIdx = nextCells.findIndex(row => row.id === rowId);
      if (rowIdx === -1) {
        console.error(`Row with id ${rowId} not found`);
        return;
      }

      const originalRow = nextCells[rowIdx];
      const nextRow = mergeDeep(
        deepClone(originalRow),
        mergeRowProps
      ) as GridRow;

      // 生成新的行ID
      nextRow.id = random();

      if (index === 0) {
        newGroupRowId = nextRow.id;
        nextRow.groupByRowId = newGroupRowId;
      }
      nextRow.groupByRowId = newGroupRowId;

      // 为每个单元格生成新的ID并复制组件
      nextRow.cells.forEach((cell, cIdx) => {
        if (Array.isArray(nextRow.childrenIds)) {
          const duplicateCompIds = editorSDK?.duplicateComp(
            nextRow.childrenIds,
            false
          );
          if (duplicateCompIds) {
            nextRow.childrenIds = Array.isArray(duplicateCompIds)
              ? duplicateCompIds
              : [duplicateCompIds];
          }
        }
        nextRow.cells[cIdx].id = random();
        if (Array.isArray(cell.childrenIds)) {
          const duplicateCompIds = editorSDK?.duplicateComp(
            cell.childrenIds,
            false
          );
          if (duplicateCompIds) {
            nextRow.cells[cIdx].childrenIds = Array.isArray(duplicateCompIds)
              ? duplicateCompIds
              : [duplicateCompIds];
          }
        }
      });

      // 计算插入位置：在原始行之后插入
      const insertIndex = rowIdx + 1;
      nextCells.splice(insertIndex, 0, nextRow);

      // 记录新行的ID
      newRowIds.push(nextRow.id);

      // 更新后续行的索引，因为插入新行会影响索引
      // 这里不需要手动更新，因为我们在循环中每次都重新查找索引
    });

    // 一次性更新cellsMap
    this.commitChange(nextCells);

    console.log('duplicateRowBatch result:', newRowIds);
    return newRowIds;
  };

  addComponent = (
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
    const { cellsMap, editorSDK } = this;
    const { activeRowId, activeCellId } = widgetState;
    if (!activeRowId) {
      console.log('没有选中的格子');
      return;
    }
    let activeRowIdx = cellsMap.findIndex(row => row.id === activeRowId);
    let activeCellIdx = activeCellId
      ? cellsMap[activeRowIdx].cells.findIndex(cell => cell.id === activeCellId)
      : -1;
    const nextCells = deepClone([...cellsMap]);
    let addCompId = '';
    const isRepeatList = nextCells[activeRowIdx]?.isRepeatList;
    if (activeCellId && activeCellId !== 'none') {
      if (isRepeatList) {
        nextCells[activeRowIdx].cells.forEach(cell => {
          if (!cell.childrenIds) {
            cell.childrenIds = [];
          }
          const compId = editorSDK?.addComponent(
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
          if (compId) {
            cell.childrenIds?.push(compId);
            addCompId = compId;
          }
        });
      } else {
        const compId = editorSDK?.addComponent(
          layer,
          {
            x: 0,
            y: 0,
            visibility: false,
            lock: true,
            disabled: true,
            ...(link || {}),
          },
          false
        );
        addCompId = compId || '';
        if (!nextCells[activeRowIdx].cells[activeCellIdx].childrenIds) {
          nextCells[activeRowIdx].cells[activeCellIdx].childrenIds = [];
        }
        const childIdx =
          typeof toIndex !== 'undefined'
            ? toIndex
            : nextCells[activeRowIdx].cells[activeCellIdx].childrenIds.length;
        nextCells[activeRowIdx].cells[activeCellIdx].childrenIds?.splice(
          childIdx + 1,
          0,
          compId || ''
        );
      }
    } else if (activeRowId) {
      if (!nextCells[activeRowIdx].childrenIds) {
        nextCells[activeRowIdx].childrenIds = [];
      }

      const compId = editorSDK?.addComponent(
        layer,
        {
          visibility: false,
          lock: true,
          disabled: true,
        } as any,
        false
      );
      addCompId = compId || '';
      const childIdx =
        typeof toIndex !== 'undefined'
          ? toIndex
          : nextCells[activeRowIdx].childrenIds.length;
      nextCells[activeRowIdx].childrenIds?.splice(
        childIdx + 1,
        0,
        compId || ''
      );
    }

    this.commitChange(nextCells);

    return addCompId;
  };

  addRow = (
    nextRowData: GridProps['cellsMap'][number],
    widgetState = this.widgetState
  ) => {
    const { cellsMap } = this;
    const nextCells = deepClone([...cellsMap]);
    const { activeRowId } = widgetState;
    if (!activeRowId) {
      console.log('activeRowId is undefined');
      return;
    }

    const activeRowIdx = nextCells.findIndex(row => row.id === activeRowId);
    if (nextRowData) {
      nextRowData.id = random();
      nextRowData.cells = nextRowData.cells.map(cell => {
        cell.id = random();
        return cell;
      });
      nextCells.splice(activeRowIdx + 1, 0, nextRowData);
      this.commitChange(nextCells);
      return nextRowData.id;
    }
  };

  addRowFromTemplate = (
    copyRowData: CopyRowData,
    widgetState = this.widgetState,
    deleteRowIds?: string[],
    insertToBlock?: boolean
  ) => {
    const { cellsMap, editorSDK } = this;
    const { activeRowId } = widgetState;

    // 重新计算插入位置，因为删除行可能影响了索引
    const nextCells = deepClone([...cellsMap]);

    // 获取当前选中行所在的 block
    const blockGroups = getStableBlockGroups(nextCells);

    const currentBlock = activeRowId
      ? blockGroups.find(block => block.rowIds.includes(activeRowId))
      : null;

    console.log('当前选中的行ID:', activeRowId);
    console.log('当前 block:', currentBlock);

    // 计算插入位置：在选中行的下一个位置
    let insertIndex: number;
    if (insertToBlock) {
      insertIndex = currentBlock?.endIndex || 0;
    } else if (currentBlock) {
      // 找到选中行在 cellsMap 中的索引
      insertIndex = currentBlock.endIndex + 1;
    } else {
      // 如果没有选中行，则插入到末尾
      insertIndex = nextCells.length;
    }

    console.log('copyRowData', copyRowData);
    const { row, rows, elemComps, positionLink, name } = copyRowData;

    // 1. 如果有 deleteRowIds，则先删除对应的 Row
    if (deleteRowIds && deleteRowIds.length > 0) {
      const deletedRowIds: string[] = [];
      const firstDeletedRowIdx = nextCells.findIndex(row =>
        deleteRowIds.includes(row.id)
      );
      insertIndex = firstDeletedRowIdx;
      const deleteIds: string[] = [];

      // 按索引从大到小排序，避免删除时索引变化的问题
      const rowIndices = deleteRowIds
        .map(rowId => nextCells.findIndex(row => row.id === rowId))
        .filter(index => index !== -1)
        .sort((a, b) => b - a); // 从大到小排序

      // 批量删除行
      rowIndices.forEach(rowIdx => {
        const deletedRow = nextCells.splice(rowIdx, 1);
        if (deletedRow.length > 0) {
          deletedRowIds.push(deletedRow[0].id);
          // 收集需要删除的组件ID
          deletedRow[0].cells.forEach(cell => {
            if (Array.isArray(cell.childrenIds)) {
              deleteIds.push(...cell.childrenIds);
            }
          });
        }
      });

      // 删除对应的组件实体
      if (deleteIds.length > 0) {
        editorSDK?.deleteCompEntity(deleteIds);
      }
    }

    // 2. 根据 rows 或 row 批量添加
    const newRowIds: string[] = [];

    // 确定要添加的行数据
    const rowsToAdd = rows && rows.length > 0 ? rows : [row];

    const newRows = rowsToAdd
      .map((rowData, index) => {
        if (!rowData) return;

        const nextRow = deepClone(rowData);
        nextRow.id = random();
        if (insertToBlock) {
          nextRow.groupByRowId = currentBlock?.groupId;
        } else if (index === 0) {
          nextRow.groupByRowId = nextRow.id;
        } else {
          nextRow.groupByRowId = newRowIds[0];
        }
        newRowIds.push(nextRow.id);
        nextRow.name = name;

        // 过滤掉不需要的元素
        const newElemComps = elemComps.filter(
          i => !filterElementRef.includes(i.elementRef)
        );

        const batchAddElem = (layers: LayerElemItem[]) => {
          const newLayers = deepClone(layers);
          const nextPositionLink: Record<string, IPositionLink> = {};
          newLayers.forEach(layer => {
            const originId = layer.elemId;
            const newId = random();
            layer.elemId = newId;
            nextPositionLink[newId] = positionLink[originId];
          });
          editorSDK?.fullSDK.addComponentBatch(newLayers, nextPositionLink);
          return newLayers.map(i => i.elemId);
        };

        if (Array.isArray(nextRow.childrenIds)) {
          const layers = newElemComps.filter(i =>
            nextRow.childrenIds?.includes(i.elemId)
          );
          const newIds = batchAddElem(layers);
          nextRow.childrenIds = newIds;
        }
        // 为每个单元格生成新的ID并复制组件
        nextRow.cells.forEach((cell: any, cIdx: number) => {
          nextRow.cells[cIdx].id = random();
          if (Array.isArray(cell.childrenIds)) {
            const layers = newElemComps.filter(i =>
              cell.childrenIds?.includes(i.elemId)
            );
            const newIds = batchAddElem(layers);
            nextRow.cells[cIdx].childrenIds = newIds;
          }
        });

        return nextRow;
      })
      .filter(Boolean) as GridRow[];
    console.log('insertIndex', insertIndex);
    console.log('newRows', newRows);
    nextCells.splice(insertIndex, 0, ...newRows);
    console.log('nextCells', nextCells);

    // 一次性更新 cellsMap
    this.commitChange(nextCells);

    return newRowIds;
  };

  deleteRow = (widgetState = this.widgetState) => {
    const { cellsMap, editorSDK } = this;
    const { activeRowId } = widgetState;
    if (!activeRowId) return;
    const nextCells = deepClone([...cellsMap]);
    const activeRowIdx = nextCells.findIndex(row => row.id === activeRowId);
    if (activeRowIdx < 0) {
      console.log('activeRowIdx is less than 0', activeRowIdx);
      return;
    }
    const deletedRow = nextCells.splice(activeRowIdx, 1);
    const { cellsMap: nextCells2 } = getGroupRows(nextCells);
    // 修正rowsGroup，移除所有包含activeRowId的rowIds，并过滤掉rowIds为空的group
    this.commitChange(nextCells2);
    const deleteIds: string[] = [];
    deletedRow.forEach(row => {
      row.cells.forEach(cell => {
        if (Array.isArray(cell.childrenIds)) {
          deleteIds.push(...cell.childrenIds);
        }
      });
    });
    editorSDK?.deleteCompEntity(deleteIds);
    return nextCells[Math.max(activeRowIdx - 1, 0)]?.id;
  };

  deleteRowBatch = (rowIds: string[]) => {
    const { cellsMap, editorSDK } = this;
    if (!rowIds || rowIds.length === 0) {
      console.error('rowIds is empty');
      return [];
    }

    const nextCells = deepClone([...cellsMap]);
    const deletedRowIds: string[] = [];
    const deleteIds: string[] = [];

    // 按索引从大到小排序，避免删除时索引变化的问题
    const rowIndices = rowIds
      .map(rowId => nextCells.findIndex(row => row.id === rowId))
      .filter(index => index !== -1)
      .sort((a, b) => b - a); // 从大到小排序

    // 批量删除行
    rowIndices.forEach(rowIdx => {
      const deletedRow = nextCells.splice(rowIdx, 1);
      if (deletedRow.length > 0) {
        deletedRowIds.push(deletedRow[0].id);
        // 收集需要删除的组件ID
        deletedRow[0].cells.forEach(cell => {
          if (Array.isArray(cell.childrenIds)) {
            deleteIds.push(...cell.childrenIds);
          }
        });
      }
    });

    // 删除对应的组件实体
    if (deleteIds.length > 0) {
      editorSDK?.deleteCompEntity(deleteIds);
    }

    console.log('deleteRowBatch result:', deletedRowIds);

    // 一次性更新cellsMap
    this.commitChange(nextCells);

    return deletedRowIds;
  };
}

interface GetCopyRowCodeParams {
  cellsMap: GridProps['cellsMap'];
  editorSDK: EditorSDK<GridProps, GridState>;
  widgetState: GridState;
  rowsGroup: BlockGroup[];
  rowOnly?: boolean;
}

export const getCopyRowCode = ({
  cellsMap,
  editorSDK,
  widgetState,
  rowsGroup,
  rowOnly = false,
}: GetCopyRowCodeParams) => {
  const { activeRowId } = widgetState || {};
  if (typeof activeRowId === 'undefined') return;
  const nextCells = deepClone([...cellsMap]);
  const currGroup = rowsGroup.find(group => group.rowIds.includes(activeRowId));
  if (!currGroup) return;
  const layers: LayerElemItem[] = [];
  const positionLink: PositionLinkMap = {};
  const rows = rowOnly
    ? nextCells.filter(row => row.id === activeRowId)
    : nextCells.filter(row => currGroup.rowIds.includes(row.id));
  if (!rows) return;
  rows.forEach(row => {
    row.childrenIds?.forEach(id => {
      const layer = editorSDK?.getLayer(id);
      const link = editorSDK?.getLink(id);
      if (layer) {
        layers.push(layer);
        positionLink[layer.elemId] = link;
      }
    });
    row.cells.forEach(cell => {
      cell.childrenIds?.forEach(elemId => {
        const layer = editorSDK?.getLayer(elemId);
        const link = editorSDK?.getLink(elemId);
        if (layer) {
          positionLink[layer.elemId] = link;
          layers.push(layer);
        }
      });
    });
  });
  const copyCode = {
    rows,
    elemComps: layers,
    positionLink,
  };
  return copyCode;
};
