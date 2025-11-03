import { FormEntityServicesApi } from '@mk/form-engine/api/form-entity-services-api';
import { FormReceiverServicesApi } from '@mk/form-engine/api/form-receiver-services-api';
import axios from 'axios';
import { getCurrEnv } from './apis';
import { getRequestCommonConfig, getUid } from './request';

export { getUid };

const worksRequestInstance = axios.create({
  timeout: 15000,
});

export const getFormApi = (env: string) => {
  const map = {
    dev: 'https://test5.maka.im/mk-form-engine',
    test: 'https://test5.maka.im/mk-form-engine',
    staging: 'https://staging.maka.im/mk-form-engine',
    prod: 'https://www.maka.im/mk-form-engine',
  };
  return map[env as keyof typeof map];
};

worksRequestInstance.interceptors.request.use(config => {
  config.url = config.url?.replace(
    'http://localhost',
    getFormApi(getCurrEnv())
  );
  return getRequestCommonConfig(config);
});

export const formEntityServiceApi = new FormEntityServicesApi(
  undefined,
  undefined,
  worksRequestInstance
);

export const formReceiverServiceApi = new FormReceiverServicesApi(
  undefined,
  undefined,
  worksRequestInstance
);
