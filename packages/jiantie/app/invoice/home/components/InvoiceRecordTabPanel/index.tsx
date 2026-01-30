'use client';
import Table, { ColumnType } from '@/app/invoice/components/PC/Table';
import {
  getApplyInvoiceList,
  getApplyInvoiceListPageNum,
} from '@/app/invoice/service/applyInvoice';
import {
  ApplyInvoiceInfo,
  ApplyInvoiceInfoStatus,
} from '@/app/invoice/types/order';
import { Button } from '@workspace/ui/components/button';
import { cn } from '@workspace/ui/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import styles from './index.module.scss';

interface Props {}

const InvoiceRecordTabPanel: React.FC<Props> = props => {
  const router = useRouter();
  const pathname = usePathname();

  const [invoices, setInvoices] = useState<ApplyInvoiceInfo[]>();
  const [pageNum, setPageNum] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const initData = async () => {
    getInvoiceInfos();
    syncPageNum();
  };

  const getInvoiceInfos = async (page?: number) => {
    const res = await getApplyInvoiceList(page);
    if (!res.success) return;
    setInvoices(res.data);
  };

  const syncPageNum = async () => {
    const res = await getApplyInvoiceListPageNum();
    if (!res.success) return;
    res.data?.page_num && setPageNum(res.data.page_num);
  };
  useEffect(() => {
    initData();
  }, []);

  const columns: ColumnType<ApplyInvoiceInfo>[] = [
    {
      title: '申请单号',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '申请日期',
      dataIndex: 'created_at',
      key: 'created_at',
    },
    {
      title: '发票类型',
      dataIndex: 'apply_type',
      key: 'apply_type',
      render: (value: ApplyInvoiceInfo['apply_type']) => {
        if (value === 'special') {
          return '增值税专用发票';
        } else {
          return '增值税普通发票';
        }
      },
    },
    {
      title: '金额',
      dataIndex: 'total',
      key: 'total',
      render: value => `¥${value}`,
    },
    {
      title: '进度',
      dataIndex: 'status',
      key: 'status',
      render: (value: ApplyInvoiceInfoStatus) => {
        switch (value) {
          case ApplyInvoiceInfoStatus.不通过:
            return '不通过';
          case ApplyInvoiceInfoStatus.待审核:
            return '待审核';
          case ApplyInvoiceInfoStatus.待发送:
            return '待发送';
          case ApplyInvoiceInfoStatus.已发送:
            return '已发送';
        }
      },
    },
    {
      title: '操作',
      key: 'options',
      render: (value, record, index) => {
        const className = cn(styles.optsBtn, styles.effectiveBtn);

        return (
          <div className={styles.optsCell}>
            <Button
              className={className}
              onClick={async () => {
                router.push(`${pathname}/apply-details/${record.id}`);
              }}
              variant='link'
            >
              详情
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className={styles.main}>
      <div>
        <Button
          onClick={() => {
            router.push('/invoice/order');
          }}
        >
          去开发票
        </Button>
      </div>
      <div>
        <Table<ApplyInvoiceInfo>
          columns={columns}
          dataSource={invoices}
          rowKey={record => String(record.id)}
          size='small'
          pagination={{
            pageSize: pageSize,
            hideOnSinglePage: true,
            total: pageSize * pageNum,
            onChange: (page, pageSize) => {
              getInvoiceInfos(page);
            },
          }}
        />
      </div>
    </div>
  );
};

export default InvoiceRecordTabPanel;
