'use client';

import { trpc } from '@/utils/trpc';
import { cdnApi } from '@mk/services';
import { Clock, Search, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
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

// 搜索历史记录相关的常量和工具函数
const SEARCH_HISTORY_KEY = 'channel_search_history';
const MAX_HISTORY_LENGTH = 10;

// 从 localStorage 获取搜索历史
const getSearchHistory = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
};

// 保存搜索历史到 localStorage
const saveSearchHistory = (history: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('保存搜索历史失败:', error);
  }
};

// 添加搜索记录
const addSearchHistory = (keyword: string) => {
  if (!keyword.trim()) return;

  const history = getSearchHistory();
  // 移除重复的关键词
  const filteredHistory = history.filter(item => item !== keyword.trim());
  // 添加到开头
  const newHistory = [keyword.trim(), ...filteredHistory].slice(
    0,
    MAX_HISTORY_LENGTH
  );
  saveSearchHistory(newHistory);
};

// 删除单条搜索记录
const removeSearchHistory = (keyword: string) => {
  const history = getSearchHistory();
  const newHistory = history.filter(item => item !== keyword);
  saveSearchHistory(newHistory);
};

// 清空所有搜索历史
const clearSearchHistory = () => {
  saveSearchHistory([]);
};

export default function SearchResults({
  keyword: initialKeyword,
}: SearchResultsProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(initialKeyword);
  const [searchKeyword, setSearchKeyword] = useState(initialKeyword);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // 加载搜索历史
  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  // 尝试自动聚焦输入框（在某些移动浏览器上可能不起作用）
  useEffect(() => {
    // 使用 setTimeout 延迟聚焦，提高成功率
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

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
    if (!keyword.trim()) return;

    // 保存搜索历史
    addSearchHistory(keyword.trim());
    setSearchHistory(getSearchHistory());

    setSearchKeyword(keyword);
    // 更新URL
    router.replace(
      `/mobile/channel2/search?keyword=${encodeURIComponent(keyword)}`
    );
  };

  // 点击搜索历史记录
  const handleHistoryClick = (historyKeyword: string) => {
    setKeyword(historyKeyword);
    setSearchKeyword(historyKeyword);
    // 移动到历史记录首位
    addSearchHistory(historyKeyword);
    setSearchHistory(getSearchHistory());
    // 更新URL
    router.replace(
      `/mobile/channel2/search?keyword=${encodeURIComponent(historyKeyword)}`
    );
  };

  // 删除单条历史记录
  const handleRemoveHistory = (e: React.MouseEvent, historyKeyword: string) => {
    e.stopPropagation();
    removeSearchHistory(historyKeyword);
    setSearchHistory(getSearchHistory());
  };

  // 清空所有历史记录
  const handleClearHistory = () => {
    clearSearchHistory();
    setSearchHistory([]);
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
              ref={inputRef}
              type='text'
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder='搜索模板...'
              style={{
                border: '1px solid rgba(232, 32, 39, 0.30)',
                height: '38px',
              }}
              className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-600'
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
          // 显示搜索历史记录
          <div className='p-4'>
            {searchHistory.length > 0 ? (
              <div>
                <div className='flex items-center justify-between mb-4'>
                  <div className='flex items-center gap-2'>
                    <Clock className='w-5 h-5 text-gray-400' />
                    <h3 className='text-base font-medium text-gray-700'>
                      搜索历史
                    </h3>
                  </div>
                  <button
                    onClick={handleClearHistory}
                    className='text-sm text-gray-500 hover:text-gray-700'
                  >
                    清空
                  </button>
                </div>
                <div className='space-y-2'>
                  {searchHistory.map((item, index) => (
                    <div
                      key={index}
                      onClick={() => handleHistoryClick(item)}
                      className='flex items-center justify-between bg-white p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors'
                    >
                      <span className='text-gray-700 flex-1'>{item}</span>
                      <button
                        onClick={e => handleRemoveHistory(e, item)}
                        className='ml-2 text-gray-400 hover:text-gray-600'
                      >
                        <X className='w-4 h-4' />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className='flex items-center justify-center h-full'>
                <div className='text-center text-gray-500'>
                  <Search className='w-16 h-16 mx-auto mb-4 text-gray-300' />
                  <p className='text-lg mb-2'>搜索集合</p>
                  <p className='text-sm'>输入关键词搜索你想要的集合</p>
                </div>
              </div>
            )}
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
