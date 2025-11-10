'use client';

import { backWithBridge } from '@/utils/navigate-with-bridge';
import { trpc } from '@/utils/trpc';
import APPBridge from '@mk/app-bridge';
import { cdnApi, getAppId } from '@mk/services';
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
  create_time: string;
  update_time: string;
}

interface Template {
  id: string;
  title: string;
  desc: string | null;
  cover: string | null;
  spec_id: string | null;
  create_time: string;
  update_time: string;
  custom_time: string;
  spec?: {
    id: string;
    preview_width: number | null;
    preview_height: number | null;
  } | null;
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
      <div className='flex items-center justify-center h-dvh bg-white'>
        <div className='text-center'>
          <div className='w-12 h-12 border-4 border-[#D53933] border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
          <p className='text-gray-500'>加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className='flex flex-col items-center justify-center h-dvh bg-white'>
        <div className='text-center text-red-500'>
          <p className='text-xl mb-2'>❌</p>
          <p>{error || '集合不存在'}</p>
        </div>
        <button
          onClick={() => backWithBridge(router)}
          className='mt-6 px-6 py-2 border-pink-600 text-white rounded-lg'
        >
          返回
        </button>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-dvh bg-white'>
      {/* 顶部标题栏 */}
      <div className='flex items-center px-3 py-2 border-b border-gray-200 '>
        <button
          onClick={() => backWithBridge(router)}
          className='flex-shrink-0 text-gray-600 mr-4 flex items-center '
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
          返回
        </button>
        <h1 className='flex-1 text-center text-lg font-medium text-gray-900 '>
          选择合适的模板
        </h1>
        <button
          onClick={() => backWithBridge(router)}
          className='flex-shrink-0 text-gray-600 mr-4 flex items-center opacity-0 '
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
          返回
        </button>
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
            {templates.map(template => {
              // 计算显示比例，优先使用规格数据，否则使用默认值 270/400
              const aspectRatio =
                template.spec?.preview_width && template.spec?.preview_height
                  ? `${template.spec.preview_width}/${template.spec.preview_height}`
                  : '270/400';

              return (
                <div
                  key={template.id}
                  className='bg-white rounded-lg overflow-hidden border border-gray-200 cursor-pointer'
                  onClick={() => {
                    const toTemplateDetail = (template_id: string) => {
                      if (APPBridge.judgeIsInApp()) {
                        APPBridge.navToPage({
                          url: `${location.origin}/mobile/template?id=${template_id}&is_full_screen=1`,
                          type: 'URL',
                        });
                      } else {
                        router.push(
                          `/mobile/template?id=${template_id}&appid=${getAppId()}`
                        );
                      }
                    };
                    toTemplateDetail(template.id);
                    // router.push(`/mobile/template?id=${template.id}`);
                  }}
                >
                  {/* 模板封面 */}
                  <div className='bg-gray-100 relative' style={{ aspectRatio }}>
                    {template.cover ? (
                      <>
                        {/* 底层模糊背景图 */}
                        <img
                          src={cdnApi(template.cover)}
                          alt=''
                          className='absolute inset-0 w-full h-full object-cover blur-md scale-110'
                        />
                        {/* 上层清晰居中图 */}
                        <img
                          src={cdnApi(template.cover)}
                          alt={template.title}
                          className='absolute inset-0 w-full h-full object-contain'
                        />
                      </>
                    ) : (
                      <div className=' flex items-center justify-center h-full text-4xl text-gray-400'>
                        📄
                      </div>
                    )}
                  </div>

                  {/* 模板信息 */}
                  <div className='p-1 bg-white relative'>
                    <h3 className='text-sm font-medium text-gray-900 mb-1 line-clamp-2 text-left'>
                      {template.title}
                    </h3>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
