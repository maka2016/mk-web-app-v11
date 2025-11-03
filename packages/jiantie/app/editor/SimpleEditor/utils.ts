import { IWorksData, LayerElemItem } from '@mk/works-store/types';

interface FormGroupItem {
  cellsMap: Array<{
    cells: Array<{
      childrenIds: string[];
    }>;
  }>;
  groupId: string;
}
export type FormGroup = FormGroupItem[];

function extractChildrenIdsToFormGroup(data: LayerElemItem[]): FormGroup {
  const formGroup: FormGroup = [];

  data.forEach((item, idx) => {
    const formGroupItem: FormGroupItem = {
      cellsMap: item.attrs.cellsMap,
      groupId: item.elemId,
    };

    if (formGroupItem.cellsMap.length > 0) {
      formGroup.push(formGroupItem);
    }
  });

  return formGroup;
}

export const getFormGroupData = (worksData: IWorksData) => {
  const allGridData: LayerElemItem[] = worksData.canvasData.content.pages
    .map(page =>
      page.layers
        .map(layer => {
          if (/GridV3/.test(layer.elementRef)) {
            return layer;
          }
          return null;
        })
        .filter(layer => layer !== null)
    )
    .flat();
  const formGroup = extractChildrenIdsToFormGroup(allGridData);
  return formGroup;
};

export const deepLayers = (
  items: LayerElemItem[],
  cbk: any,
  parentId?: string
) => {
  if (!items?.length) {
    return;
  }
  for (const item of items) {
    cbk(item, parentId);
    const { body } = item;
    if (body instanceof Array && body.length > 0) {
      deepLayers(body, cbk, item.elemId);
    }
  }
};

export const getAllLayers = (data: IWorksData): LayerElemItem[] => {
  const { pages } = data.canvasData.content;
  const layersItemArray: any = [];

  for (const pageKey in pages) {
    deepLayers(pages[pageKey].layers, (item: LayerElemItem) => {
      layersItemArray.push(item);
    });
  }
  return layersItemArray;
};

export const deepClone = <T>(obj: T): T => {
  if (!obj) return obj;
  return JSON.parse(JSON.stringify(obj));
};
