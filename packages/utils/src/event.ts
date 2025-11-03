import { IObject } from './types';

type linearCallback = (id: string, extra: IObject) => void;

export interface EventHash {
  operationMouseDown: IObject<linearCallback>;
  operationEnter: IObject<linearCallback>;
  operationOut: IObject<linearCallback>;
  autoSave: IObject;
  onLeavaCanvas: IObject;

  onScaleChange: IObject;

  viewPlay: IObject;
}

export class LinearEvent {
  eventHash: EventHash;

  constructor() {
    this.eventHash = {
      operationMouseDown: {},
      autoSave: {},
      operationEnter: {},
      operationOut: {},
      onLeavaCanvas: {},
      onScaleChange: {},
      viewPlay: {},
    };
  }

  addListener = (
    eventType: keyof EventHash,
    id: string,
    cbk: linearCallback
  ) => {
    this.eventHash[eventType][id] = cbk;
  };

  removeListener = (eventType: keyof EventHash, id: string) => {
    delete this.eventHash[eventType][id];
  };

  emit = (eventType: keyof EventHash, id?: string, extra?: IObject) => {
    if (id == null) {
      Object.values(this.eventHash[eventType]).forEach(f => f(id, extra));
    } else {
      const fun = this.eventHash[eventType][id];
      if (fun) {
        fun(id, extra);
      }
    }
  };
}

export const linearEvent = new LinearEvent();
