'use client';
import { Icon } from '@workspace/ui/components/Icon';
import styles from './index.module.scss';
import cls from 'classnames';
import React, { useEffect, useState } from 'react';
import { ConfigProvider, Table as AntdTable, TableProps } from 'antd';
import EmptyContent from '../../UI/EmptyContent';
import { AnyObject } from 'antd/lib/_util/type';

const Table = <RecordType extends AnyObject = AnyObject>(
  props: TableProps<RecordType>
) => {
  return (
    <ConfigProvider
      theme={{
        components: {
          Pagination: {
            miniOptionsSizeChangerTop: -1000,
          },
        },
      }}
    >
      <AntdTable<RecordType>
        locale={{
          emptyText: (
            <EmptyContent emptyText='暂无记录' style={{ padding: `100px 0` }} />
          ),
        }}
        size='small'
        {...props}
        pagination={{ hideOnSinglePage: true, ...props.pagination }}
        className={cls(styles.main, props.className)}
        columns={props.columns?.map(item => {
          return {
            onCell: () => {
              return {
                style: {
                  height: 48,
                  paddingLeft: 16,
                  paddingRight: 16,
                  borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                },
              };
            },
            onHeaderCell: () => {
              return {
                style: {
                  height: 40,
                  paddingLeft: 16,
                  paddingRight: 16,
                  fontWeight: 400,
                },
              };
            },
            ...item,
          };
        })}
      />
    </ConfigProvider>
  );
};

export default Table;
