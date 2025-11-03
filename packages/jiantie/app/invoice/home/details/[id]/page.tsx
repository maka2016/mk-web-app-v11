'use client';
import { Breadcrumb, Button, ConfigProvider, Form, Image } from 'antd';
import styles from './index.module.scss';
import { Icon } from '@workspace/ui/components/Icon';
import cls from 'classnames';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';
import {
  deleteInvoiceInfo,
  getInvoiceInfo,
} from '@/services/invoice/invoiceInfo';
import toast from 'react-hot-toast';
import {
  getInvoiceTypeShow,
  getUserInvoiceTypeShow,
  InvoiceInfo,
  InvoiceStatus,
  InvoiceType,
  UserInvoiceType,
} from '@/types/invoice';
import TextTips from '../../../components/UI/TextTips';
import FormItemsBlock from '@/app/invoice/components/UI/FormItemsBlock';
import { SecondaryLayoutContext } from '@/app/invoice/components/PC/Layout/SecondaryLayout';

export default function Details() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();

  const { pushBreadcrumbItem } = useContext(SecondaryLayoutContext);

  const [invoiceInfo, setInvoiceInfo] = useState<InvoiceInfo>();

  const [invoiceId, setInvoiceId] = useState(0);

  useEffect(() => {
    pushBreadcrumbItem({
      title: '发票详情',
      href: pathname,
    });

    const invoice_id = +(params.id ?? 0);
    setInvoiceId(invoice_id);
    if (invoice_id) {
      fetchInvoiceInfo(invoice_id);
    }
  }, []);
  const fetchInvoiceInfo = async (id: number) => {
    const res = await getInvoiceInfo(id);
    if (!res.success) return toast.error('获取发票信息失败');

    if (res.data?.status !== InvoiceStatus.DELETED) {
      setInvoiceInfo(res.data);
    }
  };
  return (
    <div className={styles.main}>
      <div className={styles.contentWrapper}>
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
            <Form.Item label={'发票类型'}>
              {invoiceInfo?.invoice_type &&
                getInvoiceTypeShow(invoiceInfo.invoice_type)}
            </Form.Item>
            {invoiceInfo?.invoice_type !== InvoiceType.专用 ? (
              <>
                <Form.Item label={'普通发票类型'}>
                  {invoiceInfo?.invoice_type &&
                    getUserInvoiceTypeShow(invoiceInfo.invoice_type)}
                </Form.Item>
                <Form.Item label={'发票抬头'}>
                  {invoiceInfo?.invoice_title}
                </Form.Item>
                {invoiceInfo?.invoice_type === 'company' && (
                  <Form.Item label={'税号'}>{invoiceInfo?.tax_no}</Form.Item>
                )}
              </>
            ) : (
              <>
                {invoiceInfo?.status === InvoiceStatus.REJECT ? (
                  <TextTips
                    type='error'
                    renderIcon={null}
                    text={`很抱歉，您的增值税专票信息未通过审核，问题描述为“${invoiceInfo.reason}”，如有需要请修改后重新提交`}
                  />
                ) : (
                  invoiceInfo?.status !== InvoiceStatus.PASS && (
                    <TextTips text='增值税专用发票需要对一般纳税人证明进行审核，约需7个工作日，届时会有工作人员联系您。资质审核通过后，可以申请增值税专用发票。' />
                  )
                )}
                <FormItemsBlock title='详细信息'>
                  <Form.Item label={'发票抬头'}>
                    {invoiceInfo?.invoice_title}
                  </Form.Item>
                  <Form.Item label={'税号'}>{invoiceInfo?.tax_no}</Form.Item>
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
                </FormItemsBlock>
                <FormItemsBlock title='一般纳税人证明' style={{ marginTop: 4 }}>
                  <Form.Item label={'营业执照'}>
                    <div className={styles.imgWrapper}>
                      <Image alt='' src={invoiceInfo.business_license} />
                    </div>
                  </Form.Item>
                  <Form.Item label={'纳税人资格证'}>
                    <div className={styles.imgWrapper}>
                      <Image alt='' src={invoiceInfo.certificate} />
                    </div>
                  </Form.Item>
                  <Form.Item label={'开户许可证'}>
                    <div className={styles.imgWrapper}>
                      <Image alt='' src={invoiceInfo.account_license} />
                    </div>
                  </Form.Item>
                </FormItemsBlock>
                <FormItemsBlock title='联系人信息' style={{ margin: `4px 0` }}>
                  <Form.Item label={'联系电话'}>
                    {invoiceInfo?.contact}
                  </Form.Item>
                  <Form.Item label={'联系人'}>
                    {invoiceInfo?.contact_name}
                  </Form.Item>
                </FormItemsBlock>
              </>
            )}

            <Form.Item label=' '>
              <Button
                disabled={
                  !invoiceInfo || invoiceInfo.status === InvoiceStatus.DELETED
                }
                style={{ width: 76 }}
                color='danger'
                variant='solid'
                autoInsertSpace={false}
                onClick={async () => {
                  const res = await deleteInvoiceInfo(invoiceId);
                  if (!res.success) return toast.error('删除失败');
                  toast.success('删除成功');
                  router.back();
                }}
              >
                删除
              </Button>
              <Button
                style={{ width: 76, marginLeft: 12 }}
                color='default'
                variant='outlined'
                onClick={() => {
                  router.back();
                }}
                autoInsertSpace={false}
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
