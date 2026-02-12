import { GridCell, GridProps, GridRow } from '../types';

/**
 * 编辑器数据版本号，用于判断使用哪种数据结构
 */
const editorDataVersion = 'v2.1';

const isV2 = (version?: string) => {
  return version === editorDataVersion;
};

/**
 * 删除脏数据，key是数字的
 */
const removeDirtyData = (gridsData: GridRow[]) => {
  if (!gridsData) return gridsData;
  gridsData.forEach((row: any) => {
    Object.keys(row).forEach(key => {
      if (Number.isInteger(+key)) {
        delete row[key];
        if (row.children) {
          removeDirtyData(row.children);
        }
      }
    });
  });
};

/**
 * 将 v1 版本数据结构 (cellsMap) 转换为 v2 版本数据结构 (gridsData)
 *
 * v1 版本中，每个 GridRow 通过 cells 属性存储单元格列表
 * v2 版本中，使用 children 属性实现无限嵌套的网格结构
 *
 * @param gridProps v1 版本的数据
 * @returns 转换后的 v2 版本数据
 */
export function transformV1ToV2(gridProps: GridProps): GridProps {
  if (
    gridProps.gridsData &&
    Object.keys((gridProps.gridsData?.['0'] as any) || {}).some(k =>
      ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(k)
    )
  ) {
    // 脏数据处理，需要删除key是数字的问题
    removeDirtyData(gridProps.gridsData);
  }
  if (isV2(gridProps.version) || !gridProps.cellsMap) {
    // 如果已经是 v2 版本或没有 cellsMap 数据，则直接返回
    return {
      ...gridProps,
      cellsMap: [],
    };
  }

  const {
    cellsMap,
    // 清除脏数据
    fontSize,
    originBoxInfo,
    textScale,
    ...restGridProps
  } = gridProps as any;

  // 创建新的 GridProps，并将 v1 的 cellsMap 转为 v2 的 gridsData
  const v2GridProps: GridProps = {
    ...restGridProps,
    // 一旦转换为v2，下次不再转换
    version: editorDataVersion,
    gridsData: convertRowsToV2Format(gridProps.cellsMap),
    // 保留 cellsMap 以兼容旧版本，但推荐使用 gridsData
    cellsMap: [],
  };

  return v2GridProps;
}

const removeStyleProps = [
  'margin',
  'marginLeft',
  'marginRight',
  'marginBottom',
  'marginTop',
] as (keyof React.CSSProperties)[];

/**
 * 转换 GridRow 数组，将 cells 属性内容转为 children 属性
 */
function convertRowsToV2Format(rows: GridRow[]): GridRow[] {
  if (!rows || rows.length === 0) {
    return [];
  }

  return rows.map(row => {
    removeStyleProps.forEach(prop => {
      delete row.style?.[prop];
    });
    // 创建新的 GridRow 对象
    const { cells, ...restRow } = row;
    const newRow = {
      ...restRow,
      // 将 cells 转换为 children，并确保不保留 cells 属性
      children: convertCellsToRows(cells || []),
    } as GridRow;

    return newRow;
  });
}

/**
 * 将 GridCell 数组转换为 GridRow 数组
 * 在 v2 版本中，单元格也被表示为 GridRow，但具有特殊的 tag 属性
 */
function convertCellsToRows(cells: GridCell[]): GridRow[] {
  if (!cells || cells.length === 0) {
    return [];
  }

  return cells.map(cell => {
    // 将 GridCell 转换为 GridRow
    const cellAsRow = {
      ...cell,
      // 其他属性可以根据需要添加
    } as GridRow;

    return cellAsRow;
  });
}
