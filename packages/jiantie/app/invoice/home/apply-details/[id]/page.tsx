'use client';
import {
  Breadcrumb,
  Button,
  ConfigProvider,
  Form,
  Image,
  TableProps,
} from 'antd';
import styles from './index.module.scss';
import { Icon } from '@workspace/ui/components/Icon';
import cls from 'classnames';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useContext, useEffect, useLayoutEffect, useState } from 'react';
import toast from 'react-hot-toast';

import TextTips from '../../../components/UI/TextTips';
import FormItemsBlock from '@/app/invoice/components/UI/FormItemsBlock';
import {
  getApplyInvoiceInfo,
  getApplyInvoiceInfoOrders,
} from '@/services/invoice/applyInvoice';
import {
  ApplyInvoiceInfo,
  ApplyInvoiceInfoStatus,
  Order,
} from '@/types/invoice/order';
import { SecondaryLayoutContext } from '@/app/invoice/components/PC/Layout/SecondaryLayout';
import OrderTable from '@/app/invoice/order/components/OrderTable';
import EmptyContent from '@/app/invoice/components/UI/EmptyContent';
import Table from '@/app/invoice/components/PC/Table';
import { InvoiceInfo, InvoiceType } from '@/types/invoice';
import { getInvoiceInfo } from '@/services/invoice/invoiceInfo';

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
                text={`很抱歉，您的发票审核不通过，问题描述为“${applyInvoiceInfo.reason ?? ''}”。您可以在本页面中修改申请表单并重新提交。`}
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
        <ConfigProvider
          theme={{
            components: {
              Form: {
                labelColor: 'rgba(0, 0, 0, 0.6)',
                labelHeight: 22,
              },
            },
          }}
        >
          <Form
            colon={false}
            labelCol={{
              style: {
                display: 'flex',
                justifyContent: 'end',
                alignItems: 'center',
                width: 120,
                height: 22,
              },
            }}
          >
            <FormItemsBlock title='发票信息' style={{ marginTop: 24 }}>
              <Form.Item label={'发票抬头'}>
                {invoiceInfo?.invoice_title}
              </Form.Item>
              <Form.Item label={'税号'}>{invoiceInfo?.tax_no}</Form.Item>
              {invoiceInfo?.invoice_type === InvoiceType.专用 && (
                <>
                  <Form.Item label={'公司注册地址'}>
                    {invoiceInfo?.address}
                  </Form.Item>
                  <Form.Item label={'公司注册电话'}>
                    {invoiceInfo?.phone}
                  </Form.Item>
                  <Form.Item label={'开户银行名称'}>
                    {invoiceInfo?.bank_name}
                  </Form.Item>
                  <Form.Item label={'开户银行账号'}>
                    {invoiceInfo?.bank_account}
                  </Form.Item>
                </>
              )}
            </FormItemsBlock>

            <FormItemsBlock title='联系方式' style={{ marginTop: 4 }}>
              <Form.Item label={'联系电话'}>
                {applyInvoiceInfo?.contact}
              </Form.Item>
              <Form.Item label={'联系人'}>
                {applyInvoiceInfo?.contact_name}
              </Form.Item>
            </FormItemsBlock>

            <FormItemsBlock
              title='授权方式'
              style={{ marginTop: 4, marginBottom: 4 }}
            >
              <Form.Item label={'电子邮箱'}>
                {applyInvoiceInfo?.email}
              </Form.Item>
            </FormItemsBlock>
            <Form.Item label=' '>
              <Button
                type='primary'
                disabled={
                  !applyInvoiceInfo ||
                  applyInvoiceInfo.status != ApplyInvoiceInfoStatus.不通过
                }
                autoInsertSpace={false}
                style={{ width: 76 }}
                onClick={() => {
                  router.push(`${pathname}/edit`);
                }}
              >
                修改
              </Button>
              <Button
                autoInsertSpace={false}
                variant='outlined'
                color='default'
                onClick={() => {
                  router.back();
                }}
                style={{ marginLeft: 12, width: 76 }}
              >
                返回
              </Button>
            </Form.Item>
          </Form>
        </ConfigProvider>
      </div>
    </div>
  );
}
