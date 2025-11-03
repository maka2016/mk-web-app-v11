import { makeAutoObservable, toJS } from 'mobx';
import { useLocalObservable } from 'mobx-react';

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

  constructor() {
    makeAutoObservable(this);
  }

  setLoginShow = (nextData: boolean) => {
    this.loginShow = nextData;
  };

  setVipShow = (nextData: boolean, data?: Record<string, any>) => {
    this.vipShow = nextData;
    this.vipTrackData = data || {};
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

export const useStore = () => {
  const store = useLocalObservable(() => activitiveStore);
  return store;
};
