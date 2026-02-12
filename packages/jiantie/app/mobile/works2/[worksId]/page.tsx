'use client';

import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { WorkDetailContent } from '@/components/WorksDetailContent';
import { API, request } from '@/services';
import { useStore } from '@/store';
import { SerializedWorksEntity, trpc } from '@/utils/trpc';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function WorkDetailPage({
  params,
}: {
  params: Promise<{ worksId: string }>;
}) {
  const t = useTranslations('WorkDetailPage');
  const store = useStore();
  const searchParams = useSearchParams();
  const editable = searchParams.get('editable') !== 'false';
  const [worksId, setWorksId] = useState<string | null>(null);
  const [work, setWork] = useState<SerializedWorksEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchaseStatus, setPurchaseStatus] = useState<
    'purchased' | 'not-purchased' | null
  >(null);

  // 获取动态路由参数
  useEffect(() => {
    params.then(p => {
      setWorksId(p.worksId);
    });
  }, [params]);

  // 加载作品详情
  useEffect(() => {
    const loadWork = async () => {
      if (!worksId) return;

      setLoading(true);
      try {
        const workData = await trpc.works.findById.query({ id: worksId });
        setWork(workData as unknown as SerializedWorksEntity);
      } catch (error: any) {
        toast.error(error?.message || t('加载作品失败'));
        console.error('Failed to load work:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWork();
  }, [worksId, t]);

  // 加载购买状态
  useEffect(() => {
    const loadPurchaseStatus = async () => {
      if (!worksId || store.isVip) {
        setPurchaseStatus(null);
        return;
      }

      try {
        const res = await request.get(
          `${API('apiv10')}/user-resources?type=purchased&resourceIds=${worksId}`
        );
        const purchasedWorks = res.data as Array<{
          expiryDate: string | null;
          resourceId: string;
        }>;

        const isPurchased = purchasedWorks.some(
          item => item.resourceId === worksId
        );
        setPurchaseStatus(isPurchased ? 'purchased' : 'not-purchased');
      } catch (error) {
        console.error('Failed to get purchased works:', error);
        setPurchaseStatus('not-purchased');
      }
    };

    loadPurchaseStatus();
  }, [worksId, store.isVip]);

  // 数据变更回调（删除/复制后返回列表页）
  const handleDataChange = () => {
    store.back();
  };

  // 关闭回调（返回列表页）
  const handleClose = () => {
    store.back();
  };

  const renderHeader = () => {
    return (
      <div className='header sticky top-0 z-10 bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between'>
        {/* 左边关闭按钮 */}
        <div
          className='p-1 cursor-pointer flex items-center gap-1'
          onClick={handleClose}
        >
          <ChevronLeft size={20} />
          <span className='text-sm'>{t('返回')}</span>
        </div>

        {/* 中间标题 */}
        <h2 className='text-base font-semibold text-[#09090B]'>{t('邀请函详情')}</h2>
        {<div className='w-16' />}
      </div>
    );
  };

  if (loading) {
    return (
      <div className='flex flex-col h-full bg-white'>
        {renderHeader()}
        <div className='flex-1 flex items-center justify-center'>
          <div className='flex items-center gap-2 text-gray-500'>
            <Loader2 className='w-5 h-5 animate-spin' />
            <span className='text-sm'>{t('加载中')}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!work) {
    return (
      <div className='flex flex-col h-full bg-white'>
        {renderHeader()}
        <div className='flex-1 flex items-center justify-center'>
          <div className='text-gray-500 text-sm'>{t('作品不存在')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-full bg-white'>
      {/* 内容区域 */}
      <div className='flex-1 overflow-hidden'>
        <MobileHeader
          leftText={t('返回')}
          title={t('邀请函详情')}
          onClose={handleClose}
        />
        <WorkDetailContent
          work={work}
          onClose={handleClose}
          onDataChange={handleDataChange}
          purchaseStatus={purchaseStatus}
          shareOnly={!editable}
        />
      </div>
    </div>
  );
}
