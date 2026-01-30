export interface DatasheetItem {
  name: string;
  baseId: string;
  tableId: string;
  viewId: string;
  templateCoverUseGif?: boolean;
}

export interface bitTextRef {
  type: number;
  value: bitTextRaw[];
}

export interface bitFileRaw {
  file_token: string;
  name: string;
  size: number;
  tmp_url: string;
  type: string;
  url: string;
}

export interface bitRecRef {
  link_record_ids: string[];
}

export interface bitFindRaw {
  type: 3;
  value: string[];
}

export interface bitUseraw {
  type: 11;
  value: {
    avatar_url: string;
    email: string;
    en_name: string;
    id: string;
    name: string;
  }[];
}

export interface bitTextRaw {
  type: 'text';
  text: string;
}
