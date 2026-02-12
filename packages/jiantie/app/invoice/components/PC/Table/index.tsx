'use client';
import { Checkbox } from '@workspace/ui/components/checkbox';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@workspace/ui/components/pagination';
import {
  Table as ShadcnTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table';
import { cn } from '@workspace/ui/lib/utils';
import React, { useState } from 'react';
import EmptyContent from '../../UI/EmptyContent';
import styles from './index.module.scss';

export interface ColumnType<T = any> {
  title?: React.ReactNode;
  dataIndex?: string | string[];
  key?: string;
  width?: number | string;
  minWidth?: number | string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  onCell?: (record: T, index: number) => React.CSSProperties;
  onHeaderCell?: () => React.CSSProperties;
}

export interface RowSelection<T = any> {
  onChange?: (selectedRowKeys: React.Key[], selectedRows: T[]) => void;
  getCheckboxProps?: (record: T) => { disabled?: boolean };
  columnTitle?: (node: React.ReactNode) => React.ReactNode;
  renderCell?: (
    value: boolean,
    record: T,
    index: number,
    originNode: React.ReactNode
  ) => React.ReactNode;
  onCell?: (record: T, index: number) => React.CSSProperties;
}

export interface TableProps<T = any> {
  columns?: ColumnType<T>[];
  dataSource?: T[];
  rowKey?: string | ((record: T) => string);
  rowSelection?: RowSelection<T>;
  pagination?:
    | false
    | {
        current?: number;
        pageSize?: number;
        total?: number;
        hideOnSinglePage?: boolean;
        onChange?: (page: number, pageSize: number) => void;
      };
  size?: 'small' | 'middle' | 'large';
  locale?: {
    emptyText?: React.ReactNode;
  };
  className?: string;
}

const Table = <T extends Record<string, any> = any>(props: TableProps<T>) => {
  const {
    columns = [],
    dataSource = [],
    rowKey = 'id',
    rowSelection,
    pagination,
    size = 'small',
    locale,
    className,
  } = props;

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return String(record[rowKey] ?? index);
  };

  const handleSelectAll = (checked: boolean) => {
    if (!rowSelection) return;

    const allKeys = dataSource.map((record, index) => getRowKey(record, index));
    const enabledKeys = dataSource
      .map((record, index) => {
        const key = getRowKey(record, index);
        const checkboxProps = rowSelection.getCheckboxProps?.(record);
        if (checkboxProps?.disabled) return null;
        return key;
      })
      .filter(Boolean) as string[];

    const newSelectedKeys = checked ? enabledKeys : [];
    setSelectedRowKeys(newSelectedKeys);
    rowSelection.onChange?.(
      newSelectedKeys,
      dataSource.filter((_, index) =>
        newSelectedKeys.includes(getRowKey(dataSource[index], index))
      )
    );
  };

  const handleSelectRow = (record: T, index: number, checked: boolean) => {
    if (!rowSelection) return;

    const key = getRowKey(record, index);
    const newSelectedKeys = checked
      ? [...selectedRowKeys, key]
      : selectedRowKeys.filter(k => k !== key);

    setSelectedRowKeys(newSelectedKeys);
    rowSelection.onChange?.(
      newSelectedKeys,
      dataSource.filter((_, idx) =>
        newSelectedKeys.includes(getRowKey(dataSource[idx], idx))
      )
    );
  };

  const getCellValue = (column: ColumnType<T>, record: T, index: number) => {
    if (column.render) {
      const value = Array.isArray(column.dataIndex)
        ? column.dataIndex.reduce((obj, key) => obj?.[key], record)
        : record[column.dataIndex ?? ''];
      return column.render(value, record, index);
    }

    if (column.dataIndex) {
      if (Array.isArray(column.dataIndex)) {
        return column.dataIndex.reduce((obj, key) => obj?.[key], record);
      }
      return record[column.dataIndex];
    }

    return null;
  };

  const allSelected =
    dataSource.length > 0 &&
    dataSource.every((record, index) => {
      const key = getRowKey(record, index);
      const checkboxProps = rowSelection?.getCheckboxProps?.(record);
      if (checkboxProps?.disabled) return true;
      return selectedRowKeys.includes(key);
    });

  const someSelected =
    selectedRowKeys.length > 0 &&
    dataSource.some((record, index) => {
      const key = getRowKey(record, index);
      return selectedRowKeys.includes(key);
    });

  const currentPage = pagination !== false ? (pagination?.current ?? 1) : 1;
  const pageSize = pagination !== false ? (pagination?.pageSize ?? 10) : 10;
  const total =
    pagination !== false
      ? (pagination?.total ?? dataSource.length)
      : dataSource.length;
  const totalPages = Math.ceil(total / pageSize);

  const showPagination =
    pagination !== false && (!pagination?.hideOnSinglePage || totalPages > 1);

  return (
    <div className={cn(styles.main, className)}>
      <div className='overflow-x-auto md:overflow-x-visible'>
        <ShadcnTable>
          <TableHeader>
            <TableRow>
              {rowSelection && (
                <TableHead
                  style={{
                    width: 48,
                    paddingLeft: 16,
                    paddingRight: 16,
                    height: 40,
                  }}
                >
                  {rowSelection.columnTitle ? (
                    rowSelection.columnTitle(
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        className={styles.rowSelectHeadCell}
                      />
                    )
                  ) : (
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      className={styles.rowSelectHeadCell}
                    />
                  )}
                </TableHead>
              )}
              {columns.map((column, colIndex) => {
                const headerCellStyle = column.onHeaderCell?.() ?? {};
                return (
                  <TableHead
                    key={column.key ?? colIndex}
                    className='whitespace-nowrap'
                    style={{
                      width: column.width,
                      minWidth:
                        column.minWidth || (column.width ? undefined : 100),
                      ...headerCellStyle,
                    }}
                  >
                    {column.title}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {dataSource.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={(rowSelection ? 1 : 0) + columns.length}
                  style={{ padding: 0, border: 'none' }}
                >
                  {locale?.emptyText ?? (
                    <EmptyContent
                      emptyText='暂无记录'
                      style={{ padding: '100px 0' }}
                    />
                  )}
                </TableCell>
              </TableRow>
            ) : (
              dataSource.map((record, index) => {
                const key = getRowKey(record, index);
                const isSelected = selectedRowKeys.includes(key);
                const checkboxProps = rowSelection?.getCheckboxProps?.(record);

                return (
                  <TableRow key={key}>
                    {rowSelection && (
                      <TableCell
                        style={{
                          width: 48,
                          paddingLeft: 16,
                          paddingRight: 16,
                          height: 48,
                          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                          ...rowSelection.onCell?.(record, index),
                        }}
                      >
                        {rowSelection.renderCell ? (
                          rowSelection.renderCell(
                            isSelected,
                            record,
                            index,
                            <label
                              className='flex justify-start items-center'
                              style={{ paddingLeft: 8 }}
                              onClick={e => {
                                if (checkboxProps?.disabled) {
                                  e.preventDefault();
                                  return;
                                }
                              }}
                            >
                              <Checkbox
                                checked={isSelected}
                                disabled={checkboxProps?.disabled}
                                onCheckedChange={checked => {
                                  handleSelectRow(record, index, !!checked);
                                }}
                              />
                            </label>
                          )
                        ) : (
                          <label
                            className='flex justify-start items-center'
                            style={{ paddingLeft: 8 }}
                            onClick={e => {
                              if (checkboxProps?.disabled) {
                                e.preventDefault();
                                return;
                              }
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              disabled={checkboxProps?.disabled}
                              onCheckedChange={checked => {
                                handleSelectRow(record, index, !!checked);
                              }}
                            />
                          </label>
                        )}
                      </TableCell>
                    )}
                    {columns.map((column, colIndex) => {
                      const cellStyle = column.onCell?.(record, index) ?? {};
                      return (
                        <TableCell
                          key={column.key ?? colIndex}
                          className='whitespace-nowrap'
                          style={{
                            height: 48,
                            paddingLeft: 16,
                            paddingRight: 16,
                            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                            width: column.width,
                            minWidth:
                              column.minWidth ||
                              (column.width ? undefined : 100),
                            ...cellStyle,
                          }}
                        >
                          {getCellValue(column, record, index)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </ShadcnTable>
      </div>
      {showPagination && (
        <div className={styles.pagination}>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => {
                    if (currentPage > 1) {
                      pagination?.onChange?.(currentPage - 1, pageSize);
                    }
                  }}
                  className={cn(
                    currentPage === 1 && 'pointer-events-none opacity-50'
                  )}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <PaginationItem key={page}>
                  <PaginationLink
                    isActive={page === currentPage}
                    onClick={() => {
                      pagination?.onChange?.(page, pageSize);
                    }}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => {
                    if (currentPage < totalPages) {
                      pagination?.onChange?.(currentPage + 1, pageSize);
                    }
                  }}
                  className={cn(
                    currentPage === totalPages &&
                      'pointer-events-none opacity-50'
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default Table;
