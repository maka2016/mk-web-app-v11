import { getAppId, getPermissionData } from '@mk/services';
import { deepClone } from '@mk/utils';
import { IWorksData } from '@mk/works-store/types';
import { Icon } from '@workspace/ui/components/Icon';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { cn } from '@workspace/ui/lib/utils';
import cls from 'classnames';
import { Layers } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import PageManagerForUser from '../../DesignerToolForEditor/PageManager/forUser';
import MaterialComponents from '../../DesignerToolForEditor/ThemeLayoutLibraryV3/MaterialComponents';
import { useGridContext } from '../../comp/provider';
import { getCanvaInfo2 } from '../../comp/provider/utils';
import { scrollToActiveRow } from '../../shared';
import MusicManager from '../../shared/LibContent/Music/MusicManager';
import PageNavigationV1 from '../PageNavigation';
import PageNavigationV2 from '../PageNavigationV2';
import styles from './SettingWidget.module.scss';

/**
 * 设计师和用户共用的组件管理器
 */
export default function SettingWidgetV2({
  worksData,
}: {
  worksData: IWorksData;
}) {
  const {
    editorSDK,
    editorCtx,
    gridsData,
    useGridV2,
    widgetStateV2,
    setWidgetStateV2,
    getRowByDepth,
    addRowFromTemplateV2,
    getActiveRootRow,
    gridProps,
  } = useGridContext();
  const currBlock = getActiveRootRow();
  const appid = getAppId();
  const fullStack = getPermissionData().materialProduct;
  const { isWebsite, maxPageCount, useMusic } = getCanvaInfo2();
  const [templateShow, setTemplateShow] = useState(false);
  const [templateShowV2, setTemplateShowV2] = useState(false);
  const [templateShowV3, setTemplateShowV3] = useState(false);
  const [showComponentSwitch, setShowComponentSwitch] = useState(false);
  const [showPintuanForm, setShowPintuanForm] = useState(false);
  const [showMkBaoMingV2Form, setShowMkBaoMingV2Form] = useState(false);
  const [showHuizhiForm, setShowHuizhiForm] = useState(false);
  const [showPageManager, setShowPageManager] = useState(false);

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
  const addPageable = gridsData.length < maxPageCount;

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

  const renderAddPageButton = () => {
    if (!addPageable) return null;
    if (gridsData.length > 1) {
      return (
        <div
          className={cn(styles.btnItem, showPageManager && 'active')}
          onClick={() => {
            setShowPageManager(!showPageManager);
          }}
        >
          <Layers size={20} className='mr-1' />
          <span>画布</span>
        </div>
      );
    }
    if (useGridV2) {
      return (
        <div
          className={styles.btnItem}
          onClick={() => {
            setTemplateShowV2(true);
          }}
        >
          <Icon name='add-one' size={20} />
          <span>添加页面</span>
        </div>
      );
    }
    if (!useGridV2) {
      return (
        <div className={styles.btnItem} onClick={() => setTemplateShow(true)}>
          <Icon name='add-one' size={20} />
          <span>添加页面</span>
        </div>
      );
    }
  };

  // TODO: 迁移其他组件的设置
  return (
    <div className='bg-white overflow-hidden p-4 py-2 sticky bottom-0 left-0 right-0 z-50 md:max-w-[375px] max-w-full'>
      {showPageManager && gridsData.length > 1 && <PageManagerForUser />}
      <div ref={newOperatingBtnRef} className={cls(styles.operatingBtns)}>
        {renderAddPageButton()}
      </div>

      <ResponsiveDialog
        isOpen={showMusicLib}
        // showOverlay={false}
        // showHandler={true}
        contentProps={{
          className: 'h-[605px]',
          style: {
            boxShadow: '0px 2px 14px 0px #55555533',
          },
        }}
        onOpenChange={val => {
          setShowMusicLib(val);
        }}
      >
        <>
          <MusicManager
            onClose={() => setShowMusicLib(false)}
            music={worksData.canvasData.music}
            setMusic={music => {
              editorSDK?.fullSDK.setMusic(music);
            }}
          />
        </>
      </ResponsiveDialog>
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
        title='添加页面2'
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
      <ResponsiveDialog
        isOpen={templateShowV3}
        handleOnly={true}
        showOverlay={false}
        onOpenChange={setTemplateShowV3}
        title='添加页面3'
        contentProps={{
          className: 'pt-2 h-[60vh]',
        }}
      >
        <MaterialComponents
          manager={false}
          // activeComponentGroupId={currBlock?.componentGroupRefId}
          dataType='blocks'
          onComponentClick={c => {
            // console.log('c', c);
            // return;
            const component = deepClone(c);
            try {
              component.data.rows[0].componentGroupRefId =
                currBlock?.componentGroupRefId;
              component.data.rows[0]._id = currBlock?.id;
              const { copiedRowDepth } = addRowFromTemplateV2(
                component.data,
                {
                  activeRowDepth: [widgetStateV2?.activeRowDepth?.[0] || 0],
                },
                false
              );
              scrollToActiveRow(getRowByDepth(copiedRowDepth || [])?.id || '');
              setWidgetStateV2({
                activeRowDepth: copiedRowDepth,
              });
              toast.success(`添加页面 ${component.compName || '未命名'} 成功`);
            } catch (error) {
              console.error('添加页面失败', error);
              toast.error('添加失败');
            }
            setTemplateShowV3(false);
          }}
        />
      </ResponsiveDialog>
    </div>
  );
}
