import {
  ChevronDown,
  ChevronUp,
  Copy,
  LayoutDashboard,
  Trash2,
} from 'lucide-react';
import { observer } from 'mobx-react';
import toast from 'react-hot-toast';
import { BtnLiteColumn } from '../../components/style-comps';
import { scrollToActiveRow } from '../../utils';
import { useWorksStore } from '../../works-store/store/hook';
import ListSettingForUser from '../ElementAttrsEditorV2/ListSettingForUser';
import ChangeComponentTriggerDialog from './ChangeComponentTrigger';

const SettingRowV3 = () => {
  const worksStore = useWorksStore();
  const { widgetStateV2, setWidgetStateV2, worksData, clearActiveStatus } =
    worksStore;
  const gridProps = worksData.gridProps;
  const gridsData = gridProps.gridsData;
  const {
    getActiveRow,
    getRowByDepth,
    deleteRowBatchV2,
    copyRowV2,
    pasteRowV2,
    moveRowV2,
  } = worksStore.gridPropsOperator;
  const { activeRowDepth } = widgetStateV2;
  const currRow = getActiveRow();

  if (!currRow) {
    return null;
  }

  const isListItem = currRow?.isRepeatList;
  const isComponent = !!currRow.componentGroupRefId;

  // 计算当前行的位置信息
  const currentIndex = activeRowDepth?.[activeRowDepth.length - 1] ?? 0;
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

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === siblingCount - 1;
  const isOnlyOne = siblingCount === 1;

  const renderBtns = () => {
    return (
      <>
        {isListItem && <ListSettingForUser size='lg' />}
        {isComponent && (
          <>
            <ChangeComponentTriggerDialog
              dataType={activeRowDepth?.length === 1 ? 'blocks' : 'components'}
              replaceCurrentRow={true}
              showAllComponent={false}
              trigger={(open, setOpen) => {
                return (
                  <BtnLiteColumn
                    onClick={() => {
                      setOpen(true);
                    }}
                  >
                    <div className='border_icon'>
                      <LayoutDashboard size={16} />
                    </div>
                    换版式
                  </BtnLiteColumn>
                );
              }}
            />
          </>
        )}
        <BtnLiteColumn
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
          <div className='border_icon'>
            <Copy size={16} />
          </div>
          <span>复制</span>
        </BtnLiteColumn>
        <BtnLiteColumn
          onClick={() => {
            // 使用新的 duplicateRowBatch 函数
            deleteRowBatchV2([currRow.id]);
            setWidgetStateV2({
              activeRowDepth: [(activeRowDepth?.[0] || 1) - 1],
              editingElemId: undefined,
            });

            toast.success('删除成功');
          }}
        >
          <div className='border_icon'>
            <Trash2 size={16} />
          </div>
          <span>删除</span>
        </BtnLiteColumn>
        <BtnLiteColumn
          onClick={() => {
            if (isFirst || isOnlyOne) {
              return;
            }
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
          style={
            isFirst || isOnlyOne
              ? { opacity: 0.5, cursor: 'not-allowed' }
              : undefined
          }
        >
          <div className='border_icon'>
            <ChevronUp size={16} />
          </div>
          <span>上移</span>
        </BtnLiteColumn>
        <BtnLiteColumn
          onClick={() => {
            if (isLast || isOnlyOne) {
              return;
            }
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
          style={
            isLast || isOnlyOne
              ? { opacity: 0.5, cursor: 'not-allowed' }
              : undefined
          }
        >
          <div className='border_icon'>
            <ChevronDown size={16} />
          </div>
          <span>下移</span>
        </BtnLiteColumn>
      </>
    );
  };

  return <>{renderBtns()}</>;
};

export default observer(SettingRowV3);
