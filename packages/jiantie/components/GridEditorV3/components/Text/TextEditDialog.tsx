import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Check, Eraser } from 'lucide-react';
import { observer } from 'mobx-react';
import { useEffect, useRef, useState } from 'react';
import { useWorksStore } from '../../works-store/store/hook';
import { extractPlainTextFromElement, getPlainTextValue } from './textUtils';

interface TextEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  layer: any;
}

const TextEditDialog = ({
  isOpen,
  onOpenChange,
  layer,
}: TextEditDialogProps) => {
  const worksStore = useWorksStore();
  const [editingText, setEditingText] = useState('');
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomToolbarRef = useRef<HTMLDivElement>(null);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // 当弹窗打开时，初始化编辑文本
  useEffect(() => {
    if (isOpen) {
      // 使用共享的 getPlainTextValue 函数处理文本，确保移除所有HTML标签
      const rawText = layer.attrs.text || '';
      const cleanedText = getPlainTextValue(rawText);
      setEditingText(cleanedText);

      // 使用 setTimeout 确保 DOM 已经渲染
      setTimeout(() => {
        if (contentEditableRef.current) {
          // 使用 textContent 来设置文本内容
          contentEditableRef.current.textContent = cleanedText;

          // 聚焦并将光标移动到内容最后
          contentEditableRef.current.focus();
          const range = document.createRange();
          const selection = window.getSelection();
          if (contentEditableRef.current.childNodes.length > 0) {
            range.selectNodeContents(contentEditableRef.current);
            range.collapse(false);
          }
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }, 50);
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
    // 移动端不使用 scrollIntoView，避免额外的滚动动画
    // setTimeout(() => {
    //   if (contentEditableRef.current) {
    //     contentEditableRef.current.scrollIntoView({
    //       behavior: 'auto',
    //       block: 'center',
    //     });
    //   }
    // }, 300);
  };

  // 失去焦点
  const handleBlur = () => {
    setIsFocused(false);
  };

  // 当内容改变时更新状态
  // 注意：在 plaintext-only 模式下，浏览器不应该插入HTML标签，所以这里只更新状态
  // 所有的HTML清理逻辑都在 handleConfirm 时统一处理
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    // 使用工具函数安全提取纯文本内容（plaintext-only 模式下理论上不会有HTML）
    const text = extractPlainTextFromElement(target);
    setEditingText(text);
  };

  // 确认保存
  const handleConfirm = () => {
    // 先失焦，隐藏键盘
    if (contentEditableRef.current) {
      contentEditableRef.current.blur();
    }

    // 从DOM中提取纯文本（防止DOM中仍有HTML结构）
    let finalText = editingText;
    if (contentEditableRef.current) {
      const extractedText = extractPlainTextFromElement(
        contentEditableRef.current
      );
      // 使用 getPlainTextValue 确保完全清理所有HTML标签
      finalText = getPlainTextValue(extractedText);
    } else {
      // 如果没有DOM引用，直接使用 getPlainTextValue 清理
      finalText = getPlainTextValue(editingText);
    }

    // 最终验证：确保不包含任何HTML标签
    if (finalText !== getPlainTextValue(finalText)) {
      console.warn(
        'TextEditDialog: 检测到保存数据中仍包含HTML标签，进行二次清理',
        {
          elemId: layer.elemId,
          originalValue: editingText,
          processedValue: finalText,
        }
      );
      finalText = getPlainTextValue(finalText);
    }

    // 保存纯文本（不需要编码HTML实体，因为已经是纯文本）
    worksStore.changeCompAttr(layer.elemId, {
      text: finalText,
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
            className={`w-full min-h-[300px] p-4 text-base outline-none rounded-lg border-2 ${
              isFocused
                ? 'border-blue-500 bg-blue-50/30 shadow-lg'
                : 'border-gray-300 bg-white'
            }`}
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              WebkitUserSelect: 'auto',
              MozUserSelect: 'auto',
              msUserSelect: 'auto' as any,
              userSelect: 'auto',
            }}
          />
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

export default observer(TextEditDialog);
