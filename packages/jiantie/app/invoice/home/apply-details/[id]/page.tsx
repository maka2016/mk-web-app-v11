'use client';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import styles from './index.module.scss';

import { SecondaryLayoutContext } from '@/app/invoice/components/PC/Layout/SecondaryLayout';
import EmptyContent from '@/app/invoice/components/UI/EmptyContent';
import FormItemsBlock from '@/app/invoice/components/UI/FormItemsBlock';
import OrderTable from '@/app/invoice/order/components/OrderTable';
import {
  getApplyInvoiceInfo,
  getApplyInvoiceInfoOrders,
} from '@/app/invoice/service/applyInvoice';
import { getInvoiceInfo } from '@/app/invoice/service/invoiceInfo';
import { InvoiceInfo, InvoiceType } from '@/app/invoice/types';
import {
  ApplyInvoiceInfo,
  ApplyInvoiceInfoStatus,
  Order,
} from '@/app/invoice/types/order';
import TextTips from '../../../components/UI/TextTips';

export default function Details() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();

  const { setBreadcrumbItems, baseBreadcrumbItems } = useContext(
    SecondaryLayoutContext
  );

  const [applyInvoiceInfo, setApplyInvoiceInfo] = useState<ApplyInvoiceInfo>();

  const [invoiceInfo, setInvoiceInfo] = useState<InvoiceInfo>();

  const [invoiceId, setInvoiceId] = useState(0);

  const [applyOrders, setApplyOrders] = useState<Order[]>([]);

  useEffect(() => {
    const invoice_id = +(params.id ?? 0);
    setInvoiceId(invoice_id);
    if (invoice_id) {
      fetchAppInvoiceOrders(invoice_id);
      fetchApplyInvoiceInfo(invoice_id);
    }
  }, []);

  const fetchAppInvoiceOrders = async (id: number) => {
    const res = await getApplyInvoiceInfoOrders(id);
    if (!res.success || !res.data) return toast.error('获取开票订单失败');

    setApplyOrders(res.data);
  };
  const fetchApplyInvoiceInfo = async (id: number) => {
    const res = await getApplyInvoiceInfo(id);
    if (!res.success) return toast.error('获取开票信息失败');

    setApplyInvoiceInfo(res.data);

    if (res.data?.user_invoice_id) {
      const result = await getInvoiceInfo(res.data.user_invoice_id);
      if (!res.success) return toast.error('获取发票信息失败');
      setInvoiceInfo(result.data);

      let curTitle = '增值税普通发票';

      if (result.data?.invoice_type === InvoiceType.专用) {
        curTitle = '增值税专用发票';
      }

      setBreadcrumbItems([
        ...baseBreadcrumbItems,
        {
          title: curTitle,
          path: pathname,
        },
      ]);
    }
  };

  const statusText = {
    [ApplyInvoiceInfoStatus.待审核]:
      '发票正在审核中，审核及发出约需要 3 个工作日，届时会给您发送【站内通知】告知进度，请耐心等待。',
    [ApplyInvoiceInfoStatus.待发送]:
      '发票审核已通过，稍后会发出邮件，请及时前往邮箱查收。',
    [ApplyInvoiceInfoStatus.已发送]: '您的发票已发出，请及时前往邮箱查收。',
  };
  return (
    <div className={styles.main}>
      <div className={styles.contentWrapper}>
        {applyInvoiceInfo?.status && (
          <>
            {applyInvoiceInfo.status == ApplyInvoiceInfoStatus.不通过 ? (
              <TextTips
                type='error'
                text={`很抱歉，您的发票审核不通过，问题描述为"${applyInvoiceInfo.reason ?? ''}"。您可以在本页面中修改申请表单并重新提交。`}
              />
            ) : (
              <TextTips text={statusText[applyInvoiceInfo.status]} />
            )}
          </>
        )}

        <OrderTable
          rowKey={'order_id'}
          data={applyOrders}
          locale={{
            emptyText: <EmptyContent />,
          }}
        />

        <div className={styles.orderTips}>
          <Icon size={16} name='amount' color='rgba(21, 94, 239, 1)' />
          <span>
            共
            <span className={styles.primaryColor}> {applyOrders.length} </span>
            项，金额共计
            <span className={styles.primaryColor}>
              {' '}
              ¥{applyOrders.reduce((sum, row) => sum + +row.total, 0)}
            </span>
          </span>
        </div>
        <div className='space-y-4'>
          <FormItemsBlock title='发票信息' style={{ marginTop: 24 }}>
            <div className='space-y-4'>
              <div className='flex items-center gap-4'>
                <label className='text-right w-[120px]'>发票抬头</label>
                <div>{invoiceInfo?.invoice_title}</div>
              </div>
              <div className='flex items-center gap-4'>
                <label className='text-right w-[120px]'>税号</label>
                <div>{invoiceInfo?.tax_no}</div>
              </div>
              {invoiceInfo?.invoice_type === InvoiceType.专用 && (
                <>
                  <div className='flex items-center gap-4'>
                    <label className='text-right w-[120px]'>公司注册地址</label>
                    <div>{invoiceInfo?.address}</div>
                  </div>
                  <div className='flex items-center gap-4'>
                    <label className='text-right w-[120px]'>公司注册电话</label>
                    <div>{invoiceInfo?.phone}</div>
                  </div>
                  <div className='flex items-center gap-4'>
                    <label className='text-right w-[120px]'>开户银行名称</label>
                    <div>{invoiceInfo?.bank_name}</div>
                  </div>
                  <div className='flex items-center gap-4'>
                    <label className='text-right w-[120px]'>开户银行账号</label>
                    <div>{invoiceInfo?.bank_account}</div>
                  </div>
                </>
              )}
            </div>
          </FormItemsBlock>

          <FormItemsBlock title='联系方式' style={{ marginTop: 4 }}>
            <div className='space-y-4'>
              <div className='flex items-center gap-4'>
                <label className='text-right w-[120px]'>联系电话</label>
                <div>{applyInvoiceInfo?.contact}</div>
              </div>
              <div className='flex items-center gap-4'>
                <label className='text-right w-[120px]'>联系人</label>
                <div>{applyInvoiceInfo?.contact_name}</div>
              </div>
            </div>
          </FormItemsBlock>

          <FormItemsBlock
            title='授权方式'
            style={{ marginTop: 4, marginBottom: 4 }}
          >
            <div className='space-y-4'>
              <div className='flex items-center gap-4'>
                <label className='text-right w-[120px]'>电子邮箱</label>
                <div>{applyInvoiceInfo?.email}</div>
              </div>
            </div>
          </FormItemsBlock>
          <div className='flex items-center gap-4'>
            <label className='w-[120px]'></label>
            <div className='flex gap-3'>
              <Button
                disabled={
                  !applyInvoiceInfo ||
                  applyInvoiceInfo.status != ApplyInvoiceInfoStatus.不通过
                }
                onClick={() => {
                  router.push(`${pathname}/edit`);
                }}
              >
                修改
              </Button>
              <Button
                variant='outline'
                onClick={() => {
                  router.back();
                }}
              >
                返回
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
