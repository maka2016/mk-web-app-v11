import { IWorksData } from '@mk/works-store/types';
import { Icon } from '@workspace/ui/components/Icon';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import cls from 'classnames';
import { useEffect, useRef, useState } from 'react';
import { useGridContext } from '../../comp/provider';
import { getCanvaInfo2 } from '../../comp/provider/utils';
import PageNavigationV1 from '../PageNavigation';
import PageNavigationV2 from '../PageNavigationV2';
import styles from './SettingWidget.module.scss';

/**
 * 设计师和用户共用的组件管理器
 */
export default function SettingWidget({
  worksData,
}: {
  worksData: IWorksData;
}) {
  const { editorSDK, editorCtx, cellsMap, useGridV2 } = useGridContext();
  const { isWebsite, maxPageCount, useMusic } = getCanvaInfo2();
  const [templateShow, setTemplateShow] = useState(false);
  const [templateShowV2, setTemplateShowV2] = useState(false);
  const [showComponentSwitch, setShowComponentSwitch] = useState(false);
  const [showPintuanForm, setShowPintuanForm] = useState(false);
  const [showMkBaoMingV2Form, setShowMkBaoMingV2Form] = useState(false);
  const [showHuizhiForm, setShowHuizhiForm] = useState(false);

  const onSetting = (elementRef: string) => {
    switch (elementRef) {
      case 'MkPinTuan':
        setShowPintuanForm(true);
        break;
      case 'MkBaoMingV2':
        setShowMkBaoMingV2Form(true);
        break;
      case 'MkHuiZhi':
        setShowHuizhiForm(true);
        break;
      default:
        break;
    }
  };

  const [showMusicLib, setShowMusicLib] = useState(false);
  const addPageable = cellsMap.length < maxPageCount;

  const newOperatingBtnRef = useRef<HTMLDivElement>(null);
  const initialHeightRef = useRef<number>(0);

  useEffect(() => {
    /** 键盘弹起隐藏底部悬浮按钮 */
    initialHeightRef.current = window.innerHeight;

    const handleResize = () => {
      if (!newOperatingBtnRef.current) {
        return;
      }
      const currentHeight = window.innerHeight;

      // 软键盘弹起隐藏底部悬浮按钮
      if (currentHeight < initialHeightRef.current - 100) {
        // 判断为软键盘弹出（通常高度减少超过100px）
        newOperatingBtnRef.current.style.display = 'none';
      } else {
        // 软键盘收起
        newOperatingBtnRef.current.style.display = 'flex';
      }
    };

    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (!addPageable && !isWebsite) {
    return null;
  }

  // TODO: 迁移其他组件的设置
  return (
    <div className='bg-white w-full max-w-full overflow-hidden p-4 py-2 sticky bottom-0 left-0 right-0 z-50'>
      <div ref={newOperatingBtnRef} className={cls(styles.operatingBtns)}>
        {addPageable && !useGridV2 && (
          <div className={styles.btnItem} onClick={() => setTemplateShow(true)}>
            <Icon name='add-one' size={20} />
            <span>添加页面</span>
          </div>
        )}
        {addPageable && useGridV2 && (
          <div
            className={styles.btnItem}
            onClick={() => setTemplateShowV2(true)}
          >
            <Icon name='add-one' size={20} />
            <span>添加页面</span>
          </div>
        )}
        {useMusic && (
          <div className={styles.btnItem} onClick={() => setShowMusicLib(true)}>
            {!editorSDK?.getWorksData()?.canvasData?.music.disabled && (
              <div className={styles.corner}>已启用</div>
            )}
            <Icon name='music' />
            <span>音乐设置</span>
          </div>
        )}
      </div>
      <ResponsiveDialog
        isOpen={templateShow}
        handleOnly={true}
        showOverlay={false}
        onOpenChange={setTemplateShow}
        title='添加页面'
        contentProps={{
          className: 'pt-2 h-[60vh]',
        }}
      >
        <PageNavigationV1
          onClose={() => setTemplateShow(false)}
          onChange={() => {
            setTemplateShow(false);
          }}
        />
      </ResponsiveDialog>
      <ResponsiveDialog
        isOpen={templateShowV2}
        handleOnly={true}
        showOverlay={false}
        onOpenChange={setTemplateShowV2}
        title='添加页面'
        contentProps={{
          className: 'pt-2 h-[60vh]',
        }}
      >
        <PageNavigationV2
          onClose={() => setTemplateShowV2(false)}
          onChange={() => {
            setTemplateShowV2(false);
          }}
        />
      </ResponsiveDialog>
    </div>
  );
}
