'use client';
import { getAllLayers } from '@/app/editor/SimpleEditor/utils';
import ImageCropper from '@/app/mobile/share/components/ImageCropper';
import {
  CanvaInfo2,
  getCanvaInfo2,
} from '@/components/GridV3/comp/provider/utils';
import { onScreenShot } from '@/components/GridV3/shared';
import LibPicture from '@/components/LibPicture';
import { request } from '@/services';
import { getWorkData2, updateWorksDetail2 } from '@/services/works2';
import { getUrlWithParam } from '@/utils';
import { canUseRnChoosePic, showRnChoosePic } from '@/utils/rnChoosePic';
import { useShareNavigation } from '@/utils/share';
import { trpc } from '@/utils/trpc';
import APPBridge from '@mk/app-bridge';
import { API, cdnApi, getAppId } from '@mk/services';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Loading } from '@workspace/ui/components/loading';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Textarea } from '@workspace/ui/components/textarea';
import {
  Image as ImageIcon,
  Link as LinkIcon,
  Video as VideoIcon,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useRSVPLayout } from '../RSVPLayoutContext';

export default function SharePage() {
  const { setTitle, setRightText, setRightContent, setOnRightClick } =
    useRSVPLayout();
  const searchParams = useSearchParams();
  const router = useRouter();

  const worksId = searchParams.get('works_id') || '';
  const mode = (searchParams.get('mode') as 'public' | 'invitee') || 'public';
  const contactId = searchParams.get('contact_id') || undefined;
  const contactName = searchParams.get('contact_name') || undefined;
  const formConfigId = searchParams.get('form_config_id') || '';

  // 设置页面标题和右上角按钮
  useEffect(() => {
    setTitle('分享邀请链接');

    // 公开分享和邀请模式下都显示"完成"按钮
    setRightText('完成');
    setRightContent(null);

    const handleComplete = () => {
      if (mode === 'public') {
        // 公开分享模式：跳转到作品列表页
        if (APPBridge.judgeIsInApp()) {
          router.push(
            getUrlWithParam(
              `/mobile/home2?default_tab=1&appid=${getAppId()}`,
              'clickid'
            )
          );
        } else {
          router.replace('/mobile/home2?default_tab=1');
        }
      } else if (mode === 'invitee') {
        // 邀请模式：跳转到嘉宾列表页
        const inviteesUrl = `/mobile/rsvp/invitees?works_id=${worksId}&form_config_id=${formConfigId}`;
        if (APPBridge.judgeIsInApp()) {
          APPBridge.navToPage({
            url: `${window.location.origin}${inviteesUrl}`,
            type: 'URL',
          });
        } else {
          router.push(inviteesUrl);
        }
      }
    };

    setOnRightClick(() => handleComplete);

    return () => {
      setRightText('');
      setRightContent(null);
      setOnRightClick(undefined);
    };
  }, [
    mode,
    worksId,
    formConfigId,
    router,
    setTitle,
    setRightText,
    setRightContent,
    setOnRightClick,
  ]);

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
  const [generatingContent, setGeneratingContent] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { toPosterShare, toVideoShare } = useShareNavigation();

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
        // 生成封面的函数
        const generateCover = async (works_id: string) => {
          const screenshotRes = await onScreenShot({
            id: works_id,
            width: 375,
            height: 375,
            appid: getAppId(),
          });
          setShareCover(screenshotRes[0]);
          updateWorksDetail2(works_id, {
            cover: screenshotRes[0],
          } as any);
        };

        // 1. 先获取作品信息（无论哪种模式都需要）
        const res = await getWorkData2(worksId);
        const detail = res?.detail;
        const worksData = res?.work_data;

        if (!detail) return;

        console.log('[RSVP Share] 作品信息:', {
          worksId,
          title: detail.title,
          desc: detail.desc,
          is_title_desc_modified: detail.is_title_desc_modified,
          hasCover: !!detail.cover,
        });

        // 2. 设置画布信息
        const canvaInfo2 = getCanvaInfo2(detail as any, worksData);
        setCanvaInfo2(canvaInfo2);

        // 3. 准备异步任务数组
        const tasks: Promise<any>[] = [];
        let needGeneration = false;

        // 3.1 检查是否需要生成封面
        if (!detail.cover || /gif/gi.test(detail.cover)) {
          console.log('[RSVP Share] 需要生成封面');
          tasks.push(generateCover(worksId));
          needGeneration = true;
        } else {
          setShareCover(detail.cover);
        }

        // 3.2 判断是否需要自动生成标题和描述
        let finalWorksTitle = detail.title || '';
        let finalWorksDesc = detail.desc || '';

        if (worksData && !detail.is_title_desc_modified) {
          console.log('[RSVP Share] 需要生成标题和描述');
          needGeneration = true;
          const generateMetaTask = (async () => {
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
                finalWorksTitle = metaRes.title;
                finalWorksDesc = metaRes.desc;

                console.log('[RSVP Share] AI生成结果:', {
                  title: metaRes.title,
                  desc: metaRes.desc,
                });

                // 保存生成的标题和描述
                try {
                  await updateWorksDetail2(worksId, {
                    title: metaRes.title,
                    desc: metaRes.desc,
                    is_title_desc_modified: true,
                  });
                  console.log(
                    '[RSVP Share] 标题描述已保存，is_title_desc_modified 设置为 true'
                  );
                } catch (error) {
                  console.error('[RSVP Share] 保存标题描述失败:', error);
                }

                return metaRes;
              }
            }
            return null;
          })();

          tasks.push(generateMetaTask);
        }

        // 3.3 如果有需要生成的内容，显示 loading 并等待所有任务完成
        if (needGeneration && tasks.length) {
          setGeneratingContent(true);
          const results = await Promise.all(tasks);
          setGeneratingContent(false);

          // 如果有标题描述生成结果，更新 finalWorksTitle 和 finalWorksDesc
          const metaResult = results.find(r => r && r.title && r.desc);
          if (metaResult) {
            finalWorksTitle = metaResult.title;
            finalWorksDesc = metaResult.desc;
          }
        }

        // 4. 根据模式设置最终的分享标题和描述
        if (mode === 'invitee' && contactId) {
          // 邀请模式：获取联系人信息，构建包含联系人姓名和作品标题的分享标题
          const contact = (await trpc.rsvp.getInviteeById.query({
            id: contactId,
          })) as {
            invite_title?: string;
            invite_desc?: string;
            name: string;
          };

          if (contact) {
            const defaultTitle = finalWorksTitle
              ? `诚邀 ${contact.name || contactName} - ${finalWorksTitle}`
              : `邀请 ${contact.name || contactName} 参加活动`;
            setShareTitle(contact.invite_title || defaultTitle);
            setShareDesc(contact.invite_desc || '诚邀您参加活动');
          }
        } else {
          // 公开模式：直接使用作品标题和描述
          setShareTitle(finalWorksTitle);
          setShareDesc(finalWorksDesc);
        }
      } catch (error) {
        console.error('获取分享信息失败:', error);
        setGeneratingContent(false);
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
      <div className='p-3 space-y-3 bg-[#F1F5F9]'>
        {/* 编辑标题、描述和封面 */}
        <div className='bg-white rounded-xl p-4 space-y-3'>
          <div className='flex items-center justify-between'>
            <p className='text-xs font-semibold text-[#64748B] leading-[18px]'>
              编辑标题、描述和封面
            </p>
            <div className='px-2 py-0.5 rounded'>
              <p className='text-xs font-semibold text-[#3358D4] leading-[18px]'>
                自动
              </p>
            </div>
          </div>

          {/* 标题输入 */}
          <div className='relative'>
            <Input
              value={shareTitle}
              onChange={e => setShareTitle(e.target.value)}
              onBlur={() => updateTitle(shareTitle)}
              className='w-full bg-white border-[#C1D0FF] rounded-md px-3 py-2 text-sm font-semibold text-[rgba(0,0,0,0.88)] leading-5 pr-14'
              placeholder='请输入标题'
              maxLength={36}
            />
            <div className='absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#020617] leading-[18px]'>
              {shareTitle.length}/36
            </div>
          </div>

          {/* 封面和描述 */}
          <div className='flex gap-2'>
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
              <div className='w-24 h-24 rounded-md bg-gray-200 overflow-hidden'>
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
                className='absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-1 rounded-b-md cursor-pointer'
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
                className='w-full bg-white border-[#C1D0FF] rounded-md px-3 py-2 text-xs text-[rgba(0,0,0,0.88)] leading-[18px] min-h-[96px] resize-none'
                placeholder='请输入描述'
                maxLength={60}
              />
              <div className='absolute bottom-2 right-3 text-xs text-[#020617] leading-[18px]'>
                {shareDesc.length}/60
              </div>
            </div>
          </div>
        </div>

        {/* 导出其他格式 */}
        <div className='bg-white rounded-xl p-4 space-y-3'>
          <p className='text-xs font-semibold text-[#64748B] leading-[18px]'>
            导出其他格式
          </p>
          <div className='flex gap-3'>
            {posterSupport && (
              <Button
                variant='outline'
                className='flex-1 justify-center gap-1 bg-white border-[#E2E8F0] rounded-lg px-4 py-2 h-auto'
                disabled={!!executingKey}
                onClick={async () => {
                  if (executingKey) return;
                  setExecutingKey('poster');
                  try {
                    toPosterShare(worksId);
                  } finally {
                    setExecutingKey(null);
                  }
                }}
              >
                <ImageIcon size={14} className='text-[#020617]' />
                <span className='text-sm font-semibold text-[#020617] leading-5'>
                  图片
                </span>
              </Button>
            )}

            {videoSupport && (
              <Button
                variant='outline'
                className='flex-1 justify-center gap-1 bg-white border-[#E2E8F0] rounded-lg px-4 py-2 h-auto'
                disabled={!!executingKey}
                onClick={async () => {
                  if (executingKey) return;
                  setExecutingKey('video');
                  try {
                    toVideoShare(worksId);
                  } finally {
                    setExecutingKey(null);
                  }
                }}
              >
                <VideoIcon size={14} className='text-[#020617]' />
                <span className='text-sm font-semibold text-[#020617] leading-5'>
                  视频
                </span>
              </Button>
            )}

            <Button
              variant='outline'
              className='flex-1 justify-center gap-1 bg-white border-[#E2E8F0] rounded-lg px-4 py-2 h-auto'
              onClick={() => {
                handleCopyLink(shareLink);
              }}
            >
              <LinkIcon size={14} className='text-[#020617]' />
              <span className='text-sm font-semibold text-[#020617] leading-5'>
                复制链接
              </span>
            </Button>
          </div>
        </div>

        {/* 微信分享 */}
        {isApp && !isMiniP && (
          <div className='bg-white rounded-[14px] border border-[rgba(243,244,246,0.5)] p-4 space-y-2'>
            <p className='text-base font-semibold text-[#101828] leading-6'>
              📤 分享专属邀请函
            </p>
            <p className='text-[11px] text-[#4A5565] leading-4'>
              通过微信分享活动链接给嘉宾
            </p>
            <Button
              className='bg-[#00B900] hover:bg-[#00A000] text-white flex items-center justify-center gap-1 w-full h-10 rounded-[10px] px-4 py-2'
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
                className='w-6 h-6'
              />
              <span className='text-base font-semibold leading-6'>
                立即发送
              </span>
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

      {/* 生成中提示弹窗 */}
      <ResponsiveDialog
        isOpen={generatingContent}
        isDialog
        contentProps={{
          className: 'max-w-[320px]',
        }}
      >
        <div className='p-4 flex flex-col items-center gap-2 mx-2 max-w-[320px]'>
          <Loading />
          <div className=''>请稍等，标题和封面自动生成中...</div>
        </div>
      </ResponsiveDialog>
    </>
  );
}
