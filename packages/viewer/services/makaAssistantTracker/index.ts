// @ts-nocheck
// @ts-ignore
import { WechatClientInfo, WorksDetail } from '@/types/interface';
import { cdnApi, getProcessEnv, request } from '@mk/services';
import { queryToObj } from '@mk/utils';
import MA from '../ma';

class MakaAssistantTracker {
  ma?: MA;
  workDetail?: WorksDetail;
  wechatClientInfo?: WechatClientInfo;
  trackPvSent: boolean;
  pageDurationMap: object;
  lastPage: number;
  enabled: boolean;
  isReady: boolean;
  queue: any;
  hash: string;

  constructor() {
    this.trackPvSent = false;
    this.pageDurationMap = {};
    this.lastPage = -1;
    this.enabled = false;
    this.isReady = false;
    this.queue = [];
    this.hash = '';
  }

  async init(worksDetail: WorksDetail, wechatClientInfo: WechatClientInfo) {
    if (this.isReady) return;

    await this.initHash(
      worksDetail.uid || '',
      worksDetail.workId || '',
      wechatClientInfo.openId
    );
    // this.uid = worksDetail.uid
    this.workDetail = worksDetail;
    this.wechatClientInfo = wechatClientInfo;

    let project = '';
    let logstore = '';
    const env = getProcessEnv();
    if (env === 'prod' || env === 'staging') {
      project = 'marketing-assistant';
      logstore = 'marketing-assistant-prod';
    } else {
      project = 'marketing-assistant';
      logstore = 'marketing-assistant-test';
    }

    this.ma = new MA({
      serverUrl: `https://${project}.cn-beijing.log.aliyuncs.com/logstores/${logstore}/track?APIVersion=0.6.0`,
      collectors: ['userAgent', 'wechat'],
      identityName: '',
      beforeSend(data: any) {
        data.event_type = data.$event;
        data.vendor = data.$vendor || '';
        data.os = data.$os || '';
        data.source = data.$wechat_from || '';
        const deletedNames = [
          '$event',
          '$vendor',
          '$model',
          '$os',
          '$os_version',
          '$engine',
          '$engine_version',
          '$browser',
          '$browser_version',
          '$wechat_from',
        ];
        deletedNames.forEach(name => {
          delete data[name];
        });
        return data;
      },
    });

    this.enabled = true;
    this.isReady = true;

    setInterval(() => {
      this.make('trackPage');
    }, 5000);
  }

  async initHash(work_uid: string | number, work_id: string, open_id: string) {
    return new Promise((resolve, reject) => {
      // const { projectVersion } = window
      let params = {
        work_id,
        work_uid,
        open_id,
      };

      const preHash = queryToObj()?.pre_hash || '';
      if (preHash) {
        Object.assign(params, { pre_hash: preHash });
      }

      let assistHost = '';
      const env = getProcessEnv();
      if (env === 'prod') {
        assistHost = 'https://assistant.maka.im';
      } else {
        assistHost = 'https://test5-assistant.maka.im';
      }

      request
        .get(`${assistHost}/event/hash`, {
          params: {
            work_id,
            work_uid,
            open_id,
            pre_hash: preHash,
          },
        })
        .then(data => {
          this.hash = data?.data?.hash;
          this.isReady = true;

          resolve(data);
        })
        .catch(reject);
      // ajaxStore.getEventHash(params).then((res) => {
      //   if (res.resultCode === 0) {
      //     this.hash = res.data.hash
      //     this.isReady = true
      //     this.queue.forEach(task => {
      //       this[task[0]](...task.slice(1))
      //     })
      //   }
      // }).finally(resolve)
    });
  }

  // 使用方法实时获取数据是因为一开始时作品数据及微信信息没有加载
  getCommonData() {
    // const { projectVersion, wxInfo, Config } = window
    return {
      action_time: Date.now(),
      uid: this?.workDetail?.uid, // 作者id
      work_name: this?.workDetail?.title, // 作品名
      work_id: this?.workDetail?.workId, // 作品id
      work_type: this?.workDetail?.workType, // 作品类型
      wx_name: this?.wechatClientInfo?.wechatName, // 微信名
      wx_avatar: this?.wechatClientInfo?.wxAvatar, // 微信头像
      // hasVote: Common.hasVote, // 是否有投票
      // hasNewForm : Common.hasNewForm, // 是否有表单
      openid: this?.wechatClientInfo?.openId,
      ua: window.navigator.userAgent,
    };
  }

  /**
   * 上报事件
   * @param {string} eventType 事件名称
   * @param {Object} data 事件专属属性或其他自定义属性
   */
  track = (eventType: string, data: any) => {
    const commonData = this.getCommonData();
    const trackData = {
      hash: this.hash,
      ...data,
      ...commonData,
    };
    this.ma?.track(eventType, trackData);
    if (eventType === 'track_pv') {
      this.trackPvSent = true;
    }
  };

  make(method: string, ...args: any[]) {
    // if (!this.enabled) return
    // 旧作品未开启商机雷达时不打点
    // if (!this.isOldStatsExpired() && !this.shouldCollect) return
    if (this.isReady) {
      (this as any)[method](...args);
    } else {
      this.queue.push([method, ...args]);
    }
  }

  /**
   * 页面阅读时长上报
   * @param {number} page 将要阅读页，以 1 开始，如果传表示首次进入作品或者翻页，
   *                      如果不传表示更新当前正在阅读页面时长
   */
  trackPage(page: number) {
    if (!this.trackPvSent) return;
    const { pageDurationMap, lastPage } = this as any;
    const now = Date.now();
    const getDuration = (now: number, pageData: any) => {
      const { duration, startTime } = pageData;
      return duration + Math.round((now - startTime) / 1000);
    };
    const getDurationData = () => {
      const durationData: any = {};
      Object.keys(pageDurationMap).forEach(p => {
        durationData[p] = pageDurationMap[p].duration;
      });
      return durationData;
    };
    if (page) {
      // 首次阅读页面时长记为 1 秒
      const firstDuration = 1;
      if (pageDurationMap[page]) {
        pageDurationMap[page].duration = getDuration(
          now,
          pageDurationMap[page]
        );
        pageDurationMap[page].startTime = now;
      } else {
        pageDurationMap[page] = {
          duration: firstDuration,
          startTime: now,
        };
      }
      this.track('track_page_view', {
        duration: JSON.stringify(getDurationData()),
      });
      this.lastPage = page;
      return;
    }
    if (pageDurationMap[lastPage]) {
      pageDurationMap[lastPage].duration = getDuration(
        now,
        pageDurationMap[lastPage]
      );
      pageDurationMap[lastPage].startTime = now;
      this.track('track_page_view', {
        duration: JSON.stringify(getDurationData()),
      });
      return;
    }
  }
}

const makaAssistantTracker = new MakaAssistantTracker();

export default makaAssistantTracker;

export const getWorkDetailForMA = (
  worksDetail: any,
  worksId: string,
  uid?: number | string
) => {
  const workDetailForMA: WorksDetail = {
    title: worksDetail.title,
    thumbUrl: cdnApi(worksDetail.cover),
    content: worksDetail.content,
    templateId: worksDetail.template_id,
    workId: worksId,
    uid: uid,
    workType: worksDetail.spec_name,
  };

  return workDetailForMA;
};
