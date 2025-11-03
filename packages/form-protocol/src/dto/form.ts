import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { FormFieldItem } from '../form.entity';

/**
 * 表单协议
 */
export class FormDataProtocolClass {
  /** 表单 id */
  @IsString()
  @IsOptional()
  formId?: string;
  /** 表单 name */
  @IsString()
  @IsOptional()
  formName?: string;
  /** 字段 */
  @Type()
  @IsOptional()
  fields?: FormFieldItem[];
  // -------------------
  /** 提交规则 */
  // -------------------
  // 只用户允许一次提交
  @IsBoolean()
  @IsOptional()
  oneSubmissionPerPerson?: boolean;
  // 是否手机微信信息
  @IsBoolean()
  @IsOptional()
  isNeedCollectWechat?: boolean;
  // 仅允许微信环境提交
  @IsBoolean()
  @IsOptional()
  wechatSubmissionOnly?: boolean;
  // 表单最大可提交数
  @IsBoolean()
  @IsOptional()
  submissionMaxLimit?: boolean;
  /** 最大提交数 */
  @IsNumber()
  @IsOptional()
  submissionMaxNum?: number;
  // 提交是否后跳转
  @IsBoolean()
  @IsOptional()
  jumpAfterSubmission?: boolean;
  // 提交后跳转地址
  @IsString()
  @IsOptional()
  jumpLink?: string;
  // -------------------
  // 运行环境要求
  // -------------------
  /** 是否需要验证 */
  @IsBoolean()
  @IsOptional()
  needWXAuth?: boolean;
  /** 微信信息 */
  // @IsOptional()
  // wechatInfo?: {
  //   nickname: {
  //     id: string;
  //   };
  //   avatar: {
  //     id: string;
  //   };
  // };
  // -------------------
  // ui
  // -------------------
  /** 表单字体颜色 */
  @IsString()
  @IsOptional()
  fontColor?: string;
  /** 控件颜色 */
  @IsString()
  @IsOptional()
  controlColor?: string;
  // 按钮文本
  @IsString()
  @IsOptional()
  btnText?: string;
  // 按钮反馈
  @IsString()
  @IsOptional()
  submitFeedback?: string;
}

export type FormDataProtocol = typeof FormDataProtocolClass;
