'use client';

import { trpc } from '@/utils/trpc';
import { cdnApi } from '@mk/services';
import { Search } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import StatusBar from '../../../../../components/StatusBar';

interface Collection {
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

interface SearchResultsProps {
  keyword: string;
}

export default function SearchResults({
  keyword: initialKeyword,
}: SearchResultsProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(initialKeyword);
  const [searchKeyword, setSearchKeyword] = useState(initialKeyword);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchKeyword) {
      fetchCollections(searchKeyword);
    }
  }, [searchKeyword]);

  const fetchCollections = async (query: string) => {
    if (!query.trim()) {
      setCollections([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await trpc.channel.searchCollections.query({
        keyword: query.trim(),
        appid: 'jiantie',
        locale: 'zh-CN',
      });
      setCollections(data);
    } catch (err) {
      console.error('搜索集合失败:', err);
      setError(err instanceof Error ? err.message : '搜索失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchKeyword(keyword);
    // 更新URL
    router.replace(
      `/mobile/channel2/search?keyword=${encodeURIComponent(keyword)}`
    );
  };

  return (
    <div className='flex flex-col h-dvh bg-gray-50'>
      <StatusBar />
      {/* 搜索栏 */}
      <div className='bg-white shadow-sm p-4 sticky top-0 z-10'>
        <form onSubmit={handleSearch} className='flex items-center gap-2'>
          <button
            type='button'
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

          <div className='flex-1 relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
            <input
              type='text'
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder='搜索模板...'
              style={{
                border: '1px solid rgba(232, 32, 39, 0.30)',
                height: '38px',
              }}
              className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-600'
              autoFocus
            />
          </div>

          <button
            type='submit'
            className='px-4 py-2 bg-[#D53933] text-white rounded-lg  transition-colors '
            disabled={!keyword.trim() || loading}
          >
            搜索
          </button>
        </form>
      </div>

      {/* 主内容区 */}
      <div className='flex-1 overflow-y-auto'>
        {loading ? (
          <div className='flex items-center justify-center h-full'>
            <div className='text-center'>
              <div className='w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
              <p className='text-gray-500'>搜索中...</p>
            </div>
          </div>
        ) : error ? (
          <div className='flex items-center justify-center h-full'>
            <div className='text-center text-red-500'>
              <p className='text-xl mb-2'>❌</p>
              <p>{error}</p>
            </div>
          </div>
        ) : !searchKeyword ? (
          <div className='flex items-center justify-center h-full'>
            <div className='text-center text-gray-500'>
              <Search className='w-16 h-16 mx-auto mb-4 text-gray-300' />
              <p className='text-lg mb-2'>搜索集合</p>
              <p className='text-sm'>输入关键词搜索你想要的集合</p>
            </div>
          </div>
        ) : collections.length === 0 ? (
          <div className='flex items-center justify-center h-full'>
            <div className='text-center text-gray-500'>
              <p className='text-xl mb-2'>🔍</p>
              <p className='text-lg mb-2'>未找到相关集合</p>
              <p className='text-sm'>试试其他关键词</p>
            </div>
          </div>
        ) : (
          <div className='p-4'>
            <div className='mb-4 text-sm text-gray-600'>
              找到{' '}
              <span className='font-semibold text-[#D53933]'>
                {collections.length}
              </span>{' '}
              个模板
            </div>

            <div className='grid grid-cols-2 gap-4'>
              {collections.map(collection => (
                <div
                  key={collection.id}
                  className='bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer'
                  onClick={() => {
                    router.push(`/mobile/channel2/collection/${collection.id}`);
                  }}
                >
                  {/* 集合封面 */}
                  <div className='aspect-[3/4] bg-gray-100 relative'>
                    {collection.thumb_path ? (
                      <Image
                        src={cdnApi(collection.thumb_path)}
                        alt={collection.display_name}
                        fill
                        className='object-cover'
                      />
                    ) : (
                      <div className='flex items-center justify-center h-full text-4xl text-gray-400'>
                        📁
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
