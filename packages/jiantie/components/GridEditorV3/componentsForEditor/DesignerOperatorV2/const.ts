import { CopyRowData } from '../../utils';

export const demoPicUrl =
  'https://img2.maka.im/cdn/jiantie/works-resources/605056689/98235872443409_e910ad.png';

export const genAddPictureData = ({
  tag,
  count,
}: {
  tag: string;
  count: number;
}) => {
  return {
    rows: [
      {
        id: 'YpDGJlHEft',
        cells: [],
        childrenIds: ['wvBhGDirnk'],
        style: {
          display: 'flex',
          flexDirection: 'row',
          flex: 1,
          gridTemplateColumns: '1fr',
          writingMode: 'horizontal-tb',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 'auto',
          zIndex: 2,
          gap: '12.00px',
        },
        sourceRowId: 'FmnAtkRFvC',
      },
    ],
    elemComps: [
      {
        elementRef: 'Picture',
        attrs: {
          ossPath: demoPicUrl,
          aspectRatio: 0.75,
          originBaseW: 1200,
          originBaseH: 1600,
          version: 2,
          _v: 4,
          disabledToEdit: false,
        },
        elemId: 'wvBhGDirnk',
        type: 'element',
      },
      {
        elementRef: 'Picture',
        attrs: {
          ossPath: demoPicUrl,
          aspectRatio: 0.75,
          originBaseW: 1200,
          originBaseH: 1600,
          version: 2,
          _v: 4,
          disabledToEdit: false,
        },
        elemId: 'nGwXzwHeD_',
        type: 'element',
      },
    ],
  } as CopyRowData;
};
