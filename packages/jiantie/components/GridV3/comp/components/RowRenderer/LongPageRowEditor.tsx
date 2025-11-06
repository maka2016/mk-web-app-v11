import styled from '@emotion/styled';
import { getWorksDetailStatic } from '@mk/services';
import { deepClone, queryToObj } from '@mk/utils';
import { IWorksData } from '@mk/works-store/types';
import clas from 'classnames';
import React, { useState } from 'react';
import { SettingBlock } from '../../../DesignerToolForEditor/DesignerOperator/SettingPopover/SettingBlock';
import { GridCell, oddRowListReverseV3 } from '../../../shared';
import ContainerWithBg from '../../ContainerWithBg';
import { useGridContext } from '../../provider';
import { getAllLayers } from '../../utils';
import { takeBlockStyle, takeRowStyle } from './LongPageRowRender';

const BlockWrapper = styled.div`
  width: 100%;
  max-width: 100%;
  .editor_row_wrapper {
    margin: 0 !important;
    display: flex;
    flex-direction: column;
    position: relative;
    max-width: 100%;
  }
`;

const EditorRowWrapper = styled(ContainerWithBg)`
  max-width: 100%;
`;

interface FlatPageRowRenderProps {
  fullStack: boolean;
  id: string;
  readonly: boolean;
  canvaInfo: any;
  containerInfo: any;
  worksData: IWorksData;
  onRenderCell: (cell: GridCell, rowId: string) => React.ReactNode;
  onRenderElem: (props: {
    elemId: string;
    rowId: string;
    cellId: string;
    renderAbsoluteElem?: boolean;
    isCellActive: boolean;
  }) => React.ReactNode;
}

export default function LongPageRowEditor(props: FlatPageRowRenderProps) {
  const { fullStack, id, readonly, onRenderCell, onRenderElem, worksData } =
    props;
  const { editorSDK, widgetState, cellsMap, rowsGroup, getStyleByTag2 } =
    useGridContext();
  const worksDetail = getWorksDetailStatic();
  const isFlipPage = worksDetail?.specInfo?.is_flip_page || false;
  const editable = !!editorSDK && !readonly;
  const [screenshotBlock] = useState(queryToObj().screenshot_block);
  const { activeRowId, activeCellId, editingElemId } = widgetState;

  const allLayerMap = getAllLayers(worksData);
  const getLayer = (elemId: string) => {
    const layer = allLayerMap[elemId];
    return layer;
  };

  return rowsGroup.map((group, groupIndex) => {
    const currGroupRows = cellsMap.filter(row => group.rowIds.includes(row.id));
    const hiddenBlock =
      screenshotBlock && screenshotBlock !== `${group.groupId}`;
    const absoluteElemIds: {
      elemId: string;
      rowId: string;
      cellId: string;
    }[] = [];
    const currGroupRow = cellsMap.find(row => row.id === group.groupId);
    const groupStyle = currGroupRow?.groupStyle || {};

    return (
      <BlockWrapper
        key={`group_${group.groupId}`}
        id={`editor_block_${group.groupId}`}
        data-row-ids={group.rowIds.join(',')}
        className={clas('block_wrapper', fullStack && 'fullStack')}
        style={{
          ...(hiddenBlock && {
            display: 'none',
          }),
          zIndex: groupIndex + 1,
        }}
      >
        <SettingBlock
          rowIds={group.rowIds}
          title={`模块 ${groupIndex + 1}`}
          blockIdx={groupIndex}
        />
        <ContainerWithBg
          className='editor_row_wrapper'
          id={`block_${group.groupId}`}
          lottieBgConfig={currGroupRow?.lottieBgConfig}
          lottieFgConfig={currGroupRow?.lottieFgConfig}
          style={{
            ...takeBlockStyle(getStyleByTag2('block', groupStyle), isFlipPage),
            margin: 0,
          }}
        >
          {currGroupRows.map((currRow, rowIndex) => {
            if (!currRow) return null;
            const isRepeatList = currRow.isRepeatList;
            const listReverse = isRepeatList && currRow.listReverse;
            const rowPerCount =
              currRow.repeatColumnCount ||
              String(currRow.style?.gridTemplateColumns)?.split('1fr ')
                ?.length ||
              1;
            const rowCells = listReverse
              ? oddRowListReverseV3(deepClone(currRow.cells), rowPerCount)
              : currRow.cells;
            const rowId = currRow.id;
            const isFirstRow = rowIndex === 0;
            const isSelectedRow = fullStack && activeRowId === rowId;
            const isActiveRow =
              isSelectedRow &&
              !editingElemId &&
              typeof activeCellId === 'undefined';
            // const absoluteCells: GridCell[] = [];
            // const absoluteElemIds: string[] = [];
            currRow.childrenIds?.forEach(elemId => {
              const layer = getLayer(elemId);
              if (layer?.attrs?.absoluteElem) {
                absoluteElemIds.push({
                  elemId,
                  rowId,
                  cellId: '',
                });
              }
            });
            rowCells.forEach(cell => {
              const layerIds = cell.childrenIds?.filter(id => {
                const layer = getLayer(id);
                return layer?.attrs?.absoluteElem;
              });
              absoluteElemIds.push(
                ...(layerIds || []).map(id => ({
                  elemId: id,
                  rowId,
                  cellId: cell.id,
                }))
              );
            });
            return (
              <EditorRowWrapper
                id={`editor_row_${rowId}`}
                key={`editor_row_${rowId}`}
                onTouchStart={e => {
                  if (rowId === activeRowId) {
                    return;
                  }
                  editorSDK?.changeWidgetState({
                    activeRowId: rowId,
                    activeCellId: undefined,
                    editingElemId: undefined,
                  });
                  if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                  }
                }}
                className={clas(
                  'Row',
                  isActiveRow && 'active',
                  isSelectedRow && 'selected',
                  'hover_elem',
                  `row_${rowId}`
                )}
                data-hover-title='行'
                data-hover-domid={`#Grid_${id} .row_${rowId}`}
                data-actived={isActiveRow}
                data-row-selected={isSelectedRow}
                onClick={e => {
                  if (!editable) return;
                  e.preventDefault();
                  e.stopPropagation();
                  editorSDK?.changeWidgetState({
                    activeRowId: rowId,
                    activeCellId: undefined,
                    editingElemId: undefined,
                  });
                }}
                style={(() => {
                  return {
                    ...takeRowStyle(
                      getStyleByTag2(currRow.tag as any, currRow.style)
                    ),
                  };
                })()}
              >
                {rowCells.map(cell => {
                  return onRenderCell(cell, rowId);
                })}
                {currRow.childrenIds?.map(elemId => {
                  return onRenderElem({
                    elemId,
                    rowId,
                    cellId: '',
                    isCellActive: false,
                    renderAbsoluteElem: false,
                  });
                })}
              </EditorRowWrapper>
            );
          })}
          {absoluteElemIds?.map(({ elemId, rowId, cellId }) => {
            return onRenderElem({
              elemId,
              rowId,
              cellId,
              isCellActive: false,
              renderAbsoluteElem: true,
            });
          })}
        </ContainerWithBg>
      </BlockWrapper>
    );
  });
}
