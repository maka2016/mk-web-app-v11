import APPBridge from '@/store/app-bridge';
import {
  isAlipay,
  isAndroid,
  isIOS,
  isIPadOS,
  isMakaAppAndroid,
  isMakaAppIOS,
  isUCBrowser,
  isWechat,
} from '@/store/app-bridge/devices';
import { makeAutoObservable } from 'mobx';

/**
 * 环境信息 Store
 * 统一管理运行环境、设备信息、浏览器信息
 */
export class EnvironmentStore {
  // ===== 运行环境 =====
  /** 是否在 APP 内 */
  isInApp: boolean = false;
  /** 是否在小程序内 */
  isInMiniP: boolean = false;
  /** 运行时环境 */
  runtime: 'IOS' | 'ANDROID' | 'MINIPROGRAM' | 'WEB' = 'WEB';
  /** 是否是移动设备 */
  isMobile: boolean = false;
  // ===== 设备信息 =====
  /** 是否 iOS 设备 */
  isIOS: boolean = false;
  /** 是否 Android 设备 */
  isAndroid: boolean = false;
  /** 是否 iPad OS */
  isIPadOS: boolean = false;
  /** 是否在 MAKA iOS APP 内 */
  isMakaAppIOS: boolean = false;
  /** 是否在 MAKA Android APP 内 */
  isMakaAppAndroid: boolean = false;
  /** 是否 React Native 环境 */
  isRN: boolean = false;

  // ===== 浏览器环境 =====
  /** 是否微信浏览器 */
  isWechat: boolean = false;
  /** 是否支付宝浏览器 */
  isAlipay: boolean = false;
  /** 是否 UC 浏览器 */
  isUCBrowser: boolean = false;

  // ===== 初始化状态 =====
  isInitialized: boolean = false;

  constructor() {
    makeAutoObservable(this);
  }

  /**
   * 初始化环境信息 - 只在客户端调用
   */
  init = ({ isMobile }: { isMobile: boolean }) => {
    if (typeof window === 'undefined') return;

    this.isMobile = isMobile;

    // 运行环境检测
    this.isInApp = APPBridge.judgeIsInApp();
    this.isInMiniP = APPBridge.judgeIsInMiniP();
    const runtime = APPBridge.getRuntime();
    this.runtime = runtime || 'WEB';

    // 设备检测
    this.isIOS = !!isIOS();
    this.isAndroid = !!isAndroid();
    this.isIPadOS = !!isIPadOS();
    this.isMakaAppIOS = !!isMakaAppIOS();
    this.isMakaAppAndroid = !!isMakaAppAndroid();
    this.isRN = APPBridge.isRN();

    // 浏览器环境检测
    this.isWechat = !!isWechat();
    this.isAlipay = !!isAlipay();
    this.isUCBrowser = !!isUCBrowser();

    this.isInitialized = true;
  };

  /**
   * 手动更新环境信息（用于特殊场景）
   */
  updateEnvironment = (
    key: keyof Omit<
      EnvironmentStore,
      'init' | 'updateEnvironment' | 'isInitialized'
    >,
    value: any
  ) => {
    (this as any)[key] = value;
  };
}

export const environmentStore = new EnvironmentStore();
