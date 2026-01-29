import { DebounceClass } from '@/utils';

const debounce = new DebounceClass();
const debounceClean = new DebounceClass();

interface SubscriptFunction extends Function {
  /** 执行的次数 */
  execTime?: number;
  /** 已执行的次数 */
  executed: number;
}

export interface SubscribeList {
  [SubscribeEventName: string]: SubscriptFunction[];
}

type Subscribe = (
  eventName: string,
  func: (params: any) => any,
  execTime?: number
) => void;

/**
 * 订阅发布模块
 *
 * @example
 * // 使用内置全局 EventEmitter 对象
 * import { EventEmitter } from 'basic-helper';
 *
 * // 或者自定义一个全新的对象
 * const _EventEmitter = new EventEmitterClass();
 *
 * const callback = () => {};
 *
 * // 订阅: on, 参数说明 (eventName, callback, execTime)
 * // eventName: 订阅的事件的名字
 * // callback:  事件被触发后执行的回调
 * // execTime:  监听该事件的次数，0 为无限
 * EventEmitter.on('LOGIN_SUCCESS', callback, execTime = 0);
 *
 * // 广播: emit
 * // 第二个参数为广播内容，会作为对应事件中的回调中的参数
 * EventEmitter.emit('LOGIN_SUCCESS', {
 *   desc: '发送描述'
 * });
 *
 * // 删除订阅的事件
 * EventEmitter.rm('LOGIN_SUCCESS', callback);
 */
export class EventEmitterClass {
  subscribeList: SubscribeList = {};

  on: Subscribe = (eventName, func, execTime) => {
    this.subscribe.apply(this, [eventName, func, execTime]);
  };

  rm: Subscribe = (eventName, func) => {
    this.unsubscribe.apply(this, [eventName, func]);
  };

  once: Subscribe = (eventName, func) => {
    this.subscribe.apply(this, [eventName, func, 1]);
  };

  private checkFuncIsExist(eventName: string, func: any) {
    return this.subscribeList[eventName].indexOf(func) !== -1;
  }

  subscribe = (eventName: string, func: any, execTime = 0) => {
    if (!func) {
      console.warn('func is required');
    } else {
      const subObj = this.subscribeList[eventName];
      if (!subObj) this.subscribeList[eventName] = [];
      Object.assign(func, {
        execTime,
        executed: 0,
      });
      this.subscribeList[eventName].push(func as any);
    }
  };

  private unsubscribeQueueList: { eventName: string; funcIdx: number }[] = [];

  private cleanSubscribeList = (eventName: string) => {
    this.subscribeList[eventName] =
      this.subscribeList[eventName].filter(Boolean);
  };

  unsubscribe = (eventName: string, func: any) => {
    if (!this.subscribeList[eventName]) return;
    if (this.checkFuncIsExist(eventName, func)) {
      const funcIdx = this.subscribeList[eventName].indexOf(func);
      this.subscribeList[eventName][funcIdx] = null as any;
      // this.subscribeList[eventName].splice(this.subscribeList[eventName].indexOf(func), 1)
      debounceClean.exec(() => {
        this.cleanSubscribeList(eventName);
      }, 200);
    }
  };

  private batchUnsubscribe = () => {
    const queueSnapshot = JSON.parse(JSON.stringify(this.unsubscribeQueueList));
    queueSnapshot.forEach(
      (
        { eventName, funcIdx }: { eventName: string; funcIdx: number },
        idx: number
      ) => {
        this.unsubscribe(eventName, this.subscribeList[eventName][funcIdx]);
        this.unsubscribeQueueList.splice(idx, 1);
      }
    );
  };

  pushToUnsubscribeQueue = (eventName: string, funcIdx: number) => {
    this.unsubscribeQueueList.push({
      eventName,
      funcIdx,
    });
    debounce.exec(this.batchUnsubscribe, 200);
  };

  /**
   * emit 事件
   * @param eventName emit 的名字
   * @param payload
   */
  emit = (eventName: string, payload: any) => {
    const currSubList = this.subscribeList[eventName] || [];
    for (let i = 0; i < currSubList.length; i++) {
      if (typeof currSubList[i] === 'function') {
        currSubList[i].executed += 1;
        const { execTime, executed } = currSubList[i];
        if (execTime !== 0 && executed === execTime) {
          this.pushToUnsubscribeQueue(eventName, i);
        }
      }
      currSubList[i]?.(payload);
    }
  };
}

const EventEmitter = new EventEmitterClass();

export { EventEmitter };
