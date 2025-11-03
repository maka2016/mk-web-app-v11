import * as services from '@mk/services';
import * as utils from '@mk/utils';
import * as FormProtocal from '@mk/form-protocol';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Axios from 'axios';

/**
 * 准备组件需要的运行时环境
 */
export const registerEnv = () => {
  Object.assign(window, {
    MK_LIB: {
      services,
      utils,
    },
    CORE_VENDOR: {
      React,
      Axios,
      ReactDOM,
    },
    MK_FORM: {
      FormProtocal,
    },
    LIB_VENDOR: {},
  });
};
