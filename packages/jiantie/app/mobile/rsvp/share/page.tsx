'use client';
import { getAllLayers } from '@/app/editor/SimpleEditor/utils';
import ImageCropper from '@/app/mobile/share/components/ImageCropper';
import {
  CanvaInfo2,
  getCanvaInfo2,
} from '@/components/GridV3/comp/provider/utils';
import { onScreenShot } from '@/components/GridV3/shared';
import LibPicture from '@/components/LibPicture';
import { getAppId, request } from '@/services';
import { getWorkData2, updateWorksDetail2 } from '@/services/works2';
import { canUseRnChoosePic, showRnChoosePic } from '@/utils/rnChoosePic';
import { useShareNavigation } from '@/utils/share';
import { trpc } from '@/utils/trpc';
import APPBridge from '@mk/app-bridge';
import { API, cdnApi } from '@mk/services';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Input } from '@workspace/ui/components/input';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Textarea } from '@workspace/ui/components/textarea';
import {
  Image as ImageIcon,
  Link as LinkIcon,
  Video as VideoIcon,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import styles from '../invitees/share.module.scss';
import { useRSVPLayout } from '../RSVPLayoutContext';

export default function SharePage() {
  const { setTitle } = useRSVPLayout();
  const searchParams = useSearchParams();

  // 设置页面标题
  useEffect(() => {
    setTitle('分享邀请链接');
  }, [setTitle]);

  const worksId = searchParams.get('works_id') || '';
  const mode = (searchParams.get('mode') as 'public' | 'invitee') || 'public';
  const contactId = searchParams.get('contact_id') || undefined;
  const contactName = searchParams.get('contact_name') || undefined;
  const from = searchParams.get('from') || '';

  // 内部状态管理
  const [shareTitle, setShareTitle] = useState<string>('');
  const [shareDesc, setShareDesc] = useState<string>('');
  const [shareCover, setShareCover] = useState<string>('');
  const [isApp, setIsApp] = useState(false);
  const [isMiniP, setIsMiniP] = useState(false);
  const [executingKey, setExecutingKey] = useState<string | null>(null);
  const [canvaInfo2, setCanvaInfo2] = useState<CanvaInfo2>();
  const [showCrop, setShowCrop] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState('');
  const [showPictureSelector, setShowPictureSelector] = useState(false);
  const [showCopyTip, setShowCopyTip] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { toPosterShare, toVideoShare } = useShareNavigation();
  const appid = getAppId();

  // 生成分享链接
  const shareLink = useMemo(() => {
    if (typeof window === 'undefined' || !worksId) return '';
    const origin = window.location.origin;
    if (mode === 'invitee' && contactId && contactName) {
      const params = new URLSearchParams();
      params.set('rsvp_invitee', contactName);
      params.set('rsvp_contact_id', contactId);
      return `${origin}/viewer2/${worksId}?${params.toString()}`;
    }
    return `${origin}/viewer2/${worksId}`;
  }, [worksId, mode, contactId, contactName]);

  // 初始化 APP 环境判断
  useEffect(() => {
    const initAPP = async () => {
      await APPBridge.init();
      setIsApp(APPBridge.judgeIsInApp());
      setIsMiniP(APPBridge.judgeIsInMiniP());
    };
    initAPP();
  }, []);

  // 获取分享信息
  useEffect(() => {
    const fetchShareInfo = async () => {
      if (!worksId) return;
      try {
        if (mode === 'invitee' && contactId) {
          const contact = (await trpc.rsvp.getInviteeById.query({
            id: contactId,
          })) as {
            invite_title?: string;
            invite_desc?: string;
            name: string;
          };
          const res = (await getWorkData2(worksId)) as any;
          const detail = res?.detail;
          const worksData = res?.work_data;
          if (contact) {
            const worksTitle = detail?.title || '';
            const defaultTitle = worksTitle
              ? `诚邀 ${contact.name || contactName} - ${worksTitle}`
              : `邀请 ${contact.name || contactName} 参加活动`;
            setShareTitle(contact.invite_title || defaultTitle);
            setShareDesc(contact.invite_desc || '诚邀您参加活动');
          }
          if (detail) {
            setShareCover(detail.cover || '');
            const canvaInfo2 = getCanvaInfo2(detail, worksData);
            setCanvaInfo2(canvaInfo2);
          }
        } else {
          const res = (await getWorkData2(worksId)) as any;
          const detail = res?.detail;
          const worksData = res?.work_data;
          if (detail) {
            setShareTitle(detail.title || '');
            setShareDesc(detail.desc || '');
            setShareCover(detail.cover || '');

            const canvaInfo2 = getCanvaInfo2(detail, worksData);
            setCanvaInfo2(canvaInfo2);

            // 如果标题和描述未被修改过，自动生成
            if (worksData && !detail.is_title_desc_modified) {
              const layers = getAllLayers(worksData);
              let workText = '';

              layers.forEach(layer => {
                if (layer.elementRef === 'Text') {
                  workText += layer.attrs.text;
                }
              });

              if (workText) {
                const metaRes: any = await request.post(
                  `${API('apiv10')}/ai-generate/work-meta`,
                  {
                    workText: workText?.slice(0, 500),
                  }
                );

                if (metaRes) {
                  setShareTitle(metaRes.title);
                  setShareDesc(metaRes.desc);

                  updateWorksDetail2(worksId, {
                    title: metaRes.title,
                    desc: metaRes.desc,
                    is_title_desc_modified: true,
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('获取分享信息失败:', error);
      }
    };
    fetchShareInfo();
  }, [worksId, mode, contactId, contactName]);

  // 更新标题
  const updateTitle = async (title: string) => {
    if (mode === 'invitee' && contactId) {
      try {
        await trpc.rsvp.updateInvitee.mutate({
          id: contactId,
          invite_title: title,
        });
      } catch (error) {
        console.error('更新邀请标题失败:', error);
      }
    } else {
      try {
        await updateWorksDetail2(worksId, {
          title,
          is_title_desc_modified: true,
        } as any);
      } catch (error) {
        console.error('更新标题失败:', error);
      }
    }
  };

  // 更新描述
  const updateDesc = async (desc: string) => {
    if (mode === 'invitee' && contactId) {
      try {
        await trpc.rsvp.updateInvitee.mutate({
          id: contactId,
          invite_desc: desc,
        });
      } catch (error) {
        console.error('更新邀请描述失败:', error);
      }
    } else {
      try {
        await updateWorksDetail2(worksId, {
          desc,
          is_title_desc_modified: true,
        } as any);
      } catch (error) {
        console.error('更新描述失败:', error);
      }
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setShowCopyTip(true);
    // 调用系统分享
    if (navigator.share && link) {
      navigator
        .share({
          title: shareTitle || '邀请链接',
          text: shareDesc || '邀请你参加活动',
          url: link,
        })
        .catch(error => {
          // 用户取消无需提示
          if (error && error.name !== 'AbortError') {
            toast.error('系统分享失败');
          }
        });
    }
  };

  // 分享长图
  const sharePoster = async () => {
    if (!worksId || !canvaInfo2) {
      toast.error('画布信息获取失败');
      return;
    }
    if (!canvaInfo2.shareInfo?.posterSupport) {
      toast.error('当前内容不支持导出图片');
      return;
    }

    toast.loading('图片生成中');
    try {
      const {
        viewportWidth,
        canvaVisualHeight = 1,
        viewportScale,
      } = canvaInfo2;
      const screenshotWidth = viewportWidth;
      const screenshotHeight = viewportScale * canvaVisualHeight;
      const urls = await onScreenShot({
        id: worksId,
        width: screenshotWidth,
        height: screenshotHeight,
        appid,
      });

      if (urls && urls.length > 0) {
        toPosterShare(worksId);
      }
    } catch {
      toast.error('图片生成失败');
    } finally {
      toast.dismiss();
    }
  };

  // 导出视频
  const shareVideo = async () => {
    if (!worksId) return;
    if (!canvaInfo2?.shareInfo?.videoSupport) {
      toast.error('当前内容不支持导出视频');
      return;
    }
    toVideoShare(worksId);
  };

  // 处理封面上传
  const onChangeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const maxSize = 50;
    let files = e.target.files;
    if (files?.length) {
      const file = files[0];
      if ((file as File).size * 0.001 > maxSize * 1024) {
        toast.error(`文件不能超过${maxSize}mb`);
        return;
      }
      setCropImageUrl(URL.createObjectURL(file));
      setShowCrop(true);
    }
  };

  // 分享到微信
  const shareToWechat = async (to: 'wechat' | 'wechatTimeline' = 'wechat') => {
    if (!shareTitle) {
      toast.error('请填写分享标题');
      return;
    }

    const thumbUrl = shareCover
      ? cdnApi(shareCover, {
          resizeWidth: 500,
          resizeHeight: 400,
          format: 'webp',
          quality: 85,
          mode: 'lfit',
        })
      : '';

    APPBridge.appCall({
      type: 'MKShare',
      appid: 'jiantie',
      params: {
        title: shareTitle,
        content: shareDesc || '诚邀您参加活动',
        thumb: thumbUrl,
        type: 'link',
        shareType: to,
        url: shareLink,
      },
    });
  };

  const { videoSupport, posterSupport } = canvaInfo2?.shareInfo || {};

  return (
    <>
      <div className='p-4 space-y-4'>
        {/* 编辑标题、描述和封面 */}
        <div className='bg-white rounded-xl border border-gray-100 p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-3'>
            <div className={styles.title}>
              <span>编辑标题、描述和封面</span>
            </div>
          </div>

          {/* 标题输入 */}
          <div className='mb-3'>
            <div className='relative'>
              <Input
                value={shareTitle}
                onChange={e => setShareTitle(e.target.value)}
                onBlur={() => updateTitle(shareTitle)}
                className='w-full bg-[#F3F3F5] border-none rounded-md px-3 py-2 text-sm'
                placeholder='请输入标题'
                maxLength={10}
              />
              <div className='absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400'>
                {shareTitle.length}/10
              </div>
            </div>
          </div>

          {/* 封面和描述 */}
          <div className='flex gap-3'>
            {/* 封面 */}
            <div className='relative flex-shrink-0'>
              <input
                className='hidden'
                ref={inputRef}
                onChange={onChangeUpload}
                type='file'
                accept='image/*'
                multiple={false}
                title='封面上传'
              />
              <div className='w-24 h-24 rounded-lg bg-gray-200 overflow-hidden'>
                {shareCover ? (
                  <img
                    src={cdnApi(shareCover)}
                    alt='封面'
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <div className='w-full h-full flex items-center justify-center text-xs text-gray-400'>
                    封面
                  </div>
                )}
              </div>
              <div
                className='absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-1 rounded-b-lg cursor-pointer'
                onClick={async () => {
                  if (await canUseRnChoosePic()) {
                    showRnChoosePic((url?: string) => {
                      if (url) {
                        setCropImageUrl(url);
                        setShowCrop(true);
                      }
                    });
                  } else if (APPBridge.judgeIsInApp()) {
                    setShowPictureSelector(true);
                  } else {
                    inputRef.current?.click();
                  }
                }}
              >
                更换封面
              </div>
            </div>

            {/* 描述 */}
            <div className='flex-1 relative'>
              <Textarea
                value={shareDesc}
                onChange={e => setShareDesc(e.target.value)}
                onBlur={() => updateDesc(shareDesc)}
                className='w-full bg-[#F3F3F5] border-none rounded-md px-3 py-2 text-sm min-h-[96px] resize-none'
                placeholder='请输入描述'
                maxLength={60}
              />
              <div className='absolute bottom-2 right-2 text-xs text-gray-400'>
                {shareDesc.length}/60
              </div>
            </div>
          </div>
        </div>

        {/* 导出其他格式 */}
        <div className='bg-white rounded-xl border border-gray-100 p-4 shadow-sm'>
          <div className={styles.title}>
            <Icon name='web-page-fill' color='#09090B' size={16} />
            <span>导出其他格式</span>
          </div>
          <div className='flex gap-2'>
            {posterSupport && (
              <Button
                variant='outline'
                className='w-full justify-center gap-2'
                disabled={!!executingKey}
                onClick={async () => {
                  if (executingKey) return;
                  setExecutingKey('poster');
                  try {
                    await sharePoster();
                  } finally {
                    setExecutingKey(null);
                  }
                }}
              >
                <ImageIcon size={20} />
                <span>图片</span>
              </Button>
            )}

            {videoSupport && (
              <Button
                variant='outline'
                className='w-full justify-center gap-2'
                disabled={!!executingKey}
                onClick={async () => {
                  if (executingKey) return;
                  setExecutingKey('video');
                  try {
                    await shareVideo();
                  } finally {
                    setExecutingKey(null);
                  }
                }}
              >
                <VideoIcon size={20} />
                <span>视频</span>
              </Button>
            )}

            <Button
              variant='outline'
              className='w-full justify-center gap-2'
              onClick={() => {
                handleCopyLink(shareLink);
              }}
            >
              <LinkIcon size={20} />
              <span>复制链接</span>
            </Button>
          </div>
        </div>

        {/* 微信分享 */}
        {isApp && !isMiniP && (
          <div className='bg-white rounded-xl border border-gray-100 p-4 shadow-sm'>
            <div className='flex items-center gap-2 mb-2'>
              <div className={styles.title}>
                <span>分享专属邀请函</span>
              </div>
              <Icon name='send' color='#FF6B35' size={16} />
            </div>
            <div className='text-sm text-gray-600 mb-4'>
              通过微信分享活动链接给嘉宾
            </div>
            <Button
              className='bg-[#07C160] hover:bg-[#06AD56] text-white flex items-center justify-center gap-2 w-full'
              disabled={!!executingKey}
              onClick={async () => {
                if (executingKey) return;
                setExecutingKey('wechat');
                try {
                  await shareToWechat('wechat');
                } finally {
                  setExecutingKey(null);
                }
              }}
            >
              <img
                src='https://img2.maka.im/cdn/webstore10/jiantie/icon_weixin.png'
                alt='微信'
                className='w-5 h-5'
              />
              <span>微信好友</span>
            </Button>
          </div>
        )}
      </div>

      {/* 封面裁剪弹窗 */}
      <ResponsiveDialog
        isOpen={showCrop}
        onOpenChange={setShowCrop}
        handleOnly={true}
      >
        <ImageCropper
          worksId={worksId}
          imageUrl={cropImageUrl}
          onClose={() => setShowCrop(false)}
          onChange={url => {
            setShareCover(url);
            updateWorksDetail2(worksId, {
              cover: url,
            });
            setShowCrop(false);
          }}
        />
      </ResponsiveDialog>

      {/* 图片选择弹窗 */}
      <ResponsiveDialog
        isOpen={showPictureSelector}
        onOpenChange={setShowPictureSelector}
        title='更换封面'
        contentProps={{
          className: 'pt-2',
        }}
      >
        <LibPicture
          preUpload={false}
          worksId={worksId}
          onSelectItem={(url: string) => {
            setCropImageUrl(url);
            setShowCrop(true);
            setShowPictureSelector(false);
          }}
        />
      </ResponsiveDialog>

      {/* 复制链接提示弹窗 */}
      <ResponsiveDialog
        isDialog
        isOpen={showCopyTip}
        onOpenChange={setShowCopyTip}
        contentProps={{
          className: 'max-w-[320px]',
        }}
      >
        <div className='p-4 flex flex-col items-center gap-2'>
          <div className='text-base font-semibold'>链接复制成功！</div>
          <div className='text-sm text-gray-600'>可粘贴链接分享至微信好友</div>
        </div>
      </ResponsiveDialog>
    </>
  );
}
