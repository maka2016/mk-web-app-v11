'use client';

import { useStore } from '@/store';
import { queryToObj } from '@/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import SearchContent from './SearchContent';

export default function SearchInput() {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const store = useStore();
  const isDesktop = !store.environment.isMobile;

  const toSearch = (value?: string) => {
    const query = queryToObj();
    let parent_page_type = 'site_search_total';

    store.push(`/maka-v2/channel/search-mix`, {
      query: {
        parent_page_type: parent_page_type,
        ref_page_id: query.ref_page_id,
        page_inst_id: decodeURIComponent(query.page_inst_id || ''),
        hotword_floor_word_btn: decodeURIComponent(
          query.hotword_floor_word_btn || ''
        ),
        keywords: value || '',
      },
    });
  };

  const handleClick = () => {
    if (isDesktop) {
      // PC端：展开Popover
      setOpen(true);
    } else {
      // 移动端：保持原有跳转逻辑
      toSearch();
    }
  };

  const handleInputFocus = () => {
    if (isDesktop) {
      setOpen(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (isDesktop) {
      setOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      toSearch(inputValue.trim());
      setOpen(false);
    }
  };

  const handleSearchClick = () => {
    if (inputValue.trim()) {
      toSearch(inputValue.trim());
      setOpen(false);
    }
  };

  // 当Popover打开时，自动聚焦输入框
  useEffect(() => {
    if (open && isDesktop && inputRef.current) {
      // 使用 setTimeout 确保 Popover 渲染完成后再聚焦
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [open, isDesktop]);

  const searchButton = (
    <div
      className='py-[7px] px-4 flex items-center justify-between rounded-lg bg-white shadow-[0px_4px_12px_-2px_rgba(0,0,0,0.06)] cursor-pointer'
      onClick={handleClick}
    >
      <div className='flex items-center'>
        <Search size={20} />
        <span className='ml-2 text-[rgba(0,0,0,0.45)] text-sm font-normal leading-[22px]'>
          搜海量免费海报模板
        </span>
      </div>
      <div className='text-[rgba(0,0,0,0.88)] text-center text-sm font-normal leading-[22px]'>
        搜索
      </div>
    </div>
  );

  const searchInput = (
    <div className='py-[7px] px-4 flex items-center justify-between rounded-lg bg-white shadow-[0px_4px_12px_-2px_rgba(0,0,0,0.06)]'>
      <div className='flex items-center flex-1'>
        <Search size={20} className='shrink-0' />
        <input
          ref={inputRef}
          type='text'
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder='搜海量免费海报模板'
          className='ml-2 flex-1 text-[rgba(0,0,0,0.88)] text-sm font-normal leading-[22px] border-none outline-none bg-transparent'
        />
      </div>
      <div
        className='text-[rgba(0,0,0,0.88)] text-center text-sm font-normal leading-[22px] cursor-pointer shrink-0'
        onClick={handleSearchClick}
      >
        搜索
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <div className='px-3 pt-3 pb-2' id='searchInput'>
        <Popover open={open} onOpenChange={setOpen} modal={false}>
          <PopoverTrigger asChild>
            <div
              onClick={e => {
                // 如果点击的是输入框，阻止触发Popover的切换
                const target = e.target as HTMLElement;
                if (target.tagName === 'INPUT' || target.closest('input')) {
                  e.preventDefault();
                  e.stopPropagation();
                  // 手动打开Popover
                  if (!open) {
                    setOpen(true);
                  }
                }
              }}
            >
              {searchInput}
            </div>
          </PopoverTrigger>
          <PopoverContent align='start' className='w-auto p-0' sideOffset={8}>
            <SearchContent
              isInPopover={true}
              initialKeyword={inputValue}
              onClose={() => setOpen(false)}
              onSearchChange={value => {
                setInputValue(value);
                toSearch(value);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className='px-3 pt-3 pb-2' id='searchInput'>
      {searchButton}
    </div>
  );
}
