import { didWidgetMount } from '@mk/works-store';
import { LayerElemItem } from '@mk/works-store/types';
import { observer } from 'mobx-react';
import { useRef } from 'react';
import { useWorksStore } from '../../useStore';
import { CompLoader } from '../CompLoader';
import ControlContainer from './ControlContainer';

interface Props {
  worksStore?: any;
  name: string;
  contentProps: {
    [key: string]: any;
  };
  comId: string;
  idx: number;
  combinationBody?: LayerElemItem[];
  didLoaded?: () => void;
  didMount?: () => void;
  readonly?: boolean;
  navigationIndex: number;
}

export default observer((props: Props) => {
  const {
    name,
    contentProps,
    readonly = false,
    comId,
    combinationBody = [],
    didLoaded,
    didMount,
    navigationIndex,
  } = props;
  const worksStore = props.worksStore || useWorksStore();
  const { positionLink } = worksStore.worksData;
  const link = positionLink[comId];
  const isMount = useRef(false);

  const widgetState = worksStore.getWidgetState(comId);

  if (!link) {
    return <></>;
  }

  const selectItem = () => {
    console.log('11', 11);
  };
  const containerInfo = worksStore.getLink(comId) as any;

  const canvaInfo = {
    canvaH: worksStore.worksData.canvasData.visualHeight,
    canvaW: worksStore.worksData.canvasData.width,
    scaleRate: worksStore.scale,
    scaleZommRate: 1,
  };

  const lifecycle = {
    didLoaded: () => {
      if (readonly) {
        return;
      }
      didLoaded?.();
    },
    didMount: (compInitData: any) => {
      // if (readonly) return
      if (!isMount.current) {
        didMount?.();
        isMount.current = true;
        didWidgetMount(comId);
        worksStore.onComponentDidMount(comId, compInitData, navigationIndex);
      }
    },
  };

  let pageInfo;
  if (navigationIndex !== undefined) {
    pageInfo = Object.assign({}, worksStore.getPage(navigationIndex), {
      pageIndex: navigationIndex,
    });
  }

  return (
    <ControlContainer
      name={name}
      useAnimation={!readonly}
      pageIndex={navigationIndex}
      onMouseDown={selectItem}
      id={comId}
    >
      <CompLoader
        // 组件的生命周期接口
        id={comId}
        elementRef={name}
        widgetState={widgetState}
        readonly={readonly}
        // 如果不可交互，则不会进入编辑态
        lifecycle={lifecycle}
        canvaInfo={canvaInfo}
        body={combinationBody}
        containerInfo={containerInfo}
        contentProps={contentProps}
        pageInfo={pageInfo as any}
      />
    </ControlContainer>
  );
});
