import { WorksStore } from '@/components/GridEditorV3/works-store/store';
import { Icon } from '@workspace/ui/components/Icon';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import cls from 'classnames';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';

interface HistoryItem {
  index: number;
  actionName: string;
  isCurrent: boolean;
  canJumpTo: boolean;
}

interface HistoryPanelProps {
  worksStore?: WorksStore;
  onJumpTo: (index: number) => void;
}

export const HistoryPanel = observer(
  ({ worksStore, onJumpTo }: HistoryPanelProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(-1);

    // 刷新历史记录
    const refreshHistory = () => {
      if (!worksStore) return;
      const historyList = worksStore.getHistory(20);
      setHistory(historyList);
      setCurrentIndex(worksStore.getCurrentHistoryIndex());
    };

    // 当面板打开时刷新历史记录
    useEffect(() => {
      if (isOpen && worksStore) {
        const historyList = worksStore.getHistory(20);
        setHistory(historyList);
        setCurrentIndex(worksStore.getCurrentHistoryIndex());
      }
    }, [isOpen, worksStore]);

    // 监听历史变化（通过轮询，因为 MobX 不会自动追踪）
    useEffect(() => {
      if (!isOpen || !worksStore) return;

      const timer = setInterval(() => {
        const historyList = worksStore.getHistory(20);
        setHistory(historyList);
        setCurrentIndex(worksStore.getCurrentHistoryIndex());
      }, 500);

      return () => clearInterval(timer);
    }, [isOpen, worksStore]);

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
            className='flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200 cursor-pointer hover:bg-black/5 active:scale-95'
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
          <div className='flex flex-col max-h-[500px] bg-white rounded-lg overflow-hidden'>
            <div className='flex items-center justify-between px-4 py-3 border-b border-black/8 bg-gradient-to-b from-[#fafafa] to-white'>
              <div className='text-sm font-semibold text-black/88'>
                操作历史
              </div>
              <div className='text-xs text-black/45'>
                共 {history.length} 步操作
              </div>
            </div>

            <div className='flex-1 overflow-y-auto py-2 max-h-[400px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-sm hover:[&::-webkit-scrollbar-thumb]:bg-black/20'>
              {history.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-10 px-5 text-black/25'>
                  <div className='text-sm text-black/45'>暂无操作历史</div>
                </div>
              ) : (
                [...history].reverse().map(item => {
                  const isPast = item.index < currentIndex;
                  const isCurrent = item.isCurrent;
                  const isFuture = item.index > currentIndex;

                  return (
                    <div
                      key={item.index}
                      className={cls(
                        'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all duration-200 relative',
                        'before:content-[""] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-transparent before:transition-all before:duration-200',
                        {
                          'bg-[#1890ff]/8 before:bg-[#1890ff] hover:bg-[#1890ff]/12':
                            isCurrent,
                          'opacity-70 hover:opacity-100': isPast,
                          'opacity-50 hover:opacity-80': isFuture,
                          'hover:bg-black/2': !isCurrent,
                        }
                      )}
                      onClick={() => {
                        if (item.canJumpTo && !item.isCurrent) {
                          handleJumpTo(item.index);
                        }
                      }}
                    >
                      <div
                        className={cls(
                          'flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0',
                          {
                            'bg-[#52c41a]/10 text-[#52c41a]': isPast,
                            'bg-[#1890ff]/10 text-[#1890ff]': isCurrent,
                            'bg-black/5 text-black/45': isFuture,
                          }
                        )}
                      >
                        {isCurrent ? (
                          <div className='w-2 h-2 rounded-full bg-[#1890ff] animate-pulse' />
                        ) : isPast ? (
                          <div>✓</div>
                        ) : (
                          <div>○</div>
                        )}
                      </div>

                      <div className='flex-1 min-w-0'>
                        <div
                          className={cls('text-sm font-medium mb-0.5', {
                            'text-black/88': isCurrent,
                            'text-black/65': isPast,
                            'text-black/45': isFuture,
                          })}
                        >
                          {getActionLabel(item.actionName)}
                        </div>
                        <div
                          className={cls('text-xs', {
                            'text-black/45': isCurrent,
                            'text-black/35': isPast,
                            'text-black/25': isFuture,
                          })}
                        >
                          {formatTimeline(item.index)}
                        </div>
                      </div>

                      {isCurrent && (
                        <div className='px-2 py-0.5 rounded-[10px] text-[11px] font-medium bg-[#1890ff] text-white flex-shrink-0'>
                          当前
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className='px-4 py-2.5 border-t border-black/8 bg-black/2'>
              <div className='text-xs text-black/45 text-center'>
                点击任意历史记录可跳转
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);
