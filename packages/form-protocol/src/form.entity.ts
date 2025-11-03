import {
  FormFieldAddress,
  FormFieldCheckbox,
  FormFieldDatePicker,
  FormFieldDropdown,
  FormFieldHidden,
  FormFieldImgAddon,
  FormFieldInput,
  FormFieldProduct,
  FormFieldRadio,
  FormFieldTextarea,
} from './fields';

/**
 * 表单项集合
 */
export type FormFieldItem =
  | FormFieldCheckbox
  | FormFieldInput
  | FormFieldTextarea
  | FormFieldRadio
  | FormFieldDatePicker
  | FormFieldDropdown
  | FormFieldImgAddon
  | FormFieldProduct
  | FormFieldHidden
  | FormFieldAddress;

/**
 * 表单协议
 */
export class FormDataProtocolClass {
  /** 表单 id */
  formId?: string;
  /** 表单 name */
  formName?: string;
  /** 表单业务类型 */
  type?: string;
  /** 描述 */
  desc?: string;
  /** 字段 */
  fields?: FormFieldItem[];
  // -------------------
  /** 提交规则 */
  // -------------------
  // 只用户允许一次提交
  oneSubmissionPerPerson?: boolean;
  // 是否手机微信信息
  isNeedCollectWechat?: boolean;
  // 仅允许微信环境提交
  wechatSubmissionOnly?: boolean;
  // 表单最大可提交数
  submissionMaxLimit?: boolean;
  /** 最大提交数 */
  submissionMaxNum?: number;
  // 提交是否后跳转
  jumpAfterSubmission?: boolean;
  // 提交后跳转地址
  jumpLink?: string;
  // -------------------
  // 运行环境要求
  // -------------------
  /** 是否需要验证 */
  needWXAuth?: boolean;
  // -------------------
  // ui
  // -------------------
  /** 表单字体颜色 */
  fontColor?: string;
  /** 控件颜色 */
  controlColor?: string;
  // 按钮文本
  btnText?: string;
  // 按钮反馈
  submitFeedback?: string;
}

export type FormDataProtocol = FormDataProtocolClass;

export interface SubmissionRule {
  submissionMaxLimit: FormDataProtocol['submissionMaxLimit'];
  submissionMaxNum: FormDataProtocol['submissionMaxNum'];
  oneSubmissionPerPerson: FormDataProtocol['oneSubmissionPerPerson'];
}
