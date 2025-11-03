'use client';
import Watermark from '@/app/editor/mobile2/Watermark';
import CanvasAutoLayout from '@/app/editor/SimpleEditor/CanvasAutoLayout';
import { useWorksStore } from '@/app/editor/useStore';
import SaveErrorDialog from '@/components/SaveErrorDialog';
import { getAppId } from '@/services';
import { cdnApi } from '@mk/services';
import { calcViewerHeight } from '@mk/widgets/GridV3/comp/utils';
import { undoManager } from '@mk/works-store/store';
import { BehaviorBox } from '@workspace/ui/components/BehaviorTracker';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { ResponsiveTooltip } from '@workspace/ui/components/responsive-tooltip';
import cls from 'classnames';
import { observer } from 'mobx-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import styles from './index.module.scss';
import PosterDownload from './PosterDownload';
import Preview from './Preview';
import VideoDownload from './VideoDownload';

const guideContent: Record<string, string> = {
  jiantie: cdnApi('/cdn/webstore10/editor/guide_content_v2.png'),
  xueji: cdnApi('/cdn/webstore10/xueji/guide_content.png'),
  huiyao: cdnApi('/cdn/webstore10/huiyao/guide_content.png'),
};
interface Props {
  worksId: string;
  onCreate: (nextWorksId: string) => void;
}

const MobileEditor2 = (props: Props) => {
  const t = useTranslations('Editor');
  const { worksId } = props;

  const searchParams = useSearchParams();
  const appid = getAppId();

  const object_id = searchParams.get('object_id');
  const worksStore = useWorksStore();
  const [creating, setCreating] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const isWebsite =
    worksStore.worksDetail.specInfo?.export_format?.includes('html');
  const isPoster =
    worksStore.worksDetail.specInfo?.export_format?.includes('image');
  const isVideo =
    worksStore.worksDetail.specInfo?.export_format?.includes('video');

  const [showUserGuide, setShowUserGuide] = useState(() => {
    const hasSeenTip = localStorage.getItem('has_seen_user_guide');
    return !hasSeenTip;
  });

  const handleSave = async () => {
    try {
      toast.loading(t('saving'));
      setCreating(true);
      /**
       * 设置正确的页面高度并保存，确保下载的高度正常
       */
      const pageHeight = calcViewerHeight();
      worksStore.setPageCanvaHeight(0, pageHeight);
      await worksStore.api.saveWorks('manual');
      toast.dismiss();
      setCreating(false);

      if (isWebsite) {
        // 网站
        setPreviewMode(true);
      }
    } catch (error) {
      toast.dismiss();
      setShowErrorMessage(true);
      toast.error(t('failed'));
      setCreating(false);
    }
  };

  const saveWorks = async () => {
    setSaving(true);
    try {
      await worksStore?.api.saveWorks('manual');
      toast.success('保存成功');
      setSaving(false);
    } catch (error) {
      console.error(error);
      toast.error(`保存失败: ${error},请刷新页面`);
      setSaving(false);
    }
  };

  if (!worksStore) {
    return <div className=''>loading...</div>;
  }

  const { isSaved, saveError } = worksStore || {};

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header} id='editor_header'>
          <div className={'flex items-center gap-2'}>
            <div className='w-[88px] p-1'>
              <img
                src={cdnApi('/cdn/editor7/maka_logo.png')}
                alt=''
                className='w-full h-full'
              />
            </div>
            <div className={styles.split}></div>
            <div
              className='flex items-center'
              key={worksStore.worksData._version}
            >
              <div
                className={cls([
                  'p-2 flex items-center justify-center active:bg-primary/10',
                  !undoManager.isUndoable() && 'disabled opacity-25',
                ])}
                onClick={() => worksStore?.undo()}
              >
                <Icon name='undo' size={20} color='#151515'></Icon>
              </div>
              <div
                className={cls([
                  'p-2 flex items-center justify-center active:bg-primary/10',
                  !undoManager.isRndoable() && 'disabled opacity-25',
                ])}
                onClick={() => worksStore?.redo()}
              >
                <Icon name='redo' size={20} color='#151515'></Icon>
              </div>
            </div>
            <div className={styles.split}></div>

            <ResponsiveTooltip content='保存' trigger='hover'>
              <div className={styles.iconBtn} onClick={() => saveWorks()}>
                <Icon
                  name={
                    !isSaved
                      ? saveError
                        ? 'storagefail'
                        : 'saving'
                      : 'storage-success'
                  }
                  size={20}
                ></Icon>
              </div>
            </ResponsiveTooltip>

            <div className={styles.save}>
              {saveError ? (
                <span>保存失败</span>
              ) : (
                <span style={{ opacity: isSaved ? 0 : 1 }}>正在存储中...</span>
              )}
            </div>
          </div>

          <div className='flex items-center gap-2'>
            {(isPoster || isVideo) && (
              <Popover>
                <PopoverTrigger>
                  <BehaviorBox
                    behavior={
                      {
                        object_type: 'editor_publish_btn',
                        object_id: object_id || '',
                        ref_page_id: worksId || '',
                        parent_id: 'editor_page',
                      } as any
                    }
                    className={''}
                    onClick={handleSave}
                  >
                    <Button disabled={creating} size='sm'>
                      <div className='flex items-center gap-1'>
                        <Icon
                          name='download'
                          size={16}
                          color='var(--btn-text-color)'
                        />
                        <span>导出</span>
                      </div>
                    </Button>
                  </BehaviorBox>
                </PopoverTrigger>
                <PopoverContent className='p-0 w-[400px]'>
                  {isVideo ? (
                    <VideoDownload worksId={worksId} />
                  ) : (
                    <PosterDownload worksId={worksId} />
                  )}
                </PopoverContent>
              </Popover>
            )}

            {isWebsite && (
              <BehaviorBox
                behavior={
                  {
                    object_type: 'editor_publish_btn',
                    object_id: object_id || '',
                    ref_page_id: worksId || '',
                    parent_id: 'editor_page',
                  } as any
                }
                className={''}
                onClick={handleSave}
              >
                <Button disabled={creating} size='sm'>
                  预览/分享
                </Button>
              </BehaviorBox>
            )}
          </div>
        </div>
        <div
          id='editor_container'
          className='relative flex-1 w-[375px] overflow-hidde flex flex-col shadow-md bg-white'
        >
          <div
            className='relative z-10 flex justify-center w-full overflow-y-auto overflow-x-hidden flex-1'
            id='designer_scroll_container'
          >
            <div
              className='w-full h-full relative w-[375px] '
              id='designer_canvas_container'
            >
              <div
                className='h-full w-full flex'
                id='designer_canvas_container_inner'
              >
                <CanvasAutoLayout readonly={false} />
              </div>
            </div>
          </div>
          {isPoster && <Watermark worksId={worksId} />}
        </div>

        {showUserGuide && (
          <div
            className={styles.userGuide}
            onClick={() => {
              setShowUserGuide(false);
              localStorage.setItem('has_seen_user_guide', 'true');
            }}
          >
            <div className={styles.guideContent}>
              <div className={styles.title}>
                <Icon name='star1' size={14} />
                <span>{t('adaptiveTemplate')}</span>
                <Icon name='star1' size={14} />
              </div>
              <img src={guideContent[appid]} />
              <div className={styles.desc}>{t('tip1')}</div>
              <div className={styles.desc}>{t('tip2')}</div>
              <img
                className='mt-1'
                src={
                  appid !== 'jiantie'
                    ? cdnApi(
                        '/cdn/webstore10/editor/guide_content_bottom_v3.png'
                      )
                    : cdnApi('/cdn/webstore10/editor/guide_content_bottom.png')
                }
                alt=''
              />
              <div className={styles.desc}>
                {appid === 'jiantie'
                  ? '底部按钮可添加页面、设置回执信息、音乐'
                  : '底部按钮可添加页面、设置报名信息、音乐'}
              </div>
            </div>

            <Button
              size='lg'
              className={styles.btn}
              onClick={() => {
                setShowUserGuide(false);
                localStorage.setItem('has_seen_user_guide', 'true');
              }}
            >
              {t('startCreating')}
            </Button>
          </div>
        )}
      </div>

      {previewMode && (
        <Preview worksId={worksId} onClose={() => setPreviewMode(false)} />
      )}

      <SaveErrorDialog
        open={showErrorMessage}
        onOpenChange={setShowErrorMessage}
        onRetry={() => {}}
      ></SaveErrorDialog>
    </>
  );
};

export default observer(MobileEditor2);
