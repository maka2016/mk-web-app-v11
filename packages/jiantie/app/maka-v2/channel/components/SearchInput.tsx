import cls from 'classnames';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { queryToObj } from '@/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';

interface Props {
  disabled?: boolean;
  border?: boolean;
  keyword?: string;

  filter?: any;

  disabledSelector?: boolean;
  appid?: string;
  onSearch?: (keyword: string) => void;
}

export const types = [
  {
    label: '全部',
    key: 'site_search_total',
    filter: {
      ex_category: '',
      category: '',
    },
  },
  {
    label: '平面',
    key: 'site_search_poster_page',
    filter: {
      ex_category: 'interactive,tiantianhuodong',
      category: '',
    },
  },
  {
    label: 'H5',
    key: 'site_search_promotional_page',
    filter: {
      ex_category: '',
      category: 'interactive,tiantianhuodong',
    },
  },
];

const SearchInput = (props: Props) => {
  const {
    border = false,
    keyword = '',
    disabled = false,
    disabledSelector = false,
    appid,
    onSearch,
  } = props;
  const [value, setValue] = useState(keyword);
  const [type, setType] = useState('site_search_total');
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const query = queryToObj();
    if (types.find(item => item.key === query.parent_page_type)) {
      setType(query.parent_page_type || 'site_search_total');
    }
  }, []);

  useEffect(() => {
    if (keyword) {
      setValue(keyword);
    }
  }, [keyword]);

  const replaceUrlArg = (argVal: string, type: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(type, argVal);

    // 使用 router.replace + shallow 模式
    router.replace(`?${params.toString()}`, {
      scroll: false,
    });
  };

  return (
    <div className={cls(['w-full flex-1', appid && appid])}>
      <div
        className={cls([
          'relative flex items-center justify-between py-0.5 pl-4 pr-0.5 bg-white rounded-full',
          border && 'border-[1.5px] border-[#1a87ff]',
          disabled && 'pointer-events-none',
        ])}
      >
        {!disabledSelector && (
          <Select
            value={type}
            onValueChange={key => {
              replaceUrlArg(key, 'parent_page_type');
              setType(key);
            }}
          >
            <SelectTrigger className='shrink-0 w-12 h-[22px] p-0 border-none hover:border-none focus:border-none focus:shadow-none'>
              <SelectValue placeholder='全部' />
            </SelectTrigger>
            <SelectContent className='shrink-0 w-12 h-[22px] p-0 border-none hover:border-none focus:border-none focus:shadow-none'>
              {types.map(item => (
                <SelectItem key={item.key} value={item.key}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <input
          className='flex-1 ml-1 text-[rgba(0,0,0,0.88)] text-sm leading-[22px] border-none outline-none overflow-hidden'
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              onSearch?.(value);
            }
          }}
          placeholder='搜海量免费海报模板'
        />
        <div
          className='shrink-0 h-8 w-[60px] text-white font-semibold text-sm text-center leading-8 rounded-full bg-gradient-to-br from-[#33bfe4] from-0% via-[#187cea] via-[54.34%] to-[#855eee] to-100% cursor-pointer'
          onClick={() => onSearch?.(value)}
        >
          搜索
        </div>
      </div>
    </div>
  );
};

export default SearchInput;
