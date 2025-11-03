'use client';
import { Button, ConfigProvider, Modal, TableProps } from 'antd';
import styles from './index.module.scss';
import { Order } from '@/types/invoice/order';
import Table from '@/app/invoice/components/PC/Table';
import { getOrderList } from '@/services/invoice/order';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Icon } from '@workspace/ui/components/Icon';
import cls from 'classnames';
import { useRouter } from 'next/navigation';
import OrderTable from './components/OrderTable';
import { applyOrderSessionKey } from '../constants';

export default function Page() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>();
  const [curDataPage, setCurDataPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [selectedRows, setSelectedRows] = useState<Order[]>([]);

  const [modal, contextHolder] = Modal.useModal();

  const getOrders = async (page?: number) => {
    const res = await getOrderList(page);
    if (!res.success || !res.data) return toast.error('加载数据失败');
    setOrders(res.data.dataList);
    setCurDataPage(page ?? 1);
    setPageSize(res.data.meta.pageSize ?? (res.data?.dataList ?? []).length);
    setTotal(res.data.meta?.total ?? (res.data?.dataList ?? []).length);
  };

  const initData = async () => {
    getOrders();
  };
  useEffect(() => {
    initData();
  }, []);

  return (
    <div className={styles.main}>
      {contextHolder}
      <div className={styles.header}>我的订单</div>
      <div className={styles.content}>
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
        <div className={styles.btnRow}>
          <Button
            type='primary'
            disabled={selectedRows.length === 0}
            onClick={async () => {
              const m = modal.confirm({
                width: 400,
                className: styles.modalContent,

                content: (
                  <>
                    <div className={styles.header}>
                      请选择发票类型
                      <div
                        className={styles.closeBtn}
                        onClick={() => {
                          m.destroy();
                        }}
                      >
                        <Icon
                          name='close'
                          color='rgba(165, 166, 167, 1)'
                          size={20}
                        />
                      </div>
                    </div>
                    <div className={styles.content}>
                      <div
                        className={cls(styles.piao)}
                        onClick={() => {
                          sessionStorage.setItem(
                            applyOrderSessionKey,
                            JSON.stringify(selectedRows)
                          );
                          router.push('/invoice/order/apply?special=0');
                        }}
                      >
                        <div className={styles.head}>
                          <Icon
                            name='piao1'
                            size={32}
                            color='rgba(51, 144, 224, 1)'
                          />
                        </div>
                        增值税普通发票（电子）
                      </div>
                      <div
                        className={cls(styles.piao, styles.bg2)}
                        onClick={() => {
                          sessionStorage.setItem(
                            applyOrderSessionKey,
                            JSON.stringify(selectedRows)
                          );
                          router.push('/invoice/order/apply?special=1');
                        }}
                      >
                        <div className={styles.head}>
                          <Icon
                            name='piao2'
                            size={32}
                            color='rgba(255, 174, 87, 1)'
                          />
                        </div>
                        增值税专用发票（纸质）
                      </div>
                    </div>
                  </>
                ),
                maskClosable: true,
                styles: {
                  content: {
                    borderRadius: 6,
                    padding: 0,
                  },
                },
                centered: true,
                icon: null,

                footer: (_, { OkBtn, CancelBtn }) => null,
              });
            }}
          >
            开发票
          </Button>
          <span className={styles.btnTips}>
            {selectedRows.length > 0 ? (
              <span>
                已选
                <span className={styles.primaryColor}>
                  {selectedRows.length}
                </span>
                项，金额共计{' '}
                <span className={styles.primaryColor}>
                  ¥
                  {(
                    selectedRows.reduce((sum, row) => sum + +row.total, 0) / 100
                  ).toFixed(2)}
                </span>
              </span>
            ) : (
              '请勾选需要开具发票的订单'
            )}
          </span>
        </div>
        <div>
          <OrderTable
            rowSelectable
            data={orders ?? []}
            pagination={{ pageSize: pageSize, total: total }}
            onPaginationChange={(page: number) => {
              getOrders(page);
            }}
            rowSelection={{
              onChange: (
                selectedRowKeys: React.Key[],
                selectedRows: Order[]
              ) => {
                setSelectedRows(selectedRows);
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
