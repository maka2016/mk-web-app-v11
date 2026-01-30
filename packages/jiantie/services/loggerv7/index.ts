// 后续抽取到MK/loggerv7上
import { random } from '@/utils';
import dayjs from 'dayjs';
import { customAlphabet } from 'nanoid';
// import { version } from "./package.json"
const nanoid = customAlphabet('1234567890abcdefghijklmn', 10);

export interface TrackInfo {}

interface loggerv7Params {
  project: string;

  env: 'test' | 'prod' | 'staging' | 'dev';

  maxLogs?: number;

  interval?: number;

  trace_id_name?: string;

  distinct_id_name?: string;
  version?: string;
  baseInfo?: () => Record<string, string>;
}

export const trace_id_name = 'mk_t_id';
const distinct_id_name = 'mk_ds_id';

class Loggerv7 {
  url: string;

  queen: Array<any>;

  timmer: any;

  project: string;

  env: string;

  maxLogs: number;

  interval: any;

  baseInfo: () => Record<string, string>;

  // trace_id_name:string

  // distinct_id_name:string

  constructor(options: loggerv7Params) {
    const { env, project, maxLogs, interval, baseInfo = () => ({}) } = options;
    this.url =
      env === 'prod'
        ? 'https://www.maka.im/node-api-server/datawork-v1/ods/events'
        : 'https://test5.maka.im/node-api-server/datawork-v1/ods/events';
    this.queen = [];
    this.timmer = null;
    this.maxLogs = maxLogs || 20;
    this.project = project || 'logger';
    this.env = env;
    this.interval = interval || 3000;
    this.baseInfo = baseInfo;
    // this.trace_id_name = trace_id_name || 'mk_t_id'
    // this.distinct_id_name = distinct_id_name || 'mk_ds_id'
  }

  getEnvInfo() {
    // 获取环境信息
    return {
      logger_version: '0.1.0',
      env: this.env,
      user_agent: navigator ? navigator.userAgent : '',
      project: this.project,
    };
  }

  changeProject(project: string) {
    this.project = project;
  }

  static getTraceInfo() {
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
      return `mk_t_${new Date().getTime()}${randomn()}`;
    };

    const getDistinctId = () => {
      return `mk_dst_${new Date().getTime()}${randomn()}`;
    };

    const randomn = () => {
      return nanoid(32);
    };

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
      traceid: trace_id,
      distinctid: distinct_id,
    };
  }

  track(data: any, imd = false) {
    Object.keys(data).forEach(key => {
      data[key] = `${data[key]}`;
    });
    data.event_id = random(25).toUpperCase();
    data.event_time = `${new Date().valueOf()}`;
    data.event_time_str = `${dayjs().format('YYYY-MM-DD HH:mm:ss')}`;
    this.queen.push(data);
    this.trySync(imd);
    const handler = () => {
      this.trySync(true);
    };
    if (window) window.onbeforeunload = handler;
  }

  trySync(imd = false) {
    // 尝试同步去服务器
    if (this.timmer) clearTimeout(this.timmer);
    if ((imd || this.queen.length >= this.maxLogs) && this.queen.length) {
      const logs = this.queen.slice(0, this.maxLogs - 1);
      const res = this.syncLog(logs);
      if (res) {
        this.queen = this.queen.slice(this.maxLogs - 1);
      }
    }
    if (this.queen.length) {
      this.timmer = setTimeout(() => {
        this.trySync(true);
      }, this.interval);
    }
  }

  syncLog(logs: any) {
    const data = JSON.stringify({
      events: logs,
      base: Object.assign(
        this.getEnvInfo(),
        this.baseInfo(),
        Loggerv7.getTraceInfo()
      ),
    });
    let res = true;
    // 同步日志去服务器
    if (navigator.sendBeacon) {
      res = navigator.sendBeacon(this.url, data);
    } else {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', this.url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(data);
    }
    return res;
  }
}

export default Loggerv7;
