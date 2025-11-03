/* eslint-disable class-methods-use-this */
import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  ResponsiveDialog,
  ResponsiveDialogProps,
} from '@workspace/ui/components/responsive-dialog';

function setDOMById(targetID: string, className = '') {
  if (!targetID) console.log('params id is required');
  let targetDOM = document.getElementById(targetID);
  if (!targetDOM) {
    targetDOM = document.createElement('div');
    targetDOM.id = targetID;
    targetDOM.className = className;
    document.body.appendChild(targetDOM);
  }
  return targetDOM;
}

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
    this.setState(prevState => {
      const newDrawers = {
        ...prevState.drawers,
        [id]: {
          ...prevState.drawers[id],
          ...options,
          isOpen: true,
        } as ResponsiveDialogProps,
      };
      return { drawers: newDrawers };
    });
  };

  set = (id: ModalID, options: Partial<ResponsiveDialogProps>) => {
    this.setState(prevState => ({
      drawers: {
        ...prevState.drawers,
        [id]: {
          ...prevState.drawers[id],
          ...options,
        } as ResponsiveDialogProps,
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
        } as ResponsiveDialogProps,
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
              this.state.drawers[id]?.onOpenChange?.(nextOpen);
            }}
          >
            {this.state.drawers[id]?.children}
          </ResponsiveDialog>
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

const GenerteID = () => String(Date.now());

export const CloseDrawer = (id: ModalID) => {
  setupModal().then(modalManagerEntity => {
    modalManagerEntity.close(id);
  });
};

export type ModalID = string | number;
export interface ShowModalParams extends ResponsiveDialogProps {
  id?: any;
}

/**
 * Show Global Modal
 */
export function ShowDrawerV2(params: Partial<ShowModalParams>) {
  let options = { ...params } as ShowModalParams;
  const { id } = options;

  const entityId = (id || GenerteID()) as ModalID;
  options.id = entityId;

  options = {
    ...options,
    isOpen: true,
  };

  /** 用于检查是否已经渲染了最外层 div */
  setupModal().then(modalManagerEntity => {
    modalManagerEntity.show(entityId, options);
  });
}
