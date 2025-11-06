'use client';
import ImageCropper from '@/app/mobile/share/components/ImageCropper';
import {
  CanvaInfo2,
  getCanvaInfo2,
} from '@/components/GridV3/comp/provider/utils';
import { onScreenShot } from '@/components/GridV3/shared';
import LibPicture from '@/components/LibPicture';
import { getAppId } from '@/services';
import { getWorkData2, updateWorksDetail2 } from '@/services/works2';
import { canUseRnChoosePic, showRnChoosePic } from '@/utils/rnChoosePic';
import { useShareNavigation } from '@/utils/share';
import { trpc } from '@/utils/trpc';
import APPBridge from '@mk/app-bridge';
import { cdnApi } from '@mk/services';
import { BehaviorBox } from '@workspace/ui/components/BehaviorTracker';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Input } from '@workspace/ui/components/input';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Textarea } from '@workspace/ui/components/textarea';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import styles from './share.module.scss';

type ShareMode = 'public' | 'invitee';

interface PublicShareDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  worksId: string;
  mode?: ShareMode; // 分享模式：公开分享 或 专属分享
  contactId?: string; // 专属分享时的联系人ID
  contactName?: string; // 专属分享时的联系人姓名
}

export function PublicShareDialog({
  isOpen,
  onOpenChange,
  worksId,
  mode = 'public',
  contactId,
  contactName,
}: PublicShareDialogProps) {
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
  const router = useRouter();

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

  // 获取分享信息（根据模式加载不同的数据）
  useEffect(() => {
    const fetchShareInfo = async () => {
      if (!worksId) return;
      try {
        if (mode === 'invitee' && contactId) {
          // 专属分享：从联系人获取信息
          const contact = (await trpc.rsvp.getInviteeById.query({
            id: contactId,
          })) as {
            invite_title?: string;
            invite_desc?: string;
            name: string;
          };
          if (contact) {
            setShareTitle(
              contact.invite_title ||
                `邀请 ${contact.name || contactName} 参加活动`
            );
            setShareDesc(contact.invite_desc || '诚邀您参加活动');
          }
          // 封面仍然使用作品的封面
          const res = (await getWorkData2(worksId)) as any;
          const detail = res?.detail;
          const worksData = res?.work_data;
          if (detail) {
            setShareCover(detail.cover || '');
            const canvaInfo2 = getCanvaInfo2(detail, worksData);
            setCanvaInfo2(canvaInfo2);
          }
        } else {
          // 公开分享：使用作品信息
          const res = (await getWorkData2(worksId)) as any;
          const detail = res?.detail;
          const worksData = res?.work_data;
          if (detail) {
            setShareTitle(detail.title || '');
            setShareDesc(detail.desc || '');
            setShareCover(detail.cover || '');

            const canvaInfo2 = getCanvaInfo2(detail, worksData);
            setCanvaInfo2(canvaInfo2);
          }
        }
      } catch (error) {
        console.error('获取分享信息失败:', error);
      }
    };
    if (isOpen) {
      fetchShareInfo();
    }
  }, [worksId, isOpen, mode, contactId, contactName]);

  // 更新标题
  const updateTitle = async (title: string) => {
    if (mode === 'invitee' && contactId) {
      // 更新联系人的邀请标题
      try {
        await trpc.rsvp.updateInvitee.mutate({
          id: contactId,
          invite_title: title,
        });
      } catch (error) {
        console.error('更新邀请标题失败:', error);
      }
    } else {
      // 更新作品标题
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
      // 更新联系人的邀请描述
      try {
        await trpc.rsvp.updateInvitee.mutate({
          id: contactId,
          invite_desc: desc,
        });
      } catch (error) {
        console.error('更新邀请描述失败:', error);
      }
    } else {
      // 更新作品描述
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
        // 如果是App环境，直接分享
        if (isApp && !isMiniP) {
          APPBridge.appCall({
            type: 'MKShare',
            appid: 'jiantie',
            params: {
              title: shareTitle,
              type: 'images',
              shareType: 'wechat',
              urls,
            },
          });
        } else {
          // 否则跳转到长图分享页面
          toPosterShare(worksId);
        }
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

    APPBridge.appCall({
      type: 'MKShare',
      appid: 'jiantie',
      params: {
        title: shareTitle,
        content: shareDesc || '诚邀您参加活动',
        thumb: shareCover || '',
        type: 'link',
        shareType: to,
        url: shareLink,
      },
    });
  };

  const { videoSupport, posterSupport } = canvaInfo2?.shareInfo || {};

  return (
    <>
      <ResponsiveDialog
        fullHeight={true}
        handleOnly={true}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
      >
        <div className='h-full'>
          <div className='bg-white header text-base flex items-center justify-between px-4 py-2 border-b border-gray-200'>
            <span
              className='flex items-center gap-2 text-xs'
              onClick={() => {
                onOpenChange(false);
              }}
            >
              <ChevronLeft size={16} />
              <span>返回</span>
            </span>
            <span className='font-semibold'>分享邀请链接</span>
            <Button
              size={'sm'}
              variant={'link'}
              onClick={() => {
                onOpenChange(false);

                if (APPBridge.judgeIsInApp()) {
                  APPBridge.navToPage({
                    url: 'maka://home/activity/activityPage',
                    type: 'NATIVE',
                  });
                } else {
                  router.push('/mobile/home');
                }
              }}
            >
              回首页
            </Button>
          </div>
          <div className='p-4 space-y-4 bg-gray-50 '>
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

            {/* 分享功能 */}
            <div className='bg-white rounded-xl border border-gray-100 p-4 shadow-sm'>
              <div className={styles.title}>
                <Icon name='web-page-fill' color='#09090B' size={16} />
                <span>分享</span>
              </div>
              <div className={styles.shareTypes}>
                {/* 微信分享 */}
                {isApp && !isMiniP && (
                  <BehaviorBox
                    behavior={{
                      object_type:
                        mode === 'invitee'
                          ? 'rsvp_share_wechat_btn'
                          : 'share_wechat_btn',
                      object_id: worksId,
                    }}
                    className={styles.shareItem}
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
                    />
                    <span>微信</span>
                  </BehaviorBox>
                )}

                {/* 复制链接 */}
                <BehaviorBox
                  behavior={{
                    object_type:
                      mode === 'invitee'
                        ? 'rsvp_share_copy_link_btn'
                        : 'share_copy_link_btn',
                    object_id: worksId,
                  }}
                  className={styles.shareItem}
                  onClick={() => {
                    handleCopyLink(shareLink);
                  }}
                >
                  <img
                    src='https://img2.maka.im/cdn/webstore10/jiantie/icon_lianjie.png'
                    alt='复制链接'
                  />
                  <span>复制链接</span>
                </BehaviorBox>

                {/* 长图分享（仅公开分享且支持） */}
                {mode === 'public' && posterSupport && (
                  <BehaviorBox
                    behavior={{
                      object_type: 'share_poster_btn',
                      object_id: worksId,
                    }}
                    className={styles.shareItem}
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
                    <img
                      src='https://res.maka.im/cdn/webstore10/jiantie/icon_poster.png'
                      alt='长图'
                    />
                    <span>长图</span>
                  </BehaviorBox>
                )}

                {/* 导出视频（仅公开分享且支持） */}
                {mode === 'public' && videoSupport && (
                  <BehaviorBox
                    behavior={{
                      object_type: 'share_export_video_btn',
                      object_id: worksId,
                    }}
                    className={styles.shareItem}
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
                    <img
                      src='https://img2.maka.im/cdn/webstore10/jiantie/icon_video_v2.png'
                      alt='导出视频'
                    />
                    <span>导出视频</span>
                  </BehaviorBox>
                )}
              </div>
            </div>
          </div>
        </div>
      </ResponsiveDialog>

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
            // 封面始终更新到作品
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
