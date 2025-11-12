import { canShareWithoutWatermark } from '@/services/permission';
import { EventEmitter } from '@mk/utils';
import { makeAutoObservable, toJS } from 'mobx';
import { useLocalObservable } from 'mobx-react';
import { environmentStore, EnvironmentStore } from './environment';
import { NavigationStore } from './navigation';
import { ShareStore } from './share';

class ActivitiveStore {
  loginShow: boolean = false;
  vipShow: boolean = false;
  vipType: string = 'senior';

  vipTrackData: Record<string, any> = {};
  profile: Record<string, any> | null = null;
  customerVips: any[] = [];
  permissions: Record<string, string> = {};

  bindPhoneShow: boolean = false;
  vipABTest: 'default' | 'test' = 'default';
  appVersion: string = '';

  // ===== 统一基建 Store =====
  /** 环境信息 Store */
  environment: EnvironmentStore;
  /** 导航路由 Store */
  navigation: NavigationStore;
  /** 分享功能 Store */
  share: ShareStore;

  constructor() {
    // 初始化基建 Store
    this.environment = environmentStore;
    this.navigation = new NavigationStore(this.environment);
    this.share = new ShareStore(this.environment);

    // 设置分享权限检查
    this.setupSharePermissionCheck();

    makeAutoObservable(this);
  }

  /**
   * 设置分享权限检查
   * 将权限检查逻辑和 VIP 弹窗回调注入到 ShareStore
   */
  private setupSharePermissionCheck = () => {
    // 权限检查函数：先检查 VIP 状态，再调用 API
    const checkPermission = async (worksId: string): Promise<boolean> => {
      // 如果是 VIP，直接有权限
      if (this.isVip) {
        return true;
      }

      // 否则调用 API 检查
      return await canShareWithoutWatermark(worksId);
    };

    // VIP 弹窗回调
    const showVipModal = (trackData?: Record<string, any>) => {
      this.setVipShow(true, trackData || {});
    };

    // 注入到 ShareStore
    this.share.setPermissionCheck(checkPermission, showVipModal);
  };

  setLoginShow = (nextData: boolean) => {
    this.loginShow = nextData;
  };

  setVipShow = (nextData: boolean, data?: Record<string, any>) => {
    this.vipShow = nextData;
    this.vipTrackData = data || {};
    EventEmitter.emit('VIP_MODAL_OPEN_CHANGE', nextData);
  };

  setBindPhoneShow = (nextData: boolean) => {
    this.bindPhoneShow = nextData;
  };

  setProfile = (nextData: Record<string, any>) => {
    this.profile = nextData;
  };

  setCustomerVips = (nextData: any[]) => {
    this.customerVips = nextData;
  };

  setPermissions = (nextData: Record<string, string>) => {
    this.permissions = nextData;
  };

  setVipABTest = (nextData: 'default' | 'test') => {
    this.vipABTest = nextData;
  };

  setAppVersion = (nextData: string) => {
    this.appVersion = nextData;
  };

  get userProfile() {
    return toJS(this.profile);
  }

  get isVip() {
    return this.customerVips?.length > 0;
  }

  get isSVip() {
    return this.customerVips.some(
      item => item.roleAlias === 'jiantie_svip_super'
    );
  }
}

export const activitiveStore = new ActivitiveStore();

// 导出环境 store（供 Provider 使用）
export { environmentStore };

/**
 * 统一的 Store Hook
 * 提供所有全局状态和功能
 */
export const useStore = () => {
  const store = useLocalObservable(() => activitiveStore);
  return store;
};

/**
 * 便捷的环境信息 Hook
 */
export const useEnvironment = () => {
  const store = useStore();
  return store.environment;
};

/**
 * 便捷的导航路由 Hook
 */
export const useNavigation = () => {
  const store = useStore();
  return store.navigation;
};

/**
 * 便捷的分享功能 Hook
 */
export const useShare = () => {
  const store = useStore();
  return store.share;
};
