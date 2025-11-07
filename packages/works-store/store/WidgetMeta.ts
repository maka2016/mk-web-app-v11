import { WidgetResItem } from '@mk/widgets-bridge-sdk/types';

const allWidgetData: Record<string, WidgetResItem> = {};

export const getWidgetMeta = (elemRef?: string) => {
  if (!elemRef || !allWidgetData[elemRef]) {
    // throw new Error('请传入组件的 elemRef')
    console.debug('请传入组件的 elemRef', elemRef);
    return null;
  }
  return allWidgetData[elemRef].componentMeta;
};
