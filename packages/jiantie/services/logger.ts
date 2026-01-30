import { getAppId, getCurrEnv, getUid } from '@/services';
import Loggerv7 from '@/services/loggerv7';
import {
  DebounceClass,
  isMakaAppAndroid,
  isMakaAppIOS,
  isPc,
  queryToObj,
  random,
  EventEmitter,
  isMiniProgram,
} from '@/utils';
import { toJS } from 'mobx';
import { V11APPTracker } from './loggerv11/logger';

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
  ref_page_type?: string;
  search_word?: string;
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
  } else if (isMiniProgram()) {
    return 'miniprogram';
  } else {
    return 'wap';
  }
};

class MkWebStoreLogger {
  _logger: Loggerv7 | undefined;
  _v11Logger: V11APPTracker | undefined;

  constructor() {
    // let sourceType, sourceId
    //client中
    if (typeof window !== 'object') {
      return;
    }
    const query = queryToObj();
    if (query.source_type && query.source_id) {
      sessionStorage.setItem('source_type', query.source_type);
      sessionStorage.setItem('source_id', query.source_id);
    }
    // sourceType = sessionStorage.getItem('source_type') ?? null
    // sourceId = sessionStorage.getItem('source_id') ?? null

    // 环境判断
    // 拼装sender,环境配置
    const currEnv = getCurrEnv();
    const appid = getAppId();

    this._logger = new Loggerv7({
      project: appid === 'maka' ? 'mk_web_store' : `${appid}-web-store`,
      version: '7.0.0',
      env: currEnv === 'prod' || currEnv === 'staging' ? 'prod' : 'test',
      baseInfo: this.getBaseInfo,
    });

    this._v11Logger = new V11APPTracker({
      app_project: 'v11_web_store',
      appId: appid || '',
      env: currEnv === 'prod' || currEnv === 'staging' ? 'prod' : 'test',
    });

    EventEmitter.on('mkTrackerMount', this.handleMkTrackerMount);
    try {
      window.addEventListener('click', this.handleElemClickDebounce, false);
    } catch (error) {}
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

    for (const item of targets) {
      // console.log('item.targets.:', item.dataset);
    }
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

      // ga 打点
      // try {
      //   const gaCommitData = JSON.parse(dataset.ga || '') as SetGaDataParams
      //   console.log('gaCommitData', gaCommitData)

      //   window.gtag?.('event', gaCommitData.event, gaCommitData.params)
      // } catch (err) {
      //   console.log('err', err)
      // }
    }
  };

  getBaseInfo() {
    let sourceType = '';
    let sourceId = '';
    if (typeof window === 'object') {
      sourceType = sessionStorage.getItem('source_type') ?? '';
      sourceId = sessionStorage.getItem('source_id') ?? '';
    }

    // 获取业务基础信息
    return {
      /** ------ */
      /** 报表必须 */
      uid: String(getUid()),
      platform: getPlatform(),
      /** 报表必须 */
      /** ------ */
      /**
       * 跟踪用户一次所有操作，由上一级页面来源获取
       * 数据来源可能是 app、小程序、wap store
       */
      distinct_id: '',
      device_id: '',
      event_id: random(25).toUpperCase(),
      is_login: '',
      ab_test: '',
      source_type: sourceType,
      source_id: sourceId,
      appid: getAppId(),
    };
  }

  track_pageview(extra = {}, imd = true) {
    const { location, parent } = window;
    const referrer =
      location !== parent.location ? document.referrer : document.location.href;
    const data = Object.assign(
      {
        event_type: 'page_view',
        title: document.title,
        url: document.location.href,
        referrer,
        /** 页面来源于 */
        pageview_event_id: '',
        ref_page_inst_id: '',
        ref_object_type: '',
        ref_object_id: '',
        ref_object_inst_id: '',
        ref_event_id: '',
        source_type: '',
        source_id: '',
      },
      extra
    );
    this.track(data, imd);
  }

  /**
   * 统一处理和补全打点信息
   */
  private track = (data: any, imd = false) => {
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
    const {
      parent_page_type,
      ref_page_id,
      hotword_floor_word_btn,
      page_inst_id,
    } = queryToObj();

    if (!data.parent_page_type && parent_page_type) {
      data.parent_page_type = parent_page_type;
    }

    if (!data.ref_page_id && ref_page_id) {
      data.ref_page_id = decodeURIComponent(ref_page_id);
    }

    if (!data.hotword_floor_word_btn && hotword_floor_word_btn) {
      data.hotword_floor_word_btn = decodeURIComponent(hotword_floor_word_btn);
    }

    if (!data.page_inst_id && page_inst_id) {
      data.page_inst_id = decodeURIComponent(page_inst_id);
    }

    let baseInfo = this.getBaseInfo();
    let v11Data = {
      event: data.event_type,
      page_type: data.page_type,
      page_id: data.page_id,
      search_word: data.search_word ?? data.searchword,
      template_count: data.template_count ?? data.new_template_count,
      old_template_count: data.old_template_count,
      // session_id: data.session_id,
      ref_page_type: data.ref_page_type,
      ref_page_id: data.ref_page_id,
      ref_object_type: data.ref_object_type,
      ref_object_id: data.ref_object_id,
      object_type: data.object_type,
      object_id: data.object_id,
      object_inst_id: data.object_inst_id,
      uid: baseInfo.uid,
      platform: baseInfo.platform,
      event_id: baseInfo.event_id,
    };
    //翻译成v11
    // console.log('v11 data weblog', v11Data);
    this._v11Logger?.track(v11Data, imd);

    this._logger?.track(data, imd);
  };

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

  track_show(eleData: ObjectInfo, imd = false) {
    // console.log('track_show', eleData);
    const data = Object.assign(eleData, {
      event_type: 'show',
    });
    // 上报
    this.track(data, imd);
  }

  private mergeLoggerObj = (
    eleData: Record<string, any>,
    event_type: string
  ) => {
    const result: any = this.getBaseInfo();
    Object.keys(eleData).forEach(key => {
      const val = eleData[key];
      if (typeof val === 'string' || typeof val === 'number') {
        result[key] = val;
      } else {
        result[key] = JSON.stringify(toJS(val));
      }
    });
    // set(result, "event_type", event_type);
    (result as any).event_type = event_type;
    return result;
  };

  track_log(eleData: any) {
    const data = this.mergeLoggerObj(eleData, 'editor_log');
    // 上报
    this.track(data);
  }

  track_search(eleData: any) {
    const data = Object.assign(eleData, {
      event_type: 'search',
    });
    // 上报
    this.track(data, true);
  }

  track_success(eleData: any) {
    const { no_save } = queryToObj();
    if (no_save) {
      return;
    }
    const data = Object.assign(eleData, {
      event_type: 'success',
    });
    // 上报
    this.track(data, true);
  }
}

// 延迟实例化的实例变量
let _instance: MkWebStoreLogger | null = null;

// 使用 Proxy 实现延迟实例化
export const mkWebStoreLogger = new Proxy({} as MkWebStoreLogger, {
  get(_target, prop) {
    if (!_instance) {
      _instance = new MkWebStoreLogger();
    }
    const value = (_instance as any)[prop];
    // 如果是方法，需要绑定 this 上下文
    if (typeof value === 'function') {
      return value.bind(_instance);
    }
    return value;
  },
  set(_target, prop, value) {
    if (!_instance) {
      _instance = new MkWebStoreLogger();
    }
    (_instance as any)[prop] = value;
    return true;
  },
});
