export interface RenderElemItem {
  idx: number;
  /** elementRef */
  type: string;
  /** attrs */
  attrs: any;
  /** id */
  id: string;
  moduleId?: string;
}

export type RenderElemItemsTree = RenderElemItem[];
