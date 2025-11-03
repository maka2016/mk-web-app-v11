'use client';
import {
  Breadcrumb,
  Button,
  Checkbox,
  ConfigProvider,
  Form,
  FormProps,
  Input,
  Radio as AntdRadio,
  FormInstance,
} from 'antd';
import styles from './index.module.scss';
import { Icon } from '@workspace/ui/components/Icon';
import cls from 'classnames';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AddInvoiceInfo,
  InvoiceInfo,
  InvoiceStatus,
  InvoiceType,
  UserInvoiceType,
} from '@/types/invoice';
import { useEffect, useRef, useState } from 'react';
import {
  addInvoiceInfo,
  getInvoiceInfo,
  updateInvoiceInfo,
} from '@/services/invoice/invoiceInfo';
import toast from 'react-hot-toast';
import Radio from '../../components/UI/Radio';
import FormItemsBlock from '../../components/UI/FormItemsBlock';
import Upload from '../../components/UI/Upload';
import { Rule } from 'antd/lib/form';
import TextTips from '../../components/UI/TextTips';

type FieldType = AddInvoiceInfo;

// 发票信息操作页面，携带edit_id查询参数即为编辑模式
export default function InvoiceOperation() {
  const router = useRouter();

  const searchParams = useSearchParams();

  const [editId, setEditId] = useState<number>();
  const [mode, setMode] = useState<'add' | 'edit'>();
  const [invoiceInfo, setInvoiceInfo] = useState<InvoiceInfo>();

  const fetchInvoiceInfo = async (id: number) => {
    const res = await getInvoiceInfo(id);
    if (!res.success) return toast.error('获取发票信息失败');

    if (res.data?.status !== InvoiceStatus.DELETED) {
      if (res.data && res.data?.invoice_type !== InvoiceType.专用) {
        // TODO: 这里要处理一下
        res.data.user_invoice_type = res.data.invoice_type as UserInvoiceType;
        res.data.invoice_type = InvoiceType.普通;
      }
      formRef.current?.setFieldsValue(res.data as any);
      setInvoiceInfo(res.data);
    }
  };

  const init = () => {
    const id = +(searchParams.get('edit_id') ?? 0);
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

  const onFinish: FormProps<FieldType>['onFinish'] = async values => {
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

  const onFinishFailed: FormProps<FieldType>['onFinishFailed'] = errorInfo => {
    console.log('Failed:', errorInfo);
  };

  const formRef = useRef<FormInstance<FieldType>>(null);
  const form = Form.useFormInstance<FieldType>();
  const [formData, setFormData] = useState<FieldType>({
    invoice_title: '',
    invoice_type: InvoiceType.普通,
    user_invoice_type: UserInvoiceType.个人,
    tax_no: '',
  });

  const renderInvoiceTitleFormItem = () => {
    return renderInputFormItems([
      {
        label: '发票抬头',
        field: 'invoice_title',
      },
    ]);
  };

  const renderTaxNoFormItem = () => {
    return renderInputFormItems([
      {
        label: '税号',
        field: 'tax_no',
        rules: [
          {
            required: true,
            message: '请输入税号',
            validateTrigger: 'onChange',
          },
          {
            validator: (rule, value) => {
              if (!value) {
                return Promise.resolve();
              }
              if (!/^[A-Za-z0-9]{15,20}$/.test(value)) {
                return Promise.reject('请输入正确的税号');
              }
              return Promise.resolve();
            },
            validateTrigger: 'onBlur',
          },
        ],
      },
    ]);
  };

  interface renderItemsParam {
    label: string;
    field: keyof AddInvoiceInfo;

    rules?: Rule[];
  }

  const renderInputFormItems = (list: renderItemsParam[]) => {
    return list.map((item, idx) => (
      <Form.Item<FieldType>
        key={idx}
        label={item.label}
        name={item.field}
        validateTrigger={['onBlur', 'onChange']}
        rules={
          item.rules ?? [
            {
              required: true,
              message: '请输入' + item.label,
              validateTrigger: 'onChange',
            },
          ]
        }
      >
        <Input style={{ width: 330 }} />
      </Form.Item>
    ));
  };

  const renderImgUploadFormItems = (list: renderItemsParam[]) => {
    return list.map((item, idx) => (
      <Form.Item<FieldType>
        key={idx}
        label={item.label}
        required
        name={item.field}
        rules={[{ required: true, message: '请上传相应图片' }]}
      >
        <Upload
          defaultUrl={formRef.current?.getFieldValue(item.field)}
          onComplete={url => {
            formRef.current?.setFieldValue(item.field, url);
          }}
        />
      </Form.Item>
    ));
  };

  return (
    <div className={styles.main}>
      <div className={styles.formWrapper}>
        <ConfigProvider
          theme={{
            components: {
              Form: {
                labelColor: 'black',
                labelHeight: 22,
              },
              Radio: {
                radioSize: 18,
              },
            },
          }}
        >
          {mode && (
            <Form
              initialValues={formData}
              form={form}
              ref={formRef}
              colon={false}
              name='invoice_add'
              labelCol={{
                style: {
                  display: 'flex',
                  justifyContent: 'end',
                  width: 120,
                  height: 30,
                },
              }}
              onFinish={onFinish}
              onFinishFailed={onFinishFailed}
              autoComplete='off'
            >
              {
                <Form.Item<FieldType>
                  label='发票类型'
                  hidden={mode !== 'add'}
                  name='invoice_type'
                  rules={[{ required: true, message: '请选择发票类型' }]}
                >
                  <AntdRadio.Group>
                    <Radio value={InvoiceType.普通}>普通发票</Radio>
                    <Radio value={InvoiceType.专用}>专用发票</Radio>
                  </AntdRadio.Group>
                </Form.Item>
              }
              <Form.Item dependencies={['invoice_type']} noStyle>
                {({ getFieldValue }) => {
                  if (getFieldValue('invoice_type') !== InvoiceType.专用)
                    return (
                      <>
                        {
                          <Form.Item<FieldType>
                            hidden={mode !== 'add'}
                            label='普通发票类型'
                            name='user_invoice_type'
                            rules={[
                              { required: true, message: '请选择普通发票类型' },
                            ]}
                          >
                            <AntdRadio.Group>
                              <Radio value={UserInvoiceType.个人}>个人</Radio>
                              <Radio value={UserInvoiceType.单位}>单位</Radio>
                            </AntdRadio.Group>
                          </Form.Item>
                        }
                        {renderInvoiceTitleFormItem()}
                        <Form.Item dependencies={['user_invoice_type']} noStyle>
                          {({ getFieldValue }) => {
                            if (
                              getFieldValue('user_invoice_type') ===
                              UserInvoiceType.单位
                            )
                              return renderTaxNoFormItem();
                            else {
                              return null;
                            }
                          }}
                        </Form.Item>
                      </>
                    );
                  else {
                    return (
                      <>
                        {invoiceInfo?.status !== InvoiceStatus.PASS && (
                          <TextTips text='增值税专用发票需要对一般纳税人证明进行审核，约需7个工作日，届时会有工作人员联系您。资质审核通过后，可以申请增值税专用发票。' />
                        )}
                        <FormItemsBlock title='详细信息'>
                          {renderInvoiceTitleFormItem()}
                          {renderTaxNoFormItem()}
                          {renderInputFormItems([
                            {
                              label: '公司地址',
                              field: 'address',
                            },
                            {
                              label: '公司注册电话',
                              field: 'phone',
                            },
                            {
                              label: '开户银行名称',
                              field: 'bank_name',
                            },
                            {
                              label: '银行账户',
                              field: 'bank_account',
                            },
                          ])}
                        </FormItemsBlock>

                        <FormItemsBlock
                          style={{ marginTop: 4 }}
                          title='一般纳税人证明'
                          desc='图片大小不超过10M，支持jpg,jpeg,png格式'
                        >
                          {renderImgUploadFormItems([
                            { label: '营业执照', field: 'business_license' },
                            { label: '纳税人资格', field: 'certificate' },
                            { label: '开户许可', field: 'account_license' },
                          ])}
                        </FormItemsBlock>

                        <FormItemsBlock
                          title='联系人信息'
                          style={{ margin: `4px 0` }}
                        >
                          {renderInputFormItems([
                            {
                              label: '联系电话',
                              field: 'contact',
                              rules: [
                                {
                                  required: true,
                                  message: '请输入联系电话',
                                  validateTrigger: 'onChange',
                                },
                                {
                                  validator: (rule, value) => {
                                    if (!value) {
                                      return Promise.resolve();
                                    }

                                    if (
                                      !/^(?:(?:\+|00)86)?1[3-9]\d{9}$/.test(
                                        value
                                      )
                                    ) {
                                      return Promise.reject(
                                        '请输入正确的联系电话'
                                      );
                                    }
                                    return Promise.resolve();
                                  },
                                  validateTrigger: 'onBlur',
                                },
                              ],
                            },
                            {
                              label: '联系人',
                              field: 'contact_name',
                            },
                          ])}
                        </FormItemsBlock>
                      </>
                    );
                  }
                }}
              </Form.Item>
              <Form.Item label={' '}>
                <Button
                  style={{ width: 76 }}
                  type='primary'
                  htmlType='submit'
                  autoInsertSpace={false}
                >
                  {`确定`}
                </Button>
              </Form.Item>
            </Form>
          )}
        </ConfigProvider>
      </div>
    </div>
  );
}
