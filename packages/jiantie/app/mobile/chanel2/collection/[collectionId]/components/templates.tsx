'use client';

import { trpc } from '@/utils/trpc';
import { cdnApi } from '@mk/services';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Channel {
  id: number;
  alias: string;
  display_name: string;
  thumb_path: string | null;
  class: string;
  locale: string;
  template_ids: string[];
  parent_id: number | null;
  appid: string | null;
  create_time: Date;
  update_time: Date;
}

interface Template {
  id: string;
  title: string;
  desc: string | null;
  cover: string | null;
  spec_id: string | null;
  create_time: Date;
  update_time: Date;
  custom_time: Date;
}

interface TemplatesProps {
  collectionId: number;
}

export default function Templates({ collectionId }: TemplatesProps) {
  const router = useRouter();
  const [collection, setCollection] = useState<Channel | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 获取集合详情
        const collectionData = await trpc.channel.getChannelDetail.query({
          id: collectionId,
          locale: 'zh-CN',
        });

        if (!collectionData) {
          setError('集合不存在');
          return;
        }

        setCollection(collectionData);

        // 获取模板列表
        if (collectionData.template_ids.length > 0) {
          const templatesData = await trpc.template.findManyByIds.query({
            template_ids: collectionData.template_ids,
          });
          setTemplates(templatesData);
        }
      } catch (err) {
        console.error('获取数据失败:', err);
        setError(err instanceof Error ? err.message : '网络请求失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [collectionId]);

  if (loading) {
    return (
      <div className='flex items-center justify-center h-dvh bg-gray-50'>
        <div className='text-center'>
          <div className='w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
          <p className='text-gray-500'>加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className='flex flex-col items-center justify-center h-dvh bg-gray-50'>
        <div className='text-center text-red-500'>
          <p className='text-xl mb-2'>❌</p>
          <p>{error || '集合不存在'}</p>
        </div>
        <button
          onClick={() => router.back()}
          className='mt-6 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'
        >
          返回
        </button>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-dvh bg-gray-50'>
      {/* 顶部集合信息 */}
      <div className='bg-white shadow-sm'>
        <div className='flex items-center p-4 space-x-4'>
          {/* 返回按钮 */}
          <button
            onClick={() => router.back()}
            className='flex-shrink-0 text-gray-600 hover:text-gray-900'
          >
            <svg
              className='w-6 h-6'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 19l-7-7 7-7'
              />
            </svg>
          </button>

          {/* 集合信息 */}
          <div className='flex items-center space-x-3 flex-1'>
            {collection.thumb_path && (
              <div className='w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100'>
                <Image
                  src={cdnApi(collection.thumb_path)}
                  alt={collection.display_name}
                  width={48}
                  height={48}
                  className='object-cover'
                />
              </div>
            )}
            <div>
              <h1 className='text-lg font-semibold text-gray-900'>
                {collection.display_name}
              </h1>
              <p className='text-sm text-gray-500'>{templates.length} 个模板</p>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 - 模板列表 */}
      <div className='flex-1 overflow-y-auto p-4'>
        {templates.length === 0 ? (
          <div className='flex items-center justify-center h-full'>
            <div className='text-center text-gray-500'>
              <p className='text-xl mb-2'>📭</p>
              <p>暂无模板数据</p>
            </div>
          </div>
        ) : (
          <div className='grid grid-cols-2 gap-4'>
            {templates.map(template => (
              <div
                key={template.id}
                className='bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer'
                onClick={() => {
                  // 跳转到模板详情页
                  router.push(`/mobile/template?id=${template.id}`);
                }}
              >
                {/* 模板封面 */}
                <div className='aspect-[3/4] bg-gray-100 relative'>
                  {template.cover ? (
                    <Image
                      src={cdnApi(template.cover)}
                      alt={template.title}
                      fill
                      className='object-cover'
                    />
                  ) : (
                    <div className='flex items-center justify-center h-full text-4xl text-gray-400'>
                      📄
                    </div>
                  )}
                </div>

                {/* 模板信息 */}
                <div className='p-3'>
                  <h3 className='text-sm font-medium text-gray-900 mb-1 line-clamp-2'>
                    {template.title}
                  </h3>
                  {template.desc && (
                    <p className='text-xs text-gray-500 line-clamp-1'>
                      {template.desc}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
