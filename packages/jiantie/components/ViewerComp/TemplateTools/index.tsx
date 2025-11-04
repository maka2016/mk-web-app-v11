'use client';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import styles from './index.module.scss';
import { useEffect, useState } from 'react';
import { CompLoader } from '@/components/viewer/components/CompLoader';
import { Icon } from '@workspace/ui/components/Icon';
import { cdnApi } from '@mk/services';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
interface Props {
  readonly?: boolean;
  style?: React.CSSProperties;
}
const TemplateTools = (props: Props) => {
  const [open, setOpen] = useState(false);
  const t = useTranslations('Viewer');

  useEffect(() => {
    document.body?.style.setProperty('--preview-header-height', '44px');
    document.body?.style.setProperty('--preview-footer-height', '66px');
    return () => {
      document.body?.style.setProperty('--preview-header-height', '0px');
      document.body?.style.setProperty('--preview-footer-height', '0px');
    };
  }, []);

  const renderCanvasItem = (type: string) => {
    const getContainerInfo = (id: string) => {
      return {
        // ...props.worksData.positionLink[id],
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rotate: 0,
        disabled: false,
        visibility: true,
      };
    };
    return (
      <CompLoader
        id=''
        pageInfo={{
          id: '',
          opacity: 1,
          background: {},
          layers: [],
          width: 0,
          height: 0,
          pageIndex: 0,
        }}
        isActivePage={true}
        isShowPage={true}
        wrapper={child => child}
        lifecycle={
          {
            didLoaded: () => {},
            didMount: () => {},
          } as any
        }
        elementRef={type}
        contentProps={{
          // ...attrs,
          isViewerTool: true,
          isTemplate: true,
        }}
        getContainerInfo={getContainerInfo}
        // body={}
        canvaInfo={{
          scaleRate: 1,
          canvaH: 0,
          canvaW: 0,
          scaleZommRate: 1,
        }}
      />
    );
  };

  // 导航
  const openLocation = () => {
    toast(t('tip'));
  };

  return (
    <div className={styles.tools} style={props.style}>
      <div
        className={styles.comment}
        onClick={() => {
          const btn: any = document.querySelector('#MkBulletScreen_v2_btn');
          if (btn) {
            btn.click();
          }
        }}
      >
        <Icon name='comment' size={18} color='#fff' />
        <span>{t('comment')}</span>
      </div>

      <div
        className={styles.receipt}
        onClick={() => {
          setOpen(true);
        }}
      >
        <img src='/assets/_logo.png' alt='' />
        <span>{t('receipt')}</span>
      </div>

      <div
        className={styles.btn}
        onClick={() => {
          openLocation();
        }}
      >
        <Icon name='navigation' size={16} color='#fff' />
        <span>{t('navigation')}</span>
      </div>
      <div
        className={styles.btn}
        onClick={() => {
          const btn: any = document.querySelector('#MkGift_btn');

          if (btn) {
            btn.click();
          }
        }}
      >
        <img src={cdnApi('/cdn/webstore10/editor/icon_gift.png')} alt='' />
        <span>{t('gift')}</span>
      </div>
      {renderCanvasItem('MkBulletScreen_v2')}
      {renderCanvasItem('MkGift')}

      <ResponsiveDialog
        isOpen={open}
        onOpenChange={setOpen}
        contentProps={{
          className: styles.dialog,
        }}
      >
        <>
          <Icon
            name='close'
            size={20}
            onClick={() => setOpen(false)}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              cursor: 'pointer',
              zIndex: 9,
            }}
          />
          {renderCanvasItem('MkHuiZhi')}
        </>
      </ResponsiveDialog>
    </div>
  );
};

export default TemplateTools;
