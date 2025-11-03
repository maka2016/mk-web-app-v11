import {
  DesignerConfig,
  getAppId,
  getDesignerInfoForClient,
  getUid,
  WorksDetailEntity,
} from '@mk/services/src';
import { isPc, queryToObj } from '@mk/utils';
import { EditorContext } from '@mk/widgets-bridge-sdk';
import { EditorSDK, IWorksData } from '@mk/works-store/types';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { deepClone, GridProps, GridRow, GridState } from '../../shared';
import { transformV1ToV2 } from '../../shared/transformData';
import { noTakeTag, ThemeConfigV2 } from '../../shared/types';
import { useThemePackV3Data } from '../hooks/useThemePackV3Data.';
import GridOperator from './operator';
import GridOperatorV2 from './operatorV2';
import { mergeDeep2 } from './utils';

export interface ThemeFloor {
  id: number;
  name: string;
  documentId: string;
}

interface GridProviderProps {
  children:
    | React.ReactNode
    | ((gridSDKHelper: ReturnType<typeof useGridSDK>) => React.ReactNode);
  gridId: string;
  editorSDK?: EditorSDK<GridProps, GridState>;
  editorCtx?: EditorContext;
  viewerSDK?: any;
  /** @deprecated 使用 widgetStateV2 替代 */
  widgetState?: GridState;
  gridProps: GridProps;
  /** 是否全栈模式 */
  fullStack: boolean;
  worksDetail: WorksDetailEntity;
  getWorksData: () => IWorksData;
  useGridV2: boolean;
}

function removeUndefinedKeys(style: any): any {
  Object.keys(style).forEach(key => {
    const val = style[key as keyof typeof style];
    if (val === undefined || val === null) {
      delete style[key as keyof typeof style];
    }
  });
  return style;
}

const gridOperatorV2 = new GridOperatorV2();
const gridOperatorV1 = new GridOperator();

const useGridSDK = ({
  editorSDK,
  widgetState = {},
  gridProps,
  getWorksData,
  viewerSDK,
  useGridV2,
  worksDetail,
  fullStack,
  ...other
}: Omit<GridProviderProps, 'children'>) => {
  const designerTool = queryToObj().designer_tool;
  /** 最高权限的 */
  const isProDesigner = designerTool === 'dev';
  const themeSchemaOld = getWorksData()?.style?.themeSchema || ({} as any);
  const isFlatPage = worksDetail.specInfo.is_flat_page;
  const [widgetStateV2, _setWidgetStateV2] = useState<GridState>({
    hideOperator: fullStack || !isFlatPage,
    onlyRenderActiveBlock: !isFlatPage && !viewerSDK && !fullStack,
    /** 默认选中第1页 */
    activeRowDepth: [0],
  });

  /** 如果是主题作品，则使用主题的id，否则使用关联的主题id */
  const themePackV3Data = useThemePackV3Data(
    gridProps.themePackV3
      ? {
          documentId: gridProps.themePackV3.documentId,
          worksId: worksDetail.id,
        }
      : gridProps.themePackV3RefId
  );

  const materialResourcesGroup =
    gridProps.worksCate === 'theme'
      ? gridProps.materialResourcesGroup
      : themePackV3Data?.themePackGridProps?.materialResourcesGroup;

  const [designerInfo, setDesignerInfo] = useState<
    DesignerConfig & {
      fetching: boolean;
    }
  >({
    fetching: !!designerTool,
    isDesigner: false,
    uid: 0,
    appid: '',
    fullName: '',
    roles: [],
  });

  const setWidgetStateV2 = (nextWidgetState: GridState) => {
    _setWidgetStateV2(prev => {
      const newState = deepClone(prev); // 创建新的对象
      return mergeDeep2(newState, nextWidgetState);
    });
  };

  // TODO: 观察可能出现的性能问题
  gridOperatorV1.update({
    cellsMap: gridProps.cellsMap,
    editorSDK,
    widgetState,
  });

  /** v2.1 Grid */
  const gridsPropsV2 = transformV1ToV2(gridProps);
  gridOperatorV2.update({
    gridsData: gridsPropsV2.gridsData,
    editorSDK,
    widgetState: widgetStateV2,
  });

  const getStyleByTag2 = (
    tag: keyof ThemeConfigV2,
    targetStyle: React.CSSProperties = {}
  ) => {
    if (noTakeTag.includes(tag)) {
      return targetStyle;
    }
    const themeConfig = gridProps.themeConfig2 || ({} as ThemeConfigV2);
    return {
      ...(themeSchemaOld?.[tag] || {}),
      ...(themeConfig[tag] || {}),
      ...removeUndefinedKeys(targetStyle),
    };
  };

  useEffect(() => {
    const setThemePackV3 = () => {
      const url = new URL(window.location.href);
      const themePackV3 = url.searchParams.get('themePackV3');
      const themeWorksId =
        gridProps.themePackV3?.content?.worksId ||
        gridProps.themePackV3RefId?.worksId;
      if (!themePackV3 && themeWorksId) {
        url.searchParams.set('themePackV3', themeWorksId);
        window.history.replaceState({}, '', url.toString());
      }
    };
    if (designerTool && isPc()) {
      getDesignerInfoForClient({
        uid: getUid(),
        appid: getAppId(),
      }).then(res => {
        if (isProDesigner) {
          res.isDesigner = true;
        }
        setDesignerInfo(res);
        if (!res.isDesigner) {
          toast.error('你还不是设计师，请联系管理员');
        }
        setThemePackV3();
      });
    }
  }, []);

  useEffect(() => {
    /**
     * v1 数据
     * 初始化时，如果rowsGroup为空，则需要设置rowsGroup
     */
    if (!useGridV2) {
      if (gridProps.cellsMap && !gridProps.cellsMap[0]?.groupByRowId) {
        editorSDK?.onFormValueChange({
          cellsMap: gridOperatorV1.cellsMap,
        });
      }
      const resetV1RowTag = () => {
        if (!editorSDK || !gridProps.cellsMap) return;
        let hasChange = false;
        const rowTags = [
          'grid_root',
          'list_root',
          'grid_root_head',
          'grid_root_content',
          'grid_root_footer',
        ];
        const nextCellsMap = deepClone(gridProps.cellsMap);
        const newRows = nextCellsMap.map((row: GridRow) => {
          const isRoot = rowTags.includes(row.tag || '');
          if (!isRoot) {
            hasChange = true;
          }
          return {
            ...row,
            tag: isRoot ? row.tag : 'grid_root',
          };
        });
        if (hasChange) {
          editorSDK.onFormValueChange({
            cellsMap: newRows,
          });
        }
      };
      resetV1RowTag();
    } else {
      const resetV2RowTag = () => {
        if (!editorSDK || !gridProps.gridsData) return;
        let hasChange = false;
        /** 第一层为block */
        const blockTag = 'block';
        const gridsData = deepClone(gridProps.gridsData);
        const newRows = gridsData.map((row: GridRow) => {
          // 第一层是否正确的block
          const isCorrentTag = row.tag === blockTag;
          if (!isCorrentTag) {
            hasChange = true;
          }
          return {
            ...row,
            tag: blockTag,
          };
        });
        if (hasChange) {
          console.log('重置所有block标签');
          editorSDK.onFormValueChange({
            gridsData: newRows,
          });
        }
      };
      resetV2RowTag();

      const setWorksCate = () => {
        const url = new URL(window.location.href);
        const worksCateFromUrl = url.searchParams.get('works_cate');
        if (
          worksCateFromUrl &&
          (!gridsPropsV2.worksCate ||
            worksCateFromUrl !== gridsPropsV2.worksCate)
        ) {
          // 如果没有，则设置一次
          let worksCateStr = '';
          if (worksCateFromUrl) {
            // 如果从url中有
            worksCateStr = worksCateFromUrl;
          } else if (/模版/gi.test(worksDetail.title)) {
            worksCateStr = 'template';
          } else if (/主题/gi.test(worksDetail.title)) {
            worksCateStr = 'theme';
          } else {
            worksCateStr = 'user';
          }
          if (worksCateStr) {
            editorSDK?.onFormValueChange({
              worksCate: worksCateStr as any,
            });
          }
        }
      };
      setWorksCate();
      /**
       * v2.1 Grid 数据
       */
      if (useGridV2 && gridProps.version !== 'v2.1') {
        editorSDK?.onFormValueChange(gridsPropsV2);
      }
    }
  }, []);

  return {
    ...other,
    ...gridOperatorV1,
    ...gridOperatorV2,
    materialResourcesGroup,
    isProDesigner,
    fullStack,
    viewerSDK,
    worksDetail,
    designerInfo,
    useGridV2,
    editorSDK,
    /** @deprecated 使用 gridsData 替代 */
    cellsMap: useGridV2 ? [] : gridOperatorV1.cellsMap,
    gridsData: gridOperatorV2.gridsData,
    /** @deprecated 使用 widgetStateV2 替代 */
    widgetState,
    widgetStateV2,
    /** @deprecated 在 v2 结构下已废弃，不需要有任何代替 */
    rowsGroup: gridOperatorV1.rowsGroup,
    gridStyle: gridProps.style,
    gridProps,
    themeConfig: gridProps.themeConfig2 || ({} as ThemeConfigV2),
    themePackV3Data,
    getWorksData,
    getStyleByTag2,
    setWidgetStateV2,
    clearActiveStatus: () => {
      setWidgetStateV2({
        activeRowDepth: [widgetStateV2.activeRowDepth?.[0] || 0],
        editingElemId: undefined,
        activeCellId: undefined,
        activeRowId: undefined,
        hideOperator: true,
      });
      editorSDK?.changeWidgetState({
        activeRowDepth: [widgetStateV2.activeRowDepth?.[0] || 0],
        editingElemId: undefined,
        activeCellId: undefined,
        activeRowId: undefined,
      });
    },
  };
};

const GridProviderContext = React.createContext<ReturnType<
  typeof useGridSDK
> | null>(null);

export const useGridContext = () => {
  const context = React.useContext(GridProviderContext);
  if (context === null) {
    console.trace('useGridContextErr');
    throw new Error('useGridContext must be used within a GridProvider');
  }
  return context;
};

export default function GridProvider({
  children,
  ...other
}: GridProviderProps) {
  const gridSDKHelper = useGridSDK({
    ...other,
  });
  return (
    <GridProviderContext.Provider value={gridSDKHelper}>
      {typeof children === 'function' ? children(gridSDKHelper) : children}
    </GridProviderContext.Provider>
  );
}
