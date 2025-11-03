import styled from '@emotion/styled';
import { getPermissionData } from '@mk/services';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@workspace/ui/components/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import clas from 'classnames';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  MoreHorizontal,
  PanelsTopLeft,
  Plus,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import ThemePages from '../../../UserForm/PageNavigationV2/themePages';
import { useGridContext } from '../../../comp/provider';
import { getCanvaInfo2 } from '../../../comp/provider/utils';
import { deepClone, scrollToActiveRow } from '../../../shared';
import { BtnLite } from '../../../shared/style-comps';
import MaterialComponents from '../../ThemeLayoutLibraryV3/MaterialComponents';
import { SettingBlockDesigner } from './SettingBlockDesigner';

const SettingSimpleModeRoot = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  z-index: 222;
  display: flex;
  justify-content: end;
  padding: 4px;
  pointer-events: none;
  /* background-color: rgba(253, 115, 140, 0.3); */
  .title {
    font-size: 16px;
    font-weight: bold;
    color: #333;
    display: flex;
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

const ActionArea = styled.div``;

interface GridMoreOptionsProps {
  blockIdx: number;
}

export const SettingBlock = (props: GridMoreOptionsProps) => {
  const { blockIdx } = props;
  const {
    editorSDK,
    gridsData,
    gridProps,
    worksDetail,
    moveRowV2,
    copyRowV2,
    pasteRowV2,
    getRowByDepth,
    deleteRowBatchV2,
    getActiveRootRow,
    addRowFromTemplateV2,
    setWidgetStateV2,
    widgetStateV2,
  } = useGridContext();
  const [templateShow, setTemplateShow] = useState<'replace' | 'add' | ''>('');
  const [popoverShow, setPopoverShow] = useState(false);
  const isDesigner = getPermissionData().materialProduct;
  const canvaInfo = getCanvaInfo2();
  // console.log("canvaInfo", canvaInfo);
  const { maxPageCount } = canvaInfo;

  if (isDesigner) {
    return <SettingBlockDesigner blockIdx={blockIdx} />;
  }

  if (!worksDetail.specInfo.is_flat_page) {
    return null;
  }
  return null;

  const isActiveBlock = widgetStateV2?.activeRowDepth?.[0] === blockIdx;
  const currBlock = gridsData[blockIdx];
  const onlyOnePage = gridsData.length === 1;
  const blockId = currBlock?.id || '';
  const isFirstRow = blockIdx === 0;
  const isLastRow = blockIdx === gridsData.length - 1;

  if (onlyOnePage) {
    return null;
  }

  const addPageable = gridsData.length < maxPageCount;

  const renderPageOperate = () => {
    return (
      <ActionArea className='flex flex-col'>
        <span className='label px-2 mb-2'>编辑第{blockIdx + 1}页</span>
        <BtnLite
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            setTemplateShow('replace');
          }}
        >
          <PanelsTopLeft size={20} />
          更换版式
        </BtnLite>
        {addPageable && (
          <>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <BtnLite className='' onClick={e => {}}>
                  <Copy size={20} />
                  复制卡片
                </BtnLite>
              </AlertDialogTrigger>
              <AlertDialogContent className='w-[320px]'>
                <AlertDialogHeader>
                  <AlertDialogTitle>想要复制这个画布吗？</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      // 使用新的 duplicateRowBatch 函数
                      copyRowV2({
                        activeRowDepth: [blockIdx],
                      });
                      const nextRowDepth = [blockIdx + 1];
                      pasteRowV2();
                      setWidgetStateV2({
                        activeRowDepth: nextRowDepth,
                        editingElemId: undefined,
                      });
                      // const newRowIds = duplicateRowBatchV2([blockId], {
                      //   repeatCount: 1,
                      //   insertToParent: true,
                      // });

                      // 滚动到第一个新复制的行
                      scrollToActiveRow(getRowByDepth(nextRowDepth)?.id || '');

                      toast.success('复制成功');
                      setPopoverShow(false);
                    }}
                  >
                    复制卡片
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <BtnLite
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                setTemplateShow('add');
                setPopoverShow(false);
              }}
            >
              <Plus size={20} />
              新建卡片
            </BtnLite>
          </>
        )}
        {!isFirstRow && (
          <BtnLite
            className={clas({
              disabled: isFirstRow,
            })}
            onClick={e => {
              if (isFirstRow) {
                return;
              }
              e.preventDefault();
              e.stopPropagation();
              moveRowV2('up', {
                activeRowDepth: [blockIdx],
              });
              setWidgetStateV2({
                activeRowDepth: [blockIdx - 1],
                editingElemId: undefined,
              });
              scrollToActiveRow(blockId);
              setPopoverShow(false);
            }}
          >
            <ChevronUp size={20} />
            上移
          </BtnLite>
        )}
        {!isLastRow && (
          <BtnLite
            className={clas({
              disabled: isLastRow,
            })}
            onClick={e => {
              if (isLastRow) {
                return;
              }
              e.preventDefault();
              e.stopPropagation();
              moveRowV2('down', {
                activeRowDepth: [blockIdx],
              });
              setWidgetStateV2({
                activeRowDepth: [blockIdx + 1],
                editingElemId: undefined,
              });
              scrollToActiveRow(blockId);
              setPopoverShow(false);
            }}
          >
            <ChevronDown size={20} />
            下移
          </BtnLite>
        )}
        {!onlyOnePage && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <BtnLite className={clas('text-red-500')}>
                <Trash2 size={20} />
                删除
              </BtnLite>
            </AlertDialogTrigger>
            <AlertDialogContent className='w-[320px]'>
              <AlertDialogHeader>
                <AlertDialogTitle>确定要删除这个页面吗？</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={e => {
                    deleteRowBatchV2([blockId]);
                    toast.success('删除成功');
                    setPopoverShow(false);
                  }}
                >
                  删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </ActionArea>
    );
  };

  if (!isActiveBlock) {
    return null;
  }

  return (
    <>
      <SettingSimpleModeRoot className='SettingSimpleModeRoot'>
        <Popover open={popoverShow} onOpenChange={setPopoverShow}>
          <PopoverTrigger asChild>
            <BtnLite
              className='pointer-events-auto shadow-md'
              style={{ padding: 4 }}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                setPopoverShow(!popoverShow);
                setWidgetStateV2({
                  activeRowDepth: [blockIdx],
                  editingElemId: undefined,
                });
              }}
            >
              <MoreHorizontal size={20} />
            </BtnLite>
          </PopoverTrigger>
          <PopoverContent
            className='w-fit min-w-[148px] p-2'
            side='bottom'
            align='start'
          >
            {renderPageOperate()}
          </PopoverContent>
        </Popover>
      </SettingSimpleModeRoot>
      <ResponsiveDialog
        isOpen={!!templateShow}
        handleOnly={true}
        showOverlay={false}
        onOpenChange={open => {
          if (open) {
            setTemplateShow('add');
          } else {
            setTemplateShow('');
          }
        }}
        title={`替换第${(blockIdx || 0) + 1}页`}
        contentProps={{
          className: 'pt-2 h-[60vh]',
        }}
      >
        {gridProps.themePackV3RefId ? (
          <MaterialComponents
            manager={false}
            itemAspectRatio='3/4'
            activeComponentGroupId={currBlock.componentGroupRefId}
            dataType='blocks'
            onComponentClick={c => {
              // console.log('c', c);
              // return;
              const component = deepClone(c);
              try {
                if (currBlock.sourceComponentId === component.compId) {
                  toast('当前组件已经是该组件变体');
                  return;
                }
                component.data.rows[0].componentGroupRefId =
                  currBlock.componentGroupRefId;
                component.data.rows[0]._id = currBlock.id;
                addRowFromTemplateV2(component.data, undefined, true);
                toast.success(`已切换到: ${component.compName || '未命名'}`);
              } catch (error) {
                console.error('切换组件失败', error);
                toast.error('切换失败');
              }
              setTemplateShow('');
            }}
          />
        ) : (
          <ThemePages
            onSelect={item => {
              const replaceMode = templateShow === 'replace';
              const { copiedRowDepth } = addRowFromTemplateV2(
                item.content,
                {
                  activeRowDepth: [widgetStateV2?.activeRowDepth?.[0] || 0],
                },
                replaceMode
              );
              // onChange();
              if (!replaceMode) {
                setWidgetStateV2({
                  activeRowDepth: copiedRowDepth,
                  activeCellId: undefined,
                  editingElemId: undefined,
                });
                scrollToActiveRow(
                  getRowByDepth(copiedRowDepth || [])?.id || ''
                );
              }
              setTemplateShow('');
            }}
            onClose={() => {
              setTemplateShow('');
            }}
          />
        )}
      </ResponsiveDialog>
    </>
  );
};
