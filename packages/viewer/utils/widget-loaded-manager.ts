const compLoadedList: { [key: string]: { [key: string]: boolean } } = ({} = {});

export const handleWidgetDidLoaded = (params: {
  pageIndex: number;
  compId: string;
  compType?: string;
  shouldLoadedCount: number;
  onAllWidgetLoaded: () => void;
}) => {
  const {
    pageIndex,
    compId,
    compType = '',
    shouldLoadedCount,
    onAllWidgetLoaded,
  } = params;
  if (typeof compLoadedList[pageIndex] === 'undefined') {
    compLoadedList[pageIndex] = {};
  }
  if (!compLoadedList[pageIndex][compId]) {
    compLoadedList[pageIndex][compId] = true;
    // console.log(`page ${pageIndex} loaded comp: `, Object.keys(compLoadedList[pageIndex]).length)
    if (Object.keys(compLoadedList[pageIndex]).length === shouldLoadedCount) {
      onAllWidgetLoaded();
    }
  }
};
