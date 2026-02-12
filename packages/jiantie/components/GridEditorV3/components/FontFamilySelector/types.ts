/* eslint-disable camelcase */

export interface SortItem {
  name: string;
  alias: string;
  font_ids: string[];
}

export interface FontItemInfo {
  copyright_type: number;
  copyright_type_alias: string;
  enterprise_risk: boolean;
  enterprise_risk_enable_lease: boolean;
  enterprise_risk_options: {
    description: string;
    id: number;
    name: string;
    price: number;
    type: string;
    type_id: number;
  }[];
  fileName: string;
  font_id_no: string;
  is_recommend: number;
  name: string;
  order_preview_img: string;
  own: number;
  personal_risk: boolean;
  personal_risk_enable_lease: boolean;
  personal_risk_options: {
    description: string;
    id: number;
    name: string;
    price: number;
    type: string;
    type_id: number;
  }[];
  preview_img: string;
  preview_text_url: string;
  sale_number: number;
  source: string;
  status: 0;
  style: string;
}

export type FontItemInfoCollect = Record<string, FontItemInfo>;
