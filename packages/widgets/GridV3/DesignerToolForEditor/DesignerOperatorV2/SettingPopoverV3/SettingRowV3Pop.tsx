import { Copy, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGridContext } from '../../../comp/provider';
import { scrollToActiveRow } from '../../../shared';
import { BtnLite } from '../../../shared/style-comps';
import ListSettingForUser from '../../ElementAttrsEditorV2/ListSettingForUser';

interface GridMoreOptionsProps {
  showBtnText?: boolean;
}

export const SettingRowV3Pop = (props: GridMoreOptionsProps) => {
  const { showBtnText } = props;
  const {
    getActiveRow,
    getRowByDepth,
    deleteRowBatchV2,
    clearActiveStatus,
    copyRowV2,
    pasteRowV2,
    setWidgetStateV2,
    widgetStateV2,
    gridsData,
  } = useGridContext();
  const { activeRowDepth } = widgetStateV2;
  const currRow = getActiveRow();

  if (!currRow) {
    return null;
  }

  const isListItem = currRow?.isRepeatList;

  // 计算当前行的位置信息
  let siblingCount = 0;

  if (activeRowDepth && activeRowDepth.length > 0) {
    if (activeRowDepth.length === 1) {
      // 根级别，兄弟节点是 gridsData 的子元素
      siblingCount = gridsData.length;
    } else {
      // 有父级，获取父级的 children 数量
      const parentDepth = activeRowDepth.slice(0, -1);
      const parentRow = getRowByDepth(parentDepth);
      siblingCount = parentRow?.children?.length ?? 0;
    }
  }

  const isOnlyOne = siblingCount === 1;

  const renderBtns = () => {
    return (
      <>
        {isListItem && <ListSettingForUser />}
        <BtnLite
          onClick={() => {
            // 使用新的 duplicateRowBatch 函数
            copyRowV2();
            const { copiedRowDepth } = pasteRowV2();
            setWidgetStateV2({
              activeRowDepth: copiedRowDepth,
              editingElemId: undefined,
            });
            scrollToActiveRow(
              getRowByDepth(copiedRowDepth || [])?.id || '',
              true,
              100
            );

            toast.success('复制成功');
          }}
        >
          <Copy size={20} />
          {showBtnText && '复制'}
        </BtnLite>
        <BtnLite
          onClick={() => {
            if (isOnlyOne) {
              return;
            }
            // 使用新的 duplicateRowBatch 函数
            console.log('currRow', currRow);
            deleteRowBatchV2([currRow.id]);
            setWidgetStateV2({
              activeRowDepth: [(activeRowDepth?.[0] || 1) - 1],
              editingElemId: undefined,
            });

            toast.success('删除成功');
          }}
          style={
            isOnlyOne ? { opacity: 0.5, cursor: 'not-allowed' } : undefined
          }
        >
          <Trash2 size={20} />
          {showBtnText && '删除'}
        </BtnLite>
      </>
    );
  };

  return <>{renderBtns()}</>;
};
