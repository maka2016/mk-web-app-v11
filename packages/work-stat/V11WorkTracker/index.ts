import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { getCookie, setCookieExpire } from './cookie';

class V11WorkTracker {
  appId?: string;
  workId?: string;
  serverUrl: string = '';
  sessionId?: string;
  distinctId?: string;

  hasInit: boolean = false;
  constructor() {}

  init(options?: any) {
    if (this.hasInit) return;
    this.hasInit = true;
    this.appId = options.appId;
    this.workId = options.workId;
    console.log('V11WorkTracker init', options);
    const host = 'cn-beijing.log.aliyuncs.com';
    const project = 'h5-user-work-log';
    const logstore = 'h5-work';

    // 构建 serverUrl，类似 makaAssistantTracker 和 yingxiaoyun/tracker 的方式
    this.serverUrl = `https://${project}.${host}/logstores/${logstore}/track?APIVersion=0.6.0`;
    this.sessionId = uuidv4();

    // distinctId先从cookie或者localStorage拿，没有则生成
    this.distinctId = this.getOrCreateDistinctId();
  }
  private getOrCreateDistinctId(): string {
    const cookieKey = 'v11_distinct_id';
    const storageKey = 'v11_distinct_id';

    // 先从cookie获取
    let distinctId = getCookie(cookieKey);
    if (distinctId) {
      // 如果cookie有值，同步到localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          localStorage.setItem(storageKey, distinctId);
        } catch (e) {
          // localStorage可能被禁用，忽略错误
        }
      }
      return distinctId;
    }

    // 如果cookie没有，从localStorage获取
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const storedId = localStorage.getItem(storageKey);
        if (storedId) {
          distinctId = storedId;
          // 如果localStorage有值，同步到cookie
          setCookieExpire(cookieKey, distinctId, 365 * 24 * 60 * 60 * 1000);
          return distinctId;
        }
      } catch (e) {
        // localStorage可能被禁用，忽略错误
      }
    }
    // 如果都没有，生成新的distinctId
    distinctId = uuidv4();
    // 保存到cookie
    setCookieExpire(cookieKey, distinctId, 365 * 24 * 60 * 60 * 1000);

    // 保存到localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(storageKey, distinctId);
      } catch (e) {
        // localStorage可能被禁用，忽略错误
      }
    }

    return distinctId;
  }

  async track(eventType: 'pageview' | 'heartbeat' | string, extraData?: any) {
    if (!this.hasInit) {
      throw new Error('V11WorkTracker not init');
    }
    const trackData = {
      eventType: eventType,
      sessionId: this.sessionId,
      distincId: this.distinctId, //存在cookie或者localstorage
      eventId: this.workId,
      appId: this.appId,
      url: window.location.href,
      ua: navigator.userAgent,
      ...extraData,
    };

    return await this.uploadTrackData(trackData);
  }

  private async uploadTrackData(trackData: any) {
    const serverUrlObj = new URL(this.serverUrl);
    const params = new URLSearchParams(trackData);

    const url = `${serverUrlObj.origin}${serverUrlObj.pathname}?${serverUrlObj.search}&${params.toString()}`;
    return await axios.get(url);
  }
}

export default new V11WorkTracker();
