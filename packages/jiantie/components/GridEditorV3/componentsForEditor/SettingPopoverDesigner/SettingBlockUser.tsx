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
import clas from 'classnames';
import { ChevronLeft, ChevronRight, Copy, Trash2 } from 'lucide-react';
import { observer } from 'mobx-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { BtnLite } from '../../components/style-comps';
import { scrollToActiveRow } from '../../utils';
import { useWorksStore } from '../../works-store/store/hook';

const BtnLite2 = styled(BtnLite)`
  background-color: transparent;
  padding: 8px;
`;

const SettingSimpleModeRoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  blockIdx: number;
}

const SettingBlockUser = (props: GridMoreOptionsProps) => {
  const { blockIdx } = props;
  const worksStore = useWorksStore();
  const { worksData, worksDetail } = worksStore;
  const { gridProps } = worksData;
  const gridsData = gridProps.gridsData;
  const { setWidgetStateV2, gridPropsOperator } = worksStore;
  const { copyRowV2, pasteRowV2, getRowByDepth, deleteRowBatchV2 } =
    gridPropsOperator;
  const currBlock = gridsData[blockIdx];
  const blockId = currBlock?.id || '';
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!worksDetail.specInfo.is_flip_page) {
    return null;
  }

  // 翻页功能
  const totalPages = gridsData.length;
  const currentPage = blockIdx + 1;

  const handlePrevPage = () => {
    if (blockIdx > 0) {
      const prevRowDepth = [blockIdx - 1];
      setWidgetStateV2({
        activeRowDepth: prevRowDepth,
        editingElemId: undefined,
      });
      scrollToActiveRow(getRowByDepth(prevRowDepth)?.id || '');
    }
  };

  const handleNextPage = () => {
    if (blockIdx < totalPages - 1) {
      const nextRowDepth = [blockIdx + 1];
      setWidgetStateV2({
        activeRowDepth: nextRowDepth,
        editingElemId: undefined,
      });
      scrollToActiveRow(getRowByDepth(nextRowDepth)?.id || '');
    }
  };

  return (
    <div style={{ position: 'relative', backgroundColor: '#eee' }}>
      <SettingSimpleModeRoot>
        <div className='title'>
          <BtnLite2
            className='trggier px-2'
            style={{
              pointerEvents: 'auto',
            }}
          >
            {currBlock.name || `画布 ${blockIdx + 1}`}
          </BtnLite2>
        </div>
        <div className='footer_action'>
          {/* 翻页控件 */}
          {totalPages > 1 && (
            <div className='flex items-center gap-2 mr-4'>
              <BtnLite2
                className='col'
                onClick={handlePrevPage}
                disabled={blockIdx === 0}
                style={{
                  opacity: blockIdx === 0 ? 0.5 : 1,
                  cursor: blockIdx === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronLeft size={20} />
              </BtnLite2>
              <span className='text-sm text-gray-600 min-w-[60px] text-center'>
                {currentPage} / {totalPages}
              </span>
              <BtnLite2
                className='col'
                onClick={handleNextPage}
                disabled={blockIdx === totalPages - 1}
                style={{
                  opacity: blockIdx === totalPages - 1 ? 0.5 : 1,
                  cursor:
                    blockIdx === totalPages - 1 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronRight size={20} />
              </BtnLite2>
            </div>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <BtnLite2 className='col'>
                <Copy size={20} />
              </BtnLite2>
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
                    pasteRowV2({
                      activeRowDepth: [blockIdx],
                    });
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
                  }}
                >
                  复制
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
          >
            <AlertDialogTrigger asChild>
              <BtnLite2
                className={clas('col', {})}
                style={{
                  opacity: totalPages === 1 ? 0.5 : 1,
                  cursor: totalPages === 1 ? 'not-allowed' : 'pointer',
                }}
                onClick={e => {
                  if (totalPages === 1) {
                    e.preventDefault();
                    toast.error('至少需要保留一个画布');
                  } else {
                    setDeleteDialogOpen(true);
                  }
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
                  onClick={() => {
                    deleteRowBatchV2([blockId]);
                    setDeleteDialogOpen(false);
                    toast.success('删除成功');
                  }}
                >
                  删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SettingSimpleModeRoot>
    </div>
  );
};

export default observer(SettingBlockUser);
