import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Check, Eraser } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface TextEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  layer: any;
  editorSDK: any;
}

export const TextEditDialog = ({
  isOpen,
  onOpenChange,
  layer,
  editorSDK,
}: TextEditDialogProps) => {
  const [editingText, setEditingText] = useState('');
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomToolbarRef = useRef<HTMLDivElement>(null);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // 当弹窗打开时，初始化编辑文本
  useEffect(() => {
    if (isOpen) {
      setEditingText(layer.attrs.text || '');
      // 延迟聚焦，确保键盘能正确弹出
      setTimeout(() => {
        if (contentEditableRef.current) {
          contentEditableRef.current.focus();
          // 将光标移动到内容最后
          const range = document.createRange();
          const selection = window.getSelection();
          range.selectNodeContents(contentEditableRef.current);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }, 100);
    }
  }, [isOpen, layer.attrs.text]);

  // 处理移动端键盘弹出时的视口变化
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      // 使用 visualViewport API 获取实际可见区域高度
      if (window.visualViewport) {
        const height = window.visualViewport.height;
        setViewportHeight(height);
      } else {
        // 降级方案：使用 window.innerHeight
        setViewportHeight(window.innerHeight);
      }
    };

    // 初始化高度
    handleResize();

    // 监听视口变化
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [isOpen]);

  // 当编辑框获得焦点时，确保其可见
  const handleFocus = () => {
    setIsFocused(true);
    setTimeout(() => {
      if (contentEditableRef.current) {
        contentEditableRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }, 300); // iOS 需要延迟以等待键盘动画完成
  };

  // 失去焦点
  const handleBlur = () => {
    setIsFocused(false);
  };

  // 当内容改变时更新状态
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    setEditingText(e.currentTarget.innerText);
  };

  // 确认保存
  const handleConfirm = () => {
    // 先失焦，隐藏键盘
    if (contentEditableRef.current) {
      contentEditableRef.current.blur();
    }
    editorSDK?.changeCompAttr(layer.elemId, {
      text: editingText,
    });
    onOpenChange(false);
  };

  // 取消修改
  const handleCancel = () => {
    // 先失焦，隐藏键盘
    if (contentEditableRef.current) {
      contentEditableRef.current.blur();
    }
    onOpenChange(false);
  };

  // 清除所有文字
  const handleClear = () => {
    setEditingText('');
    if (contentEditableRef.current) {
      contentEditableRef.current.innerText = '';
      // 清除后重新聚焦
      contentEditableRef.current.focus();
    }
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title=''
      showCloseIcon={false}
      handleOnly={true}
      contentProps={{
        className:
          'max-w-full w-screen h-screen md:w-[480px] md:h-[600px] max-h-screen p-0 rounded-none md:rounded-lg',
      }}
    >
      <div
        ref={containerRef}
        className='flex flex-col h-full bg-white'
        style={{
          height: viewportHeight ? `${viewportHeight}px` : '100vh',
          maxHeight: viewportHeight ? `${viewportHeight}px` : '100vh',
        }}
      >
        {/* 顶部操作栏 */}
        <div className='flex items-center justify-between px-4 py-2 border-b border-slate-200 flex-shrink-0 bg-white'>
          <Button
            variant='outline'
            size='sm'
            onClick={handleCancel}
            className='flex items-center gap-1'
          >
            <span>取消</span>
          </Button>
          <Button
            variant='default'
            size='sm'
            onClick={handleConfirm}
            className='flex items-center gap-1'
          >
            <Check size={18} />
            <span>确认</span>
          </Button>
        </div>

        {/* 编辑区域 */}
        <div
          className='flex-1 p-4 overflow-auto'
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div
            ref={contentEditableRef}
            contentEditable='plaintext-only'
            suppressContentEditableWarning
            onInput={handleInput}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={`w-full min-h-[300px] p-4 text-base outline-none rounded-lg border-2 transition-all ${
              isFocused
                ? 'border-blue-500 bg-blue-50/30 shadow-lg'
                : 'border-gray-300 bg-white'
            }`}
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {layer.attrs.text || ''}
          </div>
        </div>

        {/* 底部工具栏 - 固定在底部，不被键盘遮挡 */}
        <div
          ref={bottomToolbarRef}
          className='flex items-center justify-center gap-2 px-4 py-3 border-t border-slate-200 flex-shrink-0 bg-white'
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 10,
          }}
        >
          <Button
            variant='outline'
            size='sm'
            onClick={handleClear}
            className='flex items-center gap-2'
          >
            <Eraser size={16} />
            <span>清除全部内容</span>
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
};
