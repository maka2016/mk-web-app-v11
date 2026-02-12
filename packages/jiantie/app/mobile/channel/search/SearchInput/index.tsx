import { useEffect, useState } from 'react';
import styles from './SearchInput.module.scss';

interface Props {
  keyword?: string;
  onSearch?: (keyword: string) => void;
}

const SearchInput = (props: Props) => {
  const { keyword = '', onSearch } = props;
  const [value, setValue] = useState(keyword);

  useEffect(() => {
    if (keyword) {
      setValue(keyword);
    }
  }, [keyword]);

  return (
    <div className={styles.search}>
      <div className={styles.searchWrap}>
        <input
          className={styles.searchInput}
          value={value}
          autoFocus
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              onSearch?.(value);
            }
          }}
          placeholder='搜海量模板'
        />
        <div className={styles.searchButton} onClick={() => onSearch?.(value)}>
          搜索
        </div>
      </div>
    </div>
  );
};

export default SearchInput;
