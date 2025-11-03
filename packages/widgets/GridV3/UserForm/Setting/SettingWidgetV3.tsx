import styled from '@emotion/styled';
import { deepClone } from '@mk/utils';
import MkBaoMingV2EditingPanel from '@mk/widgets/MkBaoMingV2/form-wap/EditingPanel';
import MkHuiZhiSetting from '@mk/widgets/MkHuiZhi/form/settingV1';
import MkPinTuanEditingPanel from '@mk/widgets/MkPinTuan/form-wap/EditingPanel';
import { IWorksData } from '@mk/works-store/types';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import MaterialComponents from '../../DesignerToolForEditor/ThemeLayoutLibraryV3/MaterialComponents';
import WidgetManager from '../../DesignerToolForEditor/WidgetManager';
import { useWidgetsAttrs } from '../../comp/WidgetLoader';
import { useGridContext } from '../../comp/provider';
import { getCanvaInfo2 } from '../../comp/provider/utils';
import { scrollToActiveRow } from '../../shared';
import MusicManager from '../../shared/LibContent/Music/MusicManager';
import PageNavigationV1 from '../PageNavigation';
import PageNavigationV2 from '../PageNavigationV2';

const SettingWrapper = styled.div`
  /* bottom: var(--safe-area-inset-bottom, 0); */
`;

/**
 * 设计师和用户共用的组件管理器
 */
export default function SettingWidgetV3({
  worksData,
}: {
  worksData: IWorksData;
}) {
  const {
    editorSDK,
    editorCtx,
    gridsData,
    fullStack,
    widgetStateV2,
    setWidgetStateV2,
    getRowByDepth,
    addRowFromTemplateV2,
    getActiveRootRow,
  } = useGridContext();
  const currBlock = getActiveRootRow();
  const { compAttrsMap } = useWidgetsAttrs({ needInit: true, worksData });
  const { isWebsite, maxPageCount, isFlatPage } = getCanvaInfo2();
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

  const renderPintuanForm = () => {
    const component = compAttrsMap.MkPinTuan;
    if (!component) return null;

    const { elemId, attrs } = component;

    return (
      <MkPinTuanEditingPanel
        editorCtx={editorCtx}
        onFormValueChange={(nextVal: any) => {
          editorSDK?.changeCompAttr(elemId, nextVal);
        }}
        onChange={(data: any) => {
          editorSDK?.changeCompAttr(elemId, {
            ...component,
            attrs: {
              ...component.attrs,
              ...data,
            },
          });
        }}
        onClose={() => setShowPintuanForm(false)}
        formControledValues={attrs as any}
      />
    );
  };

  const renderMkBaoMingV2Form = () => {
    const component = compAttrsMap.MkBaoMingV2;
    if (!component) return null;

    const { elemId, attrs } = component;

    return (
      <MkBaoMingV2EditingPanel
        editorCtx={editorCtx}
        onFormValueChange={(nextVal: any) => {
          editorSDK?.changeCompAttr(elemId, nextVal);
        }}
        onChange={(data: any) => {
          editorSDK?.changeCompAttr(elemId, {
            ...component,
            attrs: {
              ...component.attrs,
              ...data,
            },
          });
        }}
        onClose={() => setShowMkBaoMingV2Form(false)}
        formControledValues={attrs as any}
      />
    );
  };

  if (!addPageable && !isWebsite) {
    return null;
  }

  const renderAddPageButton = () => {
    if (!addPageable) return null;
  };

  // TODO: 迁移其他组件的设置
  return (
    <>
      <SettingWrapper className='SettingWidgetV3 sticky bottom-0 left-0 right-0 z-50 md:max-w-[375px] max-w-full'>
        {/* {!isFlatPage && !fullStack && gridsData.length > 1 && (
          <div className='bg-white p-2 PageManagerForUser'>
            <PageManagerForUser />
          </div>
        )} */}
        {/* {!isFlatPage && (
          <div className='bg-white p-2'>
            {!fullStack && gridsData.length > 1 && <PageManagerForUser />}
            <div ref={newOperatingBtnRef} className={cls(styles.operatingBtns)}>
              {renderAddPageButton()}
            </div>
          </div>
        )} */}
      </SettingWrapper>

      <ResponsiveDialog
        contentProps={{
          className: 'h-[600px]',
        }}
        isOpen={showPintuanForm}
        onOpenChange={setShowPintuanForm}
      >
        {renderPintuanForm()}
      </ResponsiveDialog>
      <ResponsiveDialog
        contentProps={{
          className: 'h-[600px]',
        }}
        isOpen={showMkBaoMingV2Form}
        onOpenChange={setShowMkBaoMingV2Form}
      >
        {renderMkBaoMingV2Form()}
      </ResponsiveDialog>
      <ResponsiveDialog
        isOpen={showHuizhiForm}
        onOpenChange={setShowHuizhiForm}
      >
        <MkHuiZhiSetting
          compAttrsMap={{
            MkHuiZhi: compAttrsMap.MkHuiZhi,
            MkBulletScreen_v2: compAttrsMap.MkBulletScreen_v2,
            MkMapV3: compAttrsMap.MkMapV3,
            MkGift: compAttrsMap.MkGift,
          }}
          onClose={() => setShowHuizhiForm(false)}
          onFormValueChange={(elemId: string, nextVal: any) => {
            editorSDK?.changeCompAttr(elemId, nextVal);
          }}
          onChange={data => {
            editorSDK?.changeCompAttr(data.MkHuiZhi?.elemId || '', {
              ...data.MkHuiZhi?.attrs,
            });
            editorSDK?.changeCompAttr(data.MkBulletScreen_v2?.elemId || '', {
              ...data.MkBulletScreen_v2?.attrs,
            });
            editorSDK?.changeCompAttr(data.MkGift?.elemId || '', {
              ...data.MkGift?.attrs,
            });
          }}
        />
      </ResponsiveDialog>
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
      <ResponsiveDialog
        isOpen={showComponentSwitch}
        handleOnly={true}
        showOverlay={false}
        onOpenChange={setShowComponentSwitch}
        title='组件开关'
        contentProps={{
          className: 'pt-2 h-[60vh]',
        }}
      >
        <WidgetManager onSetting={onSetting} worksData={worksData} />
      </ResponsiveDialog>
    </>
  );
}
