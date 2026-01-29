'use client';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { setCookieExpire } from '../../../work-stat/V11WorkTracker/cookie';
import { getCookie } from '../../../work-stat/V11WorkTracker/cookie';
export interface TrackEvent {
  event: 'pageview' | 'click' | 'show' | 'success' | 'search';
  page_type?: string;
  page_id?: string;
  // session_id?: string;
  // distinct_id?: string;
  ref_page_type?: string;
  ref_page_id?: string;
  object_type?: string;
  object_id?: string;
  search_word?: string;
  uid?: string;
}
export class V11APPTracker {
  appId?: string;
  env?: string;

  // serverUrl: string = '';
  distinctId?: string;
  tracker: any;
  private host: string;
  private project: string;
  private logstore: string;
  private app_project: string;
  constructor(options: {
    appId: string;
    env: string;
    host?: string;
    project?: string;
    app_project?: string;
    logstore?: string;
  }) {
    this.appId = options.appId;
    this.env = options.env;
    this.host = options?.host || 'cn-beijing.log.aliyuncs.com';
    this.project = options?.project || 'v11-app-logs';
    this.app_project = options?.app_project || 'v11-app-logs';
    this.logstore = options?.logstore || 'v11-app-logs';
    // this.sessionId = uuidv4();
    // this.distinctId = this.getOrCreateDistinctId();

    console.log('V11APPTracker init', options);
  }

  private getBaseInfo(): Record<string, string> {
    return {
      app_id: this.appId || '',
      // session_id: uuidv4(),
      // distinctId: this.getOrCreateDistinctId(),
      event_id: uuidv4(),
    };
  }

  private getEnvInfo() {
    // 获取环境信息
    return {
      logger_version: '0.1.0',
      env: this.env,
      app_project: this.app_project,
      user_agent: navigator ? navigator.userAgent : '',
    };
  }

  private getTraceInfo() {
    const trace_id_name = 'mk_v11_t_id';
    const distinct_id_name = 'mk_v11_ds_id';
    // 获取用户追踪信息
    let distinct_id = localStorage.getItem(distinct_id_name);
    let trace_id = localStorage.getItem(trace_id_name);
    const today = dayjs().format('YYYY-MM-DD');
    let firstDayFlag = localStorage.getItem('first_day_flag');
    if (!firstDayFlag) {
      localStorage.setItem('first_day_flag', today);
      firstDayFlag = today;
    }
    const isFirstDay = firstDayFlag === today;
    // let page_id = sessionStorage.getItem('mkPageId')

    const getTraceId = () => {
      return `mk_t_${new Date().getTime()}${uuidv4()}`;
    };

    const getDistinctId = () => {
      return `mk_dst_${new Date().getTime()}${uuidv4()}`;
    };

    const getSessionId = () => {
      const sessionIdKey = 'v11_track_session_id';
      const sessionTimeKey = 'v11_track_session_time';
      const SESSION_TIMEOUT = 60 * 60 * 1000; // 30分钟（毫秒）

      const now = new Date().getTime();
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
    };

    // const randomn = () => {
    //   return nanoid(32);
    // };

    const saveSetItem = (key: string, val: string) => {
      try {
        localStorage.setItem(key, val);
      } catch (e: any) {
        console.log('saveSetItem error', e);
        localStorage.clear();
        localStorage.setItem(key, val);
      }
    };

    if (!trace_id) {
      trace_id = getTraceId();
      saveSetItem(trace_id_name, trace_id);
    }

    if (!distinct_id) {
      distinct_id = getDistinctId();
      saveSetItem(distinct_id_name, distinct_id);
    }

    return {
      is_first_day: String(isFirstDay),
      trace_id,
      distinct_id,
      session_id: getSessionId(),
    };
  }

  async track(event: TrackEvent, imd: boolean = false) {
    // 只在客户端执行
    if (typeof window === 'undefined') {
      return;
    }

    // 延迟初始化，只在首次调用 track 时初始化
    if (!this.tracker) {
      const { default: SlsTracker } = await import(
        '@aliyun-sls/web-track-browser'
      );
      this.tracker = new SlsTracker({
        host: this.host,
        project: this.project,
        logstore: this.logstore,
        time: 5, // 发送日志的时间间隔，默认是10秒。
        count: 100, // 发送日志的数量大小，默认是10条。
        tags: {
          appId: this.appId,
          app_project: this.app_project,
        },
      });
    }

    const baseInfo = this.getBaseInfo();
    const traceInfo = this.getTraceInfo();
    const envInfo = this.getEnvInfo();

    let trackData: any = {
      ...envInfo,
      ...baseInfo,
      ...traceInfo,

      ...event,
      clinet_event_time: Date.now(),
    };

    if (typeof window === 'object') {
      const { location, parent } = window;
      const referrer =
        location !== parent.location
          ? document.referrer
          : document.location.href;
      trackData.ua = navigator.userAgent;
      trackData.title = document.title;
      trackData.url = document.location.href;
      trackData.referrer = referrer;
    }

    if (imd) {
      this.tracker.sendImmediate(trackData);
    } else {
      this.tracker.send(trackData);
    }
  }
}
