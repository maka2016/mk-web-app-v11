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
  // binaryData?: string
  // isDragUpload?: boolean
  // // picid?: string
  // orgHeight: number
  // orgWidth: number
  // borderRadius: number
  // baseW: number
  // baseH: number

  // flipHorizontal: boolean
  // flipVertical: boolean
  // // 对于basew,basH的裁剪
  // cropData: {
  //   left: number
  //   top: number
  //   width: number
  //   height: number
  // }
  // popWindowCropData: {
  //   left: number
  //   top: number
  //   width: number
  //   height: number
  // }
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
