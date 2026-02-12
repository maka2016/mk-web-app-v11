import { random } from '@/utils';
import type { ReactNode } from 'react';
import type { CopyRowData, GridRow } from '../../utils';
import type { LayerElemItem } from '../../works-store/types';
import { demoPicUrl } from '../DesignerOperatorV2/const';

// 上图下文：一张图片 + 一行文字（垂直排列）
export const createImageTopTextRowData = (): CopyRowData => {
  const picElemId = random();
  const textElemId = random();

  const rows: GridRow[] = [
    {
      tag: 'grid_root',
      style: {
        display: 'flex',
        flexDirection: 'row',
        flex: 1,
        gap: '8.00px',
        gridTemplateColumns: '1fr',
        alignItems: 'flex-start',
        zIndex: 2,
      },
      childrenIds: [],
      alias: 'Grid',
      children: [
        {
          id: random(),
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '8.00px',
            flex: 1,
          },
          childrenIds: [picElemId, textElemId],
        },
      ],
      id: random(),
    },
  ];

  const elemComps: LayerElemItem[] = [
    {
      type: 'element',
      elemId: picElemId,
      elementRef: 'Picture',
      tag: 'photo1',
      attrs: {
        ossPath: demoPicUrl,
        aspectRatio: 0.75,
        originBaseW: 1200,
        originBaseH: 1600,
        version: 2,
        _v: 4,
        disabledToEdit: false,
      },
    },
    {
      type: 'element',
      elemId: textElemId,
      elementRef: 'Text',
      tag: 'text_body',
      attrs: {
        text: '文案',
        lineHeight: 1.5,
      },
    },
  ];

  return {
    rows,
    elemComps,
  };
};

// 左右两张图：左右并排的两张图片
export const createTwoPicturesSideBySideRowData = (): CopyRowData => {
  const leftPicId = random();
  const rightPicId = random();

  const rows: GridRow[] = [
    {
      tag: 'grid_root',
      style: {
        display: 'flex',
        flexDirection: 'row',
        flex: 1,
        gap: '8.00px',
        gridTemplateColumns: '1fr',
        alignItems: 'flex-start',
        zIndex: 2,
      },
      childrenIds: [],
      alias: 'Grid',
      children: [
        {
          id: random(),
          style: {
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          },
          childrenIds: [leftPicId],
        },
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          },
          childrenIds: [rightPicId],
          id: random(),
        },
      ],
      id: random(),
    },
  ];

  const basePicAttrs = {
    ossPath: demoPicUrl,
    aspectRatio: 0.75,
    originBaseW: 1200,
    originBaseH: 1600,
    version: 2,
    _v: 4,
    disabledToEdit: false,
  };

  const elemComps: LayerElemItem[] = [
    {
      type: 'element',
      elemId: leftPicId,
      elementRef: 'Picture',
      tag: 'photo1',
      attrs: {
        ...basePicAttrs,
      },
    },
    {
      type: 'element',
      elemId: rightPicId,
      elementRef: 'Picture',
      tag: 'photo1',
      attrs: {
        ...basePicAttrs,
      },
    },
  ];

  return {
    rows,
    elemComps,
  };
};

// 左右双列图文：左右两列，每列上图下文
export const createTwoColumnsImageTextRowData = (): CopyRowData => {
  const leftPicId = random();
  const leftTextId = random();
  const rightPicId = random();
  const rightTextId = random();

  const rows: GridRow[] = [
    {
      tag: 'grid_root',
      style: {
        display: 'flex',
        flexDirection: 'row',
        flex: 1,
        gap: '8.00px',
        gridTemplateColumns: '1fr',
        alignItems: 'flex-start',
        zIndex: 2,
      },
      childrenIds: [],
      alias: 'Grid',
      children: [
        {
          id: random(),
          style: {
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          },
          childrenIds: [leftPicId, leftTextId],
        },
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          },
          childrenIds: [rightPicId, rightTextId],
          id: random(),
        },
      ],
      id: random(),
    },
  ];

  const basePicAttrs = {
    ossPath: demoPicUrl,
    aspectRatio: 0.75,
    originBaseW: 1200,
    originBaseH: 1600,
    version: 2,
    _v: 4,
    disabledToEdit: false,
  };

  const elemComps: LayerElemItem[] = [
    {
      type: 'element',
      elemId: leftPicId,
      elementRef: 'Picture',
      tag: 'photo1',
      attrs: {
        ...basePicAttrs,
      },
    },
    {
      type: 'element',
      elemId: leftTextId,
      elementRef: 'Text',
      tag: 'text_body',
      attrs: {
        text: '左侧标题',
        lineHeight: 1.5,
      },
    },
    {
      type: 'element',
      elemId: rightPicId,
      elementRef: 'Picture',
      tag: 'photo1',
      attrs: {
        ...basePicAttrs,
      },
    },
    {
      type: 'element',
      elemId: rightTextId,
      elementRef: 'Text',
      tag: 'text_body',
      attrs: {
        text: '右侧标题',
        lineHeight: 1.5,
      },
    },
  ];

  return {
    rows,
    elemComps,
  };
};

// 图文类菜单统一卡片组件（暂未启用）
export const ImageTextMenuItemCard = ({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children?: ReactNode;
}) => {
  return (
    <div
      className='cursor-pointer h-full rounded-md border bg-white overflow-hidden flex flex-col'
      onClick={onClick}
    >
      <div className='relative w-full aspect-[4/3] bg-gray-100 flex items-center justify-center p-2'>
        {children}
      </div>
      <div className='bg-black/50 text-white px-2 py-1 text-[11px] text-center'>
        {title}
      </div>
    </div>
  );
};

