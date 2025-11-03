'use client';
import { Icon } from '@workspace/ui/components/Icon';
import styles from './index.module.scss';
import cls from 'classnames';
import React, { useEffect, useState } from 'react';
import EmptyContent from '@/app/invoice/components/UI/EmptyContent';
import { Button, ConfigProvider, Modal, TableProps } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import {
  getInvoiceTypeShow,
  InvoiceInfo,
  InvoiceStatus,
  InvoiceType,
  ResInvoiceType,
} from '@/types/invoice';
import {
  deleteInvoiceInfo,
  getInvoiceInfoList,
  getInvoiceInfoListPageNum,
  invoiceInfoSetDefault,
} from '@/services/invoice/invoiceInfo';
import Radio from '@/app/invoice/components/UI/Radio';
import toast from 'react-hot-toast';
import Table from '@/app/invoice/components/PC/Table';

interface Props {}

const InvoiceInfoManageTabPanel: React.FC<Props> = props => {
  const router = useRouter();
  const pathname = usePathname();

  const [invoiceInfos, setInvoiceInfos] = useState<InvoiceInfo[]>();
  const [curDataPage, setCurDataPage] = useState(0);
  const [pageNum, setPageNum] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const [modal, contextHolder] = Modal.useModal();

  const columns: TableProps<InvoiceInfo>['columns'] = [
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
            <span className={cls(styles.cellStatus, styles.pass)}>已通过</span>
          );
        } else if (value === InvoiceStatus.PROCESS) {
          return (
            <span className={cls(styles.cellStatus, styles.process)}>
              待审核
            </span>
          );
        } else if (value === InvoiceStatus.REJECT) {
          return (
            <span className={cls(styles.cellStatus, styles.reject)}>
              不通过
            </span>
          );
        }
        return value;
      },
    },
    {
      title: '操作',
      key: 'options',
      render: (value, record, index) => {
        const className = cls(styles.optsBtn, styles.effectiveBtn);
        const fapiaoCls = cls(
          styles.optsBtn,
          record.status === InvoiceStatus.PASS && styles.effectiveBtn
        );
        const fapiaoDisabled = !(record.status === InvoiceStatus.PASS);

        const editCls = cls(
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
            {/* <Button className={fapiaoCls} disabled={fapiaoDisabled} color="default" variant="link">
              去开发票
            </Button> */}
            <Button
              className={className}
              color='default'
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
              color='default'
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
                const confirm = await modal.confirm({
                  title: '删除信息',
                  content: `确定删除该${getInvoiceTypeShow(record.invoice_type)}信息吗?`,
                  maskClosable: true,
                  styles: {
                    content: {
                      borderRadius: 6,
                      padding: 24,
                    },
                  },
                  centered: true,
                  icon: (
                    <Icon
                      name='warn'
                      color='rgba(255, 77, 79, 1)'
                      size={22}
                      style={{ marginRight: 16 }}
                    />
                  ),
                  okText: '删除',
                  cancelText: '取消',
                  okButtonProps: {
                    danger: true,
                    autoInsertSpace: false,
                  },

                  cancelButtonProps: {
                    color: 'default',
                    variant: 'outlined',
                    autoInsertSpace: false,
                  },

                  footer: (_, { OkBtn, CancelBtn }) => (
                    <div style={{ marginTop: 16 }}>
                      <CancelBtn />
                      <OkBtn />
                    </div>
                  ),
                });

                if (!confirm) return;
                const res = await deleteInvoiceInfo(record.id);
                if (!res.success) return toast.error('删除失败');
                toast.success('删除成功');

                getInvoiceInfos(
                  (invoiceInfos?.length ?? 0) <= 1
                    ? curDataPage - 1
                    : curDataPage
                );
                syncPageNum();
              }}
              color='default'
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
  return (
    <div className={styles.main}>
      {contextHolder}
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
              type='primary'
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
              type='primary'
              onClick={() => {
                router.push(`${pathname}/details`);
              }}
            >
              新增信息
            </Button>
          </div>
          <div>
            <ConfigProvider>
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
            </ConfigProvider>
          </div>
        </>
      )}
    </div>
  );
};

export default InvoiceInfoManageTabPanel;
