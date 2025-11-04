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

export interface bitRecRef {
  link_record_ids: string[];
}

export interface bitFindRaw {
  type: 3;
  value: string[];
}

export interface bitTextRaw {
  type: 'text';
  text: string;
}
