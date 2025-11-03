import { FormItemCommon } from './common.entity';

export class FormFieldProduct extends FormItemCommon {
  /** 商品类型 */
  type!: 'Product';
  /** 商品名 */
  title!: string;
  /** 商品预览图 */
  picture!: string;
  /** 标签 */
  tag!: string;
  /** 价格 */
  price!: number;
  /** 库存 */
  stock?: number;
  /** 排版 */
  columnCount?: number;
  /** 禁用 */
  disabled?: boolean;
  /** 业务类型，用于活动应用 */
  bizType?: string;
}
