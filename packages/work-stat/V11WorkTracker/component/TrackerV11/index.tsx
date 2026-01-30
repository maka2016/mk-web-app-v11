'use client';

import { useEffect, useRef } from 'react';
import tracker from '../../index';

export interface WorksData {
  /** 作品详情 */
  detail?: {
    /** 作品ID */
    id?: string;
    /** 应用ID */
    appid?: string;
    [key: string]: any;
  };
  /** 作品数据 */
  work_data?: any;
  [key: string]: any;
}

export interface TrackerV11Props {
  /** 作品ID（如果提供，将优先使用） */
  workId?: string;
  /** 应用ID（如果提供，将优先使用） */
  appId?: string;
  /** 作品数据对象（如果提供 workId 和 appId，则不需要此参数） */
  worksData?: WorksData;
  /** 是否启用心跳追踪，默认 true */
  enableHeartbeat?: boolean;
  /** 心跳间隔（毫秒），默认 30000 (30秒) */
  heartbeatInterval?: number;
  /** 额外的追踪数据 */
  extraData?: Record<string, any>;
}

/**
 * V11作品追踪组件
 * 用于追踪作品的页面浏览和心跳事件
 *
 * @example
 * // 方式1: 直接传入 workId 和 appId
 * <TrackerV11 workId="123" appId="jiantie" />
 *
 * @example
 * // 方式2: 传入作品数据对象
 * <TrackerV11 worksData={{ detail: { id: "123", appid: "jiantie" } }} />
 */
export default function TrackerV11({
  workId: propWorkId,
  appId: propAppId,
  worksData,
  enableHeartbeat = true,
  heartbeatInterval = 30000,
  extraData,
}: TrackerV11Props) {
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasTrackedPageviewRef = useRef(false);

  // 从 props 或 worksData 中提取 workId 和 appId
  const workId = propWorkId || worksData?.detail?.id || '';
  const appId = propAppId || worksData?.detail?.appid || '';

  useEffect(() => {
    // 初始化 tracker
    console.log('TrackerV11 init', workId, appId);
    if (workId && appId) {
      tracker.init({
        appId,
        workId,
      });

      // 发送页面浏览事件
      if (!hasTrackedPageviewRef.current) {
        console.log('TrackerV11 pageview', extraData);
        tracker.track('pageview', extraData).catch(err => {
          console.error('TrackerV11: pageview track failed', err);
        });
        hasTrackedPageviewRef.current = true;
      }
    }

    // 设置心跳追踪
    if (enableHeartbeat && workId && appId) {
      const sendHeartbeat = () => {
        tracker.track('heartbeat', extraData).catch(err => {
          console.error('TrackerV11: heartbeat track failed', err);
        });
      };

      // 立即发送一次心跳
      sendHeartbeat();

      // 设置定时心跳
      heartbeatTimerRef.current = setInterval(sendHeartbeat, heartbeatInterval);
    }

    // 清理函数
    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [workId, appId, enableHeartbeat, heartbeatInterval, extraData]);

  // 组件不渲染任何内容
  return null;
}
