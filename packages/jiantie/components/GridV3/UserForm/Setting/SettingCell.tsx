import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { BtnLite as BtnLiteBase } from '../../shared/style-comps';
import { random } from '@mk/utils';
import { getPermissionData } from '@mk/services';
import styled from '@emotion/styled';
import clas from 'classnames';
import { useGridContext } from '../../comp/provider';

const Container = styled.div`
  height: 36px;
  display: flex;
  align-items: center;
  padding: 2px 4px;
  /* gap: 4px; */
  justify-content: center;
  .split {
    background-color: #0000000f;
    height: 16px;
    width: 1px;
  }
`;

const BtnLite = styled(BtnLiteBase)`
  gap: 4px;
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;

  &:hover {
    background-color: #f5f5f5;
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const SettingCell = (props: { focusRender?: boolean }) => {
  const { focusRender = false } = props;
  const {
    widgetState,
    cellsMap,
    editorSDK,
    deleteCell,
    duplicateCell,
    moveCell,
    getDuplicateCellData,
    addRow,
  } = useGridContext();
  const { editingElemId, activeCellId, activeRowId } = widgetState || {};
  const fullStack = getPermissionData().materialProduct;
  const selectedCell =
    (!editingElemId || focusRender) && !!activeCellId && !!activeRowId;

  if (!selectedCell || !editorSDK) return <></>;

  const currRow = cellsMap.find(row => row.id === activeRowId);
  if (!currRow) return <></>;

  const isFirst =
    currRow.cells.findIndex(cell => cell.id === activeCellId) === 0;
  const isLast =
    currRow.cells.findIndex(cell => cell.id === activeCellId) ===
    currRow.cells.length - 1;

  // 没选中元素 & 选中格子
  return (
    <Container title={fullStack ? '单元格' : ''}>
      {!isFirst && (
        <BtnLite
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            moveCell('up');
          }}
        >
          {/* <ChevronUp size={16} /> */}
          <span>上移</span>
        </BtnLite>
      )}
      {!isLast && (
        <BtnLite
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            moveCell('down');
          }}
        >
          {/* <ChevronDown size={16} /> */}
          <span>下移</span>
        </BtnLite>
      )}
      {fullStack && (
        <>
          {/* <BtnLite
            className={clas(currCell?.isCopyable ? "active" : "")}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const nextIsCopyable = !currCell?.isCopyable;
              changeCellAttrs({
                isCopyable: nextIsCopyable,
              });
            }}
          >
            <span>可复制单元格</span>
          </BtnLite> */}
          <BtnLite
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              const duplicateCellData = getDuplicateCellData();
              if (!duplicateCellData) return;
              addRow({
                cells: [duplicateCellData],
                id: random(),
              });
            }}
          >
            <span>转布局</span>
          </BtnLite>
          <BtnLite
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              editorSDK?.changeWidgetState({
                editingElemId: undefined,
                activeCellId: undefined,
              });
            }}
          >
            <span>选父级</span>
          </BtnLite>
        </>
      )}
      <BtnLite
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          duplicateCell();
        }}
      >
        {/* <Copy size={16} /> */}
        <span>复制</span>
      </BtnLite>
      <BtnLite
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          deleteCell();
          editorSDK?.changeWidgetState({
            activeCellId: undefined,
            activeRowId: undefined,
          });
        }}
      >
        {/* <Trash2 size={16} /> */}
        <span>删除</span>
      </BtnLite>
      <BtnLite
        style={{
          borderLeft: '1px solid #0000000f',
          marginLeft: 8,
        }}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          editorSDK?.changeWidgetState({
            activeRowId: activeRowId,
            activeCellId: undefined,
            editingElemId: undefined,
          });
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
        }}
      >
        <Check size={20} />
      </BtnLite>
    </Container>
  );
};
