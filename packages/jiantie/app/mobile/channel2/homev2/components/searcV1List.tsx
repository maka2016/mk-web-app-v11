/* eslint-disable @next/next/no-img-element */
'use client';

import clsx from 'classnames';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

type SortType = 'composite' | 'latest' | 'bestseller';

interface SearchPreviewProps {
  searchTerm: string;
  className?: string;
  style?: CSSProperties;
  appid?: string;
}

interface TemplateItem {
  template: string;
  name: string;
  preview_image_url: string;
  sort_score?: number;
}

interface SpecItem {
  id: string;
  display_name: string;
  name: string;
  alias: string;
  count: number;
}

interface SearchApiResult {
  result?: {
    template_list?: TemplateItem[];
    specs?: SpecItem[];
    total?: number;
  };
}

const SORT_LABEL: Record<SortType, string> = {
  composite: '综合排序',
  latest: '最新排序',
  bestseller: '热度排序',
};

const MIN_RENDER_COUNT = 5;

export function SearchPreview({
  searchTerm,
  className,
  style,
  appid = 'jiantie',
}: SearchPreviewProps) {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [specs, setSpecs] = useState<SpecItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortType, setSortType] = useState<SortType>('composite');
  const [specId, setSpecId] = useState<string>('');
  const [expanded, setExpanded] = useState(false);
  const hasFetchedRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!searchTerm) return;
    const controller = new AbortController();
    const currentId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const params = new URLSearchParams({
          query: searchTerm,
          page_size: '10',
          page: '1',
          sort: sortType,
          appid,
        });
        if (specId) params.set('spec_id', specId);
        const res = await fetch(`/api/search-v1?${params.toString()}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!res.ok) {
          throw new Error(`搜索失败: ${res.status}`);
        }
        const data: SearchApiResult = await res.json();
        if (requestIdRef.current !== currentId) return;
        const list = data.result?.template_list || [];
        setTemplates(list);
        setSpecs(data.result?.specs || []);
        hasFetchedRef.current = true;
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('search preview fetch error', err);
        if (requestIdRef.current !== currentId) return;
        setError(err instanceof Error ? err.message : '搜索失败');
      } finally {
        if (requestIdRef.current === currentId) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => controller.abort();
  }, [appid, searchTerm, sortType, specId]);

  useEffect(() => {
    setExpanded(false);
  }, [searchTerm]);

  const showBlock =
    (hasFetchedRef.current && templates.length >= MIN_RENDER_COUNT) ||
    (!hasFetchedRef.current && loading);

  const activeSpecName = useMemo(() => {
    if (!specId) return '全部';
    const spec = specs.find(item => item.id === specId);
    return spec?.display_name || spec?.name || spec?.alias || '全部';
  }, [specId, specs]);

  if (!showBlock) return null;

  return (
    <div
      className={clsx(
        'relative bg-white px-4 py-3 rounded-2xl shadow-sm',
        !expanded && 'max-h-[50vh] overflow-hidden',
        className
      )}
      style={style}
    >
      <div className='flex items-center justify-between gap-3'>
        <div className='text-base font-semibold'>为你找到的新模版</div>
        <div className='text-xs text-gray-500'>
          排序：{SORT_LABEL[sortType]}
        </div>
      </div>

      <div className='mt-2 flex flex-wrap gap-2'>
        <button
          className={clsx(
            'px-3 py-1 rounded-full border text-xs',
            specId
              ? 'border-gray-300 text-gray-800'
              : 'border-blue-500 text-blue-600'
          )}
          onClick={() => setSpecId('')}
        >
          全部规格
        </button>
        {specs.map(spec => (
          <button
            key={spec.id}
            className={clsx(
              'px-3 py-1 rounded-full border text-xs',
              spec.id === specId
                ? 'border-blue-500 text-blue-600'
                : 'border-gray-200 text-gray-700'
            )}
            onClick={() => setSpecId(spec.id === specId ? '' : spec.id)}
          >
            {spec.display_name || spec.name || spec.alias || '规格'}（
            {spec.count}）
          </button>
        ))}
      </div>

      <div className='mt-3 flex items-center gap-2 text-xs text-gray-600'>
        <span className='font-medium'>当前规格：</span>
        <span>{activeSpecName}</span>
        <span className='mx-2 h-3 w-px bg-gray-200' />
        <span className='font-medium'>排序：</span>
        <div className='flex gap-2'>
          {(
            [
              { key: 'composite', label: '综合' },
              { key: 'latest', label: '最新' },
              { key: 'bestseller', label: '热度' },
            ] as Array<{ key: SortType; label: string }>
          ).map(item => (
            <button
              key={item.key}
              className={clsx(
                'px-2 py-1 rounded-md border',
                sortType === item.key
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-gray-200 text-gray-700'
              )}
              onClick={() => setSortType(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className='mt-4 grid grid-cols-2 gap-3'>
        {loading && templates.length === 0
          ? Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className='animate-pulse rounded-xl bg-gray-100 aspect-[2/3]'
              ></div>
            ))
          : templates.map(item => (
              <div key={item.template} className='flex flex-col gap-2'>
                <div className='relative w-full overflow-hidden rounded-xl bg-gray-100 aspect-[2/3]'>
                  {item.preview_image_url ? (
                    <img
                      src={item.preview_image_url}
                      alt={item.name}
                      className='h-full w-full object-cover'
                      loading='lazy'
                    />
                  ) : (
                    <div className='h-full w-full bg-gray-200'></div>
                  )}
                </div>
                <div className='text-sm font-medium text-gray-800 line-clamp-2'>
                  {item.name || '未命名模版'}
                </div>
                {item.sort_score !== undefined && (
                  <div className='text-[11px] text-gray-400'>
                    综合分：{item.sort_score}
                  </div>
                )}
              </div>
            ))}
      </div>

      {!expanded && (
        <div className='pointer-events-none absolute inset-x-0 bottom-14 h-24 bg-gradient-to-t from-white to-transparent' />
      )}

      <div className='mt-4 flex justify-center'>
        <button
          className='w-full rounded-full bg-gray-900 px-4 py-3 text-sm font-semibold text-white'
          onClick={() => setExpanded(prev => !prev)}
        >
          {expanded ? '收起' : '查看更多2026新模版'}
        </button>
      </div>

      {error && (
        <div className='mt-2 text-center text-xs text-red-500'>{error}</div>
      )}
    </div>
  );
}

export default SearchPreview;
