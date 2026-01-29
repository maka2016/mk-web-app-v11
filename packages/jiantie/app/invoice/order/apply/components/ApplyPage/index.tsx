'use client';
import {
  AddApplyInvoiceInfo,
  ApplyInvoiceInfo,
  ApplyInvoiceInfoStatus,
  InvoiceContent,
  Order,
  UpdateApplyInvoiceInfo,
} from '@/app/invoice/types/order';
import { Icon } from '@workspace/ui/components/Icon';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Suspense,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import styles from './index.module.scss';

import { SecondaryLayoutContext } from '@/app/invoice/components/PC/Layout/SecondaryLayout';
import Table, { ColumnType } from '@/app/invoice/components/PC/Table';
import EmptyContent from '@/app/invoice/components/UI/EmptyContent';
import FormItemsBlock from '@/app/invoice/components/UI/FormItemsBlock';
import Radio from '@/app/invoice/components/UI/Radio';
import { applyOrderSessionKey } from '@/app/invoice/constants';
import {
  applyInvoice,
  getApplyInvoiceInfo,
  getApplyInvoiceInfoOrders,
  updateApplyInvoiceInfo,
} from '@/app/invoice/service/applyInvoice';
import {
  getInvoiceInfo,
  getInvoiceInfoList,
  getInvoiceInfoListPageNum,
} from '@/app/invoice/service/invoiceInfo';
import { InvoiceInfo, InvoiceStatus, InvoiceType } from '@/app/invoice/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@workspace/ui/components/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/ui/components/form';
import { Input } from '@workspace/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import * as z from 'zod';
import OrderTable from '../../../components/OrderTable';

type FieldType = AddApplyInvoiceInfo;

// 创建表单验证 schema
const formSchema = z.object({
  content: z.string().min(1, '请选择发票内容'),
  email: z.string().min(1, '请输入电子邮件').email('请输入正确的电子邮件'),
  contact: z
    .string()
    .min(1, '请输入联系电话')
    .regex(/^(?:(?:\+|00)86)?1[3-9]\d{9}$/, '请输入正确的联系电话'),
  contact_name: z.string().min(1, '请输入联系人'),
});

interface Props {
  /** 如果属性存在且有效，则为其他页面引用一个组件时会使用，此时此页面组件的某些逻辑需要改变 */
  mode?: 'edit';

  editId?: number;

  type?: 'common' | 'special';
}
export default function ApplyPage(props: Props) {
  const router = useRouter();

  const searchParams = useSearchParams();

  const pathname = usePathname();

  const [applyOrders, setApplyOrders] = useState<Order[]>([]);

  const [invoiceInfos, setInvoiceInfos] = useState<InvoiceInfo[]>([]);

  const [editApplyInfo, setEditApplyInfo] = useState<ApplyInvoiceInfo>();

  const [applyType, setApplyType] =
    useState<ApplyInvoiceInfo['apply_type']>('common');

  const { pushBreadcrumbItem } = useContext(SecondaryLayoutContext);

  const form = useForm<FieldType>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      content: InvoiceContent.软件服务费,
      email: '',
      contact: '',
      contact_name: '',
    },
  });

  const refs = useRef({
    defaultCheckedRowId: 0,
  });

  useLayoutEffect(() => {
    if (!props.mode) {
      let type: ApplyInvoiceInfo['apply_type'] = 'common';
      if (searchParams.get('special') === '1') {
        type = 'special';
      }
      pushBreadcrumbItem({
        title: `增值税${type === 'common' ? '普通' : '专用'}发票-申请开票`,
        path: pathname,
      });
      setApplyType(type);
      initData(type);

      try {
        const dataStr = sessionStorage.getItem(applyOrderSessionKey) ?? '[]';
        // sessionStorage.removeItem(applyOrderSessionKey);
        const data = JSON.parse(dataStr);

        if (data instanceof Array) {
          setApplyOrders(data);
        }
      } catch {}
    } else {
      props.editId && initEditData(props.editId);
    }
  }, []);

  const initEditData = async (id: number) => {
    fetchAppInvoiceOrders(id);
    const res = await getApplyInvoiceInfo(id);
    if (!res.success || !res.data) return toast.error('获取开票信息失败');
    // 只重置表单字段，排除不需要的字段
    const formData: Partial<FieldType> = {
      content: res.data.content as InvoiceContent,
      email: res.data.email,
      contact: res.data.contact,
      contact_name: res.data.contact_name,
    };
    form.reset(formData);
    setEditApplyInfo(res.data);
    refs.current.defaultCheckedRowId = +res.data.user_invoice_id;
    const res1 = await getInvoiceInfo(res.data.user_invoice_id);
    if (!res1.success || !res1.data) return toast.error('获取发票信息失败');

    let type: ApplyInvoiceInfo['apply_type'] = 'common';

    if (res1.data.invoice_type === InvoiceType.专用) {
      type = 'special';
    }
    setApplyType(type);
    initData(type);
  };

  const fetchAppInvoiceOrders = async (id: number) => {
    const res = await getApplyInvoiceInfoOrders(id);
    if (!res.success || !res.data) return toast.error('获取开票订单失败');

    setApplyOrders(res.data ?? []);
  };

  const initData = async (type: ApplyInvoiceInfo['apply_type']) => {
    const res = await getInvoiceInfoListPageNum();

    if (!res.success) return toast.error('请求数据失败');

    const tasks: Promise<InvoiceInfo[]>[] = [];
    const pageCount = res.data?.page_num ?? 0;

    for (let i = 1; i <= pageCount; i++) {
      const p = getInvoiceInfoList(i).then(value => {
        let res: InvoiceInfo[] = [];
        if (value.data instanceof Array) {
          res = value.data;
        } else {
          console.error('fetch invoiceInfos error: ', value);
        }

        return res;
      });

      tasks.push(p);
    }

    const results = await Promise.all(tasks);

    let setDefault = false;
    const flatResults = results.flat(1).filter((info, i) => {
      if (info.status !== InvoiceStatus.PASS) return false;
      let pass = false;
      if (type === 'special') {
        pass = info.invoice_type === InvoiceType.专用;
      } else {
        pass = info.invoice_type !== InvoiceType.专用;
      }

      if (pass) {
        if (!setDefault) {
          /** 第一条符合筛选条件记录为默认 */
          setDefault = true;
          setCheckedRowId(info.id);
        }

        if (info.is_default === 1) {
          setCheckedRowId(info.id);
        }
      }
      return pass;
    });

    if (refs.current.defaultCheckedRowId) {
      console.log('set edit checked row: ', refs.current.defaultCheckedRowId);
      setCheckedRowId(refs.current.defaultCheckedRowId);
    }
    console.log('发票抬头列表:', flatResults);

    setInvoiceInfos(flatResults);
  };

  const [checkedRowId, setCheckedRowId] = useState(0);

  const [checkedInvoiceInfo, setCheckedInvoiceInfo] = useState<InvoiceInfo>();

  useEffect(() => {
    if (checkedRowId && applyType === 'special') {
      syncInvoiceInfo(checkedRowId);
    }
  }, [checkedRowId, applyType]);

  const syncInvoiceInfo = async (id: number) => {
    const res = await getInvoiceInfo(id);
    if (!res.success) return toast.error('获取发票信息失败');
    setCheckedInvoiceInfo(res.data);
  };

  const columns: ColumnType<InvoiceInfo>[] = [
    {
      title: '',
      width: 88,
      render: (_, record) => {
        return (
          <Radio
            checked={record.id === checkedRowId}
            onChange={e => {
              if (e.target.checked) {
                setCheckedRowId(record.id);
              } else {
                setCheckedRowId(0);
              }
            }}
          ></Radio>
        );
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
  ];

  const onSubmit = async (values: FieldType) => {
    if (props.mode === 'edit') {
      if (!editApplyInfo) return toast.error('待编辑的开票记录不存在');

      if (editApplyInfo.status != ApplyInvoiceInfoStatus.不通过)
        return toast.error('此开票记录状态不允许修改');
      const data: UpdateApplyInvoiceInfo = {
        ...values,
        // apply_type: applyType,
        deliver_type: 'electron',
        // order_product_id: applyOrders.map((item) => item.id),
        id: props.editId!,
        user_invoice_id: checkedRowId,
      };

      console.log(data);
      const res = await updateApplyInvoiceInfo(data);
      if (!res.success) return toast.error('提交失败');
      toast.success('修改成功');
      router.back();
    } else {
      if (applyOrders.length === 0)
        return toast.error(
          '当前未选择开票订单，请返回订单页面选择需要开票的订单'
        );
      if (!checkedRowId) return toast.error('请选择发票信息');
      const data: AddApplyInvoiceInfo = {
        ...values,
        apply_type: applyType,
        deliver_type: 'electron',
        order_product_id: applyOrders.map(item => item.id),
        user_invoice_id: checkedRowId,
      };
      console.log(data);
      const res = await applyInvoice(data);
      if (!res.success) return toast.error('提交失败');
      toast.success('申请成功');
      router.back();
    }
  };

  return (
    <Suspense>
      <div className={styles.main}>
        <div className={styles.content}>
          <OrderTable
            rowKey='order_id'
            data={applyOrders}
            locale={{
              emptyText: (
                <EmptyContent
                  emptyImg={null}
                  emptyText={'未选择开票订单，请返回订单页面选择需要开票的订单'}
                />
              ),
            }}
          />

          <div className={styles.orderTips}>
            <Icon size={16} name='amount' color='rgba(21, 94, 239, 1)' />
            <span>
              共
              <span className={styles.primaryColor}>
                {' '}
                {applyOrders.length}{' '}
              </span>
              项，金额共计
              <span className={styles.primaryColor}>
                {' '}
                ¥{applyOrders.reduce((sum, row) => sum + +row.total, 0)}
                {/* {props.mode
                  ? applyOrders.reduce((sum, row) => sum + +row.total, 0)
                  : (applyOrders.reduce((sum, row) => sum + +row.price, 0) / 100).toFixed(2)} */}
              </span>
            </span>
          </div>

          <FormItemsBlock
            styles={{ header: { marginBottom: 16 } }}
            title={
              <div className='flex items-center justify-between flex-1'>
                选择发票信息
                <Button
                  variant='outline'
                  style={{ padding: '4px 12px' }}
                  onClick={() => {
                    router.push('/invoice/home?tabIdx=1');
                  }}
                >
                  添加/更改发票信息
                </Button>
              </div>
            }
            style={{ marginTop: 24 }}
          >
            <Table<InvoiceInfo>
              columns={columns}
              dataSource={invoiceInfos}
              rowKey={'id'}
              locale={{ emptyText: <EmptyContent /> }}
              size='small'
              pagination={{
                // pageSize: invoiceInfos.length,total: invoiceInfos.length,
                hideOnSinglePage: true,
              }}
            />
          </FormItemsBlock>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <FormItemsBlock
                styles={{ header: { marginBottom: 16 } }}
                title={'发票内容'}
                style={{ marginTop: 24 }}
              >
                <FormField
                  control={form.control}
                  name='content'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-left md:text-right w-full md:w-[120px]'>
                        发票内容
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className='w-full md:w-[330px]'>
                            <SelectValue placeholder='请选择发票内容' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={InvoiceContent.软件服务费}>
                              软件服务费
                            </SelectItem>
                            <SelectItem value={InvoiceContent.软件制作费}>
                              软件制作费
                            </SelectItem>
                            <SelectItem value={InvoiceContent.技术服务费}>
                              技术服务费
                            </SelectItem>
                            <SelectItem value={InvoiceContent.设计服务费}>
                              设计服务费
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormItemsBlock>

              {applyType === 'special' && (
                <FormItemsBlock
                  title={'增值税专票资质信息'}
                  style={{ marginTop: 4 }}
                >
                  {checkedInvoiceInfo && (
                    <div className='space-y-4'>
                      <div className='flex items-center gap-4'>
                        <label className='text-right w-[120px]'>发票抬头</label>
                        <div>{checkedInvoiceInfo.invoice_title}</div>
                      </div>
                      <div className='flex items-center gap-4'>
                        <label className='text-right w-[120px]'>税号</label>
                        <div>{checkedInvoiceInfo.tax_no}</div>
                      </div>
                      <div className='flex items-center gap-4'>
                        <label className='text-right w-[120px]'>
                          公司注册地址
                        </label>
                        <div>{checkedInvoiceInfo.address}</div>
                      </div>
                      <div className='flex items-center gap-4'>
                        <label className='text-right w-[120px]'>
                          公司注册电话
                        </label>
                        <div>{checkedInvoiceInfo.phone}</div>
                      </div>
                      <div className='flex items-center gap-4'>
                        <label className='text-right w-[120px]'>
                          开户银行名称
                        </label>
                        <div>{checkedInvoiceInfo.bank_name}</div>
                      </div>
                      <div className='flex items-center gap-4'>
                        <label className='text-right w-[120px]'>银行账号</label>
                        <div>{checkedInvoiceInfo.bank_account}</div>
                      </div>
                      <div className='flex items-center gap-4'>
                        <label className='text-right w-[120px]'>联系人</label>
                        <div>{checkedInvoiceInfo.contact_name}</div>
                      </div>
                      <div className='flex items-center gap-4'>
                        <label className='text-right w-[120px]'>联系方式</label>
                        <div>{checkedInvoiceInfo.contact}</div>
                      </div>
                    </div>
                  )}
                </FormItemsBlock>
              )}

              <FormItemsBlock
                title={'详细信息'}
                style={{ marginTop: 4, marginBottom: 4 }}
              >
                <FormField
                  control={form.control}
                  name='email'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-left md:text-right w-full md:w-[120px]'>
                        电子邮件
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className='w-full md:w-[330px]'
                          onBlur={e => {
                            field.onBlur();
                            if (e.target.value) {
                              if (
                                !/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
                                  e.target.value
                                )
                              ) {
                                form.setError('email', {
                                  message: '请输入正确的电子邮件',
                                });
                              }
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='contact'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-left md:text-right w-full md:w-[120px]'>
                        联系电话
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className='w-full md:w-[330px]'
                          onBlur={e => {
                            field.onBlur();
                            if (e.target.value) {
                              if (
                                !/^(?:(?:\+|00)86)?1[3-9]\d{9}$/.test(
                                  e.target.value
                                )
                              ) {
                                form.setError('contact', {
                                  message: '请输入正确的联系电话',
                                });
                              }
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='contact_name'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-left md:text-right w-full md:w-[120px]'>
                        联系人
                      </FormLabel>
                      <FormControl>
                        <Input {...field} className='w-full md:w-[330px]' />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormItemsBlock>

              <FormItem>
                <FormLabel className='w-[120px]'></FormLabel>
                <FormControl>
                  <Button type='submit' style={{ width: 76 }}>
                    确定
                  </Button>
                </FormControl>
              </FormItem>
            </form>
          </Form>
        </div>
      </div>
    </Suspense>
  );
}
