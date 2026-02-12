'use client';
import Table, {
  ColumnType,
  RowSelection,
} from '@/app/invoice/components/PC/Table';
import EmptyContent from '@/app/invoice/components/UI/EmptyContent';
import { Order } from '@/app/invoice/types/order';
import React from 'react';
import toast from 'react-hot-toast';
import styles from './index.module.scss';

interface Props {
  data: Order[];
  rowSelectable?: boolean;
  rowSelection?: {
    onChange?: (selectedRowKeys: React.Key[], selectedRows: Order[]) => void;
  };
  onPaginationChange?: (page: number, pageSize: number) => any;
  pagination?: {
    pageSize: number;
    total: number;
  };
  locale?: {
    emptyText?: React.ReactNode;
  };
  rowKey?: string;
}

const OrderTable: React.FC<Props> = props => {
  const columns: ColumnType<Order>[] = [
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

  const rowSelection: RowSelection<Order> | undefined = props.rowSelectable
    ? {
        columnTitle: (node: React.ReactNode) => {
          return (
            <label className={styles.rowSelectHeadCell} style={{}}>
              {node}全选
            </label>
          ) as React.ReactNode;
        },
        onCell: () => {
          return {
            borderBottom: `1px solid rgba(0, 0, 0, 0.06)`,
          } as React.CSSProperties;
        },
        renderCell: (
          value: boolean,
          record: Order,
          index: number,
          originNode: React.ReactNode
        ): React.ReactNode => {
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
        onChange: props.rowSelection?.onChange,
      }
    : undefined;

  return (
    <Table<Order>
      columns={columns}
      dataSource={props.data}
      rowSelection={rowSelection}
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
