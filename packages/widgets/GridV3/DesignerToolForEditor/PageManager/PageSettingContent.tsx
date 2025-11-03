import styled from '@emotion/styled';
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
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import clas from 'classnames';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  PanelsTopLeft,
  Plus,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import PageNavigationV2 from '../../UserForm/PageNavigationV2';
import ThemePages from '../../UserForm/PageNavigationV2/themePages';
import { useGridContext } from '../../comp/provider';
import { getCanvaInfo2 } from '../../comp/provider/utils';
import { deepClone, scrollToActiveRow } from '../../shared';
import { BtnLite as BtnLiteBase } from '../../shared/style-comps';
import MaterialComponents from '../ThemeLayoutLibraryV3/MaterialComponents';

const BtnLite = styled(BtnLiteBase)`
  gap: 4px;
  font-size: 12px;
`;

interface PageSettingContentProps {
  blockIdx: number;
}

export function PageSettingContent({ blockIdx }: PageSettingContentProps) {
  const {
    gridsData,
    gridProps,
    copyRowV2,
    pasteRowV2,
    getRowByDepth,
    deleteRowBatchV2,
    addRowFromTemplateV2,
    setWidgetStateV2,
    moveRowV2,
    widgetStateV2,
  } = useGridContext();
  const [templateShow, setTemplateShow] = useState<'replace' | 'add' | ''>('');
  const [addPageShow, setAddPageShow] = useState(false);
  const canvaInfo = getCanvaInfo2();
  const { maxPageCount } = canvaInfo;

  const currBlock = gridsData[blockIdx];
  const onlyOnePage = gridsData.length === 1;
  const blockId = currBlock?.id || '';
  const addPageable = gridsData.length < maxPageCount;
  const isFirstRow = blockIdx === 0;
  const isLastRow = blockIdx === gridsData.length - 1;

  if (onlyOnePage) {
    return null;
  }

  return (
    <>
      <div className='flex items-center gap-1'>
        {addPageable && (
          <BtnLite
            direction='column'
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              setWidgetStateV2({
                editingElemId: undefined,
                activeRowDepth: [blockIdx],
              });
              setAddPageShow(true);
            }}
          >
            <Plus size={18} />
            <span className='text-sm'>新增</span>
          </BtnLite>
        )}
        <BtnLite
          direction='column'
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            setTemplateShow('replace');
          }}
        >
          <PanelsTopLeft size={18} />
          <span className='text-sm'>更换</span>
        </BtnLite>
        {!isFirstRow && (
          <BtnLite
            direction='column'
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
            }}
          >
            <ChevronUp size={20} />
            上移
          </BtnLite>
        )}
        {!isLastRow && (
          <BtnLite
            direction='column'
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
            }}
          >
            <ChevronDown size={20} />
            下移
          </BtnLite>
        )}
        {addPageable && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <BtnLite direction='column'>
                <Copy size={18} />
                <span className='text-sm'>复制</span>
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
                    copyRowV2({
                      activeRowDepth: [blockIdx],
                    });
                    const nextRowDepth = [blockIdx + 1];
                    pasteRowV2();
                    setWidgetStateV2({
                      activeRowDepth: nextRowDepth,
                      editingElemId: undefined,
                    });
                    scrollToActiveRow(getRowByDepth(nextRowDepth)?.id || '');
                    toast.success('复制成功');
                  }}
                >
                  复制卡片
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {!onlyOnePage && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <BtnLite direction='column' className='text-red-500'>
                <Trash2 size={18} />
                <span className='text-sm'>删除</span>
              </BtnLite>
            </AlertDialogTrigger>
            <AlertDialogContent className='w-[320px]'>
              <AlertDialogHeader>
                <AlertDialogTitle>确定要删除这个页面吗？</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    deleteRowBatchV2([blockId]);
                    setWidgetStateV2({
                      activeRowDepth: [blockIdx - 1],
                      editingElemId: undefined,
                    });
                    toast.success('删除成功');
                  }}
                >
                  删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
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
              const component = deepClone(c);
              try {
                toast.dismiss();
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
      <ResponsiveDialog
        isOpen={addPageShow}
        handleOnly={true}
        showOverlay={false}
        onOpenChange={setAddPageShow}
        title='添加页面'
        contentProps={{
          className: 'pt-2 h-[60vh]',
        }}
      >
        {gridProps.themePackV3RefId?.worksId ? (
          <MaterialComponents
            manager={false}
            dataType='blocks'
            onComponentClick={c => {
              const component = deepClone(c);
              try {
                component.data.rows[0].componentGroupRefId =
                  currBlock?.componentGroupRefId;
                component.data.rows[0]._id = currBlock?.id;
                const { copiedRowDepth } = addRowFromTemplateV2(
                  component.data,
                  {
                    activeRowDepth: [blockIdx],
                  },
                  false
                );
                scrollToActiveRow(
                  getRowByDepth(copiedRowDepth || [])?.id || ''
                );
                setWidgetStateV2({
                  activeRowDepth: copiedRowDepth,
                  editingElemId: undefined,
                });
                toast.success(
                  `添加页面 ${component.compName || '未命名'} 成功`
                );
              } catch (error) {
                console.error('添加页面失败', error);
                toast.error('添加失败');
              }
              setAddPageShow(false);
            }}
          />
        ) : (
          <PageNavigationV2
            onClose={() => setAddPageShow(false)}
            onChange={() => {
              setAddPageShow(false);
            }}
          />
        )}
      </ResponsiveDialog>
    </>
  );
}
