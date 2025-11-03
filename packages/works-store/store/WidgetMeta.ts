import { WidgetResItem } from '@mk/widgets-bridge-sdk/types';

const allWidgetData: Record<string, WidgetResItem> = {};

export const setWidgetMeta = (widgetMetadatasResData: WidgetResItem[]) => {
  if (!Array.isArray(widgetMetadatasResData)) {
    console.log('widgetMetadatasResData', widgetMetadatasResData);
    throw new Error(`请传入接口返回的数组数据`);
  }
  widgetMetadatasResData.forEach(item => {
    const { ref } = item;
    allWidgetData[ref] = item;
  });
  return allWidgetData;
};

export const setAllWidgetMeta = (
  widgetMetadatasResData: Record<string, WidgetResItem>
) => {
  Object.assign(allWidgetData, widgetMetadatasResData);
};

export const getWidgetMeta = (elemRef?: string) => {
  if (!elemRef || !allWidgetData[elemRef]) {
    // throw new Error('请传入组件的 elemRef')
    console.debug('请传入组件的 elemRef', elemRef);
    return null;
  }
  return allWidgetData[elemRef].componentMeta;
};

export const getAllWidgetMeta = () => {
  return allWidgetData;
};
