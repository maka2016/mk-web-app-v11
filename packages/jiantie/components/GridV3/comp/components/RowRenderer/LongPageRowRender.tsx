import React, { useState } from 'react';
import {
  blockStyleFilter,
  GridCell,
  oddRowListReverseV3,
} from '../../../shared';
import { EditorSDK, IWorksData } from '@mk/works-store/types';
import { queryToObj } from '@mk/utils';
import clas from 'classnames';
import { getWorksDetailStatic } from '@mk/services';
import { getAllLayers } from '../../utils';
import { useGridContext } from '../../provider';
import styled from '@emotion/styled';
import ContainerWithBg from '../../ContainerWithBg';
import { getCanvaInfo2 } from '../../provider/utils';

const BlockWrapper = styled(ContainerWithBg)`
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

export interface FlatPageRowRenderProps {
  fullStack: boolean;
  canvaInfo: any;
  containerInfo: any;
  id: string;
  readonly: boolean;
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

export const takeRowStyle = (style: React.CSSProperties = {}) => {
  return blockStyleFilter({
    gridTemplateColumns: `1fr`,
    ...style,
    display: 'grid',
    gridTemplateRows: 'unset',
    placeSelf: 'unset',
    justifySelf: 'unset',
    writingMode: 'horizontal-tb',
    height: style?.height ? style.height : undefined,
    minHeight: style?.height ? style.height : undefined,
  });
};

export const takeBlockStyle = (
  style: React.CSSProperties = {},
  isFlipPage: boolean
) => {
  const canvaInfo = getCanvaInfo2();
  return blockStyleFilter({
    ...style,
    height: style?.height ? style.height : canvaInfo.canvaH,
    minHeight: style?.height ? style.height : canvaInfo.canvaH,
    ...(isFlipPage && {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      height: 'auto',
      aspectRatio: '9 / 16',
      minHeight: 667,
      // maxHeight: 768,
    }),
    overflow: 'hidden',
  });
};

export default function LongPageRowRender(props: FlatPageRowRenderProps) {
  const { id, worksData, onRenderCell, onRenderElem } = props;
  const { cellsMap, rowsGroup, getStyleByTag2 } = useGridContext();
  const worksDetail = getWorksDetailStatic();
  const isFlipPage = worksDetail?.specInfo?.is_flip_page;

  const [screenshotBlock] = useState(queryToObj().screenshot_block);

  const allLayerMap = getAllLayers(worksData);
  const getLayer = (elemId: string) => {
    const layer = allLayerMap[elemId];
    // if (!layer) {
    //   console.log("elemIdNotFound", elemId)
    // }
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
        id={`block_${group.groupId}`}
        data-row-ids={group.rowIds.join(',')}
        className='editor_row_wrapper'
        style={{
          ...takeBlockStyle(getStyleByTag2('block', groupStyle), isFlipPage),
          ...(hiddenBlock && {
            display: 'none',
          }),
          zIndex: groupIndex + 1,
          margin: 0,
        }}
        lottieBgConfig={currGroupRow?.lottieBgConfig}
        lottieFgConfig={currGroupRow?.lottieFgConfig}
      >
        {currGroupRows.map((currRow, rowIndex) => {
          const isRepeatList = currRow.isRepeatList;
          const listReverse = isRepeatList && currRow.listReverse;
          const rowPerCount =
            currRow.repeatColumnCount ||
            String(currRow.style?.gridTemplateColumns)?.split('1fr ')?.length ||
            1;
          const rowCells = listReverse
            ? oddRowListReverseV3(currRow.cells, rowPerCount)
            : currRow.cells;
          const rowId = currRow.id || `${rowIndex}`;
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
            <ContainerWithBg
              className={clas('Row', `row_${rowId}`)}
              key={`row_key_${rowId}`}
              id={`row_key_${rowId}`}
              data-hover-title='行'
              data-hover-domid={`#Grid_${id} .row_${rowId}`}
              style={(() => {
                return takeRowStyle(
                  getStyleByTag2(currRow.tag as any, currRow.style)
                );
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
            </ContainerWithBg>
          );
        })}
        {absoluteElemIds?.map(({ elemId, rowId, cellId }) => {
          return onRenderElem({
            elemId,
            rowId: rowId,
            cellId: cellId,
            isCellActive: false,
            renderAbsoluteElem: true,
          });
        })}
      </BlockWrapper>
    );
  });
}
