import { queryToObj } from '@/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { cn } from '@workspace/ui/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './SearchInput.module.scss';

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
    <div className={cn([styles.search, appid && styles[appid]])}>
      <div
        className={cn([
          styles.searchWrap,
          border && styles.border,
          disabled && styles.disabled,
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
            <SelectTrigger className={styles.searchType}>
              <SelectValue placeholder='全部' />
            </SelectTrigger>
            <SelectContent className={styles.searchType}>
              {types.map(item => (
                <SelectItem key={item.key} value={item.key}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <input
          className={styles.searchInput}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder='搜海量免费海报模板'
        />
        <div className={styles.searchButton} onClick={() => onSearch?.(value)}>
          搜索
        </div>
      </div>
    </div>
  );
};

export default SearchInput;
