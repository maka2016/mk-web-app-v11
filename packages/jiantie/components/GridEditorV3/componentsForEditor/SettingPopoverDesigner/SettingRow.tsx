import { deepClone } from '@/utils';
import styled from '@emotion/styled';
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
  Code2,
  Component as ComponentIcon,
  Copy,
  LayoutDashboard,
  MoreHorizontal,
  MoreVertical,
  RefreshCcw,
  Square,
  Trash2,
  Unlink,
} from 'lucide-react';
import { toJS } from 'mobx';
import { observer } from 'mobx-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { BtnLite } from '../../components/style-comps';
import { assignIds } from '../../provider/gridPropsOperator';
import { ThemeConfigV2 } from '../../types';
import { useWorksStore } from '../../works-store/store/hook';
import GridTemplateFactory from '../AddCompHelperV2/GridTemplate';
import ListSettingForUser from '../ElementAttrsEditorV2/ListSettingForUser';
import AddElementPopover from '../SettingPopoverUser/AddElementPopover';
import ChangeComponentTriggerDialog from '../SettingPopoverUser/ChangeComponentTrigger';
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
  const worksStore = useWorksStore();
  const { worksData } = worksStore;
  const themeConfig = worksData.gridProps.themeConfig2 || ({} as ThemeConfigV2);
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

const SettingRow = (props: GridMoreOptionsProps) => {
  const { currRowId, title } = props;
  const worksStore = useWorksStore();
  const {
    widgetStateV2,
    setWidgetStateV2,
    worksData,
    clearActiveStatus,
    fullStack,
    themePackV3Operator,
  } = worksStore;
  const { gridProps } = worksData;
  const {
    getActiveRow,
    deleteRowBatchV2,
    createComponent2,
    setRowAttrsV2,
    copyRowV2,
    pasteRowV2,
    moveRowV2,
  } = worksStore.gridPropsOperator;
  const { activeRowDepth } = widgetStateV2;
  const currRow = getActiveRow();
  const { componentGroupData } = themePackV3Operator;
  const [isChangeTemplateOpen, setIsChangeTemplateOpen] = useState(false);

  const isActiveBlock = activeRowDepth?.length === 1;
  if (!currRowId || !currRow || isActiveBlock) {
    return null;
  }
  const isGrid = activeRowDepth?.length === 2;

  const isListItem = currRow?.isRepeatList;
  const isTable = currRow?.isTableView;
  const isComponent = !!currRow.componentGroupRefId;
  // const isTemplateMode = gridProps.worksCate !== 'theme';
  const isTemplateMode = false;

  const renderBtns = () => {
    return (
      <>
        <AddElementPopover />
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
                          themePackV3Operator.moveComponentToGroup(
                            currRow.sourceComponentId,
                            group.groupId
                          );
                          return;
                        }
                        try {
                          console.log('createRes', createRes);
                          themePackV3Operator.addComponentToGroup(
                            group.groupId,
                            createRes.data,
                            group.groupName
                          );
                          toast.success('添加组件成功');
                        } catch (error) {
                          // console.error('添加组件失败', error);
                          if (confirm('该组件已存在，是否覆盖？')) {
                            console.log('convertRes', createRes);
                            themePackV3Operator.updateComponentData(
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
            <ChangeComponentTriggerDialog
              dataType={'components'}
              replaceCurrentRow={true}
              showAllComponent={false}
              trigger={(open, setOpen) => {
                return (
                  <BtnLite2
                    onClick={() => {
                      setOpen(true);
                    }}
                  >
                    <LayoutDashboard size={20} />
                    换版式
                  </BtnLite2>
                );
              }}
            />
          </>
        )}
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
        <BtnLite
          onClick={() => {
            const currRow = getActiveRow();
            if (!currRow) {
              return;
            }
            console.log('code', JSON.stringify(toJS(currRow)));
            navigator.clipboard.writeText(JSON.stringify(toJS(currRow)));

            toast.success('复制成功');
          }}
        >
          <Code2 size={20} />
        </BtnLite>
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
              <BtnLite2 onClick={e => { }}>
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
                  themePackV3Operator.updateComponentData(
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

export default observer(SettingRow);
