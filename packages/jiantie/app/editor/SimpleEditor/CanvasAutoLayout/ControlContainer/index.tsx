import { toJS } from 'mobx';
import { observer } from 'mobx-react';
import React from 'react';
import { useWorksStore } from '../../../useStore';

import './index.scss';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  onMouseDown: () => void;
  className?: string;
  id: string;
  name: string;
  useAnimation?: boolean;
  pageIndex: number;
}

const ControlContainer = React.forwardRef<HTMLDivElement, Props>((props, _) => {
  // console.count('ControlContainer')
  const {
    className = '',
    id,
    children,
    name,
    useAnimation,
    pageIndex,
    ...otherProps
  } = props;
  const store = useWorksStore();
  const { scaleStatus, activeLayerId } = store;
  const currLink = toJS(store.getLink(id));
  const isCompMount = store.checkItemIsMount(id);

  const isEntityMount = store.checkItemIsMount(id);

  const dataVisible = () => {
    const { visibility } = currLink;
    const status = isEntityMount && visibility;
    return status ? 'visible' : 'hidden';
  };

  if (currLink == null || currLink.disabled) {
    return <></>;
  }

  const visiable = dataVisible();

  return children;

  return (
    <div
      id={id}
      {...otherProps}
      data-name={name}
      data-lock={currLink.lock}
      data-show={visiable}
      data-parent_id={currLink.parentId}
      data-page={pageIndex}
      onMouseDown={() => {
        store.setActivItemByID(id);
        store.setPageIndex(pageIndex);
      }}
      data-control={`${activeLayerId === id}`}
      // style={comboxStyle()}
    >
      {children}
    </div>
  );
});

ControlContainer.displayName = 'ControlContainer';

export default observer(ControlContainer);
