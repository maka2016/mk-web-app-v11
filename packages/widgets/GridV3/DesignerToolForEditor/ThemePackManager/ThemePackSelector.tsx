import React, { useEffect, useState } from 'react';
import clas from 'classnames';
import styled from '@emotion/styled';
import { useThemePackContext } from './ThemeProvider';
import { getThemePackList, ThemePack, PaginatedResponse } from './services';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@workspace/ui/components/pagination';

const ThemePackSelectorRoot = styled.div`
  padding: 12px;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  height: 100%;

  .content {
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
    overflow-y: auto;
    margin-bottom: 12px;
    max-height: 70vh;
  }

  .author_section {
    .author_name {
      font-size: 13px;
      color: #666;
      margin-bottom: 6px;
    }
    .theme_list {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }
  }

  .theme_item {
    padding: 6px;
    border-radius: 3px;
    cursor: pointer;
    background-color: #f5f5f5;
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    &:hover {
      background-color: #e6f7ff;
    }
    &.selected {
      background-color: #e6f7ff;
      border: 1px solid #1890ff;
    }
  }

  .pagination_wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 8px 0;
    border-top: 1px solid #f0f0f0;
    position: relative;

    &.loading {
      pointer-events: none;
      opacity: 0.6;
    }
  }

  .loading_indicator {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 12px;
    color: #1890ff;
  }

  .initial_loading {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 40px;
    color: #666;
  }

  .empty {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 40px;
    color: #999;
    font-size: 14px;
  }
`;

export default function ThemePackSelector({
  selectedThemePack,
  onSelected,
}: {
  selectedThemePack?: ThemePack;
  onSelected: (item: ThemePack) => void;
}) {
  const { selectedTemplateApp } = useThemePackContext();
  const [themePackList, setThemePackList] = useState<ThemePack[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(100);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const loadThemePackList = async (page: number = 1) => {
    if (!selectedTemplateApp?.appid) return;

    setLoading(true);
    try {
      const res = await getThemePackList(undefined, {
        page,
        pageSize,
      });
      setThemePackList(res.data.data);
      setTotal(res.data.meta.pagination.total);
      setCurrentPage(page);
      setIsInitialLoad(false);
    } catch (error) {
      console.error('Failed to load theme pack list:', error);
      setThemePackList([]);
      setTotal(0);
      setIsInitialLoad(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsInitialLoad(true);
    setThemePackList([]);
    setTotal(0);
    setCurrentPage(1);
    loadThemePackList(1);
  }, [selectedTemplateApp?.appid]);

  const handlePageChange = (page: number) => {
    loadThemePackList(page);
  };

  // Group theme packs by author
  const groupedThemes = themePackList.reduce(
    (acc: Record<string, ThemePack[]>, item) => {
      const author = item.author || '未知作者';
      if (!acc[author]) {
        acc[author] = [];
      }
      acc[author].push(item);
      return acc;
    },
    {}
  );

  const totalPages = Math.ceil(total / pageSize);

  return (
    <ThemePackSelectorRoot>
      <div className='content'>
        {isInitialLoad && loading ? (
          <div className='initial_loading'>加载中...</div>
        ) : themePackList.length === 0 ? (
          <div className='empty'>暂无主题包</div>
        ) : (
          Object.entries(groupedThemes).map(([author, themes]) => (
            <div key={author} className='author_section'>
              <div className='author_name'>{author}</div>
              <div className='theme_list'>
                {themes.map((item, idx) => {
                  const isSelected =
                    selectedThemePack?.documentId === item.documentId;
                  return (
                    <div
                      key={item.documentId}
                      className={clas('theme_item', { selected: isSelected })}
                      onClick={() => {
                        onSelected(item);
                      }}
                    >
                      {item.name || `未命名主题-${idx}`}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className={clas('pagination_wrapper', { loading })}>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => {
                    if (currentPage > 1 && !loading) {
                      handlePageChange(currentPage - 1);
                    }
                  }}
                  style={{
                    opacity: currentPage <= 1 || loading ? 0.5 : 1,
                    pointerEvents:
                      currentPage <= 1 || loading ? 'none' : 'auto',
                    cursor:
                      currentPage <= 1 || loading ? 'not-allowed' : 'pointer',
                  }}
                />
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, index) => (
                <PaginationItem key={index}>
                  <PaginationLink
                    href='#'
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      if (!loading) {
                        handlePageChange(index + 1);
                      }
                    }}
                    isActive={currentPage === index + 1}
                    style={{
                      pointerEvents: loading ? 'none' : 'auto',
                    }}
                  >
                    {index + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() => {
                    if (currentPage < totalPages && !loading) {
                      handlePageChange(currentPage + 1);
                    }
                  }}
                  style={{
                    opacity: currentPage >= totalPages || loading ? 0.5 : 1,
                    pointerEvents:
                      currentPage >= totalPages || loading ? 'none' : 'auto',
                    cursor:
                      currentPage >= totalPages || loading
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>

          {loading && !isInitialLoad && (
            <div className='loading_indicator'>加载中...</div>
          )}
        </div>
      )}
    </ThemePackSelectorRoot>
  );
}
