'use client';
import Table, { ColumnType } from '@/app/invoice/components/PC/Table';
import EmptyContent from '@/app/invoice/components/UI/EmptyContent';
import Radio from '@/app/invoice/components/UI/Radio';
import {
  deleteInvoiceInfo,
  getInvoiceInfoList,
  getInvoiceInfoListPageNum,
  invoiceInfoSetDefault,
} from '@/app/invoice/service/invoiceInfo';
import {
  getInvoiceTypeShow,
  InvoiceInfo,
  InvoiceStatus,
  InvoiceType,
  ResInvoiceType,
} from '@/app/invoice/types';
import { Button } from '@workspace/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog';
import { cn } from '@workspace/ui/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import styles from './index.module.scss';

interface Props {}

const InvoiceInfoManageTabPanel: React.FC<Props> = props => {
  const router = useRouter();
  const pathname = usePathname();

  const [invoiceInfos, setInvoiceInfos] = useState<InvoiceInfo[]>();
  const [curDataPage, setCurDataPage] = useState(0);
  const [pageNum, setPageNum] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceInfo | null>(null);

  const columns: ColumnType<InvoiceInfo>[] = [
    {
      title: '设为默认',
      dataIndex: 'is_default',
      key: 'is_default',
      render: (value, record) => {
        return (
          <Radio
            disabled={record.status !== InvoiceStatus.PASS}
            checked={value === 1}
            onChange={async e => {
              const checked = e.target.checked;
              if (checked) {
                const res = await invoiceInfoSetDefault(record);
                if (!res.success) return toast.error('设置失败');
                const newInfos = [...invoiceInfos!];

                const isPuton = (type: ResInvoiceType) => {
                  return type !== InvoiceType.专用;
                };
                newInfos.forEach(info => {
                  if (
                    isPuton(record.invoice_type) &&
                    isPuton(info.invoice_type)
                  ) {
                    info.is_default = 0;
                  }

                  if (
                    !isPuton(record.invoice_type) &&
                    !isPuton(info.invoice_type)
                  ) {
                    info.is_default = 0;
                  }

                  if (info.id === record.id) info.is_default = 1;
                });
                setInvoiceInfos(newInfos);
              }
            }}
          />
        );
      },
    },
    {
      title: '类型',
      dataIndex: 'invoice_type',
      key: 'invoice_type',
      render: value => {
        return getInvoiceTypeShow(value);
      },
    },
    {
      title: '发票抬头',
      dataIndex: 'invoice_title',
      key: 'invoice_title',
    },
    {
      title: '税号',
      dataIndex: 'tax_no',
      key: 'tax_no',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      minWidth: 90,
      render: (value: InvoiceStatus) => {
        if (value === InvoiceStatus.PASS) {
          return (
            <span className={cn(styles.cellStatus, styles.pass)}>已通过</span>
          );
        } else if (value === InvoiceStatus.PROCESS) {
          return (
            <span className={cn(styles.cellStatus, styles.process)}>
              待审核
            </span>
          );
        } else if (value === InvoiceStatus.REJECT) {
          return (
            <span className={cn(styles.cellStatus, styles.reject)}>不通过</span>
          );
        }
        return value;
      },
    },
    {
      title: '操作',
      key: 'options',
      render: (value, record, index) => {
        const className = cn(styles.optsBtn, styles.effectiveBtn);
        const editCls = cn(
          styles.optsBtn,
          (record.status === InvoiceStatus.PASS ||
            record.status === InvoiceStatus.REJECT) &&
            styles.effectiveBtn
        );
        const editDisabled = !(
          record.status === InvoiceStatus.PASS ||
          record.status === InvoiceStatus.REJECT
        );

        return (
          <div className={styles.optsCell}>
            <Button
              className={className}
              variant='link'
              onClick={() => {
                router.push(`${pathname}/details/${record.id}`);
              }}
            >
              详情
            </Button>
            <Button
              className={editCls}
              disabled={editDisabled}
              variant='link'
              onClick={() => {
                router.push(`${pathname}/details?edit_id=${record.id}`);
              }}
            >
              修改
            </Button>
            <Button
              className={className}
              onClick={async () => {
                setDeleteTarget(record);
                setDeleteDialogOpen(true);
              }}
              variant='link'
            >
              删除
            </Button>
          </div>
        );
      },
    },
  ];

  const getInvoiceInfos = async (page?: number) => {
    const res = await getInvoiceInfoList(page);
    if (!res.success) return;
    setInvoiceInfos(res.data);
    setCurDataPage(page ?? 1);
  };

  const syncPageNum = async () => {
    const res = await getInvoiceInfoListPageNum();
    if (!res.success) return;
    res.data?.page_num && setPageNum(res.data.page_num);
  };

  const initData = async () => {
    getInvoiceInfos();
    syncPageNum();
  };
  useEffect(() => {
    initData();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await deleteInvoiceInfo(deleteTarget.id);
    if (!res.success) return toast.error('删除失败');
    toast.success('删除成功');
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    getInvoiceInfos(
      (invoiceInfos?.length ?? 0) <= 1 ? curDataPage - 1 : curDataPage
    );
    syncPageNum();
  };

  return (
    <div className={styles.main}>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除信息</DialogTitle>
            <DialogDescription>
              确定删除该
              {deleteTarget && getInvoiceTypeShow(deleteTarget.invoice_type)}
              信息吗?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteTarget(null);
              }}
            >
              取消
            </Button>
            <Button variant='destructive' onClick={handleDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className={styles.tipsBlock}>
        <div className={styles.tipsTitle}>温馨提示</div>
        <p className={styles.tipsContent}>
          1、支持开具增值税普通发票（电子发票）、增值税专用发票（电子发票）。
          <br />
          2、发票基于订单开具，录入信息后，您可以前往 我的订单 - 索要发票
          开发票。
          <br />
          3、增值税普通发票信息录入后可立即选择需开票项目，无需等待审核。
          <br />
          4、增值税专用发票信息录入后需要进行审核才可进行下一步开票项目选择，约需
          7 个工作日，请您耐心等待。
          <br />
          5、只能开具本年度消费项目发票。
        </p>
      </div>
      {invoiceInfos?.length === 0 && pageNum === 0 ? (
        <div className={styles.emptyWrapper}>
          <EmptyContent
            emptyText={
              <div>
                您还没有发票信息，录入信息后才可以开具发票哦～
                <br />
                快去添加吧！
              </div>
            }
          />
          <div className='text-center'>
            <Button
              onClick={() => {
                router.push(`${pathname}/details`);
              }}
            >
              添加发票信息
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div>
            <Button
              onClick={() => {
                router.push(`${pathname}/details`);
              }}
            >
              新增信息
            </Button>
          </div>
          <div>
            <Table<InvoiceInfo>
              columns={columns}
              dataSource={invoiceInfos}
              rowKey={'id'}
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
        </>
      )}
    </div>
  );
};

export default InvoiceInfoManageTabPanel;
