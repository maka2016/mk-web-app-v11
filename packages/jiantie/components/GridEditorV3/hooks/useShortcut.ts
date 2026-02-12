import { getUid } from '@/services';
import { queryToObj } from '@/utils';
import { useEffect } from 'react';
import { useWorksStore } from '../works-store/store/hook';
import { useGlobalTypingStatus } from './useGlobalTypingStatus';

export const useShortcut = () => {
  const worksStore = useWorksStore();
  const { widgetStateV2, setWidgetStateV2 } = worksStore;
  const {
    getActiveRow,
    deleteElemV2,
    deleteRowBatchV2,
    groupElemV2,
    ungroupElemV2,
    copyElementV2,
    copyRowV2,
    pasteRowV2,
    moveElemV2,
    moveRowV2,
  } = worksStore.gridPropsOperator;
  const isTyping = useGlobalTypingStatus();
  const { editingElemId, activeRowDepth, hideOperator } = widgetStateV2;

  useEffect(() => {
    /** 快捷键绑定 */
    function KeyCheck(event: KeyboardEvent) {
      if (isTyping) return;
      const isCommand = event.metaKey || event.ctrlKey;
      const isShift = event.shiftKey;
      const k = event.key;
      // console.log('k', k);
      const deleteElemMonitor = () => {
        if (isTyping) {
          return;
        }
        if (k === 'Backspace' || k === 'Delete') {
          if (editingElemId) {
            event.preventDefault();
            event.stopPropagation();
            deleteElemV2(undefined, false);
            setWidgetStateV2({
              editingElemId: undefined,
            });
          } else {
            event.preventDefault();
            event.stopPropagation();
            const rowId = getActiveRow()?.id;
            if (rowId) {
              deleteRowBatchV2([rowId]);
              setWidgetStateV2({
                activeRowDepth: activeRowDepth?.slice(0, -1),
                editingElemId: undefined,
              });
            }
          }
        }
      };
      deleteElemMonitor();
      const undoRedoMonitor = () => {
        // Cmd/Ctrl + Z 撤销；Shift+Cmd/Ctrl+Z 或 Ctrl+Y 重做
        const keyLower = (event.key || '').toLowerCase();
        // 避免在输入状态触发全局撤销/重做
        if (isTyping) return;

        if (isCommand && keyLower === 'z') {
          event.preventDefault();
          event.stopPropagation();
          if (event.shiftKey) {
            worksStore?.redo?.();
          } else {
            worksStore?.undo?.();
          }
          return;
        }
        // Windows 常用 Ctrl+Y 作为重做
        if ((event.ctrlKey || event.metaKey) && keyLower === 'y') {
          event.preventDefault();
          event.stopPropagation();
          worksStore?.redo?.();
          return;
        }
      };
      undoRedoMonitor();
      const toDesignerMode = () => {
        /** 切换到设计师模式 */
        if (isCommand && (event.key === 'k' || event.key === 'i')) {
          event.preventDefault();

          const isViewer = /viewer2/.test(window.location.pathname);
          const isTemplateViewer = /template/.test(window.location.pathname);
          let worksId = '';

          // 跳转到设计师模式，带上已有的参数，路径是 /editor-designer?{已有的参数}
          const url = new URL(window.location.href);
          if (isViewer) {
            // url example http://localhost:3000/viewer2/NKYXVDSZ_12811169?appid=jiantie
            worksId = url.pathname.split('/')[2];
            url.searchParams.set('works_id', worksId);
          }
          if (isTemplateViewer) {
            // url example http://localhost:3000/mobile/template?id=T_GTFP6E5K0ZD4
            worksId = url.searchParams.get('id') || '';
            url.searchParams.set('works_id', worksId);
            url.searchParams.set('designer_tool', 'dev');
            url.searchParams.set('is_template', 'true');
            url.searchParams.set('uid', getUid());
          }
          url.searchParams.set('designer_tool', 'dev');
          url.pathname = '/desktop/editor-designer';
          const newUrl = url.toString();
          window.location.href = newUrl;
        }
        if (isCommand && event.key === 'j') {
          /** 切换到开发者模式 */
          const isDev = window.location.hostname === 'localhost';
          event.preventDefault();

          // 跳转到开发者模式，带上已有的参数，路径是 /editor-designer?{已有的参数}
          const url = new URL(window.location.href);
          url.hostname = isDev ? 'jiantieapp.com' : 'localhost';
          url.protocol = isDev ? 'https' : 'http';
          url.port = isDev ? '' : '3000';
          const newUrl = url.toString();
          window.location.href = newUrl;
        }
        if (isCommand && isShift && event.key === 'f') {
          /** 切换保存与不保存，开发者模式，需要复杂点的快捷键，避免误触 */
          const isNoSave = queryToObj().no_save;
          event.preventDefault();

          // 跳转到开发者模式，带上已有的参数，路径是 /editor-designer?{已有的参数}
          const url = new URL(window.location.href);
          url.searchParams.set('no_save', !isNoSave ? 'true' : 'false');
          const newUrl = url.toString();
          window.location.href = newUrl;
        }
      };
      toDesignerMode();

      // 复制粘贴功能
      const copyPasteMonitor = () => {
        if (isTyping || (!editingElemId && (hideOperator || !activeRowDepth || activeRowDepth.length === 0))) {
          return;
        }
        if (!isCommand) return;

        if (k === 'c') {
          if (!isTyping) {
            // Ctrl+C 智能复制
            event.preventDefault();
            event.stopPropagation();
            let success = false;
            if (editingElemId) {
              // 当前激活的是element，复制element
              success = copyElementV2(editingElemId);
              if (success) {
                console.log('Element copied successfully');
              } else {
                console.log('Failed to copy element');
              }
            } else if (activeRowDepth) {
              // 当前激活的是Row，复制Row
              success = copyRowV2();
              if (success) {
                console.log('Row copied successfully');
              } else {
                console.log('Failed to copy row');
              }
            }
          }
        } else if (k === 'v') {
          // Ctrl+V 智能粘贴
          event.preventDefault();
          event.stopPropagation();
          if (!isTyping) {
            const copiedRes = pasteRowV2();
            setWidgetStateV2({
              activeRowDepth: copiedRes.copiedRowDepth,
              editingElemId: copiedRes.copiedElemId,
            });
          }
        }
      };
      copyPasteMonitor();

      // 方向键监听
      const arrowKeyMonitor = () => {
        if (isTyping) return; // 在输入状态下不处理方向键

        switch (k) {
          case 'Escape':
          case 'q':
            if (document.body.dataset['scrollLocked']) {
              return;
            }
            event.preventDefault();
            event.stopPropagation();
            setWidgetStateV2({
              editingElemId: undefined,
              activeRowDepth: editingElemId ? activeRowDepth : activeRowDepth?.slice(0, -1),
            });
            break;
          case 'ArrowUp':
          case 'ArrowLeft':
            event.preventDefault();
            event.stopPropagation();
            console.log('Arrow Left pressed');
            // 这里可以添加向左移动的逻辑
            if (!editingElemId) {
              moveRowV2('up');
              const lastIndex = activeRowDepth?.[activeRowDepth.length - 1] || 0;
              setWidgetStateV2({
                // activeRowDepth 最后一位的值 -1
                activeRowDepth: [...(activeRowDepth || []).slice(0, -1), lastIndex - 1],
              });
            } else {
              moveElemV2('up');
            }
            break;
          case 'ArrowDown':
          case 'ArrowRight':
            event.preventDefault();
            event.stopPropagation();
            console.log('Arrow Right pressed');
            // 这里可以添加向右移动的逻辑
            if (!editingElemId) {
              moveRowV2('down');
              const lastIndex = activeRowDepth?.[activeRowDepth.length - 1] || 0;
              setWidgetStateV2({
                activeRowDepth: [...(activeRowDepth || []).slice(0, -1), lastIndex + 1],
              });
            } else {
              moveElemV2('down');
            }
            break;
        }
      };
      arrowKeyMonitor();

      const addKeyMonitor = () => {
        if (isTyping) return;
        if (k === '=' || (event.shiftKey && k === '=') || k === 'a') {
          setWidgetStateV2({
            isAddModalShow2: true,
          });
        }
      };
      addKeyMonitor();

      const animationPlayer = () => {
        const isCommand = event.metaKey || event.ctrlKey;
        if (isTyping) return;
        if (isCommand && k === '\\') {
          setWidgetStateV2({
            showAnimationTimeline: !widgetStateV2.showAnimationTimeline,
          });
        }
      };
      animationPlayer();

      const groupElemKeyMonitor = () => {
        if (isTyping || !editingElemId) return;
        if (isShift && k === 'A') {
          const nextRowDepth = groupElemV2();
          if (nextRowDepth) {
            setWidgetStateV2({
              activeRowDepth: nextRowDepth,
            });
          }
        }
        if (isShift && k === 'S') {
          const nextRowDepth = ungroupElemV2();
          if (nextRowDepth) {
            setWidgetStateV2({
              activeRowDepth: nextRowDepth,
            });
          }
        }
      };
      groupElemKeyMonitor();
    }
    document.addEventListener('keydown', KeyCheck);

    return () => {
      document.removeEventListener('keydown', KeyCheck);
    };
  }, [editingElemId, JSON.stringify(activeRowDepth), isTyping, widgetStateV2.playAnimationInEditor]);
};
