import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { BtnLite as BtnLiteBase } from '../../../shared/style-comps';
import { getPermissionData } from '@mk/services';
import styled from '@emotion/styled';
import cls from 'classnames';
import { useGridContext } from '../../../comp/provider';
import { getElementDisplayName } from '../../AddCompHelper/const';
import { SelectableElement } from '../../StylingManager/types';
import { GridCell, GridRow } from '../../../shared/types';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';

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

const TagPicker = ({
  onClose,
  cell,
}: {
  onClose: () => void;
  cell: GridCell;
}) => {
  const { changeCellAttrs } = useGridContext();
  const tagableElem = [
    {
      title: '通用单元格',
      elementRef: 'Cell',
      link: {
        tag: 'grid_cell_root',
      },
    },
    {
      title: '强调单元格',
      elementRef: 'Cell',
      link: {
        tag: 'grid_cell_2',
      },
    },
  ];
  return (
    <div className='p-4'>
      当前标签：{getElementDisplayName(cell.tag as SelectableElement)}
      <div className='mt-4'></div>
      {tagableElem.map(item => {
        return (
          <div
            key={item.link.tag}
            className={cls(
              'flex items-center gap-2 cursor-pointer p-2 rounded-md',
              {
                'bg-gray-200': item.link.tag === cell.tag,
              }
            )}
            onClick={() => {
              changeCellAttrs({
                tag: item.link.tag as any,
              });
              onClose();
            }}
          >
            <div
              className={cls(
                'w-4 h-4 rounded-full',
                item.link.tag === cell.tag ? 'bg-blue-500' : 'bg-gray-200'
              )}
            ></div>
            <div>{item.title}</div>
          </div>
        );
      })}
    </div>
  );
};

export const SettingCell = (props: { focusRender?: boolean }) => {
  const { focusRender = false } = props;
  const {
    widgetState,
    cellsMap,
    editorSDK,
    deleteCell,
    duplicateCell,
    moveCell,
  } = useGridContext();
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);
  const { editingElemId, activeCellId, activeRowId } = widgetState || {};
  const fullStack = getPermissionData().materialProduct;
  const selectedCell =
    (!editingElemId || focusRender) && !!activeCellId && !!activeRowId;

  if (!selectedCell || !editorSDK) return <></>;

  const currRow = cellsMap.find(row => row.id === activeRowId);
  if (!currRow) return <></>;
  const currCell = currRow.cells.find(cell => cell.id === activeCellId);
  if (!currCell) return <></>;

  const isFirst =
    currRow.cells.findIndex(cell => cell.id === activeCellId) === 0;
  const isLast =
    currRow.cells.findIndex(cell => cell.id === activeCellId) ===
    currRow.cells.length - 1;

  const isRepeatList = currRow.isRepeatList;

  // 没选中元素 & 选中格子
  return (
    <>
      <ResponsiveDialog
        isOpen={isTagPickerOpen}
        onOpenChange={nextVal => {
          setIsTagPickerOpen(nextVal);
        }}
        contentProps={{
          className: 'w-[400px]',
        }}
      >
        <TagPicker
          onClose={() => {
            setIsTagPickerOpen(false);
          }}
          cell={currCell}
        />
      </ResponsiveDialog>
      <Container title={fullStack ? '单元格' : ''}>
        {/* {!isFirst && (
          <BtnLite
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              moveCell("up");
            }}
          >
            <span>上移</span>
          </BtnLite>
        )}
        {!isLast && (
          <BtnLite
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              moveCell("down");
            }}
          >
            <span>下移</span>
          </BtnLite>
        )} */}
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
        {!isRepeatList && (
          <>
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
          </>
        )}
        <BtnLite
          className='col'
          onClick={e => {
            setIsTagPickerOpen(true);
          }}
        >
          标签
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
    </>
  );
};
