'use client';
import { Icon } from '@workspace/ui/components/Icon';
import styles from './index.module.scss';
import cls from 'classnames';
import React, { useEffect, useState } from 'react';
import { ConfigProvider, TableProps } from 'antd';
import { Order } from '@/types/invoice/order';
import Table from '@/app/invoice/components/PC/Table';
import { getOrderList } from '@/services/invoice/order';
import toast from 'react-hot-toast';
import { TableLocale } from 'antd/es/table/interface';
import EmptyContent from '@/app/invoice/components/UI/EmptyContent';

interface Props {
  data: Order[];

  rowSelectable?: boolean;

  rowSelection?: TableProps<Order>['rowSelection'];

  onPaginationChange?: (page: number, pageSize: number) => any;

  pagination?: {
    pageSize: number;
    total: number;
  };

  locale?: TableLocale;

  rowKey?: string;
}

const OrderTable: React.FC<Props> = props => {
  const columns: TableProps<Order>['columns'] = [
    {
      title: '日期',
      dataIndex: 'datetime',
      key: 'datetime',
      render: (value, record) => {
        return value ?? record.pay_date;
      },
    },
    {
      title: '账单ID',
      dataIndex: 'order_id',
      key: 'order_id',
    },
    {
      title: '事项',
      dataIndex: 'type_name',
      key: 'type_name',
      render: (value, record) => {
        return value ?? record.name;
      },
    },
    {
      title: '计费',
      dataIndex: 'amount',
      key: 'amount',
      render: (value, record) => {
        if (value == undefined) {
          if (typeof record.total === 'string') {
            return `¥${(+record.total).toFixed(2)}`;
          } else {
            return `¥${record.total}`;
          }
        } else {
          return `¥${value}`;
        }
      },
    },
  ];

  const rowSelection: TableProps<Order>['rowSelection'] = {
    columnTitle: node => {
      return (
        <label className={styles.rowSelectHeadCell} style={{}}>
          {node}全选
        </label>
      );
    },
    onCell: () => {
      return {
        style: {
          borderBottom: `1px solid rgba(0, 0, 0, 0.06)`,
        },
      };
    },

    renderCell: (
      value: boolean,
      record: Order,
      index: number,
      originNode: React.ReactNode
    ) => {
      return (
        <label
          className='flex justify-start items-center'
          style={{
            paddingLeft: 8,
          }}
          onClick={() => {
            toast.remove();
            if (record.is_invoice) {
              toast.error('已进入申请发票流程的订单无法重复勾选');
              return;
            }
            if (!record.can_request_invoice) {
              toast.error('只能勾选今年的订单');
              return;
            }
          }}
        >
          {originNode}
        </label>
      );
    },
    getCheckboxProps: (record: Order) => ({
      disabled: !record.can_request_invoice || record.is_invoice,
    }),
    ...props.rowSelection,
  };

  return (
    <Table<Order>
      columns={columns}
      dataSource={props.data}
      rowSelection={props.rowSelectable ? rowSelection : undefined}
      rowKey={props.rowKey ?? 'id'}
      size='small'
      locale={
        props.locale ?? {
          emptyText: (
            <EmptyContent emptyText='暂无记录' style={{ padding: `100px 0` }} />
          ),
        }
      }
      pagination={{
        pageSize: props.pagination?.pageSize ?? props.data.length,
        hideOnSinglePage: true,
        total: props.pagination?.total ?? props.data.length,
        onChange: (page, pageSize) => {
          props.onPaginationChange?.(page, pageSize);
        },
      }}
    />
  );
};

export default OrderTable;
