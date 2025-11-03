import styled from '@emotion/styled';
import { deepClone } from '@mk/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import cls from 'classnames';
import {
  ArrowDownFromLine,
  ArrowUpFromLine,
  Component as ComponentIcon,
  Copy,
  MoreHorizontal,
  MoreVertical,
  RefreshCcw,
  Square,
  Trash2,
  Unlink,
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useGridContext } from '../../../comp/provider';
import { assignIds } from '../../../comp/provider/operatorV2';
import { BtnLite } from '../../../shared/style-comps';
import GridTemplateFactory from '../../AddCompHelperV2/GridTemplate';
import ListSettingForUser from '../../ElementAttrsEditorV2/ListSettingForUser';
import GridLayoutLibraryPublished from '../../GridLibrary/list';
import { ChangeRowTrigger } from '../../ThemeLayoutLibraryV3/ChangeComponentTrigger';
import ComponentGroupSelector from './ComponentGroupSelector';
import { TagPicker } from './TagPicker';

const BtnLite2 = styled(BtnLite)`
  background-color: transparent;
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
`;

interface GridMoreOptionsProps {
  currRowId?: string;
  title: string;
}

const TagPickerPopoverForRow = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <BtnLite
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Square size={20} />
        边框
      </BtnLite>
      <ResponsiveDialog isOpen={open} onOpenChange={setOpen} title='卡片边框'>
        <TagPicker
          replaceMode={true}
          noTitle={true}
          onClose={() => {
            setOpen(false);
          }}
        />
      </ResponsiveDialog>
    </>
  );
};

const ListItemPicker = ({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (item: any) => void;
}) => {
  const { themeConfig } = useGridContext();
  const items = GridTemplateFactory(themeConfig, {
    isRepeatList: false,
    labelPrefix: '版式',
  });
  return (
    <div className='p-4'>
      {items.map(item => {
        const { Component } = item as any;
        return (
          <div
            key={item.title}
            className={cls('p-2 rounded-md cursor-pointer', {})}
            onClick={() => {
              console.log('item', item);
              onSelect(deepClone(item));
              onClose();
            }}
          >
            <Component {...item} />
          </div>
        );
      })}
    </div>
  );
};

export const SettingRow = (props: GridMoreOptionsProps) => {
  const { currRowId, title } = props;
  const {
    getActiveRow,
    getRowByDepth,
    widgetStateV2,
    deleteRowBatchV2,
    clearActiveStatus,
    fullStack,
    gridProps,
    createComponent2,
    themePackV3Data,
    setRowAttrsV2,
    addRowFromTemplateV2,
    copyRowV2,
    pasteRowV2,
    moveRowV2,
    setWidgetStateV2,
  } = useGridContext();
  const { activeRowDepth } = widgetStateV2;
  const currRow = getActiveRow();
  const { componentGroupData } = themePackV3Data;
  const [isChangeTemplateOpen, setIsChangeTemplateOpen] = useState(false);
  const [isChangeGridTemplateOpen, setIsChangeGridTemplateOpen] =
    useState(false);

  const isActiveBlock = activeRowDepth?.length === 1;
  if (!currRowId || !currRow || isActiveBlock) {
    return null;
  }
  const isGrid = activeRowDepth?.length === 2;

  const isListItem = currRow?.isRepeatList;
  const isTable = currRow?.isTableView;
  const isComponent = !!currRow.componentGroupRefId;
  const isTemplateMode = gridProps.worksCate !== 'theme';

  const renderBtns = () => {
    return (
      <>
        {fullStack && (
          <>
            {isGrid && !isTemplateMode && (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <BtnLite2
                      isActive={isComponent}
                      activeColor={isComponent ? '#9747ff' : ''}
                      onClick={e => {
                        if (!gridProps.themePackV3) {
                          toast.error('请先保存主题');
                          (
                            document.querySelector('#save_theme_btn') as any
                          )?.click();
                          return;
                        }
                        if (currRow.componentGroupRefId) {
                          // toast('已保存为组件');
                          // 将url的tab字段设置为component
                          const url = new URL(window.location.href);
                          url.searchParams.set('tab', 'components');
                          window.history.replaceState({}, '', url.toString());
                        }
                        setWidgetStateV2({
                          activeRowDepth: activeRowDepth,
                        });
                      }}
                    >
                      <ComponentIcon size={20} />
                    </BtnLite2>
                  </PopoverTrigger>
                  <PopoverContent
                    className='w-[300px] min-w-[148px] p-2'
                    side='bottom'
                    align='start'
                  >
                    <ComponentGroupSelector
                      componentGroupData={componentGroupData}
                      activeGroupId={currRow.componentGroupRefId}
                      onSelect={group => {
                        const createRes = createComponent2(
                          undefined,
                          group.groupId
                        );
                        if (!createRes) {
                          toast.error('请先选择一个元素');
                          return;
                        }
                        if (
                          currRow.componentGroupRefId &&
                          currRow.sourceComponentId
                        ) {
                          // 移动到目标组
                          themePackV3Data.moveComponentToGroup(
                            currRow.sourceComponentId,
                            group.groupId
                          );
                          return;
                        }
                        try {
                          console.log('createRes', createRes);
                          themePackV3Data.addComponentToGroup(
                            group.groupId,
                            createRes.data,
                            group.groupName
                          );
                          toast.success('添加组件成功');
                        } catch (error) {
                          // console.error('添加组件失败', error);
                          if (confirm('该组件已存在，是否覆盖？')) {
                            console.log('convertRes', createRes);
                            themePackV3Data.updateComponentData(
                              createRes.componentGroupId,
                              createRes.data
                            );
                            toast('已更新组件');
                          } else {
                            toast('已取消更新组件');
                          }
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </>
            )}
            {!isTemplateMode && <TagPickerPopoverForRow />}
          </>
        )}
        {isComponent && (
          <>
            <ChangeRowTrigger triggerLabel={fullStack ? '换组件' : '换版式'} />
          </>
        )}
        {/* <BtnLite2
            onClick={(e) => {
              setIsChangeGridTemplateOpen(true);
            }}
          >
            换版式
          </BtnLite2> */}
        {/* {(isComponent || isInComponent) && (
          <BtnLite2
            onClick={e => {
              setIsChangeComponentOpen(true);
            }}
          >
            <LayoutDashboard size={20} />
            换版式
          </BtnLite2>
        )} */}
        <BtnLite2
          onClick={e => {
            // 使用新的 duplicateRowBatch 函数
            copyRowV2();
            const { copiedRowDepth } = pasteRowV2();
            setWidgetStateV2({
              activeRowDepth: copiedRowDepth,
              editingElemId: undefined,
            });

            toast.success('复制成功');
          }}
        >
          <Copy size={20} />
          {/* 复制 */}
        </BtnLite2>
        <BtnLite2
          onClick={e => {
            // 使用新的 duplicateRowBatch 函数
            deleteRowBatchV2([currRowId]);
            clearActiveStatus();

            toast.success('删除成功');
          }}
        >
          <Trash2 size={20} />
          {/* 删除 */}
        </BtnLite2>
        <BtnLite2
          onClick={e => {
            // 使用新的 duplicateRowBatch 函数
            if (activeRowDepth) {
              moveRowV2('up');
              const nextRowDepth = [
                ...activeRowDepth.slice(0, -1),
                activeRowDepth[activeRowDepth.length - 1] - 1,
              ];
              setWidgetStateV2({
                activeRowDepth: nextRowDepth,
                editingElemId: undefined,
              });
            }
          }}
        >
          <ArrowUpFromLine size={20} />
          {/* 上移 */}
        </BtnLite2>
        <BtnLite2
          onClick={e => {
            // 使用新的 duplicateRowBatch 函数
            if (activeRowDepth) {
              moveRowV2('down');
              const nextRowDepth = [
                ...activeRowDepth.slice(0, -1),
                activeRowDepth[activeRowDepth.length - 1] + 1,
              ];
              setWidgetStateV2({
                activeRowDepth: nextRowDepth,
                editingElemId: undefined,
              });
            }
          }}
        >
          <ArrowDownFromLine size={20} />
          {/* 下移 */}
        </BtnLite2>
        {/* {fullStack && !isTable && isListItem && (
          <BtnLite2
            onClick={e => {
              setIsChangeTemplateOpen(true);
            }}
          >
            换布局
          </BtnLite2>
        )} */}
        {fullStack && isComponent && (
          <Popover>
            <PopoverTrigger asChild>
              <BtnLite2 onClick={e => {}}>
                <MoreVertical size={20} />
              </BtnLite2>
            </PopoverTrigger>
            <PopoverContent
              className='w-[148px] p-2 px-1'
              side='bottom'
              align='end'
            >
              <BtnLite2
                onClick={() => {
                  const createRes = createComponent2();
                  if (!createRes) {
                    toast.error('请先选择一个元素');
                    return;
                  }
                  themePackV3Data.updateComponentData(
                    createRes.componentGroupId,
                    createRes.data
                  );
                  toast.success('同步组件成功');
                }}
              >
                <RefreshCcw size={16} />
                同步到组件库
              </BtnLite2>
              <BtnLite2
                style={{
                  color: 'red',
                }}
                onClick={() => {
                  setRowAttrsV2({
                    componentGroupRefId: undefined,
                    sourceComponentId: undefined,
                  });
                  toast.success('取消组件成功');
                }}
              >
                <Unlink size={16} />
                取消组件关联
              </BtnLite2>
            </PopoverContent>
          </Popover>
        )}
        {/* 设计师功能 */}
        {/* {fullStack && (
          <>
            <BtnLite2
              className='col'
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                if (!editorSDK) {
                  return;
                }
                const copyRowCode = getCopyRowCodeWithGroup();
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
          </>
        )} */}
      </>
    );
  };

  const renderFooterAction = () => {
    if (isListItem) {
      return (
        <>
          <div className='p-1'>
            <ListSettingForUser />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <BtnLite>
                <MoreHorizontal size={20} />
              </BtnLite>
            </PopoverTrigger>
            <PopoverContent
              className='w-fit min-w-[148px] p-2'
              side='bottom'
              align='start'
            >
              {renderBtns()}
            </PopoverContent>
          </Popover>
        </>
      );
    }
  };
  const renderFooterAction2 = () => {
    if (isListItem) {
      return (
        <>
          <div className='p-1'>
            <ListSettingForUser />
          </div>
          {renderBtns()}
        </>
      );
    }
    return renderBtns();
  };

  return (
    <>
      {renderFooterAction2()}
      <ResponsiveDialog
        isOpen={isChangeTemplateOpen}
        onOpenChange={nextVal => {
          setIsChangeTemplateOpen(nextVal);
        }}
        contentProps={{
          className: 'w-[400px]',
        }}
      >
        <ListItemPicker
          onClose={() => {
            setIsChangeTemplateOpen(false);
          }}
          onSelect={item => {
            setRowAttrsV2(assignIds(item.attrs) as any);
            setIsChangeTemplateOpen(false);
          }}
        />
      </ResponsiveDialog>
      <ResponsiveDialog
        isDialog={false}
        isOpen={isChangeGridTemplateOpen}
        onOpenChange={nextVal => {
          setIsChangeGridTemplateOpen(nextVal);
        }}
        title='换版式'
        contentProps={{
          className: 'h-[75vh]',
        }}
      >
        <GridLayoutLibraryPublished
          onItemSelect={data => {
            console.log('data', data);
            addRowFromTemplateV2(data, undefined, true);
            setIsChangeGridTemplateOpen(false);
          }}
        />
      </ResponsiveDialog>
      {/* <ResponsiveDialog
        isOpen={isChangeComponentOpen}
        onOpenChange={nextVal => {
          setIsChangeComponentOpen(nextVal);
        }}
        title='切换变体'
        contentProps={{
          className: 'h-[75vh]',
        }}
      >
        <MaterialComponentSelector
          componentGroupRefId={currRow.componentGroupRefId}
          onSelect={() => {
            setIsChangeComponentOpen(false);
          }}
        />
      </ResponsiveDialog> */}
    </>
  );
};
