'use client';

import LibTemplate from '@/app/editor/mobile2/LibContent/Template';
import { getAppId, getPermissionList, getToken, getUid } from '@/services';
import { useStore } from '@/store';
import { getUrlWithParam } from '@/utils';
import { toVipPage } from '@/utils/jiantie';
import { trpc } from '@/utils/trpc';
import APPBridge from '@mk/app-bridge';
import CommonLogger from '@mk/loggerv7/logger';
import { EventEmitter } from '@mk/utils';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

function CreateBtn({
  templateDetail,
  templateId,
}: {
  templateDetail: any;
  templateId: string;
}) {
  const t = useTranslations('Template');
  const { setLoginShow, permissions } = useStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [editLoading, setEditLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const appid = getAppId();
  const [inBrowser, setInBrowser] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [templateWorks, setTemplateWorks] = useState<any[]>([]);
  const [showTemplateLib, setShowTemplateLib] = useState(false);
  const preWorksId = searchParams.get('pre_works_id');
  const [isMiniProgram, setIsMiniProgram] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setInBrowser(true);
      setIsMiniProgram(APPBridge.judgeIsInMiniP());
    }
  }, []);

  useEffect(() => {
    if (templateId) {
      CommonLogger.track_pageview({
        page_type: 'template_page',
        page_id: templateId,
        ref_object_id: templateId,
      });
    }
  }, [templateId]);

  useEffect(() => {
    if (templateDetail && showTemplateLib) {
      const scrollDom = document.querySelector('#auto-scroll-container');
      if (scrollDom) {
        scrollDom.scrollTo({
          top: 0,
          behavior: 'auto',
        });
      }

      EventEmitter.emit('autoScroll', true);
      toast.dismiss();
    }
  }, [templateDetail]);

  const toEditor = (works_id: string) => {
    const uid = getUid();
    router.replace(
      getUrlWithParam(
        `/editor?works_id=${works_id}&uid=${uid}&appid=${appid}&is_full_screen=1&popEnable=0${preWorksId ? `&pre_works_id=${preWorksId}` : ''}`,
        'clickid'
      )
    );
    toast.dismiss();
    return;
  };

  const createWorks = async () => {
    if (editLoading) {
      return;
    }

    setEditLoading(true);
    toast.loading(t('creating'));
    try {
      const worksRes = await trpc.works.create.mutate({
        template_id: templateDetail.id,
        title: templateDetail.title,
        desc: templateDetail.desc,
        cover: templateDetail.cover,
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
        setLoginShow(true);
      }
      return;
    }
    if (checkLoading) {
      return;
    }

    setCheckLoading(true);

    if (appid !== 'maka') {
      const totalWorks = await trpc.works.count.query({
        deleted: false,
      });

      const userPermissions: any = permissions;

      if (!userPermissions.works_num) {
        const uid = getUid();
        const res2 = (await getPermissionList(appid, uid)) as any;
        if (res2.permissions) {
          res2.permissions.forEach((item: any) => {
            userPermissions[item.alias] = item.value || 'true';
          });
        }
      }

      const releaseNum = +(userPermissions.works_num || 0);

      // 限制创建个数
      if (!releaseNum || totalWorks >= releaseNum) {
        toast.error('创作数量已达上限');
        toVipPage();
        setCheckLoading(false);
        return;
      }
    }

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

  const onChangeTemplateId = (templateId: string) => {
    toast.loading(t('loading'));
    setTimeout(() => {
      toast.dismiss();
    }, 3000);

    const params = new URLSearchParams(searchParams);
    params.set('id', templateId);

    router.replace(`?${params.toString()}`, {
      scroll: false,
    });
    EventEmitter.emit('autoScroll', false);

    // router.replace(`/mobile/template?id=${templateId}&pre_work`, { scroll: false });
  };

  return (
    <div>
      <div className='w-full gap-2 flex'>
        {preWorksId && (
          <Button
            className='flex-1'
            size='sm'
            variant='outline'
            onClick={() => setShowTemplateLib(true)}
          >
            {t('viewMore')}
          </Button>
        )}
        <Button
          className='flex-1 rounded-lg'
          size='sm'
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
                  className='flex items-center gap-2 p-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors'
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

      <ResponsiveDialog
        isOpen={showTemplateLib}
        onOpenChange={setShowTemplateLib}
        showOverlay={false}
        contentProps={{
          className: 'pt-2',
        }}
        title={t('moreTemplates')}
      >
        <LibTemplate templateId={templateId} onChange={onChangeTemplateId} />
      </ResponsiveDialog>
    </div>
  );
}

export default observer(CreateBtn);
