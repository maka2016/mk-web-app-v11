export const defaultWidgetMeta = {
  MkCombination: {
    id: 'MkCombination',
    ref: 'MkCombination',
    componentMeta: {
      elementRef: 'MkCombination',
      propFormConfig: {
        customFormRef: 'MkCombinationForm',
      },
    },
  },
};

const allWidgetData: any = defaultWidgetMeta;

export const setWidgetMetaColl = (widgetMetadatasResData: any[]) => {
  if (!Array.isArray(widgetMetadatasResData)) {
    throw new Error(`请传入接口返回的数组数据`);
  }
  widgetMetadatasResData.forEach(item => {
    const { ref } = item;
    allWidgetData[ref] = item;
  });
  return allWidgetData;
};

export const getWidgetMetaColl = (elemRef?: string) => {
  return elemRef ? allWidgetData[elemRef] : allWidgetData;
};
