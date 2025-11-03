/* eslint-disable class-methods-use-this */
import setDOMById from '@mk/utils/src/set-dom';
import {
  ResponsiveDialog,
  ResponsiveDialogProps,
} from '@workspace/ui/components/responsive-dialog';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ModalID } from './DrawerFunc';

class ModalsManager extends React.Component<
  any,
  {
    drawers: { [key: string]: ResponsiveDialogProps };
  }
> {
  constructor(props: any) {
    super(props);
    this.state = {
      drawers: {},
    };
  }

  show = (id: ModalID, options: Partial<ResponsiveDialogProps>) => {
    this.setState(prevState => ({
      drawers: {
        ...prevState.drawers,
        [id]: {
          ...prevState.drawers[id],
          ...options,
          isOpen: true,
        },
      },
    }));
  };

  set = (id: ModalID, options: Partial<ResponsiveDialogProps>) => {
    this.setState(prevState => ({
      drawers: {
        ...prevState.drawers,
        [id]: {
          ...prevState.drawers[id],
          ...options,
        },
      },
    }));
  };

  close = (id: ModalID) => {
    this.setState(prevState => ({
      drawers: {
        ...prevState.drawers,
        [id]: {
          ...prevState.drawers[id],
          isOpen: false,
        },
      },
    }));
  };

  render() {
    return (
      <>
        {Object.keys(this.state.drawers).map(id => (
          <ResponsiveDialog
            key={id}
            {...this.state.drawers[id]}
            onOpenChange={nextOpen => {
              if (!nextOpen) {
                this.close(id);
              } else {
                this.set(id, { isOpen: true });
              }
              this.state.drawers[id].onOpenChange?.(nextOpen);
            }}
          />
        ))}
      </>
    );
  }
}

let __entity: ModalsManager;
export const setupModal = (className?: string) => {
  return new Promise<ModalsManager>((resolve, rejects) => {
    if (__entity) {
      resolve(__entity);
    } else {
      const rootDOM = setDOMById('drawer-root', className);
      const root = ReactDOM.createRoot(rootDOM);
      root.render(
        <ModalsManager
          ref={e => {
            if (!e) {
              rejects();
            } else {
              __entity = e;
              resolve(__entity);
            }
          }}
        />
      );
    }
  });
};
