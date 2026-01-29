'use client';

import { getAppId, getToken, getUid } from '@/services';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { isPc } from '@/utils';
import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTracking } from '../../../../components/TrackingContext';

function CreateBtn({
  templateDetail,
  templateId,
  btnSize = 'sm',
  onSuccess,
}: {
  templateDetail: any;
  templateId: string;
  btnSize?: 'sm' | 'lg';
  onSuccess?: () => void;
}) {
  const t = useTranslations('Template');
  const store = useStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [editLoading, setEditLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const appid = getAppId();
  const [showDialog, setShowDialog] = useState(false);
  const [templateWorks, setTemplateWorks] = useState<any[]>([]);

  const trackMeta = useTracking();

  // 注意：如果需要在渲染时使用浏览器相关的值（如 isMiniProgram, inBrowser），
  // 应该使用以下模式来正确处理 SSR：
  //
  // 1. useState 初始化函数返回 SSR 安全的默认值（确保 SSR 和客户端首次渲染一致）
  //    const [isMiniProgram, setIsMiniProgram] = useState<boolean>(() => false);
  //
  // 2. useEffect 中使用 startTransition 更新，避免 React 19 的级联渲染警告
  //    useEffect(() => {
  //      if (typeof window !== 'undefined') {
  //        startTransition(() => {
  //          setIsMiniProgram(APPBridge.judgeIsInMiniP());
  //        });
  //      }
  //    }, []);
  //
  // 当前代码中这些值只在事件处理函数中使用，不在渲染中使用，所以直接调用函数即可
  // useEffect(() => {
  //   if (templateId) {
  //     // 从 URL 参数中获取 ref 数据
  //     // const ref_page_id = searchParams.get('ref_page_id');
  //     // const ref_page_type = searchParams.get('ref_page_type');

  //     // mkWebStoreLogger.track_pageview({
  //     //   ...trackMeta,
  //     //   page_type: 'template_page',
  //     //   page_id: templateId,

  //     // ref_object_id: templateId,
  //     // ...(ref_page_id && { ref_page_id }),
  //     // ...(ref_page_type && { ref_page_type }),
  //     // });
  //   }
  // }, [templateId, searchParams]);

  const toEditor = (works_id: string) => {
    const uid = getUid();
    store.push(`/maka-v2/editor?works_id=${works_id}&uid=${uid}`, {
      newWindow: isPc(),
      replace: !isPc(),
    });
    toast.dismiss();
    onSuccess?.();
    return;
  };

  const createWorks = async () => {
    if (editLoading) {
      return;
    }

    setEditLoading(true);
    toast.loading(t('creating'));
    try {
      // 从 URL 参数中获取 ref 信息
      const ref_page_id = searchParams.get('ref_page_id');
      const ref_page_type = searchParams.get('ref_page_type');
      const searchword = searchParams.get('searchword');

      // 构建 metadata 对象
      const metadata: any = { ...trackMeta };
      if (ref_page_id) {
        metadata.ref_page_id = ref_page_id;
      }
      if (ref_page_type) {
        metadata.ref_page_type = ref_page_type;
      }
      if (searchword) {
        metadata.searchword = searchword;
      }
      console.log('templateDetail', templateDetail);

      console.log({
        ...(Object.keys(metadata).length > 0 && { metadata }),
        template_id: templateDetail.id,
        title: templateDetail.title,
        desc: templateDetail.desc,
        cover: templateDetail.cover.url,
        appid: appid,
      });

      const worksRes = await trpc.works.create.mutate({
        ...(Object.keys(metadata).length > 0 && { metadata }),
        template_id: templateDetail.id,
        title: templateDetail.title,
        desc: templateDetail.desc,
        cover: templateDetail.cover.url,
        appid: appid,
      });
      toast.dismiss();
      if (worksRes?.id) {
        toEditor(worksRes.id);
      } else {
        toast.error(t('error'));
        setEditLoading(false);
      }
    } catch (err) {
      toast.error(t('error'));
      setEditLoading(false);
    }
  };

  const toEditAsk = async () => {
    if (!templateDetail) {
      return;
    }
    const token = getToken();
    // 未登录
    if (!token) {
      // 注意：这里直接调用函数，不需要从 state 读取
      // 因为只在事件处理中使用，不在渲染中使用
      if (APPBridge.judgeIsInApp()) {
        APPBridge.appCall({
          type: 'MKLogOut',
          jsCbFnName: '', // 回传方法 Json值：
        });
      } else if (APPBridge.judgeIsInMiniP()) {
        // APPBridge.minipNav("redirect", "/pages/login/index");
        APPBridge.miniPlogin(encodeURIComponent(location.href));
      } else {
        sessionStorage.setItem('login_callback', 'true');
        store.setLoginShow(true);
      }
      return;
    }
    if (checkLoading) {
      return;
    }

    setCheckLoading(true);

    const worksWithTemplate = await trpc.works.findMany.query({
      deleted: false,
      template_id: templateId,
      skip: 0,
      take: 10,
    });

    if (worksWithTemplate.length) {
      setTemplateWorks(worksWithTemplate);
      setShowDialog(true);
    } else {
      createWorks();
    }
    setCheckLoading(false);
  };

  return (
    <>
      <div className='w-full gap-2 flex'>
        <Button
          className='flex-1 rounded-lg'
          size={btnSize}
          disabled={checkLoading}
          onClick={() => toEditAsk()}
        >
          {editLoading ? t('creating') : t('startCreating')}
        </Button>
      </div>

      <ResponsiveDialog
        isDialog
        isOpen={showDialog}
        onOpenChange={setShowDialog}
        contentProps={{
          className: 'w-[320px] rounded-[20px] overflow-visible',
        }}
      >
        <div className='p-4'>
          <div className='text-base font-semibold text-black text-center mt-4 mb-1'>
            您已有{templateWorks.length}个作品使用过此模板
          </div>
          <div className='text-sm text-gray-500 text-center mb-4'>
            新建作品还是继续编辑？
          </div>

          <div className='max-h-[400px] overflow-y-auto mb-4'>
            <div className='space-y-2'>
              {templateWorks.map(work => (
                <div
                  key={work.id}
                  className='flex items-center gap-2 p-2 rounded-lg border border-gray-200'
                >
                  <div className='w-14 h-14 flex-shrink-0 rounded overflow-hidden bg-gray-100'>
                    {work.cover && (
                      <img
                        src={work.cover}
                        alt={work.title}
                        className='w-full h-full object-contain'
                      />
                    )}
                  </div>
                  <div className='flex-1 min-w-0 flex flex-col justify-center'>
                    <div className='text-sm font-medium text-gray-900 truncate leading-tight'>
                      {work.title || '无标题'}
                    </div>
                    <div className='text-xs text-gray-500 mt-1.5'>
                      更新于:{' '}
                      {dayjs(work.update_time || work.create_time).format(
                        'YYYY/MM/DD'
                      )}
                    </div>
                  </div>
                  <Button
                    size='sm'
                    className='flex-shrink-0 rounded-lg h-9 px-4'
                    onClick={() => {
                      toEditor(work.id);
                    }}
                  >
                    编辑
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Button
            autoFocus={false}
            size='lg'
            variant='outline'
            disabled={checkLoading}
            className='w-full rounded-xl'
            onClick={() => {
              setShowDialog(false);
              createWorks();
            }}
          >
            {checkLoading ? t('creating') : t('newWork')}
          </Button>
        </div>
      </ResponsiveDialog>
    </>
  );
}

export default observer(CreateBtn);
