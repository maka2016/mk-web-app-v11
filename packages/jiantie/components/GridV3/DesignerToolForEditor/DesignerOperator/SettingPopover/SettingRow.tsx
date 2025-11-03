import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, CodeXml, Copy, Trash2 } from 'lucide-react';
import { BtnLite } from '../../../shared/style-comps';
import styled from '@emotion/styled';
import cls from 'classnames';
import toast from 'react-hot-toast';
import clas from 'classnames';
import { useGridContext } from '../../../comp/provider';
import { Input } from '@workspace/ui/components/input';
import { deepClone } from '@mk/utils';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { GridRow } from '../../../shared';
import {
  getAddContainerThemeConfig,
  getElementDisplayName,
} from '../../AddCompHelper/const';
import { SelectableElement } from '../../StylingManager/types';
import { getCopyRowCode } from '../../../comp/provider/operator';

const BtnLite2 = styled(BtnLite)`
  background-color: transparent;
  padding: 8px;
  font-size: 12px;
`;

const SettingSimpleModeRoot = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  .title {
    font-size: 12px;
    font-weight: bold;
    color: #333;
  }
  .footer_action {
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    /* gap: 16px; */
    .label {
      font-size: 14px;
      color: #999;
    }
    .label2 {
      margin-left: 4px;
    }
    .btn_lite {
      padding: 0 8px;
    }
  }
`;

interface GridMoreOptionsProps {
  currRowId?: string;
  title: string;
}

const TagPicker = ({ onClose, row }: { onClose: () => void; row: GridRow }) => {
  const { themeConfig, changeRowAttrs } = useGridContext();
  const tagableElem = getAddContainerThemeConfig(themeConfig);
  return (
    <div className='p-4'>
      当前标签：{getElementDisplayName(row.tag as SelectableElement)}
      <div className='mt-4'></div>
      {tagableElem.map(item => {
        return (
          <div
            key={item.link.tag}
            className={cls(
              'flex items-center gap-2 cursor-pointer p-2 rounded-md',
              {
                'bg-gray-200': item.link.tag === row.tag,
              }
            )}
            onClick={() => {
              changeRowAttrs({
                tag: item.link.tag as any,
              });
              onClose();
            }}
          >
            <div
              className={cls(
                'w-4 h-4 rounded-full',
                item.link.tag === row.tag ? 'bg-blue-500' : 'bg-gray-200'
              )}
            ></div>
            <div>{item.title}</div>
          </div>
        );
      })}
    </div>
  );
};

export const SettingRow = (props: GridMoreOptionsProps) => {
  const { currRowId, title } = props;
  const {
    cellsMap,
    moveRow,
    duplicateRowBatch,
    deleteRowBatch,
    changeRowAttrs,
    duplicateCellBatch,
    deleteCellBatch,
    clearActiveStatus,
    editorSDK,
    rowsGroup,
  } = useGridContext();
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);
  const currRowIdx = cellsMap.findIndex(row => row.id === currRowId);
  const currRow = cellsMap[currRowIdx];
  const isFirstRow = currRowIdx === 0;
  const isLastRow = currRowIdx === cellsMap.length - 1;
  const onlyOneRow = cellsMap.length === 1;

  const handleChangeRepeatList = (
    nextColCount: number,
    nextRowCount: number
  ) => {
    const cellsToAdd = nextColCount * nextRowCount - currRow.cells.length;
    if (cellsToAdd < 0) {
      deleteCellBatch(
        currRow.cells
          .slice(
            currRow.cells.length - Math.abs(cellsToAdd),
            currRow.cells.length
          )
          .map(cell => cell.id),
        {
          activeRowId: currRowId,
        }
      );
    } else {
      duplicateCellBatch(
        deepClone(currRow.cells).splice(0, nextColCount || 1),
        cellsToAdd / nextColCount,
        {
          activeRowId: currRowId,
        }
      );
    }
  };

  // useEffect(() => {
  //   if (!currRowId || !currRow) {
  //     return;
  //   }

  //   if (currRow.isRepeatList) {
  //     handleChangeRepeatList();
  //   }
  // }, [listRowCount, listColumnCount]);

  if (!currRowId || !currRow) {
    return null;
  }

  const listRowCount =
    currRow.repeatRowCount ||
    String(currRow.style?.gridTemplateRows)?.split(' ')?.length ||
    1;
  const listColumnCount =
    currRow.repeatColumnCount ||
    String(currRow.style?.gridTemplateColumns)?.split(' ')?.length ||
    1;

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
          row={currRow}
        />
      </ResponsiveDialog>
      <SettingSimpleModeRoot>
        <div className='footer_action'>
          {currRow.isRepeatList && (
            <>
              <Input
                placeholder='列'
                className='w-12 h-8 mr-2'
                value={listColumnCount}
                onChange={e => {
                  const value = Number(e.target.value);
                  if (!value) {
                    return;
                  }

                  const nextValue = value * listRowCount;

                  changeRowAttrs({
                    repeatColumnCount: value,
                    style: {
                      ...currRow.style,
                      gridTemplateColumns: Array(value).fill('1fr').join(' '),
                    },
                  });

                  handleChangeRepeatList(value, listRowCount);
                }}
              />
              <Input
                placeholder='行'
                className='w-12 h-8 mr-2'
                value={listRowCount}
                onChange={e => {
                  const value = Number(e.target.value);
                  if (!value) {
                    return;
                  }

                  const nextValue = value * listColumnCount;

                  changeRowAttrs({
                    repeatRowCount: value,
                    style: {
                      ...currRow.style,
                      gridTemplateRows: Array(value).fill('1fr').join(' '),
                    },
                  });

                  handleChangeRepeatList(listColumnCount, value);
                }}
              />
            </>
          )}
          <BtnLite2
            className={clas('col', currRow.isRepeatList && 'active')}
            onClick={e => {
              const nextValue = !currRow.isRepeatList;
              changeRowAttrs({
                isRepeatList: nextValue,
              });
            }}
          >
            列表
          </BtnLite2>
          {currRow.isRepeatList && (
            <BtnLite2
              className={clas('col', currRow.listReverse && 'active')}
              onClick={e => {
                changeRowAttrs({
                  listReverse: !currRow.listReverse,
                });
              }}
            >
              偶数翻转
            </BtnLite2>
          )}
          <BtnLite2
            className={clas('col', {
              disabled: isFirstRow,
            })}
            onClick={e => {
              if (isFirstRow) {
                return;
              }
              e.preventDefault();
              e.stopPropagation();
              const nextRowId = moveRow('up', {
                activeRowId: currRowId,
              });
              clearActiveStatus();
            }}
          >
            <ChevronUp size={20} />
          </BtnLite2>
          <BtnLite2
            className={clas('col', {
              disabled: isLastRow,
            })}
            onClick={e => {
              if (isLastRow) {
                return;
              }
              e.preventDefault();
              e.stopPropagation();
              const nextRowId = moveRow('down', {
                activeRowId: currRowId,
              });
              clearActiveStatus();
            }}
          >
            <ChevronDown size={20} />
          </BtnLite2>
          <BtnLite2
            className='col'
            onClick={e => {
              duplicateRowBatch([currRowId]);
              clearActiveStatus();
            }}
          >
            <Copy size={20} />
          </BtnLite2>
          <BtnLite2
            className={clas('col', {
              disabled: onlyOneRow,
            })}
            onClick={e => {
              if (onlyOneRow) {
                toast.error('至少保留一个页面');
                return;
              }

              deleteRowBatch([currRowId]);
              clearActiveStatus();
            }}
          >
            <Trash2 size={20} />
          </BtnLite2>
          <BtnLite2
            className='col'
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              if (!editorSDK) {
                return;
              }
              const copyRowCode = getCopyRowCode({
                cellsMap,
                editorSDK,
                widgetState: {
                  activeRowId: currRowId,
                },
                rowsGroup: rowsGroup,
                rowOnly: true,
              });
              console.log('copyRowCode', copyRowCode);
              if (!copyRowCode) {
                toast.error('请先选择一个元素');
                return;
              }
              navigator.clipboard.writeText(JSON.stringify(copyRowCode));
              toast.success('复制代码成功');
            }}
          >
            代码
          </BtnLite2>
          <BtnLite2
            className='col'
            onClick={e => {
              changeRowAttrs({
                groupByRowId: currRowId,
              });
            }}
          >
            独立Block
          </BtnLite2>
          <BtnLite2
            className='col'
            onClick={e => {
              setIsTagPickerOpen(true);
            }}
          >
            标签
          </BtnLite2>
        </div>
      </SettingSimpleModeRoot>
    </>
  );
};
