'use client';

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@workspace/ui/components/pagination';
import { cn } from '@workspace/ui/lib/utils';
import React from 'react';

export interface DataPaginationProps {
  /** 当前页码（从1开始） */
  page: number;
  /** 总记录数 */
  total: number;
  /** 每页大小 */
  pageSize: number;
  /** 页码变化回调 */
  onPageChange: (page: number) => void;
  /** 自定义样式类名 */
  className?: string;
  /** 是否显示信息（共X条记录，第X页） */
  showInfo?: boolean;
  /** 是否固定在底部 */
  sticky?: boolean;
}

/**
 * 数据分页组件
 * 提供通用的分页功能，包括页码显示、上一页/下一页、省略号处理等
 */
export function DataPagination({
  page,
  total,
  pageSize,
  onPageChange,
  className,
  showInfo = true,
  sticky = false,
}: DataPaginationProps) {
  const totalPages = Math.ceil(total / pageSize);

  // 如果没有数据，不显示分页
  if (total === 0 || totalPages <= 1) {
    return null;
  }

  // 计算需要显示的页码
  const visiblePages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)
  );

  return (
    <div
      className={cn(
        'flex items-center justify-between bg-white p-4 border-t',
        sticky && 'sticky bottom-0',
        className
      )}
    >
      {showInfo && (
        <div className='text-sm text-muted-foreground'>
          共 {total} 条记录，第 {page} / {totalPages} 页
        </div>
      )}
      <Pagination className='w-auto ml-auto mr-0'>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href='#'
              onClick={(e) => {
                e.preventDefault();
                if (page > 1) {
                  onPageChange(page - 1);
                }
              }}
              className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
            />
          </PaginationItem>
          {visiblePages.map((p, idx, arr) => (
            <React.Fragment key={p}>
              {idx > 0 && arr[idx - 1] < p - 1 && (
                <PaginationItem>
                  <span className='px-2'>...</span>
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationLink
                  href='#'
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange(p);
                  }}
                  isActive={p === page}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            </React.Fragment>
          ))}
          <PaginationItem>
            <PaginationNext
              href='#'
              onClick={(e) => {
                e.preventDefault();
                if (page < totalPages) {
                  onPageChange(page + 1);
                }
              }}
              className={
                page >= totalPages ? 'pointer-events-none opacity-50' : ''
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
