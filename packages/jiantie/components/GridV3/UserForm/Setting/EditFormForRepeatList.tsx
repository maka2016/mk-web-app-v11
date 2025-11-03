import styled from '@emotion/styled';
import { cdnApi, getPermissionData } from '@mk/services';
import { isPc } from '@mk/utils';
import { EditorSDK, LayerElemItem } from '@mk/works-store/types';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Copy, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useGridContext } from '../../comp/provider';
import { getCanvaInfo2 } from '../../comp/provider/utils';
import { GridCell, GridProps, GridState } from '../../shared';

// 通用的图片编辑判断函数
const isPictureEditable = (layer: LayerElemItem) => {
  const { attrs } = layer;
  const isDesigner = getPermissionData().materialProduct;

  // 如果是设计师，总是可以编辑
  if (isDesigner) {
    return true;
  }

  // 如果是自由元素，需要检查focusToEdit属性
  if (attrs.absoluteElem) {
    return attrs.focusToEdit === true;
  }

  // 非自由元素，检查disabledToEdit属性
  if (attrs.disabledToEdit === true) {
    return false;
  }

  // 检查图片尺寸和宽高比
  const aspectRatio =
    attrs.baseW && attrs.baseH ? attrs.baseW / attrs.baseH : 1;
  const imgWidth = attrs.baseW || 0;
  const canvaW = isPc() ? getCanvaInfo2().canvaW : window.innerWidth;

  // 宽高比在0.3-2之间，且宽度大于屏幕的1/4
  const sizeValid =
    aspectRatio > 0.3 && aspectRatio < 2 && imgWidth > canvaW / 4;

  return sizeValid;
};

const EditFormContainer = styled.div`
  padding: 12px 12px 0;
  overflow-y: auto;
  height: 100%;
  position: relative;
  .footer_actions {
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 12px;
    background-color: #fff;
    border-top: 1px solid #e5e5e5;
    display: flex;
    justify-content: center;
    gap: 12px;
  }
  .cell_group_container {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
`;

const FormSection = styled.div<{ isActive: boolean }>`
  margin-bottom: 16px;
  padding: 8px;
  border: 1px solid ${props => (props.isActive ? '#1a87ff' : '#e5e5e5')};
  border-radius: 6px;
  background-color: ${props => (props.isActive ? '#f0f8ff' : '#fafafa')};
  transition: all 0.2s;
`;

const FormSectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const FormSectionTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #333;
`;

const CellActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
  color: #666;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 12px;
    height: 12px;
    color: #666;
  }
`;

const FormRow = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const PicturePreview = styled.div`
  width: 80px;
  height: 80px;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: #1a87ff;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .placeholder {
    color: #999;
    font-size: 12px;
    text-align: center;
  }
`;

export interface EditFormForCopyableCellProps {
  formControledValues: GridProps;
  editorSDK: EditorSDK<GridProps, GridState>;
  widgetState: GridState;
  editorCtx: any;
  focusRender?: boolean;
}

const EditFormForCopyableCell = () => {
  const {
    widgetState,
    editorSDK,
    cellsMap,
    editorCtx,
    moveCell,
    deleteCellBatch,
    duplicateCellBatch,
    changeRowAttrs,
  } = useGridContext();
  const { activeRowId, activeCellId } = widgetState;
  const currRow = cellsMap.find(row => row.id === activeRowId);
  const cells = currRow?.cells || [];

  // 页面加载后滚动到激活的单元格
  useEffect(() => {
    if (activeCellId) {
      scrollToCell(activeCellId);
    } else {
      // 如果没有激活的单元格，但有可编辑的单元格，滚动到第一个可编辑的单元格
      const firstEditableCellIndex = cells.findIndex(cell => {
        if (!cell.childrenIds) return false;

        return cell.childrenIds.some(childId => {
          const layer = editorSDK?.getLayer(childId);
          if (!layer) return false;

          if (layer.elementRef === 'Text') {
            return true;
          } else if (layer.elementRef === 'Picture') {
            return isPictureEditable(layer);
          }

          return false;
        });
      });

      if (firstEditableCellIndex >= 0) {
        scrollToCell(cells[firstEditableCellIndex].id);
      }
    }
  }, []); // 只在组件挂载时执行一次

  const listColumnCount = currRow?.isRepeatList
    ? currRow.repeatColumnCount ||
      String(currRow.style?.gridTemplateColumns)?.split(' ')?.length
    : 1;

  const cellChunk: GridCell[][] = [];
  cells.forEach((cell, index) => {
    if (index % listColumnCount === 0) {
      cellChunk.push([]);
    }
    cellChunk[cellChunk.length - 1].push(cell);
  });

  if (!activeRowId) {
    return <span data-tip='none-repeat-list'></span>;
  }

  const renderTextForm = (layer: LayerElemItem, cell: GridCell) => {
    const { attrs } = layer;

    return (
      <FormRow
        key={layer.elemId}
        onClick={() => {
          handleCellActivate(cell.id);
        }}
      >
        <Input
          value={attrs.text || ''}
          onChange={e => {
            editorSDK?.changeCompAttr(layer.elemId, {
              text: e.target.value,
            });
          }}
          onPaste={e => {
            // 确保粘贴事件能正常工作
            // 方法1：使用传统的 clipboardData API
            const clipboardData =
              e.clipboardData || (window as any).clipboardData;
            if (clipboardData) {
              const pastedText = clipboardData.getData('text');
              if (pastedText) {
                const currentValue = attrs.text || '';
                const target = e.target as HTMLInputElement;
                const selectionStart = target.selectionStart || 0;
                const selectionEnd = target.selectionEnd || 0;

                // 构建新的文本值
                const newValue =
                  currentValue.substring(0, selectionStart) +
                  pastedText +
                  currentValue.substring(selectionEnd);

                editorSDK?.changeCompAttr(layer.elemId, {
                  text: newValue,
                });

                // 阻止默认粘贴行为，因为我们已经手动处理了
                e.preventDefault();
                return;
              }
            }

            // 方法2：作为备用方案，使用 setTimeout
            setTimeout(() => {
              const target = e.target as HTMLInputElement;
              const newValue = target.value;
              console.log('Pasted value (fallback):', newValue);
              editorSDK?.changeCompAttr(layer.elemId, {
                text: newValue,
              });
            }, 0);
          }}
          onFocus={() => {
            // 点击输入框时选中对应的单元格
            handleCellActivate(cell.id);
          }}
          placeholder='请输入文字内容'
        />
      </FormRow>
    );
  };

  const renderPictureForm = (layer: LayerElemItem, cell: GridCell) => {
    const { attrs } = layer;

    // 使用通用函数判断图片是否可编辑
    if (!isPictureEditable(layer)) {
      return null;
    }

    return (
      <FormRow key={layer.elemId}>
        <Label>更换图片</Label>
        <PicturePreview
          onClick={() => {
            // 点击图片预览时选中对应的单元格
            handleCellActivate(cell.id);

            editorCtx?.utils.showSelector({
              onSelected: (params: any) => {
                if (params.ossPath) {
                  editorSDK?.changeCompAttr(layer.elemId, {
                    ossPath: params.ossPath,
                  });
                }
              },
              type: 'picture',
            });
          }}
        >
          {attrs.ossPath ? (
            <img src={cdnApi(attrs.ossPath)} alt='图片预览' />
          ) : (
            <div className='placeholder'>点击选择图片</div>
          )}
        </PicturePreview>
      </FormRow>
    );
  };

  const renderElementForm = (layer: LayerElemItem, cell: GridCell) => {
    if (layer.elementRef === 'Text') {
      return renderTextForm(layer, cell);
    } else if (layer.elementRef === 'Picture') {
      return renderPictureForm(layer, cell);
    }
    return null;
  };

  const scrollToCell = (cellId: string) => {
    // 延迟执行，确保DOM更新完成
    setTimeout(() => {
      const cellElement = document.querySelector(`[data-cell-id="${cellId}"]`);
      if (cellElement) {
        cellElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      } else {
        console.log('cellElement not found', cellId);
      }
    }, 100);
  };

  const handleMoveCell = (cellId: string, direction: 'up' | 'down') => {
    moveCell(direction, {
      activeRowId: activeRowId,
      activeCellId: cellId,
    });

    editorSDK?.changeWidgetState({
      activeCellId: cellId,
    });

    // 滚动到移动后的单元格位置
    scrollToCell(cellId);
  };

  const handleDuplicateCell = (cells: GridCell[]) => {
    const nextCells = duplicateCellBatch(cells, 1, {
      activeRowId: activeRowId,
    });

    const nextRowCount = currRow?.repeatRowCount
      ? currRow.repeatRowCount + 1
      : 1;
    changeRowAttrs({
      repeatRowCount: nextRowCount,
      style: {
        ...(currRow?.style || {}),
        gridTemplateRows: Array(nextRowCount).fill('1fr').join(' '),
      },
    });

    const nextActiveCellId = nextCells?.[0] || '';
    editorSDK?.changeWidgetState({
      activeCellId: nextActiveCellId,
    });

    // 复制后滚动到复制的单元格位置
    scrollToCell(nextActiveCellId);
    toast.success('复制成功');
  };

  const handleDeleteCell = (cells: GridCell[]) => {
    deleteCellBatch(
      cells.map(cell => cell.id),
      {
        activeRowId: activeRowId,
      }
    );

    const nextRowCount = currRow?.repeatRowCount
      ? currRow.repeatRowCount - 1
      : 1;
    changeRowAttrs({
      repeatRowCount: nextRowCount,
      style: {
        ...(currRow?.style || {}),
        gridTemplateRows: Array(nextRowCount).fill('1fr').join(' '),
      },
    });
    toast.success('删除成功');
  };

  const handleCellActivate = (cellId: string) => {
    editorSDK?.changeWidgetState({
      activeCellId: cellId,
    });

    // 激活单元格时滚动到对应位置
    scrollToCell(cellId);
  };

  const renderCellForm = (cell: GridCell) => {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {cell.childrenIds?.map(childId => {
          const layer = editorSDK?.getLayer(childId);
          if (
            !layer ||
            !childId ||
            !/Text|Picture/.test(layer?.elementRef || '')
          ) {
            return null;
          }

          return renderElementForm(layer, cell);
        })}
      </div>
    );
  };

  // 检查是否有可编辑的元素
  const hasEditableElements = cells.some(cell => {
    if (!cell.childrenIds) return false;

    return cell.childrenIds.some(childId => {
      const layer = editorSDK?.getLayer(childId);
      if (!layer) return false;

      if (layer.elementRef === 'Text') {
        return true;
      } else if (layer.elementRef === 'Picture') {
        return isPictureEditable(layer);
      }

      return false;
    });
  });

  if (!hasEditableElements) {
    return (
      <EditFormContainer>
        <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
          没有可编辑的Text或Picture元素
        </div>
      </EditFormContainer>
    );
  }

  return (
    <EditFormContainer>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {cellChunk.map((cellItems, index) => {
          const isOdd = currRow?.listReverse && index % 2 !== 0;
          const cellIndex = cellItems.findIndex(c => c.id === cellItems[0].id);
          const canMoveUp = cellIndex > 0;
          const canMoveDown = cellIndex < cellItems.length - 1;
          const isActive = cellItems.some(c => c.id === activeCellId);
          return (
            <FormSection
              className='cell_group_container'
              key={`cell-${cellItems[0].id}_${index}`}
              isActive={isActive}
              data-cell-id={cellItems[0].id}
              onClick={e => {
                e.stopPropagation();
                handleCellActivate(cellItems[0].id);
              }}
            >
              <FormSectionHeader>
                <FormSectionTitle>列表项 {index + 1}</FormSectionTitle>
                <CellActions>
                  {/* <ActionButton
                    onClick={() => handleMoveCell(cells[0].id, "up")}
                    disabled={!canMoveUp}
                    title="上移"
                  >
                    <ChevronUp />
                    上移
                  </ActionButton>
                  <ActionButton
                    onClick={() => handleMoveCell(cells[0].id, "down")}
                    disabled={!canMoveDown}
                    title="下移"
                  >
                    <ChevronDown />
                    下移
                  </ActionButton> */}
                  <ActionButton
                    onClick={e => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleDuplicateCell(
                        isOdd ? cellItems.reverse() : cellItems
                      );
                    }}
                    title='复制'
                  >
                    <Copy />
                    复制
                  </ActionButton>
                  <ActionButton
                    onClick={e => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleDeleteCell(isOdd ? cellItems.reverse() : cellItems);
                    }}
                    title='删除'
                  >
                    <Trash2 />
                    删除
                  </ActionButton>
                </CellActions>
              </FormSectionHeader>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${listColumnCount}, 1fr)`,
                }}
              >
                {(isOdd ? cellItems.reverse() : cellItems).map(cell =>
                  renderCellForm(cell)
                )}
              </div>
            </FormSection>
          );
        })}
      </div>
      <div className='footer_actions'>
        <Button
          onClick={() => {
            handleDuplicateCell(cellChunk[0] || []);
          }}
        >
          添加内容
        </Button>
      </div>
    </EditFormContainer>
  );
};

export default function EditFormForCopyableCellWrapper() {
  const { widgetState, editorSDK } = useGridContext();
  return (
    <ResponsiveDialog
      isOpen={widgetState.showRepeatListEditor}
      onOpenChange={isOpen => {
        editorSDK?.changeWidgetState({
          showRepeatListEditor: isOpen,
        });
      }}
      title='列表编辑'
      className='h-full rounded-none'
    >
      <EditFormForCopyableCell />
    </ResponsiveDialog>
  );
}
