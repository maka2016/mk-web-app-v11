import ajax from 'micell/ajax';
import getCookie from 'micell/cookie/get';
import setCookie from 'micell/cookie/set';
import parseUrl from 'micell/url/parse';
import stringifyUrl from 'micell/url/stringify';
import uuidv4 from 'micell/uuid';
import allCollectors from './collectors';

export type Properties = Record<string, any>;

export type Collector = (ma: MA) => Properties | Promise<Properties>;

export interface Sender {
  name: string;
  send: (data?: Properties) => any | Promise<any>;
}

export interface Options {
  idCookieName?: string;
  identityName?: string;
  debugStoreName?: string;
  serverUrl?: string;
  collectors?: string[]; // names from allCollectors
  beforeSend?: (this: MA, data: Properties) => Properties | void;
  debug?: boolean;
}

class MA {
  static defaults = {
    idCookieName: 'ma_id',
    identityName: '$ma_id',
    debugStoreName: 'ma_debug',
  };

  private _opts: Options;
  private _isReady: boolean;
  private _queue: Array<[keyof MA, any[]]>;
  private _collectors: Collector[];
  private _senders: Sender[];
  private _baseProps: Properties;

  constructor(options: Options = {}) {
    this._opts = {
      ...MA.defaults,
      ...options,
    };
    this._isReady = false;
    this._queue = [];
    this._collectors = [];
    this._senders = [];
    this._baseProps = {};

    let id = this.getIdentityId();

    if (!id) {
      id = uuidv4();
      setCookie(this._opts.idCookieName as string, id, {
        expires: '3Y',
      } as any);
    }

    const { identityName } = this._opts;
    if (identityName) {
      this.setProperties({
        [identityName]: id,
      });
    }

    const { serverUrl } = this._opts;

    if (serverUrl) {
      this.addSender({
        name: 'default',
        send(data: Properties = {}) {
          const parsedUrl: any = parseUrl(serverUrl);
          parsedUrl.query = {
            ...parsedUrl.query,
            ...data,
          };
          parsedUrl.search = '';
          const url = stringifyUrl(parsedUrl as any);
          return ajax(url as any);
        },
      });
    }

    this.initCollectors().then(() => {
      this._isReady = true;
      this._queue.forEach(([method, args]) => {
        // @ts-ignore index access on instance methods by key
        (this as any)[method](...args);
      });
    });
  }

  push(cmd: [keyof MA, any[]]) {
    this._queue.push(cmd);
  }

  async initCollectors() {
    const { collectors } = this._opts;
    if (collectors) {
      collectors.forEach(name => {
        const c = (allCollectors as any)[name] as Collector;
        this.addCollector(c);
      });
    }

    for (const collector of this._collectors) {
      const res = collector(this);
      if (res && (res as any).then) {
        const data = (await res) as Properties;
        this.setProperties(data);
      } else {
        this.setProperties(res as Properties);
      }
    }
  }

  getIdentityId() {
    return getCookie(this._opts.idCookieName as string) as string | undefined;
  }

  isDebug() {
    return (
      (typeof window !== 'undefined' &&
        (window as any).localStorage &&
        (window as any).localStorage[this._opts.debugStoreName as string]) ||
      this._opts.debug
    );
  }

  setProperties(props: Properties) {
    this._baseProps = {
      ...this._baseProps,
      ...props,
    };
  }

  addCollector(collector: Collector) {
    this._collectors.push(collector);
  }

  addSender(sender: Sender) {
    this._senders.push(sender);
  }

  track(event: string, properties?: Properties) {
    if (!this._isReady) {
      this.push(['track' as any, [event, properties]]);
      return;
    }
    const { beforeSend } = this._opts;
    let data: Properties | undefined = {
      $event: event,
      ...this._baseProps,
      ...(properties || {}),
    };

    Object.keys(data).forEach(k => {
      if (
        (data as Properties)[k] === null ||
        (data as Properties)[k] === undefined
      ) {
        delete (data as Properties)[k];
      }
    });

    if (typeof beforeSend === 'function') {
      const res = beforeSend.call(this, data);
      if (res) data = res;
    }

    if (this.isDebug()) {
      console.log('data:');

      console.log(JSON.stringify(data, null, 2));
    }

    if (data) {
      this._senders.forEach(sender => {
        sender.send(data as Properties);
      });
    }
  }

  destroy() {
    this._isReady = false;
    this._queue = [];
    this._collectors = [];
    this._senders = [];
    this._baseProps = {};
  }
}

if (typeof window !== 'undefined') {
  const name = (window as any).ma_sdk_name || 'ma';
  if (typeof (window as any)[name] === 'function') {
    const runQueue = (window as any)[name];
    const params = (window as any)[name].params;
    (window as any)[name] = new MA(params);
    runQueue();
  }
}

export default MA;
