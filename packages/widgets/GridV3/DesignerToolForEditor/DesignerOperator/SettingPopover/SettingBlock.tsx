import React, { useState } from 'react';
import {
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  CodeXml,
  Copy,
  Trash2,
} from 'lucide-react';
import { BtnLite } from '../../../shared/style-comps';
import styled from '@emotion/styled';
import toast from 'react-hot-toast';
import clas from 'classnames';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@workspace/ui/components/alert-dialog';
import ThemePages from '../../../UserForm/PageNavigation/themePages';
import { useGridContext } from '../../../comp/provider';
import { scrollToActiveRow } from '../../../shared';
import { getPermissionData } from '@mk/services';
import FreeLayerContent from '../FreeLayerContent';
import { getCopyRowCode } from '../../../comp/provider/operator';
import { getCanvaInfo2 } from '../../../comp/provider/utils';

const BtnLite2 = styled(BtnLite)`
  background-color: transparent;
  padding: 8px;
`;

const SettingSimpleModeRoot = styled.div`
  position: relative;
  z-index: 12;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #f5f5f5;
  padding: 24px 0 0;
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

interface GridMoreOptionsProps {
  rowIds: string[];
  title: string;
  blockIdx: number;
}

export const SettingBlock = (props: GridMoreOptionsProps) => {
  const { rowIds, title, blockIdx } = props;
  const {
    editorSDK,
    rowsGroup,
    cellsMap,
    moveRow,
    duplicateRowBatch,
    deleteRowBatch,
    addRowFromTemplate,
  } = useGridContext();
  const [templateShow, setTemplateShow] = useState(false);
  if (!rowIds) {
    return null;
  }
  const canvaInfo2 = getCanvaInfo2();
  const canOperatePage = canvaInfo2?.maxPageCount > 1;
  const blockId = rowIds[0];
  const isFirstRow = blockIdx === 0;
  const isLastRow = blockIdx === rowsGroup.length - 1;
  const isDesigner = getPermissionData().materialProduct;

  const renderPageOperate = () => {
    return (
      <div className='footer_action'>
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
            moveRow('up', {
              activeRowId: blockId,
            });
            scrollToActiveRow(blockId);
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
            moveRow('down', {
              activeRowId: blockId,
            });
            scrollToActiveRow(blockId);
          }}
        >
          <ChevronDown size={20} />
        </BtnLite2>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <BtnLite2 className='col' onClick={e => {}}>
              <Copy size={20} />
            </BtnLite2>
          </AlertDialogTrigger>
          <AlertDialogContent className='w-[320px]'>
            <AlertDialogHeader>
              <AlertDialogTitle>想要复制这个模块吗？</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  // 使用新的 duplicateRowBatch 函数
                  const newRowIds = duplicateRowBatch(rowIds);

                  // 滚动到第一个新复制的行
                  scrollToActiveRow(newRowIds?.[0]);

                  toast.success('复制成功');
                }}
              >
                复制
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <BtnLite2
              className={clas('col', {
                // disabled: onlyOneBlock,
              })}
              onClick={e => {
                // if (onlyOneBlock) {
                //   toast.error("至少保留一个模块");
                //   return;
                // }
              }}
            >
              <Trash2 size={20} />
            </BtnLite2>
          </AlertDialogTrigger>
          <AlertDialogContent className='w-[320px]'>
            <AlertDialogHeader>
              <AlertDialogTitle>确定要删除这个页面吗？</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={e => {
                  deleteRowBatch(rowIds);
                  toast.success('删除成功');
                }}
              >
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {isDesigner && <FreeLayerContent blockId={blockId} />}
      </div>
    );
  };

  return (
    <SettingSimpleModeRoot>
      <div className='title'>
        {isDesigner ? (
          <>
            <BtnLite2
              className='trggier px-2'
              style={{
                pointerEvents: 'auto',
              }}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                editorSDK?.changeWidgetState({
                  activeRowId: blockId,
                  showCreateLayoutForm: true,
                });
              }}
            >
              保存Block
            </BtnLite2>
            <BtnLite2
              title='复制代码'
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
                    activeRowId: blockId,
                  },
                  rowsGroup,
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
              <CodeXml size={20} />
            </BtnLite2>
          </>
        ) : (
          <BtnLite2
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              setTemplateShow(true);
            }}
          >
            <ArrowRightLeft size={20} />
            更换排版
          </BtnLite2>
        )}
      </div>
      {(canOperatePage || isDesigner) && renderPageOperate()}
      <ResponsiveDialog
        isOpen={templateShow}
        handleOnly={true}
        showOverlay={false}
        onOpenChange={setTemplateShow}
        title={`替换第${(blockIdx || 0) + 1}页`}
        contentProps={{
          className: 'pt-2 h-[60vh]',
        }}
      >
        <ThemePages
          templateId={editorSDK?.fullSDK.worksDetail.template_id}
          onChange={data => {
            if (!editorSDK) {
              return;
            }
            const nextRowIds = addRowFromTemplate(
              data.content,
              {
                activeRowId: blockId,
              },
              rowIds
            );
            console.log('nextRowIds', nextRowIds);
            scrollToActiveRow(nextRowIds?.[0]);
          }}
        />
      </ResponsiveDialog>
    </SettingSimpleModeRoot>
  );
};
