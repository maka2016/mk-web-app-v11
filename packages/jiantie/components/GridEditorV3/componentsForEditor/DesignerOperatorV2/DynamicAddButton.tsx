import { Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { BtnLite } from '../../components/style-comps';

// 添加按钮的显示状态接口
export interface AddButtonState {
  visible: boolean;
  x: number;
  y: number;
  type: 'row' | 'elem'; // 支持row和elem两种类型
  targetId?: string;
  insertAfter?: boolean;
  insertIndex?: number;
  parentRowId?: string;
  gapIndex?: number;
  rowDepth?: string;
  elemId?: string;
}

// 动态添加按钮组件
interface DynamicAddButtonProps {
  monitorDOM: HTMLElement | null; // Monitoring target DOM element
  onAdd: (buttonState: AddButtonState) => void;
}

const DynamicAddButton = ({ monitorDOM, onAdd }: DynamicAddButtonProps) => {
  const [buttonState, setButtonState] = useState<AddButtonState>({
    visible: false,
    x: 0,
    y: 0,
    type: 'row', // 只保留行插入类型
  });

  // 使用useRef跟踪鼠标是否在按钮上，避免状态更新触发重新渲染
  const isMouseOnButtonRef = useRef(false);

  // 查找Elem的父Row的rowDepth
  const findParentRowDepth = (elem: HTMLElement): string | undefined => {
    let currentElement: HTMLElement | null = elem.parentElement;

    // 向上遍历DOM树，查找最近的Row元素
    while (currentElement && currentElement !== monitorDOM) {
      if (currentElement.classList.contains('Row')) {
        return currentElement.dataset.rowDepth;
      }
      currentElement = currentElement.parentElement;
    }

    // 如果没找到父Row，返回monitorDOM的rowDepth
    return monitorDOM?.dataset.rowDepth;
  };

  // 查找最近的插入位置
  const findNearestInsertPosition = (mouseX: number, mouseY: number) => {
    if (!monitorDOM) {
      return null;
    }

    // 递归查找最深层的Row或Elem
    const findDeepestElement = (
      container: HTMLElement
    ): { element: HTMLElement; type: 'row' | 'elem' } | null => {
      // 先查找Elem元素（优先级更高）
      const elems = container.querySelectorAll('.Elem');
      let deepestElem: HTMLElement | null = null;
      let maxDepth = -1;

      for (let i = 0; i < elems.length; i++) {
        const elem = elems[i] as HTMLElement;
        const rect = elem.getBoundingClientRect();

        // 检查鼠标是否在当前Elem内
        if (
          mouseX >= rect.left &&
          mouseX <= rect.right &&
          mouseY >= rect.top &&
          mouseY <= rect.bottom
        ) {
          // 计算当前Elem的深度
          let depth = 0;
          let currentElement: HTMLElement | null = elem;
          while (currentElement && currentElement !== monitorDOM) {
            if (
              currentElement.classList.contains('Row') ||
              currentElement.classList.contains('Elem')
            ) {
              depth++;
            }
            currentElement = currentElement.parentElement;
          }

          // 如果找到更深的Elem，更新最深Elem
          if (depth > maxDepth) {
            maxDepth = depth;
            deepestElem = elem;
          }
        }
      }

      // 如果找到了Elem，返回Elem信息
      if (deepestElem) {
        return { element: deepestElem, type: 'elem' as const };
      }

      // 如果没有找到Elem，查找Row
      const rows = container.querySelectorAll('.Row');
      let deepestRow: HTMLElement | null = null;
      maxDepth = -1;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] as HTMLElement;
        const rect = row.getBoundingClientRect();

        // 检查鼠标是否在当前Row内
        if (
          mouseX >= rect.left &&
          mouseX <= rect.right &&
          mouseY >= rect.top &&
          mouseY <= rect.bottom
        ) {
          // 计算当前Row的深度
          let depth = 0;
          let currentElement: HTMLElement | null = row;
          while (currentElement && currentElement !== monitorDOM) {
            if (currentElement.classList.contains('Row')) {
              depth++;
            }
            currentElement = currentElement.parentElement;
          }

          // 如果找到更深的Row，更新最深Row
          if (depth > maxDepth) {
            maxDepth = depth;
            deepestRow = row;
          }
        }
      }

      // 如果找到了Row，返回Row信息
      if (deepestRow) {
        return { element: deepestRow, type: 'row' as const };
      }

      return null;
    };

    // 查找最深的元素（Row或Elem）
    const deepestElement = findDeepestElement(monitorDOM);

    if (deepestElement) {
      const { element, type } = deepestElement;
      const rect = element.getBoundingClientRect();

      // 在元素下方显示添加按钮
      return {
        x: rect.left + rect.width / 2 - monitorDOM.getBoundingClientRect().left, // 相对于monitorDOM的X坐标
        y: rect.bottom - monitorDOM.getBoundingClientRect().top, // 按钮垂直中线对齐元素下边界
        type: type, // 根据实际类型设置
        targetId:
          element.id ||
          (type === 'elem' ? element.dataset.elemId : `row_${Date.now()}`),
        insertAfter: true,
        insertIndex: 0,
        parentRowId: monitorDOM.id || 'parent_row',
        gapIndex: 0,
        rowDepth:
          type === 'elem'
            ? findParentRowDepth(element)
            : element.dataset.rowDepth,
        elemId: element.dataset.elemId,
      };
    }

    return null;
  };

  // 处理添加按钮点击事件
  const handleAddButtonClick = () => {
    console.log('[DynamicAddButton] Add button clicked:', buttonState);

    // 点击后不要立即隐藏按钮，让用户看到点击反馈
    // 调用父组件的onAdd回调
    onAdd(buttonState);
  };

  // 鼠标移动处理函数
  const handleMouseMove = (e: MouseEvent) => {
    // 如果鼠标在按钮上，完全跳过位置计算
    if (isMouseOnButtonRef.current) {
      return;
    }

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    // 查找最近的插入位置
    const insertPosition = findNearestInsertPosition(mouseX, mouseY);

    if (insertPosition) {
      setButtonState({
        visible: true,
        x: insertPosition.x,
        y: insertPosition.y,
        type: insertPosition.type,
        targetId: insertPosition.targetId,
        insertAfter: insertPosition.insertAfter,
        insertIndex: insertPosition.insertIndex,
        parentRowId: insertPosition.parentRowId,
        gapIndex: insertPosition.gapIndex,
        rowDepth: insertPosition.rowDepth,
        elemId: insertPosition.elemId,
      });
    } else {
      // 如果鼠标在按钮上或按钮附近，保持按钮显示
      if (buttonState.visible) {
        const buttonRect = {
          left: buttonState.x - 20, // 按钮左侧20px缓冲区
          right: buttonState.x + 20, // 按钮右侧20px缓冲区
          top: buttonState.y - 20, // 按钮上方20px缓冲区
          bottom: buttonState.y + 20, // 按钮下方20px缓冲区
        };

        if (
          mouseX >= buttonRect.left &&
          mouseX <= buttonRect.right &&
          mouseY >= buttonRect.top &&
          mouseY <= buttonRect.bottom
        ) {
          // 鼠标在按钮缓冲区范围内，保持按钮显示
          return;
        }
      }

      setButtonState(prev => ({ ...prev, visible: false }));
    }
  };

  // 鼠标离开处理函数
  const handleMouseLeave = () => {
    // 鼠标离开容器时隐藏添加按钮
    setButtonState(prev => ({ ...prev, visible: false }));
  };

  // 添加事件监听器
  useEffect(() => {
    if (!monitorDOM) {
      return;
    }

    // 添加事件监听器
    monitorDOM.addEventListener('mousemove', handleMouseMove);
    monitorDOM.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      monitorDOM.removeEventListener('mousemove', handleMouseMove);
      monitorDOM.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [monitorDOM]); // 只依赖monitorDOM，不依赖其他状态

  if (!buttonState.visible) {
    return null;
  }

  return (
    <>
      {/* 添加按钮 */}
      <div
        className='dynamic-add-button-container absolute z-[50] pointer-events-auto'
        style={{
          left: buttonState.x,
          top: buttonState.y,
          transform: 'translate(-50%, -50%)', // 让按钮以中心点定位
        }}
        onMouseEnter={e => {
          // 鼠标进入按钮时，设置状态并确保按钮保持显示
          isMouseOnButtonRef.current = true;
          e.stopPropagation();
        }}
        onMouseLeave={e => {
          // 鼠标离开按钮时，重置状态
          isMouseOnButtonRef.current = false;
          e.stopPropagation();
        }}
      >
        <BtnLite
          className='dynamic-add-button action-btn pointer-events-auto rounded-full shadow-lg relative'
          style={{
            padding: '1px',
          }}
          onClick={() => handleAddButtonClick()}
        >
          <Plus size={14} />
          {/* <div
            className="absolute inset-0 pointer-events-auto"
            style={{
              top: 0,
              left: -12,
              right: -12,
              bottom: -4,
            }}
          /> */}
        </BtnLite>
      </div>
    </>
  );
};

export default DynamicAddButton;
