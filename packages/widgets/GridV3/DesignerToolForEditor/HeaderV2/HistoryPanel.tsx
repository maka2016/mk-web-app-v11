import { undoManager } from '@mk/works-store/store';
import { Icon } from '@workspace/ui/components/Icon';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import cls from 'classnames';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import styles from './HistoryPanel.module.scss';

interface HistoryItem {
  index: number;
  actionName: string;
  isCurrent: boolean;
  canJumpTo: boolean;
}

interface HistoryPanelProps {
  onJumpTo: (index: number) => void;
}

export const HistoryPanel = observer(({ onJumpTo }: HistoryPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // 刷新历史记录
  const refreshHistory = () => {
    const historyList = undoManager.getHistory(20);
    setHistory(historyList);
    setCurrentIndex(undoManager.getCurrentIndex());
  };

  // 当面板打开时刷新历史记录
  useEffect(() => {
    if (isOpen) {
      refreshHistory();
    }
  }, [isOpen]);

  // 监听历史变化（通过轮询，因为 MobX 不会自动追踪）
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      refreshHistory();
    }, 500);

    return () => clearInterval(timer);
  }, [isOpen]);

  const handleJumpTo = (index: number) => {
    onJumpTo(index);
    // 延迟关闭，让用户看到状态变化
    setTimeout(() => {
      refreshHistory();
    }, 100);
  };

  // 获取操作名称的显示文本
  const getActionLabel = (actionName: string) => {
    const labelMap: Record<string, string> = {
      initData: '初始化',
      addComponent: '添加组件',
      deleteComponent: '删除组件',
      updateComponent: '修改组件',
      moveComponent: '移动组件',
      copyComponent: '复制组件',
      pasteComponent: '粘贴组件',
      addRow: '添加行',
      deleteRow: '删除行',
      updateRow: '修改行',
      moveRow: '移动行',
      updateText: '修改文本',
      updateImage: '修改图片',
      updateStyle: '修改样式',
      updateLayout: '修改布局',
    };

    return labelMap[actionName] || actionName;
  };

  // 格式化时间线显示
  const formatTimeline = (index: number) => {
    if (index < currentIndex) {
      return `${currentIndex - index} 步之前`;
    } else if (index > currentIndex) {
      return `${index - currentIndex} 步之后`;
    }
    return '当前状态';
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div
          className={cls(styles.iconBtn, 'cursor-pointer hover:bg-gray-100')}
          title='操作历史'
        >
          <Icon name='time' size={20} />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className='w-[320px] p-0'
        align='center'
        onOpenAutoFocus={e => e.preventDefault()}
      >
        <div className={styles.historyPanel}>
          <div className={styles.header}>
            <div className={styles.title}>操作历史</div>
            <div className={styles.info}>共 {history.length} 步操作</div>
          </div>

          <div className={styles.historyList}>
            {history.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyText}>暂无操作历史</div>
              </div>
            ) : (
              [...history].reverse().map(item => (
                <div
                  key={item.index}
                  className={cls(styles.historyItem, {
                    [styles.current]: item.isCurrent,
                    [styles.past]: item.index < currentIndex,
                    [styles.future]: item.index > currentIndex,
                  })}
                  onClick={() => {
                    if (item.canJumpTo && !item.isCurrent) {
                      handleJumpTo(item.index);
                    }
                  }}
                >
                  <div className={styles.itemIcon}>
                    {item.isCurrent ? (
                      <div className={styles.currentDot} />
                    ) : item.index < currentIndex ? (
                      <div className={styles.pastIcon}>✓</div>
                    ) : (
                      <div className={styles.futureIcon}>○</div>
                    )}
                  </div>

                  <div className={styles.itemContent}>
                    <div className={styles.itemAction}>
                      {getActionLabel(item.actionName)}
                    </div>
                    <div className={styles.itemTime}>
                      {formatTimeline(item.index)}
                    </div>
                  </div>

                  {item.isCurrent && (
                    <div className={styles.currentBadge}>当前</div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className={styles.footer}>
            <div className={styles.footerText}>点击任意历史记录可跳转</div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});
