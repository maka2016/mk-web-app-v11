import { FormItemCommon } from './common';

export interface ImgAddonItem {
  url: string;
  name?: string;
  size?: number;
  timestamep?: number;
  filetype?: string;
}

export interface FormFieldImgAddon extends FormItemCommon {
  type: 'ImgAddon';
  options: Array<ImgAddonItem>;
  /** 最少添加图片数量要求 */
  less: number;
  /** 最多可添加多少 */
  most: number;
  // 每行展示N项
  columnCount: number;
}
