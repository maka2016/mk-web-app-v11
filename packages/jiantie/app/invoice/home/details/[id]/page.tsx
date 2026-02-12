'use client';
import { SecondaryLayoutContext } from '@/app/invoice/components/PC/Layout/SecondaryLayout';
import FormItemsBlock from '@/app/invoice/components/UI/FormItemsBlock';
import {
  deleteInvoiceInfo,
  getInvoiceInfo,
} from '@/app/invoice/service/invoiceInfo';
import {
  getInvoiceTypeShow,
  getUserInvoiceTypeShow,
  InvoiceInfo,
  InvoiceStatus,
  InvoiceType,
} from '@/app/invoice/types';
import { Button } from '@workspace/ui/components/button';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import TextTips from '../../../components/UI/TextTips';
import styles from './index.module.scss';

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
      path: pathname,
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
        <div className='space-y-4'>
          <div className='flex items-center gap-4'>
            <label className='text-right w-[120px]'>发票类型</label>
            <div>
              {invoiceInfo?.invoice_type &&
                getInvoiceTypeShow(invoiceInfo.invoice_type)}
            </div>
          </div>
          {invoiceInfo?.invoice_type !== InvoiceType.专用 ? (
            <>
              <div className='flex items-center gap-4'>
                <label className='text-right w-[120px]'>普通发票类型</label>
                <div>
                  {invoiceInfo?.invoice_type &&
                    getUserInvoiceTypeShow(invoiceInfo.invoice_type)}
                </div>
              </div>
              <div className='flex items-center gap-4'>
                <label className='text-right w-[120px]'>发票抬头</label>
                <div>{invoiceInfo?.invoice_title}</div>
              </div>
              {invoiceInfo?.invoice_type === 'company' && (
                <div className='flex items-center gap-4'>
                  <label className='text-right w-[120px]'>税号</label>
                  <div>{invoiceInfo?.tax_no}</div>
                </div>
              )}
            </>
          ) : (
            <>
              {invoiceInfo?.status === InvoiceStatus.REJECT ? (
                <TextTips
                  type='error'
                  renderIcon={null}
                  text={`很抱歉，您的增值税专票信息未通过审核，问题描述为"${invoiceInfo.reason}"，如有需要请修改后重新提交`}
                />
              ) : (
                invoiceInfo?.status !== InvoiceStatus.PASS && (
                  <TextTips text='增值税专用发票需要对一般纳税人证明进行审核，约需7个工作日，届时会有工作人员联系您。资质审核通过后，可以申请增值税专用发票。' />
                )
              )}
              <FormItemsBlock title='详细信息'>
                <div className='space-y-4'>
                  <div className='flex items-center gap-4'>
                    <label className='text-right w-[120px]'>发票抬头</label>
                    <div>{invoiceInfo?.invoice_title}</div>
                  </div>
                  <div className='flex items-center gap-4'>
                    <label className='text-right w-[120px]'>税号</label>
                    <div>{invoiceInfo?.tax_no}</div>
                  </div>
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
                </div>
              </FormItemsBlock>
              <FormItemsBlock title='一般纳税人证明' style={{ marginTop: 4 }}>
                <div className='space-y-4'>
                  <div className='flex items-center gap-4'>
                    <label className='text-right w-[120px]'>营业执照</label>
                    <div className={styles.imgWrapper}>
                      <img alt='' src={invoiceInfo?.business_license} />
                    </div>
                  </div>
                  <div className='flex items-center gap-4'>
                    <label className='text-right w-[120px]'>纳税人资格证</label>
                    <div className={styles.imgWrapper}>
                      <img alt='' src={invoiceInfo?.certificate} />
                    </div>
                  </div>
                  <div className='flex items-center gap-4'>
                    <label className='text-right w-[120px]'>开户许可证</label>
                    <div className={styles.imgWrapper}>
                      <img alt='' src={invoiceInfo?.account_license} />
                    </div>
                  </div>
                </div>
              </FormItemsBlock>
              <FormItemsBlock title='联系人信息' style={{ margin: `4px 0` }}>
                <div className='space-y-4'>
                  <div className='flex items-center gap-4'>
                    <label className='text-right w-[120px]'>联系电话</label>
                    <div>{invoiceInfo?.contact}</div>
                  </div>
                  <div className='flex items-center gap-4'>
                    <label className='text-right w-[120px]'>联系人</label>
                    <div>{invoiceInfo?.contact_name}</div>
                  </div>
                </div>
              </FormItemsBlock>
            </>
          )}

          <div className='flex items-center gap-4'>
            <label className='w-[120px]'></label>
            <div className='flex gap-3'>
              <Button
                disabled={
                  !invoiceInfo || invoiceInfo.status === InvoiceStatus.DELETED
                }
                variant='destructive'
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
