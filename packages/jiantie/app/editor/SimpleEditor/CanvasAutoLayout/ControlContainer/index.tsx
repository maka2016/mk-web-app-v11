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
  const { className = '', id, children, name, useAnimation, pageIndex } = props;
  const store = useWorksStore();
  const currLink = toJS(store.getLink(id));

  if (currLink == null || currLink.disabled) {
    return <></>;
  }

  return children;
});

ControlContainer.displayName = 'ControlContainer';

export default observer(ControlContainer);
