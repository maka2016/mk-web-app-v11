export interface MkImageGroupData {
  type: 'tiled' | 'fullfill';
  imageDataList: MkImageData[];
  /** 是否自动翻页 */
  autoFlip: boolean;
  /** 自动翻页频率 */
  flipFeq: number;
  carouselType: string;
  editing?: boolean;
  hideDots?: boolean;
}

export interface MkImageData {
  id: string;
  // materialId: string
  ossPath: string;
  desc: string;
}

export const ImageContentMode = [
  {
    value: 'tiled',
    label: '铺满',
  },
  {
    value: 'fullfill',
    label: '填充',
  },
];
