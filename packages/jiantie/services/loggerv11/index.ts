'use client';
import { getAppId, getCurrEnv, getUid } from '@/services';
import {
  DebounceClass,
  EventEmitter,
  getCookie,
  isMakaAppAndroid,
  isMakaAppIOS,
  isPc,
  queryToObj,
  random,
  setCookie,
  setCookieExpire,
} from '@/utils';
import { v4 as uuidv4 } from 'uuid';
import { V11APPTracker } from '@/services/loggerv11/logger';

const debounce = new DebounceClass();

export interface ObjectInfo {
  object_type?: string;
  object_id?: string;
  object_inst_id?: string;
  object_order?: string;
  parent_type?: string;
  parent_id?: string;
  parent_inst_id?: string;
  page_id?: string;
  page_type?: string;
  ref_page_id?: string;
}

/** 用于记录容器是否加载完成 */
const ContainerMountCache: Record<string, any> = {};
const setContainerMountCache = (key: string) => {
  ContainerMountCache[key] = true;
};
const isContainerMount = (key: string) => !!ContainerMountCache[key];

const getPlatform = () => {
  if (isPc()) {
    return 'web';
  } else if (isMakaAppAndroid()) {
    return 'android';
  } else if (isMakaAppIOS()) {
    return 'ios';
  } else {
    return 'wap';
  }
};

const cookiesKey = '__said__';

export const getDistinctId = () => {
  let did = getCookie(cookiesKey);
  if (!did) {
    did = 'viewer_' + random(16);
    setCookie(cookiesKey, did);
  }
  return did;
};

class V11MkWebStoreLogger {
  _logger: any;
  _initialized: boolean = false;

  constructor() {
    console.log('V11MkWebStoreLogger init');
  }
  private ensureInitialized() {
    // 只在客户端初始化，且只初始化一次
    if (this._initialized || typeof window !== 'object') {
      return;
    }

    // const query = queryToObj();
    // if (query.source_type && query.source_id) {
    //   sessionStorage.setItem('source_type', query.source_type);
    //   sessionStorage.setItem('source_id', query.source_id);
    // }

    // 环境判断
    // 拼装sender,环境配置
    const currEnv = getCurrEnv();
    const appid = getAppId();

    this._logger = new V11APPTracker({
      env: currEnv === 'prod' || currEnv === 'staging' ? 'prod' : 'test',
      appId: appid || '',
    });

    EventEmitter.on('v11mkTrackerMount', this.handleMkTrackerMount);
    try {
      window.addEventListener('click', this.handleElemClickDebounce, false);
    } catch {
      // 忽略错误
    }

    this._initialized = true;
  }

  /**
   * 获取或创建 sessionId
   * Session 周期：30分钟不活动则创建新 session
   */
  private getOrCreateSessionId(): string {
    const sessionIdKey = 'v11_track_session_id';
    const sessionTimeKey = 'v11_track_session_time';
    const SESSION_TIMEOUT = 60 * 60 * 1000; // 30分钟（毫秒）

    const now = Date.now();
    let sessionId = getCookie(sessionIdKey);
    const lastActivityTime = getCookie(sessionTimeKey);

    // 检查 session 是否超时
    if (sessionId && lastActivityTime) {
      const lastTime = parseInt(lastActivityTime, 10);
      if (!isNaN(lastTime) && now - lastTime < SESSION_TIMEOUT) {
        // Session 未超时，更新活动时间
        setCookieExpire(sessionTimeKey, String(now), SESSION_TIMEOUT);
        return sessionId;
      }
      // Session 已超时，创建新 session
    }

    // 创建新 session
    sessionId = uuidv4();
    // Session ID 和活动时间都设置30分钟过期
    setCookieExpire(sessionIdKey, sessionId, SESSION_TIMEOUT);
    setCookieExpire(sessionTimeKey, String(now), SESSION_TIMEOUT);

    return sessionId || '';
  }

  private handleMkTrackerMount = (trackInfo: ObjectInfo) => {
    if (
      trackInfo.object_inst_id &&
      !isContainerMount(trackInfo.object_inst_id)
    ) {
      this.track_show(trackInfo);
      setContainerMountCache(trackInfo.object_inst_id);
    }
  };

  handleElemClickDebounce = (e: MouseEvent) => {
    debounce.exec(() => this.handleElemClick(e), 100);
  };

  handleElemClick = (e: MouseEvent) => {
    const target = e.target as HTMLDivElement;
    // 当前点击元素往上检查 3 层
    const targets = [
      target,
      target.parentElement,
      target.parentElement?.parentElement,
    ].filter(i => !!i) as HTMLElement[];
    const trackTarget = targets.find(item => item.dataset.tracker === 'true');

    if (trackTarget) {
      const { dataset } = trackTarget;
      try {
        const commitData = JSON.parse(dataset.behavior || '');

        if (Object.keys(commitData).length > 0) {
          this.track_click(commitData as ObjectInfo);
        }
      } catch (err) {
        console.log('err', err);
      }
    }
  };

  /**
   * 统一处理和补全打点信息
   */
  track = (data: any, imd = false) => {
    this.ensureInitialized();

    if (!data.parent_id) {
      /** 如果没有定义 object_id，则采用 page id */
      data.parent_id = data.page_id;
    }
    if (!data.parent_type) {
      data.parent_type = data.page_type;
    }
    if (!data.parent_inst_id) {
      data.parent_inst_id = data.page_inst_id;
    }
    const { ref_page_id, ref_page_type, searchword } = queryToObj();

    if (!data.ref_page_id && ref_page_id) {
      data.ref_page_id = decodeURIComponent(ref_page_id);
    }
    if (!data.ref_page_type && ref_page_type) {
      data.ref_page_type = ref_page_type;
    }
    if (!data.searchword && searchword) {
      data.searchword = searchword;
    }

    //补充环境信息和基础信息
    const uid = getUid();
    data.uid = String(uid || '');
    data.platform = getPlatform();

    // 只在客户端执行
    if (typeof window === 'object') {
      const { location, parent } = window;
      const referrer =
        location !== parent.location
          ? document.referrer
          : document.location.href;
      data.ua = navigator.userAgent;
      data.title = document.title;
      data.url = document.location.href;
      data.referrer = referrer;
    }

    this._logger?.track(data, imd);
  };

  track_pageview(extra = {}, imd = false) {
    const data = Object.assign(
      {
        event_type: 'page_view',
      },
      extra
    );
    this.track(data, imd);
  }

  /**
   * 通过 Container 的 behavior 定义
   */
  track_click(eleData: ObjectInfo) {
    const data = Object.assign(eleData, {
      event_type: 'click',
    });
    // 上报
    this.track(data, true);
  }

  track_show(eleData: ObjectInfo) {
    // 上报
    const data = Object.assign(eleData, {
      event_type: 'show',
    });
    // 上报
    this.track(data, true);
  }

  track_log(eleData: any) {
    // 上报
    this.track(eleData);
  }

  track_search(eleData: any) {
    // 上报
    const data = Object.assign(eleData, {
      event_type: 'search',
    });
    // 上报
    this.track(data, true);
  }

  track_success(eleData: any) {
    // 上报
    const data = Object.assign(eleData, {
      event_type: 'success',
    });
    // 上报
    this.track(data, true);
  }
}

// 直接导出实例，构造函数现在是安全的（不执行客户端特定逻辑）
// 客户端特定的初始化会在首次调用 track 等方法时通过 ensureInitialized() 执行
const V11CommonLogger = new V11MkWebStoreLogger();

export default V11CommonLogger;
