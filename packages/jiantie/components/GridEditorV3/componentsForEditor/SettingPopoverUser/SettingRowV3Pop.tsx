import { Copy, LayoutDashboard, Trash2 } from 'lucide-react';
import { observer } from 'mobx-react';
import toast from 'react-hot-toast';
import { BtnLite } from '../../components/style-comps';
import { scrollToActiveRow } from '../../utils';
import { useWorksStore } from '../../works-store/store/hook';
import ListSettingForUser from '../ElementAttrsEditorV2/ListSettingForUser';
import ChangeComponentTriggerDialog from './ChangeComponentTrigger';

interface GridMoreOptionsProps {
  showBtnText?: boolean;
}

const SettingRowV3Pop = (props: GridMoreOptionsProps) => {
  const { showBtnText } = props;
  const worksStore = useWorksStore();
  const { widgetStateV2, setWidgetStateV2, worksData } = worksStore;
  const gridProps = worksData.gridProps;
  const gridsData = gridProps.gridsData;
  const {
    getActiveRow,
    getRowByDepth,
    deleteRowBatchV2,
    copyRowV2,
    pasteRowV2,
  } = worksStore.gridPropsOperator;
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
  const isComponent = !!currRow.componentGroupRefId;

  const renderBtns = () => {
    return (
      <>
        {isListItem && <ListSettingForUser />}
        {isComponent && (
          <>
            <ChangeComponentTriggerDialog
              dataType={activeRowDepth?.length === 1 ? 'blocks' : 'components'}
              replaceCurrentRow={true}
              showAllComponent={false}
              onChange={() => {
                // console.log('onComponentClick');
                toast.success('切换版式成功');
                setWidgetStateV2({
                  activeRowDepth: [0],
                  editingElemId: undefined,
                });
              }}
              trigger={(open, setOpen) => {
                return (
                  <BtnLite
                    onClick={() => {
                      setOpen(true);
                    }}
                  >
                    <LayoutDashboard size={16} />
                    换版式
                  </BtnLite>
                );
              }}
            />
          </>
        )}
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
            console.log('currRow', currRow);
            deleteRowBatchV2([currRow.id]);
            setWidgetStateV2({
              activeRowDepth: [(activeRowDepth?.[0] || 1) - 1],
              editingElemId: undefined,
            });

            toast.success('删除成功');
          }}
        >
          <Trash2 size={20} />
          {showBtnText && '删除'}
        </BtnLite>
      </>
    );
  };

  return <>{renderBtns()}</>;
};

export default observer(SettingRowV3Pop);
