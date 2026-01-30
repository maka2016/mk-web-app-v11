'use client';
import {
  addInvoiceInfo,
  getInvoiceInfo,
  updateInvoiceInfo,
} from '@/app/invoice/service/invoiceInfo';
import {
  AddInvoiceInfo,
  InvoiceInfo,
  InvoiceStatus,
  InvoiceType,
  UserInvoiceType,
} from '@/app/invoice/types';
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
import { Label } from '@workspace/ui/components/label';
import {
  RadioGroup,
  RadioGroupItem,
} from '@workspace/ui/components/radio-group';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useContext, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import * as z from 'zod';
import { SecondaryLayoutContext } from '../../components/PC/Layout/SecondaryLayout';
import FormItemsBlock from '../../components/UI/FormItemsBlock';
import TextTips from '../../components/UI/TextTips';
import Upload from '../../components/UI/Upload';
import styles from './index.module.scss';

type FieldType = AddInvoiceInfo;

// 创建表单验证 schema
const createFormSchema = (invoiceType: InvoiceType) => {
  const baseSchema = z.object({
    invoice_title: z.string().min(1, '请输入发票抬头'),
    invoice_type: z.string(),
    user_invoice_type: z.string().optional(),
    tax_no: z.string().optional(),
  });

  if (invoiceType === InvoiceType.专用) {
    return baseSchema.extend({
      tax_no: z
        .string()
        .min(1, '请输入税号')
        .regex(/^[A-Za-z0-9]{15,20}$/, '请输入正确的税号'),
      address: z.string().min(1, '请输入公司地址'),
      phone: z.string().min(1, '请输入公司注册电话'),
      bank_name: z.string().min(1, '请输入开户银行名称'),
      bank_account: z.string().min(1, '请输入银行账户'),
      business_license: z.string().min(1, '请上传营业执照'),
      certificate: z.string().min(1, '请上传纳税人资格'),
      account_license: z.string().min(1, '请上传开户许可'),
      contact: z
        .string()
        .min(1, '请输入联系电话')
        .regex(/^(?:(?:\+|00)86)?1[3-9]\d{9}$/, '请输入正确的联系电话'),
      contact_name: z.string().min(1, '请输入联系人'),
    });
  } else {
    return baseSchema;
  }
};

// 发票信息操作页面，携带edit_id查询参数即为编辑模式
export default function InvoiceOperation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { pushBreadcrumbItem } = useContext(SecondaryLayoutContext);

  const [editId, setEditId] = useState<number>();
  const [mode, setMode] = useState<'add' | 'edit'>();
  const [invoiceInfo, setInvoiceInfo] = useState<InvoiceInfo>();
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(InvoiceType.普通);

  const form = useForm<FieldType>({
    resolver: zodResolver(createFormSchema(invoiceType)) as any,
    defaultValues: {
      invoice_title: '',
      invoice_type: InvoiceType.普通,
      user_invoice_type: UserInvoiceType.个人,
      tax_no: '',
    },
  });

  const fetchInvoiceInfo = async (id: number) => {
    const res = await getInvoiceInfo(id);
    if (!res.success) return toast.error('获取发票信息失败');

    if (res.data?.status !== InvoiceStatus.DELETED) {
      if (res.data && res.data?.invoice_type !== InvoiceType.专用) {
        res.data.user_invoice_type = res.data.invoice_type as UserInvoiceType;
        res.data.invoice_type = InvoiceType.普通;
      }
      if (res.data) {
        setInvoiceType(res.data.invoice_type as InvoiceType);
        form.reset(res.data as any);
        setInvoiceInfo(res.data);
      }
    }
  };

  const init = () => {
    const id = +(searchParams.get('edit_id') ?? 0);

    let curTitle = '';
    if (id) {
      curTitle = '修改发票信息';
    } else {
      curTitle = '添加发票信息';
    }

    pushBreadcrumbItem({
      title: curTitle,
      path: pathname,
    });

    if (id) {
      setMode('edit');
      setEditId(id);
      fetchInvoiceInfo(id);
    } else {
      setMode('add');
    }
  };

  useEffect(() => {
    init();
  }, []);

  const onSubmit = async (values: FieldType) => {
    console.log('Finish:', values);
    if (mode) {
      const res = await (mode === 'edit'
        ? updateInvoiceInfo({
            id: editId!,
            ...values,
          })
        : addInvoiceInfo(values));

      const optText = mode === 'edit' ? '更新' : '添加';
      if (!res.success) {
        return toast.error(`${optText}失败`);
      }
      toast.success(`${optText}成功`);
      router.back();
    }
  };

  const watchedInvoiceType = form.watch('invoice_type');
  const watchedUserInvoiceType = form.watch('user_invoice_type');

  useEffect(() => {
    if (watchedInvoiceType) {
      setInvoiceType(watchedInvoiceType as InvoiceType);
    }
  }, [watchedInvoiceType]);

  return (
    <Suspense>
      <div className={styles.main}>
        <div className={styles.formWrapper}>
          {mode && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                {mode === 'add' && (
                  <FormField
                    control={form.control}
                    name='invoice_type'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>发票类型</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className='flex gap-4'
                          >
                            <div className='flex items-center gap-2'>
                              <RadioGroupItem value={InvoiceType.普通} />
                              <Label>普通发票</Label>
                            </div>
                            <div className='flex items-center gap-2'>
                              <RadioGroupItem value={InvoiceType.专用} />
                              <Label>专用发票</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {watchedInvoiceType !== InvoiceType.专用 ? (
                  <>
                    {mode === 'add' && (
                      <FormField
                        control={form.control}
                        name='user_invoice_type'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>普通发票类型</FormLabel>
                            <FormControl>
                              <RadioGroup
                                value={field.value}
                                onValueChange={field.onChange}
                                className='flex gap-4'
                              >
                                <div className='flex items-center gap-2'>
                                  <RadioGroupItem
                                    value={UserInvoiceType.个人}
                                  />
                                  <Label>个人</Label>
                                </div>
                                <div className='flex items-center gap-2'>
                                  <RadioGroupItem
                                    value={UserInvoiceType.单位}
                                  />
                                  <Label>单位</Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name='invoice_title'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-left md:text-right w-full md:w-[120px]'>
                            发票抬头
                          </FormLabel>
                          <FormControl>
                            <Input {...field} className='w-full md:w-[330px]' />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {watchedUserInvoiceType === UserInvoiceType.单位 && (
                      <FormField
                        control={form.control}
                        name='tax_no'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-left md:text-right w-full md:w-[120px]'>
                              税号
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className='w-full md:w-[330px]'
                                onBlur={e => {
                                  field.onBlur();
                                  if (e.target.value) {
                                    if (
                                      !/^[A-Za-z0-9]{15,20}$/.test(
                                        e.target.value
                                      )
                                    ) {
                                      form.setError('tax_no', {
                                        message: '请输入正确的税号',
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
                    )}
                  </>
                ) : (
                  <>
                    {invoiceInfo?.status !== InvoiceStatus.PASS && (
                      <TextTips text='增值税专用发票需要对一般纳税人证明进行审核，约需7个工作日，届时会有工作人员联系您。资质审核通过后，可以申请增值税专用发票。' />
                    )}
                    <FormItemsBlock title='详细信息'>
                      <FormField
                        control={form.control}
                        name='invoice_title'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-left md:text-right w-full md:w-[120px]'>
                              发票抬头
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className='w-full md:w-[330px]'
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name='tax_no'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-left md:text-right w-full md:w-[120px]'>
                              税号
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className='w-full md:w-[330px]'
                                onBlur={e => {
                                  field.onBlur();
                                  if (e.target.value) {
                                    if (
                                      !/^[A-Za-z0-9]{15,20}$/.test(
                                        e.target.value
                                      )
                                    ) {
                                      form.setError('tax_no', {
                                        message: '请输入正确的税号',
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
                        name='address'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-left md:text-right w-full md:w-[120px]'>
                              公司地址
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className='w-full md:w-[330px]'
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name='phone'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-left md:text-right w-full md:w-[120px]'>
                              公司注册电话
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className='w-full md:w-[330px]'
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name='bank_name'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-left md:text-right w-full md:w-[120px]'>
                              开户银行名称
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className='w-full md:w-[330px]'
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name='bank_account'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-left md:text-right w-full md:w-[120px]'>
                              银行账户
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className='w-full md:w-[330px]'
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </FormItemsBlock>

                    <FormItemsBlock
                      style={{ marginTop: 4 }}
                      title='一般纳税人证明'
                      desc='图片大小不超过10M，支持jpg,jpeg,png格式'
                    >
                      <FormField
                        control={form.control}
                        name='business_license'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-left md:text-right w-full md:w-[120px]'>
                              营业执照
                            </FormLabel>
                            <FormControl>
                              <Upload
                                defaultUrl={field.value}
                                onComplete={url => {
                                  field.onChange(url);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name='certificate'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-left md:text-right w-full md:w-[120px]'>
                              纳税人资格
                            </FormLabel>
                            <FormControl>
                              <Upload
                                defaultUrl={field.value}
                                onComplete={url => {
                                  field.onChange(url);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name='account_license'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-left md:text-right w-full md:w-[120px]'>
                              开户许可
                            </FormLabel>
                            <FormControl>
                              <Upload
                                defaultUrl={field.value}
                                onComplete={url => {
                                  field.onChange(url);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </FormItemsBlock>

                    <FormItemsBlock
                      title='联系人信息'
                      style={{ margin: `4px 0` }}
                    >
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
                              <Input
                                {...field}
                                className='w-full md:w-[330px]'
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </FormItemsBlock>
                  </>
                )}

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
          )}
        </div>
      </div>
    </Suspense>
  );
}
