import {
  IWorksData,
  LayerElemItem,
} from '@/components/GridEditorV3/works-store/types';
import { queryToObj } from '@/utils';
import styled from '@emotion/styled';
import { cn } from '@workspace/ui/lib/utils';
import { Plus } from 'lucide-react';
import { observer } from 'mobx-react';
import React, { useState } from 'react';
import SettingBlockDesigner from '../../componentsForEditor/SettingPopoverDesigner/SettingBlockDesigner';
import SettingBlockUser from '../../componentsForEditor/SettingPopoverDesigner/SettingBlockUser';
import { getCanvaInfo2 } from '../../provider/utils';
import { blockStyleFilter, getRowName, GridRow } from '../../utils';
import { useWorksStore } from '../../works-store/store/hook';
import ContainerWithBgV2 from '../ContainerWithBgV2';
import WidgetItemRendererV2 from '../WidgetItemRendererV2';

const BlockWrapper = styled.div`
  width: 100%;
  max-width: 100%;
  .editor_row_wrapper {
    display: flex;
    flex-direction: column;
    position: relative;
    max-width: 100%;
    position: relative;
  }
`;

const EditorRowWrapper = styled(ContainerWithBgV2)`
  max-width: 100%;
  &.user_editor {
    &.row_type_Grid,
    &.row_type_Cell {
      pointer-events: none !important;
    }
    /* &.row_type_Component, */
    &.row_type_Table,
    &.row_type_List {
      pointer-events: auto !important;
      &.not_selected {
        * {
          pointer-events: none !important;
        }
      }
    }
    &.row_type_Component {
      /* 四边点击热区 - 使用 clip-path 创建边框样式的热区 */
      &::before {
        content: '';
        position: absolute;
        top: -12px;
        left: -12px;
        right: -12px;
        bottom: -12px;
        z-index: 9999;
        pointer-events: auto;
        cursor: pointer;
        /* 只保留外围24px的边框区域，中间镂空 */
        clip-path: polygon(
          /* 外边框 */ 0% 0%,
          100% 0%,
          100% 100%,
          0% 100%,
          0% 0%,
          /* 内边框（镂空） */ 24px 24px,
          24px calc(100% - 24px),
          calc(100% - 24px) calc(100% - 24px),
          calc(100% - 24px) 24px,
          24px 24px
        );
      }
    }
  }
  /** 用于覆盖自由元素置底 */
  &:hover {
    > .add_btn_wrapper {
      display: flex;
    }
  }
  .add_btn_wrapper {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    display: none;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    pointer-events: none;
    .label {
      pointer-events: auto;
      background-color: #fff;
      padding: 4px;
      border-radius: 4px;
      font-size: 10px;
      box-shadow: 0 0 4px 0 rgba(0, 0, 0, 0.1);
      &:hover {
        background-color: #f0f0f0;
      }
    }
  }
`;

export const takeRowStyle = (
  style: React.CSSProperties = {},
  {
    isList,
  }: {
    isList?: boolean;
  }
) => {
  return blockStyleFilter({
    gridTemplateColumns: `1fr`,
    writingMode: 'horizontal-tb',
    ...style,
    alignSelf: 'unset',
    justifySelf: 'unset',
    placeSelf: 'unset',
    minHeight: 'auto',
    zIndex: style.zIndex || 2,
    gridTemplateRows: `unset`,
    display: isList ? 'grid' : style.display || 'grid',
  });
};

export const takeBlockStyle = (style: React.CSSProperties = {}) => {
  const canvaInfo = getCanvaInfo2();
  const { isFixedHeight, canvaH, fillScreen } = canvaInfo;
  return blockStyleFilter({
    ...style,
    zIndex: style.zIndex || 2,
    // 移除所有self对齐方式
    alignSelf: 'unset',
    justifySelf: 'unset',
    placeSelf: 'unset',
    height: style?.height ? style.height : 'auto',
    minHeight: 'auto',
    // minHeight: style?.minHeight ? style.minHeight : "auto",
    ...(isFixedHeight && {
      // display: 'flex',
      // flexDirection: 'column',
      // justifyContent: 'center',
      height: canvaH,
      minHeight: canvaH,
    }),
    ...(fillScreen && {
      height: '100%',
      minHeight: '100%',
    }),
    overflow: 'hidden',
  });
};

export interface LongPageRowEditorV2Props {
  firstPageCover?: boolean;
  readonly: boolean;
  blockStyle?: React.CSSProperties;
  blockWrapper?: (
    rowDOM: React.ReactNode,
    blockIdx: number,
    row: GridRow
  ) => React.ReactNode;
  activeRowDepth?: number[];
  onlyRenderActiveBlock?: boolean;
  gridsData?: GridRow[];
  worksData?: IWorksData;
  getLayer?: (elemId: string) => LayerElemItem;
}

interface AbsoluteElem {
  rowDepth: number[];
  elemId: string;
}

export default function LongPageRowEditorV2(props: LongPageRowEditorV2Props) {
  const {
    getLayer: getLayerFromProps,
    readonly,
    firstPageCover,
    blockStyle = {},
    blockWrapper,
    activeRowDepth,
    worksData: worksDataFromProps,
    onlyRenderActiveBlock = false,
  } = props;
  const worksStore = useWorksStore();
  const inViewer = worksStore.inViewer;
  const {
    setWidgetStateV2,
    worksData: worksDataFromStore,
    fullStack,
    getStyleByTag2,
  } = worksStore;
  const worksData = worksDataFromProps || worksDataFromStore;
  const gridsData = worksData?.gridProps.gridsData;
  const editable = !readonly;
  const [screenshotBlock] = useState(queryToObj().screenshot_block);
  const canvaInfo = getCanvaInfo2();

  const allLayerMap = worksData.layersMap;
  const getLayer =
    getLayerFromProps ||
    ((elemId: string) => {
      const layer = allLayerMap[elemId];
      // if (!layer) {
      //   console.log("elemIdNotFound", elemId)
      // }
      return layer;
    });

  const onRenderElem = ({
    rowDepth,
    elemId,
    renderAbsoluteElem = false,
  }: {
    rowDepth?: number[];
    elemId: string;
    renderAbsoluteElem?: boolean;
  }) => {
    const layer = getLayer(elemId);
    // if (layer.elemId === 'CCmFEgbHTR') {
    //   console.log('layer', toJS(layer));
    // }
    if (!layer) {
      return (
        <span
          data-log={`没有元素: ${elemId}`}
          key={`empty_elem_${elemId}`}
        ></span>
      );
    }
    const isAbsoluteElem = layer.attrs?.absoluteElem;
    const disabledToEdit = !!layer.attrs?.disabledToEdit;

    if (isAbsoluteElem && !renderAbsoluteElem) {
      return null;
    }

    let elemEditable = true;
    if (readonly) {
      elemEditable = false;
    } else if (fullStack) {
      elemEditable = true;
    } else {
      elemEditable = !disabledToEdit;
    }
    const itemDOM = (
      <WidgetItemRendererV2
        key={`WidgetItemRendererV2_${elemId}`}
        layer={layer}
        rowDepth={rowDepth}
        readyToPlayAnimation={true}
        editable={elemEditable}
        isAbsoluteElem={isAbsoluteElem}
        readonly={readonly}
        onElemClick={(e, { targetElemId }) => { }}
      />
    );
    return itemDOM;
  };

  return gridsData.map((currGroupRow, groupIndex) => {
    const currGroupRows = currGroupRow.children || [];
    const isActiveBlock = groupIndex === activeRowDepth?.[0];
    const isFirstPageCover = groupIndex === 0 && firstPageCover;
    let hiddenBlock =
      screenshotBlock && screenshotBlock !== `${currGroupRow.id}`;

    if (!screenshotBlock && onlyRenderActiveBlock && !inViewer) {
      const defaultActiveRowDepth = [activeRowDepth?.[0] || 0];
      const isActiveGroup = groupIndex === defaultActiveRowDepth[0];
      if (!isActiveGroup) {
        // hiddenBlock = true;
        return null;
      }
    }

    const groupStyle = {
      ...(currGroupRow?.groupStyle || {}),
      ...(currGroupRow?.style || {}),
    };

    const absoluteElemInBlockIds: AbsoluteElem[] = [];
    currGroupRow.childrenIds?.forEach(elemId => {
      const layer = getLayer(elemId);
      if (layer?.attrs?.absoluteElem) {
        absoluteElemInBlockIds.push({
          rowDepth: [groupIndex],
          elemId,
        });
      }
    });

    const renderRow = (
      currGroupRows: GridRow[],
      parentDepth: number[],
      startIndex = 0
    ) => {
      return currGroupRows.map((currRow, rowIndex) => {
        if (!currRow) return null;

        const currDepth = [...parentDepth, startIndex + rowIndex];

        // 动态赋值 - 使用 runInAction 包装以符合 MobX 严格模式
        // runInAction(() => {
        //   currRow.depth = currDepth;
        // });

        const rowName = getRowName(currRow, currDepth);
        const isList = !!currRow.isRepeatList;
        const isTableView = !!currRow.isTableView;
        const isSelectedRow = JSON.stringify(activeRowDepth)?.includes(
          JSON.stringify(currDepth).replace(']', '')
        );
        const isComponentEntity = !!currRow.componentGroupRefId;
        /** 如果是组件，则下属的变量只渲染激活的 row，其他变量不渲染 */
        const avaliableRows = currRow.children;
        const rowCells = avaliableRows;
        const rowId = currRow.id;
        currRow.childrenIds?.forEach(elemId => {
          const layer = getLayer(elemId);
          const relativeToParent =
            layer?.attrs?.position?.relativeTo === 'parent';
          const relativeToBlock = !relativeToParent;
          if (layer?.attrs?.absoluteElem && relativeToBlock) {
            absoluteElemInBlockIds.push({
              rowDepth: currDepth,
              elemId,
            });
          }
        });

        const rowDOM = (
          <EditorRowWrapper
            id={`editor_row_${rowId}`}
            key={`editor_row_${rowId}`}
            data-row-depth={JSON.stringify(currDepth)}
            data-row-name={rowName}
            data-row-id={rowId}
            className={cn(
              'Row',
              'hover_elem',
              `row_${rowId}`,
              `row_type_${rowName}`,
              isList && 'row_type_List',
              isTableView && 'row_type_Table',
              isComponentEntity && 'row_type_Component',
              !fullStack && !readonly && 'user_editor',
              !isSelectedRow && 'not_selected'
            )}
            style={(() => {
              return {
                ...takeRowStyle(
                  getStyleByTag2(currRow.tag as any, currRow.style),
                  {
                    isList: !!currRow.isRepeatList,
                  }
                ),
                // overflow: "hidden",
              };
            })()}
          >
            {currRow.childrenIds?.map(elemId => {
              const layer = getLayer(elemId);
              const relativeToParent =
                layer?.attrs?.position?.relativeTo === 'parent';
              return onRenderElem({
                rowDepth: currDepth,
                elemId,
                renderAbsoluteElem: relativeToParent,
              });
            })}
            {rowCells &&
              rowCells.length > 0 &&
              renderRow(rowCells, currDepth, startIndex)}
            {!readonly &&
              fullStack &&
              (!currRow.children || currRow.children?.length === 0) &&
              (!currRow.childrenIds || currRow.childrenIds?.length === 0) && (
                <div className='text-xs add_btn_wrapper'>
                  <span
                    className='label'
                    onClick={() => {
                      setWidgetStateV2({
                        isAddModalShow2: true,
                        activeRowDepth: currDepth,
                        editingElemId: undefined,
                      });
                    }}
                  >
                    <Plus size={12} />
                  </span>
                </div>
              )}
          </EditorRowWrapper>
        );
        return rowDOM;
      });
    };

    const blockDOM = (
      <BlockWrapper
        key={`group_${currGroupRow.id}`}
        // id={`editor_block_${currGroupRow.id}`}
        // 用于
        data-animation={JSON.stringify(currGroupRow?.animationType)}
        data-row-id={currGroupRow.id}
        className={cn('block_wrapper', fullStack && 'fullStack')}
        style={{
          ...(hiddenBlock && {
            display: 'none',
          }),
          zIndex: groupIndex + 1,
          ...blockStyle,
          ...(canvaInfo.fillScreen &&
            readonly && {
            height: '100%',
          }),
          ...(isFirstPageCover
            ? {
              height: '100%',
            }
            : {}),
        }}
      >
        {fullStack && editable && (
          <SettingBlockDesigner blockIdx={groupIndex} />
        )}
        {!fullStack && editable && <SettingBlockUser blockIdx={groupIndex} />}
        <ContainerWithBgV2
          className='editor_row_wrapper Row hover_elem'
          data-actived={isActiveBlock}
          data-row-id={currGroupRow.id}
          data-row-depth={JSON.stringify([groupIndex])}
          data-name='editor_block_container'
          id={`editor_block_${currGroupRow.id}`}
          lottieBgConfig={currGroupRow?.lottieBgConfig}
          lottieFgConfig={currGroupRow?.lottieFgConfig}
          style={{
            ...takeBlockStyle(getStyleByTag2('block', groupStyle)),
            ...(isFirstPageCover
              ? {
                height: '100%',
              }
              : {}),
          }}
        >
          {renderRow(currGroupRows, [groupIndex], 0)}
          {absoluteElemInBlockIds?.map(({ elemId, rowDepth }) => {
            return onRenderElem({
              rowDepth: rowDepth,
              elemId,
              renderAbsoluteElem: true,
            });
          })}
          {currGroupRow.childrenIds?.map(elemId => {
            return onRenderElem({
              rowDepth: [groupIndex],
              elemId,
              renderAbsoluteElem: false,
            });
          })}
        </ContainerWithBgV2>
      </BlockWrapper>
    );
    return blockWrapper
      ? blockWrapper(blockDOM, groupIndex, currGroupRow)
      : blockDOM;
  });
}

export const LongPageRowEditorObserver = observer(LongPageRowEditorV2);
